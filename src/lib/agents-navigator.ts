// ============================================================
// NANGGROE IOT - Navigator Agent
// Real-time path planning and obstacle avoidance
// Processes waypoint sequences and adjusts routes dynamically
// ============================================================

import { db } from './db'
import { getLatestTelemetrySnapshot } from './telemetry'
import type {
  AgentInstance,
  AgentState,
  AgentType,
  AgentTask,
  AgentMessage,
  AgentStatus,
} from './agents'
import type { Waypoint, TelemetrySnapshot } from './types'

// --- Navigator-specific types ---

export interface NavigationAdjustment {
  type: 'reroute' | 'speed_adjustment' | 'altitude_change' | 'hover' | 'rth' | 'skip_waypoint'
  reason: string
  data: Record<string, unknown>
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface RoutePlan {
  planId: string
  waypoints: Waypoint[]
  currentWaypointIndex: number
  totalDistance: number
  estimatedTime: number
  adjustments: NavigationAdjustment[]
  status: 'on_track' | 'adjusted' | 'rerouted' | 'rth_active' | 'paused'
}

export interface ObstacleDetection {
  type: 'terrain' | 'weather' | 'signal_dead_zone' | 'geofence' | 'no_fly_zone'
  position: { lat: number; lng: number }
  radius: number // meters
  severity: 'warning' | 'critical'
  description: string
}

export interface NavigatorConfig {
  checkInterval: number // ms between navigation checks (default 3000)
  rerouteThreshold: number // max deviation in meters before rerouting (default 50)
  windSpeedLimit: number // m/s - reroute if wind exceeds this (default 10)
  lowBatteryRthPercent: number // battery % at which to trigger RTH (default 25)
  maxWaypointDistance: number // meters - max distance between waypoints (default 500)
  altitudeMargin: number // meters above obstacle for safe passage (default 20)
}

const DEFAULT_NAVIGATOR_CONFIG: NavigatorConfig = {
  checkInterval: 3000,
  rerouteThreshold: 50,
  windSpeedLimit: 10,
  lowBatteryRthPercent: 25,
  maxWaypointDistance: 500,
  altitudeMargin: 20,
}

// ============================================================
// NavigatorAgent
// ============================================================

export class NavigatorAgent implements AgentInstance {
  name = 'navigator'
  type: AgentType = 'hybrid'
  state: AgentState = 'idle'
  capabilities = [
    'route_planning',
    'waypoint_processing',
    'dynamic_rerouting',
    'obstacle_avoidance',
    'wind_adjustment',
    'battery_aware_navigation',
    'altitude_optimization',
  ]

  private startTime: Date | null = null
  private _tasksCompleted = 0
  private _tasksFailed = 0
  private lastActivity: Date | null = null
  private config: NavigatorConfig
  private navLoop: ReturnType<typeof setInterval> | null = null
  private currentPlan: RoutePlan | null = null
  private messageCallback: ((message: AgentMessage) => void) | null = null

  constructor(config?: Partial<NavigatorConfig>) {
    this.config = { ...DEFAULT_NAVIGATOR_CONFIG, ...config }
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
    this.state = 'idle'
    this.startTime = new Date()
    this.startNavLoop()
  }

  async stop(): Promise<void> {
    this.stopNavLoop()
    this.state = 'idle'
  }

  // --- Navigation loop ---

  private startNavLoop(): void {
    if (this.navLoop) return

    this.navLoop = setInterval(() => {
      this.runNavCheck()
    }, this.config.checkInterval)
  }

  private stopNavLoop(): void {
    if (this.navLoop) {
      clearInterval(this.navLoop)
      this.navLoop = null
    }
  }

