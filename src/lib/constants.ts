// ============================================================
// NANGGROE OS AI - Constants
// ============================================================

// --- Agent Constants ---
export const AGENT_HERMES = 'hermes' as const
export const AGENT_PICOCLAW = 'picoclaw' as const
export const AGENT_OPERATOR = 'operator' as const
export const AGENT_SYSTEM = 'system' as const

export const AGENT_LABELS: Record<string, string> = {
  hermes: 'Hermes',
  picoclaw: 'PicoClaw',
  operator: 'Operator',
  system: 'System',
}

export const AGENT_DESCRIPTIONS: Record<string, string> = {
  hermes: 'Strategic Planning Agent — mission design, route optimization, high-level decisions',
  picoclaw: 'Tactical Real-Time Agent — safety checks, telemetry monitoring, failsafe execution',
  operator: 'Human Operator — manual commands and overrides',
  system: 'System — automated status messages and internal events',
}

// --- Device Types ---
export const DEVICE_TYPES = [
  'flight_controller',
  'companion_computer',
  'gps',
  'camera',
  'sensor',
  'radio',
  'battery',
  'motor',
  'servo',
  'esc',
] as const

export const DEVICE_TYPE_LABELS: Record<string, string> = {
  flight_controller: 'Flight Controller',
  companion_computer: 'Companion Computer',
  gps: 'GPS Module',
  camera: 'Camera',
  sensor: 'Sensor',
  radio: 'Radio/Telemetry',
  battery: 'Battery',
  motor: 'Motor',
  servo: 'Servo',
  esc: 'ESC',
}

// --- Device Status ---
export const DEVICE_STATUSES = ['unknown', 'detected', 'initialized', 'active', 'error', 'offline'] as const

export const DEVICE_STATUS_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  detected: 'Detected',
  initialized: 'Initialized',
  active: 'Active',
  error: 'Error',
  offline: 'Offline',
}

export const DEVICE_STATUS_COLORS: Record<string, string> = {
  unknown: 'gray',
  detected: 'yellow',
  initialized: 'blue',
  active: 'green',
  error: 'red',
  offline: 'gray',
}

// --- Protocols ---
export const PROTOCOLS = ['usb', 'i2c', 'spi', 'uart', 'gpio', 'can', 'adc'] as const

export const PROTOCOL_LABELS: Record<string, string> = {
  usb: 'USB',
  i2c: 'I²C',
  spi: 'SPI',
  uart: 'UART',
  gpio: 'GPIO',
  can: 'CAN Bus',
  adc: 'ADC',
}

// --- Mission Types ---
export const MISSION_TYPES = ['mapping', 'survey', 'delivery', 'patrol', 'inspection', 'agriculture'] as const

export const MISSION_TYPE_LABELS: Record<string, string> = {
  mapping: 'Aerial Mapping',
  survey: 'Land Survey',
  delivery: 'Delivery',
  patrol: 'Patrol',
  inspection: 'Inspection',
  agriculture: 'Precision Agriculture',
}

// --- Mission Status ---
export const MISSION_STATUSES = ['draft', 'planned', 'active', 'paused', 'completed', 'failed', 'aborted'] as const

export const MISSION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  planned: 'Planned',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  aborted: 'Aborted',
}

export const MISSION_STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  planned: 'blue',
  active: 'green',
  paused: 'yellow',
  completed: 'green',
  failed: 'red',
  aborted: 'red',
}

// --- Alert Levels ---
export const ALERT_LEVELS = ['info', 'warning', 'critical'] as const

export const ALERT_LEVEL_LABELS: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
}

export const ALERT_LEVEL_COLORS: Record<string, string> = {
  info: 'blue',
  warning: 'yellow',
  critical: 'red',
}

// --- Alert Categories ---
export const ALERT_CATEGORIES = ['safety', 'hardware', 'mission', 'system', 'communication'] as const

export const ALERT_CATEGORY_LABELS: Record<string, string> = {
  safety: 'Safety',
  hardware: 'Hardware',
  mission: 'Mission',
  system: 'System',
  communication: 'Communication',
}

