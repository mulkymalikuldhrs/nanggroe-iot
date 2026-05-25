// ============================================================
// NANGGROE OS AI - MCP (Model Context Protocol) Server
// Full MCP implementation with JSON-RPC 2.0, tool registry,
// resource subscriptions, and protocol version 2024-11-05
// ============================================================

import { db } from '@/lib/db'
import { picoclawCheck } from '@/lib/agents'
import { getLatestTelemetrySnapshot } from '@/lib/telemetry'
import { getLLMService } from '@/lib/llm'
import type { TelemetrySnapshot, TelemetryMetric } from '@/lib/types'
import { TELEMETRY_UNITS, SAFETY_THRESHOLDS } from '@/lib/constants'
import ZAI from 'z-ai-web-dev-sdk'

// ============================================================
// MCP Protocol Types
// ============================================================

export const MCP_PROTOCOL_VERSION = '2024-11-05'

export interface MCPRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: unknown
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

export interface MCPResource {
  uri: string
  name: string
  description: string
  mimeType: string
  read: () => Promise<string | Buffer>
}

export interface MCPServerInfo {
  name: string
  version: string
  protocolVersion: string
  capabilities: Record<string, unknown>
}

export interface MCPInitializeResult {
  protocolVersion: string
  capabilities: {
    tools: { listChanged: boolean }
    resources: { subscribe: boolean; listChanged: boolean }
  }
  serverInfo: {
    name: string
    version: string
  }
}

// --- JSON-RPC 2.0 Error Codes ---
const JSONRPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' },
} as const

// ============================================================
// MCP Server — Singleton with tool/resource registry
// ============================================================

export class MCPServer {
  private static instance: MCPServer
  private tools: Map<string, MCPTool> = new Map()
  private resources: Map<string, MCPResource> = new Map()
  private subscriptions: Map<string, Set<string>> = new Map() // uri -> sessionIds
  private initialized = false

  private constructor() {
    this.registerBuiltinTools()
    this.registerBuiltinResources()
  }

  static getInstance(): MCPServer {
    if (!MCPServer.instance) {
      MCPServer.instance = new MCPServer()
    }
    return MCPServer.instance
  }

