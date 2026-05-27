// ============================================================
// NANGGROE IOT - Sentinel Agent
// Continuous background telemetry monitor
// Replaces ad-hoc PicoClaw checks with autonomous monitoring loop
// ============================================================

import { db } from './db'
import { getLatestTelemetrySnapshot } from './telemetry'
import { picoclawCheck } from './agents'
import { SAFETY_THRESHOLDS } from './constants'
import type {
  AgentInstance,
  AgentState,
  AgentType,
  AgentTask,
  AgentMessage,
  AgentStatus,
} from './agents'
import type { TelemetrySnapshot, PicoClawCheckResult } from './types'

// --- Sentinel-specific types ---

export interface SentinelThresholds {
  battery_voltage: { warning: number; critical: number }
  signal_strength: { warning: number; critical: number }
  altitude: { warning: number; critical: number }
  temperature: { warning: number; critical: number }
  current_draw: { warning: number; critical: number }
  speed: { warning: number; critical: number }
}

export interface SentinelCheckResult {
  timestamp: Date
  safe: boolean
  criticalCount: number
  warningCount: number
  alerts: PicoClawCheckResult['alerts']
  actions: PicoClawCheckResult['actions']
  telemetryAge: number // ms since last telemetry update
}

export interface SentinelConfig {
  checkInterval: number // ms between checks (default 2000)
  thresholds: SentinelThresholds
  autoEmergencyActions: boolean // auto-trigger RTH/land on critical
  escalationToHermes: boolean // escalate issues to Hermes
  telemetryStalenessThreshold: number // ms before telemetry is considered stale (default 10000)
}

const DEFAULT_SENTINEL_CONFIG: SentinelConfig = {
  checkInterval: 2000,
  thresholds: {
    battery_voltage: { warning: 13.2, critical: 12.6 },
    signal_strength: { warning: -70, critical: -80 },
    altitude: { warning: 110, critical: 120 },
    temperature: { warning: 40, critical: 50 },
    current_draw: { warning: 25, critical: 30 },
    speed: { warning: 12, critical: 15 },
  },
  autoEmergencyActions: true,
  escalationToHermes: true,
  telemetryStalenessThreshold: 10000,
}

// ============================================================
// SentinelAgent
// ============================================================

export class SentinelAgent implements AgentInstance {
  name = 'sentinel'
  type: AgentType = 'rule'
  state: AgentState = 'idle'
  capabilities = [
    'continuous_telemetry_monitoring',
    'safety_threshold_checking',
    'emergency_action_trigger',
    'alert_generation',
    'hermes_escalation',
    'telemetry_staleness_detection',
  ]

  private startTime: Date | null = null
  private _tasksCompleted = 0
  private _tasksFailed = 0
  private lastActivity: Date | null = null
  private config: SentinelConfig
  private checkLoop: ReturnType<typeof setInterval> | null = null
  private lastCheckResult: SentinelCheckResult | null = null
  private messageCallback: ((message: AgentMessage) => void) | null = null
  private consecutiveCriticalCount = 0

  constructor(config?: Partial<SentinelConfig>) {
    this.config = { ...DEFAULT_SENTINEL_CONFIG, ...config }
    if (config?.thresholds) {
      this.config.thresholds = { ...DEFAULT_SENTINEL_CONFIG.thresholds, ...config.thresholds }
    }
  }

  // --- Set message callback for orchestrator communication ---

  setMessageCallback(callback: (message: AgentMessage) => void): void {
    this.messageCallback = callback
  }

  // --- Lifecycle ---

  async initialize(): Promise<void> {
    this.state = 'idle'
    this.startTime = new Date()
  }

  async start(): Promise<void> {
    this.state = 'acting'
    this.startTime = new Date()
    this.startCheckLoop()
  }

  async stop(): Promise<void> {
    this.stopCheckLoop()
    this.state = 'idle'
  }

  // --- Main check loop ---

  private startCheckLoop(): void {
    if (this.checkLoop) return

    // Run first check immediately
    this.runCheck()

    this.checkLoop = setInterval(() => {
      this.runCheck()
    }, this.config.checkInterval)
  }

  private stopCheckLoop(): void {
    if (this.checkLoop) {
      clearInterval(this.checkLoop)
      this.checkLoop = null
    }
  }

  private async runCheck(): Promise<void> {
    try {
      const result = await this.performCheck()
      this.lastCheckResult = result
      this.lastActivity = new Date()
      this._tasksCompleted++

      // Handle critical conditions
      if (!result.safe && this.config.autoEmergencyActions) {
        await this.handleCriticalCondition(result)
      }

      // Escalate to Hermes if needed
      if (result.criticalCount > 0 && this.config.escalationToHermes && this.messageCallback) {
        this.messageCallback({
          id: `sentinel-escalation-${Date.now()}`,
          from: 'sentinel',
          to: 'hermes',
          type: 'escalation',
          payload: {
            criticalCount: result.criticalCount,
            warningCount: result.warningCount,
            alerts: result.alerts,
            actions: result.actions,
          },
          timestamp: new Date(),
          priority: 'critical',
        })
      }

      // Broadcast safety status
      if (this.messageCallback && (result.criticalCount > 0 || result.warningCount > 0)) {
        this.messageCallback({
          id: `sentinel-status-${Date.now()}`,
          from: 'sentinel',
          to: '*',
          type: 'status',
          payload: {
            safe: result.safe,
            criticalCount: result.criticalCount,
            warningCount: result.warningCount,
          },
          timestamp: new Date(),
          priority: result.criticalCount > 0 ? 'critical' : 'high',
        })
      }

      this.state = 'acting'
    } catch (error) {
      this.state = 'error'
      this._tasksFailed++
    }
  }