// --- Boot Stages ---
export const BOOT_STAGES = [
  'power_on',
  'hardware_detection',
  'hal_initialization',
  'agent_startup',
  'system_ready',
] as const

export const BOOT_STAGE_INFO = {
  power_on: {
    label: 'Power On',
    description: 'System bootstrap and power rail initialization',
    duration: 1500,
  },
  hardware_detection: {
    label: 'Hardware Detection',
    description: 'Scanning USB, I²C, SPI, UART buses for connected devices',
    duration: 3000,
  },
  hal_initialization: {
    label: 'HAL Initialization',
    description: 'Loading Hardware Abstraction Layer adapters for detected devices',
    duration: 2500,
  },
  agent_startup: {
    label: 'Agent Startup',
    description: 'Initializing Hermes (strategic) and PicoClaw (tactical) agents',
    duration: 2000,
  },
  system_ready: {
    label: 'System Ready',
    description: 'All subsystems operational — NANGGROE OS AI ready for commands',
    duration: 1000,
  },
} as const

// --- Telemetry Metrics ---
export const TELEMETRY_METRICS = [
  'battery_voltage',
  'gps_lat',
  'gps_lng',
  'altitude',
  'signal_strength',
  'temperature',
  'humidity',
  'pressure',
  'heading',
  'speed',
  'roll',
  'pitch',
  'yaw',
  'motor_rpm_1',
  'motor_rpm_2',
  'motor_rpm_3',
  'current_draw',
] as const

export const TELEMETRY_UNITS: Record<string, string> = {
  battery_voltage: 'V',
  gps_lat: '°',
  gps_lng: '°',
  altitude: 'm',
  signal_strength: 'dBm',
  temperature: '°C',
  humidity: '%',
  pressure: 'hPa',
  heading: '°',
  speed: 'm/s',
  roll: '°',
  pitch: '°',
  yaw: '°',
  motor_rpm_1: 'RPM',
  motor_rpm_2: 'RPM',
  motor_rpm_3: 'RPM',
  current_draw: 'A',
}

export const TELEMETRY_LABELS: Record<string, string> = {
  battery_voltage: 'Battery Voltage',
  gps_lat: 'GPS Latitude',
  gps_lng: 'GPS Longitude',
  altitude: 'Altitude',
  signal_strength: 'Signal Strength',
  temperature: 'Temperature',
  humidity: 'Humidity',
  pressure: 'Pressure',
  heading: 'Heading',
  speed: 'Speed',
  roll: 'Roll',
  pitch: 'Pitch',
  yaw: 'Yaw',
  motor_rpm_1: 'Motor 1 RPM',
  motor_rpm_2: 'Motor 2 RPM',
  motor_rpm_3: 'Motor 3 RPM',
  current_draw: 'Current Draw',
}

// --- PicoClaw Safety Thresholds ---
export const SAFETY_THRESHOLDS = {
  battery_voltage: {
    warning: 13.2,
    critical: 12.6,
  },
  signal_strength: {
    warning: -70,
    critical: -80,
  },
  altitude: {
    warning: 110,
    critical: 120,
  },
  temperature: {
    warning: 40,
    critical: 50,
  },
  current_draw: {
    warning: 25,
    critical: 30,
  },
  speed: {
    warning: 12,
    critical: 15,
  },
} as const

