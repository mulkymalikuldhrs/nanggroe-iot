// ============================================================
// NANGGROE IOT - MCP (Model Context Protocol) Integration API
// GET  /api/mcp — List available MCP tools and their statuses
// POST /api/mcp — Execute an MCP tool call
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { picoclawCheck } from '@/lib/agents'
import { validateApiKey } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getLatestTelemetrySnapshot } from '@/lib/telemetry'
import { executeCalibration } from '@/lib/calibration'
import ZAI from 'z-ai-web-dev-sdk'

// --- MCP Tool Definitions ---
const MCP_TOOLS = [
  {
    name: 'mavlink_command',
    description: 'Send MAVLink commands to the flight controller (e.g., arm, disarm, takeoff, land, RTL, set mode)',
    status: 'available' as const,
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'MAVLink command name (e.g., "ARM", "DISARM", "TAKEOFF", "LAND", "RTL", "SET_MODE")',
          enum: ['ARM', 'DISARM', 'TAKEOFF', 'LAND', 'RTL', 'SET_MODE', 'CHANGE_SPEED', 'SET_HOME'],
        },
        parameters: {
          type: 'object',
          description: 'Command-specific parameters',
          properties: {
            altitude: { type: 'number', description: 'Target altitude in meters (for TAKEOFF)' },
            speed: { type: 'number', description: 'Target speed in m/s (for CHANGE_SPEED)' },
            mode: { type: 'string', description: 'Flight mode (for SET_MODE)', enum: ['STABILIZE', 'ALT_HOLD', 'LOITER', 'AUTO', 'RTL', 'LAND'] },
          },
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'telemetry_query',
    description: 'Query historical telemetry data from the database. Supports filtering by metric, device, time range.',
    status: 'available' as const,
    inputSchema: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'Telemetry metric to query',
          enum: ['battery_voltage', 'gps_lat', 'gps_lng', 'altitude', 'signal_strength', 'temperature', 'humidity', 'pressure', 'heading', 'speed', 'roll', 'pitch', 'yaw', 'motor_rpm_1', 'motor_rpm_2', 'motor_rpm_3', 'current_draw'],
        },
        deviceId: {
          type: 'string',
          description: 'Filter by device ID (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of readings to return (default: 50)',
        },
      },
      required: ['metric'],
    },
  },
  {
    name: 'mission_generate',
    description: 'Generate mission waypoints using AI (Hermes agent). Provide a natural language description of the desired mission.',
    status: 'available' as const,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Natural language description of the mission (e.g., "Map the area near Lhoksukon for agricultural survey")',
        },
        missionType: {
          type: 'string',
          description: 'Type of mission to generate',
          enum: ['mapping', 'survey', 'delivery', 'patrol', 'inspection', 'agriculture'],
        },
        altitude: {
          type: 'number',
          description: 'Default altitude in meters (default: 50)',
        },
        speed: {
          type: 'number',
          description: 'Default speed in m/s (default: 5)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'hardware_diagnostic',
    description: 'Run hardware diagnostics on connected devices. Returns status, health, and connectivity information.',
    status: 'available' as const,
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'Specific device ID to diagnose (optional — runs on all devices if omitted)',
        },
        deviceType: {
          type: 'string',
          description: 'Filter by device type',
          enum: ['flight_controller', 'companion_computer', 'gps', 'camera', 'sensor', 'radio', 'battery', 'motor', 'esc'],
        },
        includeOffline: {
          type: 'boolean',
          description: 'Include offline devices in diagnostic (default: true)',
        },
      },
    },
  },
  {
    name: 'calibration_control',
    description: 'Control calibration processes for sensors and actuators. Start, monitor, or query calibration status.',
    status: 'available' as const,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Calibration action to perform',
          enum: ['status', 'start', 'history'],
        },
        deviceType: {
          type: 'string',
          description: 'Device type to calibrate',
          enum: ['compass', 'accelerometer', 'gyro', 'esc', 'radio'],
        },
        limit: {
          type: 'number',
          description: 'Number of records for history (default: 10)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'safety_assessment',
    description: 'Run PicoClaw safety assessment on current telemetry data. Evaluates battery, signal, altitude, temperature, and motor conditions.',
    status: 'available' as const,
    inputSchema: {
      type: 'object',
      properties: {
        useLiveTelemetry: {
          type: 'boolean',
          description: 'Use live telemetry snapshot from database (default: true)',
        },
        customSnapshot: {
          type: 'object',
          description: 'Custom telemetry snapshot for assessment ( overrides live data)',
          properties: {
            battery_voltage: { type: 'number' },
            gps_lat: { type: 'number' },
            gps_lng: { type: 'number' },
            altitude: { type: 'number' },
            signal_strength: { type: 'number' },
            temperature: { type: 'number' },
            humidity: { type: 'number' },
            pressure: { type: 'number' },
            heading: { type: 'number' },
            speed: { type: 'number' },
            roll: { type: 'number' },
            pitch: { type: 'number' },
            yaw: { type: 'number' },
            motor_rpm_1: { type: 'number' },
            motor_rpm_2: { type: 'number' },
            motor_rpm_3: { type: 'number' },
            current_draw: { type: 'number' },
          },
        },
      },
    },
  },
]

