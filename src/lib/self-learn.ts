// ============================================================
// NANGGROE IOT - Self-Learning Service
// Enables Nanggroe IoT to learn from experience and improve over time.
// Pattern recognition, decision logging, performance tracking,
// adaptive parameters, knowledge base, and learning reports.
// ============================================================

import ZAI from 'z-ai-web-dev-sdk'
import { db } from './db'
import { AiMemoryService } from './ai-memory'
import { getTelemetryHistory, recordTelemetry } from './telemetry'
import { SAFETY_THRESHOLDS } from './constants'
import type {
  AiMemoryCategory,
  TelemetryMetric,
  MissionStatus,
  AlertEntry,
} from './types'

// ============================================================
// Types
// ============================================================

export type LearningCategory =
  | 'telemetry_pattern'
  | 'mission_outcome'
  | 'battery_efficiency'
  | 'flight_performance'
  | 'safety_incident'
  | 'parameter_optimization'
  | 'environmental_adaptation'

export interface PatternDetection {
  metric: TelemetryMetric | string
  patternType: 'anomaly' | 'trend' | 'cyclic' | 'threshold_approach' | 'normal'
  description: string
  confidence: number
  dataPoints: number
  firstSeen: string
  lastSeen: string
  severity: 'info' | 'warning' | 'critical'
  recommendation?: string
}

export interface DecisionRecord {
  id: string
  agentName: string
  decisionType: string
  context: string
  action: string
  expectedOutcome: string
  actualOutcome?: string
  outcomeSuccess?: boolean
  confidence: number
  telemetrySnapshot?: Record<string, number>
  timestamp: string
  reviewedAt?: string
}

export interface PerformanceMetrics {
  missionSuccessRate: number
  missionTotal: number
  missionCompleted: number
  missionFailed: number
  avgBatteryEfficiency: number  // % of battery used per mission
  avgFlightTime: number         // minutes
  avgDistancePerMission: number  // meters
  safetyIncidentCount: number
  lastCalculated: string
}

export interface AdaptiveParameter {
  key: string
  currentValue: number
  suggestedValue: number
  confidence: number
  reason: string
  category: 'pid' | 'flight' | 'safety' | 'navigation' | 'power'
  lastAdjusted: string
  adjustmentHistory: Array<{
    from: number
    to: number
    reason: string
    timestamp: string
  }>
}

export interface LearningReport {
  generatedAt: string
  periodStart: string
  periodEnd: string
  summary: string
  patternsDetected: number
  decisionsRecorded: number
  decisionsReviewed: number
  performanceChange: 'improved' | 'stable' | 'degraded'
  topPatterns: PatternDetection[]
  parameterSuggestions: AdaptiveParameter[]
  insights: string[]
  recommendations: string[]
}

export interface TransferKnowledge {
  sourceProjectId: string
  targetProjectId: string
  category: LearningCategory
  knowledge: Array<{
    key: string
    value: unknown
    confidence: number
    context?: string
  }>
}

export interface SelfLearnEvent {
  type: 'pattern_detected' | 'decision_recorded' | 'decision_reviewed' | 'parameter_suggested' | 'report_generated' | 'learning_stored'
  timestamp: Date
  data?: unknown
}

type SelfLearnEventCallback = (event: SelfLearnEvent) => void

// ============================================================
// SelfLearnService — Singleton service
// ============================================================

export class SelfLearnService {
  private static instance: SelfLearnService

  private aiMemory: AiMemoryService
  private eventListeners: SelfLearnEventCallback[] = []

  // Local caches
  private decisionCache: Map<string, DecisionRecord> = new Map()
  private patternCache: PatternDetection[] = []
  private performanceCache: PerformanceMetrics | null = null
  private parameterCache: Map<string, AdaptiveParameter> = new Map()

  // Learning state
  private lastAnalysisTime: Date = new Date(0)
  private analysisIntervalMs: number = 5 * 60 * 1000 // 5 minutes
  private zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

  private constructor() {
    this.aiMemory = AiMemoryService.getInstance()
  }

  static getInstance(): SelfLearnService {
    if (!SelfLearnService.instance) {
      SelfLearnService.instance = new SelfLearnService()
    }
    return SelfLearnService.instance
  }

  private async getZAI(): Promise<NonNullable<typeof this.zaiInstance>> {
    if (!this.zaiInstance) {
      this.zaiInstance = await ZAI.create()
    }
    return this.zaiInstance
  }

  // ============================================================
  // Pattern Recognition
  // ============================================================