  private async runNavCheck(): Promise<void> {
    try {
      // Only act if there's an active navigation plan
      const activePlan = await db.navigationPlan.findFirst({
        where: { status: 'active' },
      })

      if (!activePlan) {
        this.state = 'idle'
        return
      }

      this.state = 'acting'
      this.lastActivity = new Date()

      const telemetry = await getLatestTelemetrySnapshot()
      if (!telemetry) return

      // Check for navigation adjustments
      const adjustments = this.evaluateNavConditions(telemetry, JSON.parse(activePlan.waypoints) as Waypoint[])

      if (adjustments.length > 0) {
        // Notify about adjustments
        if (this.messageCallback) {
          this.messageCallback({
            id: `nav-adjustment-${Date.now()}`,
            from: 'navigator',
            to: '*',
            type: 'alert',
            payload: {
              planId: activePlan.id,
              adjustments,
              telemetry: {
                battery: telemetry.battery_voltage,
                speed: telemetry.speed,
                altitude: telemetry.altitude,
              },
            },
            timestamp: new Date(),
            priority: adjustments.some(a => a.priority === 'critical') ? 'critical' : 'high',
          })
        }

        // Handle critical adjustments (e.g., RTH for low battery)
        const criticalRth = adjustments.find(a => a.type === 'rth' && a.priority === 'critical')
        if (criticalRth) {
          await db.navigationPlan.update({
            where: { id: activePlan.id },
            data: { status: 'aborted' },
          })

          await db.alert.create({
            data: {
              level: 'critical',
              source: 'navigator',
              title: 'Navigation RTH Triggered',
              message: criticalRth.reason,
              category: 'safety',
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

  // --- Evaluate navigation conditions ---

  private evaluateNavConditions(
    telemetry: TelemetrySnapshot,
    _waypoints: Waypoint[]
  ): NavigationAdjustment[] {
    const adjustments: NavigationAdjustment[] = []

    // Battery check — estimate remaining percentage
    const batteryPercent = this.estimateBatteryPercent(telemetry.battery_voltage)
    if (batteryPercent < this.config.lowBatteryRthPercent) {
      adjustments.push({
        type: 'rth',
        reason: `Battery at ~${batteryPercent}% (${telemetry.battery_voltage}V) — below RTH threshold of ${this.config.lowBatteryRthPercent}%`,
        data: { batteryPercent, voltage: telemetry.battery_voltage, threshold: this.config.lowBatteryRthPercent },
        priority: 'critical',
      })
    }

    // Speed check — reduce speed if wind conditions suggest it
    if (telemetry.speed > this.config.windSpeedLimit) {
      adjustments.push({
        type: 'speed_adjustment',
        reason: `Speed at ${telemetry.speed.toFixed(1)}m/s exceeds safe navigation limit of ${this.config.windSpeedLimit}m/s`,
        data: { currentSpeed: telemetry.speed, recommendedSpeed: this.config.windSpeedLimit * 0.8 },
        priority: 'high',
      })
    }

    // Altitude optimization — check if altitude is safe for current terrain
    if (telemetry.altitude > 100) {
      adjustments.push({
        type: 'altitude_change',
        reason: `Altitude at ${telemetry.altitude}m — near regulatory limit, consider reducing`,
        data: { currentAlt: telemetry.altitude, recommendedAlt: 80 },
        priority: 'medium',
      })
    }

    // Signal strength check — reroute if signal is weak
    if (telemetry.signal_strength < -75) {
      adjustments.push({
        type: 'reroute',
        reason: `Signal strength at ${telemetry.signal_strength}dBm — rerouting to stay within radio range`,
        data: { signalStrength: telemetry.signal_strength },
        priority: 'high',
      })
    }

    // Temperature check — reduce speed to lower heat
    if (telemetry.temperature > 45) {
      adjustments.push({
        type: 'speed_adjustment',
        reason: `Temperature at ${telemetry.temperature}°C — reducing speed to cool systems`,
        data: { currentTemp: telemetry.temperature, recommendedSpeedReduction: 0.7 },
        priority: 'medium',
      })
    }

    return adjustments
  }

  // --- Estimate battery percentage from voltage ---

  private estimateBatteryPercent(voltage: number): number {
    // Approximate LiPo 4S discharge curve
    // 16.8V = 100%, 14.8V = ~50%, 13.2V = ~20%, 12.0V = 0%
    const percent = Math.max(0, Math.min(100,
      ((voltage - 12.0) / (16.8 - 12.0)) * 100
    ))
    return Math.round(percent)
  }

  // --- Calculate distance between two coordinates ---

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // --- Process task ---

  async processTask(task: AgentTask): Promise<unknown> {
    this.state = 'thinking'
    this.lastActivity = new Date()
    try {
      const payload = task.payload as {
        action?: string
        planId?: string
        waypoints?: Waypoint[]
        obstacles?: ObstacleDetection[]
      } | null

      switch (payload?.action) {
        case 'evaluate_route': {
          const telemetry = await getLatestTelemetrySnapshot()
          if (!telemetry || !payload.waypoints) {
            throw new Error('Telemetry and waypoints required for route evaluation')
          }
          const adjustments = this.evaluateNavConditions(telemetry, payload.waypoints)
          this.state = 'idle'
          this._tasksCompleted++
          return { adjustments, safeToProceed: adjustments.filter(a => a.priority === 'critical').length === 0 }
        }

        case 'calculate_distance': {
          if (!payload.waypoints || payload.waypoints.length < 2) {
            throw new Error('At least 2 waypoints required for distance calculation')
          }
          let totalDist = 0
          for (let i = 1; i < payload.waypoints.length; i++) {
            const prev = payload.waypoints[i - 1]
            const curr = payload.waypoints[i]
            totalDist += this.calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
          }
          this.state = 'idle'
          this._tasksCompleted++
          return {
            totalDistance: Math.round(totalDist),
            estimatedFlightTime: Math.round(totalDist / 5 / 60), // at 5m/s, in minutes
            waypointCount: payload.waypoints.length,
          }
        }

        case 'check_active_plan': {
          const activePlan = await db.navigationPlan.findFirst({ where: { status: 'active' } })
          if (!activePlan) {
            this.state = 'idle'
            return { active: false }
          }
          const telemetry = await getLatestTelemetrySnapshot()
          const adjustments = telemetry
            ? this.evaluateNavConditions(telemetry, JSON.parse(activePlan.waypoints) as Waypoint[])
            : []
          this.state = 'idle'
          this._tasksCompleted++
          return {
            active: true,
            planId: activePlan.id,
            planName: activePlan.name,
            adjustments,
          }
        }

        default: {
          // Default: check active plan
          const plan = await db.navigationPlan.findFirst({ where: { status: 'active' } })
          this.state = 'idle'
          this._tasksCompleted++
          return { active: !!plan, planId: plan?.id || null }
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
    if (message.type === 'escalation' && message.from === 'sentinel') {
      // Sentinel detected a safety issue — Navigator should consider RTH
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

  getCurrentPlan(): RoutePlan | null {
    return this.currentPlan
  }

  getConfig(): NavigatorConfig {
    return { ...this.config }
  }
}