// --- GET: List MCP tools ---
export async function GET(request: NextRequest) {
  const rateLimitError = rateLimit(request, { windowMs: 60000, maxRequests: 30 })
  if (rateLimitError) return rateLimitError
  try {
    // Check tool availability by querying the database
    const toolStatuses = await Promise.all(
      MCP_TOOLS.map(async (tool) => {
        let status: 'available' | 'unavailable' | 'error' = 'available'

        try {
          switch (tool.name) {
            case 'telemetry_query': {
              await db.telemetryReading.count()
              status = 'available'
              break
            }
            case 'hardware_diagnostic': {
              await db.hardwareDevice.count()
              status = 'available'
              break
            }
            case 'calibration_control': {
              await db.calibration.count()
              status = 'available'
              break
            }
            default:
              status = 'available'
          }
        } catch {
          status = 'error'
        }

        return {
          ...tool,
          status,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        tools: toolStatuses,
        totalTools: toolStatuses.length,
        availableTools: toolStatuses.filter(t => t.status === 'available').length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve MCP tools' },
      { status: 500 }
    )
  }
}

// --- POST: Execute MCP tool ---
export async function POST(request: NextRequest) {
  const rateLimitError = rateLimit(request, { windowMs: 60000, maxRequests: 30 })
  if (rateLimitError) return rateLimitError

  const authError = validateApiKey(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { tool, arguments: toolArgs } = body as {
      tool: string
      arguments: Record<string, unknown>
    }

    if (!tool || typeof tool !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Tool name is required and must be a string' },
        { status: 400 }
      )
    }

    // Find the tool definition
    const toolDef = MCP_TOOLS.find(t => t.name === tool)
    if (!toolDef) {
      return NextResponse.json(
        { success: false, error: `Unknown tool: ${tool}` },
        { status: 404 }
      )
    }

    if (toolDef.status !== 'available') {
      return NextResponse.json(
        { success: false, error: `Tool ${tool} is not available (status: ${toolDef.status})` },
        { status: 400 }
      )
    }

    // Route to appropriate handler
    let result: unknown
    let httpStatus = 200

    switch (tool) {
      case 'mavlink_command':
        result = await handleMavlinkCommand(toolArgs || {})
        break
      case 'telemetry_query':
        result = await handleTelemetryQuery(toolArgs || {})
        break
      case 'mission_generate':
        result = await handleMissionGenerate(toolArgs || {})
        break
      case 'hardware_diagnostic':
        result = await handleHardwareDiagnostic(toolArgs || {})
        break
      case 'calibration_control':
        result = await handleCalibrationControl(toolArgs || {})
        break
      case 'safety_assessment':
        result = await handleSafetyAssessment(toolArgs || {})
        break
      default:
        return NextResponse.json(
          { success: false, error: `No handler for tool: ${tool}` },
          { status: 500 }
        )
    }

    // Check if the handler returned an error object
    const resultObj = result as Record<string, unknown> | null
    if (resultObj && resultObj.error && !resultObj.queued && !resultObj.missionId && !resultObj.statuses && !resultObj.records && !resultObj.devices && resultObj.safe === undefined) {
      httpStatus = 400
      return NextResponse.json({
        success: false,
        error: resultObj.error,
        tool,
        timestamp: new Date().toISOString(),
      }, { status: httpStatus })
    }

    return NextResponse.json({
      success: true,
      data: result,
      tool,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Tool execution failed' },
      { status: 500 }
    )
  }
}

// --- Tool Handlers ---

async function handleMavlinkCommand(args: Record<string, unknown>) {
  const command = args.command as string
  const parameters = (args.parameters as Record<string, unknown>) ?? {}

  const validCommands = ['ARM', 'DISARM', 'TAKEOFF', 'LAND', 'RTL', 'SET_MODE', 'CHANGE_SPEED', 'SET_HOME']
  if (!command || !validCommands.includes(command)) {
    return {
      error: `Invalid command. Valid commands: ${validCommands.join(', ')}`,
    }
  }

  // SIMULATED: No real MAVLink command is sent to the flight controller.
  // In production, this would communicate with the MAVLink-compatible FC.
  return {
    simulated: true,
    queued: true,
    command,
    parameters,
    message: `MAVLink command "${command}" SIMULATED — no real hardware command was sent`,
    warning: 'This is a SIMULATION. No MAVLink command was sent to any flight controller. Real flight requires hardware connection.',
    sequenceId: `SIM-${Date.now()}`,
  }
}

async function handleTelemetryQuery(args: Record<string, unknown>) {
  const metric = args.metric as string
  const deviceId = args.deviceId as string | undefined
  const limit = Math.min((args.limit as number) ?? 50, 200)

  if (!metric) {
    return {
      error: 'metric parameter is required',
      readings: [],
    }
  }

  const where: Record<string, unknown> = { metric }
  if (deviceId) where.deviceId = deviceId

  const readings = await db.telemetryReading.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  })

  // Compute basic statistics
  const values = readings.map(r => r.value)
  const stats = values.length > 0 ? {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
    count: values.length,
    latest: values[0] ?? null,
    oldest: values[values.length - 1] ?? null,
  } : null

  return {
    metric,
    readings: readings.slice(0, 20).map(r => ({
      id: r.id,
      value: r.value,
      unit: r.unit,
      source: r.source,
      timestamp: r.timestamp,
    })),
    stats,
    totalReadings: readings.length,
  }
}

async function handleMissionGenerate(args: Record<string, unknown>) {
  const prompt = args.prompt as string
  const missionType = (args.missionType as string) ?? 'mapping'
  const altitude = (args.altitude as number) ?? 50
  const speed = (args.speed as number) ?? 5

  if (!prompt) {
    return {
      error: 'prompt parameter is required',
    }
  }

  try {
    const zai = await ZAI.create()

    const response = await zai.chat.completions.create({
      model: 'default',
      messages: [
        {
          role: 'system',
          content: `You are a mission planning AI for NANGGROE IOT — an autonomous drone operating system for tricopter amphibious platforms in Aceh Utara, Indonesia (4.9125°N, 97.1347°E).

Generate a JSON mission plan with waypoints. Each waypoint must have: lat (number), lng (number), alt (number), action (string: "fly", "hover", "take_photo", "land", "takeoff").

The mission is of type: ${missionType}
Default altitude: ${altitude}m, speed: ${speed}m/s.
Max altitude: 120m (regulatory limit).
Home position: 4.9125, 97.1347

Always include a takeoff waypoint first and a land/RTH waypoint last.
Respond ONLY with valid JSON:
{
  "name": "Mission Name",
  "description": "Mission description",
  "waypoints": [...],
  "estimatedFlightTime": number (minutes),
  "batteryMargin": number (percent)
}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    })

    const responseContent = response.choices?.[0]?.message?.content ?? ''

    // Try to extract JSON from response
    let missionData: Record<string, unknown> | null = null
    try {
      const jsonMatch = responseContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : responseContent
      missionData = JSON.parse(jsonStr)
    } catch {
      missionData = {
        name: `${missionType} Mission`,
        description: prompt,
        waypoints: [
          { lat: 4.9125, lng: 97.1347, alt: altitude, action: 'takeoff' },
          { lat: 4.9135, lng: 97.1357, alt: altitude, action: 'fly' },
          { lat: 4.9145, lng: 97.1347, alt: altitude, action: 'take_photo' },
          { lat: 4.9125, lng: 97.1347, alt: 0, action: 'land' },
        ],
        estimatedFlightTime: 12,
        batteryMargin: 35,
      }
    }

    // Create the mission in the database
    const waypoints = (missionData?.waypoints ?? []) as Array<{ lat: number; lng: number; alt: number; action: string }>
    const mission = await db.mission.create({
      data: {
        name: (missionData?.name as string) ?? `${missionType} Mission`,
        description: (missionData?.description as string) ?? prompt,
        type: missionType,
        status: 'planned',
        prompt,
        waypoints: JSON.stringify(waypoints),
        altitude,
        speed,
      },
    })

    return {
      missionId: mission.id,
      name: mission.name,
      description: mission.description,
      waypoints,
      estimatedFlightTime: (missionData?.estimatedFlightTime as number) ?? null,
      batteryMargin: (missionData?.batteryMargin as number) ?? null,
      rawResponse: responseContent,
    }
  } catch (error) {
    return {
      error: 'Failed to generate mission with AI',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function handleHardwareDiagnostic(args: Record<string, unknown>) {
  const deviceId = args.deviceId as string | undefined
  const deviceType = args.deviceType as string | undefined
  const includeOffline = (args.includeOffline as boolean) !== false

  const where: Record<string, unknown> = {}
  if (deviceId) where.id = deviceId
  if (deviceType) where.deviceType = deviceType
  if (!includeOffline) where.status = { not: 'offline' }

  const devices = await db.hardwareDevice.findMany({
    where,
    include: { profiles: true },
    orderBy: { lastSeen: 'desc' },
  })

  const diagnostics = devices.map(device => {
    const timeSinceLastSeen = Date.now() - new Date(device.lastSeen).getTime()
    const isStale = timeSinceLastSeen > 60000

    return {
      id: device.id,
      name: device.name,
      deviceType: device.deviceType,
      status: device.status,
      protocol: device.protocol,
      port: device.port,
      firmware: device.firmware,
      isStale,
      lastSeen: device.lastSeen,
      profileCount: device.profiles.length,
      healthScore: calculateHealthScore(device.status, isStale),
      recommendations: getRecommendations(device.status, device.deviceType, isStale),
    }
  })

  const overallHealth = diagnostics.length > 0
    ? Math.round(diagnostics.reduce((sum, d) => sum + d.healthScore, 0) / diagnostics.length)
    : 0

  return {
    devices: diagnostics,
    totalDevices: diagnostics.length,
    healthyDevices: diagnostics.filter(d => d.healthScore >= 80).length,
    warningDevices: diagnostics.filter(d => d.healthScore >= 50 && d.healthScore < 80).length,
    criticalDevices: diagnostics.filter(d => d.healthScore < 50).length,
    overallHealth,
    timestamp: new Date().toISOString(),
  }
}

async function handleCalibrationControl(args: Record<string, unknown>) {
  const action = args.action as string
  const deviceType = args.deviceType as string | undefined
  const limit = Math.min((args.limit as number) ?? 10, 50)

  if (!action || !['status', 'start', 'history'].includes(action)) {
    return {
      error: 'action must be one of: status, start, history',
    }
  }

  switch (action) {
    case 'status': {
      const types = ['compass', 'accelerometer', 'gyro', 'esc', 'radio']
      const statuses = await Promise.all(
        types.map(async (type) => {
          const latest = await db.calibration.findFirst({
            where: { deviceType: type },
            orderBy: { performedAt: 'desc' },
          })
          const inProgress = await db.calibration.findFirst({
            where: { deviceType: type, status: 'in_progress' },
          })
          return {
            deviceType: type,
            latestCalibration: latest ?? null,
            inProgress: !!inProgress,
          }
        })
      )

      return { statuses }
    }

    case 'start': {
      if (!deviceType) {
        return { error: 'deviceType is required for start action' }
      }

      const validTypes = ['compass', 'accelerometer', 'gyro', 'esc', 'radio']
      if (!validTypes.includes(deviceType)) {
        return { error: `Invalid deviceType. Must be one of: ${validTypes.join(', ')}` }
      }

      const existing = await db.calibration.findFirst({
        where: { deviceType, status: 'in_progress' },
      })
      if (existing) {
        return {
          error: `Calibration for ${deviceType} is already in progress`,
          calibrationId: existing.id,
        }
      }

      const calibration = await db.calibration.create({
        data: {
          deviceType,
          status: 'pending',
        },
      })

      // Call the calibration service directly — NO self-referential HTTP call.
      // The executeCalibration function runs a SIMULATED calibration.
      executeCalibration(calibration.id, deviceType).catch(err => {
      })

      return {
        calibrationId: calibration.id,
        deviceType,
        status: 'pending',
        simulated: true,
        warning: 'Calibration is SIMULATED. No real hardware calibration will be performed.',
        message: `SIMULATED calibration for ${deviceType} initiated — real calibration requires hardware connection`,
      }
    }

    case 'history': {
      const where: Record<string, unknown> = {}
      if (deviceType) where.deviceType = deviceType

      const records = await db.calibration.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: limit,
      })

      return {
        records,
        total: records.length,
      }
    }

    default:
      return { error: 'Unknown action' }
  }
}

async function handleSafetyAssessment(args: Record<string, unknown>) {
  const useLiveTelemetry = (args.useLiveTelemetry as boolean) !== false
  const customSnapshot = args.customSnapshot as Record<string, unknown> | undefined

  let telemetrySnapshot

  if (customSnapshot) {
    telemetrySnapshot = {
      battery_voltage: (customSnapshot.battery_voltage as number) ?? 14.8,
      gps_lat: (customSnapshot.gps_lat as number) ?? 4.9125,
      gps_lng: (customSnapshot.gps_lng as number) ?? 97.1347,
      altitude: (customSnapshot.altitude as number) ?? 50,
      signal_strength: (customSnapshot.signal_strength as number) ?? -45,
      temperature: (customSnapshot.temperature as number) ?? 28,
      humidity: (customSnapshot.humidity as number) ?? 75,
      pressure: (customSnapshot.pressure as number) ?? 1013,
      heading: (customSnapshot.heading as number) ?? 0,
      speed: (customSnapshot.speed as number) ?? 0,
      roll: (customSnapshot.roll as number) ?? 0,
      pitch: (customSnapshot.pitch as number) ?? 0,
      yaw: (customSnapshot.yaw as number) ?? 0,
      motor_rpm_1: (customSnapshot.motor_rpm_1 as number) ?? 0,
      motor_rpm_2: (customSnapshot.motor_rpm_2 as number) ?? 0,
      motor_rpm_3: (customSnapshot.motor_rpm_3 as number) ?? 0,
      current_draw: (customSnapshot.current_draw as number) ?? 0,
    }
  } else if (useLiveTelemetry) {
    telemetrySnapshot = await getLatestTelemetrySnapshot()
  } else {
    const latestReadings = await db.telemetryReading.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    })

    const snapshotMap: Record<string, number> = {}
    for (const r of latestReadings) {
      if (snapshotMap[r.metric] === undefined) {
        snapshotMap[r.metric] = r.value
      }
    }

    telemetrySnapshot = {
      battery_voltage: snapshotMap.battery_voltage ?? 14.8,
      gps_lat: snapshotMap.gps_lat ?? 4.9125,
      gps_lng: snapshotMap.gps_lng ?? 97.1347,
      altitude: snapshotMap.altitude ?? 50,
      signal_strength: snapshotMap.signal_strength ?? -45,
      temperature: snapshotMap.temperature ?? 28,
      humidity: snapshotMap.humidity ?? 75,
      pressure: snapshotMap.pressure ?? 1013,
      heading: snapshotMap.heading ?? 0,
      speed: snapshotMap.speed ?? 0,
      roll: snapshotMap.roll ?? 0,
      pitch: snapshotMap.pitch ?? 0,
      yaw: snapshotMap.yaw ?? 0,
      motor_rpm_1: snapshotMap.motor_rpm_1 ?? 0,
      motor_rpm_2: snapshotMap.motor_rpm_2 ?? 0,
      motor_rpm_3: snapshotMap.motor_rpm_3 ?? 0,
      current_draw: snapshotMap.current_draw ?? 0,
    }
  }

  // If telemetrySnapshot is null (no data), use defaults
  if (!telemetrySnapshot) {
    telemetrySnapshot = {
      battery_voltage: 14.8,
      gps_lat: 4.9125,
      gps_lng: 97.1347,
      altitude: 50,
      signal_strength: -45,
      temperature: 28,
      humidity: 75,
      pressure: 1013,
      heading: 0,
      speed: 0,
      roll: 0,
      pitch: 0,
      yaw: 0,
      motor_rpm_1: 0,
      motor_rpm_2: 0,
      motor_rpm_3: 0,
      current_draw: 0,
    }
  }

  const safetyResult = picoclawCheck(telemetrySnapshot)

  return {
    safe: safetyResult.safe,
    telemetry: telemetrySnapshot,
    alerts: safetyResult.alerts,
    actions: safetyResult.actions,
    alertCount: safetyResult.alerts.length,
    criticalCount: safetyResult.alerts.filter(a => a.level === 'critical').length,
    warningCount: safetyResult.alerts.filter(a => a.level === 'warning').length,
    actionCount: safetyResult.actions.length,
    timestamp: new Date().toISOString(),
  }
}

// --- Helper Functions ---

function calculateHealthScore(status: string, isStale: boolean): number {
  let score = 100
  switch (status) {
    case 'active': score = 100; break
    case 'initialized': score = 85; break
    case 'detected': score = 60; break
    case 'unknown': score = 40; break
    case 'error': score = 15; break
    case 'offline': score = 5; break
    default: score = 50
  }
  if (isStale && status !== 'offline') score -= 20
  return Math.max(0, Math.min(100, score))
}

function getRecommendations(status: string, deviceType: string, isStale: boolean): string[] {
  const recs: string[] = []

  if (status === 'error') {
    recs.push('Check hardware connections and power supply')
    recs.push(`Run diagnostic on ${deviceType} device`)
  }
  if (status === 'offline') {
    recs.push('Verify device is powered on and connected')
    recs.push('Check cable connections and port availability')
  }
  if (status === 'detected') {
    recs.push('Initialize device to bring it online')
  }
  if (isStale) {
    recs.push('Device has not been seen recently — check connectivity')
  }
  if (status === 'active' && !isStale) {
    recs.push('Device operating normally')
  }

  return recs
}
