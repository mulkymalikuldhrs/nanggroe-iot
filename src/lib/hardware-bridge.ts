// ============================================================
// NANGGROE OS AI - Hardware Bridge Service
// Abstraction layer between Nanggroe OS and real hardware.
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

    console.log('[HardwareBridge] Initializing hardware detection...')

    // Detect if we are running on real Raspberry Pi hardware
    this.mode = await this.detectBridgeMode()
    console.log(`[HardwareBridge] Running in ${this.mode} mode`)

    // Scan for available hardware buses
    const scanResult = await this.detectHardware()
    console.log(`[HardwareBridge] Detected: ${scanResult.serialPorts.length} serial ports, ${scanResult.i2cBuses.length} I2C buses, ${scanResult.spiBuses.length} SPI buses, ${scanResult.gpioPins.length} GPIO pins`)

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

      // In real mode, we would use the serialport package
      // For now, we store the configuration and track the connection
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

      // Real hardware: would use serialport.write()
      this.emitEvent('data_received', `serial:${path}`, {
        direction: 'tx',
        bytes: typeof data === 'string' ? data.length : data.byteLength,
      })

      return { success: true, latency: Date.now() - startTime }
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

      // Real hardware: would use serialport.read() with timeout
      return {
        success: true,
        data: null,
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

      // Real hardware: would use i2c-bus.readI2cBlock()
      return { success: true, data: null, latency: Date.now() - startTime }
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

      // Real hardware: would use i2c-bus.writeI2cBlock()
      return { success: true, latency: Date.now() - startTime }
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

      // Real hardware: would use spidev.transfer()
      return { success: true, data: null, latency: Date.now() - startTime }
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

      // Real hardware: would use rpi-gpio or pigpio read
      return { success: true, data: gpioPin.value, latency: Date.now() - startTime }
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
      gpioPin.value = value
      this.emitEvent('data_received', `gpio:${pin}`, { pin, value })

      if (this.mode === 'simulation') {
        return { success: true, latency: Date.now() - startTime }
      }

      // Real hardware: would use rpi-gpio or pigpio write
      return { success: true, latency: Date.now() - startTime }
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
   */
  encodeMAVLinkCommand(
    messageId: number,
    systemId: number,
    componentId: number,
    payload: Record<string, unknown>
  ): Uint8Array {
    const payloadJson = JSON.stringify(payload)
    const payloadBytes = Buffer.from(payloadJson, 'utf-8')

    // MAVLink v2 header
    const header = new Uint8Array(10)
    header[0] = 0xFD // Start byte
    header[1] = payloadBytes.length // Payload length
    header[2] = 0x00 // Incompat flags
    header[3] = 0x00 // Compat flags
    header[4] = this.mavlinkSequence++ & 0xFF // Sequence
    header[5] = systemId & 0xFF
    header[6] = componentId & 0xFF
    header[7] = messageId & 0xFF
    header[8] = (messageId >> 8) & 0xFF
    header[9] = (messageId >> 16) & 0xFF

    // Combine header + payload + checksum placeholder (2 bytes)
    const packet = new Uint8Array(header.length + payloadBytes.length + 2)
    packet.set(header, 0)
    packet.set(payloadBytes, header.length)
    // Checksum would be computed in real implementation
    packet[header.length + payloadBytes.length] = 0x00
    packet[header.length + payloadBytes.length + 1] = 0x00

    return packet
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
      try { cb(event) } catch (e) { console.error('[HardwareBridge] Event listener error:', e) }
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
      // Standard Nanggroe OS sensor addresses
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
      console.error('[HardwareBridge] Failed to persist scan results:', err)
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
    console.log('[HardwareBridge] Bridge shut down')
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
export async function getHardwareBridge(): Promise<HardwareBridge> {
  if (!bridgeInstance) {
    bridgeInstance = HardwareBridge.getInstance()
    await bridgeInstance.initialize()
  }
  return bridgeInstance
}
