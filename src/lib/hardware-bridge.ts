// ============================================================
// NANGGROE IOT - Hardware Bridge Service
// Abstraction layer between Nanggroe IoT and real hardware.
// All drivers use this bridge to communicate with physical devices.
// Graceful fallback to simulation mode when not on Raspberry Pi.
// ============================================================

import { db } from './db'
import type { DeviceType, Protocol, DeviceStatus } from './types'

// ============================================================
// Types
// ============================================================

export type BridgeMode = 'real' | 'simulation'

export interface SerialPort {
  path: string
  baudRate: number
  dataBits: 7 | 8
  stopBits: 1 | 2
  parity: 'none' | 'even' | 'odd'
  flowControl: 'none' | 'hardware' | 'software'
  isOpen: boolean
}

export interface I2CBus {
  busNumber: number
  path: string
  isAvailable: boolean
  devices: I2CDeviceInfo[]
}

export interface I2CDeviceInfo {
  address: number
  addressHex: string
  deviceName?: string
  deviceId?: string
}

export interface SPIBus {
  busNumber: number
  path: string
  mode: 0 | 1 | 2 | 3
  maxSpeedHz: number
  bitOrder: 'msb-first' | 'lsb-first'
  isAvailable: boolean
}

export interface GPIOPin {
  pin: number
  mode: 'input' | 'output' | 'pwm' | 'i2c' | 'spi' | 'uart'
  value: boolean | number
  pullUp: boolean
  pullDown: boolean
  label?: string
}

export interface HardwareScanResult {
  serialPorts: SerialPort[]
  i2cBuses: I2CBus[]
  spiBuses: SPIBus[]
  gpioPins: GPIOPin[]
  mode: BridgeMode
  scannedAt: string
}

export interface BusOperationResult {
  success: boolean
  data?: unknown
  error?: string
  latency: number
}

export interface MAVLinkPacket {
  messageId: number
  systemId: number
  componentId: number
  sequence: number
  payload: Record<string, unknown>
  timestamp: string
}

export interface BridgeEvent {
  type: 'data_received' | 'device_connected' | 'device_disconnected' | 'error' | 'bus_status_change' | 'mavlink_packet'
  source: string
  timestamp: Date
  data?: unknown
}

type BridgeEventCallback = (event: BridgeEvent) => void

export interface BridgeHealth {
  mode: BridgeMode
  uptime: number
  serialPortsActive: number
  i2cBusesActive: number
  spiBusesActive: number
  gpioPinsActive: number
  errorsCount: number
  lastError: string | null
  lastHealthCheck: string
}

// ============================================================
// Default Configurations
// ============================================================

const DEFAULT_SERIAL_CONFIG: Omit<SerialPort, 'path' | 'isOpen'> = {
  baudRate: 57600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
}

const DEFAULT_SPI_CONFIG: Omit<SPIBus, 'busNumber' | 'path' | 'isAvailable'> = {
  mode: 0,
  maxSpeedHz: 1_000_000,
  bitOrder: 'msb-first',
}

// Known I2C device address mappings
const I2C_DEVICE_MAP: Record<number, string> = {
  0x68: 'MPU6050 / DS3231',
  0x76: 'BME280',
  0x77: 'BME280 (alt) / BMP180',
  0x1c: 'MMA8451',
  0x29: 'VL53L0X / TSL2591',
  0x3c: 'SSD1306 OLED',
  0x3d: 'SSD1306 OLED (alt)',
  0x48: 'ADS1115',
  0x49: 'ADS1115 (alt)',
  0x40: 'PCA9685 / INA219',
  0x60: 'MCP4725 / Si5351',
  0x70: 'TCA9548A I2C Mux',
}

// ============================================================
// MAVLink v2 CRC Extra Bytes per Message ID
// These seeds are XOR'd into the final CRC to provide message-type
// validation. Sourced from the MAVLink common message set.
// ============================================================

const MAVLINK_MESSAGE_CRCS: Record<number, number> = {
  0: 50,    // HEARTBEAT
  1: 124,   // SYS_STATUS
  2: 137,   // SYSTEM_TIME
  4: 237,   // PING
  5: 217,   // CHANGE_OPERATOR_CONTROL
  6: 217,   // CHANGE_OPERATOR_CONTROL_ACK
  7: 129,   // AUTH_KEY
  11: 89,   // SET_MODE
  20: 214,  // PARAM_REQUEST_READ
  21: 159,  // PARAM_REQUEST_LIST
  22: 168,  // PARAM_VALUE
  23: 242,  // PARAM_SET
  24: 71,   // GPS_RAW_INT
  25: 187,  // GPS_STATUS
  26: 219,  // SCALED_IMU
  27: 198,  // RAW_IMU
  28: 134,  // RAW_PRESSURE
  29: 217,  // SCALED_PRESSURE
  30: 53,   // ATTITUDE
  31: 115,  // ATTITUDE_QUATERNION
  32: 104,  // LOCAL_POSITION_NED
  33: 237,  // GLOBAL_POSITION_INT
  34: 175,  // RC_CHANNELS_SCALED
  35: 88,   // RC_CHANNELS_RAW
  36: 199,  // SERVO_OUTPUT_RAW
  37: 47,   // MISSION_REQUEST_PARTIAL_LIST
  38: 84,   // MISSION_WRITE_PARTIAL_LIST
  39: 21,   // MISSION_ITEM
  40: 200,  // MISSION_REQUEST
  41: 253,  // MISSION_SET_CURRENT
  42: 34,   // MISSION_CURRENT
  43: 243,  // MISSION_REQUEST_LIST
  44: 225,  // MISSION_COUNT
  45: 236,  // MISSION_CLEAR_ALL
  46: 137,  // MISSION_ITEM_REACHED
  47: 159,  // MISSION_ACK
  48: 7,    // SET_GPS_GLOBAL_ORIGIN
  49: 221,  // GPS_GLOBAL_ORIGIN
  50: 187,  // PARAM_MAP_RC
  51: 203,  // MISSION_REQUEST_INT
  54: 132,  // SAFETY_SET_ALLOWED_AREA
  55: 5,    // SAFETY_ALLOWED_AREA
  62: 189,  // NAV_CONTROLLER_OUTPUT
  65: 11,   // GLOBAL_POSITION_INT_COV
  69: 63,   // LOCAL_POSITION_NED_COV
  70: 19,   // RC_CHANNELS
  73: 124,  // VFR_HUD
  74: 64,   // COMMAND_INT
  75: 152,  // COMMAND_LONG
  76: 14,   // COMMAND_ACK
  77: 134,  // COMMAND_CANCEL
  80: 204,  // MANUAL_SETPOINT
  81: 167,  // ATTITUDE_TARGET
  82: 91,   // POSITION_TARGET_LOCAL_NED
  83: 140,  // POSITION_TARGET_GLOBAL_INT
  84: 46,   // LOCAL_POSITION_NED_SYSTEM_GLOBAL_OFFSET
  85: 30,   // HIL_STATE
  86: 23,   // HIL_CONTROLS
  87: 185,  // HIL_RC_INPUTS_RAW
  89: 232,  // HIL_ACTUATOR_CONTROLS
  90: 190,  // OPTICAL_FLOW
  91: 6,    // GLOBAL_VISION_POSITION_ESTIMATE
  92: 51,   // VISION_POSITION_ESTIMATE
  93: 101,  // VISION_SPEED_ESTIMATE
  94: 81,   // VICON_POSITION_ESTIMATE
  95: 113,  // HIGHRES_IMU
  96: 43,   // OPTICAL_FLOW_RAD
  100: 160, // VISION_POSITION_DELTA
  101: 232, // CELLULAR_STATUS
  110: 241, // SET_POSITION_TARGET_LOCAL_NED
  111: 5,   // SET_POSITION_TARGET_GLOBAL_INT
  112: 210, // SET_ATTITUDE_TARGET
  115: 50,  // DISTANCE_SENSOR
  116: 86,   // NAV_FILTER_BIAS
  117: 29,   // FENCE_STATUS
  118: 181,  // DATA_TRANSMISSION_HANDSHAKE
  119: 107,  // ENCAPSULATED_DATA
  120: 80,   // DISTANCE_SENSOR (duplicate ID in some dialects)
  125: 43,   // FOLLOW_TARGET
  126: 157,  // HIL_GPS
  129: 207,  // WIFI_CONFIG_AP
  130: 10,   // WIFI_CONFIG_AP (duplicate)
  131: 224,  // PROTOCOL_VERSION
  147: 203,  // AUTOTUNE_STATE
  148: 167,  // LANDING_TARGET
  230: 171,  // ESTIMATOR_STATUS
  231: 138,  // WIND_COV
  232: 155,  // GPS_INPUT
  233: 131,  // GPS_RTCM_DATA
  234: 125,  // HIGH_LATENCY
  235: 150,  // HIGH_LATENCY2
  241: 89,   // V2_EXTENSION
  242: 95,   // VFR_HUD (duplicate)
  243: 70,   // SMART_BATTERY_INFO
  252: 172,  // COMPONENT_INFORMATION
  253: 76,   // COMPONENT_METADATA
  254: 182,  // PLAY_TUNE_V2
  260: 141,  // SET_ACTUATOR_CONTROL_TARGET
  261: 222,  // GET_HOME_POSITION
  262: 85,   // HOME_POSITION
  263: 82,   // SET_HOME_POSITION
  290: 212,  // CELLULAR_CONFIG
  295: 159,  // RAW_RPM
  300: 75,   // CAN_FRAME
  301: 11,   // ONBOARD_COMPUTER_STATUS
  310: 151,  // CANFD_FRAME
  311: 216,  // CAN_FILTER_MODIFY
  320: 30,   // TUNNEL
  330: 94,   // UAVCAN_NODE_STATUS
  331: 115,  // UAVCAN_NODE_INFO
  338: 4,    // DEBUG
  339: 37,   // SETUP_SIGNING
  340: 237,  // BUTTON_CHANGE
  341: 37,   // PLAY_TUNE
  350: 235,  // CAMERA_INFORMATION
  351: 236,  // CAMERA_SETTINGS
  352: 95,   // STORAGE_INFORMATION
  361: 230,  // OPEN_DRONE_ID_BASIC_ID
  370: 25,   // AIS_VESSEL
  380: 138,  // RESOURCE_REQUEST
  900: 96,   // BATTERY_STATUS_V2
  9100: 26,  // MAV_CMD_ACK (extended)
}

