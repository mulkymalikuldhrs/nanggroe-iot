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

// --- Robot Template Constants ---
export const ROBOT_CATEGORIES = ['drone', 'rover', 'boat', 'amphibious', 'arm', 'custom'] as const
export const ROBOT_CATEGORY_LABELS: Record<string, string> = {
  drone: 'Drone / UAV',
  rover: 'Rover / UGV',
  boat: 'Boat / USV',
  amphibious: 'Amphibious',
  arm: 'Robotic Arm',
  custom: 'Custom Build',
}

export const ROBOT_CATEGORY_ICONS: Record<string, string> = {
  drone: '🚁',
  rover: '🚗',
  boat: '🚤',
  amphibious: '🦆',
  arm: '🦾',
  custom: '🛠️',
}

export const BUILD_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const
export const BUILD_DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

// --- Pre-built Robot Templates ---
export const BUILTIN_ROBOT_TEMPLATES = [
  {
    name: 'Drone Tricopter 3-Baling (Arduino)',
    description: 'Tricopter drone amfibi dengan 3 baling-baling, Arduino-compatible flight controller, mampu terbang, mengapung di air, dan berjalan di darat. Dilengkapi face tracking, autopilot, GPS return-to-home, dan payload delivery.',
    category: 'amphibious' as const,
    icon: '🚁',
    difficulty: 'intermediate' as const,
    estimatedBuildHours: 16,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Pixhawk 4 / Arduino Mega 2560', protocol: 'uart', required: true, alternatives: ['Pixhawk 6C', 'Cube Orange'], notes: 'Flight controller utama untuk kontrol penerbangan' },
      { deviceType: 'companion_computer', name: 'Raspberry Pi 4B', protocol: 'usb', required: true, alternatives: ['Raspberry Pi 5', 'Jetson Nano'], notes: 'Companion computer untuk AI dan pemrosesan' },
      { deviceType: 'gps', name: 'u-blox NEO-M8N', protocol: 'uart', required: true, alternatives: ['NEO-M9N', 'M10'], notes: 'GPS untuk navigasi dan return-to-home' },
      { deviceType: 'camera', name: 'Raspberry Pi Camera V2 / USB Camera', protocol: 'usb', required: true, alternatives: ['Arducam IMX477', 'ESP32-CAM'], notes: 'Kamera untuk face tracking dan mapping' },
      { deviceType: 'motor', name: 'SunnySky V2216 x3', protocol: 'esc', required: true, alternatives: ['T-Motor MN2214', 'EMax RS2205'], notes: '3 motor brushless untuk tricopter' },
      { deviceType: 'esc', name: 'ESC 30A BLHeli_S x3', protocol: 'pwm', required: true, alternatives: ['DShot600 ESC'], notes: '3 ESC untuk kontrol motor' },
      { deviceType: 'servo', name: 'Servo MG996R (yaw tail)', protocol: 'pwm', required: true, notes: 'Servo untuk yaw pada baling ketiga tricopter' },
      { deviceType: 'battery', name: '4S LiPo 4000mAh', protocol: 'adc', required: true, alternatives: ['4S LiPo 6000mAh'], notes: 'Baterai utama, minimal 4000mAh' },
      { deviceType: 'radio', name: 'SiK Telemetry Radio 433MHz', protocol: 'uart', required: true, notes: 'Radio telemetry untuk koneksi ground station' },
      { deviceType: 'sensor', name: 'BME280', protocol: 'i2c', required: true, notes: 'Sensor suhu, kelembaban, tekanan' },
      { deviceType: 'sensor', name: 'MPU6050', protocol: 'i2c', required: true, notes: 'IMU accelerometer + gyroscope' },
      { deviceType: 'sensor', name: 'HC-SR04 Ultrasonic', protocol: 'gpio', required: false, alternatives: ['TF-Luna LiDAR'], notes: 'Sensor jarak untuk obstacle avoidance dan altimeter' },
    ],
    requiredFirmware: [
      { target: 'pixhawk', version: 'ArduPilot 4.5.7 Tricopter', url: 'firmware/pixhawk/ardupilot-tri-4.5.7.px4' },
      { target: 'companion', version: 'Nanggroe OS 1.2.0', url: 'firmware/companion/nanggroe-os-1.2.0.img' },
      { target: 'esc', version: 'BLHeli_S 16.7', url: 'firmware/esc/blheli_s-16.7.hex' },
      { target: 'radio', version: 'SiK 2.0', url: 'firmware/radio/sik-2.0.hex' },
    ],
    capabilities: [
      'face_tracking', 'autopilot', 'return_to_home', 'obstacle_avoidance',
      'payload_delivery', 'field_mapping', 'aerial_photography',
      'amphibious_float', 'land_drive', 'gps_navigation',
      'voice_control', 'telegram_control', 'android_control',
      'ai_assisted', 'solar_emergency', 'gsm_connectivity',
      'local_llm', 'offline_memory', 'beep_alerts',
    ],
    assemblyGuide: [
      { step: 1, title: 'Siapkan Frame Tricopter', description: 'Rakit frame tricopter dari carbon fiber atau aluminium. Pastikan 3 arm membentuk sudut 120°. Arm belakang untuk servo yaw.', duration: '2 jam', tools: ['Obeng set', 'Allen key'], parts: ['Frame kit', 'Motor mount x3', 'Landing gear'], warnings: ['Pastikan semua sekrup kencang', 'Periksa balance frame'] },
      { step: 2, title: 'Pasang Motor & ESC', description: 'Pasang 3 motor brushless pada arm. Hubungkan ESC ke setiap motor. Pasang servo yaw pada arm belakang.', duration: '1.5 jam', tools: ['Solder', 'Heat shrink'], parts: ['Motor x3', 'ESC x3', 'Servo yaw x1', 'Propeller x3 (2 CW, 1 CCW)'], warnings: ['Perhatikan arah putaran motor', 'Solder semua koneksi ESC'] },
      { step: 3, title: 'Pasang Flight Controller', description: 'Mount Pixhawk/Arduino di tengah frame. Hubungkan ke ESC, servo, GPS, dan radio. Pasang dengan vibration dampening.', duration: '1.5 jam', tools: ['Kabel ties', 'Double-sided tape'], parts: ['Pixhawk 4', 'GPS mast', 'Telemetry radio'], warnings: ['Arah panah Pixhawk harus menghadap depan', 'Gunakan foam mounting untuk anti-vibrasi'] },
      { step: 4, title: 'Pasang Companion Computer', description: 'Mount Raspberry Pi 4B. Hubungkan ke Pixhawk via UART. Pasang kamera ke CSI port.', duration: '1 jam', tools: ['USB cable', 'UART cable'], parts: ['Raspberry Pi 4B', 'MicroSD 32GB', 'Pi Camera V2'], warnings: ['Pastikan UART baud rate sama (921600)', 'Kamera harus terhubung sebelum power on'] },
      { step: 5, title: 'Pasang Sensor & GPS', description: 'Hubungkan BME280 dan MPU6050 ke I2C bus. Pasang GPS pada mast di atas frame. Hubungkan ultrasonic sensor untuk obstacle avoidance.', duration: '1 jam', tools: ['Jumper wires', 'Breadboard/PCB'], parts: ['BME280', 'MPU6050', 'GPS NEO-M8N', 'HC-SR04'], warnings: ['I2C address tidak boleh konflik', 'GPS harus di posisi tertinggi'] },
      { step: 6, title: 'Pasang Sistem Daya', description: 'Hubungkan baterai LiPo ke power distribution board. Pasang solar panel darurat. Hubungkan voltage/current sensor ke Pixhawk.', duration: '1 jam', tools: ['Solder', 'Multimeter'], parts: ['4S LiPo 4000mAh', 'Power distribution board', 'Solar panel 5W', 'XT60 connector'], warnings: ['PERIKSA POLARITAS SEBELUM POWER ON', 'Baterai harus di-charge penuh sebelum test'] },
      { step: 7, title: 'Pasang Sistem Amfibi', description: 'Pasang styrofoam float untuk mengapung di air. Hubungkan servo fin untuk kontrol di air. Pasang roda untuk mode darat.', duration: '1.5 jam', tools: ['Cable ties', 'Waterproof tape'], parts: ['Styrofoam float x2', 'Servo fin x2', 'Wheel x2', 'Wheel motor'], warnings: ['Pastikan semua komponen waterproof', 'Test float di air tenang dulu'] },
      { step: 8, title: 'Pasang Payload & Fitur Tambahan', description: 'Hubungkan servo/relay untuk payload drop mechanism, buzzer untuk alert, dan GSM module untuk komunikasi darurat.', duration: '1 jam', tools: ['Solder', 'Cable ties'], parts: ['Servo MG996R (payload)', 'Buzzer 5V', 'SIM800L GSM module'], warnings: ['Payload drop servo harus di-test di darat dulu', 'GSM module butuh antenna yang benar'] },
      { step: 9, title: 'Flash Firmware', description: 'Flash ArduPilot ke Pixhawk. Flash Nanggroe OS ke Raspberry Pi. Flash BLHeli_S ke ESC. Flash SiK ke radio.', duration: '1 jam', tools: ['USB cable', 'Computer'], parts: ['MicroSD card reader'], warnings: ['Jangan matikan power saat flashing', 'Backup firmware lama jika ada'] },
      { step: 10, title: 'Kalibrasi & Test', description: 'Lakukan kalibrasi compass, accelerometer, gyro, ESC, dan radio. Test motor spin, GPS lock, kamera, dan semua sensor.', duration: '2 jam', tools: ['Computer dengan Mission Planner/QGC'], parts: [], warnings: ['LEPAS PROPELLER saat test motor', 'Kalibrasi compass jauh dari logam'] },
    ],
    wiringDiagram: {
      pixhawk: { uart0: 'Raspberry Pi', uart1: 'GPS NEO-M8N', uart2: 'SiK Radio', i2c: 'BME280 + MPU6050', pwm: 'ESC x3 + Servo Yaw', adc: 'Voltage/Current Sensor' },
      raspberry_pi: { uart: 'Pixhawk', i2c: 'BME280 + MPU6050 (shared)', csi: 'Pi Camera V2', usb: 'GSM Module', gpio: 'Buzzer + Ultrasonic' },
      power: { lipo: 'Power Distribution Board → Pixhawk + ESC + Raspberry Pi', solar: 'Charge Controller → LiPo (emergency)', gsm: 'Separate 3.7V LiPo or buck converter' },
    },
  },
  {
    name: 'Rover Darat 4 Roda',
    description: 'Rover 4 roda untuk survei darat, patroli, dan pengiriman. Dilengkapi kamera, GPS, obstacle avoidance, dan kontrol Android.',
    category: 'rover' as const,
    icon: '🚗',
    difficulty: 'beginner' as const,
    estimatedBuildHours: 10,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Pixhawk 4', protocol: 'uart', required: true, notes: 'Flight controller untuk rover mode' },
      { deviceType: 'companion_computer', name: 'Raspberry Pi 4B', protocol: 'usb', required: true, notes: 'Companion computer' },
      { deviceType: 'gps', name: 'u-blox NEO-M8N', protocol: 'uart', required: true, notes: 'GPS untuk navigasi' },
      { deviceType: 'camera', name: 'USB Camera', protocol: 'usb', required: true, notes: 'Kamera untuk visi' },
      { deviceType: 'motor', name: 'DC Motor + Encoder x4', protocol: 'pwm', required: true, notes: '4 motor DC dengan encoder' },
      { deviceType: 'esc', name: 'Sabertooth 2x32A Motor Driver', protocol: 'uart', required: true, notes: 'Motor driver untuk rover' },
      { deviceType: 'battery', name: '3S LiPo 5000mAh', protocol: 'adc', required: true, notes: 'Baterai rover' },
      { deviceType: 'sensor', name: 'HC-SR04 x3 (front/side)', protocol: 'gpio', required: false, notes: 'Obstacle avoidance' },
    ],
    requiredFirmware: [
      { target: 'pixhawk', version: 'ArduPilot 4.5.7 Rover', url: 'firmware/pixhawk/ardupilot-rover-4.5.7.px4' },
      { target: 'companion', version: 'Nanggroe OS 1.2.0', url: 'firmware/companion/nanggroe-os-1.2.0.img' },
    ],
    capabilities: ['gps_navigation', 'obstacle_avoidance', 'patrol', 'delivery', 'field_mapping', 'android_control', 'ai_assisted', 'beep_alerts'],
    assemblyGuide: [],
    wiringDiagram: {},
  },
  {
    name: 'Kapal Amfibi USV',
    description: 'Kapal permukaan tanpa awak untuk survei sungai, pemetaan pesisir, dan monitoring perairan. Bisa mengapung dan berlayar otomatis.',
    category: 'boat' as const,
    icon: '🚤',
    difficulty: 'intermediate' as const,
    estimatedBuildHours: 14,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Pixhawk 4', protocol: 'uart', required: true, notes: 'FC dalam housing waterproof' },
      { deviceType: 'companion_computer', name: 'Raspberry Pi 4B', protocol: 'usb', required: true, notes: 'Dalam housing waterproof' },
      { deviceType: 'gps', name: 'u-blox NEO-M8N', protocol: 'uart', required: true, notes: 'GPS di atas deck' },
      { deviceType: 'motor', name: 'Brushless Motor + Propeller x2', protocol: 'esc', required: true, notes: 'Dual motor untuk kemudi' },
      { deviceType: 'esc', name: 'ESC 40A x2', protocol: 'pwm', required: true, notes: 'Waterproof ESC' },
      { deviceType: 'battery', name: '4S LiPo 6000mAh', protocol: 'adc', required: true, notes: 'Baterai besar untuk jangka panjang' },
      { deviceType: 'sensor', name: 'Water temperature sensor DS18B20', protocol: 'gpio', required: false, notes: 'Monitoring suhu air' },
    ],
    requiredFirmware: [
      { target: 'pixhawk', version: 'ArduPilot 4.5.7 Boat', url: 'firmware/pixhawk/ardupilot-boat-4.5.7.px4' },
      { target: 'companion', version: 'Nanggroe OS 1.2.0', url: 'firmware/companion/nanggroe-os-1.2.0.img' },
    ],
    capabilities: ['gps_navigation', 'water_survey', 'coastal_mapping', 'amphibious_float', 'solar_charging', 'gsm_connectivity', 'ai_assisted'],
    assemblyGuide: [],
    wiringDiagram: {},
  },
] as const

