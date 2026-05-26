// ============================================================
// NANGGROE IOT - CommsGuard Agent
// Monitors communication links and manages failover
// Detects signal degradation and triggers backup channels
// ============================================================

import { db } from './db'
import type {
  AgentInstance,
  AgentState,
  AgentType,
  AgentTask,
  AgentMessage,
  AgentStatus,
} from './agents'

// --- CommsGuard-specific types ---

export interface CommLinkStatus {
  type: string // radio, gsm, wifi, telemetry
  status: 'connected' | 'degraded' | 'failing' | 'lost' | 'unknown'
  signalStrength: number // dBm or percentage
  latency: number // ms
  packetLoss: number // percentage
  lastHeartbeat: Date | null
  uptime: number // seconds
}

export interface CommFailoverEvent {
  id: string
  fromChannel: string
  toChannel: string
  reason: string
  timestamp: Date
  successful: boolean
}

export interface CommAlert {
  level: 'warning' | 'critical'
  channel: string
  message: string
  recommendation: string
  timestamp: Date
}

export interface CommsGuardConfig {
  checkInterval: number // ms between comm checks (default 3000)
  signalDegradationThreshold: number // dBm - below this is degraded (default -65)
  signalCriticalThreshold: number // dBm - below this triggers failover (default -80)
  heartbeatTimeout: number // ms - no heartbeat = connection lost (default 10000)
  maxRetryAttempts: number // connection retry limit (default 3)
  retryInterval: number // ms between retries (default 5000)
  failoverPriority: string[] // channel priority order for failover
}

const DEFAULT_COMMSGUARD_CONFIG: CommsGuardConfig = {
  checkInterval: 3000,
  signalDegradationThreshold: -65,
  signalCriticalThreshold: -80,
  heartbeatTimeout: 10000,
  maxRetryAttempts: 3,
  retryInterval: 5000,
  failoverPriority: ['radio', 'gsm', 'wifi', 'telemetry'],
}

// ============================================================
// CommsGuardAgent
// ============================================================

export class CommsGuardAgent implements AgentInstance {
  name = 'comms_guard'
  type: AgentType = 'rule'
  state: AgentState = 'idle'
  capabilities = [
    'link_monitoring',
    'signal_quality_tracking',
    'failover_management',
    'connection_retry',
    'heartbeat_monitoring',
    'operator_alerting',
  ]

  private startTime: Date | null = null
  private _tasksCompleted = 0
  private _tasksFailed = 0
  private lastActivity: Date | null = null
  private config: CommsGuardConfig
  private commLoop: ReturnType<typeof setInterval> | null = null
  private linkStatuses: Map<string, CommLinkStatus> = new Map()
  private failoverHistory: CommFailoverEvent[] = []
  private messageCallback: ((message: AgentMessage) => void) | null = null
  private retryAttempts: Map<string, number> = new Map()

  constructor(config?: Partial<CommsGuardConfig>) {
    this.config = { ...DEFAULT_COMMSGUARD_CONFIG, ...config }
  }

  setMessageCallback(callback: (message: AgentMessage) => void): void {
    this.messageCallback = callback
  }

  // --- Lifecycle ---

  async initialize(): Promise<void> {
    this.state = 'idle'
    this.startTime = new Date()
    await this.loadCommChannels()
  }

  async start(): Promise<void> {
    this.state = 'acting'
    this.startTime = new Date()
    await this.loadCommChannels()
    this.startCommLoop()
  }

  async stop(): Promise<void> {
    this.stopCommLoop()
    this.state = 'idle'
  }

  // --- Load communication channels from DB ---

  private async loadCommChannels(): Promise<void> {
    const channels = await db.communicationChannel.findMany()

    for (const channel of channels) {
      if (!this.linkStatuses.has(channel.type)) {
        this.linkStatuses.set(channel.type, {
          type: channel.type,
          status: channel.status as CommLinkStatus['status'],
          signalStrength: channel.type === 'radio' ? -50 : 0,
          latency: 0,
          packetLoss: 0,
          lastHeartbeat: channel.status === 'connected' ? new Date() : null,
          uptime: 0,
        })
      }
    }
  }

