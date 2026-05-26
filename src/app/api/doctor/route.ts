// ============================================================
// NANGGROE IOT - System Doctor / Health Check API
// GET /api/doctor — Run full system diagnostics
// ============================================================

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface HealthCheck {
  database: { status: string; latency: number; message: string }
  hardware: { status: string; totalDevices: number; activeDevices: number; errorDevices: number; issues: string[] }
  agents: { status: string; hermes: boolean; picoclaw: boolean; message: string }
  telemetry: { status: string; lastUpdate: string | null; age: number; message: string }
  battery: { status: string; voltage: number | null; percentage: number | null; message: string }
  signal: { status: string; strength: number | null; message: string }
  calibration: { status: string; pending: number; completed: number; failed: number; message: string }
  alerts: { status: string; unresolvedCritical: number; unresolvedWarning: number; message: string }
  missions: { status: string; activeCount: number; stuckCount: number; message: string }
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  checks: HealthCheck
  recommendations: string[]
}

export async function GET() {
  try {
    const checks = {
      database: await checkDatabase(),
      hardware: await checkHardware(),
      agents: await checkAgents(),
      telemetry: await checkTelemetry(),
      battery: await checkBattery(),
      signal: await checkSignal(),
      calibration: await checkCalibration(),
      alerts: await checkAlerts(),
      missions: await checkMissions(),
    }

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status)
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (statuses.includes('critical')) {
      overallStatus = 'critical'
    } else if (statuses.includes('degraded') || statuses.includes('warning')) {
      overallStatus = 'degraded'
    }

    // Generate recommendations
    const recommendations = generateRecommendations(checks)

    const report: HealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      recommendations,
    }

    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to run system diagnostics' },
      { status: 500 }
    )
  }
}

async function checkDatabase(): Promise<HealthCheck['database']> {
  const start = Date.now()
  try {
    await db.systemConfig.count()
    const latency = Date.now() - start
    return {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'warning',
      latency,
      message: `Database responding in ${latency}ms`,
    }
  } catch {
    const latency = Date.now() - start
    return {
      status: 'critical',
      latency,
      message: 'Database connection failed',
    }
  }
}

async function checkHardware(): Promise<HealthCheck['hardware']> {
  try {
    const totalDevices = await db.hardwareDevice.count()
    const activeDevices = await db.hardwareDevice.count({ where: { status: 'active' } })
    const errorDevices = await db.hardwareDevice.count({ where: { status: 'error' } })
    const offlineDevices = await db.hardwareDevice.count({ where: { status: 'offline' } })

    const issues: string[] = []

    if (errorDevices > 0) {
      const errorDeviceList = await db.hardwareDevice.findMany({
        where: { status: 'error' },
        select: { name: true },
      })
      issues.push(`${errorDevices} device(s) in error state: ${errorDeviceList.map(d => d.name).join(', ')}`)
    }

    if (offlineDevices > 0) {
      issues.push(`${offlineDevices} device(s) offline`)
    }

    if (totalDevices === 0) {
      issues.push('No hardware devices detected — run a hardware scan')
    }

    const status = errorDevices > 0 ? 'critical' : offlineDevices > 0 || activeDevices < totalDevices * 0.5 ? 'degraded' : 'healthy'

    return {
      status,
      totalDevices,
      activeDevices,
      errorDevices,
      issues,
    }
  } catch {
    return {
      status: 'critical',
      totalDevices: 0,
      activeDevices: 0,
      errorDevices: 0,
      issues: ['Unable to query hardware devices'],
    }
  }
}

async function checkAgents(): Promise<HealthCheck['agents']> {
  try {
    const hermesConfig = await db.systemConfig.findUnique({ where: { key: 'agent.hermes.enabled' } })
    const picoclawConfig = await db.systemConfig.findUnique({ where: { key: 'agent.picoclaw.enabled' } })

    const hermes = hermesConfig?.value === 'true'
    const picoclaw = picoclawConfig?.value === 'true'

    const bothOnline = hermes && picoclaw
    const eitherOffline = !hermes || !picoclaw

    let message = ''
    if (bothOnline) {
      message = 'Both agents online and operational'
    } else if (hermes && !picoclaw) {
      message = 'PicoClaw safety agent is offline — safety monitoring disabled'
    } else if (!hermes && picoclaw) {
      message = 'Hermes planning agent is offline — mission planning unavailable'
    } else {
      message = 'Both agents offline — system running in manual mode'
    }

    return {
      status: bothOnline ? 'healthy' : eitherOffline ? 'degraded' : 'critical',
      hermes,
      picoclaw,
      message,
    }
  } catch {
    return {
      status: 'critical',
      hermes: false,
      picoclaw: false,
      message: 'Unable to determine agent status',
    }
  }
}

