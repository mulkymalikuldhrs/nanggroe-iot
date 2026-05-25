// ============================================================
// NANGGROE OS AI - VSCode/IDE Extension Bridge
// Manages IDE extension connections, command routing,
// authentication, code completions, and diagnostics
// ============================================================

import { db } from './db'
import { createHash, randomBytes } from 'crypto'

// --- Extension Types ---

export interface ExtensionConnection {
  id: string
  name: string
  type: 'vscode' | 'jetbrains' | 'vim' | 'custom'
  apiKey: string
  connected: boolean
  connectedAt: string | null
  capabilities: string[]
}

export interface CompletionContext {
  filePath: string
  line: number
  column: number
  prefix: string
  language: string
  triggerKind: 'invoked' | 'triggerCharacter' | 'triggerForIncompleteCompletions'
}

export interface CompletionItem {
  label: string
  kind: 'function' | 'variable' | 'class' | 'module' | 'keyword' | 'snippet' | 'property'
  detail: string
  documentation?: string
  insertText: string
  sortText?: string
}

export interface Position {
  filePath: string
  line: number
  column: number
}

export interface HoverInfo {
  contents: string
  range?: {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
  language?: string
}

export interface ExtensionCommand {
  command: string
  payload?: unknown
  timestamp: string
  connectionId: string
}

export interface ExtensionEvent {
  event: string
  data: unknown
  timestamp: string
  source: string
}

// --- Nanggroe OS Specific Completions ---

const NANGGROE_SNIPPETS: CompletionItem[] = [
  {
    label: 'nanggroe-mission',
    kind: 'snippet',
    detail: 'Nanggroe Mission Template',
    documentation: 'Create a new Nanggroe OS AI mission with waypoints',
    insertText: `{
  "name": "$1",
  "type": "$2|mapping,survey,delivery,patrol,inspection,agriculture|",
  "altitude": 50,
  "speed": 5,
  "overlapFront": 75,
  "overlapSide": 65,
  "waypoints": [$3]
}`,
    sortText: '0',
  },
  {
    label: 'nanggroe-waypoint',
    kind: 'snippet',
    detail: 'Nanggroe Waypoint',
    documentation: 'Add a waypoint with lat/lng/alt/action',
    insertText: `{
  "lat": $1,
  "lng": $2,
  "alt": $3,
  "action": "$4|fly,hover,take_photo,land,takeoff,survey_start,survey_end|"
}`,
    sortText: '0',
  },
  {
    label: 'nanggroe-hermes',
    kind: 'snippet',
    detail: 'Hermes Agent Call',
    documentation: 'Send a prompt to the Hermes strategic planning agent',
    insertText: `const response = await fetch('/api/agents/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '$1',
    agent: 'hermes',
  }),
});`,
    sortText: '0',
  },
  {
    label: 'nanggroe-picoclaw',
    kind: 'snippet',
    detail: 'PicoClaw Safety Check',
    documentation: 'Run a PicoClaw tactical safety check',
    insertText: `const response = await fetch('/api/agents/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'safety check',
    agent: 'picoclaw',
  }),
});`,
    sortText: '0',
  },
  {
    label: 'nanggroe-driver-connect',
    kind: 'snippet',
    detail: 'Connect Device Driver',
    documentation: 'Connect a device driver via the Drivers API',
    insertText: `const response = await fetch('/api/drivers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'connect',
    deviceType: '$1|flight_controller,companion_computer,gps,camera,sensor,radio,battery|',
    deviceId: '$2',
  }),
});`,
    sortText: '0',
  },
  {
    label: 'nanggroe-flash',
    kind: 'snippet',
    detail: 'Flash Firmware',
    documentation: 'Flash firmware to a target device',
    insertText: `const response = await fetch('/api/flash', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'flash',
    target: '$1|pixhawk,companion,esc,radio|',
    firmwareVersion: '$2',
  }),
});`,
    sortText: '0',
  },
  {
    label: 'nanggroe-telemetry',
    kind: 'snippet',
    detail: 'Read Telemetry',
    documentation: 'Read latest telemetry data',
    insertText: `const response = await fetch('/api/telemetry');
const { data } = await response.json();`,
    sortText: '0',
  },
  {
    label: 'nanggroe-hardware',
    kind: 'snippet',
    detail: 'Hardware Scan',
    documentation: 'Trigger a hardware detection scan',
    insertText: `const response = await fetch('/api/hardware', {
  method: 'POST',
});`,
    sortText: '0',
  },
]

// --- Extension-specific capabilities ---

const DEFAULT_CAPABILITIES: Record<string, string[]> = {
  vscode: ['completions', 'hover', 'diagnostics', 'tasks', 'fileOpen', 'commands', 'notifications'],
  jetbrains: ['completions', 'hover', 'diagnostics', 'tasks', 'fileOpen', 'commands'],
  vim: ['completions', 'hover', 'commands'],
  custom: ['commands'],
}

// ============================================================
// ExtensionBridge — Singleton IDE extension bridge
// ============================================================

export class ExtensionBridge {
  private static instance: ExtensionBridge
  private connections: Map<string, ExtensionConnection> = new Map()
  private commandHistory: ExtensionCommand[] = []
  private eventLog: ExtensionEvent[] = []