// --- Communication Channel Constants ---
export const COMM_CHANNEL_TYPES = ['telegram', 'voice', 'android', 'beep', 'gsm', 'radio'] as const
export const COMM_CHANNEL_LABELS: Record<string, string> = {
  telegram: 'Telegram Bot',
  voice: 'Voice / TTS',
  android: 'Android Control',
  beep: 'Beeper / Alert',
  gsm: 'GSM Module',
  radio: 'Radio Telemetry',
}

export const COMM_CHANNEL_ICONS: Record<string, string> = {
  telegram: '📨',
  voice: '🎤',
  android: '📱',
  beep: '🔔',
  gsm: '📡',
  radio: '📻',
}

// --- Navigation Constants ---
export const NAVIGATION_TYPES = ['gps_track', 'autopilot', 'rth', 'field_mapping', 'survey', 'delivery'] as const
export const NAVIGATION_TYPE_LABELS: Record<string, string> = {
  gps_track: 'GPS Tracking',
  autopilot: 'Autopilot',
  rth: 'Return to Home',
  field_mapping: 'Field Mapping',
  survey: 'Survey',
  delivery: 'Delivery',
}

// --- Power Source Constants ---
export const POWER_SOURCE_TYPES = ['battery', 'solar', 'gsm', 'usb'] as const
export const POWER_SOURCE_LABELS: Record<string, string> = {
  battery: 'Battery',
  solar: 'Solar Panel',
  gsm: 'GSM Power',
  usb: 'USB Power',
}