// --- Default Hardware for Aceh Utara MVP ---
export const DEFAULT_HARDWARE = [
  {
    name: 'Pixhawk 4',
    deviceType: 'flight_controller',
    protocol: 'uart',
    vendorId: '0x26AC',
    productId: '0x0012',
    port: '/dev/ttyAMA0',
    capabilities: JSON.stringify(['mavlink', 'gps', 'imu', 'barometer', 'compass', 'osd']),
    firmware: 'ArduPilot 4.5.7',
  },
  {
    name: 'Raspberry Pi 4B',
    deviceType: 'companion_computer',
    protocol: 'usb',
    vendorId: '0x1D6B',
    productId: '0x0104',
    port: '/dev/ttyS0',
    capabilities: JSON.stringify(['wifi', 'bluetooth', 'gpio', 'camera_interface', 'usb_host']),
    firmware: 'Raspberry Pi OS 64-bit',
  },
  {
    name: 'u-blox NEO-M8N',
    deviceType: 'gps',
    protocol: 'uart',
    vendorId: '0x1546',
    productId: '0x01A7',
    port: '/dev/ttyUSB0',
    capabilities: JSON.stringify(['gps', 'glonass', 'galileo', 'beidou']),
    firmware: '1.00',
  },
  {
    name: 'Raspberry Pi Camera V2',
    deviceType: 'camera',
    protocol: 'gpio',
    port: '/dev/video0',
    capabilities: JSON.stringify(['still_capture', 'video', 'resolution_8mp']),
    firmware: 'IMX219',
  },
  {
    name: 'BME280',
    deviceType: 'sensor',
    protocol: 'i2c',
    address: '0x76',
    capabilities: JSON.stringify(['temperature', 'humidity', 'pressure']),
    firmware: 'BME280',
  },
  {
    name: 'MPU6050',
    deviceType: 'sensor',
    protocol: 'i2c',
    address: '0x68',
    capabilities: JSON.stringify(['accelerometer', 'gyroscope']),
    firmware: 'MPU6050',
  },
  {
    name: 'SiK Telemetry Radio',
    deviceType: 'radio',
    protocol: 'uart',
    port: '/dev/ttyUSB1',
    capabilities: JSON.stringify(['433mhz', 'mavlink', 'range_1km']),
    firmware: 'SiK 2.0',
  },
  {
    name: '4S LiPo 4000mAh',
    deviceType: 'battery',
    protocol: 'adc',
    capabilities: JSON.stringify(['voltage_monitoring', 'current_monitoring', 'cell_count_4']),
    firmware: null,
  },
  {
    name: 'SunnySky V2216',
    deviceType: 'motor',
    protocol: 'esc',
    capabilities: JSON.stringify(['brushless', 'kv900']),
    firmware: null,
  },
  {
    name: 'ESC 30A BLHeli_S',
    deviceType: 'esc',
    protocol: 'pwm',
    capabilities: JSON.stringify(['dshot300', 'blheli_s', '30a']),
    firmware: 'BLHeli_S 16.7',
  },
] as const

// --- Default System Config ---
export const DEFAULT_CONFIG = [
  { key: 'system.name', value: 'NANGGROE OS AI', category: 'general' },
  { key: 'system.version', value: '1.0.0', category: 'general' },
  { key: 'system.mode', value: 'discovery', category: 'general' },
  { key: 'system.region', value: 'Aceh Utara', category: 'general' },
  { key: 'system.home_lat', value: '4.9125', category: 'general' },
  { key: 'system.home_lng', value: '97.1347', category: 'general' },
  { key: 'hardware.auto_detect', value: 'true', category: 'hardware' },
  { key: 'hardware.scan_interval', value: '30', category: 'hardware' },
  { key: 'agent.hermes.enabled', value: 'true', category: 'agent' },
  { key: 'agent.hermes.model', value: 'default', category: 'agent' },
  { key: 'agent.picoclaw.enabled', value: 'true', category: 'agent' },
  { key: 'agent.picoclaw.check_interval', value: '1', category: 'agent' },
  { key: 'mission.max_altitude', value: '120', category: 'mission' },
  { key: 'mission.default_speed', value: '5', category: 'mission' },
  { key: 'mission.rth_enabled', value: 'true', category: 'mission' },
  { key: 'network.offline_mode', value: 'true', category: 'network' },
  { key: 'network.sync_endpoint', value: '', category: 'network' },
] as const

// --- Session Modes ---
export const SESSION_MODES = ['discovery', 'planning', 'build', 'debug', 'optimize'] as const

export const SESSION_MODE_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  planning: 'Planning',
  build: 'Build',
  debug: 'Debug',
  optimize: 'Optimize',
}

// --- Calibration Device Types ---
export const CALIBRATION_TYPES = ['compass', 'accelerometer', 'gyro', 'esc', 'radio'] as const

export const CALIBRATION_TYPE_LABELS: Record<string, string> = {
  compass: 'Compass',
  accelerometer: 'Accelerometer',
  gyro: 'Gyroscope',
  esc: 'ESC',
  radio: 'Radio',
}