  // --- Communication monitoring loop ---

  private startCommLoop(): void {
    if (this.commLoop) return

    this.commLoop = setInterval(() => {
      this.runCommCheck()
    }, this.config.checkInterval)
  }

  private stopCommLoop(): void {
    if (this.commLoop) {
      clearInterval(this.commLoop)
      this.commLoop = null
    }
  }

  private async runCommCheck(): Promise<void> {
    try {
      this.state = 'acting'
      this.lastActivity = new Date()

      // Refresh channel data from DB
      await this.loadCommChannels()

      // Check each link
      const alerts: CommAlert[] = []

      for (const [channelType, linkStatus] of this.linkStatuses.entries()) {
        // Check heartbeat timeout
        if (linkStatus.lastHeartbeat) {
          const timeSinceHeartbeat = Date.now() - linkStatus.lastHeartbeat.getTime()
          if (timeSinceHeartbeat > this.config.heartbeatTimeout) {
            linkStatus.status = 'lost'
            alerts.push({
              level: 'critical',
              channel: channelType,
              message: `${channelType} link lost — no heartbeat for ${(timeSinceHeartbeat / 1000).toFixed(1)}s`,
              recommendation: 'Initiate failover to backup channel',
              timestamp: new Date(),
            })
          }
        }

        // Check signal quality based on telemetry
        if (channelType === 'radio' || channelType === 'telemetry') {
          const latestSignal = await db.telemetryReading.findFirst({
            where: { metric: 'signal_strength' },
            orderBy: { timestamp: 'desc' },
          })

          if (latestSignal) {
            linkStatus.signalStrength = latestSignal.value

            if (latestSignal.value <= this.config.signalCriticalThreshold) {
              linkStatus.status = 'failing'
              alerts.push({
                level: 'critical',
                channel: channelType,
                message: `${channelType} signal critical at ${latestSignal.value}dBm`,
                recommendation: 'Trigger failover to backup channel immediately',
                timestamp: new Date(),
              })

              // Attempt failover
              await this.attemptFailover(channelType)
            } else if (latestSignal.value <= this.config.signalDegradationThreshold) {
              linkStatus.status = 'degraded'
              alerts.push({
                level: 'warning',
                channel: channelType,
                message: `${channelType} signal degrading at ${latestSignal.value}dBm`,
                recommendation: 'Monitor closely, prepare for failover',
                timestamp: new Date(),
              })
            } else {
              linkStatus.status = 'connected'
            }
          }
        }

        // Check DB channel status
        const dbChannel = await db.communicationChannel.findFirst({
          where: { type: channelType },
        })
        if (dbChannel && dbChannel.status === 'error') {
          linkStatus.status = 'failing'
          alerts.push({
            level: 'critical',
            channel: channelType,
            message: `${channelType} in error state`,
            recommendation: 'Attempt reconnection or failover',
            timestamp: new Date(),
          })
        }
      }

      // Send alerts via message bus
      for (const alert of alerts) {
        if (this.messageCallback) {
          this.messageCallback({
            id: `comms-alert-${Date.now()}-${alert.channel}`,
            from: 'comms_guard',
            to: alert.level === 'critical' ? '*' : 'sentinel',
            type: 'alert',
            payload: alert,
            timestamp: new Date(),
            priority: alert.level === 'critical' ? 'critical' : 'high',
          })
        }

        // Create DB alert for critical issues
        if (alert.level === 'critical') {
          await db.alert.create({
            data: {
              level: 'critical',
              source: 'comms_guard',
              title: `Comm Link: ${alert.message}`,
              message: alert.recommendation,
              category: 'communication',
              isRead: false,
            },
          })
        }
      }

      this._tasksCompleted++
    } catch (error) {
      this.state = 'error'
      this._tasksFailed++
    }
  }

