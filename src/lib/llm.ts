// ============================================================
// NANGGROE IOT - Multi-Model LLM Service
// Production-grade LLM orchestration with streaming, tool calling,
// conversation memory, and model switching
// ============================================================

import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { hermesRespond, picoclawCheck } from '@/lib/agents'
import { getLatestTelemetrySnapshot } from '@/lib/telemetry'
import type {
  SystemContext,
  HermesResponse,
  PicoClawCheckResult,
  TelemetrySnapshot,
  AgentName,
  AgentRole,
  MissionType,
  MissionStatus,
  MissionSummary,
} from '@/lib/types'
import {
  AGENT_HERMES,
  AGENT_PICOCLAW,
  SAFETY_THRESHOLDS,
} from '@/lib/constants'

// --- Types ---

import type { ChatMessage as SDKChatMessage } from 'z-ai-web-dev-sdk'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  toolCallId?: string
}

/** Convert our ChatMessage to SDK-compatible format */
function toSDKMessages(msgs: ChatMessage[]): SDKChatMessage[] {
  return msgs.map(m => ({
    role: m.role === 'tool' ? 'assistant' as const : m.role,
    content: m.content,
  }))
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatParams {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tools?: string[]
  missionId?: string
  agentName?: AgentName
  systemContext?: SystemContext
}

export interface ChatResult {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  toolCalls?: ToolCallResult[]
  finishReason?: string
}

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  toolCall?: ToolCallResult
  toolResult?: unknown
  finishReason?: string
  error?: string
}

export interface ToolCallResult {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

export interface ModelInfo {
  currentModel: string
  availableModels: string[]
  provider: string
}

// --- Nanggroe IoT Tool Definitions ---

const NANGGROE_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'mavlink_command',
      description: 'Send MAVLink commands to the flight controller (ARM, DISARM, TAKEOFF, LAND, RTL, SET_MODE, CHANGE_SPEED, SET_HOME)',
      parameters: {
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
              altitude: { type: 'number', description: 'Target altitude in meters' },
              speed: { type: 'number', description: 'Target speed in m/s' },
              mode: { type: 'string', description: 'Flight mode' },
            },
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'telemetry_query',
      description: 'Query historical telemetry data from the database. Supports filtering by metric, device, time range.',
      parameters: {
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
          limit: { type: 'number', description: 'Maximum number of readings (default: 50)' },
        },
        required: ['metric'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mission_generate',
      description: 'Generate mission waypoints using AI. Provide natural language description of the desired mission.',
      parameters: {
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
    },
  },
  {
    type: 'function',
    function: {
      name: 'hardware_diagnostic',
      description: 'Run hardware diagnostics on connected devices. Returns status, health, and connectivity info.',
      parameters: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', description: 'Specific device ID to diagnose' },
          deviceType: {
            type: 'string',
            description: 'Filter by device type',
            enum: ['flight_controller', 'companion_computer', 'gps', 'camera', 'sensor', 'radio', 'battery', 'motor', 'esc'],
          },
          includeOffline: { type: 'boolean', description: 'Include offline devices (default: true)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'safety_assessment',
      description: 'Run PicoClaw safety assessment on current telemetry data. Evaluates battery, signal, altitude, temperature, and motor conditions.',
      parameters: {
        type: 'object',
        properties: {
          useLiveTelemetry: { type: 'boolean', description: 'Use live telemetry (default: true)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'code_generate',
      description: 'Generate code for Nanggroe IoT extensions, drivers, or scripts. Supports multiple languages.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description of the code to generate' },
          language: { type: 'string', description: 'Programming language (python, typescript, c, cpp)' },
          context: { type: 'string', description: 'Additional context or existing code to modify' },
        },
        required: ['prompt', 'language'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calibration_control',
      description: 'Control calibration processes for sensors and actuators. Start, monitor, or query calibration status.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Calibration action',
            enum: ['status', 'start', 'history'],
          },
          deviceType: {
            type: 'string',
            description: 'Device type to calibrate',
            enum: ['compass', 'accelerometer', 'gyro', 'esc', 'radio'],
          },
        },
        required: ['action'],
      },
    },
  },
]

