// ============================================================
// NANGGROE IOT - DataSteward Agent
// Manages data pipeline from sensors to database
// Monitors data freshness, completeness, and anomaly detection
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
import type { TelemetryMetric } from './types'
import { TELEMETRY_METRICS } from './constants'

// --- DataSteward-specific types ---

export interface DataFreshnessReport {
  metric: TelemetryMetric
  lastReading: Date | null
  ageMs: number // ms since last reading
  isStale: boolean
  stalenessThreshold: number // ms
}

export interface SensorAnomaly {
  metric: TelemetryMetric
  type: 'stuck_value' | 'outlier' | 'drift' | 'missing'
  description: string
  severity: 'warning' | 'critical'
  currentValue: number
  expectedRange: { min: number; max: number }
  detectedAt: Date
}

export interface DataPipelineStatus {
  totalMetrics: number
  activeMetrics: number // have recent readings
  staleMetrics: number
  missingMetrics: number
  anomalies: SensorAnomaly[]
  lastSyncAt: Date | null
  syncQueueSize: number
  dbSizeBytes: number | null
}

export interface DataCleanupResult {
  deletedReadings: number
  deletedBefore: Date
  freedSpace: string
}

export interface DataStewardConfig {
  checkInterval: number // ms between data checks (default 5000)
  stalenessThresholds: Record<string, number> // ms - per-metric staleness
  stuckValueThreshold: number // consecutive identical readings = stuck (default 5)
  outlierStdDeviations: number // readings > N std devs from mean = outlier (default 3)
  cleanupAgeDays: number // delete readings older than this (default 90)
  syncCheckInterval: number // ms between sync queue checks (default 30000)
  anomalyHistorySize: number // readings to keep for anomaly detection (default 100)
}

const DEFAULT_STALENESS_THRESHOLDS: Record<string, number> = {
  battery_voltage: 5000,
  gps_lat: 3000,
  gps_lng: 3000,
  altitude: 3000,
  signal_strength: 5000,
  temperature: 10000,
  humidity: 10000,
  pressure: 10000,
  heading: 3000,
  speed: 3000,
  roll: 2000,
  pitch: 2000,
  yaw: 2000,
  motor_rpm_1: 3000,
  motor_rpm_2: 3000,
  motor_rpm_3: 3000,
  current_draw: 3000,
}

const DEFAULT_DATASTEWARD_CONFIG: DataStewardConfig = {
  checkInterval: 5000,
  stalenessThresholds: DEFAULT_STALENESS_THRESHOLDS,
  stuckValueThreshold: 5,
  outlierStdDeviations: 3,
  cleanupAgeDays: 90,
  syncCheckInterval: 30000,
  anomalyHistorySize: 100,
}

// ============================================================
// DataStewardAgent
// ============================================================

export class DataStewardAgent implements AgentInstance {
  name = 'data_steward'
  type: AgentType = 'rule'
  state: AgentState = 'idle'
  capabilities = [
    'data_freshness_monitoring',
    'sensor_anomaly_detection',
    'stuck_value_detection',
    'outlier_detection',
    'data_sync_management',
    'data_cleanup_archival',
    'pipeline_health_monitoring',
  ]

  private startTime: Date | null = null
  private _tasksCompleted = 0
  private _tasksFailed = 0
  private lastActivity: Date | null = null
  private config: DataStewardConfig
  private dataLoop: ReturnType<typeof setInterval> | null = null
  private lastPipelineStatus: DataPipelineStatus | null = null
  private recentAnomalies: SensorAnomaly[] = []
  private messageCallback: ((message: AgentMessage) => void) | null = null
  // Track recent values for stuck value detection
  private recentValues: Map<string, number[]> = new Map()