  /**
   * Analyze telemetry history for patterns, anomalies, and trends.
   * Stores detected patterns in AI Memory for future reference.
   */
  async analyzePatterns(
    metric?: TelemetryMetric,
    hours: number = 24
  ): Promise<PatternDetection[]> {

    const patterns: PatternDetection[] = []
    const metricsToAnalyze: TelemetryMetric[] = metric
      ? [metric]
      : ['battery_voltage', 'altitude', 'speed', 'temperature', 'signal_strength', 'current_draw']

    for (const m of metricsToAnalyze) {
      try {
        const history = await getTelemetryHistory(m, 500)
        if (history.length < 3) continue

        const values = history.map(h => h.value)
        const stats = this.computeStatistics(values)

        // Detect anomaly: value significantly outside normal range
        const anomaly = this.detectAnomaly(m, values, stats)
        if (anomaly) {
          patterns.push(anomaly)
        }

        // Detect trend: consistent increase or decrease
        const trend = this.detectTrend(m, values)
        if (trend) {
          patterns.push(trend)
        }

        // Detect cyclic pattern
        const cyclic = this.detectCyclicPattern(m, values)
        if (cyclic) {
          patterns.push(cyclic)
        }

        // Detect threshold approach
        const thresholdApproach = this.detectThresholdApproach(m, values)
        if (thresholdApproach) {
          patterns.push(thresholdApproach)
        }
      } catch (err) {
      }
    }

    // Store detected patterns in AI memory
    for (const pattern of patterns) {
      await this.aiMemory.remember(
        'pattern' as AiMemoryCategory,
        `pattern:${pattern.metric}:${pattern.patternType}`,
        pattern,
        `Auto-detected ${pattern.patternType} pattern, confidence ${pattern.confidence}`,
        pattern.confidence,
      )
    }

    this.patternCache = patterns
    this.emitEvent('pattern_detected', { count: patterns.length, patterns })

    return patterns
  }

  /**
   * Get currently cached patterns.
   */
  getCachedPatterns(): PatternDetection[] {
    return this.patternCache
  }

  // ============================================================
  // Decision Logging
  // ============================================================