// --- Tool Handlers ---

async function executeToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'mavlink_command': {
      const command = args.command as string
      const parameters = (args.parameters as Record<string, unknown>) || {}
      // ⚠️ SIMULATION ONLY: MAVLink commands are NOT actually sent to a flight
      // controller. The system has no real hardware bridge connected. Returning
      // "queued: true" would be dangerous — operators could believe they've
      // armed or landed the drone when no command was actually executed.
      const bridgeMode = process.env.HARDWARE_BRIDGE_MODE || 'simulation'
      if (bridgeMode === 'simulation') {
        return {
          queued: false,
          simulated: true,
          command,
          parameters,
          message: `⚠️ SIMULATED: MAVLink command "${command}" was NOT sent to any flight controller. No hardware bridge is connected. This is a simulation-only response.`,
          sequenceId: `SIM-${Date.now()}`,
          warning: 'This command was not executed on real hardware. Do NOT rely on this for actual flight operations.',
        }
      }
      // In real mode, the command would be queued via the hardware bridge.
      // Since no real bridge is currently connected, return an error.
      return {
        queued: false,
        simulated: false,
        command,
        parameters,
        message: `ERROR: MAVLink command "${command}" could NOT be executed. No hardware bridge is connected to the flight controller.`,
        error: 'No active hardware bridge connection. Connect to a flight controller before sending MAVLink commands.',
      }
    }

    case 'telemetry_query': {
      const metric = args.metric as string
      const deviceId = args.deviceId as string | undefined
      const limit = Math.min((args.limit as number) || 50, 200)

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
    }

    case 'mission_generate': {
      const prompt = args.prompt as string
      const missionType = (args.missionType as string) || 'mapping'
      const altitude = (args.altitude as number) || 50
      const speed = (args.speed as number) || 5

      const zai = await ZAI.create()
      const response = await zai.chat.completions.create({
        model: 'default',
        messages: [
          {
            role: 'system',
            content: `You are a mission planning AI for NANGGROE IOT. Generate a JSON mission plan with waypoints.
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
    }

    case 'hardware_diagnostic': {
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

      return {
        devices: devices.map(d => ({
          id: d.id,
          name: d.name,
          deviceType: d.deviceType,
          status: d.status,
          protocol: d.protocol,
          port: d.port,
          firmware: d.firmware,
          lastSeen: d.lastSeen,
        })),
        totalDevices: devices.length,
        healthyDevices: devices.filter(d => d.status === 'active').length,
      }
    }

    case 'safety_assessment': {
      const useLive = (args.useLiveTelemetry as boolean) !== false
      let telemetry: TelemetrySnapshot | null = null

      if (useLive) {
        telemetry = await getLatestTelemetrySnapshot()
      }

      if (!telemetry) {
        // Attempt to build telemetry from recent DB readings — but do NOT
        // fabricate "safe" default values for missing metrics. If a metric
        // has no real data, mark it as UNAVAILABLE so the safety assessment
        // correctly flags it rather than passing all checks with fake data.
        const latestReadings = await db.telemetryReading.findMany({
          orderBy: { timestamp: 'desc' },
          take: 100,
        })
        const metricMap: Record<string, number> = {}
        for (const r of latestReadings) {
          if (!(r.metric in metricMap)) {
            metricMap[r.metric] = r.value
          }
        }

        // If there are NO readings at all, return a warning instead of fake safe data
        if (latestReadings.length === 0) {
          return {
            safe: false,
            status: 'UNAVAILABLE',
            warning: 'No telemetry data available — safety assessment cannot be performed. Treat all systems as potentially unsafe.',
            alerts: [{ level: 'critical', metric: 'telemetry', message: 'No telemetry data available. All readings are UNAVAILABLE. Do NOT assume systems are safe.' }],
            actions: [{ type: 'ground', reason: 'Cannot verify safety without telemetry data. Recommend grounding the drone until telemetry is restored.' }],
            dataAvailability: 'UNAVAILABLE',
          }
        }

        // Build telemetry with available data, using sentinel values for missing metrics
        // These sentinel values will trigger safety alerts rather than pass checks
        telemetry = {
          battery_voltage: metricMap.battery_voltage ?? 0,    // 0V = will trigger critical alert
          gps_lat: metricMap.gps_lat ?? 0,                     // 0 = invalid GPS
          gps_lng: metricMap.gps_lng ?? 0,                     // 0 = invalid GPS
          altitude: metricMap.altitude ?? -1,                   // -1 = unknown altitude
          signal_strength: metricMap.signal_strength ?? -200,   // -200dBm = no signal
          temperature: metricMap.temperature ?? -999,           // -999 = no reading
          humidity: metricMap.humidity ?? -1,                   // -1 = no reading
          pressure: metricMap.pressure ?? 0,                    // 0 = no reading
          heading: metricMap.heading ?? -1,                     // -1 = no reading
          speed: metricMap.speed ?? -1,                         // -1 = no reading
          roll: metricMap.roll ?? -999,                         // -999 = no reading
          pitch: metricMap.pitch ?? -999,                       // -999 = no reading
          yaw: metricMap.yaw ?? -999,                           // -999 = no reading
          motor_rpm_1: metricMap.motor_rpm_1 ?? -1,            // -1 = no reading
          motor_rpm_2: metricMap.motor_rpm_2 ?? -1,            // -1 = no reading
          motor_rpm_3: metricMap.motor_rpm_3 ?? -1,            // -1 = no reading
          current_draw: metricMap.current_draw ?? -1,           // -1 = no reading
        }
      }

      return picoclawCheck(telemetry)
    }

    case 'code_generate': {
      const prompt = args.prompt as string
      const language = args.language as string
      const context = args.context as string | undefined

      const zai = await ZAI.create()
      const response = await zai.chat.completions.create({
        model: 'default',
        messages: [
          {
            role: 'system',
            content: `You are a code generation AI for NANGGROE IOT — an autonomous robotics OS.
Generate clean, production-grade ${language} code based on the user's request.
Follow best practices for the ${language} ecosystem. Include error handling and comments.
${context ? `Existing code context:\n${context}` : ''}`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      })

      return {
        code: response.choices?.[0]?.message?.content || '',
        language,
      }
    }

    case 'calibration_control': {
      const action = args.action as string
      const deviceType = args.deviceType as string | undefined

      if (action === 'status') {
        const types = ['compass', 'accelerometer', 'gyro', 'esc', 'radio']
        const statuses = await Promise.all(
          types.map(async (type) => {
            const latest = await db.calibration.findFirst({
              where: { deviceType: type },
              orderBy: { performedAt: 'desc' },
            })
            return { deviceType: type, latestCalibration: latest, inProgress: false }
          })
        )
        return { statuses }
      }

      if (action === 'start' && deviceType) {
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
          take: 10,
        })
        return { records, total: records.length }
      }

      return { error: 'Invalid calibration action' }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// --- System Prompt Builder ---

function buildSystemPrompt(context?: SystemContext): string {
  let prompt = `You are the AI assistant for NANGGROE IOT — an autonomous modular robotics operating system designed for drone tricopter amphibious platforms in Aceh Utara, Indonesia.

## Your Capabilities
You can plan missions, diagnose hardware, query telemetry, assess safety, generate code, and control the drone through MAVLink commands.

## Platform Specifications
- **Platform**: Tricopter amphibious drone (3 motors, waterproof, VTOL capable)
- **Region**: Aceh Utara, Indonesia (4.9125°N, 97.1347°E)
- **Sensors**: BME280, MPU6050, GPS NEO-M8N, RPi Camera V2
- **Flight Controller**: Pixhawk 4 running ArduPilot
- **Companion Computer**: Raspberry Pi 4B
- **Max Altitude**: 120m (regulatory limit)
- **Battery**: 4S LiPo 4000mAh (14.8V nominal, 12.0V critical)
- **Communication**: SiK 433MHz radio (1km range)

## Safety Thresholds
- Battery Warning: ${SAFETY_THRESHOLDS.battery_voltage.warning}V, Critical: ${SAFETY_THRESHOLDS.battery_voltage.critical}V
- Signal Warning: ${SAFETY_THRESHOLDS.signal_strength.warning}dBm, Critical: ${SAFETY_THRESHOLDS.signal_strength.critical}dBm
- Altitude Warning: ${SAFETY_THRESHOLDS.altitude.warning}m, Critical: ${SAFETY_THRESHOLDS.altitude.critical}m
- Temperature Warning: ${SAFETY_THRESHOLDS.temperature.warning}°C, Critical: ${SAFETY_THRESHOLDS.temperature.critical}°C

## Guidelines
- Always prioritize safety — recommend conservative actions when uncertain
- Consider Aceh Utara weather patterns (high humidity, sudden rain)
- Include RTH waypoints in all mission plans
- Account for battery safety margins
- Provide realistic flight time estimates`

  if (context) {
    prompt += `\n\n## Current System Context
- Mode: ${context.mode}
- Active Mission: ${context.activeMission ? `${context.activeMission.name} (${context.activeMission.status})` : 'None'}
- Connected Devices: ${context.deviceCount} (${context.activeDeviceCount} active)
- Session Mode: ${context.sessionMode}`

    if (context.latestTelemetry) {
      const t = context.latestTelemetry
      prompt += `\n- Battery: ${t.battery_voltage}V | Altitude: ${t.altitude}m | Speed: ${t.speed}m/s
- GPS: ${t.gps_lat}°N, ${t.gps_lng}°E | Signal: ${t.signal_strength}dBm
- Temp: ${t.temperature}°C | Humidity: ${t.humidity}% | Pressure: ${t.pressure}hPa`
    }

    if (context.recentAlerts.length > 0) {
      prompt += `\n- Recent Alerts: ${context.recentAlerts.map(a => `[${a.level}] ${a.title}`).join(', ')}`
    }
  }

  return prompt
}

// --- Rate Limiter ---

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests = 30
  private readonly windowMs = 60_000

  constructor() {
    // Clean up expired entries every 60 seconds to prevent memory leak
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const now = Date.now()
        const windowStart = now - this.windowMs
        for (const [key, timestamps] of this.requests) {
          const recent = timestamps.filter(t => t > windowStart)
          if (recent.length === 0) {
            this.requests.delete(key)
          } else {
            this.requests.set(key, recent)
          }
        }
      }, 60000)
    }
  }

  isAllowed(key: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    const requests = this.requests.get(key) || []
    const recentRequests = requests.filter(t => t > windowStart)

    if (recentRequests.length >= this.maxRequests) {
      return false
    }

    recentRequests.push(now)
    this.requests.set(key, recentRequests)
    return true
  }

  getRemaining(key: string): number {
    const now = Date.now()
    const windowStart = now - this.windowMs
    const requests = this.requests.get(key) || []
    const recentRequests = requests.filter(t => t > windowStart)
    return Math.max(0, this.maxRequests - recentRequests.length)
  }
}

// ============================================================
// LLMService — Singleton multi-model LLM service
// ============================================================

export class LLMService {
  private static instance: LLMService
  private currentModel: string = 'default'
  private availableModels: string[] = ['default']
  private rateLimiter = new RateLimiter()
  private zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

  private constructor() {}

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService()
    }
    return LLMService.instance
  }

  private async getZAI(): Promise<NonNullable<typeof this.zaiInstance>> {
    if (!this.zaiInstance) {
      this.zaiInstance = await ZAI.create()
    }
    return this.zaiInstance
  }

  /**
   * Load model configuration from database SystemConfig
   */
  private async loadModelConfig(): Promise<void> {
    try {
      const modelConfig = await db.systemConfig.findUnique({
        where: { key: 'agent.hermes.model' },
      })
      if (modelConfig && modelConfig.value !== 'default') {
        this.currentModel = modelConfig.value
      }

      const modelsConfig = await db.systemConfig.findUnique({
        where: { key: 'llm.available_models' },
      })
      if (modelsConfig) {
        try {
          const models = JSON.parse(modelsConfig.value) as string[]
          if (Array.isArray(models) && models.length > 0) {
            this.availableModels = models
          }
        } catch {
          // Keep default models
        }
      }
    } catch {
      // Database may not be available yet
    }
  }

  /**
   * Get tools filtered by requested names, or all tools if none specified
   */
  private getTools(toolNames?: string[]): ToolDefinition[] {
    if (!toolNames || toolNames.length === 0) {
      return NANGGROE_TOOLS
    }
    return NANGGROE_TOOLS.filter(t => toolNames.includes(t.function.name))
  }

  /**
   * Build system context from database
   */
  async buildSystemContext(missionId?: string): Promise<SystemContext> {
    const configs = await db.systemConfig.findMany()
    const configMap: Record<string, string> = {}
    for (const c of configs) {
      configMap[c.key] = c.value
    }

    const totalDevices = await db.hardwareDevice.count()
    const activeDevices = await db.hardwareDevice.count({
      where: { status: 'active' },
    })

    const activeMission = missionId
      ? await db.mission.findUnique({ where: { id: missionId } })
      : await db.mission.findFirst({ where: { status: 'active' } })

    const activeSession = await db.session.findFirst({
      where: { status: 'active' },
    })

    const recentAlerts = await db.alert.findMany({
      where: { isRead: false },
      orderBy: { timestamp: 'desc' },
      take: 5,
    })

    const latestTelemetry = await getLatestTelemetrySnapshot()

    return {
      mode: configMap['system.mode'] || 'discovery',
      activeMission: activeMission
        ? {
            id: activeMission.id,
            name: activeMission.name,
            description: activeMission.description,
            type: activeMission.type as MissionType,
            status: activeMission.status as MissionStatus,
            prompt: activeMission.prompt,
            waypoints: JSON.parse(activeMission.waypoints),
            altitude: activeMission.altitude,
            speed: activeMission.speed,
            overlapFront: activeMission.overlapFront,
            overlapSide: activeMission.overlapSide,
            gsd: activeMission.gsd,
            startedAt: activeMission.startedAt?.toISOString() || null,
            completedAt: activeMission.completedAt?.toISOString() || null,
            createdAt: activeMission.createdAt.toISOString(),
            updatedAt: activeMission.updatedAt.toISOString(),
          }
        : null,
      deviceCount: totalDevices,
      activeDeviceCount: activeDevices,
      latestTelemetry,
      recentAlerts: recentAlerts.map(a => ({
        id: a.id,
        level: a.level as 'info' | 'warning' | 'critical',
        source: a.source as 'system' | 'picoclaw' | 'hermes' | 'sensor' | 'battery' | 'gps',
        title: a.title,
        message: a.message,
        category: a.category as 'safety' | 'hardware' | 'mission' | 'system' | 'communication',
        isRead: a.isRead,
        isResolved: a.isResolved,
        timestamp: a.timestamp.toISOString(),
      })),
      sessionMode: activeSession?.mode || 'discovery',
    }
  }

  /**
   * Store a message in the conversation memory (AgentMessage table)
   */
  private async storeMessage(
    agent: AgentName,
    role: AgentRole,
    content: string,
    missionId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await db.agentMessage.create({
        data: {
          missionId: missionId || null,
          agent,
          role,
          content,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      })
    } catch (error) {
    }
  }

  /**
   * Get conversation history for a mission
   */
  async getConversationHistory(missionId: string, limit: number = 50): Promise<ChatMessage[]> {
    const messages = await db.agentMessage.findMany({
      where: { missionId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return messages.reverse().map(m => {
      const role: ChatMessage['role'] =
        m.agent === 'operator' ? 'user' :
        m.agent === 'hermes' || m.agent === 'picoclaw' ? 'assistant' :
        'system'

      return {
        role,
        content: m.content,
        name: m.agent,
      }
    })
  }

  // ========================================
  // Main Chat API
  // ========================================

  /**
   * Non-streaming chat completion
   */
  async chat(params: ChatParams): Promise<ChatResult> {
    const sessionId = 'global'
    if (!this.rateLimiter.isAllowed(sessionId)) {
      throw new Error('Rate limit exceeded. Please wait before sending another message.')
    }

    await this.loadModelConfig()

    const zai = await this.getZAI()
    const systemPrompt = buildSystemPrompt(params.systemContext)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...params.messages,
    ]

    try {
      const response = await zai.chat.completions.create({
        model: params.model || this.currentModel,
        messages: toSDKMessages(messages),
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
      })

      const responseContent = response.choices?.[0]?.message?.content || ''
      const finishReason = response.choices?.[0]?.finish_reason || 'stop'

      // Store user message and assistant response
      const userMessage = params.messages[params.messages.length - 1]
      if (userMessage?.role === 'user') {
        await this.storeMessage('operator', 'command', userMessage.content, params.missionId, {
          type: 'chat',
          model: params.model || this.currentModel,
        })
      }
      await this.storeMessage(
        params.agentName || AGENT_HERMES,
        'response',
        responseContent,
        params.missionId,
        {
          type: 'chat_response',
          model: params.model || this.currentModel,
          finishReason,
        }
      )

      return {
        content: responseContent,
        model: params.model || this.currentModel,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens || 0,
              completionTokens: response.usage.completion_tokens || 0,
              totalTokens: (response.usage.prompt_tokens || 0) + (response.usage.completion_tokens || 0),
            }
          : undefined,
        finishReason,
      }
    } catch (error) {
      throw new Error(
        `LLM chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Streaming chat completion — yields chunks token by token.
   * Falls back to non-streaming with simulated chunks if SDK streaming
   * is unavailable or yields no content.
   */
  async *chatStream(params: ChatParams): AsyncGenerator<StreamChunk> {
    const sessionId = 'global'
    if (!this.rateLimiter.isAllowed(sessionId)) {
      yield {
        type: 'error',
        error: 'Rate limit exceeded. Please wait before sending another message.',
      }
      return
    }

    await this.loadModelConfig()

    const zai = await this.getZAI()
    const systemPrompt = buildSystemPrompt(params.systemContext)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...params.messages,
    ]

    let fullContent = ''
    let streamedContent = false

    try {
      // Attempt native streaming first
      const stream = await zai.chat.completions.create({
        model: params.model || this.currentModel,
        messages: toSDKMessages(messages),
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
        stream: true,
      })

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta
        const finishReason = chunk.choices?.[0]?.finish_reason

        if (delta?.content) {
          streamedContent = true
          fullContent += delta.content
          yield {
            type: 'content',
            content: delta.content,
          }
        }

        if (delta?.tool_calls) {
          streamedContent = true
          for (const toolCall of delta.tool_calls) {
            const callResult: ToolCallResult = {
              id: toolCall.id || `tc_${Date.now()}`,
              name: toolCall.function?.name || '',
              arguments: toolCall.function?.arguments
                ? (typeof toolCall.function.arguments === 'string'
                    ? JSON.parse(toolCall.function.arguments)
                    : toolCall.function.arguments)
                : {},
            }

            // Execute the tool call
            try {
              const toolResult = await executeToolCall(callResult.name, callResult.arguments)
              callResult.result = toolResult

              yield {
                type: 'tool_call',
                toolCall: callResult,
              }

              yield {
                type: 'tool_result',
                toolResult,
              }
            } catch (toolError) {
              yield {
                type: 'tool_call',
                toolCall: callResult,
              }
              yield {
                type: 'tool_result',
                toolResult: {
                  error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
                },
              }
            }
          }
        }

        if (finishReason) {
          yield {
            type: 'done',
            finishReason,
          }
        }
      }

      // If native streaming produced no content, fall back to non-streaming
      if (!streamedContent) {
        yield* this.fallbackStream(params, messages)
        return
      }

      // Store messages after streaming completes
      const userMessage = params.messages[params.messages.length - 1]
      if (userMessage?.role === 'user') {
        await this.storeMessage('operator', 'command', userMessage.content, params.missionId, {
          type: 'streaming_chat',
          model: params.model || this.currentModel,
        })
      }
      if (fullContent) {
        await this.storeMessage(
          params.agentName || AGENT_HERMES,
          'response',
          fullContent,
          params.missionId,
          {
            type: 'streaming_response',
            model: params.model || this.currentModel,
          }
        )
      }
    } catch (error) {
      // Fall back to non-streaming mode
      yield* this.fallbackStream(params, messages)
    }
  }

  /**
   * Fallback streaming: use non-streaming API and yield the response in chunks
   */
  private async *fallbackStream(
    params: ChatParams,
    messages: ChatMessage[]
  ): AsyncGenerator<StreamChunk> {
    const zai = await this.getZAI()

    try {
      const response = await zai.chat.completions.create({
        model: params.model || this.currentModel,
        messages: toSDKMessages(messages),
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
      })

      const responseContent = response.choices?.[0]?.message?.content || ''
      const finishReason = response.choices?.[0]?.finish_reason || 'stop'

      if (responseContent) {
        // Yield the full content as a single chunk for immediate display
        yield {
          type: 'content',
          content: responseContent,
        }
      }

      yield {
        type: 'done',
        finishReason,
      }

      // Store messages
      const userMessage = params.messages[params.messages.length - 1]
      if (userMessage?.role === 'user') {
        await this.storeMessage('operator', 'command', userMessage.content, params.missionId, {
          type: 'fallback_streaming_chat',
          model: params.model || this.currentModel,
        })
      }
      if (responseContent) {
        await this.storeMessage(
          params.agentName || AGENT_HERMES,
          'response',
          responseContent,
          params.missionId,
          {
            type: 'fallback_streaming_response',
            model: params.model || this.currentModel,
          }
        )
      }
    } catch (fallbackError) {
      yield {
        type: 'error',
        error: `Chat failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
      }
    }
  }

  // ========================================
  // Specialized AI Operations
  // ========================================

  /**
   * Generate a mission plan using Hermes agent
   */
  async generateMissionPlan(prompt: string, context?: SystemContext): Promise<HermesResponse> {
    return hermesRespond(prompt, context)
  }

  /**
   * Diagnose hardware issues using AI
   */
  async diagnoseHardware(errorDescription: string): Promise<string> {
    const zai = await this.getZAI()

    try {
      // Get device status from DB
      const devices = await db.hardwareDevice.findMany({
        where: { status: { in: ['error', 'offline', 'unknown'] } },
        include: { profiles: true },
        take: 20,
      })

      const contextInfo = devices.length > 0
        ? `\n\nProblematic devices in database:\n${devices.map(d =>
            `- ${d.name} (${d.deviceType}): status=${d.status}, port=${d.port}, firmware=${d.firmware}`
          ).join('\n')}`
        : '\n\nNo problematic devices found in database.'

      const response = await zai.chat.completions.create({
        model: this.currentModel,
        messages: [
          {
            role: 'system',
            content: `You are a hardware diagnostic AI for NANGGROE IOT. Analyze hardware issues for a tricopter amphibious drone platform.
Provide clear, actionable diagnostic steps. Consider common failure modes for:
Pixhawk 4, Raspberry Pi 4B, GPS NEO-M8N, BME280, MPU6050, SiK Radio, 4S LiPo battery.
Focus on practical troubleshooting that can be done in the field in Aceh Utara, Indonesia.`,
          },
          {
            role: 'user',
            content: errorDescription + contextInfo,
          },
        ],
        temperature: 0.5,
        max_tokens: 2048,
      })

      return response.choices?.[0]?.message?.content || 'Unable to generate diagnostic analysis.'
    } catch (error) {
      return `Diagnostic AI unavailable. Error: ${error instanceof Error ? error.message : 'Unknown'}. Please check hardware connections manually.`
    }
  }

  /**
   * Generate code using AI
   */
  async generateCode(prompt: string, language: string): Promise<string> {
    const zai = await this.getZAI()

    try {
      const response = await zai.chat.completions.create({
        model: this.currentModel,
        messages: [
          {
            role: 'system',
            content: `You are a code generation AI for NANGGROE IOT — an autonomous robotics OS.
Generate clean, production-grade ${language} code. Follow best practices.
Include error handling, comments, and type annotations where applicable.
For robotics code, consider real-time constraints and safety.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      })

      return response.choices?.[0]?.message?.content || ''
    } catch (error) {
      throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Run safety analysis with AI insight
   */
  async runSafetyAnalysis(
    telemetry: TelemetrySnapshot
  ): Promise<PicoClawCheckResult & { aiInsight: string }> {
    // First run deterministic PicoClaw check
    const checkResult = picoclawCheck(telemetry)

    // Then get AI insight on the situation
    let aiInsight = ''

    try {
      const zai = await this.getZAI()
      const alertSummary = checkResult.alerts.length > 0
        ? `Alerts: ${checkResult.alerts.map(a => `[${a.level}] ${a.message}`).join('; ')}`
        : 'No alerts — all parameters within normal range.'

      const actionSummary = checkResult.actions.length > 0
        ? `Recommended actions: ${checkResult.actions.map(a => `${a.type}: ${a.reason}`).join('; ')}`
        : 'No immediate actions required.'

      const response = await zai.chat.completions.create({
        model: this.currentModel,
        messages: [
          {
            role: 'system',
            content: `You are PicoClaw AI, the safety analysis assistant for NANGGROE IOT.
Given telemetry data and deterministic safety check results, provide a brief (2-3 sentence) AI insight
about the overall safety situation. Focus on trends, correlations, and proactive recommendations.
Do not repeat the alerts — add contextual intelligence.`,
          },
          {
            role: 'user',
            content: `Telemetry: Battery=${telemetry.battery_voltage}V, Alt=${telemetry.altitude}m, Speed=${telemetry.speed}m/s, Signal=${telemetry.signal_strength}dBm, Temp=${telemetry.temperature}°C
${alertSummary}
${actionSummary}
Safe: ${checkResult.safe}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 256,
      })

      aiInsight = response.choices?.[0]?.message?.content || 'Safety analysis complete. Monitor telemetry closely.'
    } catch {
      aiInsight = 'AI insight unavailable. Refer to deterministic safety check results above.'
    }

    return {
      ...checkResult,
      aiInsight,
    }
  }

  // ========================================
  // Model Management
  // ========================================

  /**
   * Get current model information
   */
  getModelInfo(): ModelInfo {
    return {
      currentModel: this.currentModel,
      availableModels: this.availableModels,
      provider: 'z-ai-web-dev-sdk',
    }
  }

  /**
   * Switch to a different model
   */
  async switchModel(modelId: string): Promise<void> {
    if (!this.availableModels.includes(modelId)) {
      // Allow switching even if not in the list — it might be a valid model ID
      this.availableModels.push(modelId)
    }

    this.currentModel = modelId

    // Persist model choice to database
    try {
      await db.systemConfig.upsert({
        where: { key: 'agent.hermes.model' },
        update: { value: modelId },
        create: {
          key: 'agent.hermes.model',
          value: modelId,
          category: 'agent',
        },
      })
    } catch (error) {
    }
  }
}

// --- Export singleton getter ---
export const getLLMService = (): LLMService => LLMService.getInstance()