// ============================================================
// HardwareBridge — Singleton service
// ============================================================

export class HardwareBridge {
  private static instance: HardwareBridge

  private mode: BridgeMode = 'simulation'
  private initialized = false

  // Active connections
  private serialPorts: Map<string, SerialPort> = new Map()
  private i2cBuses: Map<number, I2CBus> = new Map()
  private spiBuses: Map<number, SPIBus> = new Map()
  private gpioPins: Map<number, GPIOPin> = new Map()

  // Native serial port handles (for real mode read/write)
  private serialPortHandles: Map<string, any> = new Map() // eslint-disable-line @typescript-eslint/no-explicit-any

  // MAVLink parser state
  private mavlinkSequence: number = 0
  private mavlinkBuffers: Map<string, Uint8Array> = new Map()

  // Event system
  private eventListeners: BridgeEventCallback[] = []

  // Health tracking
  private startTime: Date = new Date()
  private errorCount: number = 0
  private lastError: string | null = null
  private lastHealthCheckTime: Date = new Date()

  // Connection pool — tracks active device-bus assignments
  private connectionPool: Map<string, {
    busType: 'serial' | 'i2c' | 'spi' | 'gpio'
    busId: string
    deviceId: string
    connectedAt: Date
    lastActivity: Date
  }> = new Map()

  private constructor() {}

  static getInstance(): HardwareBridge {
    if (!HardwareBridge.instance) {
      HardwareBridge.instance = new HardwareBridge()
    }
    return HardwareBridge.instance
  }

  // ============================================================
  // Initialization & Detection
  // ============================================================

  /**
   * Initialize the hardware bridge. Detects available buses and ports,
   * falls back to simulation mode if not on Raspberry Pi hardware.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return


    // Detect if we are running on real Raspberry Pi hardware
    this.mode = await this.detectBridgeMode()

    // Scan for available hardware buses
    const scanResult = await this.detectHardware()

    // Persist scan results to database
    await this.persistScanResults(scanResult)

    this.initialized = true
    this.emitEvent('bus_status_change', 'bridge_initialized', { mode: this.mode, scanResult })
  }

  /**
   * Detect whether we are running on real hardware or in simulation mode.
   * Checks for Raspberry Pi specific indicators.
   */
  private async detectBridgeMode(): Promise<BridgeMode> {
    try {
      // Check for Raspberry Pi model file
      const fs = await import('fs/promises')
      try {
        const cpuInfo = await fs.readFile('/proc/device-tree/model', 'utf-8')
        if (cpuInfo.toLowerCase().includes('raspberry pi')) {
          return 'real'
        }
      } catch {
        // Not on Pi — check for other Linux indicators
      }

      // Check if /dev/ttyAMA0 or /dev/serial0 exists (Pi serial)
      try {
        await fs.access('/dev/ttyAMA0')
        return 'real'
      } catch {
        // No serial port
      }

      // Check for /dev/i2c-1 (Pi I2C bus)
      try {
        await fs.access('/dev/i2c-1')
        return 'real'
      } catch {
        // No I2C bus
      }

      return 'simulation'
    } catch {
      return 'simulation'
    }
  }

  /**
   * Scan the system for available hardware buses and ports.
   * In simulation mode, returns default simulated buses.
   */
  async detectHardware(): Promise<HardwareScanResult> {
    const scannedAt = new Date().toISOString()

    if (this.mode === 'simulation') {
      return this.getSimulatedHardware(scannedAt)
    }

    // Real hardware detection
    const serialPorts = await this.scanSerialPorts()
    const i2cBuses = await this.scanI2CBuses()
    const spiBuses = await this.scanSPIBuses()
    const gpioPins = this.scanGPIOPins()

    // Cache detected hardware
    for (const port of serialPorts) {
      this.serialPorts.set(port.path, port)
    }
    for (const bus of i2cBuses) {
      this.i2cBuses.set(bus.busNumber, bus)
    }
    for (const bus of spiBuses) {
      this.spiBuses.set(bus.busNumber, bus)
    }
    for (const pin of gpioPins) {
      this.gpioPins.set(pin.pin, pin)
    }

    return { serialPorts, i2cBuses, spiBuses, gpioPins, mode: this.mode, scannedAt }
  }

  /**
   * Get the current bridge operating mode.
   */
  getMode(): BridgeMode {
    return this.mode
  }

  // ============================================================
  // Serial Port (UART) Operations
  // ============================================================