  /**
   * Record an AI decision for future reference and outcome tracking.
   */
  async recordDecision(
    agentName: string,
    decisionType: string,
    context: string,
    action: string,
    expectedOutcome: string,
    confidence: number = 0.5,
    telemetrySnapshot?: Record<string, number>
  ): Promise<DecisionRecord> {
    const id = `decision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const record: DecisionRecord = {
      id,
      agentName,
      decisionType,
      context,
      action,
      expectedOutcome,
      confidence,
      telemetrySnapshot,
      timestamp: new Date().toISOString(),
    }

    // Store in AI memory
    await this.aiMemory.remember(
      'decision' as AiMemoryCategory,
      `decision:${id}`,
      record,
      `Agent ${agentName} decision: ${decisionType}`,
      confidence,
    )

    // Also store in local cache for quick access
    this.decisionCache.set(id, record)

    this.emitEvent('decision_recorded', record)

    return record
  }

  /**
   * Review a previous decision by recording its actual outcome.
   * This is how the system learns from experience.
   */
  async reviewDecision(
    decisionId: string,
    actualOutcome: string,
    outcomeSuccess: boolean
  ): Promise<DecisionRecord | null> {
    // Find the decision in cache or memory
    let record = this.decisionCache.get(decisionId)

    if (!record) {
      // Try to find in AI memory
      const memory = await this.aiMemory.recall('decision' as AiMemoryCategory, `decision:${decisionId}`)
      if (memory && typeof memory.value === 'object' && memory.value !== null) {
        record = memory.value as DecisionRecord
      }
    }

    if (!record) {
      return null
    }

    // Update the record with the outcome
    record.actualOutcome = actualOutcome
    record.outcomeSuccess = outcomeSuccess
    record.reviewedAt = new Date().toISOString()

    // Update in AI memory with the reviewed decision
    await this.aiMemory.remember(
      'decision' as AiMemoryCategory,
      `decision:${decisionId}`,
      record,
      `Reviewed: ${outcomeSuccess ? 'SUCCESS' : 'FAILURE'} — ${actualOutcome}`,
      outcomeSuccess ? Math.min(record.confidence + 0.1, 1.0) : Math.max(record.confidence - 0.2, 0.1),
    )

    // If the decision was unsuccessful, learn from the failure
    if (!outcomeSuccess) {
      await this.aiMemory.remember(
        'learning' as AiMemoryCategory,
        `learned:failure:${record.decisionType}`,
        {
          decisionType: record.decisionType,
          context: record.context,
          action: record.action,
          expectedOutcome: record.expectedOutcome,
          actualOutcome,
          lessonLearned: `Action "${record.action}" did not produce expected outcome in context: ${record.context}`,
        },
        `Failed decision pattern: ${record.decisionType}`,
        0.8,
      )
    }

    this.decisionCache.set(decisionId, record)
    this.emitEvent('decision_reviewed', record)

    return record
  }

  /**
   * Get unreviewed decisions (decisions without recorded outcomes).
   */
  async getUnreviewedDecisions(limit: number = 20): Promise<DecisionRecord[]> {
    const memories = await this.aiMemory.search('decision' as AiMemoryCategory, 'decision:', limit)

    return memories
      .map(m => m.value as unknown as DecisionRecord)
      .filter(d => d && !d.actualOutcome)
  }

  /**
   * Get recent decision history.
   */
  async getDecisionHistory(limit: number = 20): Promise<DecisionRecord[]> {
    const memories = await this.aiMemory.search('decision' as AiMemoryCategory, 'decision:', limit)
    return memories.map(m => m.value as unknown as DecisionRecord).filter(Boolean)
  }

  // ============================================================
  // Performance Tracking
  // ============================================================

  /**
   * Calculate and track performance metrics from mission history.
   */
  async trackPerformance(): Promise<PerformanceMetrics> {
    try {
      // Query mission outcomes from database
      const missions = await db.mission.findMany({
        select: {
          status: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      })

      const missionTotal = missions.length
      const missionCompleted = missions.filter(m => m.status === 'completed').length
      const missionFailed = missions.filter(m => m.status === 'failed' || m.status === 'aborted').length

      const missionSuccessRate = missionTotal > 0
        ? Math.round((missionCompleted / missionTotal) * 100)
        : 0

      // Calculate average flight time from completed missions
      const completedMissions = missions.filter(m =>
        m.status === 'completed' && m.startedAt && m.completedAt
      )
      const flightTimes = completedMissions.map(m => {
        const duration = m.completedAt!.getTime() - m.startedAt!.getTime()
        return duration / (1000 * 60) // Convert to minutes
      })
      const avgFlightTime = flightTimes.length > 0
        ? Math.round(flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length)
        : 0

      // Calculate average battery efficiency from telemetry
      const batteryReadings = await db.telemetryReading.findMany({
        where: { metric: 'battery_voltage' },
        orderBy: { timestamp: 'desc' },
        take: 100,
      })
      const avgBatteryEfficiency = batteryReadings.length > 0
        ? Math.round((batteryReadings.reduce((sum, r) => sum + r.value, 0) / batteryReadings.length / 16.8) * 100)
        : 0

      // Count safety incidents from alerts
      const safetyIncidents = await db.alert.count({
        where: { category: 'safety', level: { in: ['warning', 'critical'] } },
      })

      const metrics: PerformanceMetrics = {
        missionSuccessRate,
        missionTotal,
        missionCompleted,
        missionFailed,
        avgBatteryEfficiency,
        avgFlightTime,
        avgDistancePerMission: 0, // Would need GPS distance calculations
        safetyIncidentCount: safetyIncidents,
        lastCalculated: new Date().toISOString(),
      }

      // Store performance metrics in AI memory
      await this.aiMemory.remember(
        'learning' as AiMemoryCategory,
        'performance:latest',
        metrics,
        'Performance metrics calculated from mission and telemetry history',
        1.0,
      )

      this.performanceCache = metrics
      return metrics
    } catch (err) {

      // Return cached metrics or defaults
      return this.performanceCache || {
        missionSuccessRate: 0,
        missionTotal: 0,
        missionCompleted: 0,
        missionFailed: 0,
        avgBatteryEfficiency: 0,
        avgFlightTime: 0,
        avgDistancePerMission: 0,
        safetyIncidentCount: 0,
        lastCalculated: new Date().toISOString(),
      }
    }
  }

  /**
   * Get cached performance metrics.
   */
  getCachedPerformance(): PerformanceMetrics | null {
    return this.performanceCache
  }

  // ============================================================
  // Adaptive Parameters (Auto-Tuning)
  // ============================================================

  /**
   * Suggest parameter adjustments based on learned patterns.
   * Uses AI to analyze current parameters and suggest optimizations.
   */
  async suggestImprovements(): Promise<AdaptiveParameter[]> {

    const suggestions: AdaptiveParameter[] = []

    try {
      // Get current performance metrics
      const performance = await this.trackPerformance()

      // Get recent patterns
      const patterns = this.patternCache.length > 0
        ? this.patternCache
        : await this.analyzePatterns()

      // Get recent decision outcomes
      const decisions = await this.getDecisionHistory(20)
      const failedDecisions = decisions.filter(d => d.outcomeSuccess === false)

      // Generate PID tuning suggestions based on flight performance
      const pidSuggestion = await this.generatePIDTuningSuggestion(performance, patterns)
      if (pidSuggestion) suggestions.push(pidSuggestion)

      // Generate safety parameter suggestions
      const safetySuggestion = await this.generateSafetyParameterSuggestion(performance, patterns)
      if (safetySuggestion) suggestions.push(safetySuggestion)

      // Generate power management suggestions
      const powerSuggestion = await this.generatePowerSuggestion(performance, patterns)
      if (powerSuggestion) suggestions.push(powerSuggestion)

      // Generate flight parameter suggestions
      const flightSuggestion = await this.generateFlightParameterSuggestion(performance, patterns)
      if (flightSuggestion) suggestions.push(flightSuggestion)

      // Use AI for deeper analysis if we have failed decisions
      if (failedDecisions.length > 0) {
        const aiSuggestions = await this.generateAISuggestions(performance, patterns, failedDecisions)
        suggestions.push(...aiSuggestions)
      }

      // Cache suggestions
      for (const suggestion of suggestions) {
        this.parameterCache.set(suggestion.key, suggestion)

        // Store in AI memory
        await this.aiMemory.remember(
          'learning' as AiMemoryCategory,
          `suggestion:${suggestion.key}`,
          suggestion,
          `Parameter suggestion: ${suggestion.reason}`,
          suggestion.confidence,
        )
      }

      this.emitEvent('parameter_suggested', { count: suggestions.length, suggestions })
    } catch (err) {
    }

    return suggestions
  }

  /**
   * Apply an auto-tune to a parameter based on learning.
   * Records the adjustment in history and updates the system config.
   */
  async autoTuneParameter(
    key: string,
    newValue: number,
    reason: string
  ): Promise<AdaptiveParameter | null> {
    // Get the current parameter value
    const config = await db.systemConfig.findUnique({ where: { key } })
    const currentValue = config ? parseFloat(config.value) : 0

    if (isNaN(currentValue)) {
      return null
    }

    // Get or create the adaptive parameter record
    let param = this.parameterCache.get(key)

    if (!param) {
      param = {
        key,
        currentValue,
        suggestedValue: newValue,
        confidence: 0.5,
        reason,
        category: this.categorizeParameter(key),
        lastAdjusted: new Date().toISOString(),
        adjustmentHistory: [],
      }
    }

    // Record the adjustment in history
    param.adjustmentHistory.push({
      from: currentValue,
      to: newValue,
      reason,
      timestamp: new Date().toISOString(),
    })

    // Apply the change in the database
    try {
      await db.systemConfig.upsert({
        where: { key },
        create: {
          key,
          value: String(newValue),
          category: 'hardware',
        },
        update: {
          value: String(newValue),
        },
      })

      // Update the parameter cache
      param.currentValue = newValue
      param.lastAdjusted = new Date().toISOString()
      this.parameterCache.set(key, param)

      // Record this as a decision
      await this.recordDecision(
        'self_learn',
        'auto_tune',
        `Auto-tuning parameter ${key} from ${currentValue} to ${newValue}`,
        `Set ${key} = ${newValue}`,
        `Improved performance or safety based on learned patterns`,
        param.confidence,
      )

      // Store in AI memory
      await this.aiMemory.remember(
        'learning' as AiMemoryCategory,
        `autotune:${key}`,
        {
          key,
          from: currentValue,
          to: newValue,
          reason,
          timestamp: new Date().toISOString(),
        },
        `Auto-tuned ${key}: ${reason}`,
        0.7,
      )

      return param
    } catch (err) {
      return null
    }
  }

  /**
   * Get all cached parameter suggestions.
   */
  getCachedSuggestions(): AdaptiveParameter[] {
    return Array.from(this.parameterCache.values())
  }

  // ============================================================
  // Learning Reports
  // ============================================================

  /**
   * Generate a comprehensive learning report for a time period.
   */
  async generateLearningReport(
    periodHours: number = 168 // Default: 1 week
  ): Promise<LearningReport> {

    const now = new Date()
    const periodStart = new Date(now.getTime() - periodHours * 60 * 60 * 1000)

    try {
      // Collect data for the report
      const patterns = await this.analyzePatterns(undefined, periodHours)
      const decisions = await this.getDecisionHistory(50)
      const performance = await this.trackPerformance()

      const decisionsRecorded = decisions.length
      const decisionsReviewed = decisions.filter(d => d.actualOutcome !== undefined).length
      const successfulDecisions = decisions.filter(d => d.outcomeSuccess === true).length
      const failedDecisions = decisions.filter(d => d.outcomeSuccess === false).length

      // Determine performance change direction
      const previousPerformance = await this.aiMemory.recall(
        'learning' as AiMemoryCategory,
        'performance:previous'
      )
      let performanceChange: 'improved' | 'stable' | 'degraded' = 'stable'
      if (previousPerformance && typeof previousPerformance.value === 'object' && previousPerformance.value !== null) {
        const prev = previousPerformance.value as PerformanceMetrics
        const successDiff = performance.missionSuccessRate - prev.missionSuccessRate
        if (successDiff > 5) performanceChange = 'improved'
        else if (successDiff < -5) performanceChange = 'degraded'
      }

      // Get parameter suggestions
      const parameterSuggestions = await this.suggestImprovements()

      // Generate AI-powered insights and recommendations
      const { insights, recommendations, summary } = await this.generateAIInsights(
        patterns,
        decisions,
        performance,
        periodHours,
      )

      const report: LearningReport = {
        generatedAt: now.toISOString(),
        periodStart: periodStart.toISOString(),
        periodEnd: now.toISOString(),
        summary,
        patternsDetected: patterns.length,
        decisionsRecorded,
        decisionsReviewed,
        performanceChange,
        topPatterns: patterns.slice(0, 10),
        parameterSuggestions,
        insights,
        recommendations,
      }

      // Store current performance as "previous" for next comparison
      await this.aiMemory.remember(
        'learning' as AiMemoryCategory,
        'performance:previous',
        performance,
        'Previous performance snapshot for comparison',
        1.0,
      )

      // Store the report in AI memory
      await this.aiMemory.remember(
        'learning' as AiMemoryCategory,
        `report:${now.toISOString()}`,
        report,
        `Learning report for period ${periodStart.toISOString()} to ${now.toISOString()}`,
        1.0,
      )

      this.emitEvent('report_generated', report)

      return report
    } catch (err) {

      // Return a minimal report on failure
      return {
        generatedAt: now.toISOString(),
        periodStart: periodStart.toISOString(),
        periodEnd: now.toISOString(),
        summary: 'Learning report generation encountered an error. Partial data available.',
        patternsDetected: 0,
        decisionsRecorded: 0,
        decisionsReviewed: 0,
        performanceChange: 'stable',
        topPatterns: [],
        parameterSuggestions: [],
        insights: ['Report generation failed — check system logs for details.'],
        recommendations: ['Retry report generation after verifying database connectivity.'],
      }
    }
  }

  // ============================================================
  // Transfer Learning
  // ============================================================

  /**
   * Share learned knowledge between robot projects.
   */
  async transferKnowledge(transfer: TransferKnowledge): Promise<{
    transferred: number
    failed: number
  }> {

    let transferred = 0
    let failed = 0

    for (const item of transfer.knowledge) {
      try {
        await this.aiMemory.remember(
          'learning' as AiMemoryCategory,
          `transfer:${transfer.category}:${item.key}`,
          item.value,
          `Transferred from project ${transfer.sourceProjectId}. ${item.context || ''}`,
          item.confidence,
          transfer.targetProjectId,
        )
        transferred++
      } catch {
        failed++
      }
    }

    // Record the transfer as a decision
    await this.recordDecision(
      'self_learn',
      'knowledge_transfer',
      `Transferring ${transfer.category} knowledge from ${transfer.sourceProjectId} to ${transfer.targetProjectId}`,
      `Transfer ${transfer.knowledge.length} items`,
      `Knowledge successfully applied to target project`,
      0.7,
    )

    return { transferred, failed }
  }

  /**
   * Get all learnable knowledge from a project that can be transferred.
   */
  async getProjectKnowledge(
    projectId: string,
    category?: LearningCategory
  ): Promise<Array<{ key: string; value: unknown; confidence: number; context?: string }>> {
    const memories = await this.aiMemory.search('learning' as AiMemoryCategory, category || '', 100)

    return memories.map(m => ({
      key: m.key,
      value: m.value,
      confidence: m.confidence,
      context: m.context || undefined,
    }))
  }

  // ============================================================
  // Event System
  // ============================================================

  /**
   * Subscribe to self-learning events.
   */
  onEvent(callback: SelfLearnEventCallback): () => void {
    this.eventListeners.push(callback)
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback)
    }
  }

  private emitEvent(type: SelfLearnEvent['type'], data?: unknown): void {
    const event: SelfLearnEvent = {
      type,
      timestamp: new Date(),
      data,
    }
    for (const cb of this.eventListeners) {
    }
  }

  // ============================================================
  // Statistical Helpers
  // ============================================================

  private computeStatistics(values: number[]): {
    mean: number
    median: number
    stdDev: number
    min: number
    max: number
    range: number
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, range: 0 }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
    const stdDev = Math.sqrt(variance)

    return {
      mean: Math.round(mean * 1000) / 1000,
      median: Math.round(median * 1000) / 1000,
      stdDev: Math.round(stdDev * 1000) / 1000,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      range: sorted[sorted.length - 1] - sorted[0],
    }
  }

  private detectAnomaly(
    metric: string,
    values: number[],
    stats: ReturnType<typeof this.computeStatistics>
  ): PatternDetection | null {
    // Anomaly: latest value is more than 3 standard deviations from mean
    const latest = values[0]
    const zScore = stats.stdDev > 0 ? Math.abs(latest - stats.mean) / stats.stdDev : 0

    if (zScore > 3) {
      return {
        metric,
        patternType: 'anomaly',
        description: `Anomalous ${metric} value: ${latest.toFixed(2)} is ${zScore.toFixed(1)} standard deviations from mean (${stats.mean.toFixed(2)})`,
        confidence: Math.min(zScore / 5, 1.0),
        dataPoints: values.length,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        severity: zScore > 4 ? 'critical' : 'warning',
        recommendation: `Investigate ${metric} sensor reading. Current value (${latest.toFixed(2)}) is significantly outside normal range.`,
      }
    }

    return null
  }

  private detectTrend(
    metric: string,
    values: number[]
  ): PatternDetection | null {
    if (values.length < 5) return null

    // Simple linear regression to detect trend
    const n = values.length
    const xMean = (n - 1) / 2
    const yMean = values.reduce((a, b) => a + b, 0) / n
    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean)
      denominator += (i - xMean) ** 2
    }

    const slope = denominator !== 0 ? numerator / denominator : 0

    // Only report if slope is significant relative to the mean
    const relativeSlope = yMean !== 0 ? Math.abs(slope / yMean) : Math.abs(slope)

    if (relativeSlope > 0.01) {
      // Slope changes more than 1% of mean per data point
      const direction = slope > 0 ? 'increasing' : 'decreasing'

      return {
        metric,
        patternType: 'trend',
        description: `${metric} shows a consistent ${direction} trend (slope: ${slope.toFixed(4)}/reading)`,
        confidence: Math.min(relativeSlope * 10, 0.95),
        dataPoints: values.length,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        severity: relativeSlope > 0.05 ? 'warning' : 'info',
        recommendation: `Monitor ${metric} trend. If ${direction} trend continues, consider adjusting safety thresholds or operational parameters.`,
      }
    }

    return null
  }

  private detectCyclicPattern(
    metric: string,
    values: number[]
  ): PatternDetection | null {
    if (values.length < 10) return null

    // Simple autocorrelation at lag 2-5 to detect cycles
    const n = values.length
    const mean = values.reduce((a, b) => a + b, 0) / n

    for (let lag = 2; lag <= Math.min(5, Math.floor(n / 3)); lag++) {
      let correlation = 0
      let variance = 0

      for (let i = 0; i < n - lag; i++) {
        correlation += (values[i] - mean) * (values[i + lag] - mean)
        variance += (values[i] - mean) ** 2
      }

      const autocorrelation = variance !== 0 ? correlation / variance : 0

      if (autocorrelation > 0.7) {
        return {
          metric,
          patternType: 'cyclic',
          description: `${metric} exhibits cyclic behavior with period ~${lag} readings (autocorrelation: ${autocorrelation.toFixed(2)})`,
          confidence: autocorrelation,
          dataPoints: values.length,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          severity: 'info',
          recommendation: `Cyclic pattern in ${metric} detected. This could indicate periodic environmental changes or control oscillations.`,
        }
      }
    }

    return null
  }

  private detectThresholdApproach(
    metric: string,
    values: number[]
  ): PatternDetection | null {
    const thresholds = SAFETY_THRESHOLDS[metric as keyof typeof SAFETY_THRESHOLDS]
    if (!thresholds || values.length === 0) return null

    const latest = values[0]
    const warningThreshold = thresholds.warning
    const criticalThreshold = thresholds.critical

    // Check if approaching warning threshold
    const distToWarning = Math.abs(latest - warningThreshold)
    const distToCritical = Math.abs(latest - criticalThreshold)
    const thresholdRange = Math.abs(warningThreshold - criticalThreshold)

    if (thresholdRange > 0 && distToWarning < thresholdRange * 0.2) {
      return {
        metric,
        patternType: 'threshold_approach',
        description: `${metric} (${latest.toFixed(2)}) is approaching the warning threshold (${warningThreshold})`,
        confidence: Math.max(0, 1 - distToWarning / thresholdRange),
        dataPoints: values.length,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        severity: distToCritical < thresholdRange * 0.1 ? 'critical' : 'warning',
        recommendation: `${metric} is near the safety threshold. Consider preemptive action to prevent safety incident.`,
      }
    }

    return null
  }

  // ============================================================
  // Parameter Suggestion Generators
  // ============================================================

  private async generatePIDTuningSuggestion(
    performance: PerformanceMetrics,
    patterns: PatternDetection[]
  ): Promise<AdaptiveParameter | null> {
    // Check for oscillation patterns that suggest PID tuning is needed
    const oscillation = patterns.find(p =>
      p.patternType === 'cyclic' && ['roll', 'pitch', 'yaw'].includes(p.metric)
    )

    if (oscillation) {
      return {
        key: 'pid.roll_p',
        currentValue: 0.1,
        suggestedValue: 0.08,
        confidence: 0.6,
        reason: `Oscillation detected in ${oscillation.metric} — consider reducing P gain to dampen oscillations`,
        category: 'pid',
        lastAdjusted: new Date().toISOString(),
        adjustmentHistory: [],
      }
    }

    return null
  }

  private async generateSafetyParameterSuggestion(
    performance: PerformanceMetrics,
    patterns: PatternDetection[]
  ): Promise<AdaptiveParameter | null> {
    // Check for frequent safety incidents
    if (performance.safetyIncidentCount > 3) {
      const thresholdPattern = patterns.find(p => p.patternType === 'threshold_approach')
      return {
        key: 'mission.max_altitude',
        currentValue: 120,
        suggestedValue: 100,
        confidence: 0.7,
        reason: `${performance.safetyIncidentCount} safety incidents recorded. ${thresholdPattern ? thresholdPattern.description + '.' : ''} Consider lowering max altitude for safer operations.`,
        category: 'safety',
        lastAdjusted: new Date().toISOString(),
        adjustmentHistory: [],
      }
    }

    return null
  }

  private async generatePowerSuggestion(
    performance: PerformanceMetrics,
    patterns: PatternDetection[]
  ): Promise<AdaptiveParameter | null> {
    // Check battery efficiency patterns
    const batteryPattern = patterns.find(p => p.metric === 'battery_voltage')

    if (batteryPattern && batteryPattern.patternType === 'trend') {
      return {
        key: 'mission.default_speed',
        currentValue: 5,
        suggestedValue: 4,
        confidence: 0.5,
        reason: `Battery voltage trend detected. Reducing flight speed can improve battery efficiency and extend mission duration.`,
        category: 'power',
        lastAdjusted: new Date().toISOString(),
        adjustmentHistory: [],
      }
    }

    if (performance.avgBatteryEfficiency < 30) {
      return {
        key: 'mission.default_speed',
        currentValue: 5,
        suggestedValue: 3.5,
        confidence: 0.6,
        reason: `Low average battery efficiency (${performance.avgBatteryEfficiency}%). Reducing speed can significantly improve battery life.`,
        category: 'power',
        lastAdjusted: new Date().toISOString(),
        adjustmentHistory: [],
      }
    }

    return null
  }

  private async generateFlightParameterSuggestion(
    performance: PerformanceMetrics,
    patterns: PatternDetection[]
  ): Promise<AdaptiveParameter | null> {
    if (performance.missionFailed > performance.missionCompleted && performance.missionTotal > 3) {
      return {
        key: 'mission.rth_enabled',
        currentValue: 1,
        suggestedValue: 1,
        confidence: 0.9,
        reason: `High failure rate (${performance.missionFailed}/${performance.missionTotal} missions). Ensure RTH is always enabled and consider adding more conservative failsafe parameters.`,
        category: 'flight',
        lastAdjusted: new Date().toISOString(),
        adjustmentHistory: [],
      }
    }

    return null
  }

  private async generateAISuggestions(
    performance: PerformanceMetrics,
    patterns: PatternDetection[],
    failedDecisions: DecisionRecord[]
  ): Promise<AdaptiveParameter[]> {
    const suggestions: AdaptiveParameter[] = []

    try {
      const zai = await this.getZAI()
      const prompt = `Analyze the following Nanggroe IoT system data and suggest parameter adjustments:

Performance:
- Mission success rate: ${performance.missionSuccessRate}%
- Average flight time: ${performance.avgFlightTime} min
- Battery efficiency: ${performance.avgBatteryEfficiency}%
- Safety incidents: ${performance.safetyIncidentCount}

Patterns detected: ${patterns.map(p => `${p.metric}: ${p.patternType} (${p.description})`).join('; ')}

Failed decisions: ${failedDecisions.map(d => `${d.decisionType}: ${d.action} → ${d.actualOutcome}`).join('; ')}

Respond with JSON array of parameter suggestions:
[{"key": "config.key", "currentValue": number, "suggestedValue": number, "reason": "string", "category": "pid|flight|safety|navigation|power", "confidence": 0-1}]

Only suggest parameters that would genuinely improve safety or performance. Maximum 3 suggestions.`

      const response = await zai.chat.completions.create({
        model: 'default',
        messages: [
          {
            role: 'system',
            content: 'You are a robotics parameter optimization AI. Analyze system data and suggest parameter adjustments. Respond ONLY with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      })

      const content = response.choices?.[0]?.message?.content || ''
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          key: string
          currentValue: number
          suggestedValue: number
          reason: string
          category: 'pid' | 'flight' | 'safety' | 'navigation' | 'power'
          confidence: number
        }>

        for (const item of parsed) {
          suggestions.push({
            key: item.key,
            currentValue: item.currentValue,
            suggestedValue: item.suggestedValue,
            confidence: Math.min(item.confidence || 0.5, 0.95),
            reason: item.reason,
            category: item.category || 'flight',
            lastAdjusted: new Date().toISOString(),
            adjustmentHistory: [],
          })
        }
      }
    } catch (err) {
    }

    return suggestions
  }

  // ============================================================
  // AI-Powered Insights
  // ============================================================

  private async generateAIInsights(
    patterns: PatternDetection[],
    decisions: DecisionRecord[],
    performance: PerformanceMetrics,
    periodHours: number,
  ): Promise<{ insights: string[]; recommendations: string[]; summary: string }> {
    try {
      const zai = await this.getZAI()

      const prompt = `Generate a learning report summary for Nanggroe IoT.

Period: Last ${periodHours} hours

Performance:
- Mission success rate: ${performance.missionSuccessRate}% (${performance.missionCompleted}/${performance.missionTotal})
- Avg flight time: ${performance.avgFlightTime} min
- Battery efficiency: ${performance.avgBatteryEfficiency}%
- Safety incidents: ${performance.safetyIncidentCount}

Detected patterns: ${patterns.length}
${patterns.slice(0, 5).map(p => `- ${p.metric}: ${p.patternType} — ${p.description}`).join('\n')}

Recent decisions: ${decisions.length}
${decisions.filter(d => d.outcomeSuccess !== undefined).slice(0, 5).map(d => `- ${d.agentName}: ${d.decisionType} → ${d.outcomeSuccess ? 'SUCCESS' : 'FAILURE'}`).join('\n')}

Respond with JSON:
{
  "summary": "2-3 sentence executive summary",
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"]
}`

      const response = await zai.chat.completions.create({
        model: 'default',
        messages: [
          {
            role: 'system',
            content: 'You are a learning analytics AI for autonomous robotics. Generate concise, actionable insights. Respond ONLY with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 512,
      })

      const content = response.choices?.[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          summary: string
          insights: string[]
          recommendations: string[]
        }
        return {
          summary: parsed.summary || 'Learning report generated successfully.',
          insights: parsed.insights || [],
          recommendations: parsed.recommendations || [],
        }
      }
    } catch (err) {
    }

    // Fallback: generate basic insights without AI
    return {
      summary: `Learning report: ${patterns.length} patterns detected, ${performance.missionSuccessRate}% mission success rate, ${performance.safetyIncidentCount} safety incidents in the last ${periodHours} hours.`,
      insights: [
        `${patterns.filter(p => p.severity === 'critical').length} critical patterns detected — review immediately.`,
        `Mission success rate is ${performance.missionSuccessRate}%. ${performance.missionSuccessRate > 80 ? 'Good performance.' : 'Needs improvement.'}`,
        `Battery efficiency averages ${performance.avgBatteryEfficiency}%. ${performance.avgBatteryEfficiency > 50 ? 'Healthy battery usage.' : 'Consider reducing power consumption.'}`,
      ],
      recommendations: [
        'Review critical patterns and adjust safety thresholds if needed.',
        'Ensure all failed decisions are reviewed and lessons are incorporated.',
        'Consider running auto-tune on flight parameters based on recent data.',
      ],
    }
  }

  // ============================================================
  // Utility
  // ============================================================

  private categorizeParameter(key: string): AdaptiveParameter['category'] {
    if (key.startsWith('pid.')) return 'pid'
    if (key.startsWith('mission.')) return 'flight'
    if (key.includes('safety') || key.includes('altitude') || key.includes('rth')) return 'safety'
    if (key.includes('nav') || key.includes('gps') || key.includes('waypoint')) return 'navigation'
    if (key.includes('battery') || key.includes('power') || key.includes('speed')) return 'power'
    return 'flight'
  }

  /**
   * Get learning service statistics.
   */
  async getStats(): Promise<{
    patternsCached: number
    decisionsCached: number
    suggestionsCached: number
    performanceCached: boolean
    lastAnalysis: string
    memoryStats: Awaited<ReturnType<AiMemoryService['getStats']>>
  }> {
    return {
      patternsCached: this.patternCache.length,
      decisionsCached: this.decisionCache.size,
      suggestionsCached: this.parameterCache.size,
      performanceCached: this.performanceCache !== null,
      lastAnalysis: this.lastAnalysisTime.toISOString(),
      memoryStats: await this.aiMemory.getStats(),
    }
  }
}

// ============================================================
// Singleton Accessor
// ============================================================

let selfLearnInstance: SelfLearnService | null = null

/**
 * Get the SelfLearnService singleton instance.
 */
export function getSelfLearnService(): SelfLearnService {
  if (!selfLearnInstance) {
    selfLearnInstance = SelfLearnService.getInstance()
  }
  return selfLearnInstance
}