  // --- Perform a safety check ---

  async performCheck(): Promise<SentinelCheckResult> {
    const timestamp = new Date()

    // Get latest telemetry
    const telemetry = await getLatestTelemetrySnapshot()

    // Check telemetry staleness
    let telemetryAge = 0
    if (telemetry) {
      const latestReading = await db.telemetryReading.findFirst({
        orderBy: { timestamp: 'desc' },
      })
      if (latestReading) {
        telemetryAge = timestamp.getTime() - latestReading.timestamp.getTime()
      }
    }

    if (!telemetry) {
      return {
        timestamp,
        safe: false,
        criticalCount: 1,
        warningCount: 0,
        alerts: [{
          level: 'critical',
          metric: 'telemetry',
          message: 'No telemetry data available — cannot perform safety check',
          currentValue: 0,
          threshold: 0,
        }],
        actions: [{
          type: 'alert_operator',
          reason: 'No telemetry data — system may be disconnected',
        }],
        telemetryAge: Infinity,
      }
    }

    // Use PicoClaw's existing check logic
    const checkResult = picoclawCheck(telemetry)

    // Check telemetry staleness
    const staleAlerts: PicoClawCheckResult['alerts'] = []
    if (telemetryAge > this.config.telemetryStalenessThreshold) {
      staleAlerts.push({
        level: 'warning',
        metric: 'telemetry_staleness',
        message: `Telemetry data is ${(telemetryAge / 1000).toFixed(1)}s old — may be stale`,
        currentValue: telemetryAge / 1000,
        threshold: this.config.telemetryStalenessThreshold / 1000,
      })
    }

    return {
      timestamp,
      safe: checkResult.safe,
      criticalCount: checkResult.alerts.filter(a => a.level === 'critical').length,
      warningCount: checkResult.alerts.filter(a => a.level === 'warning').length + staleAlerts.length,
      alerts: [...checkResult.alerts, ...staleAlerts],
      actions: checkResult.actions,
      telemetryAge,
    }
  }

  // --- Handle critical conditions ---

  private async handleCriticalCondition(result: SentinelCheckResult): Promise<void> {
    this.consecutiveCriticalCount++

    // Create alert in database
    for (const alert of result.alerts.filter(a => a.level === 'critical')) {
      await db.alert.create({
        data: {
          level: 'critical',
          source: 'sentinel',
          title: `Sentinel: ${alert.metric} critical`,
          message: alert.message,
          category: 'safety',
          isRead: false,
        },
      })
    }

    // Auto-trigger emergency actions if consecutive critical checks exceed threshold
    if (this.consecutiveCriticalCount >= 2) {
      const hasRthAction = result.actions.some(a => a.type === 'rth')
      const hasLandAction = result.actions.some(a => a.type === 'land')

      if (hasRthAction || hasLandAction) {
        await db.alert.create({
          data: {
            level: 'critical',
            source: 'sentinel',
            title: '🚨 Emergency Action Triggered',
            message: `Sentinel auto-triggered emergency action after ${this.consecutiveCriticalCount} consecutive critical checks. Actions: ${result.actions.map(a => a.type).join(', ')}`,
            category: 'safety',
            isRead: false,
          },
        })
      }
    }
  }

  // --- Task processing (manual check trigger) ---

  async processTask(task: AgentTask): Promise<unknown> {
    this.state = 'thinking'
    this.lastActivity = new Date()
    try {
      const payload = task.payload as { action?: string; thresholds?: Partial<SentinelThresholds> } | null

      if (payload?.action === 'manual_check') {
        const result = await this.performCheck()
        this.state = 'acting'
        return result
      }

      if (payload?.action === 'configure' && payload.thresholds) {
        this.config.thresholds = { ...this.config.thresholds, ...payload.thresholds }
        this.state = 'acting'
        return { configured: true, thresholds: this.config.thresholds }
      }

      // Default: perform check
      const result = await this.performCheck()
      this.state = 'acting'
      this._tasksCompleted++
      return result
    } catch (error) {
      this.state = 'error'
      this._tasksFailed++
      throw error
    }
  }

  // --- Communication ---

  onMessage(message: AgentMessage): void {
    if (message.type === 'command') {
      const payload = message.payload as { action?: string } | null
      if (payload?.action === 'reset_consecutive') {
        this.consecutiveCriticalCount = 0
      }
    }
    this.lastActivity = new Date()
  }

  // --- Status ---

  getStatus(): AgentStatus {
    return {
      name: this.name,
      type: this.type,
      state: this.state,
      capabilities: this.capabilities,
      lastActivity: this.lastActivity,
      tasksCompleted: this._tasksCompleted,
      tasksFailed: this._tasksFailed,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0,
    }
  }

  getLastCheckResult(): SentinelCheckResult | null {
    return this.lastCheckResult
  }

  getConfig(): SentinelConfig {
    return { ...this.config }
  }
}
