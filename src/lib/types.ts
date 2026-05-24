// ============================================================
// NANGGROE OS AI - TypeScript Type Definitions
// ============================================================

// --- Hardware Types ---
export type DeviceType =
  | 'flight_controller'
  | 'companion_computer'
  | 'gps'
  | 'camera'
  | 'sensor'
  | 'radio'
  | 'battery'
  | 'motor'
  | 'servo'
  | 'esc'

export type Protocol = 'usb' | 'i2c' | 'spi' | 'uart' | 'gpio' | 'can' | 'adc'

export type DeviceStatus = 'unknown' | 'detected' | 'initialized' | 'active' | 'error' | 'offline'

export interface HardwareDeviceSummary {
  id: string
  name: string
  deviceType: DeviceType
  protocol: Protocol
  status: DeviceStatus
  vendorId?: string | null
  productId?: string | null
  port?: string | null
  address?: string | null
  capabilities?: string | null
  firmware?: string | null
  lastSeen: string
  profiles: HardwareProfileSummary[]
}

export interface HardwareProfileSummary {
  id: string
  adapterName: string
  config: string
  isDefault: boolean
}

// --- Telemetry Types ---
export type TelemetryMetric =
  | 'battery_voltage'
  | 'gps_lat'
  | 'gps_lng'
  | 'altitude'
  | 'signal_strength'
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'heading'
  | 'speed'
  | 'roll'
  | 'pitch'
  | 'yaw'
  | 'motor_rpm_1'
  | 'motor_rpm_2'
  | 'motor_rpm_3'
  | 'current_draw'

export type TelemetrySource = 'sensor' | 'simulated' | 'manual'

export interface TelemetryReading {
  id: string
  deviceId?: string | null
  metric: TelemetryMetric
  value: number
  unit?: string | null
  source: TelemetrySource
  timestamp: string
}

export interface TelemetrySnapshot {
  battery_voltage: number
  gps_lat: number
  gps_lng: number
  altitude: number
  signal_strength: number
  temperature: number
  humidity: number
  pressure: number
  heading: number
  speed: number
  roll: number
  pitch: number
  yaw: number
  motor_rpm_1: number
  motor_rpm_2: number
  motor_rpm_3: number
  current_draw: number
}

// --- Mission Types ---
export type MissionType = 'mapping' | 'survey' | 'delivery' | 'patrol' | 'inspection' | 'agriculture'

export type MissionStatus = 'draft' | 'planned' | 'active' | 'paused' | 'completed' | 'failed' | 'aborted'

export interface Waypoint {
  lat: number
  lng: number
  alt: number
  action: WaypointAction
  hoverTime?: number
  speed?: number
}

export type WaypointAction = 'fly' | 'hover' | 'take_photo' | 'land' | 'takeoff' | 'survey_start' | 'survey_end'

export interface MissionSummary {
  id: string
  name: string
  description?: string | null
  type: MissionType
  status: MissionStatus
  prompt?: string | null
  waypoints: Waypoint[]
  altitude: number
  speed: number
  overlapFront: number
  overlapSide: number
  gsd?: number | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface MissionDetail extends MissionSummary {
  parameters?: string | null
  areaPolygon?: string | null
  logs: MissionLogEntry[]
  agentMessages: AgentMessageEntry[]
}

export type MissionLogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'
export type MissionLogSource = 'system' | 'hermes' | 'picoclaw' | 'autopilot' | 'sensor' | 'operator'

export interface MissionLogEntry {
  id: string
  missionId: string
  level: MissionLogLevel
  source: MissionLogSource
  message: string
  data?: string | null
  timestamp: string
}

// --- Agent Types ---
export type AgentName = 'hermes' | 'picoclaw' | 'operator' | 'system'
export type AgentRole = 'command' | 'response' | 'alert' | 'recommendation' | 'status'

export interface AgentMessageEntry {
  id: string
  missionId?: string | null
  agent: AgentName
  role: AgentRole
  content: string
  metadata?: string | null
  timestamp: string
}

export interface SystemContext {
  mode: string
  activeMission?: MissionSummary | null
  deviceCount: number
  activeDeviceCount: number
  latestTelemetry?: TelemetrySnapshot | null
  recentAlerts: AlertEntry[]
  sessionMode: string
}

export interface HermesResponse {
  type: 'mission_plan' | 'recommendation' | 'alert' | 'status' | 'clarification'
  content: string
  data?: Record<string, unknown>
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface PicoClawCheckResult {
  safe: boolean
  alerts: PicoClawAlert[]
  actions: PicoClawAction[]
}

export interface PicoClawAlert {
  level: 'warning' | 'critical'
  metric: string
  message: string
  currentValue: number
  threshold: number
}

export interface PicoClawAction {
  type: 'land' | 'rth' | 'hover' | 'reduce_speed' | 'alert_operator'
  reason: string
}

// --- Alert Types ---
export type AlertLevel = 'info' | 'warning' | 'critical'
export type AlertSource = 'system' | 'picoclaw' | 'hermes' | 'sensor' | 'battery' | 'gps'
export type AlertCategory = 'safety' | 'hardware' | 'mission' | 'system' | 'communication'

export interface AlertEntry {
  id: string
  level: AlertLevel
  source: AlertSource
  title: string
  message: string
  category: AlertCategory
  isRead: boolean
  isResolved: boolean
  timestamp: string
}

// --- Calibration Types ---
export type CalibrationDeviceType = 'compass' | 'accelerometer' | 'gyro' | 'esc' | 'radio'
export type CalibrationStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export interface CalibrationEntry {
  id: string
  deviceType: CalibrationDeviceType
  deviceId?: string | null
  status: CalibrationStatus
  parameters?: string | null
  results?: string | null
  performedAt: string
}

// --- Boot Flow Types ---
export type BootStage = 'power_on' | 'hardware_detection' | 'hal_initialization' | 'agent_startup' | 'system_ready'

export interface BootFlowStatus {
  currentStage: BootStage
  stages: BootStageInfo[]
  isComplete: boolean
  startedAt?: string
  completedAt?: string
}

export interface BootStageInfo {
  stage: BootStage
  label: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  details?: string
}

// --- Session Types ---
export type SessionMode = 'discovery' | 'planning' | 'build' | 'debug' | 'optimize'
export type SessionStatus = 'active' | 'closed' | 'archived'

export interface SessionEntry {
  id: string
  name?: string | null
  mode: SessionMode
  status: SessionStatus
  config?: string | null
  startedAt: string
  endedAt?: string | null
}

// --- API Response Types ---
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number
  page?: number
  limit?: number
}

// --- Config Types ---
export type ConfigCategory = 'general' | 'hardware' | 'agent' | 'mission' | 'network'

export interface SystemConfigEntry {
  id: string
  key: string
  value: string
  category: ConfigCategory
}