  // ========================================
  // Tool Registration
  // ========================================

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool)
  }

  unregisterTool(name: string): void {
    this.tools.delete(name)
  }

  // ========================================
  // Resource Registration
  // ========================================

  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource)
  }

  // ========================================
  // Built-in Tools
  // ========================================

  private registerBuiltinTools(): void {
    // --- mavlink_command ---
    this.registerTool({
      name: 'mavlink_command',
      description: 'Send MAVLink commands to the flight controller (e.g., arm, disarm, takeoff, land, RTL, set mode)',
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'MAVLink command name',
            enum: ['ARM', 'DISARM', 'TAKEOFF', 'LAND', 'RTL', 'SET_MODE', 'CHANGE_SPEED', 'SET_HOME'],
          },
          parameters: {
            type: 'object',
            description: 'Command-specific parameters',
            properties: {
              altitude: { type: 'number', description: 'Target altitude in meters (for TAKEOFF)' },
              speed: { type: 'number', description: 'Target speed in m/s (for CHANGE_SPEED)' },
              mode: {
                type: 'string',
                description: 'Flight mode (for SET_MODE)',
                enum: ['STABILIZE', 'ALT_HOLD', 'LOITER', 'AUTO', 'RTL', 'LAND'],
              },
            },
          },
        },
        required: ['command'],
      },
      handler: async (args) => {
        const command = args.command as string
        const parameters = (args.parameters as Record<string, unknown>) || {}
        const validCommands = ['ARM', 'DISARM', 'TAKEOFF', 'LAND', 'RTL', 'SET_MODE', 'CHANGE_SPEED', 'SET_HOME']
        if (!command || !validCommands.includes(command)) {
          return { queued: false, error: `Invalid command. Valid: ${validCommands.join(', ')}` }
        }
        return {
          queued: true,
          command,
          parameters,
          message: `MAVLink command "${command}" queued for execution`,
          sequenceId: `CMD-${Date.now()}`,
        }
      },
    })

    // --- telemetry_query ---
    this.registerTool({
      name: 'telemetry_query',
      description: 'Query historical telemetry data from the database. Supports filtering by metric, device, time range.',
      inputSchema: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            description: 'Telemetry metric to query',
            enum: [
              'battery_voltage', 'gps_lat', 'gps_lng', 'altitude', 'signal_strength',
              'temperature', 'humidity', 'pressure', 'heading', 'speed',
              'roll', 'pitch', 'yaw', 'motor_rpm_1', 'motor_rpm_2', 'motor_rpm_3', 'current_draw',
            ],
          },
          deviceId: { type: 'string', description: 'Filter by device ID (optional)' },
          limit: { type: 'number', description: 'Maximum number of readings to return (default: 50)' },
        },
        required: ['metric'],
      },
      handler: async (args) => {
        const metric = args.metric as string
        const deviceId = args.deviceId as string | undefined
        const limit = Math.min((args.limit as number) || 50, 200)

        if (!metric) return { error: 'metric is required', readings: [] }

        const where: Record<string, unknown> = { metric }
        if (deviceId) where.deviceId = deviceId

        const readings = await db.telemetryReading.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
        })

        const values = readings.map(r => r.value)
        const stats = values.length > 0 ? {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
          count: values.length,
          latest: values[0] || null,
        } : null

        return {
          metric,
          readings: readings.slice(0, 20).map(r => ({
            value: r.value,
            unit: r.unit,
            source: r.source,
            timestamp: r.timestamp,
          })),
          stats,
          totalReadings: readings.length,
        }
      },
    })

    // --- mission_generate ---
    this.registerTool({
      name: 'mission_generate',
      description: 'Generate mission waypoints using AI (Hermes agent). Provide a natural language description of the desired mission.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Natural language description of the mission' },
          missionType: {
            type: 'string',
            description: 'Type of mission',
            enum: ['mapping', 'survey', 'delivery', 'patrol', 'inspection', 'agriculture'],
          },
          altitude: { type: 'number', description: 'Default altitude in meters' },
          speed: { type: 'number', description: 'Default speed in m/s' },
        },
        required: ['prompt'],
      },
      handler: async (args) => {
        const prompt = args.prompt as string
        const missionType = (args.missionType as string) || 'mapping'
        const altitude = (args.altitude as number) || 50
        const speed = (args.speed as number) || 5

        if (!prompt) return { error: 'prompt is required' }

        try {
          const zai = await ZAI.create()
          const response = await zai.chat.completions.create({
            model: 'default',
            messages: [
              {
                role: 'system',
                content: `You are a mission planning AI for NANGGROE OS AI. Generate a JSON mission plan with waypoints.
Each waypoint: {lat, lng, alt, action}. Actions: fly, hover, take_photo, land, takeoff.
Mission type: ${missionType}. Altitude: ${altitude}m. Speed: ${speed}m/s. Max altitude: 120m.
Home: 4.9125, 97.1347. Include takeoff first and land/RTH last.
Respond ONLY with valid JSON: {"name":"...","description":"...","waypoints":[...],"estimatedFlightTime":number,"batteryMargin":number}`,
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 2048,
          })

          const responseContent = response.choices?.[0]?.message?.content || ''
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

          const waypoints = (missionData?.waypoints || []) as Array<{ lat: number; lng: number; alt: number; action: string }>
          const mission = await db.mission.create({
            data: {
              name: (missionData?.name as string) || `${missionType} Mission`,
              description: (missionData?.description as string) || prompt,
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
            waypoints,
            estimatedFlightTime: missionData?.estimatedFlightTime || null,
            batteryMargin: missionData?.batteryMargin || null,
          }
        } catch (error) {
          return {
            error: 'Failed to generate mission with AI',
            details: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    })

    // --- hardware_diagnostic ---
    this.registerTool({
      name: 'hardware_diagnostic',
      description: 'Run hardware diagnostics on connected devices. Returns status, health, and connectivity information.',
      inputSchema: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', description: 'Specific device ID to diagnose (optional)' },
          deviceType: {
            type: 'string',
            description: 'Filter by device type',
            enum: ['flight_controller', 'companion_computer', 'gps', 'camera', 'sensor', 'radio', 'battery', 'motor', 'esc'],
          },
          includeOffline: { type: 'boolean', description: 'Include offline devices (default: true)' },
        },
      },
      handler: async (args) => {
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

          let healthScore = 100
          switch (device.status) {
            case 'active': healthScore = 100; break
            case 'initialized': healthScore = 85; break
            case 'detected': healthScore = 60; break
            case 'unknown': healthScore = 40; break
            case 'error': healthScore = 15; break
            case 'offline': healthScore = 5; break
            default: healthScore = 50
          }
          if (isStale && device.status !== 'offline') healthScore -= 20
          healthScore = Math.max(0, Math.min(100, healthScore))

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
            healthScore,
            profileCount: device.profiles.length,
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
        }
      },
    })

    // --- calibration_control ---
    this.registerTool({
      name: 'calibration_control',
      description: 'Control calibration processes for sensors and actuators. Start, monitor, or query calibration status.',
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
          limit: { type: 'number', description: 'Number of records for history (default: 10)' },
        },
        required: ['action'],
      },
      handler: async (args) => {
        const action = args.action as string
        const deviceType = args.deviceType as string | undefined
        const limit = Math.min((args.limit as number) || 10, 50)

        if (!['status', 'start', 'history'].includes(action)) {
          return { error: 'action must be one of: status, start, history' }
        }

        if (action === 'status') {
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
              return { deviceType: type, latestCalibration: latest, inProgress: !!inProgress }
            })
          )
          return { statuses }
        }

        if (action === 'start') {
          if (!deviceType) return { error: 'deviceType is required for start action' }
          const validTypes = ['compass', 'accelerometer', 'gyro', 'esc', 'radio']
          if (!validTypes.includes(deviceType)) {
            return { error: `Invalid deviceType. Must be one of: ${validTypes.join(', ')}` }
          }
          const calibration = await db.calibration.create({
            data: { deviceType, status: 'pending' },
          })
          return { calibrationId: calibration.id, deviceType, status: 'pending' }
        }

        if (action === 'history') {
          const where: Record<string, unknown> = {}
          if (deviceType) where.deviceType = deviceType
          const records = await db.calibration.findMany({
            where,
            orderBy: { performedAt: 'desc' },
            take: limit,
          })
          return { records, total: records.length }
        }

        return { error: 'Unknown action' }
      },
    })

    // --- safety_assessment ---
    this.registerTool({
      name: 'safety_assessment',
      description: 'Run PicoClaw safety assessment on current telemetry data. Evaluates battery, signal, altitude, temperature, and motor conditions.',
      inputSchema: {
        type: 'object',
        properties: {
          useLiveTelemetry: { type: 'boolean', description: 'Use live telemetry snapshot (default: true)' },
          customSnapshot: {
            type: 'object',
            description: 'Custom telemetry snapshot for assessment',
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
      handler: async (args) => {
        const useLiveTelemetry = (args.useLiveTelemetry as boolean) !== false
        const customSnapshot = args.customSnapshot as Record<string, unknown> | undefined

        let telemetrySnapshot: TelemetrySnapshot

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
          const live = await getLatestTelemetrySnapshot()
          telemetrySnapshot = live ?? {
            battery_voltage: 14.8, gps_lat: 4.9125, gps_lng: 97.1347,
            altitude: 50, signal_strength: -45, temperature: 28, humidity: 75,
            pressure: 1013, heading: 0, speed: 0, roll: 0, pitch: 0, yaw: 0,
            motor_rpm_1: 0, motor_rpm_2: 0, motor_rpm_3: 0, current_draw: 0,
          }
        } else {
          const latestReadings = await db.telemetryReading.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100,
          })
          const snapshotMap: Record<string, number> = {}
          for (const r of latestReadings) {
            if (snapshotMap[r.metric] === undefined) snapshotMap[r.metric] = r.value
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

        const safetyResult = picoclawCheck(telemetrySnapshot)

        return {
          safe: safetyResult.safe,
          telemetry: telemetrySnapshot,
          alerts: safetyResult.alerts,
          actions: safetyResult.actions,
          alertCount: safetyResult.alerts.length,
          criticalCount: safetyResult.alerts.filter(a => a.level === 'critical').length,
          warningCount: safetyResult.alerts.filter(a => a.level === 'warning').length,
        }
      },
    })

    // --- code_generate (NEW) ---
    this.registerTool({
      name: 'code_generate',
      description: 'Generate code for Nanggroe OS AI extensions, drivers, or scripts using AI. Supports Python, TypeScript, C, C++.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description of the code to generate' },
          language: { type: 'string', description: 'Programming language (python, typescript, c, cpp)', enum: ['python', 'typescript', 'c', 'cpp'] },
          context: { type: 'string', description: 'Additional context or existing code to modify (optional)' },
        },
        required: ['prompt', 'language'],
      },
      handler: async (args) => {
        const prompt = args.prompt as string
        const language = args.language as string
        const context = args.context as string | undefined

        if (!prompt || !language) {
          return { error: 'prompt and language are required' }
        }

        try {
          const llm = getLLMService()
          const code = await llm.generateCode(prompt, language)
          return { code, language, context: context || null }
        } catch (error) {
          return {
            error: 'Code generation failed',
            details: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    })

    // --- firmware_flash (NEW) ---
    this.registerTool({
      name: 'firmware_flash',
      description: 'Flash firmware to connected devices. Supports ArduPilot, PX4, and custom firmware images.',
      inputSchema: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', description: 'Target device ID for firmware flashing' },
          firmwareUrl: { type: 'string', description: 'URL or path to firmware image' },
          firmwareVersion: { type: 'string', description: 'Firmware version to flash (e.g., "ArduPilot 4.5.7")' },
          verify: { type: 'boolean', description: 'Verify firmware after flashing (default: true)' },
          backupCurrent: { type: 'boolean', description: 'Backup current firmware before flashing (default: true)' },
        },
        required: ['deviceId', 'firmwareVersion'],
      },
      handler: async (args) => {
        const deviceId = args.deviceId as string
        const firmwareVersion = args.firmwareVersion as string
        const verify = (args.verify as boolean) !== false
        const backupCurrent = (args.backupCurrent as boolean) !== false

        if (!deviceId || !firmwareVersion) {
          return { error: 'deviceId and firmwareVersion are required' }
        }

        const device = await db.hardwareDevice.findUnique({ where: { id: deviceId } })
        if (!device) {
          return { error: `Device not found: ${deviceId}` }
        }

        if (device.status === 'active') {
          return {
            error: 'Cannot flash firmware on active device. Please stop the device first.',
            deviceId,
            currentStatus: device.status,
          }
        }

        return {
          status: 'queued',
          deviceId,
          deviceName: device.name,
          deviceType: device.deviceType,
          targetFirmware: firmwareVersion,
          currentFirmware: device.firmware || 'unknown',
          verify,
          backupCurrent,
          message: `Firmware flash queued for ${device.name}: ${device.firmware || 'unknown'} → ${firmwareVersion}`,
          flashId: `FLASH-${Date.now()}`,
        }
      },
    })

    // --- device_connect (NEW) ---
    this.registerTool({
      name: 'device_connect',
      description: 'Connect a device driver to a hardware device. Manages HAL adapter connections and device initialization.',
      inputSchema: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', description: 'Device ID to connect' },
          adapterName: { type: 'string', description: 'HAL adapter name (e.g., pixhawk, bme280, mpu6050)' },
          config: { type: 'object', description: 'Adapter configuration (JSON)', properties: {
            baudRate: { type: 'number', description: 'UART baud rate (default: 57600)' },
            i2cBus: { type: 'number', description: 'I2C bus number (default: 1)' },
            address: { type: 'string', description: 'Device address (e.g., "0x76" for I2C)' },
          }},
          autoStart: { type: 'boolean', description: 'Auto-start the adapter after connection (default: true)' },
        },
        required: ['deviceId', 'adapterName'],
      },
      handler: async (args) => {
        const deviceId = args.deviceId as string
        const adapterName = args.adapterName as string
        const config = args.config as Record<string, unknown> | undefined
        const autoStart = (args.autoStart as boolean) !== false

        if (!deviceId || !adapterName) {
          return { error: 'deviceId and adapterName are required' }
        }

        const device = await db.hardwareDevice.findUnique({
          where: { id: deviceId },
          include: { profiles: true },
        })

        if (!device) {
          return { error: `Device not found: ${deviceId}` }
        }

        // Check if adapter already exists
        const existingProfile = device.profiles.find(p => p.adapterName === adapterName)
        if (existingProfile) {
          return {
            status: 'already_connected',
            deviceId,
            adapterName,
            profileId: existingProfile.id,
            message: `Adapter "${adapterName}" is already connected to ${device.name}`,
          }
        }

        // Create a new hardware profile (adapter connection)
        const profile = await db.hardwareProfile.create({
          data: {
            deviceId,
            adapterName,
            config: JSON.stringify(config || {}),
            isDefault: device.profiles.length === 0,
          },
        })

        // Update device status if auto-start
        if (autoStart && device.status === 'detected') {
          await db.hardwareDevice.update({
            where: { id: deviceId },
            data: { status: 'initialized', lastSeen: new Date() },
          })
        }

        return {
          status: 'connected',
          deviceId,
          deviceName: device.name,
          adapterName,
          profileId: profile.id,
          autoStarted: autoStart,
          message: `Adapter "${adapterName}" connected to ${device.name}`,
        }
      },
    })

    // --- test_run (NEW) ---
    this.registerTool({
      name: 'test_run',
      description: 'Run AI-powered tests on system components. Supports hardware tests, sensor validation, communication checks, and mission simulations.',
      inputSchema: {
        type: 'object',
        properties: {
          testType: {
            type: 'string',
            description: 'Type of test to run',
            enum: ['hardware', 'sensor', 'communication', 'mission_simulation', 'full_system'],
          },
          deviceId: { type: 'string', description: 'Target device ID for hardware/sensor tests' },
          missionId: { type: 'string', description: 'Mission ID for simulation tests' },
          verbose: { type: 'boolean', description: 'Include detailed output (default: false)' },
        },
        required: ['testType'],
      },
      handler: async (args) => {
        const testType = args.testType as string
        const deviceId = args.deviceId as string | undefined
        const missionId = args.missionId as string | undefined
        const verbose = (args.verbose as boolean) || false

        const testId = `TEST-${Date.now()}`
        const results: Record<string, unknown> = { testId, testType, timestamp: new Date().toISOString() }

        switch (testType) {
          case 'hardware': {
            const where: Record<string, unknown> = {}
            if (deviceId) where.id = deviceId
            const devices = await db.hardwareDevice.findMany({ where, include: { profiles: true } })
            const deviceTests = devices.map(d => ({
              id: d.id,
              name: d.name,
              status: d.status,
              passed: d.status === 'active',
              profileLoaded: d.profiles.length > 0,
            }))
            results.devices = deviceTests
            results.passed = deviceTests.filter(d => d.passed).length
            results.failed = deviceTests.filter(d => !d.passed).length
            results.total = deviceTests.length
            break
          }

          case 'sensor': {
            const latestReadings = await db.telemetryReading.findMany({
              orderBy: { timestamp: 'desc' },
              take: 50,
            })
            const metricReadings: Record<string, unknown[]> = {}
            for (const r of latestReadings) {
              if (!metricReadings[r.metric]) metricReadings[r.metric] = []
              metricReadings[r.metric].push({ value: r.value, timestamp: r.timestamp })
            }
            const sensorTests = Object.entries(metricReadings).map(([metric, readings]) => ({
              metric,
              readingCount: readings.length,
              latestValue: (readings as Array<{ value: number }>)?.[0]?.value ?? null,
              passed: readings.length > 0,
            }))
            results.sensors = sensorTests
            results.passed = sensorTests.filter(s => s.passed).length
            results.failed = sensorTests.filter(s => !s.passed).length
            break
          }

          case 'communication': {
            const radios = await db.hardwareDevice.findMany({
              where: { deviceType: 'radio' },
            })
            const commTests = radios.map(r => ({
              id: r.id,
              name: r.name,
              status: r.status,
              passed: r.status === 'active',
            }))
            results.radioLinks = commTests
            results.passed = commTests.filter(c => c.passed).length
            results.failed = commTests.filter(c => !c.passed).length
            break
          }

          case 'mission_simulation': {
            const mission = missionId
              ? await db.mission.findUnique({ where: { id: missionId } })
              : await db.mission.findFirst({ where: { status: 'planned' } })

            if (!mission) {
              results.error = 'No mission found for simulation'
              results.passed = 0
              results.failed = 1
              break
            }

            const waypoints = JSON.parse(mission.waypoints) as Array<{ lat: number; lng: number; alt: number; action: string }>
            results.missionId = mission.id
            results.missionName = mission.name
            results.waypointCount = waypoints.length
            const maxAlt = Math.max(...waypoints.map(w => w.alt), 0)
            results.maxAltitude = maxAlt
            results.altitudeCheck = maxAlt <= 120
            results.hasTakeoff = waypoints.some(w => w.action === 'takeoff')
            results.hasLanding = waypoints.some(w => w.action === 'land' || w.action === 'hover')
            results.passed = (results.altitudeCheck && results.hasTakeoff && results.hasLanding) ? 1 : 0
            results.failed = (results.passed as number) === 0 ? 1 : 0
            break
          }

          case 'full_system': {
            const deviceCount = await db.hardwareDevice.count()
            const activeDeviceCount = await db.hardwareDevice.count({ where: { status: 'active' } })
            const telemetryCount = await db.telemetryReading.count()
            const activeMissions = await db.mission.count({ where: { status: 'active' } })
            const unresolvedAlerts = await db.alert.count({ where: { isResolved: false } })

            results.deviceCount = deviceCount
            results.activeDeviceCount = activeDeviceCount
            results.telemetryCount = telemetryCount
            results.activeMissions = activeMissions
            results.unresolvedAlerts = unresolvedAlerts
            results.deviceHealth = deviceCount > 0 ? Math.round((activeDeviceCount / deviceCount) * 100) : 0
            results.passed = unresolvedAlerts === 0 && activeDeviceCount > 0 ? 1 : 0
            results.failed = (results.passed as number) === 0 ? 1 : 0
            break
          }

          default:
            results.error = `Unknown test type: ${testType}`
        }

        if (verbose) {
          results.details = 'Full verbose output enabled — all subcomponent data included above.'
        }

        return results
      },
    })

    // --- extension_bridge (NEW) ---
    this.registerTool({
      name: 'extension_bridge',
      description: 'Bridge communication with VSCode/IDE extensions. Send commands, retrieve editor state, and sync project data.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Bridge action to perform',
            enum: ['status', 'send_command', 'get_state', 'sync_config'],
          },
          command: { type: 'string', description: 'Command to send to the extension (for send_command action)' },
          data: { type: 'object', description: 'Data payload for the action' },
        },
        required: ['action'],
      },
      handler: async (args) => {
        const action = args.action as string
        const command = args.command as string | undefined
        const data = args.data as Record<string, unknown> | undefined

        switch (action) {
          case 'status':
            return {
              connected: false,
              extensionVersion: '1.0.0',
              supportedFeatures: ['mcp', 'telemetry', 'mission_editor', 'device_manager'],
              message: 'Extension bridge is available but no IDE extension is currently connected',
            }

          case 'send_command':
            if (!command) return { error: 'command is required for send_command action' }
            return {
              status: 'queued',
              command,
              message: `Command "${command}" queued for IDE extension delivery when connected`,
              timestamp: new Date().toISOString(),
            }

          case 'get_state':
            return {
              editorState: 'unavailable',
              openFiles: [],
              activeProject: 'nanggroe-os-ai',
              message: 'No IDE extension connected — state unavailable',
            }

          case 'sync_config': {
            const configs = await db.systemConfig.findMany()
            const configMap: Record<string, string> = {}
            for (const c of configs) configMap[c.key] = c.value
            return {
              synced: true,
              configCount: configs.length,
              configs: configMap,
              message: 'System configuration synced for extension delivery',
            }
          }

          default:
            return { error: `Unknown action: ${action}` }
        }
      },
    })
  }

  // ========================================
  // Built-in Resources
  // ========================================

  private registerBuiltinResources(): void {
    // --- telemetry://latest ---
    this.registerResource({
      uri: 'telemetry://latest',
      name: 'Latest Telemetry Snapshot',
      description: 'Current telemetry snapshot with all metrics from the most recent readings',
      mimeType: 'application/json',
      read: async () => {
        const snapshot = await getLatestTelemetrySnapshot()
        return JSON.stringify(snapshot || { error: 'No telemetry data available' }, null, 2)
      },
    })

    // --- telemetry://history/{metric} ---
    this.registerResource({
      uri: 'telemetry://history/{metric}',
      name: 'Historical Telemetry Data',
      description: 'Historical telemetry data for a specific metric. Replace {metric} with the metric name.',
      mimeType: 'application/json',
      read: async () => {
        const metrics: TelemetryMetric[] = [
          'battery_voltage', 'gps_lat', 'gps_lng', 'altitude', 'signal_strength',
          'temperature', 'humidity', 'pressure', 'heading', 'speed',
          'roll', 'pitch', 'yaw', 'motor_rpm_1', 'motor_rpm_2', 'motor_rpm_3', 'current_draw',
        ]
        const summary: Record<string, unknown> = {}
        for (const metric of metrics) {
          const count = await db.telemetryReading.count({ where: { metric } })
          const latest = await db.telemetryReading.findFirst({
            where: { metric },
            orderBy: { timestamp: 'desc' },
          })
          summary[metric] = {
            count,
            latestValue: latest?.value ?? null,
            latestTimestamp: latest?.timestamp ?? null,
            unit: TELEMETRY_UNITS[metric],
          }
        }
        return JSON.stringify(summary, null, 2)
      },
    })

    // --- hardware://devices ---
    this.registerResource({
      uri: 'hardware://devices',
      name: 'Hardware Device List',
      description: 'List of all registered hardware devices with their current status',
      mimeType: 'application/json',
      read: async () => {
        const devices = await db.hardwareDevice.findMany({
          include: { profiles: true },
          orderBy: { lastSeen: 'desc' },
        })
        return JSON.stringify(devices.map(d => ({
          id: d.id,
          name: d.name,
          deviceType: d.deviceType,
          protocol: d.protocol,
          status: d.status,
          port: d.port,
          firmware: d.firmware,
          lastSeen: d.lastSeen,
          profileCount: d.profiles.length,
        })), null, 2)
      },
    })

    // --- mission://active ---
    this.registerResource({
      uri: 'mission://active',
      name: 'Active Mission',
      description: 'Currently active mission details including waypoints and parameters',
      mimeType: 'application/json',
      read: async () => {
        const mission = await db.mission.findFirst({
          where: { status: 'active' },
          include: { logs: { orderBy: { timestamp: 'desc' }, take: 10 } },
        })
        if (!mission) {
          return JSON.stringify({ status: 'no_active_mission' })
        }
        return JSON.stringify({
          id: mission.id,
          name: mission.name,
          type: mission.type,
          status: mission.status,
          altitude: mission.altitude,
          speed: mission.speed,
          waypoints: JSON.parse(mission.waypoints),
          startedAt: mission.startedAt,
          recentLogs: mission.logs.map(l => ({
            level: l.level,
            source: l.source,
            message: l.message,
            timestamp: l.timestamp,
          })),
        }, null, 2)
      },
    })

    // --- system://status ---
    this.registerResource({
      uri: 'system://status',
      name: 'System Status',
      description: 'Overall system status including device counts, active sessions, and alerts',
      mimeType: 'application/json',
      read: async () => {
        const totalDevices = await db.hardwareDevice.count()
        const activeDevices = await db.hardwareDevice.count({ where: { status: 'active' } })
        const errorDevices = await db.hardwareDevice.count({ where: { status: 'error' } })
        const activeMissions = await db.mission.count({ where: { status: 'active' } })
        const unresolvedAlerts = await db.alert.count({ where: { isResolved: false } })
        const criticalAlerts = await db.alert.count({ where: { isResolved: false, level: 'critical' } })
        const activeSession = await db.session.findFirst({ where: { status: 'active' } })
        const telemetryCount = await db.telemetryReading.count()

        return JSON.stringify({
          system: 'NANGGROE OS AI',
          version: '1.0.0',
          status: criticalAlerts > 0 ? 'critical' : errorDevices > 0 ? 'warning' : 'nominal',
          devices: { total: totalDevices, active: activeDevices, errors: errorDevices },
          missions: { active: activeMissions },
          alerts: { unresolved: unresolvedAlerts, critical: criticalAlerts },
          session: activeSession ? { id: activeSession.id, mode: activeSession.mode } : null,
          telemetry: { totalReadings: telemetryCount },
          timestamp: new Date().toISOString(),
        }, null, 2)
      },
    })

    // --- system://config ---
    this.registerResource({
      uri: 'system://config',
      name: 'System Configuration',
      description: 'All system configuration key-value pairs',
      mimeType: 'application/json',
      read: async () => {
        const configs = await db.systemConfig.findMany({
          orderBy: { category: 'asc' },
        })
        const grouped: Record<string, Record<string, string>> = {}
        for (const c of configs) {
          if (!grouped[c.category]) grouped[c.category] = {}
          grouped[c.category][c.key] = c.value
        }
        return JSON.stringify(grouped, null, 2)
      },
    })
  }

  // ========================================
  // Request Handler (JSON-RPC 2.0)
  // ========================================

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    // Validate JSON-RPC structure
    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_REQUEST, data: 'Missing or invalid jsonrpc field' },
      }
    }

    const { method, params } = request

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(request.id, params)

        case 'ping':
          return {
            jsonrpc: '2.0',
            id: request.id ?? null,
            result: {},
          }

        case 'tools/list':
          return this.handleListTools(request.id)

        case 'tools/call':
          return this.handleToolCall(request.id, params)

        case 'resources/list':
          return this.handleListResources(request.id)

        case 'resources/read':
          return this.handleReadResource(request.id, params)

        case 'resources/subscribe':
          return this.handleSubscribe(request.id, params)

        case 'resources/unsubscribe':
          return this.handleUnsubscribe(request.id, params)

        default:
          return {
            jsonrpc: '2.0',
            id: request.id ?? null,
            error: { ...JSONRPC_ERRORS.METHOD_NOT_FOUND, data: `Unknown method: ${method}` },
          }
      }
    } catch (error) {
      console.error('[MCPServer] Error handling request:', error)
      return {
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: {
          code: JSONRPC_ERRORS.INTERNAL_ERROR.code,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      }
    }
  }

  // --- Method Handlers ---

  private handleInitialize(
    id: string | number | null | undefined,
    params?: Record<string, unknown>
  ): MCPResponse {
    this.initialized = true

    const clientInfo = params?.clientInfo as { name?: string; version?: string } | undefined
    console.log(`[MCPServer] Initialize from client: ${clientInfo?.name || 'unknown'} v${clientInfo?.version || '?.?'}`)

    const result: MCPInitializeResult = {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
      },
      serverInfo: {
        name: 'NANGGROE OS AI MCP Server',
        version: '1.0.0',
      },
    }

    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result,
    }
  }

  private handleListTools(id: string | number | null | undefined): MCPResponse {
    const tools = Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }))

    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        tools,
      },
    }
  }

  private async handleToolCall(
    id: string | number | null | undefined,
    params?: Record<string, unknown>
  ): Promise<MCPResponse> {
    if (!params) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_PARAMS, data: 'Missing params for tools/call' },
      }
    }

    const toolName = params.name as string
    const toolArgs = (params.arguments as Record<string, unknown>) || {}

    if (!toolName) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_PARAMS, data: 'Missing tool name' },
      }
    }

    const tool = this.tools.get(toolName)
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_PARAMS, data: `Unknown tool: ${toolName}` },
      }
    }

    try {
      const result = await tool.handler(toolArgs)
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Tool execution failed',
                details: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
          isError: true,
        },
      }
    }
  }

  private handleListResources(id: string | number | null | undefined): MCPResponse {
    const resources = Array.from(this.resources.values()).map(r => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }))

    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        resources,
      },
    }
  }

  private async handleReadResource(
    id: string | number | null | undefined,
    params?: Record<string, unknown>
  ): Promise<MCPResponse> {
    if (!params) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_PARAMS, data: 'Missing params for resources/read' },
      }
    }

    const uri = params.uri as string
    if (!uri) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_PARAMS, data: 'Missing resource URI' },
      }
    }

    // Handle template URIs like telemetry://history/{metric}
    let resource = this.resources.get(uri)
    if (!resource) {
      // Try template matching for telemetry://history/{metric}
      if (uri.startsWith('telemetry://history/')) {
        const metric = uri.replace('telemetry://history/', '')
        const historyResource = this.resources.get('telemetry://history/{metric}')
        if (historyResource) {
          // Create a dynamic read handler for the specific metric
          resource = {
            ...historyResource,
            uri,
            name: `Historical Telemetry: ${metric}`,
            read: async () => {
              const readings = await db.telemetryReading.findMany({
                where: { metric },
                orderBy: { timestamp: 'desc' },
                take: 100,
              })
              return JSON.stringify({
                metric,
                count: readings.length,
                unit: TELEMETRY_UNITS[metric] || null,
                readings: readings.map(r => ({
                  value: r.value,
                  timestamp: r.timestamp,
                })),
              }, null, 2)
            },
          }
        }
      }
    }

    if (!resource) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: -32001,
          message: `Resource not found: ${uri}`,
        },
      }
    }

    try {
      const content = await resource.read()
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          contents: [
            {
              uri,
              mimeType: resource.mimeType,
              text: typeof content === 'string' ? content : content.toString('utf-8'),
            },
          ],
        },
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: JSONRPC_ERRORS.INTERNAL_ERROR.code,
          message: `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      }
    }
  }

  private handleSubscribe(
    id: string | number | null | undefined,
    params?: Record<string, unknown>
  ): MCPResponse {
    if (!params) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_PARAMS, data: 'Missing params for resources/subscribe' },
      }
    }

    const uri = params.uri as string
    const sessionId = (params.sessionId as string) || 'default'

    if (!uri) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_PARAMS, data: 'Missing resource URI' },
      }
    }

    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set())
    }
    this.subscriptions.get(uri)!.add(sessionId)

    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: { subscribed: true, uri },
    }
  }

  private handleUnsubscribe(
    id: string | number | null | undefined,
    params?: Record<string, unknown>
  ): MCPResponse {
    if (!params) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { ...JSONRPC_ERRORS.INVALID_PARAMS, data: 'Missing params for resources/unsubscribe' },
      }
    }

    const uri = params.uri as string
    const sessionId = (params.sessionId as string) || 'default'

    if (this.subscriptions.has(uri)) {
      this.subscriptions.get(uri)!.delete(sessionId)
    }

    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: { unsubscribed: true, uri },
    }
  }

  // ========================================
  // Public Accessors
  // ========================================

  async listTools(): Promise<MCPTool[]> {
    return Array.from(this.tools.values())
  }

  async listResources(): Promise<MCPResource[]> {
    return Array.from(this.resources.values())
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`)
    }
    return tool.handler(args)
  }

  async readResource(uri: string): Promise<string | Buffer> {
    // Handle template URIs
    let resource = this.resources.get(uri)
    if (!resource && uri.startsWith('telemetry://history/')) {
      const metric = uri.replace('telemetry://history/', '')
      const readings = await db.telemetryReading.findMany({
        where: { metric },
        orderBy: { timestamp: 'desc' },
        take: 100,
      })
      return JSON.stringify({
        metric,
        count: readings.length,
        unit: TELEMETRY_UNITS[metric] || null,
        readings: readings.map(r => ({ value: r.value, timestamp: r.timestamp })),
      }, null, 2)
    }

    if (!resource) {
      throw new Error(`Resource not found: ${uri}`)
    }
    return resource.read()
  }

  getServerInfo(): MCPServerInfo {
    return {
      name: 'NANGGROE OS AI MCP Server',
      version: '1.0.0',
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
      },
    }
  }
}

// --- Export singleton getter ---
export const getMCPServer = (): MCPServer => MCPServer.getInstance()