  private constructor() {}

  static getInstance(): ExtensionBridge {
    if (!ExtensionBridge.instance) {
      ExtensionBridge.instance = new ExtensionBridge()
    }
    return ExtensionBridge.instance
  }

  // --- Connection Management ---

  registerExtension(name: string, type: string, apiKey?: string): ExtensionConnection {
    const validTypes = ['vscode', 'jetbrains', 'vim', 'custom']
    const normalizedType = validTypes.includes(type) ? type as ExtensionConnection['type'] : 'custom'

    const id = `ext_${Date.now()}_${randomBytes(4).toString('hex')}`
    const generatedApiKey = apiKey || `nanggroe_${randomBytes(16).toString('hex')}`

    const connection: ExtensionConnection = {
      id,
      name,
      type: normalizedType,
      apiKey: this.hashApiKey(generatedApiKey),
      connected: true,
      connectedAt: new Date().toISOString(),
      capabilities: DEFAULT_CAPABILITIES[normalizedType] ?? ['commands'],
    }

    this.connections.set(id, connection)

    // Log the event
    this.logEvent('extension_registered', { name, type: normalizedType, id }, 'system')

    return {
      ...connection,
      apiKey: generatedApiKey, // Return the raw key only on registration
    }
  }

  unregisterExtension(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      this.logEvent('extension_unregistered', { name: connection.name, id: connectionId }, 'system')
      this.connections.delete(connectionId)
    }
  }

  authenticate(apiKey: string): ExtensionConnection | null {
    const hashedKey = this.hashApiKey(apiKey)

    for (const connection of this.connections.values()) {
      if (connection.apiKey === hashedKey) {
        connection.connected = true
        connection.connectedAt = new Date().toISOString()
        this.logEvent('extension_authenticated', { name: connection.name, id: connection.id }, connection.id)
        return { ...connection }
      }
    }

    return null
  }

  // --- Listing ---

  async listConnections(): Promise<ExtensionConnection[]> {
    return Array.from(this.connections.values()).map(c => ({ ...c }))
  }

  // --- Command Routing ---