export const DEFAULT_BEEP_PATTERNS = [
  { name: 'startup', pattern: [100, 50, 100, 50, 200], frequency: 2000 },
  { name: 'warning', pattern: [200, 100, 200], frequency: 1500 },
  { name: 'critical', pattern: [500, 200, 500, 200, 500], frequency: 3000 },
  { name: 'success', pattern: [100, 50, 100, 50, 400], frequency: 2500 },
  { name: 'land', pattern: [300, 300, 300], frequency: 1000 },
  { name: 'rth', pattern: [200, 100, 200, 100, 200, 100, 400], frequency: 1800 },
  { name: 'arm', pattern: [100, 50, 200], frequency: 2200 },
  { name: 'disarm', pattern: [200, 50, 100], frequency: 1200 },
] as const

// --- AI Memory Constants ---
export const AI_MEMORY_CATEGORIES = ['conversation', 'decision', 'learning', 'pattern', 'preference'] as const
export const AI_MEMORY_CATEGORY_LABELS: Record<string, string> = {
  conversation: 'Conversation',
  decision: 'Decision',
  learning: 'Learning',
  pattern: 'Pattern',
  preference: 'Preference',
}

// --- Local LLM Constants ---
export const LOCAL_LLM_MODELS = [
  { name: 'TinyLlama 1.1B', size: '700MB', ram: '2GB', description: 'Model kecil untuk Pi 4B, respons cepat', suitable: ['pi4', 'pi5'] },
  { name: 'Phi-2 2.7B', size: '1.8GB', ram: '4GB', description: 'Model menengah, keseimbangan kecepatan & kualitas', suitable: ['pi5', 'jetson'] },
  { name: 'Llama-3.2-1B', size: '800MB', ram: '2GB', description: 'Meta Llama 3.2 compact, multilingual', suitable: ['pi4', 'pi5'] },
  { name: 'Gemma-2-2B', size: '1.4GB', ram: '3GB', description: 'Google Gemma 2, efisien untuk edge', suitable: ['pi4', 'pi5'] },
  { name: 'Qwen2.5-1.5B', size: '1.0GB', ram: '2.5GB', description: 'Alibaba Qwen, bagus untuk multi-bahasa termasuk Indonesian', suitable: ['pi4', 'pi5'] },
] as const

// --- Autopilot Modes ---
export const AUTOPILOT_MODES = ['stabilize', 'alt_hold', 'loiter', 'auto', 'rtl', 'land'] as const
export const AUTOPILOT_MODE_LABELS: Record<string, string> = {
  stabilize: 'Stabilize',
  alt_hold: 'Altitude Hold',
  loiter: 'Loiter (GPS Hold)',
  auto: 'Auto (Waypoint)',
  rtl: 'Return to Launch',
  land: 'Land',
}