  // --- Failover logic ---

  private async attemptFailover(failedChannel: string): Promise<boolean> {
    const attempts = this.retryAttempts.get(failedChannel) || 0

    // Find next available channel based on priority
    for (const backupType of this.config.failoverPriority) {
      if (backupType === failedChannel) continue

      const backupStatus = this.linkStatuses.get(backupType)
      if (backupStatus && (backupStatus.status === 'connected' || backupStatus.status === 'degraded')) {
        // Try to connect the backup channel
        const backupChannel = await db.communicationChannel.findFirst({
          where: { type: backupType, isEnabled: true },
        })

        if (backupChannel) {
          const failoverEvent: CommFailoverEvent = {
            id: `failover-${Date.now()}`,
            fromChannel: failedChannel,
            toChannel: backupType,
            reason: `Primary channel ${failedChannel} signal critical`,
            timestamp: new Date(),
            successful: backupChannel.status === 'connected',
          }

          this.failoverHistory.push(failoverEvent)

          if (this.messageCallback) {
            this.messageCallback({
              id: `comms-failover-${Date.now()}`,
              from: 'comms_guard',
              to: '*',
              type: 'alert',
              payload: {
                event: 'failover',
                from: failedChannel,
                to: backupType,
                successful: failoverEvent.successful,
              },
              timestamp: new Date(),
              priority: 'critical',
            })
          }

          return failoverEvent.successful
        }
      }
    }

    // No failover available — increment retry counter
    if (attempts < this.config.maxRetryAttempts) {
      this.retryAttempts.set(failedChannel, attempts + 1)
    } else {
      // Max retries reached — alert operator
      await db.alert.create({
        data: {
          level: 'critical',
          source: 'comms_guard',
          title: '🚨 Communication Failover Failed',
          message: `No backup channel available for ${failedChannel}. All failover attempts exhausted. Operator intervention required.`,
          category: 'communication',
          isRead: false,
        },
      })
    }

    return false
  }

  // --- Process task ---

  async processTask(task: AgentTask): Promise<unknown> {
    this.state = 'thinking'
    this.lastActivity = new Date()
    try {
      const payload = task.payload as {
        action?: string
        channel?: string
      } | null

      switch (payload?.action) {
        case 'status': {
          this.state = 'idle'
          this._tasksCompleted++
          return {
            links: Object.fromEntries(this.linkStatuses),
            failoverHistory: this.failoverHistory.slice(-10),
          }
        }

        case 'check_channel': {
          const channel = payload.channel || 'radio'
          const status = this.linkStatuses.get(channel)
          this.state = 'idle'
          this._tasksCompleted++
          return status || { status: 'unknown', channel }
        }

        case 'force_failover': {
          const fromChannel = payload.channel || 'radio'
          const success = await this.attemptFailover(fromChannel)
          this.state = 'idle'
          this._tasksCompleted++
          return { failoverInitiated: true, success }
        }

        default: {
          this.state = 'idle'
          this._tasksCompleted++
          return {
            links: Object.fromEntries(this.linkStatuses),
            totalLinks: this.linkStatuses.size,
            connectedLinks: Array.from(this.linkStatuses.values()).filter(l => l.status === 'connected').length,
          }
        }
      }
    } catch (error) {
      this.state = 'error'
      this._tasksFailed++
      throw error
    }
  }

  // --- Communication ---

  onMessage(message: AgentMessage): void {
    if (message.type === 'alert' && message.from === 'sentinel') {
      // Sentinel found safety issue — CommsGuard should check links
      this.lastActivity = new Date()
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

  getLinkStatuses(): Map<string, CommLinkStatus> {
    return new Map(this.linkStatuses)
  }

  getFailoverHistory(): CommFailoverEvent[] {
    return [...this.failoverHistory]
  }

  getConfig(): CommsGuardConfig {
    return { ...this.config }
  }
}