  async sendCommand(connectionId: string, command: string, payload?: unknown): Promise<unknown> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`Extension connection not found: ${connectionId}`)
    }
    if (!connection.connected) {
      throw new Error(`Extension not connected: ${connection.name}`)
    }

    // Log the command
    const cmd: ExtensionCommand = {
      command,
      payload,
      timestamp: new Date().toISOString(),
      connectionId,
    }
    this.commandHistory.push(cmd)
    if (this.commandHistory.length > 500) {
      this.commandHistory = this.commandHistory.slice(-500)
    }

    this.logEvent('command_sent', { command, payload }, connectionId)

    // Route command to appropriate handler
    switch (command) {
      case 'openFile':
        if (!payload || typeof payload !== 'object' || !('filePath' in payload)) {
          throw new Error('openFile command requires { filePath: string }')
        }
        return { acknowledged: true, command: 'openFile', filePath: (payload as { filePath: string }).filePath }

      case 'runTask':
        if (!payload || typeof payload !== 'object' || !('taskName' in payload)) {
          throw new Error('runTask command requires { taskName: string }')
        }
        return this.handleRunTask(connectionId, (payload as { taskName: string }).taskName)

      case 'getDiagnostics':
        return this.handleGetDiagnostics(connectionId)

      case 'getSystemStatus':
        return this.handleGetSystemStatus()

      case 'readTelemetry':
        return this.handleReadTelemetry()

      case 'listDevices':
        return this.handleListDevices()

      default:
        return { acknowledged: true, command, payload }
    }
  }

  async broadcastEvent(event: string, data: unknown): Promise<void> {
    const extEvent: ExtensionEvent = {
      event,
      data,
      timestamp: new Date().toISOString(),
      source: 'system',
    }
    this.eventLog.push(extEvent)
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000)
    }

    // In a real implementation, this would push to all connected extensions via WebSocket
    // For now, we just log the event
    this.logEvent(event, data, 'system')
  }

  // --- VSCode-Specific ---

  async openFile(connectionId: string, filePath: string): Promise<void> {
    await this.sendCommand(connectionId, 'openFile', { filePath })
  }

  async runTask(connectionId: string, taskName: string): Promise<unknown> {
    return this.sendCommand(connectionId, 'runTask', { taskName })
  }

  async getDiagnostics(connectionId: string): Promise<unknown> {
    return this.sendCommand(connectionId, 'getDiagnostics')
  }

  // --- IDE Features ---

  async provideCompletions(_connectionId: string, context: CompletionContext): Promise<CompletionItem[]> {
    // Return Nanggroe OS-specific completions based on context
    const items: CompletionItem[] = []

    // Always include nanggroe snippets for .json and .ts files
    if (context.language === 'json' || context.language === 'typescript' || context.language === 'typescriptreact') {
      // Filter by prefix if provided
      if (context.prefix) {
        const prefix = context.prefix.toLowerCase()
        items.push(...NANGGROE_SNIPPETS.filter(s =>
          s.label.toLowerCase().startsWith(prefix) ||
          s.detail.toLowerCase().includes(prefix)
        ))
      } else {
        items.push(...NANGGROE_SNIPPETS)
      }
    }

    // Add language-specific keywords
    if (context.language === 'typescript' || context.language === 'typescriptreact') {
      items.push(
        {
          label: 'DeviceDriver',
          kind: 'class',
          detail: 'Nanggroe OS DeviceDriver abstract class',
          documentation: 'Base class for all hardware device drivers in Nanggroe OS AI',
          insertText: 'DeviceDriver',
          sortText: '1',
        },
        {
          label: 'DriverRegistry',
          kind: 'class',
          detail: 'Nanggroe OS DriverRegistry singleton',
          documentation: 'Singleton registry for managing all device drivers',
          insertText: 'DriverRegistry.getInstance()',
          sortText: '1',
        },
        {
          label: 'FlashService',
          kind: 'class',
          detail: 'Nanggroe OS FlashService singleton',
          documentation: 'Firmware flashing and code deployment service',
          insertText: 'FlashService.getInstance()',
          sortText: '1',
        },
        {
          label: 'ExtensionBridge',
          kind: 'class',
          detail: 'Nanggroe OS ExtensionBridge singleton',
          documentation: 'VSCode/IDE extension communication bridge',
          insertText: 'ExtensionBridge.getInstance()',
          sortText: '1',
        },
      )
    }

    return items
  }

  async provideHover(_connectionId: string, position: Position): Promise<HoverInfo | null> {
    // Provide hover information for Nanggroe OS specific terms
    const hoverDocs: Record<string, { contents: string; language: string }> = {
      'DeviceDriver': {
        contents: `**DeviceDriver** — Abstract base class for hardware drivers\n\nImplements connect/disconnect lifecycle, health checks, data read/write, and event emission.\n\n\`\`\`typescript\nimport { DeviceDriver } from "@/lib/drivers"\n\`\`\``,
        language: 'markdown',
      },
      'DriverRegistry': {
        contents: `**DriverRegistry** — Singleton driver management\n\nManages all device drivers, handles connection lifecycle, and provides health check aggregation.\n\n\`\`\`typescript\nconst registry = DriverRegistry.getInstance()\nawait registry.connectDevice("flight_controller", deviceId)\n\`\`\``,
        language: 'markdown',
      },
      'FlashService': {
        contents: `**FlashService** — Firmware flashing & code deployment\n\nHandles ArduPilot flashing flow (8 steps) and companion code deployment (6 steps) with progress tracking.\n\n\`\`\`typescript\nconst flash = FlashService.getInstance()\nawait flash.flashFirmware("pixhawk", "ArduPilot 4.5.7")\n\`\`\``,
        language: 'markdown',
      },
      'ExtensionBridge': {
        contents: `**ExtensionBridge** — IDE extension communication\n\nManages VSCode/JetBrains/Vim extension connections with command routing, completions, and diagnostics.\n\n\`\`\`typescript\nconst bridge = ExtensionBridge.getInstance()\nconst ext = bridge.registerExtension("My Extension", "vscode")\n\`\`\``,
        language: 'markdown',
      },
      'Hermes': {
        contents: `**Hermes** — Strategic Planning Agent\n\nAI-powered mission planning, route optimization, and high-level decisions. Uses z-ai-web-dev-sdk.\n\nEndpoint: POST /api/agents/chat with { agent: "hermes", prompt: "..." }`,
        language: 'markdown',
      },
      'PicoClaw': {
        contents: `**PicoClaw** — Tactical Real-Time Safety Agent\n\nDeterministic rule-based safety monitoring with threshold-based alerts and failsafe actions.\n\nChecks: battery voltage, signal strength, altitude, temperature, current draw, speed, motor RPM.`,
        language: 'markdown',
      },
    }

    // Try to match the word at the position with our hover docs
    // In a real implementation, we'd read the actual file and find the word
    for (const [key, value] of Object.entries(hoverDocs)) {
      if (position.filePath.includes(key.toLowerCase()) || key.startsWith('Nanggroe')) {
        // Simplified matching
        return {
          contents: value.contents,
          language: value.language,
          range: {
            startLine: position.line,
            startColumn: position.column,
            endLine: position.line,
            endColumn: position.column + key.length,
          },
        }
      }
    }

    return null
  }

  // --- Event Log ---

  getEventLog(limit: number = 50): ExtensionEvent[] {
    return this.eventLog.slice(-limit)
  }

  getCommandHistory(limit: number = 50): ExtensionCommand[] {
    return this.commandHistory.slice(-limit)
  }

  // --- Internal Helpers ---

  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex')
  }

  private logEvent(event: string, data: unknown, source: string): void {
    this.eventLog.push({
      event,
      data,
      timestamp: new Date().toISOString(),
      source,
    })
  }

  private async handleRunTask(_connectionId: string, taskName: string): Promise<unknown> {
    const nanggroeTasks: Record<string, () => Promise<unknown>> = {
      'hardware-scan': async () => {
        return { acknowledged: true, task: 'hardware-scan', status: 'initiated' }
      },
      'telemetry-read': async () => {
        return { acknowledged: true, task: 'telemetry-read', status: 'initiated' }
      },
      'build-deploy': async () => {
        return { acknowledged: true, task: 'build-deploy', status: 'initiated' }
      },
    }

    if (taskName in nanggroeTasks) {
      return nanggroeTasks[taskName]()
    }

    return { acknowledged: true, task: taskName, status: 'unknown_task' }
  }

  private async handleGetDiagnostics(_connectionId: string): Promise<unknown> {
    // Gather system diagnostics from DB
    const deviceCount = await db.hardwareDevice.count()
    const activeDevices = await db.hardwareDevice.count({ where: { status: 'active' } })
    const activeAlerts = await db.alert.count({ where: { isRead: false } })
    const criticalAlerts = await db.alert.count({ where: { level: 'critical', isResolved: false } })
    const activeMissions = await db.mission.count({ where: { status: 'active' } })

    const diagnostics: Array<{ severity: string; message: string; source: string }> = []

    if (criticalAlerts > 0) {
      diagnostics.push({
        severity: 'error',
        message: `${criticalAlerts} unresolved critical alert(s)`,
        source: 'nanggroe:alerts',
      })
    }

    if (activeDevices < deviceCount) {
      diagnostics.push({
        severity: 'warning',
        message: `${deviceCount - activeDevices} device(s) offline out of ${deviceCount}`,
        source: 'nanggroe:hardware',
      })
    }

    if (activeDevices === 0) {
      diagnostics.push({
        severity: 'warning',
        message: 'No active devices — run hardware scan to detect connected devices',
        source: 'nanggroe:hardware',
      })
    }

    return {
      diagnostics,
      summary: {
        devices: { total: deviceCount, active: activeDevices },
        alerts: { unread: activeAlerts, critical: criticalAlerts },
        missions: { active: activeMissions },
      },
    }
  }

  private async handleGetSystemStatus(): Promise<unknown> {
    const totalDevices = await db.hardwareDevice.count()
    const activeDevices = await db.hardwareDevice.count({ where: { status: 'active' } })
    const activeMissions = await db.mission.count({ where: { status: 'active' } })
    const unresolvedAlerts = await db.alert.count({ where: { isResolved: false } })

    return {
      system: 'NANGGROE OS AI',
      version: '1.0.0',
      status: activeDevices > 0 ? 'operational' : 'degraded',
      devices: { total: totalDevices, active: activeDevices },
      missions: { active: activeMissions },
      alerts: { unresolved: unresolvedAlerts },
      timestamp: new Date().toISOString(),
    }
  }

  private async handleReadTelemetry(): Promise<unknown> {
    const latestReadings = await db.telemetryReading.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    })

    const metricMap: Record<string, { value: number; unit: string | null; timestamp: Date }> = {}
    for (const r of latestReadings) {
      if (!(r.metric in metricMap)) {
        metricMap[r.metric] = { value: r.value, unit: r.unit, timestamp: r.timestamp }
      }
    }

    return metricMap
  }

  private async handleListDevices(): Promise<unknown> {
    return db.hardwareDevice.findMany({
      orderBy: { lastSeen: 'desc' },
      select: {
        id: true,
        name: true,
        deviceType: true,
        protocol: true,
        status: true,
        port: true,
        firmware: true,
        lastSeen: true,
      },
    })
  }
}
