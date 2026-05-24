// ============================================================
// NANGGROE OS AI - System Status & Config API
// GET  /api/system — Return system status
// POST /api/system — Update system config
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { seedDatabase } from '@/lib/seed'

export async function GET() {
  try {
    // Get system config
    const configs = await db.systemConfig.findMany()
    const configMap: Record<string, string> = {}
    for (const c of configs) {
      configMap[c.key] = c.value
    }

    // Get device counts
    const totalDevices = await db.hardwareDevice.count()
    const activeDevices = await db.hardwareDevice.count({
      where: { status: 'active' },
    })

    // Get active mission
    const activeMission = await db.mission.findFirst({
      where: { status: 'active' },
    })

    // Get active session
    const activeSession = await db.session.findFirst({
      where: { status: 'active' },
    })

    // Get unread alerts count
    const unreadAlerts = await db.alert.count({
      where: { isRead: false },
    })

    // Get agent status from config
    const hermesEnabled = configMap['agent.hermes.enabled'] === 'true'
    const picoclawEnabled = configMap['agent.picoclaw.enabled'] === 'true'

    // Calculate uptime (from session start)
    const uptimeMs = activeSession
      ? Date.now() - new Date(activeSession.startedAt).getTime()
      : 0

    const status = {
      name: configMap['system.name'] || 'NANGGROE OS AI',
      version: configMap['system.version'] || '0.1.0-mvp',
      mode: configMap['system.mode'] || 'discovery',
      region: configMap['system.region'] || 'Aceh Utara',
      homePosition: {
        lat: parseFloat(configMap['system.home_lat'] || '4.9125'),
        lng: parseFloat(configMap['system.home_lng'] || '97.1347'),
      },
      uptime: uptimeMs,
      uptimeFormatted: formatUptime(uptimeMs),
      devices: {
        total: totalDevices,
        active: activeDevices,
      },
      activeMission: activeMission
        ? {
            id: activeMission.id,
            name: activeMission.name,
            type: activeMission.type,
            status: activeMission.status,
          }
        : null,
      agents: {
        hermes: {
          enabled: hermesEnabled,
          status: hermesEnabled ? 'online' : 'offline',
        },
        picoclaw: {
          enabled: picoclawEnabled,
          status: picoclawEnabled ? 'online' : 'offline',
        },
      },
      session: activeSession
        ? {
            id: activeSession.id,
            name: activeSession.name,
            mode: activeSession.mode,
          }
        : null,
      alerts: {
        unread: unreadAlerts,
      },
      config: configMap,
    }

    return NextResponse.json({ success: true, data: status })
  } catch (error) {
    console.error('[System API] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve system status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { configs, seed } = body as {
      configs?: Array<{ key: string; value: string; category?: string }>
      seed?: boolean
    }

    // Optionally seed the database
    if (seed) {
      const result = await seedDatabase()
      return NextResponse.json({
        success: true,
        data: { seeded: true, ...result },
        message: 'Database seeded successfully',
      })
    }

    // Update config entries
    if (configs && Array.isArray(configs)) {
      for (const config of configs) {
        await db.systemConfig.upsert({
          where: { key: config.key },
          update: { value: config.value, category: config.category || 'general' },
          create: {
            key: config.key,
            value: config.value,
            category: config.category || 'general',
          },
        })
      }

      return NextResponse.json({
        success: true,
        data: { updated: configs.length },
        message: `Updated ${configs.length} config entries`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'No valid action specified. Provide configs array or seed=true.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[System API] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update system config' },
      { status: 500 }
    )
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}