  constructor(config?: Partial<DataStewardConfig>) {
    this.config = { ...DEFAULT_DATASTEWARD_CONFIG, ...config }
    if (config?.stalenessThresholds) {
      this.config.stalenessThresholds = { ...DEFAULT_STALENESS_THRESHOLDS, ...config.stalenessThresholds }
    }
  }

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
    this.startDataLoop()
  }

  async stop(): Promise<void> {
    this.stopDataLoop()
    this.state = 'idle'
  }

  // --- Data monitoring loop ---

  private startDataLoop(): void {
    if (this.dataLoop) return

    this.dataLoop = setInterval(() => {
      this.runDataCheck()
    }, this.config.checkInterval)
  }

  private stopDataLoop(): void {
    if (this.dataLoop) {
      clearInterval(this.dataLoop)
      this.dataLoop = null
    }
  }

  private async runDataCheck(): Promise<void> {
    try {
      this.state = 'acting'
      this.lastActivity = new Date()

      const status = await this.assessPipeline()
      this.lastPipelineStatus = status

      // Report anomalies
      if (status.anomalies.length > 0) {
        this.recentAnomalies = [...status.anomalies, ...this.recentAnomalies].slice(0, 50)

        // Notify via message bus
        if (this.messageCallback) {
          const criticalAnomalies = status.anomalies.filter(a => a.severity === 'critical')
          if (criticalAnomalies.length > 0) {
            this.messageCallback({
              id: `data-anomaly-${Date.now()}`,
              from: 'data_steward',
              to: 'sentinel',
              type: 'alert',
              payload: {
                anomalyCount: criticalAnomalies.length,
                anomalies: criticalAnomalies,
              },
              timestamp: new Date(),
              priority: 'critical',
            })
          }

          // Notify about stale data
          if (status.staleMetrics > 0) {
            this.messageCallback({
              id: `data-stale-${Date.now()}`,
              from: 'data_steward',
              to: '*',
              type: 'status',
              payload: {
                staleMetrics: status.staleMetrics,
                totalMetrics: status.totalMetrics,
              },
              timestamp: new Date(),
              priority: 'high',
            })
          }
        }

        // Create alerts for critical anomalies
        for (const anomaly of status.anomalies.filter(a => a.severity === 'critical')) {
          await db.alert.create({
            data: {
              level: 'critical',
              source: 'data_steward',
              title: `Data Anomaly: ${anomaly.metric}`,
              message: anomaly.description,
              category: 'system',
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

  // --- Assess data pipeline health ---

  async assessPipeline(): Promise<DataPipelineStatus> {
    const now = new Date()
    const anomalies: SensorAnomaly[] = []
    let activeMetrics = 0
    let staleMetrics = 0
    let missingMetrics = 0

    for (const metric of TELEMETRY_METRICS as readonly TelemetryMetric[]) {
      const freshness = await this.checkMetricFreshness(metric, now)

      if (!freshness.lastReading) {
        missingMetrics++
        anomalies.push({
          metric,
          type: 'missing',
          description: `No readings for ${metric}`,
          severity: 'warning',
          currentValue: 0,
          expectedRange: { min: 0, max: 100 },
          detectedAt: now,
        })
      } else if (freshness.isStale) {
        staleMetrics++
        anomalies.push({
          metric,
          type: 'drift',
          description: `${metric} data is ${(freshness.ageMs / 1000).toFixed(1)}s old (threshold: ${(freshness.stalenessThreshold / 1000).toFixed(0)}s)`,
          severity: 'warning',
          currentValue: freshness.ageMs / 1000,
          expectedRange: { min: 0, max: freshness.stalenessThreshold / 1000 },
          detectedAt: now,
        })
      } else {
        activeMetrics++
      }

      // Check for stuck values
      const stuckAnomaly = await this.checkStuckValue(metric, now)
      if (stuckAnomaly) {
        anomalies.push(stuckAnomaly)
      }

      // Check for outliers
      const outlierAnomaly = await this.checkOutlier(metric, now)
      if (outlierAnomaly) {
        anomalies.push(outlierAnomaly)
      }
    }

    // Check sync queue
    const syncQueueSize = await db.syncQueue.count({
      where: { status: 'pending' },
    })

    const lastSync = await db.syncQueue.findFirst({
      where: { status: 'synced' },
      orderBy: { syncedAt: 'desc' },
    })

    return {
      totalMetrics: TELEMETRY_METRICS.length,
      activeMetrics,
      staleMetrics,
      missingMetrics,
      anomalies,
      lastSyncAt: lastSync?.syncedAt || null,
      syncQueueSize,
      dbSizeBytes: null, // Would need fs.stat for actual size
    }
  }

  // --- Check metric freshness ---

  private async checkMetricFreshness(
    metric: TelemetryMetric,
    now: Date
  ): Promise<DataFreshnessReport> {
    const lastReading = await db.telemetryReading.findFirst({
      where: { metric },
      orderBy: { timestamp: 'desc' },
    })

    const stalenessThreshold = this.config.stalenessThresholds[metric] || 10000

    return {
      metric,
      lastReading: lastReading?.timestamp || null,
      ageMs: lastReading ? now.getTime() - lastReading.timestamp.getTime() : Infinity,
      isStale: lastReading ? (now.getTime() - lastReading.timestamp.getTime()) > stalenessThreshold : true,
      stalenessThreshold,
    }
  }

  // --- Check for stuck values ---

  private async checkStuckValue(
    metric: TelemetryMetric,
    now: Date
  ): Promise<SensorAnomaly | null> {
    const recentReadings = await db.telemetryReading.findMany({
      where: { metric },
      orderBy: { timestamp: 'desc' },
      take: this.config.stuckValueThreshold + 1,
    })

    if (recentReadings.length < this.config.stuckValueThreshold) return null

    // Check if all recent values are identical
    const values = recentReadings.map(r => r.value)
    const allSame = values.every(v => v === values[0])

    if (allSame && values[0] !== 0) {
      // Non-zero stuck value — definitely an anomaly
      return {
        metric,
        type: 'stuck_value',
        description: `${metric} stuck at ${values[0]} for ${recentReadings.length} consecutive readings`,
        severity: 'critical',
        currentValue: values[0],
        expectedRange: { min: -Infinity, max: Infinity },
        detectedAt: now,
      }
    }

    return null
  }

  // --- Check for outliers ---

  private async checkOutlier(
    metric: TelemetryMetric,
    now: Date
  ): Promise<SensorAnomaly | null> {
    const readings = await db.telemetryReading.findMany({
      where: { metric },
      orderBy: { timestamp: 'desc' },
      take: this.config.anomalyHistorySize,
    })

    if (readings.length < 10) return null

    const values = readings.map(r => r.value)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)

    const latestValue = readings[0].value

    if (stdDev > 0 && Math.abs(latestValue - mean) > this.config.outlierStdDeviations * stdDev) {
      return {
        metric,
        type: 'outlier',
        description: `${metric} value ${latestValue.toFixed(2)} is >${this.config.outlierStdDeviations} std devs from mean (${mean.toFixed(2)})`,
        severity: 'warning',
        currentValue: latestValue,
        expectedRange: {
          min: mean - this.config.outlierStdDeviations * stdDev,
          max: mean + this.config.outlierStdDeviations * stdDev,
        },
        detectedAt: now,
      }
    }

    return null
  }

  // --- Process task ---

  async processTask(task: AgentTask): Promise<unknown> {
    this.state = 'thinking'
    this.lastActivity = new Date()
    try {
      const payload = task.payload as {
        action?: string
        metric?: string
        days?: number
      } | null

      switch (payload?.action) {
        case 'assess_pipeline': {
          const status = await this.assessPipeline()
          this.state = 'idle'
          this._tasksCompleted++
          return status
        }

        case 'check_metric': {
          const metric = payload.metric as TelemetryMetric | undefined
          if (!metric) throw new Error('Metric name required')
          const freshness = await this.checkMetricFreshness(metric, new Date())
          const stuck = await this.checkStuckValue(metric, new Date())
          const outlier = await this.checkOutlier(metric, new Date())
          this.state = 'idle'
          this._tasksCompleted++
          return { freshness, stuck, outlier }
        }

        case 'cleanup': {
          const days = payload.days || this.config.cleanupAgeDays
          const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          const result = await db.telemetryReading.deleteMany({
            where: { timestamp: { lt: cutoff } },
          })
          this.state = 'idle'
          this._tasksCompleted++
          return {
            deletedReadings: result.count,
            deletedBefore: cutoff,
            freedSpace: `~${Math.round(result.count * 0.1)}KB`,
          } as DataCleanupResult
        }

        case 'sync_status': {
          const pendingSyncs = await db.syncQueue.count({ where: { status: 'pending' } })
          const failedSyncs = await db.syncQueue.count({ where: { status: 'failed' } })
          this.state = 'idle'
          this._tasksCompleted++
          return { pendingSyncs, failedSyncs }
        }

        default: {
          const status = await this.assessPipeline()
          this.state = 'idle'
          this._tasksCompleted++
          return status
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

  getLastPipelineStatus(): DataPipelineStatus | null {
    return this.lastPipelineStatus
  }

  getRecentAnomalies(): SensorAnomaly[] {
    return [...this.recentAnomalies]
  }

  getConfig(): DataStewardConfig {
    return { ...this.config }
  }
}
