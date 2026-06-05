// ============================================================
// NANGGROE IOT - Constants
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
    description: 'All subsystems operational — NANGGROE IOT ready for commands',
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
  { key: 'system.name', value: 'NANGGROE IOT', category: 'general' },
  { key: 'system.version', value: '2.0.0', category: 'general' },
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
      { target: 'companion', version: 'Nanggroe IoT 1.2.0', url: 'firmware/companion/nanggroe-iot-1.2.0.img' },
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
      { step: 9, title: 'Flash Firmware', description: 'Flash ArduPilot ke Pixhawk. Flash Nanggroe IoT ke Raspberry Pi. Flash BLHeli_S ke ESC. Flash SiK ke radio.', duration: '1 jam', tools: ['USB cable', 'Computer'], parts: ['MicroSD card reader'], warnings: ['Jangan matikan power saat flashing', 'Backup firmware lama jika ada'] },
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
      { target: 'companion', version: 'Nanggroe IoT 1.2.0', url: 'firmware/companion/nanggroe-iot-1.2.0.img' },
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
      { target: 'companion', version: 'Nanggroe IoT 1.2.0', url: 'firmware/companion/nanggroe-iot-1.2.0.img' },
    ],
    capabilities: ['gps_navigation', 'water_survey', 'coastal_mapping', 'amphibious_float', 'solar_charging', 'gsm_connectivity', 'ai_assisted'],
    assemblyGuide: [],
    wiringDiagram: {},
  },
  {
    name: 'Robotic Arm 6-DOF',
    description: 'Lengan robot 6 derajat kebebasan (6-DOF) untuk pick-and-place, perakitan, dan manipulasi presisi. Menggunakan Arduino Mega + PCA9685 servo driver untuk kontrol 6 servo secara simultan. Cocok untuk belajar robotika industri dan otomasi.',
    category: 'arm' as const,
    icon: '🦾',
    difficulty: 'intermediate' as const,
    estimatedBuildHours: 12,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Arduino Mega 2560', protocol: 'usb', required: true, alternatives: ['Arduino Due', 'Teensy 4.1'], notes: 'Mikrokontroler utama untuk kontrol servo dan sensor' },
      { deviceType: 'servo', name: 'MG996R Servo x6', protocol: 'pwm', required: true, alternatives: ['DS3218 20kg', 'FD6325 35kg'], notes: '6 servo untuk base, shoulder, elbow, wrist pitch, wrist roll, dan gripper' },
      { deviceType: 'sensor', name: 'PCA9685 16-Channel PWM/Servo Driver', protocol: 'i2c', required: true, alternatives: ['Adafruit 12-bit PWM Driver'], notes: 'Driver servo I2C untuk mengontrol semua servo tanpa beban pada Arduino' },
      { deviceType: 'sensor', name: 'MPU6050 IMU', protocol: 'i2c', required: false, notes: 'Accelerometer + gyroscope untuk feedback posisi lengan' },
      { deviceType: 'sensor', name: 'Force Sensitive Resistor FSR402 x2', protocol: 'adc', required: false, notes: 'Sensor tekanan pada gripper untuk grip force control' },
      { deviceType: 'camera', name: 'USB Webcam / ESP32-CAM', protocol: 'usb', required: false, alternatives: ['Raspberry Pi Camera V2'], notes: 'Kamera untuk visual pick-and-place dan object detection' },
      { deviceType: 'companion_computer', name: 'Raspberry Pi 4B', protocol: 'usb', required: false, alternatives: ['Raspberry Pi 5', 'Jetson Nano'], notes: 'Companion computer untuk AI vision dan kontrol tingkat tinggi' },
      { deviceType: 'battery', name: '5V 10A Power Supply', protocol: 'adc', required: true, alternatives: ['5V 5A + buck converter dari LiPo'], notes: 'Power supply utama untuk Arduino dan semua servo' },
      { deviceType: 'sensor', name: 'Potentiometer 10K x6', protocol: 'adc', required: false, notes: 'Potensio untuk manual jog control setiap joint' },
    ],
    requiredFirmware: [
      { target: 'arduino', version: 'Nanggroe Arm Controller 1.0.0', url: 'firmware/arduino/arm-controller-1.0.0.ino' },
      { target: 'pca9685', version: 'Adafruit PCA9685 Library 2.2.3', url: 'firmware/lib/adafruit-pca9685-2.2.3.zip' },
      { target: 'companion', version: 'Nanggroe IoT 1.2.0', url: 'firmware/companion/nanggroe-iot-1.2.0.img' },
    ],
    capabilities: [
      'pick_and_place', 'assembly_assist', 'precise_manipulation',
      'object_detection', 'face_tracking', 'grip_force_control',
      'teach_and_repeat', 'android_control', 'ai_assisted',
      'telegram_control', 'voice_control', 'beep_alerts',
    ],
    assemblyGuide: [
      { step: 1, title: 'Siapkan Base dan Turntable', description: 'Rakit base plate yang stabil dari akrilik atau aluminium. Pasang servo pertama (base rotation) di tengah base. Pastikan base cukup berat agar lengan tidak jatuh.', duration: '1.5 jam', tools: ['Obeng set', 'Allen key'], parts: ['Base plate akrilik', 'Servo MG996R #1', 'Bearing turntable', 'Baut + mur M3'], warnings: ['Base harus berat dan stabil', 'Bearing harus sejajar dengan servo'] },
      { step: 2, title: 'Rakit Shoulder Joint', description: 'Pasang servo kedua (shoulder) secara vertikal pada turntable. Hubungkan lengan bawah (lower arm) ke shoulder servo. Gunakan bracket U-shaped untuk koneksi yang kuat.', duration: '1.5 jam', tools: ['Obeng set', 'Tang'], parts: ['Servo MG996R #2', 'U-bracket aluminium', 'Lower arm link', 'Baut M3 + spacer'], warnings: ['Shoulder servo menahan beban terbesar — gunakan servo 20kg jika ada', 'Periksa range of motion sebelum dikencangkan'] },
      { step: 3, title: 'Rakit Elbow dan Wrist', description: 'Pasang servo ketiga (elbow) di ujung lower arm. Hubungkan upper arm ke elbow. Pasang servo keempat (wrist pitch) dan kelima (wrist roll) secara berurutan di ujung upper arm.', duration: '2 jam', tools: ['Obeng set', 'Allen key'], parts: ['Servo MG996R #3 (elbow)', 'Servo MG996R #4 (wrist pitch)', 'Servo MG996R #5 (wrist roll)', 'Upper arm link', 'Wrist bracket'], warnings: ['Wrist servo harus ringan — pertimbangkan micro servo untuk wrist roll', 'Test range of motion setiap joint'] },
      { step: 4, title: 'Pasang Gripper / End Effector', description: 'Pasang servo keenam (gripper) pada ujung wrist. Hubungkan mekanisme gripper (claw atau parallel jaw). Pasang FSR sensor di permukaan gripper untuk grip force feedback.', duration: '1 jam', tools: ['Obeng set', 'Lem akrilik'], parts: ['Servo MG996R #6 (gripper)', 'Gripper mechanism', 'FSR402 x2', 'Kabel jumper'], warnings: ['Gripper jangan terlalu kencang — bisa merusak objek', 'FSR harus rata di permukaan gripper'] },
      { step: 5, title: 'Wiring PCA9685 dan Arduino Mega', description: 'Hubungkan PCA9685 ke Arduino Mega via I2C (SDA pin 20, SCL pin 21). Hubungkan semua servo ke channel PCA9685. Pasang power supply terpisah 5V 10A untuk servo (JANGAN power servo dari Arduino 5V pin).', duration: '1.5 jam', tools: ['Solder', 'Multimeter'], parts: ['PCA9685 board', 'Arduino Mega 2560', 'Power supply 5V 10A', 'Jumper wires', 'Kabel power 18AWG'], warnings: ['JANGAN hubungkan power servo ke Arduino 5V — bisa terbakar', 'GND Arduino dan power supply servo HARUS dihubungkan', 'Periksa I2C address PCA9685 (default 0x40)'] },
      { step: 6, title: 'Pasang Sensor dan Kamera', description: 'Hubungkan MPU6050 ke I2C bus. Pasang potensio ke analog pin A0-A5 untuk manual jog control. Hubungkan ESP32-CAM atau USB webcam untuk object detection.', duration: '1 jam', tools: ['Jumper wires', 'Breadboard'], parts: ['MPU6050', 'Potentiometer 10K x6', 'ESP32-CAM / USB Webcam'], warnings: ['I2C address MPU6050 (0x68) tidak boleh konflik', 'Potensio harus dibatasi range-nya di software'] },
      { step: 7, title: 'Flash Firmware dan Kalibrasi', description: 'Upload firmware Nanggroe Arm Controller ke Arduino Mega. Kalibrasi setiap servo (min/max pulse, center position). Test range of motion dan grip force. Kalibrasi MPU6050.', duration: '2 jam', tools: ['USB cable', 'Computer dengan Arduino IDE'], parts: [], warnings: ['Kalibrasi servo satu per satu dengan perlahan', 'Periksa servo tidak menghantam mechanical stop'] },
      { step: 8, title: 'Integrasi AI dan Companion Computer', description: 'Hubungkan Raspberry Pi ke Arduino Mega via USB serial. Setup OpenCV untuk object detection. Test pick-and-place otomatis dengan kamera.', duration: '1.5 jam', tools: ['USB cable'], parts: ['Raspberry Pi 4B', 'MicroSD 32GB'], warnings: ['Pastikan serial communication stabil', 'Test AI detection accuracy sebelum operasi penuh'] },
    ],
    wiringDiagram: {
      arduino_mega: { i2c_sda: 'PCA9685 SDA (pin 20)', i2c_scl: 'PCA9685 SCL (pin 21)', analog: 'Potentiometer x6 (A0-A5)', usb_serial: 'Raspberry Pi / Computer' },
      pca9685: { ch0: 'Servo Base', ch1: 'Servo Shoulder', ch2: 'Servo Elbow', ch3: 'Servo Wrist Pitch', ch4: 'Servo Wrist Roll', ch5: 'Servo Gripper', vcc: '5V 10A Power Supply (terpisah)', gnd: 'Common GND dengan Arduino' },
      power: { main: '5V 10A Power Supply → PCA9685 V+ (servo power)', arduino: 'USB 5V atau DC jack 7-12V', raspberry_pi: 'USB-C 5V 3A', gnd: 'Semua GND harus terhubung bersama' },
    },
  },
  {
    name: 'Hexapod 6-Kaki',
    description: 'Robot berjalan 6 kaki (hexapod) untuk eksplorasi medan kasar dan tidak rata. 18 servo (3 per kaki: coxa, femur, tibia) dikontrol oleh Arduino Mega + 2x PCA9685. Mampu berjalan, berputar, menaiki tangga, dan beradaptasi dengan kontur tanah.',
    category: 'custom' as const,
    icon: '🕷️',
    difficulty: 'advanced' as const,
    estimatedBuildHours: 24,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Arduino Mega 2560', protocol: 'usb', required: true, alternatives: ['Teensy 4.1', 'Arduino Due'], notes: 'Mikrokontroler utama — butuh banyak pin dan memori untuk 18 servo + kinematik' },
      { deviceType: 'servo', name: 'MG996R Servo x18', protocol: 'pwm', required: true, alternatives: ['DS3218 20kg (untuk coxa/femur)', 'SG90 (untuk tibia ringan)'], notes: '18 servo: 6 coxa, 6 femur, 6 tibia — 3 servo per kaki' },
      { deviceType: 'sensor', name: 'PCA9685 16-Channel Servo Driver x2', protocol: 'i2c', required: true, alternatives: ['Adafruit PCA9685 breakout'], notes: '2 board PCA9685 untuk 18 servo (16 + 2 channel). Set address berbeda (0x40, 0x41).' },
      { deviceType: 'sensor', name: 'MPU6050 IMU', protocol: 'i2c', required: true, notes: 'Accelerometer + gyroscope untuk body orientation dan terrain adaptation' },
      { deviceType: 'sensor', name: 'VL53L0X ToF Distance Sensor x3', protocol: 'i2c', required: false, alternatives: ['HC-SR04 Ultrasonic'], notes: 'Sensor jarak di bawah body untuk terrain mapping dan obstacle avoidance' },
      { deviceType: 'gps', name: 'u-blox NEO-M8N', protocol: 'uart', required: false, notes: 'GPS untuk navigasi outdoor' },
      { deviceType: 'camera', name: 'ESP32-CAM', protocol: 'uart', required: false, alternatives: ['Raspberry Pi Camera + Pi Zero'], notes: 'Kamera untuk visual navigation dan object detection' },
      { deviceType: 'companion_computer', name: 'Raspberry Pi Zero 2W', protocol: 'usb', required: false, alternatives: ['Raspberry Pi 4B'], notes: 'Companion computer untuk AI dan high-level control' },
      { deviceType: 'battery', name: '3S LiPo 3000mAh + 5V 10A Buck Converter', protocol: 'adc', required: true, alternatives: ['2S LiPo 4000mAh + buck converter'], notes: 'Baterai utama dengan buck converter untuk power servo 5V/10A' },
      { deviceType: 'radio', name: 'HC-12 433MHz Long Range', protocol: 'uart', required: false, alternatives: ['nRF24L01+PA+LNA', 'LoRa SX1278'], notes: 'Radio control jarak jauh untuk hexapod' },
    ],
    requiredFirmware: [
      { target: 'arduino', version: 'Nanggroe Hexapod Controller 1.0.0', url: 'firmware/arduino/hexapod-controller-1.0.0.ino' },
      { target: 'pca9685', version: 'Adafruit PCA9685 Library 2.2.3', url: 'firmware/lib/adafruit-pca9685-2.2.3.zip' },
      { target: 'imu', version: 'MPU6050 DMP Firmware 6.1', url: 'firmware/imu/mpu6050-dmp-6.1.hex' },
      { target: 'companion', version: 'Nanggroe IoT 1.2.0', url: 'firmware/companion/nanggroe-iot-1.2.0.img' },
    ],
    capabilities: [
      'terrain_adaptive_walking', 'omnidirectional_movement',
      'stair_climbing', 'obstacle_avoidance', 'gps_navigation',
      'object_detection', 'face_tracking', 'ai_assisted',
      'android_control', 'telegram_control', 'voice_control',
      'beep_alerts', 'gsm_connectivity', 'autonomous_patrol',
    ],
    assemblyGuide: [
      { step: 1, title: 'Rakit Body Frame Hexapod', description: 'Rakit body utama hexagonal dari akrilik 3mm atau aluminium. Tandai posisi 6 kaki (60° terpisah). Pasang mounting bracket untuk setiap coxa servo di sisi body.', duration: '2 jam', tools: ['Obeng set', 'Allen key', 'Bor'], parts: ['Body plate akrilik (atas + bawah)', 'Coxa servo bracket x6', 'Spacer M3 x12', 'Baut + mur M3'], warnings: ['Pastikan body cukup kaku dan ringan', 'Posisi coxa bracket harus simetris 60°'] },
      { step: 2, title: 'Rakit Kaki (Leg Assembly) x6', description: 'Untuk setiap kaki: pasang coxa servo ke bracket body. Hubungkan femur link ke coxa servo horn. Pasang femur servo di ujung femur. Hubungkan tibia link ke femur servo. Pasang tibia servo di ujung tibia.', duration: '6 jam', tools: ['Obeng set', 'Tang', 'Lem epoxy'], parts: ['MG996R servo x18', 'Femur link aluminium x6', 'Tibia link aluminium x6', 'Servo horn x18', 'Baut kecil M2'], warnings: ['Test setiap joint servo sebelum dipasang permanen', 'Femur dan tibia link harus presisi — kesalahan kecil menyebabkan gait terganggu', 'Gunakan servo horn metal jika tersedia'] },
      { step: 3, title: 'Wiring PCA9685 Dual Board', description: 'Pasang 2 board PCA9685. Board pertama address 0x40 (servo kaki 1-3, 9 channel). Board kedua address 0x41 (servo kaki 4-6, 9 channel). Hubungkan I2C bus ke Arduino Mega (SDA pin 20, SCL pin 21). Pasang V+ ke buck converter 5V 10A.', duration: '2 jam', tools: ['Solder', 'Multimeter'], parts: ['PCA9685 x2', 'Buck converter 5V 10A', 'Kabel power 18AWG', 'Jumper wires'], warnings: ['Address PCA9685 kedua HARUS diubah ke 0x41 (solder A0 jumper)', 'Power servo HARUS terpisah dari Arduino', 'GND semua board harus terhubung'] },
      { step: 4, title: 'Pasang IMU dan Sensor Jarak', description: 'Mount MPU6050 di tengah body (sedekat mungkin ke center of gravity). Pasang 3 sensor VL53L0X di bawah body menghadap ke bawah untuk terrain mapping. Hubungkan semua ke I2C bus.', duration: '1.5 jam', tools: ['Double-sided tape', 'Jumper wires'], parts: ['MPU6050', 'VL53L0X x3', 'Kabel jumper'], warnings: ['MPU6050 harus di tengah body untuk akurasi orientation', 'VL53L0X butuh address berbeda — gunakan XSHUT pin untuk multiplex', 'I2C pull-up resistor mungkin diperlukan'] },
      { step: 5, title: 'Pasang Sistem Daya', description: 'Mount LiPo 3S 3000mAh di bawah body. Hubungkan ke buck converter untuk 5V 10A ke servo. Hubungkan ke Arduino via VIN pin. Pasang power switch dan voltage monitor.', duration: '1 jam', tools: ['Solder', 'Multimeter'], parts: ['3S LiPo 3000mAh', 'Buck converter 5V 10A', 'Power switch', 'XT60 connector', 'Capacitor 1000µF'], warnings: ['PERIKSA POLARITAS SEBELUM POWER ON', 'Pasang capacitor 1000µF di output buck converter untuk stabilitas', 'LiPo HARUS diletakkan di center of gravity'] },
      { step: 6, title: 'Pasang Radio dan GPS', description: 'Hubungkan HC-12 radio module ke Serial1 Arduino (pin 18/19). Pasang GPS NEO-M8N pada mast di atas body. Hubungkan ke Serial2 Arduino (pin 16/17).', duration: '1 jam', tools: ['Cable ties', 'Jumper wires'], parts: ['HC-12 module', 'GPS NEO-M8N', 'GPS mast pendek', 'Antenna HC-12'], warnings: ['HC-12 antenna harus tegak lurus untuk range terbaik', 'GPS harus di posisi tertinggi tanpa blocking logam'] },
      { step: 7, title: 'Flash Firmware dan Inverse Kinematics', description: 'Upload firmware Nanggroe Hexapod Controller ke Arduino Mega. Konfigurasi inverse kinematics untuk setiap kaki. Test gait pattern (tripod, wave, ripple). Kalibrasi servo home position.', duration: '3 jam', tools: ['USB cable', 'Computer dengan Arduino IDE'], parts: [], warnings: ['Test servo SATU PER SATU terlebih dahulu', 'Mulai dengan gait tripod (paling stabil)', 'Pastikan inverse kinematics menghasilkan posisi kaki yang benar'] },
      { step: 8, title: 'Test Gait dan Terrain Adaptation', description: 'Test semua gait pattern di permukaan rata. Test terrain adaptation dengan MPU6050 feedback. Test obstacle avoidance dengan VL53L0X. Test GPS navigation outdoor.', duration: '3 jam', tools: ['Obstacle course', 'Tangga kayu'], parts: [], warnings: ['JANGAN test di meja tinggi — hexapod bisa jatuh', 'Mulai speed rendah, naikkan bertahap', 'Monitor suhu servo — 18 servo bisa sangat panas'] },
    ],
    wiringDiagram: {
      arduino_mega: { i2c_sda: 'PCA9685 #1 (0x40) + PCA9685 #2 (0x41) + MPU6050 (0x68) + VL53L0X x3 (0x29)', i2c_scl: 'Shared I2C bus (pin 20/21)', serial1: 'HC-12 Radio (pin 18/19)', serial2: 'GPS NEO-M8N (pin 16/17)', usb: 'Computer / Raspberry Pi' },
      pca9685_board1: { address: '0x40', ch0_ch2: 'Kaki 1 (coxa, femur, tibia)', ch3_ch5: 'Kaki 2 (coxa, femur, tibia)', ch6_ch8: 'Kaki 3 (coxa, femur, tibia)', vcc: '5V 10A Buck Converter' },
      pca9685_board2: { address: '0x41', ch0_ch2: 'Kaki 4 (coxa, femur, tibia)', ch3_ch5: 'Kaki 5 (coxa, femur, tibia)', ch6_ch8: 'Kaki 6 (coxa, femur, tibia)', vcc: '5V 10A Buck Converter (shared)' },
      power: { lipo_3s: '3S LiPo → Buck Converter 5V 10A → PCA9685 V+ (servo power)', arduino: '3S LiPo VIN → Arduino Mega (7-12V)', gnd: 'Semua GND terhubung bersama (common ground)' },
    },
  },
  {
    name: 'Balloon / Blimp UAV',
    description: 'UAV lebih-ringan-dari-udara (lighter-than-air) untuk surveilan indoor dan outdoor. Menggunakan balon helium dengan propeller yang dikontrol servo. Aman, tenang, dan hemat energi. Cocok untuk pemula yang ingin belajar UAV tanpa risiko crash.',
    category: 'drone' as const,
    icon: '🎈',
    difficulty: 'beginner' as const,
    estimatedBuildHours: 6,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Arduino Nano / Pro Mini', protocol: 'usb', required: true, alternatives: ['Arduino Uno', 'ESP32 DevKit'], notes: 'Mikrokontroler ringan untuk kontrol propeller dan sensor' },
      { deviceType: 'motor', name: 'Coreless Motor 8520 x4 (dengan propeller)', protocol: 'pwm', required: true, alternatives: ['Micro DC motor + prop'], notes: '4 motor kecil: 2 thrust (atas-bawah), 2 yaw (kiri-kanan)' },
      { deviceType: 'esc', name: 'Mosfet Module IRF520 x4', protocol: 'pwm', required: true, alternatives: ['L298N Motor Driver'], notes: 'Driver motor untuk kontrol kecepatan propeller' },
      { deviceType: 'servo', name: 'SG90 Micro Servo x2', protocol: 'pwm', required: true, alternatives: ['MG90S'], notes: '2 servo untuk vector thrust (arahkan propeller)' },
      { deviceType: 'sensor', name: 'MPU6050 IMU', protocol: 'i2c', required: true, notes: 'Accelerometer + gyroscope untuk orientasi dan stabilisasi' },
      { deviceType: 'camera', name: 'ESP32-CAM', protocol: 'uart', required: false, alternatives: ['Raspberry Pi Camera + Pi Zero'], notes: 'Kamera ringan untuk surveilan dan face tracking' },
      { deviceType: 'battery', name: '3.7V LiPo 1000mAh', protocol: 'adc', required: true, alternatives: ['3.7V LiPo 1500mAh'], notes: 'Baterai ringan — jangan melebihi 2000mAh agar tidak terlalu berat' },
      { deviceType: 'radio', name: 'HC-12 433MHz atau nRF24L01+', protocol: 'uart', required: true, alternatives: ['LoRa SX1278'], notes: 'Radio kontrol untuk remote operation' },
      { deviceType: 'sensor', name: 'BME280', protocol: 'i2c', required: false, notes: 'Sensor suhu, tekanan, kelembaban untuk altitude estimation' },
    ],
    requiredFirmware: [
      { target: 'arduino', version: 'Nanggroe Blimp Controller 1.0.0', url: 'firmware/arduino/blimp-controller-1.0.0.ino' },
      { target: 'radio', version: 'HC-12 Firmware 1.0', url: 'firmware/radio/hc12-1.0.hex' },
    ],
    capabilities: [
      'surveillance', 'face_tracking', 'gps_navigation',
      'autopilot', 'obstacle_avoidance', 'indoor_flight',
      'quiet_operation', 'ai_assisted', 'android_control',
      'telegram_control', 'beep_alerts',
    ],
    assemblyGuide: [
      { step: 1, title: 'Siapkan Balon Helium', description: 'Pilih balon helium yang cukup besar untuk mengangkat payload (minimal 36-inch atau 90cm diameter). Isi helium dan ukur daya angkat. Tambahkan balon tambahan jika perlu. Pastikan daya angkat melebihi berat payload minimal 50g.', duration: '1 jam', tools: ['Timbangan digital', 'Helium tank'], parts: ['Balon helium 36-inch x2-3', 'Tali nilon', 'Net gondola'], warnings: ['Daya angkat harus melebihi berat total + 50g safety margin', 'Jangan isi balon terlalu penuh — bisa pecah', 'Hindari area dengan banyak angin saat test'] },
      { step: 2, title: 'Rakit Gondola / Payload Basket', description: 'Buat gondola ringan dari styrofoam atau balsa wood. Gondola harus menahan Arduino, motor, servo, dan baterai. Pastikan gondola seimbang (center of gravity di tengah).', duration: '1 jam', tools: ['Cutter', 'Lem styrofoam'], parts: ['Styrofoam sheet 5mm', 'Tali nilon tipis', 'Double-sided tape'], warnings: ['Gondola harus SERING mungkin — setiap gram penting', 'Test keseimbangan sebelum memasang elektronik'] },
      { step: 3, title: 'Pasang Motor dan Servo', description: 'Pasang 2 motor thrust (atas-bawah) di tengah gondola untuk kontrol ketinggian. Pasang 2 motor yaw (kiri-kanan) di samping gondola untuk kontrol arah. Pasang 2 servo untuk vector thrust control.', duration: '1.5 jam', tools: ['Obeng kecil', 'Lem'], parts: ['Coreless motor 8520 x4', 'Propeller x4', 'SG90 servo x2', 'Motor mount styrofoam'], warnings: ['Perhatikan arah putaran propeller — thrust harus konsisten', 'Motor dan servo harus seimbang kiri-kanan'] },
      { step: 4, title: 'Wiring Elektronik', description: 'Hubungkan MPU6050 dan BME280 ke I2C Arduino. Hubungkan motor driver (Mosfet) ke PWM pin Arduino. Hubungkan servo ke PWM pin. Hubungkan HC-12 radio ke Serial. Hubungkan baterai LiPo melalui switch.', duration: '1 jam', tools: ['Solder', 'Multimeter'], parts: ['Arduino Nano', 'Mosfet IRF520 x4', 'MPU6050', 'BME280', 'HC-12', 'Kabel jumper'], warnings: ['Semua koneksi harus ringan — gunakan kabel tipis', 'PERIKSA POLARITAS SEBELUM POWER ON', 'Pasang capacitor 100µF di power motor untuk noise reduction'] },
      { step: 5, title: 'Pasang Kamera (Opsional)', description: 'Mount ESP32-CAM di bagian bawah gondola menghadap ke bawah. Hubungkan ke Arduino via Serial. Pastikan kamera tidak menambah berat berlebihan.', duration: '0.5 jam', tools: ['Lem double-sided tape'], parts: ['ESP32-CAM', 'Antenna WiFi'], warnings: ['ESP32-CAM butuh power terpisah — bisa dari baterai yang sama via regulator', 'Kamera menghadap ke bawah untuk surveilan optimal'] },
      { step: 6, title: 'Flash Firmware dan Kalibrasi', description: 'Upload firmware Nanggroe Blimp Controller ke Arduino Nano. Kalibrasi MPU6050. Test motor spin dan servo range. Test neutral buoyancy (balon melayang di tempat tanpa naik/turun).', duration: '1 jam', tools: ['USB cable', 'Computer dengan Arduino IDE'], parts: [], warnings: ['Neutral buoyancy adalah KUNCI — kalibrasi dengan menambah/mengurangi bobot', 'Test motor di dalam ruangan dulu tanpa balon', 'JANGAN terbang di luar jika angin > 5 km/jam'] },
    ],
    wiringDiagram: {
      arduino_nano: { i2c: 'MPU6050 (0x68) + BME280 (0x76)', pwm: 'Mosfet x4 (motor thrust + yaw) + Servo x2', serial: 'HC-12 Radio', vin: '3.7V LiPo via switch' },
      motors: { thrust_up: 'Mosfet D3 → Motor 1 (prop atas)', thrust_down: 'Mosfet D5 → Motor 2 (prop bawah)', yaw_left: 'Mosfet D6 → Motor 3 (prop kiri)', yaw_right: 'Mosfet D9 → Motor 4 (prop kanan)' },
      servos: { vector_pitch: 'Servo D10 (arahkan thrust)', vector_yaw: 'Servo D11 (arahkan yaw motor)' },
      power: { lipo: '3.7V LiPo 1000mAh → Switch → Arduino VIN + Mosfet VCC', camera: 'ESP32-CAM via AMS1117 3.3V regulator dari LiPo' },
    },
  },
  {
    name: 'Arduino Custom Project',
    description: 'Template generik untuk proyek Arduino apapun. Cukup dengan Arduino + kabel USB, bisa dikembangkan menjadi apa saja — sensor station, smart home, weather monitoring, robot sederhana, atau IoT device. Mendukung semua tipe sensor dan aktuator.',
    category: 'custom' as const,
    icon: '🛠️',
    difficulty: 'beginner' as const,
    estimatedBuildHours: 2,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Arduino Uno / Nano / Mega', protocol: 'usb', required: true, alternatives: ['Arduino Pro Mini', 'ESP32 DevKit', 'ESP8266 NodeMCU', 'Teensy 4.0'], notes: 'Mikrokontroler utama — pilih sesuai kebutuhan proyek' },
      { deviceType: 'battery', name: 'USB Power / 9V Battery / LiPo', protocol: 'adc', required: true, alternatives: ['Power adapter 9V', '18650 Li-ion + holder', 'Solar panel + charge controller'], notes: 'Sumber daya — minimal USB untuk development' },
    ],
    requiredFirmware: [
      { target: 'arduino', version: 'Nanggroe Custom Project Template 1.0.0', url: 'firmware/arduino/custom-template-1.0.0.ino' },
    ],
    capabilities: [
      'sensor_integration', 'serial_communication', 'gpio_control',
      'i2c_devices', 'spi_devices', 'pwm_output',
      'analog_input', 'ai_assisted', 'android_control',
      'telegram_control', 'voice_control', 'beep_alerts',
    ],
    assemblyGuide: [
      { step: 1, title: 'Pilih Board Arduino', description: 'Tentukan board Arduino yang sesuai dengan proyek. Arduino Uno untuk pemula, Nano untuk proyek kompak, Mega untuk proyek dengan banyak pin, ESP32 untuk WiFi/Bluetooth.', duration: '0.5 jam', tools: [], parts: ['Arduino board pilihan'], warnings: ['Periksa kebutuhan pin dan memori sebelum memilih board', 'ESP32 butuh 3.3V logic — berbeda dari Uno/Mega (5V)'] },
      { step: 2, title: 'Setup Breadboard', description: 'Siapkan breadboard untuk prototyping. Pasang Arduino di breadboard. Hubungkan power rail (+5V dan GND). Tambahkan komponen dasar sesuai kebutuhan proyek.', duration: '0.5 jam', tools: [], parts: ['Breadboard full-size', 'Jumper wire kit', 'LED + resistor 220Ω (untuk test)'], warnings: ['Periksa koneksi power sebelum menyalakan', 'Jangan hubungkan beban besar langsung ke pin Arduino'] },
      { step: 3, title: 'Hubungkan Sensor', description: 'Pasang sensor sesuai kebutuhan proyek. Sensor I2C (SDA/SCL), SPI (MOSI/MISO/SCK/CS), UART (RX/TX), atau analog (A0-A5). Gunakan pull-up resistor untuk I2C jika diperlukan.', duration: '0.5 jam', tools: ['Multimeter'], parts: ['Sensor sesuai kebutuhan', 'Resistor pull-up 4.7KΩ (untuk I2C)', 'Kabel jumper'], warnings: ['Periksa voltage level sensor (3.3V vs 5V)', 'I2C address tidak boleh konflik antar sensor'] },
      { step: 4, title: 'Hubungkan Aktuator', description: 'Pasang aktuator: LED, relay, servo, motor DC, buzzer, atau display. Gunakan driver yang sesuai (transistor, relay module, L298N, dll). Jangan drive beban besar langsung dari pin Arduino.', duration: '0.5 jam', tools: ['Solder (opsional)'], parts: ['Aktuator sesuai kebutuhan', 'Driver/relay module', 'Resistor dan komponen pendukung'], warnings: ['JANGAN hubungkan motor langsung ke pin Arduino — gunakan driver', 'Perhatikan arus maksimum pin (20mA per pin, 200mA total)'] },
      { step: 5, title: 'Upload Code Awal', description: 'Buka Arduino IDE, pilih board dan port yang benar. Upload kode test awal (blink LED, baca sensor, atau program dasar). Verifikasi komunikasi serial berjalan.', duration: '0.5 jam', tools: ['USB cable', 'Computer dengan Arduino IDE'], parts: [], warnings: ['Pilih board dan port yang benar di Arduino IDE', 'Jika upload gagal, periksa koneksi USB dan driver'] },
      { step: 6, title: 'Iterasi dan Kembangkan', description: 'Kembangkan proyek secara bertahap. Tambahkan fitur satu per satu. Test setiap penambahan. Dokumentasikan wiring dan kode. Pindah dari breadboard ke PCB/perfboard saat stabil.', duration: 'Bervariasi', tools: ['Solder (untuk perfboard)', 'Multimeter'], parts: ['Perfboard/PCB', 'Header pin', 'Enclosure (opsional)'], warnings: ['Test setiap fitur sebelum menambah fitur baru', 'Backup kode secara berkala', 'Pindah ke perfboard hanya setelah prototipe stabil'] },
    ],
    wiringDiagram: {
      arduino: { digital_pins: 'LED, relay, servo, buzzer, SPI CS', analog_pins: 'Sensor analog, potensio, LDR, thermistor', i2c: 'SDA (A4) / SCL (A5) — sensor I2C, display OLED/LCD', spi: 'MOSI (D11) / MISO (D12) / SCK (D13) / CS — SD card, RFID, radio', serial: 'RX (D0) / TX (D1) — komunikasi serial, GPS, radio, ESP32-CAM' },
      power: { usb: 'USB 5V — untuk development dan proyek ringan', battery: '9V battery / LiPo via VIN — untuk portabel', external: 'Power adapter 7-12V via DC jack — untuk proyek stasioner' },
    },
  },
  {
    name: 'Underwater ROV',
    description: 'Remotely Operated Vehicle bawah air dengan housing waterproof, thruster, depth sensor, dan kamera. Untuk inspeksi bawah air, eksplorasi laut, monitoring terumbu karang, dan pencarian bawah air. Dilengkapi petunjuk pembuatan housing waterproof.',
    category: 'boat' as const,
    icon: '🤿',
    difficulty: 'advanced' as const,
    estimatedBuildHours: 28,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Arduino Mega 2560', protocol: 'usb', required: true, alternatives: ['Pixhawk 4 (ROV mode)', 'Teensy 4.1'], notes: 'Mikrokontroler utama dalam housing waterproof' },
      { deviceType: 'companion_computer', name: 'Raspberry Pi 4B', protocol: 'usb', required: true, alternatives: ['Raspberry Pi 5', 'Jetson Nano'], notes: 'Companion computer untuk video streaming dan AI — dalam housing waterproof' },
      { deviceType: 'motor', name: 'T200 Thruster (BlueROX) x4-6', protocol: 'esc', required: true, alternatives: ['DIY thruster dari motor brushless + propeller dalam housing'], notes: '4 thruster untuk 4-DOF (surge, sway, heave, yaw) atau 6 untuk 6-DOF' },
      { deviceType: 'esc', name: 'ESC 30A Basic x4-6', protocol: 'pwm', required: true, alternatives: ['BlueROX Basic ESC'], notes: 'ESC untuk thruster — harus waterproof atau dalam housing' },
      { deviceType: 'camera', name: 'USB Camera dalam Housing Waterproof', protocol: 'usb', required: true, alternatives: ['Raspberry Pi Camera + flat lens port', 'GoPro + HDMI capture'], notes: 'Kamera bawah air dengan lensa flat port untuk minimal distortion' },
      { deviceType: 'sensor', name: 'MS5837 Depth/Pressure Sensor', protocol: 'i2c', required: true, alternatives: ['BME280 dalam housing (kurang akurat)'], notes: 'Sensor kedalaman dan tekanan air untuk depth hold dan altimeter bawah air' },
      { deviceType: 'sensor', name: 'IMU BNO055', protocol: 'i2c', required: true, alternatives: ['MPU6050 + kalibrasi manual'], notes: '9-DOF IMU untuk orientasi ROV — BNO055 ada fusion built-in' },
      { deviceType: 'battery', name: '4S LiPo 10000mAh (dalam housing)', protocol: 'adc', required: true, alternatives: ['2x 4S 5000mAh parallel', 'Power dari permukaan via tether'], notes: 'Baterai besar dalam housing waterproof — atau power via tether dari permukaan' },
      { deviceType: 'radio', name: 'Tether Cable Ethernet + Power (50m)', protocol: 'uart', required: true, alternatives: ['Tether twist pair + Fathom-X'], notes: 'Kabel tether untuk komunikasi dan power dari permukaan' },
      { deviceType: 'sensor', name: 'Water Temperature DS18B20 (waterproof)', protocol: 'gpio', required: false, notes: 'Sensor suhu air waterproof' },
      { deviceType: 'servo', name: 'Waterproof Servo x2 (camera tilt + gripper)', protocol: 'pwm', required: false, alternatives: ['Servo biasa + silicone seal'], notes: 'Servo waterproof untuk kamera tilt dan gripper' },
    ],
    requiredFirmware: [
      { target: 'arduino', version: 'Nanggroe ROV Controller 1.0.0', url: 'firmware/arduino/rov-controller-1.0.0.ino' },
      { target: 'companion', version: 'Nanggroe IoT 1.2.0', url: 'firmware/companion/nanggroe-iot-1.2.0.img' },
      { target: 'imu', version: 'BNO055 Firmware 3.11', url: 'firmware/imu/bno055-3.11.hex' },
      { target: 'depth', version: 'MS5837 Library 2.0.1', url: 'firmware/lib/ms5837-2.0.1.zip' },
    ],
    capabilities: [
      'underwater_inspection', 'depth_hold', 'underwater_camera',
      'gripper_control', 'obstacle_avoidance', 'terrain_mapping',
      'water_temperature', 'object_detection', 'ai_assisted',
      'android_control', 'telegram_control', 'tether_communication',
      'beep_alerts', 'waterproof_housing',
    ],
    assemblyGuide: [
      { step: 1, title: 'Buat Housing Waterproof Utama', description: 'Buat tabung housing dari PVC pipe (4-inch diameter) dengan end cap di kedua sisi. Pasang cable penetrator (penetrator buatan sendiri dari epoxy + kabel). Test kekedapan dengan tekanan air sebelum memasang elektronik.', duration: '4 jam', tools: ['Bor', 'Epoxy marine grade', 'Gasket silicone'], parts: ['PVC pipe 4-inch x 30cm', 'PVC end cap x2', 'Cable penetrator x6', 'O-ring', 'Epoxy marine grade'], warnings: ['Test kekedapan housing SEBELUM memasang elektronik mahal', 'Gunakan O-ring dan silicone grease pada semua sambungan', 'Test tekanan bertahap — mulai dari 1m kedalaman'] },
      { step: 2, title: 'Rakit Frame ROV', description: 'Rakit frame dari aluminium extrusion atau PVC. Desain frame untuk menahan housing utama, thruster, dan ballast. Pastikan center of buoyancy di atas center of gravity (self-righting).', duration: '3 jam', tools: ['Obeng set', 'Allen key', 'Penggaris'], parts: ['Aluminium extrusion 2020 / PVC pipe', 'Bracket sudut', 'Mounting plate', 'Zip tie stainless steel'], warnings: ['Frame harus ringan tapi kuat', 'Center of buoyancy HARUS di atas center of gravity', 'Test float di air tenang — ROV harus miring kembali ke posisi normal'] },
      { step: 3, title: 'Pasang Thruster', description: 'Mount 4-6 thruster pada frame. Konfigurasi 4-DOF: 2 thruster horizontal (surge), 2 thruster vertikal (heave), atau 4 vectored + 2 vertical untuk 6-DOF. Pasang propeller guard untuk keselamatan.', duration: '3 jam', tools: ['Obeng set', 'Allen key'], parts: ['T200 Thruster x4-6', 'Thruster mount', 'Propeller guard', 'Baut stainless M3'], warnings: ['Perhatikan arah thrust setiap thruster — konfigurasi harus benar', 'Thruster harus seimbang kiri-kanan', 'Gunakan propeller guard — thruster bisa berbahaya'] },
      { step: 4, title: 'Pasang Elektronik dalam Housing', description: 'Mount Arduino Mega, Raspberry Pi 4B, dan ESC di dalam housing. Pasang MS5837 depth sensor menembus housing wall. Pasang BNO055 IMU di tengah housing. Pasang voltage regulator dan power distribution.', duration: '3 jam', tools: ['Obeng kecil', 'Double-sided tape', 'Kabel ties'], parts: ['Arduino Mega 2560', 'Raspberry Pi 4B', 'ESC x4-6', 'MS5837', 'BNO055', 'Voltage regulator 5V 5A', 'Power distribution board'], warnings: ['Semua elektronik harus kering saat dipasang', 'Gunakan desiccant packet dalam housing', 'Kabel harus rapi dan tidak mengganggu akses'] },
      { step: 5, title: 'Pasang Kamera dan Servo', description: 'Mount kamera USB di depan housing di belakang flat acrylic viewport. Pasang waterproof servo untuk camera tilt. Pasang gripper servo jika ada. Hubungkan ke Raspberry Pi.', duration: '2 jam', tools: ['Obeng kecil', 'Silicone sealant'], parts: ['USB Camera', 'Flat acrylic viewport 5mm', 'Waterproof servo x2', 'Gripper mechanism', 'Silicone sealant'], warnings: ['Viewport harus benar-benar datar untuk menghindari distortion', 'Seal semua penetrator dengan silicone', 'Test kamera sebelum menutup housing'] },
      { step: 6, title: 'Pasang Tether dan Ballast', description: 'Hubungkan tether cable (ethernet + power) ke housing via penetrator. Pasang ballast weight untuk neutral buoyancy. Pasang float foam di atas frame untuk positive buoyancy darurat.', duration: '2 jam', tools: ['Timbangan', 'Cable ties'], parts: ['Tether cable 50m', 'Ballast lead weight', 'Closed-cell foam float', 'Cable penetrator'], warnings: ['ROV harus slightly positive buoyancy — akan naik ke permukaan jika power hilang', 'Ballast harus mudah disesuaikan', 'Tether harus di-secure di frame agar tidak menarik connector'] },
      { step: 7, title: 'Flash Firmware dan Test Darat', description: 'Upload firmware Nanggroe ROV Controller ke Arduino Mega. Test semua thruster spin. Test servo kamera dan gripper. Test depth sensor di udara. Test IMU. Test video streaming dari Raspberry Pi.', duration: '3 jam', tools: ['USB cable', 'Computer'], parts: [], warnings: ['LEPAS PROPELLER saat test thruster di darat', 'Test semua sistem secara individual sebelum integrasi', 'Verifikasi video streaming berjalan lancar'] },
      { step: 8, title: 'Test Air dan Kalibrasi', description: 'Test ROV di kolam atau air tenang. Test neutral buoyancy. Test depth hold. Test semua thruster di bawah air. Test kamera dan video streaming. Test gripper. Kalibrasi depth sensor.', duration: '4 jam', tools: ['Kolam atau perairan tenang', 'Tali pengaman'], parts: [], warnings: ['JANGAN test sendirian — selalu ada partner di permukaan', 'Mulai di air dangkal (1-2m)', 'Monitor suhu housing — elektronik bisa overheat dalam housing tertutup', 'Siapkan rencana darurat jika ROV tidak naik ke permukaan'] },
    ],
    wiringDiagram: {
      arduino_mega: { i2c: 'BNO055 (0x28/0x29) + MS5837 (0x76)', pwm: 'ESC x4-6 + Waterproof Servo x2', serial1: 'Raspberry Pi UART', serial2: 'Tether Fathom-X interface', analog: 'Voltage/current sensor + DS18B20' },
      raspberry_pi: { usb: 'USB Camera', ethernet: 'Tether cable → Surface computer', i2c: 'Shared dengan Arduino (sensor BME280 optional)', gpio: 'LED indicator + buzzer' },
      power: { tether: 'Surface 12V PSU → Tether → ROV voltage regulator → Arduino + Pi + ESC', battery: '4S LiPo 10000mAh (backup/emergency) → Voltage regulator → electronics', esc: '12V direct from tether/battery → ESC → Thrusters' },
      housing: { penetrators: '6x cable penetrator (tether, camera, depth sensor, thruster cables x2, spare)', viewport: 'Front flat acrylic 5mm for camera', seals: 'O-ring + silicone grease pada semua sambungan' },
    },
  },
  {
    name: 'Agri-Sprayer Drone',
    description: 'Drone pertanian untuk penyemprotan pestisida, penyebaran benih, dan distribusi pupuk. Dilengkapi tanki sprayer, pump, nozzle, dan sistem navigasi GPS untuk coverage merata di lahan pertanian. Mendukung RTK GPS untuk presisi tinggi.',
    category: 'drone' as const,
    icon: '🌾',
    difficulty: 'intermediate' as const,
    estimatedBuildHours: 18,
    isOfficial: true,
    requiredHardware: [
      { deviceType: 'flight_controller', name: 'Pixhawk 4', protocol: 'uart', required: true, alternatives: ['Cube Orange', 'Pixhawk 6C'], notes: 'Flight controller utama dengan ArduPilot Copter firmware' },
      { deviceType: 'companion_computer', name: 'Raspberry Pi 4B', protocol: 'usb', required: true, alternatives: ['Raspberry Pi 5'], notes: 'Companion computer untuk sprayer control, AI, dan mapping' },
      { deviceType: 'gps', name: 'u-blox NEO-M8N + RTK Fix', protocol: 'uart', required: true, alternatives: ['ZED-F9P RTK GPS (high precision)', 'NEO-M9N'], notes: 'GPS untuk navigasi dan spraying pattern — RTK untuk presisi cm-level' },
      { deviceType: 'camera', name: 'Raspberry Pi Camera V2 / Multispectral Camera', protocol: 'usb', required: true, alternatives: ['Senterra Multispectral', 'DJI P1'], notes: 'Kamera untuk crop monitoring dan NDVI mapping' },
      { deviceType: 'motor', name: 'Brushless Motor 6S x6 (Hexacopter)', protocol: 'esc', required: true, alternatives: ['Motor 6S x8 (Octocopter untuk payload lebih)'], notes: '6 motor brushless besar untuk mengangkat tanki + cairan' },
      { deviceType: 'esc', name: 'ESC 40A BLHeli_S x6', protocol: 'pwm', required: true, alternatives: ['ESC 60A untuk motor lebih besar'], notes: '6 ESC untuk hexacopter — harus support 6S voltage' },
      { deviceType: 'battery', name: '6S LiPo 12000mAh', protocol: 'adc', required: true, alternatives: ['2x 6S 6000mAh parallel', 'Li-ion 21700 pack'], notes: 'Baterai besar untuk flight time + sprayer pump' },
      { deviceType: 'servo', name: 'Servo MG996R x2 (pump valve + nozzle angle)', protocol: 'pwm', required: true, notes: 'Servo untuk kontrol valve sprayer dan angle nozzle' },
      { deviceType: 'sensor', name: 'Flow Meter Sensor YF-S201', protocol: 'gpio', required: true, alternatives: ['Flow meter digital lain'], notes: 'Flow meter untuk mengukur volume cairan yang disemprotkan' },
      { deviceType: 'sensor', name: 'MPU6050 IMU', protocol: 'i2c', required: true, notes: 'IMU untuk stabilisasi dan level flight saat spraying' },
      { deviceType: 'sensor', name: 'BME280', protocol: 'i2c', required: false, notes: 'Sensor cuaca untuk kondisi penyemprotan optimal (angin, suhu, kelembaban)' },
      { deviceType: 'radio', name: 'SiK Telemetry Radio 433MHz', protocol: 'uart', required: true, notes: 'Radio telemetry untuk koneksi ground station' },
    ],
    requiredFirmware: [
      { target: 'pixhawk', version: 'ArduPilot 4.5.7 Copter (Hexa)', url: 'firmware/pixhawk/ardupilot-hexa-4.5.7.px4' },
      { target: 'companion', version: 'Nanggroe IoT 1.2.0', url: 'firmware/companion/nanggroe-iot-1.2.0.img' },
      { target: 'esc', version: 'BLHeli_S 16.7', url: 'firmware/esc/blheli_s-16.7.hex' },
      { target: 'radio', version: 'SiK 2.0', url: 'firmware/radio/sik-2.0.hex' },
    ],
    capabilities: [
      'crop_spraying', 'seed_dropping', 'fertilizer_distribution',
      'field_mapping', 'ndvi_imaging', 'gps_navigation', 'autopilot',
      'return_to_home', 'obstacle_avoidance', 'rtk_positioning',
      'flow_meter', 'weather_monitoring', 'ai_assisted',
      'android_control', 'telegram_control', 'voice_control',
      'beep_alerts', 'solar_emergency', 'gsm_connectivity',
      'coverage_tracking', 'payload_delivery',
    ],
    assemblyGuide: [
      { step: 1, title: 'Rakit Frame Hexacopter', description: 'Rakit frame hexacopter dari carbon fiber (X-config). Pasang 6 arm pada center plate. Frame harus kuat untuk menahan tanki sprayer + cairan (total bisa 5-10kg).', duration: '3 jam', tools: ['Obeng set', 'Allen key'], parts: ['Frame hexacopter carbon fiber', 'Motor mount x6', 'Landing gear tinggi (untuk tanki)', 'Center plate atas + bawah'], warnings: ['Frame HARUS kuat — payload bisa 5-10kg', 'Landing gear harus cukup tinggi untuk tanki di bawah', 'Periksa semua baut sebelum terbang'] },
      { step: 2, title: 'Pasang Motor dan ESC', description: 'Pasang 6 motor brushless pada arm. Hubungkan ESC ke setiap motor. Pastikan arah putaran benar (CW dan CCW bergantian untuk hexacopter X-config). Pasang propeller.', duration: '2 jam', tools: ['Solder', 'Heat shrink', 'Prop balancer'], parts: ['Motor 6S x6', 'ESC 40A x6', 'Propeller x6 (3 CW, 3 CCW)'], warnings: ['Balance semua propeller sebelum dipasang', 'Perhatikan rotasi motor — CW dan CCW harus bergantian', 'Solder semua koneksi ESC dengan benar'] },
      { step: 3, title: 'Pasang Flight Controller dan GPS', description: 'Mount Pixhawk di tengah frame dengan vibration dampening. Hubungkan ESC ke output channel. Pasang GPS + compass mast di atas frame. Hubungkan GPS ke Pixhawk UART.', duration: '2 jam', tools: ['Double-sided tape foam', 'Cable ties'], parts: ['Pixhawk 4', 'GPS + Compass mast', 'Telemetry radio', 'Foam mounting'], warnings: ['Arah panah Pixhawk harus menghadap depan', 'GPS harus di posisi tertinggi, jauh dari ESC dan motor', 'Compass calibration jauh dari logam'] },
      { step: 4, title: 'Pasang Tanki Sprayer dan Pump', description: 'Mount tanki sprayer (1-5 liter) di tengah bawah frame. Pasang 12V diaphragm pump. Hubungkan hose dari tanki ke pump ke nozzle boom. Pasang flow meter di antara pump dan nozzle.', duration: '3 jam', tools: ['Obeng set', 'Tang', 'Teflon tape'], parts: ['Tanki sprayer 1-5L', '12V diaphragm pump', 'Hose 6mm', 'Nozzle boom (3-5 nozzle)', 'Flow meter YF-S201', 'Servo valve'], warnings: ['Tanki harus di tengah untuk keseimbangan', 'Test pump dan nozzle di darat dulu — periksa leak', 'Flow meter harus di posisi horizontal untuk akurasi'] },
      { step: 5, title: 'Pasang Companion Computer dan Kamera', description: 'Mount Raspberry Pi 4B di dalam frame. Hubungkan ke Pixhawk via UART. Pasang kamera di bawah frame menghadap ke bawah. Hubungkan kamera ke Pi CSI/USB port.', duration: '1.5 jam', tools: ['USB cable', 'UART cable'], parts: ['Raspberry Pi 4B', 'MicroSD 64GB', 'Pi Camera V2 / Multispectral camera'], warnings: ['Raspberry Pi harus terlindungi dari cairan sprayer', 'Kamera menghadap ke bawah untuk NDVI/mapping', 'Pastikan UART baud rate sama (921600)'] },
      { step: 6, title: 'Pasang Sistem Daya', description: 'Hubungkan 6S LiPo ke power distribution board. Pasang battery monitor ke Pixhawk. Pasang step-down converter 5V untuk Raspberry Pi. Hubungkan pump ke relay yang dikontrol servo/Pi.', duration: '1.5 jam', tools: ['Solder', 'Multimeter'], parts: ['6S LiPo 12000mAh', 'Power distribution board', 'Buck converter 5V 5A', 'Relay module 12V', 'XT90 connector'], warnings: ['PERIKSA POLARITAS SEBELUM POWER ON', '6S voltage bisa berbahaya — hati-hati', 'Pastikan battery strap kuat — LiPo besar bisa lepas'] },
      { step: 7, title: 'Wiring Sprayer Control', description: 'Hubungkan pump relay ke Raspberry Pi GPIO. Hubungkan servo valve ke Pixhawk aux output atau PCA9685. Hubungkan flow meter ke Pi GPIO (pulse counter). Hubungkan nozzle angle servo.', duration: '1.5 jam', tools: ['Solder', 'Jumper wires'], parts: ['Relay module', 'Servo extension cable', 'Flow meter cable', 'PCA9685 (opsional)'], warnings: ['Test relay dan pump secara manual dulu', 'Flow meter pulse harus di-count dengan benar', 'Servo valve harus fail-closed (tutup saat power off)'] },
      { step: 8, title: 'Flash Firmware, Kalibrasi dan Test', description: 'Flash ArduPilot Copter ke Pixhawk. Flash Nanggroe IoT ke Pi. Kalibrasi compass, accelerometer, ESC. Test motor spin (LEPAS PROPELLER). Test sprayer system di darat. Test flight tanpa payload dulu, lalu dengan tanki kosong, lalu dengan air.', duration: '3 jam', tools: ['USB cable', 'Computer dengan Mission Planner'], parts: [], warnings: ['LEPAS PROPELLER saat test motor', 'Test flight bertahap: tanpa tanki → tanki kosong → tanki berisi air', 'Monitor flight time — cairan berat akan memakan baterai cepat', 'JANGAN semprotkan pestisida sungguhan saat test awal — gunakan air'] },
    ],
    wiringDiagram: {
      pixhawk: { uart0: 'Raspberry Pi', uart1: 'GPS NEO-M8N / RTK', uart2: 'SiK Radio', i2c: 'BME280 + MPU6050', pwm_main: 'ESC x6', pwm_aux: 'Servo valve + Servo nozzle angle', adc: 'Voltage/Current Sensor' },
      raspberry_pi: { uart: 'Pixhawk', i2c: 'BME280 + PCA9685 (opsional)', csi: 'Pi Camera V2', gpio: 'Pump Relay + Flow Meter + Buzzer', usb: 'GSM Module (opsional)' },
      sprayer_system: { pump: '12V Diaphragm Pump → Relay → Pi GPIO', valve: 'Servo MG996R → Pixhawk Aux CH', flow_meter: 'YF-S201 → Pi GPIO (pulse counter)', nozzle: 'Pump → Hose → Flow Meter → Nozzle Boom (3-5 nozzle)' },
      power: { lipo_6s: '6S LiPo → Power Distribution Board → Pixhawk + ESC + Pump (via relay)', pi: 'Buck Converter 5V 5A → Raspberry Pi', gnd: 'Common GND untuk semua komponen' },
    },
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