async function checkTelemetry(): Promise<HealthCheck['telemetry']> {
  try {
    const latestReading = await db.telemetryReading.findFirst({
      orderBy: { timestamp: 'desc' },
    })

    if (!latestReading) {
      return {
        status: 'warning',
        lastUpdate: null,
        age: -1,
        message: 'No telemetry data available — generate telemetry to begin monitoring',
      }
    }

    const age = Date.now() - new Date(latestReading.timestamp).getTime()
    const ageSeconds = Math.floor(age / 1000)

    let status: string
    let message: string

    if (ageSeconds < 10) {
      status = 'healthy'
      message = `Telemetry fresh (${ageSeconds}s ago)`
    } else if (ageSeconds < 60) {
      status = 'degraded'
      message = `Telemetry slightly stale (${ageSeconds}s ago)`
    } else if (ageSeconds < 300) {
      status = 'warning'
      message = `Telemetry outdated (${Math.floor(ageSeconds / 60)}m ${ageSeconds % 60}s ago)`
    } else {
      status = 'critical'
      message = `Telemetry very stale (${Math.floor(ageSeconds / 60)}m ago) — possible data link failure`
    }

    return {
      status,
      lastUpdate: latestReading.timestamp.toISOString(),
      age: ageSeconds,
      message,
    }
  } catch {
    return {
      status: 'critical',
      lastUpdate: null,
      age: -1,
      message: 'Unable to query telemetry data',
    }
  }
}

async function checkBattery(): Promise<HealthCheck['battery']> {
  try {
    const latestBattery = await db.telemetryReading.findFirst({
      where: { metric: 'battery_voltage' },
      orderBy: { timestamp: 'desc' },
    })

    if (!latestBattery) {
      return {
        status: 'warning',
        voltage: null,
        percentage: null,
        message: 'No battery voltage reading available',
      }
    }

    const voltage = latestBattery.value
    const minVoltage = 12.6
    const maxVoltage = 16.8
    const percentage = Math.max(0, Math.min(100, ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100))

    let status: string
    let message: string

    if (voltage > 14.8) {
      status = 'healthy'
      message = `Battery charged at ${percentage.toFixed(0)}% (${voltage.toFixed(1)}V)`
    } else if (voltage > 13.2) {
      status = 'degraded'
      message = `Battery moderate at ${percentage.toFixed(0)}% (${voltage.toFixed(1)}V) — consider recharging`
    } else if (voltage > 12.6) {
      status = 'warning'
      message = `Battery low at ${percentage.toFixed(0)}% (${voltage.toFixed(1)}V) — recharge immediately`
    } else {
      status = 'critical'
      message = `Battery critically low at ${voltage.toFixed(1)}V — below safe minimum, do not fly`
    }

    return {
      status,
      voltage,
      percentage,
      message,
    }
  } catch {
    return {
      status: 'critical',
      voltage: null,
      percentage: null,
      message: 'Unable to read battery status',
    }
  }
}

async function checkSignal(): Promise<HealthCheck['signal']> {
  try {
    const latestSignal = await db.telemetryReading.findFirst({
      where: { metric: 'signal_strength' },
      orderBy: { timestamp: 'desc' },
    })

    if (!latestSignal) {
      return {
        status: 'warning',
        strength: null,
        message: 'No signal strength reading available',
      }
    }

    const strength = latestSignal.value

    let status: string
    let message: string

    if (strength > -60) {
      status = 'healthy'
      message = `Strong signal (${strength} dBm)`
    } else if (strength > -70) {
      status = 'degraded'
      message = `Fair signal (${strength} dBm) — monitor for degradation`
    } else if (strength > -80) {
      status = 'warning'
      message = `Weak signal (${strength} dBm) — maintain close range`
    } else {
      status = 'critical'
      message = `Very weak signal (${strength} dBm) — risk of link loss`
    }

    return {
      status,
      strength,
      message,
    }
  } catch {
    return {
      status: 'critical',
      strength: null,
      message: 'Unable to read signal strength',
    }
  }
}

async function checkCalibration(): Promise<HealthCheck['calibration']> {
  try {
    const pending = await db.calibration.count({ where: { status: 'pending' } })
    const inProgress = await db.calibration.count({ where: { status: 'in_progress' } })
    const completed = await db.calibration.count({ where: { status: 'completed' } })
    const failed = await db.calibration.count({ where: { status: 'failed' } })

    let status: string
    let message: string

    if (pending === 0 && failed === 0) {
      status = 'healthy'
      message = completed > 0 ? `All ${completed} calibrations completed` : 'No calibrations on record'
    } else if (failed > 0) {
      status = 'degraded'
      message = `${failed} calibration(s) failed, ${pending} pending, ${inProgress} in progress`
    } else {
      status = 'degraded'
      message = `${pending} calibration(s) pending, ${inProgress} in progress, ${completed} completed`
    }

    return {
      status,
      pending,
      completed,
      failed,
      message,
    }
  } catch {
    return {
      status: 'critical',
      pending: 0,
      completed: 0,
      failed: 0,
      message: 'Unable to query calibration records',
    }
  }
}