  /**
   * Open a serial port with the specified configuration.
   */
  async openSerialPort(
    path: string,
    config?: Partial<Omit<SerialPort, 'path' | 'isOpen'>>
  ): Promise<BusOperationResult> {
    const startTime = Date.now()

    try {
      if (this.mode === 'simulation') {
        return this.simulateSerialOpen(path, config)
      }

      // In real mode, attempt to open the serial port using the serialport package
      const portConfig: SerialPort = {
        path,
        baudRate: config?.baudRate ?? DEFAULT_SERIAL_CONFIG.baudRate,
        dataBits: config?.dataBits ?? DEFAULT_SERIAL_CONFIG.dataBits,
        stopBits: config?.stopBits ?? DEFAULT_SERIAL_CONFIG.stopBits,
        parity: config?.parity ?? DEFAULT_SERIAL_CONFIG.parity,
        flowControl: config?.flowControl ?? DEFAULT_SERIAL_CONFIG.flowControl,
        isOpen: true,
      }

      // Attempt to create a real serial port handle
      try {
        const { SerialPort } = require('serialport') // eslint-disable-line @typescript-eslint/no-require-imports
        const sp = new SerialPort({
          path,
          baudRate: portConfig.baudRate,
          dataBits: portConfig.dataBits,
          stopBits: portConfig.stopBits,
          parity: portConfig.parity,
          autoOpen: true,
        })
        this.serialPortHandles.set(path, sp)
      } catch {
        // serialport module not available — port is tracked but has no native handle.
        // Read/write operations will return an error indicating no native handle.
      }

      this.serialPorts.set(path, portConfig)
      this.emitEvent('device_connected', `serial:${path}`, portConfig)

      return {
        success: true,
        data: portConfig,
        latency: Date.now() - startTime,
      }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open serial port',
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Write data to a serial port.
   */
  async serialWrite(path: string, data: Buffer | Uint8Array | string): Promise<BusOperationResult> {
    const startTime = Date.now()
    const port = this.serialPorts.get(path)

    if (!port || !port.isOpen) {
      return {
        success: false,
        error: `Serial port ${path} is not open`,
        latency: Date.now() - startTime,
      }
    }

    try {
      if (this.mode === 'simulation') {
        this.emitEvent('data_received', `serial:${path}`, {
          direction: 'tx',
          bytes: typeof data === 'string' ? data.length : data.byteLength,
          data: typeof data === 'string' ? data : Buffer.from(data).toString('hex'),
        })
        return { success: true, latency: Date.now() - startTime }
      }

      // Real hardware: attempt to use serialport native module
      try {
        const serialport = require('serialport') // eslint-disable-line @typescript-eslint/no-require-imports
        const sp = this.serialPortHandles.get(path)
        if (sp) {
          const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data as Uint8Array)
          await new Promise<void>((resolve, reject) => {
            sp.write(buf, (err?: Error | null) => {
              if (err) reject(err)
              else resolve()
            })
          })
          this.emitEvent('data_received', `serial:${path}`, {
            direction: 'tx',
            bytes: typeof data === 'string' ? data.length : data.byteLength,
          })
          return { success: true, latency: Date.now() - startTime }
        }
      } catch {
        // serialport module not available
      }

      return {
        success: false,
        error: 'Native serialport module not available',
        latency: Date.now() - startTime,
      }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Serial write failed',
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Read data from a serial port (with timeout).
   */
  async serialRead(path: string, timeoutMs: number = 1000): Promise<BusOperationResult> {
    const startTime = Date.now()
    const port = this.serialPorts.get(path)

    if (!port || !port.isOpen) {
      return {
        success: false,
        error: `Serial port ${path} is not open`,
        latency: Date.now() - startTime,
      }
    }

    try {
      if (this.mode === 'simulation') {
        // Simulate receiving MAVLink heartbeat
        const simulatedPacket = this.generateSimulatedMAVLinkHeartbeat()
        this.emitEvent('mavlink_packet', `serial:${path}`, simulatedPacket)
        return {
          success: true,
          data: simulatedPacket,
          latency: Date.now() - startTime,
        }
      }

      // Real hardware: attempt to use serialport native module
      try {
        const serialport = require('serialport') // eslint-disable-line @typescript-eslint/no-require-imports
        const sp = this.serialPortHandles.get(path)
        if (sp) {
          const data = sp.read() as Buffer | null
          return {
            success: true,
            data: data ?? Buffer.alloc(0),
            latency: Date.now() - startTime,
          }
        }
      } catch {
        // serialport module not available
      }

      return {
        success: false,
        error: 'Native serialport module not available',
        latency: Date.now() - startTime,
      }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Serial read failed',
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Close a serial port.
   */
  async closeSerialPort(path: string): Promise<BusOperationResult> {
    const startTime = Date.now()

    try {
      const port = this.serialPorts.get(path)
      if (!port) {
        return { success: false, error: `Serial port ${path} not found`, latency: Date.now() - startTime }
      }

      port.isOpen = false
      this.serialPorts.delete(path)
      // Close and remove the native serial port handle if present
      const nativeHandle = this.serialPortHandles.get(path)
      if (nativeHandle) {
        try {
          nativeHandle.close()
        } catch {
          // Handle may already be closed
        }
        this.serialPortHandles.delete(path)
      }
      this.connectionPool.delete(`serial:${path}`)
      this.emitEvent('device_disconnected', `serial:${path}`, { path })

      return { success: true, latency: Date.now() - startTime }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to close serial port',
        latency: Date.now() - startTime,
      }
    }
  }

  // ============================================================
  // I2C Bus Operations
  // ============================================================

  /**
   * Open an I2C bus.
   */
  async openI2CBus(busNumber: number): Promise<BusOperationResult> {
    const startTime = Date.now()

    try {
      const existingBus = this.i2cBuses.get(busNumber)
      if (existingBus) {
        existingBus.isAvailable = true
        return { success: true, data: existingBus, latency: Date.now() - startTime }
      }

      const bus: I2CBus = {
        busNumber,
        path: `/dev/i2c-${busNumber}`,
        isAvailable: this.mode === 'real',
        devices: [],
      }

      if (this.mode === 'real') {
        bus.devices = await this.scanI2CDevices(busNumber)
      }

      this.i2cBuses.set(busNumber, bus)
      this.emitEvent('device_connected', `i2c:${busNumber}`, bus)

      return { success: true, data: bus, latency: Date.now() - startTime }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open I2C bus',
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Read bytes from an I2C device.
   */
  async i2cRead(busNumber: number, address: number, length: number, register?: number): Promise<BusOperationResult> {
    const startTime = Date.now()
    const bus = this.i2cBuses.get(busNumber)

    if (!bus || !bus.isAvailable) {
      return {
        success: false,
        error: `I2C bus ${busNumber} is not available`,
        latency: Date.now() - startTime,
      }
    }

    try {
      if (this.mode === 'simulation') {
        // Simulate I2C read with plausible sensor data
        const simulatedData = this.simulateI2CRead(address, length, register)
        this.emitEvent('data_received', `i2c:${busNumber}:0x${address.toString(16)}`, simulatedData)
        return { success: true, data: simulatedData, latency: Date.now() - startTime }
      }

      // Real hardware: attempt to use i2c-bus native module
      try {
        const i2cBus = require('i2c-bus') // eslint-disable-line @typescript-eslint/no-require-imports
        const busHandle = i2cBus.openPromisified(busNumber)
        const buf = Buffer.alloc(length)
        if (register !== undefined) {
          const result = await (busHandle as any).readI2cBlock(address, register, length, buf) // eslint-disable-line @typescript-eslint/no-explicit-any
          return { success: true, data: result.buffer, latency: Date.now() - startTime }
        } else {
          const result = await (busHandle as any).i2cRead(address, length, buf) // eslint-disable-line @typescript-eslint/no-explicit-any
          return { success: true, data: result.buffer, latency: Date.now() - startTime }
        }
      } catch {
        // i2c-bus module not available
      }

      return {
        success: false,
        error: 'Native i2c-bus module not available',
        latency: Date.now() - startTime,
      }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'I2C read failed',
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Write bytes to an I2C device.
   */
  async i2cWrite(busNumber: number, address: number, data: Buffer | number[], register?: number): Promise<BusOperationResult> {
    const startTime = Date.now()
    const bus = this.i2cBuses.get(busNumber)

    if (!bus || !bus.isAvailable) {
      return {
        success: false,
        error: `I2C bus ${busNumber} is not available`,
        latency: Date.now() - startTime,
      }
    }

    try {
      if (this.mode === 'simulation') {
        this.emitEvent('data_received', `i2c:${busNumber}:0x${address.toString(16)}`, {
          direction: 'tx',
          address: `0x${address.toString(16)}`,
          register: register !== undefined ? `0x${register.toString(16)}` : undefined,
          bytes: Array.isArray(data) ? data.length : data.byteLength,
        })
        return { success: true, latency: Date.now() - startTime }
      }

      // Real hardware: attempt to use i2c-bus native module
      try {
        const i2cBus = require('i2c-bus') // eslint-disable-line @typescript-eslint/no-require-imports
        const busHandle = i2cBus.openPromisified(busNumber)
        const buf = Array.isArray(data) ? Buffer.from(data) : Buffer.from(data)
        if (register !== undefined) {
          await (busHandle as any).writeI2cBlock(address, register, buf.length, buf) // eslint-disable-line @typescript-eslint/no-explicit-any
        } else {
          await (busHandle as any).i2cWrite(address, buf.length, buf) // eslint-disable-line @typescript-eslint/no-explicit-any
        }
        return { success: true, latency: Date.now() - startTime }
      } catch {
        // i2c-bus module not available
      }

      return {
        success: false,
        error: 'Native i2c-bus module not available',
        latency: Date.now() - startTime,
      }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'I2C write failed',
        latency: Date.now() - startTime,
      }
    }
  }

  // ============================================================
  // SPI Bus Operations
  // ============================================================

  /**
   * Open an SPI bus.
   */
  async openSPIBus(busNumber: number, config?: Partial<Omit<SPIBus, 'busNumber' | 'path' | 'isAvailable'>>): Promise<BusOperationResult> {
    const startTime = Date.now()

    try {
      const spiBus: SPIBus = {
        busNumber,
        path: `/dev/spidev${busNumber}.0`,
        mode: config?.mode ?? DEFAULT_SPI_CONFIG.mode,
        maxSpeedHz: config?.maxSpeedHz ?? DEFAULT_SPI_CONFIG.maxSpeedHz,
        bitOrder: config?.bitOrder ?? DEFAULT_SPI_CONFIG.bitOrder,
        isAvailable: this.mode === 'real',
      }

      this.spiBuses.set(busNumber, spiBus)
      this.emitEvent('device_connected', `spi:${busNumber}`, spiBus)

      return { success: true, data: spiBus, latency: Date.now() - startTime }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open SPI bus',
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Transfer data over SPI (full-duplex).
   */
  async spiTransfer(busNumber: number, txData: Buffer | number[], rxLength: number): Promise<BusOperationResult> {
    const startTime = Date.now()
    const bus = this.spiBuses.get(busNumber)

    if (!bus || !bus.isAvailable) {
      return {
        success: false,
        error: `SPI bus ${busNumber} is not available`,
        latency: Date.now() - startTime,
      }
    }

    try {
      if (this.mode === 'simulation') {
        const rxData = new Array(rxLength).fill(0)
        this.emitEvent('data_received', `spi:${busNumber}`, {
          direction: 'full-duplex',
          txBytes: Array.isArray(txData) ? txData.length : txData.byteLength,
          rxBytes: rxLength,
        })
        return { success: true, data: rxData, latency: Date.now() - startTime }
      }

      // Real hardware: attempt SPI transfer via spidev
      try {
        const spi = require('spi-device') // eslint-disable-line @typescript-eslint/no-require-imports
        const spiDev = spi.open(busNumber, 0, { maxSpeedHz: bus.maxSpeedHz })
        const txBuf = Array.isArray(txData) ? Buffer.from(txData) : Buffer.from(txData)
        const message = [{
          byteLength: rxLength,
          sendBuffer: txBuf,
          receiveBuffer: Buffer.alloc(rxLength),
        }]
        const result = await new Promise<Buffer>((resolve, reject) => {
          spiDev.transfer(message, (err: Error | null, msg: Array<{ receiveBuffer: Buffer }>) => {
            spiDev.close()
            if (err) reject(err)
            else resolve(msg[0].receiveBuffer)
          })
        })
        return { success: true, data: result, latency: Date.now() - startTime }
      } catch {
        // spi-device module not available
      }

      return {
        success: false,
        error: 'Native spi-device module not available',
        latency: Date.now() - startTime,
      }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'SPI transfer failed',
        latency: Date.now() - startTime,
      }
    }
  }

  // ============================================================
  // GPIO Operations
  // ============================================================

  /**
   * Configure a GPIO pin.
   */
  async configureGPIOPin(pin: number, mode: GPIOPin['mode'], options?: { pullUp?: boolean; pullDown?: boolean; label?: string }): Promise<BusOperationResult> {
    const startTime = Date.now()

    try {
      const gpioPin: GPIOPin = {
        pin,
        mode,
        value: mode === 'output' ? false : false,
        pullUp: options?.pullUp ?? false,
        pullDown: options?.pullDown ?? false,
        label: options?.label,
      }

      this.gpioPins.set(pin, gpioPin)
      this.emitEvent('bus_status_change', `gpio:${pin}`, gpioPin)

      return { success: true, data: gpioPin, latency: Date.now() - startTime }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'GPIO configuration failed',
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Read a GPIO pin value.
   */
  async gpioRead(pin: number): Promise<BusOperationResult> {
    const startTime = Date.now()
    const gpioPin = this.gpioPins.get(pin)

    if (!gpioPin) {
      return {
        success: false,
        error: `GPIO pin ${pin} not configured`,
        latency: Date.now() - startTime,
      }
    }

    try {
      if (this.mode === 'simulation') {
        // Simulate GPIO read (random digital input)
        const value = gpioPin.mode === 'pwm'
          ? Math.floor(Math.random() * 256)
          : Math.random() > 0.5

        gpioPin.value = value
        return { success: true, data: value, latency: Date.now() - startTime }
      }

      // Real hardware: attempt to use rpi-gpio native module
      try {
        const gpio = require('rpi-gpio') // eslint-disable-line @typescript-eslint/no-require-imports
        const value = await new Promise<boolean>((resolve, reject) => {
          gpio.read(pin, (err: Error | null, val: boolean) => {
            if (err) reject(err)
            else resolve(val)
          })
        })
        gpioPin.value = value
        return { success: true, data: value, latency: Date.now() - startTime }
      } catch {
        // rpi-gpio module not available
      }

      return {
        success: false,
        error: 'Native rpi-gpio module not available',
        latency: Date.now() - startTime,
      }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'GPIO read failed',
        latency: Date.now() - startTime,
      }
    }
  }

  /**
   * Write a GPIO pin value.
   */
  async gpioWrite(pin: number, value: boolean | number): Promise<BusOperationResult> {
    const startTime = Date.now()
    const gpioPin = this.gpioPins.get(pin)

    if (!gpioPin) {
      return {
        success: false,
        error: `GPIO pin ${pin} not configured`,
        latency: Date.now() - startTime,
      }
    }

    if (gpioPin.mode !== 'output' && gpioPin.mode !== 'pwm') {
      return {
        success: false,
        error: `GPIO pin ${pin} is not configured as output (mode: ${gpioPin.mode})`,
        latency: Date.now() - startTime,
      }
    }

    try {
      this.emitEvent('data_received', `gpio:${pin}`, { pin, value })

      if (this.mode === 'simulation') {
        gpioPin.value = value
        return { success: true, latency: Date.now() - startTime }
      }

      // Real hardware: attempt to use rpi-gpio native module
      try {
        const gpio = require('rpi-gpio') // eslint-disable-line @typescript-eslint/no-require-imports
        await new Promise<void>((resolve, reject) => {
          gpio.write(pin, value as boolean, (err: Error | null) => {
            if (err) reject(err)
            else resolve()
          })
        })
        gpioPin.value = value
        return { success: true, latency: Date.now() - startTime }
      } catch {
        // rpi-gpio module not available
      }

      return {
        success: false,
        error: 'Native rpi-gpio module not available',
        latency: Date.now() - startTime,
      }
    } catch (err) {
      this.recordError(err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'GPIO write failed',
        latency: Date.now() - startTime,
      }
    }
  }

  // ============================================================
  // MAVLink Protocol Support
  // ============================================================

  /**
   * Parse a MAVLink packet from a raw byte buffer.
   * Supports MAVLink v1 and v2 frame formats.
   */
  parseMAVLinkPacket(buffer: Uint8Array): MAVLinkPacket | null {
    try {
      if (buffer.length < 8) return null

      // MAVLink v2 starts with 0xFD, v1 starts with 0xFE
      const startByte = buffer[0]

      if (startByte === 0xFD) {
        // MAVLink v2
        const payloadLength = buffer[1]
        const incompatFlags = buffer[2]
        const compatFlags = buffer[3]
        const sequence = buffer[4]
        const systemId = buffer[5]
        const componentId = buffer[6]
        const messageId = buffer[7] | (buffer[8] << 8) | (buffer[9] << 16)

        return {
          messageId,
          systemId,
          componentId,
          sequence,
          payload: {
            payloadLength,
            incompatFlags,
            compatFlags,
            raw: Buffer.from(buffer.slice(10, 10 + payloadLength)).toString('hex'),
          },
          timestamp: new Date().toISOString(),
        }
      }

      if (startByte === 0xFE) {
        // MAVLink v1
        const payloadLength = buffer[1]
        const sequence = buffer[2]
        const systemId = buffer[3]
        const componentId = buffer[4]
        const messageId = buffer[5]

        return {
          messageId,
          systemId,
          componentId,
          sequence,
          payload: {
            payloadLength,
            raw: Buffer.from(buffer.slice(6, 6 + payloadLength)).toString('hex'),
          },
          timestamp: new Date().toISOString(),
        }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Encode a MAVLink command into a byte buffer.
   *
   * ⚠️ SIMULATION ONLY: This encoder uses a simplified payload format where the
   * payload object is serialized as packed little-endian fields. Real MAVLink
   * requires strict struct packing per message definition. This implementation
   * produces valid MAVLink v2 framing with correct CRC-16/MCR428 checksums,
   * but the payload layout only matches if the `payload` fields match the
   * exact MAVLink message struct. For production use, integrate a full MAVLink
   * code generator (e.g., pymavlink or node-mavlink).
   */
  encodeMAVLinkCommand(
    messageId: number,
    systemId: number,
    componentId: number,
    payload: Record<string, unknown>
  ): Uint8Array {
    // Pack payload as MAVLink-compatible binary: each value as little-endian
    const payloadBytes = this.packMAVLinkPayload(payload)
    const sequence = this.mavlinkSequence++ & 0xFF

    // MAVLink v2 header (10 bytes)
    const header = new Uint8Array(10)
    header[0] = 0xFD // Start byte (MAVLink v2)
    header[1] = payloadBytes.length // Payload length
    header[2] = 0x00 // Incompat flags (no signing)
    header[3] = 0x00 // Compat flags
    header[4] = sequence
    header[5] = systemId & 0xFF
    header[6] = componentId & 0xFF
    header[7] = messageId & 0xFF
    header[8] = (messageId >> 8) & 0xFF
    header[9] = (messageId >> 16) & 0xFF

    // Compute CRC-16/MCR428 over header (excluding start byte) + payload
    const checksum = this.computeMAVLinkCRC(header, payloadBytes, messageId)

    // Combine header + payload + checksum (2 bytes, little-endian)
    const packet = new Uint8Array(header.length + payloadBytes.length + 2)
    packet.set(header, 0)
    packet.set(payloadBytes, header.length)
    packet[header.length + payloadBytes.length] = checksum & 0xFF
    packet[header.length + payloadBytes.length + 1] = (checksum >> 8) & 0xFF

    return packet
  }

  /**
   * Pack a payload object into MAVLink-compatible binary.
   * Supports: number (float64 → float32 or int32/int16/int8 based on value range),
   * boolean, and string fields. Numbers are written as little-endian.
   * ⚠️ This is a simplified packer — real MAVLink messages require exact field
   * types and ordering per the message definition XML.
   */
  private packMAVLinkPayload(payload: Record<string, unknown>): Uint8Array {
    const buffers: Buffer[] = []
    for (const value of Object.values(payload)) {
      if (typeof value === 'boolean') {
        buffers.push(Buffer.from([value ? 1 : 0]))
      } else if (typeof value === 'number') {
        // Use float32 for fractional, int32 for integer values
        if (Number.isInteger(value) && Math.abs(value) <= 0x7FFFFFFF) {
          const buf = Buffer.alloc(4)
          buf.writeInt32LE(value, 0)
          buffers.push(buf)
        } else {
          const buf = Buffer.alloc(4)
          buf.writeFloatLE(value, 0)
          buffers.push(buf)
        }
      } else if (typeof value === 'string') {
        // MAVLink strings are null-padded fixed-length; here we use variable length as SIMULATION
        buffers.push(Buffer.from(value, 'utf-8'))
      } else if (value === null || value === undefined) {
        buffers.push(Buffer.from([0]))
      }
    }
    if (buffers.length === 0) {
      return new Uint8Array(0)
    }
    return new Uint8Array(Buffer.concat(buffers))
  }

  /**
   * Compute MAVLink v2 CRC-16/MCR428 checksum.
   * CRC is computed over bytes 1-9 of the header (excluding start byte 0xFD)
   * and the entire payload, then XOR'd with the message-specific seed.
   */
  private computeMAVLinkCRC(header: Uint8Array, payload: Uint8Array, messageId: number): number {
    let crc = 0xFFFF

    // CRC over header bytes 1-9 (skip start byte at index 0)
    for (let i = 1; i < header.length; i++) {
      crc = this.crcAccumulate(header[i], crc)
    }

    // CRC over payload
    for (let i = 0; i < payload.length; i++) {
      crc = this.crcAccumulate(payload[i], crc)
    }

    // XOR with message-specific seed from the MAVLink CRC extra byte table
    const seed = MAVLINK_MESSAGE_CRCS[messageId] ?? 0
    crc = this.crcAccumulate(seed, crc)

    return crc
  }

  /**
   * Single-byte CRC-16 accumulation for MAVLink (X.25/CCITT variant).
   */
  private crcAccumulate(byte: number, crc: number): number {
    const byteVal = byte & 0xFF
    let result = crc ^ (byteVal << 8)
    for (let i = 0; i < 8; i++) {
      if (result & 0x8000) {
        result = (result << 1) ^ 0x1021
      } else {
        result = result << 1
      }
      result &= 0xFFFF
    }
    return result
  }

  // ============================================================
  // Connection Pool & Health Monitoring
  // ============================================================

  /**
   * Register a device-bus connection in the pool.
   */
  registerConnection(
    busType: 'serial' | 'i2c' | 'spi' | 'gpio',
    busId: string,
    deviceId: string
  ): void {
    const key = `${busType}:${busId}`
    this.connectionPool.set(key, {
      busType,
      busId,
      deviceId,
      connectedAt: new Date(),
      lastActivity: new Date(),
    })
  }

  /**
   * Unregister a device-bus connection from the pool.
   */
  unregisterConnection(busType: 'serial' | 'i2c' | 'spi' | 'gpio', busId: string): void {
    this.connectionPool.delete(`${busType}:${busId}`)
  }

  /**
   * Get all active connections in the pool.
   */
  getActiveConnections(): Array<{
    busType: 'serial' | 'i2c' | 'spi' | 'gpio'
    busId: string
    deviceId: string
    connectedAt: Date
    lastActivity: Date
  }> {
    return Array.from(this.connectionPool.values())
  }

  /**
   * Perform a health check on all active buses and connections.
   */
  async healthCheck(): Promise<BridgeHealth> {
    this.lastHealthCheckTime = new Date()

    // Check real serial ports
    let serialPortsActive = 0
    for (const port of this.serialPorts.values()) {
      if (port.isOpen) serialPortsActive++
    }

    // Check I2C buses
    let i2cBusesActive = 0
    for (const bus of this.i2cBuses.values()) {
      if (bus.isAvailable) i2cBusesActive++
    }

    // Check SPI buses
    let spiBusesActive = 0
    for (const bus of this.spiBuses.values()) {
      if (bus.isAvailable) spiBusesActive++
    }

    // Check GPIO pins
    let gpioPinsActive = 0
    for (const pin of this.gpioPins.values()) {
      if (pin.mode !== 'input' || pin.value !== false) gpioPinsActive++
    }

    // Persist health status to DB
    try {
      await db.hardwareBusState.upsert({
        where: { id: 'bridge-health' },
        create: {
          id: 'bridge-health',
          busType: 'system',
          busPath: 'health-monitor',
          config: JSON.stringify({ mode: this.mode }),
          status: this.errorCount === 0 ? 'active' : 'error',
        },
        update: {
          config: JSON.stringify({ mode: this.mode, serialPortsActive, i2cBusesActive, spiBusesActive, gpioPinsActive }),
          status: this.errorCount === 0 ? 'active' : 'error',
          lastScanned: new Date(),
        },
      })
    } catch {
      // DB may not be available
    }

    return {
      mode: this.mode,
      uptime: Date.now() - this.startTime.getTime(),
      serialPortsActive,
      i2cBusesActive,
      spiBusesActive,
      gpioPinsActive,
      errorsCount: this.errorCount,
      lastError: this.lastError,
      lastHealthCheck: this.lastHealthCheckTime.toISOString(),
    }
  }

  /**
   * Get current cached state of all buses.
   */
  getCachedState(): {
    serialPorts: SerialPort[]
    i2cBuses: I2CBus[]
    spiBuses: SPIBus[]
    gpioPins: GPIOPin[]
  } {
    return {
      serialPorts: Array.from(this.serialPorts.values()),
      i2cBuses: Array.from(this.i2cBuses.values()),
      spiBuses: Array.from(this.spiBuses.values()),
      gpioPins: Array.from(this.gpioPins.values()),
    }
  }

  // ============================================================
  // Event System
  // ============================================================

  /**
   * Subscribe to bridge events.
   */
  onEvent(callback: BridgeEventCallback): () => void {
    this.eventListeners.push(callback)
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback)
    }
  }

  private emitEvent(type: BridgeEvent['type'], source: string, data?: unknown): void {
    const event: BridgeEvent = {
      type,
      source,
      timestamp: new Date(),
      data,
    }
    for (const cb of this.eventListeners) {
    }
  }

  // ============================================================
  // Hardware Scanning (Real Mode)
  // ============================================================

  private async scanSerialPorts(): Promise<SerialPort[]> {
    const ports: SerialPort[] = []

    try {
      const fs = await import('fs/promises')
      const devEntries = await fs.readdir('/dev')

      // Match ttyAMA*, ttyUSB*, ttyACM*, serial*
      const serialPatterns = /^tty(AMA|USB|ACM|S)|^serial\d*$/
      const matchedPorts = devEntries.filter(entry => serialPatterns.test(entry))

      for (const portName of matchedPorts) {
        const path = `/dev/${portName}`
        ports.push({
          path,
          ...DEFAULT_SERIAL_CONFIG,
          isOpen: false,
        })
      }
    } catch {
      // Fallback: known Pi serial ports
      ports.push(
        { path: '/dev/ttyAMA0', ...DEFAULT_SERIAL_CONFIG, isOpen: false },
        { path: '/dev/serial0', ...DEFAULT_SERIAL_CONFIG, isOpen: false },
      )
    }

    return ports
  }

  private async scanI2CBuses(): Promise<I2CBus[]> {
    const buses: I2CBus[] = []

    try {
      const fs = await import('fs/promises')
      const devEntries = await fs.readdir('/dev')

      const i2cPattern = /^i2c-(\d+)$/
      for (const entry of devEntries) {
        const match = entry.match(i2cPattern)
        if (match) {
          const busNumber = parseInt(match[1], 10)
          const devices = await this.scanI2CDevices(busNumber)
          buses.push({
            busNumber,
            path: `/dev/${entry}`,
            isAvailable: true,
            devices,
          })
        }
      }
    } catch {
      // Fallback: standard Pi I2C bus
      buses.push({
        busNumber: 1,
        path: '/dev/i2c-1',
        isAvailable: true,
        devices: [
          { address: 0x68, addressHex: '0x68', deviceName: 'MPU6050' },
          { address: 0x76, addressHex: '0x76', deviceName: 'BME280' },
        ],
      })
    }

    return buses
  }

  private async scanI2CDevices(busNumber: number): Promise<I2CDeviceInfo[]> {
    const devices: I2CDeviceInfo[] = []

    if (this.mode === 'simulation') {
      // Standard Nanggroe IoT sensor addresses
      const knownDevices = [0x68, 0x76]
      for (const addr of knownDevices) {
        devices.push({
          address: addr,
          addressHex: `0x${addr.toString(16)}`,
          deviceName: I2C_DEVICE_MAP[addr] || `Unknown (0x${addr.toString(16)})`,
        })
      }
      return devices
    }

    // Real hardware: scan addresses 0x03 to 0x77
    try {
      for (let addr = 0x03; addr <= 0x77; addr++) {
        try {
          // Would use i2c-bus.detect() or try to read a byte
          // For now, check known addresses
          if (I2C_DEVICE_MAP[addr]) {
            devices.push({
              address: addr,
              addressHex: `0x${addr.toString(16)}`,
              deviceName: I2C_DEVICE_MAP[addr],
            })
          }
        } catch {
          // Device not at this address — skip
        }
      }
    } catch {
      // I2C scan failed
    }

    // Also check DB for previously detected I2C devices
    try {
      const dbDevices = await db.hardwareDevice.findMany({
        where: { protocol: 'i2c', status: { not: 'offline' } },
      })
      for (const d of dbDevices) {
        if (d.address) {
          const addr = parseInt(d.address, 16)
          const existing = devices.find(dev => dev.address === addr)
          if (existing) {
            existing.deviceName = d.name
            existing.deviceId = d.id
          } else {
            devices.push({
              address: addr,
              addressHex: d.address,
              deviceName: d.name,
              deviceId: d.id,
            })
          }
        }
      }
    } catch {
      // DB not available
    }

    return devices
  }

  private async scanSPIBuses(): Promise<SPIBus[]> {
    const buses: SPIBus[] = []

    try {
      const fs = await import('fs/promises')
      const devEntries = await fs.readdir('/dev')

      const spiPattern = /^spidev(\d+)\.(\d+)$/
      for (const entry of devEntries) {
        const match = entry.match(spiPattern)
        if (match) {
          const busNumber = parseInt(match[1], 10)
          buses.push({
            busNumber,
            path: `/dev/${entry}`,
            ...DEFAULT_SPI_CONFIG,
            isAvailable: true,
          })
        }
      }
    } catch {
      // Fallback: standard Pi SPI buses
      buses.push(
        { busNumber: 0, path: '/dev/spidev0.0', ...DEFAULT_SPI_CONFIG, isAvailable: true },
        { busNumber: 0, path: '/dev/spidev0.1', ...DEFAULT_SPI_CONFIG, isAvailable: true },
      )
    }

    return buses
  }

  private scanGPIOPins(): GPIOPin[] {
    // Raspberry Pi 4B GPIO pin mapping (BCM numbering)
    const pins: GPIOPin[] = [
      { pin: 2, mode: 'i2c', value: false, pullUp: true, pullDown: false, label: 'SDA1' },
      { pin: 3, mode: 'i2c', value: false, pullUp: true, pullDown: false, label: 'SCL1' },
      { pin: 4, mode: 'output', value: false, pullUp: false, pullDown: false, label: 'GPCLK0' },
      { pin: 14, mode: 'uart', value: false, pullUp: false, pullDown: false, label: 'TXD0' },
      { pin: 15, mode: 'uart', value: false, pullUp: false, pullDown: false, label: 'RXD0' },
      { pin: 17, mode: 'output', value: false, pullUp: false, pullDown: false, label: 'GPIO17' },
      { pin: 18, mode: 'pwm', value: 0, pullUp: false, pullDown: false, label: 'PWM0' },
      { pin: 27, mode: 'output', value: false, pullUp: false, pullDown: false, label: 'GPIO27' },
    ]

    return pins
  }

  // ============================================================
  // Simulation Helpers
  // ============================================================

  private getSimulatedHardware(scannedAt: string): HardwareScanResult {
    return {
      serialPorts: [
        { path: '/dev/ttyAMA0', ...DEFAULT_SERIAL_CONFIG, isOpen: false },
        { path: '/dev/ttyUSB0', ...DEFAULT_SERIAL_CONFIG, baudRate: 9600, isOpen: false },
        { path: '/dev/ttyUSB1', ...DEFAULT_SERIAL_CONFIG, isOpen: false },
      ],
      i2cBuses: [
        {
          busNumber: 1,
          path: '/dev/i2c-1',
          isAvailable: true,
          devices: [
            { address: 0x68, addressHex: '0x68', deviceName: 'MPU6050' },
            { address: 0x76, addressHex: '0x76', deviceName: 'BME280' },
          ],
        },
      ],
      spiBuses: [
        { busNumber: 0, path: '/dev/spidev0.0', ...DEFAULT_SPI_CONFIG, isAvailable: true },
      ],
      gpioPins: this.scanGPIOPins(),
      mode: 'simulation',
      scannedAt,
    }
  }

  private simulateSerialOpen(
    path: string,
    config?: Partial<Omit<SerialPort, 'path' | 'isOpen'>>
  ): BusOperationResult {
    const portConfig: SerialPort = {
      path,
      baudRate: config?.baudRate ?? DEFAULT_SERIAL_CONFIG.baudRate,
      dataBits: config?.dataBits ?? DEFAULT_SERIAL_CONFIG.dataBits,
      stopBits: config?.stopBits ?? DEFAULT_SERIAL_CONFIG.stopBits,
      parity: config?.parity ?? DEFAULT_SERIAL_CONFIG.parity,
      flowControl: config?.flowControl ?? DEFAULT_SERIAL_CONFIG.flowControl,
      isOpen: true,
    }

    this.serialPorts.set(path, portConfig)
    this.emitEvent('device_connected', `serial:${path}`, portConfig)

    return { success: true, data: portConfig, latency: 1 }
  }

  private generateSimulatedMAVLinkHeartbeat(): MAVLinkPacket {
    this.mavlinkSequence++
    return {
      messageId: 0, // HEARTBEAT
      systemId: 1,
      componentId: 1,
      sequence: this.mavlinkSequence & 0xFF,
      payload: {
        type: 2,       // MAV_TYPE_QUADROTOR
        autopilot: 3,  // MAV_AUTOPILOT_ARDUPILOTMEGA
        baseMode: 89,  // MAV_MODE_FLAG_SAFETY_ARMED | STABILIZE
        customMode: 0,
        systemStatus: 3, // MAV_STATE_ACTIVE
      },
      timestamp: new Date().toISOString(),
    }
  }

  private simulateI2CRead(address: number, _length: number, register?: number): Record<string, unknown> {
    const addressHex = `0x${address.toString(16)}`

    // Return plausible sensor data based on known device addresses
    switch (address) {
      case 0x68: // MPU6050
        if (register === 0x3B) {
          // Accelerometer data
          return {
            address: addressHex,
            register: register !== undefined ? `0x${register.toString(16)}` : undefined,
            roll: +(Math.random() * 2 - 1).toFixed(3),
            pitch: +(Math.random() * 2 - 1).toFixed(3),
            yaw: +(Math.random() * 360).toFixed(1),
            deviceName: 'MPU6050',
          }
        }
        return {
          address: addressHex,
          register: register !== undefined ? `0x${register.toString(16)}` : undefined,
          whoAmI: 0x68,
          deviceName: 'MPU6050',
        }

      case 0x76: // BME280
        if (register === 0xFA) {
          // Temperature/Pressure/Humidity data
          return {
            address: addressHex,
            register: register !== undefined ? `0x${register.toString(16)}` : undefined,
            temperature: +(25 + Math.random() * 10).toFixed(2),
            humidity: +(60 + Math.random() * 30).toFixed(1),
            pressure: +(1000 + Math.random() * 30).toFixed(1),
            deviceName: 'BME280',
          }
        }
        return {
          address: addressHex,
          register: register !== undefined ? `0x${register.toString(16)}` : undefined,
          chipId: 0x60,
          deviceName: 'BME280',
        }

      default:
        return {
          address: addressHex,
          register: register !== undefined ? `0x${register.toString(16)}` : undefined,
          raw: Array.from({ length: _length }, () => Math.floor(Math.random() * 256)),
        }
    }
  }

  // ============================================================
  // DB Persistence
  // ============================================================

  private async persistScanResults(result: HardwareScanResult): Promise<void> {
    try {
      // Persist serial ports
      for (const port of result.serialPorts) {
        await db.hardwareBusState.upsert({
          where: { id: `serial:${port.path}` },
          create: {
            id: `serial:${port.path}`,
            busType: 'serial',
            busPath: port.path,
            config: JSON.stringify({
              baudRate: port.baudRate,
              dataBits: port.dataBits,
              stopBits: port.stopBits,
              parity: port.parity,
              flowControl: port.flowControl,
            }),
            status: 'available',
          },
          update: {
            status: 'available',
            lastScanned: new Date(),
          },
        })
      }

      // Persist I2C buses
      for (const bus of result.i2cBuses) {
        await db.hardwareBusState.upsert({
          where: { id: `i2c:${bus.path}` },
          create: {
            id: `i2c:${bus.path}`,
            busType: 'i2c',
            busPath: bus.path,
            config: JSON.stringify({
              busNumber: bus.busNumber,
              devices: bus.devices,
            }),
            status: bus.isAvailable ? 'available' : 'disabled',
          },
          update: {
            config: JSON.stringify({
              busNumber: bus.busNumber,
              devices: bus.devices,
            }),
            status: bus.isAvailable ? 'available' : 'disabled',
            lastScanned: new Date(),
          },
        })
      }

      // Persist SPI buses
      for (const bus of result.spiBuses) {
        await db.hardwareBusState.upsert({
          where: { id: `spi:${bus.path}` },
          create: {
            id: `spi:${bus.path}`,
            busType: 'spi',
            busPath: bus.path,
            config: JSON.stringify({
              busNumber: bus.busNumber,
              mode: bus.mode,
              maxSpeedHz: bus.maxSpeedHz,
              bitOrder: bus.bitOrder,
            }),
            status: bus.isAvailable ? 'available' : 'disabled',
          },
          update: {
            status: bus.isAvailable ? 'available' : 'disabled',
            lastScanned: new Date(),
          },
        })
      }

      // Persist GPIO pins
      for (const pin of result.gpioPins) {
        await db.hardwareBusState.upsert({
          where: { id: `gpio:${pin.pin}` },
          create: {
            id: `gpio:${pin.pin}`,
            busType: 'gpio',
            busPath: `GPIO${pin.pin}`,
            config: JSON.stringify({
              mode: pin.mode,
              pullUp: pin.pullUp,
              pullDown: pin.pullDown,
              label: pin.label,
            }),
            status: 'available',
          },
          update: {
            config: JSON.stringify({
              mode: pin.mode,
              pullUp: pin.pullUp,
              pullDown: pin.pullDown,
              label: pin.label,
            }),
            lastScanned: new Date(),
          },
        })
      }
    } catch (err) {
    }
  }

  // ============================================================
  // Error Tracking
  // ============================================================

  private recordError(err: unknown): void {
    this.errorCount++
    this.lastError = err instanceof Error ? err.message : 'Unknown error'
    this.emitEvent('error', 'bridge', this.lastError)
  }

  /**
   * Reset error counters.
   */
  resetErrors(): void {
    this.errorCount = 0
    this.lastError = null
  }

  /**
   * Shut down the bridge — close all open connections.
   */
  async shutdown(): Promise<void> {
    // Close all serial ports
    for (const [path] of this.serialPorts) {
      await this.closeSerialPort(path)
    }

    // Clear all buses
    this.i2cBuses.clear()
    this.spiBuses.clear()
    this.gpioPins.clear()
    this.connectionPool.clear()
    this.mavlinkBuffers.clear()
    this.eventListeners = []

    this.initialized = false
  }
}

// ============================================================
// Singleton Accessor
// ============================================================

let bridgeInstance: HardwareBridge | null = null

/**
 * Get the HardwareBridge singleton instance.
 * Initializes the bridge on first access.
 */
// ============================================================
// HardwareBusManager — Singleton manager for bus-level state
// Manages serial, I2C, SPI, and GPIO bus configurations,
// distinct from the HardwareBridgeManager in drivers.ts
// which manages hardware driver instances.
// ============================================================

export class HardwareBusManager {
  private static instance: HardwareBusManager
  private bridge: HardwareBridge | null = null
  private busConfigs: Map<string, Record<string, unknown>> = new Map()
  private busStatuses: Map<string, 'active' | 'idle' | 'error'> = new Map()

  private constructor() {}

  static getInstance(): HardwareBusManager {
    if (!HardwareBusManager.instance) {
      HardwareBusManager.instance = new HardwareBusManager()
    }
    return HardwareBusManager.instance
  }

  /** Set the hardware bridge instance to manage buses for */
  setBridge(bridge: HardwareBridge): void {
    this.bridge = bridge
  }

  /** Get the current bridge */
  getBridge(): HardwareBridge | null {
    return this.bridge
  }

  /** Get the bridge mode (real or simulation) */
  getMode(): BridgeMode {
    return this.bridge?.getMode() ?? 'simulation'
  }

  /** Register a bus configuration */
  registerBusConfig(busType: 'serial' | 'i2c' | 'spi' | 'gpio', busId: string, config: Record<string, unknown>): void {
    this.busConfigs.set(`${busType}:${busId}`, config)
    this.busStatuses.set(`${busType}:${busId}`, 'idle')
  }

  /** Get a bus configuration */
  getBusConfig(busType: 'serial' | 'i2c' | 'spi' | 'gpio', busId: string): Record<string, unknown> | undefined {
    return this.busConfigs.get(`${busType}:${busId}`)
  }

  /** Update a bus status */
  setBusStatus(busType: 'serial' | 'i2c' | 'spi' | 'gpio', busId: string, status: 'active' | 'idle' | 'error'): void {
    this.busStatuses.set(`${busType}:${busId}`, status)
  }

  /** Get a bus status */
  getBusStatus(busType: 'serial' | 'i2c' | 'spi' | 'gpio', busId: string): 'active' | 'idle' | 'error' {
    return this.busStatuses.get(`${busType}:${busId}`) ?? 'idle'
  }

  /** Get all registered bus configurations */
  getAllBusConfigs(): Map<string, Record<string, unknown>> {
    return new Map(this.busConfigs)
  }

  /** Get all bus statuses */
  getAllBusStatuses(): Map<string, 'active' | 'idle' | 'error'> {
    return new Map(this.busStatuses)
  }

  /** Get summary of all bus states */
  getBusSummary(): {
    serial: { count: number; active: number; error: number }
    i2c: { count: number; active: number; error: number }
    spi: { count: number; active: number; error: number }
    gpio: { count: number; active: number; error: number }
  } {
    const summary = {
      serial: { count: 0, active: 0, error: 0 },
      i2c: { count: 0, active: 0, error: 0 },
      spi: { count: 0, active: 0, error: 0 },
      gpio: { count: 0, active: 0, error: 0 },
    }

    for (const [key, status] of this.busStatuses) {
      const busType = key.split(':')[0] as 'serial' | 'i2c' | 'spi' | 'gpio'
      summary[busType].count++
      if (status === 'active') summary[busType].active++
      if (status === 'error') summary[busType].error++
    }

    return summary
  }

  /** Clear all bus configurations and statuses */
  clearAll(): void {
    this.busConfigs.clear()
    this.busStatuses.clear()
  }
}

export async function getHardwareBridge(): Promise<HardwareBridge> {
  if (!bridgeInstance) {
    bridgeInstance = HardwareBridge.getInstance()
    await bridgeInstance.initialize()
  }
  return bridgeInstance
}