async function checkAlerts(): Promise<HealthCheck['alerts']> {
  try {
    const unresolvedCritical = await db.alert.count({
      where: { level: 'critical', isResolved: false },
    })
    const unresolvedWarning = await db.alert.count({
      where: { level: 'warning', isResolved: false },
    })

    let status: string
    let message: string

    if (unresolvedCritical > 0) {
      status = 'critical'
      message = `${unresolvedCritical} unresolved critical alert(s), ${unresolvedWarning} warning(s)`
    } else if (unresolvedWarning > 3) {
      status = 'degraded'
      message = `${unresolvedWarning} unresolved warning(s) — review recommended`
    } else if (unresolvedWarning > 0) {
      status = 'degraded'
      message = `${unresolvedWarning} unresolved warning(s)`
    } else {
      status = 'healthy'
      message = 'No unresolved alerts'
    }

    return {
      status,
      unresolvedCritical,
      unresolvedWarning,
      message,
    }
  } catch {
    return {
      status: 'critical',
      unresolvedCritical: 0,
      unresolvedWarning: 0,
      message: 'Unable to query alerts',
    }
  }
}

async function checkMissions(): Promise<HealthCheck['missions']> {
  try {
    const activeCount = await db.mission.count({ where: { status: 'active' } })

    // Check for stuck missions — active for more than 2 hours without a log entry
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const stuckMissions = await db.mission.findMany({
      where: {
        status: 'active',
        startedAt: { lt: twoHoursAgo },
      },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    let stuckCount = 0
    for (const mission of stuckMissions) {
      if (mission.logs.length === 0 || new Date(mission.logs[0].timestamp) < twoHoursAgo) {
        stuckCount++
      }
    }

    let status: string
    let message: string

    if (stuckCount > 0) {
      status = 'critical'
      message = `${stuckCount} mission(s) appear stuck (no activity for 2+ hours)`
    } else if (activeCount > 1) {
      status = 'degraded'
      message = `${activeCount} active missions — multiple simultaneous operations`
    } else if (activeCount === 1) {
      status = 'healthy'
      message = '1 active mission running normally'
    } else {
      status = 'healthy'
      message = 'No active missions'
    }

    return {
      status,
      activeCount,
      stuckCount,
      message,
    }
  } catch {
    return {
      status: 'critical',
      activeCount: 0,
      stuckCount: 0,
      message: 'Unable to query missions',
    }
  }
}

function generateRecommendations(checks: HealthCheck): string[] {
  const recommendations: string[] = []

  if (checks.database.status === 'critical') {
    recommendations.push('Database connection failure — check SQLite database file and Prisma configuration')
  } else if (checks.database.latency > 200) {
    recommendations.push('Database latency is high — consider optimizing queries or checking disk I/O')
  }

  if (checks.hardware.errorDevices > 0) {
    recommendations.push(`${checks.hardware.errorDevices} hardware device(s) in error state — check physical connections and driver logs`)
  }
  if (checks.hardware.totalDevices === 0) {
    recommendations.push('No hardware devices detected — run a hardware scan from the Hardware tab')
  }

  if (!checks.agents.hermes) {
    recommendations.push('Enable Hermes agent for mission planning capabilities (agent.hermes.enabled=true)')
  }
  if (!checks.agents.picoclaw) {
    recommendations.push('Enable PicoClaw agent for real-time safety monitoring (agent.picoclaw.enabled=true)')
  }

  if (checks.telemetry.status === 'critical' || checks.telemetry.status === 'warning') {
    recommendations.push('Telemetry data is stale — verify sensor connections and data link')
  }

  if (checks.battery.status === 'critical') {
    recommendations.push('Battery voltage critically low — do NOT attempt flight. Recharge or replace battery immediately')
  } else if (checks.battery.status === 'warning') {
    recommendations.push('Battery voltage low — recharge before next flight operation')
  } else if (checks.battery.status === 'degraded') {
    recommendations.push('Battery is partially discharged — plan for recharging soon')
  }

  if (checks.signal.status === 'critical') {
    recommendations.push('Signal strength critical — reduce distance or check antenna orientation')
  } else if (checks.signal.status === 'warning') {
    recommendations.push('Signal strength weak — maintain close proximity to ground station')
  }

  if (checks.calibration.failed > 0) {
    recommendations.push(`${checks.calibration.failed} calibration(s) failed — retry calibration and verify hardware connections`)
  }
  if (checks.calibration.pending > 0) {
    recommendations.push(`${checks.calibration.pending} calibration(s) pending — complete calibrations before flight operations`)
  }

  if (checks.alerts.unresolvedCritical > 0) {
    recommendations.push(`${checks.alerts.unresolvedCritical} unresolved critical alert(s) — address immediately before flight`)
  }

  if (checks.missions.stuckCount > 0) {
    recommendations.push(`${checks.missions.stuckCount} mission(s) appear stuck — consider aborting and reviewing mission logs`)
  }

  return recommendations
}
