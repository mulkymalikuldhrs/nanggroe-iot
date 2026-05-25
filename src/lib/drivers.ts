// ============================================================
// NANGGROE OS AI - Device Driver Abstraction Layer
// Production-grade driver registry with lifecycle management,
// health checks, real DB-backed telemetry, event emission,
// and HardwareBridge pattern for real/simulated hardware.
// ============================================================

import { db } from './db'
import type { DeviceType, Protocol, TelemetryMetric } from './types'
import { TELEMETRY_UNITS } from './constants'

// --- Driver State Types ---

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionResult {
  success: boolean
  message: string
  latency?: number
}

export interface HealthCheckResult {
  healthy: boolean
  details: Record<string, unknown>
  latency: number
}

export interface WriteResult {
  success: boolean
  message: string
}

export interface DriverState {
  driverName: string
  deviceType: string
  connectionState: ConnectionState
  deviceId: string | null
  lastError: string | null
  lastHealthCheck: Date | null
}

export interface CommandResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
  simulated?: boolean
}

// --- Event Types ---

export type DriverEventType = 'connecting' | 'connected' | 'disconnected' | 'error' | 'health_check' | 'data_read' | 'data_write' | 'command_executed'

export interface DriverEvent {
  type: DriverEventType
  driverName: string
  deviceType: string
  timestamp: Date
  data?: unknown
}

type DriverEventCallback = (event: DriverEvent) => void

// ============================================================
// Hardware Bridge — Interface for real/simulated hardware I/O
// ============================================================

export type BridgeMode = 'simulation' | 'real'

export interface SerialPortConfig {
  path: string
  baudRate: number
  dataBits?: 5 | 6 | 7 | 8
  stopBits?: 1 | 2
  parity?: 'none' | 'even' | 'odd'
}

export interface I2CConfig {
  busNumber: number
  address: number
}

export interface SPIConfig {
  bus: number
  device: number
  speedHz: number
}

export interface GPIOConfig {
  pin: number
  direction: 'in' | 'out'
  edge?: 'none' | 'rising' | 'falling' | 'both'
  activeLow?: boolean
}

export interface ADCConfig {
  channel: number
  resolution: number
  voltageRef: number
}

export interface SerialReadResult {
  data: Buffer
  simulated: boolean
}

export interface I2CReadResult {
  data: Buffer
  simulated: boolean
}

export interface SPIReadResult {
  data: Buffer
  simulated: boolean
}

export interface GPIOReadResult {
  value: boolean
  simulated: boolean
}

export interface ADCReadResult {
  rawValue: number
  voltage: number
  simulated: boolean
}

export interface HardwareBridge {
  readonly mode: BridgeMode

  // Serial (UART/USB)
  openSerial(config: SerialPortConfig): Promise<void>
  closeSerial(path: string): Promise<void>
  readSerial(path: string, size?: number): Promise<SerialReadResult>
  writeSerial(path: string, data: Buffer): Promise<void>

  // I2C
  openI2C(config: I2CConfig): Promise<void>
  closeI2C(busNumber: number): Promise<void>
  readI2C(busNumber: number, address: number, length: number, register?: number): Promise<I2CReadResult>
  writeI2C(busNumber: number, address: number, register: number, data: Buffer): Promise<void>

  // SPI
  openSPI(config: SPIConfig): Promise<void>
  closeSPI(bus: number, device: number): Promise<void>
  transferSPI(bus: number, device: number, data: Buffer): Promise<SPIReadResult>

  // GPIO
  openGPIO(config: GPIOConfig): Promise<void>
  closeGPIO(pin: number): Promise<void>
  readGPIO(pin: number): Promise<GPIOReadResult>
  writeGPIO(pin: number, value: boolean): Promise<void>

  // ADC
  openADC(config: ADCConfig): Promise<void>
  closeADC(channel: number): Promise<void>
  readADC(channel: number): Promise<ADCReadResult>

  // Lifecycle
  closeAll(): Promise<void>
}

// ============================================================
// Simulation Bridge — Physics-based hardware simulation
// ============================================================

interface SimulationState {
  // Battery
  batteryConnectedAt: number | null
  batteryCapacityMah: number
  batteryCellCount: number
  batteryCurrentDraw: number // Amps
  batteryInitialChargeFraction: number

  // GPS
  gpsHomeLat: number
  gpsHomeLng: number
  gpsDriftMps: number // drift speed in m/s

  // Pixhawk/MAVLink
  pixhawkHeartbeatCount: number
  pixhawkArmed: boolean
  pixhawkFlightMode: string

  // RPi
  rpiCpuTempBase: number
  rpiMemUsageBase: number
  rpiDiskFreeBase: number

  // BME280
  bme280TempBase: number
  bme280HumidityBase: number
  bme280PressureBase: number

  // MPU6050
  mpu6050Roll: number
  mpu6050Pitch: number
  mpu6050Yaw: number

  // Radio
  radioRssiBase: number
  radioNoiseFloor: number

  // Camera
  cameraFramesCaptured: number
  cameraCapturing: boolean

  // Serial buffers
  serialPorts: Map<string, { open: boolean; config: SerialPortConfig; buffer: Buffer }>

  // I2C buses
  i2cBuses: Map<number, { open: boolean; addresses: Set<number> }>

  // SPI devices
  spiDevices: Map<string, { open: boolean }>

  // GPIO pins
  gpioPins: Map<number, { open: boolean; direction: 'in' | 'out'; value: boolean }>

  // ADC channels
  adcChannels: Map<number, { open: boolean; config: ADCConfig }>
}

function createDefaultSimulationState(): SimulationState {
  return {
    batteryConnectedAt: null,
    batteryCapacityMah: 4000,
    batteryCellCount: 4,
    batteryCurrentDraw: 8.5,
    batteryInitialChargeFraction: 1.0,

    gpsHomeLat: 4.9125,
    gpsHomeLng: 97.1347,
    gpsDriftMps: 0.3,

    pixhawkHeartbeatCount: 0,
    pixhawkArmed: false,
    pixhawkFlightMode: 'STABILIZE',

    rpiCpuTempBase: 45.0,
    rpiMemUsageBase: 38.0,
    rpiDiskFreeBase: 28000,

    bme280TempBase: 28.0,
    bme280HumidityBase: 78.0,
    bme280PressureBase: 1013.25,

    mpu6050Roll: 0,
    mpu6050Pitch: 0,
    mpu6050Yaw: 0,

    radioRssiBase: -45,
    radioNoiseFloor: -100,

    cameraFramesCaptured: 0,
    cameraCapturing: false,

    serialPorts: new Map(),
    i2cBuses: new Map(),
    spiDevices: new Map(),
    gpioPins: new Map(),
    adcChannels: new Map(),
  }
}

/** Simple deterministic-ish noise based on time and seed */
function noise(seed: number, amplitude: number, t: number): number {
  const x = Math.sin(seed * 12.9898 + t * 78.233) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 2 * amplitude
}

/** LiPo discharge curve approximation: voltage vs charge fraction */
function lipoVoltage(cellCount: number, chargeFraction: number): number {
  // Approximate single-cell voltage on a LiPo discharge curve
  // Full: 4.20V, nominal: 3.70V, empty: 3.00V
  const cf = Math.max(0, Math.min(1, chargeFraction))
  // Piecewise linear approximation of discharge curve
  let cellVoltage: number
  if (cf > 0.8) {
    // Rapid drop from 4.20 to ~3.90 in top 20%
    cellVoltage = 4.20 - (1.0 - cf) * 1.5
  } else if (cf > 0.2) {
    // Flat middle: ~3.90 to ~3.50 in middle 60%
    cellVoltage = 3.90 - (0.8 - cf) * 0.667
  } else {
    // Rapid drop from ~3.50 to 3.00 in bottom 20%
    cellVoltage = 3.50 - (0.2 - cf) * 2.5
  }
  return cellVoltage * cellCount
}

export class SimulationBridge implements HardwareBridge {
  readonly mode: BridgeMode = 'simulation'
  private state: SimulationState = createDefaultSimulationState()

  // --- Serial ---

  async openSerial(config: SerialPortConfig): Promise<void> {
    this.state.serialPorts.set(config.path, { open: true, config, buffer: Buffer.alloc(0) })
  }

  async closeSerial(path: string): Promise<void> {
    const port = this.state.serialPorts.get(path)
    if (port) port.open = false
    this.state.serialPorts.delete(path)
  }

  async readSerial(path: string, size = 64): Promise<SerialReadResult> {
    const port = this.state.serialPorts.get(path)
    if (!port || !port.open) {
      throw new Error(`Serial port ${path} is not open`)
    }
    // Simulate MAVLink heartbeat packet generation
    const t = Date.now() / 1000
    const fakeData = Buffer.alloc(Math.min(size, 64))
    for (let i = 0; i < fakeData.length; i++) {
      fakeData[i] = Math.floor(noise(i + 42, 64, t))
    }
    return { data: fakeData, simulated: true }
  }

  async writeSerial(_path: string, _data: Buffer): Promise<void> {
    // In simulation, writes are accepted but not forwarded
  }

  // --- I2C ---

  async openI2C(config: I2CConfig): Promise<void> {
    let bus = this.state.i2cBuses.get(config.busNumber)
    if (!bus) {
      bus = { open: true, addresses: new Set() }
      this.state.i2cBuses.set(config.busNumber, bus)
    }
    bus.open = true
    bus.addresses.add(config.address)
  }

  async closeI2C(busNumber: number): Promise<void> {
    const bus = this.state.i2cBuses.get(busNumber)
    if (bus) bus.open = false
    this.state.i2cBuses.delete(busNumber)
  }

  async readI2C(busNumber: number, address: number, length: number, _register?: number): Promise<I2CReadResult> {
    const bus = this.state.i2cBuses.get(busNumber)
    if (!bus || !bus.open) {
      throw new Error(`I2C bus ${busNumber} is not open`)
    }
    const t = Date.now() / 1000
    const data = Buffer.alloc(length)
    for (let i = 0; i < length; i++) {
      data[i] = Math.floor(noise(address + i, 64, t))
    }
    return { data, simulated: true }
  }

  async writeI2C(_busNumber: number, _address: number, _register: number, _data: Buffer): Promise<void> {
    // In simulation, writes are accepted but not forwarded
  }

  // --- SPI ---

  async openSPI(config: SPIConfig): Promise<void> {
    this.state.spiDevices.set(`${config.bus}:${config.device}`, { open: true })
  }

  async closeSPI(bus: number, device: number): Promise<void> {
    this.state.spiDevices.delete(`${bus}:${device}`)
  }

  async transferSPI(bus: number, device: number, data: Buffer): Promise<SPIReadResult> {
    const key = `${bus}:${device}`
    const dev = this.state.spiDevices.get(key)
    if (!dev || !dev.open) {
      throw new Error(`SPI device ${key} is not open`)
    }
    return { data: Buffer.alloc(data.length), simulated: true }
  }

  // --- GPIO ---

  async openGPIO(config: GPIOConfig): Promise<void> {
    this.state.gpioPins.set(config.pin, { open: true, direction: config.direction, value: false })
  }

  async closeGPIO(pin: number): Promise<void> {
    this.state.gpioPins.delete(pin)
  }

  async readGPIO(pin: number): Promise<GPIOReadResult> {
    const gpio = this.state.gpioPins.get(pin)
    if (!gpio || !gpio.open) {
      throw new Error(`GPIO pin ${pin} is not open`)
    }
    return { value: gpio.value, simulated: true }
  }

  async writeGPIO(pin: number, value: boolean): Promise<void> {
    const gpio = this.state.gpioPins.get(pin)
    if (!gpio || !gpio.open) {
      throw new Error(`GPIO pin ${pin} is not open`)
    }
    if (gpio.direction !== 'out') {
      throw new Error(`GPIO pin ${pin} is not configured for output`)
    }
    gpio.value = value
  }

  // --- ADC ---

  async openADC(config: ADCConfig): Promise<void> {
    this.state.adcChannels.set(config.channel, { open: true, config })
  }

  async closeADC(channel: number): Promise<void> {
    this.state.adcChannels.delete(channel)
  }

  async readADC(channel: number): Promise<ADCReadResult> {
    const adc = this.state.adcChannels.get(channel)
    if (!adc || !adc.open) {
      throw new Error(`ADC channel ${channel} is not open`)
    }
    const t = Date.now() / 1000
    // Simulate battery voltage reading through voltage divider
    const chargeFrac = this.getBatteryChargeFraction()
    const totalVoltage = lipoVoltage(this.state.batteryCellCount, chargeFrac)
    const dividedVoltage = totalVoltage / (this.state.batteryCellCount * 1.0) // simplified divider
    const rawValue = Math.floor((dividedVoltage / adc.config.voltageRef) * adc.config.resolution + noise(channel, 2, t))
    return {
      rawValue: Math.max(0, Math.min(adc.config.resolution, rawValue)),
      voltage: dividedVoltage + noise(channel, 0.01, t),
      simulated: true,
    }
  }

  // --- Lifecycle ---

  async closeAll(): Promise<void> {
    this.state.serialPorts.clear()
    this.state.i2cBuses.clear()
    this.state.spiDevices.clear()
    this.state.gpioPins.clear()
    this.state.adcChannels.clear()
  }

  // --- Simulation-specific accessors for drivers ---

  getState(): SimulationState {
    return this.state
  }

  /** Mark the battery as connected at the current time */
  setBatteryConnected(cellCount: number, capacityMah: number, currentDraw: number): void {
    this.state.batteryConnectedAt = Date.now()
    this.state.batteryCellCount = cellCount
    this.state.batteryCapacityMah = capacityMah
    this.state.batteryCurrentDraw = currentDraw
    this.state.batteryInitialChargeFraction = 1.0
  }

  /** Compute current charge fraction based on elapsed time and current draw */
  getBatteryChargeFraction(): number {
    if (this.state.batteryConnectedAt === null) return 1.0
    const elapsedMs = Date.now() - this.state.batteryConnectedAt
    const elapsedHours = elapsedMs / (1000 * 3600)
    const usedMah = this.state.batteryCurrentDraw * 1000 * elapsedHours
    const remainingMah = this.state.batteryCapacityMah * this.state.batteryInitialChargeFraction - usedMah
    return Math.max(0, Math.min(1, remainingMah / this.state.batteryCapacityMah))
  }

  /** Get simulated cell voltages */
  getBatteryCellVoltages(): number[] {
    const chargeFrac = this.getBatteryChargeFraction()
    const t = Date.now() / 1000
    const cells: number[] = []
    for (let i = 0; i < this.state.batteryCellCount; i++) {
      // Small per-cell variation
      const cellCharge = Math.max(0, Math.min(1, chargeFrac + noise(i + 7, 0.02, t)))
      cells.push(lipoVoltage(1, cellCharge))
    }
    return cells
  }

  /** Get simulated GPS position with drift */
  getGPSPosition(): { lat: number; lng: number; fixType: string; satellitesVisible: number; hdop: number; vdop: number } {
    const t = Date.now() / 1000
    // Drift in meters, convert to degrees approximately
    const driftLat = noise(1, this.state.gpsDriftMps * 0.00001, t)
    const driftLng = noise(2, this.state.gpsDriftMps * 0.00001, t * 1.3)
    return {
      lat: this.state.gpsHomeLat + driftLat,
      lng: this.state.gpsHomeLng + driftLng,
      fixType: '3D',
      satellitesVisible: Math.round(12 + noise(3, 2, t)),
      hdop: Math.max(0.5, 0.9 + noise(4, 0.3, t)),
      vdop: Math.max(0.8, 1.3 + noise(5, 0.4, t)),
    }
  }

  /** Get simulated Pixhawk attitude data */
  getPixhawkAttitude(): { roll: number; pitch: number; yaw: number; altitude: number; heading: number; speed: number; motorRpms: number[] } {
    const t = Date.now() / 1000
    const armed = this.state.pixhawkArmed
    const base = armed ? 1.0 : 0.1
    return {
      roll: noise(10, 2.0 * base, t),
      pitch: noise(11, 1.5 * base, t * 1.1),
      yaw: ((noise(12, 30 * base, t * 0.7) % 360) + 360) % 360,
      altitude: armed ? 50 + noise(13, 5, t) : noise(14, 0.5, t),
      heading: ((noise(15, 45 * base, t * 0.5) % 360) + 360) % 360,
      speed: armed ? 5 + noise(16, 2, t) : noise(17, 0.2, t),
      motorRpms: armed
        ? [
            Math.max(0, 4500 + noise(20, 200, t)),
            Math.max(0, 4500 + noise(21, 200, t * 1.1)),
            Math.max(0, 4500 + noise(22, 200, t * 0.9)),
          ]
        : [0, 0, 0],
    }
  }

  /** Get simulated RPi system data */
  getRPiSystemData(): { cpuTemp: number; memUsage: number; diskFree: number; wifiRssi: number; uptime: string } {
    const t = Date.now() / 1000
    return {
      cpuTemp: this.state.rpiCpuTempBase + noise(30, 3, t),
      memUsage: this.state.rpiMemUsageBase + noise(31, 5, t),
      diskFree: this.state.rpiDiskFreeBase - (Date.now() / 1000 / 3600) * 0.01, // very slow decrease
      wifiRssi: -52 + noise(32, 3, t),
      uptime: '0h 0m', // caller should compute from connection time
    }
  }

  /** Get simulated BME280 data */
  getBME280Data(): { temperature: number; humidity: number; pressure: number } {
    const t = Date.now() / 1000
    return {
      temperature: this.state.bme280TempBase + noise(40, 0.5, t),
      humidity: Math.max(0, Math.min(100, this.state.bme280HumidityBase + noise(41, 3, t))),
      pressure: this.state.bme280PressureBase + noise(42, 0.5, t),
    }
  }

  /** Get simulated MPU6050 data */
  getMPU6050Data(): { roll: number; pitch: number; yaw: number } {
    const t = Date.now() / 1000
    return {
      roll: noise(50, 3, t),
      pitch: noise(51, 2.5, t * 1.1),
      yaw: ((noise(52, 20, t * 0.7) % 360) + 360) % 360,
    }
  }

  /** Get simulated radio data */
  getRadioData(): { rssi: number; noiseFloor: number; linkQuality: number; txPower: number } {
    const t = Date.now() / 1000
    return {
      rssi: this.state.radioRssiBase + noise(60, 3, t),
      noiseFloor: this.state.radioNoiseFloor + noise(61, 2, t * 0.8),
      linkQuality: Math.max(0, Math.min(100, 98 + noise(62, 3, t * 0.5))),
      txPower: 20,
    }
  }

  /** Increment camera frames captured */
  incrementCameraFrames(): number {
    this.state.cameraFramesCaptured++
    return this.state.cameraFramesCaptured
  }

  /** Set camera capturing state */
  setCameraCapturing(capturing: boolean): void {
    this.state.cameraCapturing = capturing
  }

  getCameraCapturing(): boolean {
    return this.state.cameraCapturing
  }

  getCameraFramesCaptured(): number {
    return this.state.cameraFramesCaptured
  }

  /** Set Pixhawk armed state */
  setPixhawkArmed(armed: boolean): void {
    this.state.pixhawkArmed = armed
  }

  /** Set Pixhawk flight mode */
  setPixhawkFlightMode(mode: string): void {
    this.state.pixhawkFlightMode = mode
  }

  /** Increment heartbeat count */
  incrementHeartbeat(): number {
    this.state.pixhawkHeartbeatCount++
    return this.state.pixhawkHeartbeatCount
  }
}

// ============================================================
// Real Hardware Bridge — Uses native npm packages on Raspberry Pi
// ============================================================

interface NativeModules {
  serialport: typeof import('serialport') | null
  i2cBus: any // eslint-disable-line @typescript-eslint/no-explicit-any -- native i2c-bus module, types unavailable
  rpiGpio: any // eslint-disable-line @typescript-eslint/no-explicit-any -- native rpi-gpio module, types unavailable
}

let nativeModules: NativeModules | null = null

function loadNativeModules(): NativeModules {
  if (nativeModules !== null) return nativeModules

  let serialport: NativeModules['serialport'] = null
  let i2cBus: NativeModules['i2cBus'] = null
  let rpiGpio: NativeModules['rpiGpio'] = null

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    serialport = require('serialport')
  } catch {
    console.warn('[HardwareBridge] serialport not available — serial communication disabled')
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    i2cBus = require('i2c-bus')
  } catch {
    console.warn('[HardwareBridge] i2c-bus not available — I2C communication disabled')
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rpiGpio = require('rpi-gpio')
  } catch {
    console.warn('[HardwareBridge] rpi-gpio not available — GPIO communication disabled')
  }

  nativeModules = { serialport, i2cBus, rpiGpio }
  return nativeModules
}

export class RealHardwareBridge implements HardwareBridge {
  readonly mode: BridgeMode = 'real'
  private serialPorts: Map<string, InstanceType<typeof import('serialport').SerialPort> | null> = new Map()
  private i2cBuses: Map<number, unknown> = new Map()
  private gpioPins: Map<number, unknown> = new Map()
  private adcChannels: Map<number, ADCConfig> = new Map()

  private get native(): NativeModules {
    return loadNativeModules()
  }

  // --- Serial ---

  async openSerial(config: SerialPortConfig): Promise<void> {
    if (!this.native.serialport) {
      throw new Error('serialport package not available. Install with: npm install serialport')
    }
    const { SerialPort } = this.native.serialport
    const port = new SerialPort({
      path: config.path,
      baudRate: config.baudRate,
      dataBits: config.dataBits ?? 8,
      stopBits: config.stopBits ?? 1,
      parity: config.parity ?? 'none',
      autoOpen: false,
    })
    await new Promise<void>((resolve, reject) => {
      port.open((err?: Error | null) => {
        if (err) reject(new Error(`Failed to open serial port ${config.path}: ${err.message}`))
        else resolve()
      })
    })
    this.serialPorts.set(config.path, port as InstanceType<typeof import('serialport').SerialPort>)
  }

  async closeSerial(path: string): Promise<void> {
    const port = this.serialPorts.get(path)
    if (port) {
      await new Promise<void>((resolve, reject) => {
        port.close((err?: Error | null) => {
          if (err) reject(new Error(`Failed to close serial port ${path}: ${err.message}`))
          else resolve()
        })
      })
      this.serialPorts.delete(path)
    }
  }

  async readSerial(path: string, size = 64): Promise<SerialReadResult> {
    const port = this.serialPorts.get(path)
    if (!port) {
      throw new Error(`Serial port ${path} is not open`)
    }
    const data = port.read(size) as Buffer | null
    if (data === null) {
      return { data: Buffer.alloc(0), simulated: false }
    }
    return { data, simulated: false }
  }

  async writeSerial(path: string, data: Buffer): Promise<void> {
    const port = this.serialPorts.get(path)
    if (!port) {
      throw new Error(`Serial port ${path} is not open`)
    }
    await new Promise<void>((resolve, reject) => {
      port.write(data, (err?: Error | null) => {
        if (err) reject(new Error(`Failed to write to serial port ${path}: ${err.message}`))
        else resolve()
      })
    })
  }

  // --- I2C ---

  async openI2C(config: I2CConfig): Promise<void> {
    if (!this.native.i2cBus) {
      throw new Error('i2c-bus package not available. Install with: npm install i2c-bus')
    }
    const bus = await new Promise<unknown>((resolve, reject) => {
      try {
        const b = this.native.i2cBus!.openPromisified(config.busNumber)
        resolve(b)
      } catch (err) {
        reject(new Error(`Failed to open I2C bus ${config.busNumber}: ${err instanceof Error ? err.message : 'Unknown'}`))
      }
    })
    this.i2cBuses.set(config.busNumber, bus)
  }

  async closeI2C(busNumber: number): Promise<void> {
    const bus = this.i2cBuses.get(busNumber) as { close?: () => Promise<void> } | undefined
    if (bus && typeof bus.close === 'function') {
      await bus.close()
    }
    this.i2cBuses.delete(busNumber)
  }

  async readI2C(busNumber: number, address: number, length: number, register?: number): Promise<I2CReadResult> {
    const bus = this.i2cBuses.get(busNumber) as {
      readI2cBlock?: (addr: number, cmd: number, len: number, buf: Buffer) => Promise<{ bytesRead: number; buffer: Buffer }>
      i2cRead?: (addr: number, length: number, buf: Buffer) => Promise<{ bytesRead: number; buffer: Buffer }>
    } | undefined
    if (!bus) {
      throw new Error(`I2C bus ${busNumber} is not open`)
    }
    const buf = Buffer.alloc(length)
    let data: Buffer
    if (register !== undefined && typeof bus.readI2cBlock === 'function') {
      const result = await bus.readI2cBlock(address, register, length, buf)
      data = result.buffer
    } else if (typeof bus.i2cRead === 'function') {
      const result = await bus.i2cRead(address, length, buf)
      data = result.buffer
    } else {
      data = buf
    }
    return { data, simulated: false }
  }

  async writeI2C(busNumber: number, address: number, register: number, data: Buffer): Promise<void> {
    const bus = this.i2cBuses.get(busNumber) as {
      writeI2cBlock?: (addr: number, cmd: number, len: number, buf: Buffer) => Promise<{ bytesWritten: number }>
      i2cWrite?: (addr: number, length: number, buf: Buffer) => Promise<{ bytesWritten: number }>
    } | undefined
    if (!bus) {
      throw new Error(`I2C bus ${busNumber} is not open`)
    }
    if (typeof bus.writeI2cBlock === 'function') {
      await bus.writeI2cBlock(address, register, data.length, data)
    } else if (typeof bus.i2cWrite === 'function') {
      await bus.i2cWrite(address, data.length, data)
    }
  }

  // --- SPI ---

  async openSPI(_config: SPIConfig): Promise<void> {
    // SPI on RPi typically uses spidev via fs operations
    // For now, throw — can be implemented with a dedicated package
    throw new Error('SPI bridge not yet implemented for real hardware. Use simulation mode for SPI devices.')
  }

  async closeSPI(_bus: number, _device: number): Promise<void> {
    // No-op
  }

  async transferSPI(_bus: number, _device: number, _data: Buffer): Promise<SPIReadResult> {
    throw new Error('SPI bridge not yet implemented for real hardware.')
  }

  // --- GPIO ---

  async openGPIO(config: GPIOConfig): Promise<void> {
    if (!this.native.rpiGpio) {
      throw new Error('rpi-gpio package not available. Install with: npm install rpi-gpio')
    }
    const gpio = this.native.rpiGpio
    await new Promise<void>((resolve, reject) => {
      gpio.setup(config.pin, config.direction === 'in' ? gpio.DIR_IN : gpio.DIR_OUT, (err?: Error | null) => {
        if (err) reject(new Error(`Failed to setup GPIO pin ${config.pin}: ${err.message}`))
        else resolve()
      })
    })
    this.gpioPins.set(config.pin, { direction: config.direction })
  }

  async closeGPIO(pin: number): Promise<void> {
    const gpio = this.native.rpiGpio
    if (gpio && this.gpioPins.has(pin)) {
      try {
        await new Promise<void>((resolve) => {
          gpio.unexport(pin, () => resolve())
        })
      } catch {
        // Ignore close errors
      }
    }
    this.gpioPins.delete(pin)
  }

  async readGPIO(pin: number): Promise<GPIOReadResult> {
    if (!this.native.rpiGpio) {
      throw new Error('rpi-gpio package not available')
    }
    const gpio = this.native.rpiGpio
    const value = await new Promise<boolean>((resolve, reject) => {
      gpio.read(pin, (err?: Error | null, value?: boolean) => {
        if (err) reject(new Error(`Failed to read GPIO pin ${pin}: ${err.message}`))
        else resolve(value ?? false)
      })
    })
    return { value, simulated: false }
  }

  async writeGPIO(pin: number, value: boolean): Promise<void> {
    if (!this.native.rpiGpio) {
      throw new Error('rpi-gpio package not available')
    }
    const gpio = this.native.rpiGpio
    await new Promise<void>((resolve, reject) => {
      gpio.write(pin, value, (err?: Error | null) => {
        if (err) reject(new Error(`Failed to write GPIO pin ${pin}: ${err.message}`))
        else resolve()
      })
    })
  }

  // --- ADC ---

  async openADC(config: ADCConfig): Promise<void> {
    // ADC on RPi typically requires an external ADC chip (e.g. ADS1115) over I2C
    // or an MCP3008 over SPI. Store config for reference.
    this.adcChannels.set(config.channel, config)
  }

  async closeADC(channel: number): Promise<void> {
    this.adcChannels.delete(channel)
  }

  async readADC(channel: number): Promise<ADCReadResult> {
    // Real ADC reading would go through I2C/SPI to the actual ADC chip
    // This requires the specific ADC chip driver. For now, throw if no
    // underlying I2C/SPI connection is configured.
    const config = this.adcChannels.get(channel)
    if (!config) {
      throw new Error(`ADC channel ${channel} is not configured`)
    }
    // In production, you'd read from an ADS1115 or MCP3008 here
    throw new Error(
      `Direct ADC read on channel ${channel} not supported. ` +
      `Use an I2C ADC (e.g. ADS1115) or SPI ADC (e.g. MCP3008) and read via I2C/SPI bridge.`
    )
  }

  // --- Lifecycle ---

  async closeAll(): Promise<void> {
    const errors: string[] = []

    for (const [path] of this.serialPorts) {
      try {
        await this.closeSerial(path)
      } catch (err) {
        errors.push(`Serial ${path}: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }

    for (const [busNumber] of this.i2cBuses) {
      try {
        await this.closeI2C(busNumber)
      } catch (err) {
        errors.push(`I2C bus ${busNumber}: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }

    for (const [pin] of this.gpioPins) {
      try {
        await this.closeGPIO(pin)
      } catch (err) {
        errors.push(`GPIO pin ${pin}: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }

    this.adcChannels.clear()

    if (errors.length > 0) {
      console.warn('[RealHardwareBridge] Errors during closeAll:', errors)
    }
  }
}

// ============================================================
// HardwareBridgeManager — Singleton manager for bridge mode
// ============================================================

export class HardwareBridgeManager {
  private static instance: HardwareBridgeManager
  private currentMode: BridgeMode = 'simulation'
  private simulationBridge: SimulationBridge
  private realBridge: RealHardwareBridge | null = null
  private realBridgeAvailable: boolean | null = null

  private constructor() {
    this.simulationBridge = new SimulationBridge()
  }

  static getInstance(): HardwareBridgeManager {
    if (!HardwareBridgeManager.instance) {
      HardwareBridgeManager.instance = new HardwareBridgeManager()
    }
    return HardwareBridgeManager.instance
  }

  /** Get the current active bridge */
  getBridge(): HardwareBridge {
    if (this.currentMode === 'real' && this.realBridge) {
      return this.realBridge
    }
    return this.simulationBridge
  }

  /** Get the current bridge mode */
  getMode(): BridgeMode {
    return this.currentMode
  }

  /** Check if real hardware bridge is available */
  isRealHardwareAvailable(): boolean {
    if (this.realBridgeAvailable === null) {
      const modules = loadNativeModules()
      this.realBridgeAvailable = !!(modules.serialport || modules.i2cBus || modules.rpiGpio)
    }
    return this.realBridgeAvailable
  }

  /**
   * Switch to real hardware mode.
   * Falls back to simulation if native modules are unavailable.
   */
  async setRealMode(): Promise<{ mode: BridgeMode; message: string }> {
    if (!this.isRealHardwareAvailable()) {
      console.warn('[HardwareBridgeManager] Native hardware modules not available, staying in simulation mode')
      this.currentMode = 'simulation'
      return {
        mode: 'simulation',
        message: 'Native hardware modules (serialport/i2c-bus/rpi-gpio) not available. Staying in simulation mode.',
      }
    }

    try {
      if (!this.realBridge) {
        this.realBridge = new RealHardwareBridge()
      }
      this.currentMode = 'real'
      return { mode: 'real', message: 'Switched to real hardware mode' }
    } catch (err) {
      console.error('[HardwareBridgeManager] Failed to initialize real hardware bridge:', err)
      this.currentMode = 'simulation'
      return {
        mode: 'simulation',
        message: `Failed to initialize real hardware: ${err instanceof Error ? err.message : 'Unknown'}. Falling back to simulation.`,
      }
    }
  }

  /** Switch to simulation mode */
  setSimulationMode(): void {
    this.currentMode = 'simulation'
    console.info('[HardwareBridgeManager] Switched to simulation mode')
  }

  /** Get the simulation bridge directly (for simulation-specific accessors) */
  getSimulationBridge(): SimulationBridge {
    return this.simulationBridge
  }

  /** Get the real bridge directly (null if not initialized) */
  getRealBridge(): RealHardwareBridge | null {
    return this.realBridge
  }

  /** Close all bridge connections */
  async shutdown(): Promise<void> {
    await this.simulationBridge.closeAll()
    if (this.realBridge) {
      await this.realBridge.closeAll()
    }
  }
}

// ============================================================
// MAVLink Parser — Minimal MAVLink v1/v2 packet parser
// ============================================================

const MAVLINK_V1_STX = 0xFE
const MAVLINK_V2_STX = 0xFD

interface MAVLinkHeader {
  version: 1 | 2
  payloadLength: number
  sequence: number
  systemId: number
  componentId: number
  messageId: number
}

interface MAVLinkPacket {
  header: MAVLinkHeader
  payload: Buffer
  checksum: number
}

function parseMAVLinkPacket(buffer: Buffer): MAVLinkPacket | null {
  if (buffer.length < 8) return null

  const stx = buffer[0]

  if (stx === MAVLINK_V2_STX) {
    if (buffer.length < 12) return null
    const payloadLength = buffer[1]
    const incompatFlags = buffer[2]
    const compatFlags = buffer[3]
    const sequence = buffer[4]
    const systemId = buffer[5]
    const componentId = buffer[6]
    const messageId = buffer[7] | (buffer[8] << 8) | (buffer[9] << 16)
    const totalLength = 12 + payloadLength + ((incompatFlags & 0x01) ? 13 : 0) + 2
    if (buffer.length < totalLength) return null
    const payload = buffer.subarray(12, 12 + payloadLength)
    const checksumOffset = 12 + payloadLength + ((incompatFlags & 0x01) ? 13 : 0)
    const checksum = buffer[checksumOffset] | (buffer[checksumOffset + 1] << 8)
    return {
      header: { version: 2, payloadLength, sequence, systemId, componentId, messageId },
      payload,
      checksum,
    }
  }

  if (stx === MAVLINK_V1_STX) {
    const payloadLength = buffer[1]
    const sequence = buffer[2]
    const systemId = buffer[3]
    const componentId = buffer[4]
    const messageId = buffer[5]
    const totalLength = 6 + payloadLength + 2
    if (buffer.length < totalLength) return null
    const payload = buffer.subarray(6, 6 + payloadLength)
    const checksum = buffer[6 + payloadLength] | (buffer[6 + payloadLength + 1] << 8)
    return {
      header: { version: 1, payloadLength, sequence, systemId, componentId, messageId },
      payload,
      checksum,
    }
  }

  return null
}

/** Extract attitude data from MAVLink HEARTBEAT (#0) and ATTITUDE (#30) messages */
function extractMAVLinkAttitude(packets: MAVLinkPacket[]): {
  heartbeatReceived: boolean
  armed: boolean
  flightMode: number
  roll: number
  pitch: number
  yaw: number
} {
  let heartbeatReceived = false
  let armed = false
  let flightMode = 0
  let roll = 0
  let pitch = 0
  let yaw = 0

  for (const pkt of packets) {
    if (pkt.header.messageId === 0) {
      // HEARTBEAT
      heartbeatReceived = true
      if (pkt.payload.length >= 6) {
        const customMode = pkt.payload.readUInt32LE(0)
        const baseMode = pkt.payload[4]
        armed = (baseMode & 0x80) !== 0
        flightMode = customMode
      }
    } else if (pkt.header.messageId === 30) {
      // ATTITUDE
      if (pkt.payload.length >= 24) {
        roll = pkt.payload.readFloatLE(0) * (180 / Math.PI)
        pitch = pkt.payload.readFloatLE(4) * (180 / Math.PI)
        yaw = pkt.payload.readFloatLE(8) * (180 / Math.PI)
      }
    }
  }

  return { heartbeatReceived, armed, flightMode, roll, pitch, yaw }
}

// ============================================================
// Abstract DeviceDriver — Base class for all hardware drivers
// ============================================================

export abstract class DeviceDriver {
  abstract readonly driverName: string
  abstract readonly deviceType: string
  abstract readonly supportedProtocols: string[]

  protected deviceId: string | null = null
  protected connectionState: ConnectionState = 'disconnected'
  protected lastError: string | null = null
  protected config: Record<string, unknown> = {}
  protected lastHealthCheckTime: Date | null = null
  protected connectedAt: Date | null = null

  private eventListeners: DriverEventCallback[] = []

  abstract connect(deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult>
  abstract disconnect(): Promise<void>
  abstract healthCheck(): Promise<HealthCheckResult>
  abstract readData(): Promise<Record<string, unknown>>
  abstract writeData(data: Record<string, unknown>): Promise<WriteResult>

  /** Execute a hardware command (e.g. arm, takeoff, capture photo) */
  abstract executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResult>

  // --- Event Emitter ---

  onEvent(callback: DriverEventCallback): () => void {
    this.eventListeners.push(callback)
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback)
    }
  }

  protected emitEvent(type: DriverEventType, data?: unknown): void {
    const event: DriverEvent = {
      type,
      driverName: this.driverName,
      deviceType: this.deviceType,
      timestamp: new Date(),
      data,
    }
    for (const cb of this.eventListeners) {
      try { cb(event) } catch (e) { console.error(`[Driver Event] Error in listener:`, e) }
    }
  }

  // --- State Accessors ---

  getState(): DriverState {
    return {
      driverName: this.driverName,
      deviceType: this.deviceType,
      connectionState: this.connectionState,
      deviceId: this.deviceId,
      lastError: this.lastError,
      lastHealthCheck: this.lastHealthCheckTime,
    }
  }

  isConnected(): boolean {
    return this.connectionState === 'connected'
  }

  getLastError(): string | null {
    return this.lastError
  }

  // --- Bridge Helper ---

  protected getBridgeManager(): HardwareBridgeManager {
    return HardwareBridgeManager.getInstance()
  }

  protected isSimulated(): boolean {
    return this.getBridgeManager().getMode() === 'simulation'
  }

  // --- DB Helpers ---

  protected async findDeviceInDb(deviceId: string) {
    return db.hardwareDevice.findUnique({
      where: { id: deviceId },
      include: { profiles: true },
    })
  }

  protected async updateDeviceStatus(deviceId: string, status: string) {
    return db.hardwareDevice.update({
      where: { id: deviceId },
      data: { status, lastSeen: new Date() },
    })
  }

  protected async readTelemetryFromDb(deviceId: string, metrics: TelemetryMetric[]) {
    const readings = await db.telemetryReading.findMany({
      where: {
        deviceId,
        metric: { in: metrics },
      },
      orderBy: { timestamp: 'desc' },
      take: metrics.length * 2,
    })
    const result: Record<string, unknown> = {}
    for (const r of readings) {
      if (!(r.metric in result)) {
        result[r.metric] = r.value
      }
    }
    return result
  }

  protected async writeTelemetryToDb(deviceId: string, data: Record<string, unknown>) {
    const writes: Promise<unknown>[] = []
    for (const [metric, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        writes.push(
          db.telemetryReading.create({
            data: {
              deviceId,
              metric,
              value,
              unit: TELEMETRY_UNITS[metric as TelemetryMetric] || null,
              source: 'sensor',
            },
          })
        )
      }
    }
    if (writes.length > 0) await Promise.all(writes)
  }

  /** Format uptime from connection time */
  protected getUptime(): string {
    if (!this.connectedAt) return '0h 0m'
    const elapsedMs = Date.now() - this.connectedAt.getTime()
    const hours = Math.floor(elapsedMs / 3600000)
    const minutes = Math.floor((elapsedMs % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }
}

// ============================================================
// Concrete Driver Implementations
// ============================================================

// --- PixhawkDriver ---
// Flight controller via MAVLink over UART

export class PixhawkDriver extends DeviceDriver {
  readonly driverName = 'Pixhawk 4 Driver'
  readonly deviceType: DeviceType = 'flight_controller'
  readonly supportedProtocols: Protocol[] = ['uart', 'usb']

  async connect(deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult> {
    this.connectionState = 'connecting'
    this.emitEvent('connecting')
    try {
      const device = await this.findDeviceInDb(deviceId)
      if (!device) {
        this.connectionState = 'error'
        this.lastError = `Device not found in DB: ${deviceId}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }

      if (device.deviceType !== 'flight_controller') {
        this.connectionState = 'error'
        this.lastError = `Device type mismatch: expected flight_controller, got ${device.deviceType}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }

      const port = device.port || '/dev/ttyAMA0'
      const baudRate = config?.baudRate ?? 57600
      const startTime = Date.now()

      // Open serial port through bridge
      const bridge = this.getBridgeManager().getBridge()
      try {
        await bridge.openSerial({
          path: port,
          baudRate: baudRate as number,
        })
      } catch (bridgeErr) {
        // Bridge open failed — but we can still track the device in DB
        console.warn(`[PixhawkDriver] Bridge open failed for ${port}: ${bridgeErr instanceof Error ? bridgeErr.message : bridgeErr}`)
      }

      await this.updateDeviceStatus(deviceId, 'active')

      this.deviceId = deviceId
      this.config = { port, baudRate, protocol: 'mavlink', ...(config || {}) }
      this.connectionState = 'connected'
      this.connectedAt = new Date()
      this.lastError = null
      this.emitEvent('connected', { port, baudRate, mode: this.getBridgeManager().getMode() })

      const latency = Date.now() - startTime
      const modeLabel = this.isSimulated() ? 'simulation' : 'real hardware'
      return {
        success: true,
        message: `Connected to Pixhawk 4 on ${port} at ${baudRate} baud (MAVLink v2) [${modeLabel}]`,
        latency,
      }
    } catch (err) {
      this.connectionState = 'error'
      this.lastError = err instanceof Error ? err.message : 'Unknown connection error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError }
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      const port = this.config.port as string | undefined
      if (port) {
        try {
          await this.getBridgeManager().getBridge().closeSerial(port)
        } catch {
          // Ignore close errors
        }
      }
      await this.updateDeviceStatus(this.deviceId, 'offline')
    }
    this.connectionState = 'disconnected'
    this.deviceId = null
    this.connectedAt = null
    this.emitEvent('disconnected')
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    if (!this.isConnected() || !this.deviceId) {
      return { healthy: false, details: { error: 'Not connected' }, latency: Date.now() - startTime }
    }
    try {
      const device = await this.findDeviceInDb(this.deviceId)
      const dbHealthy = device?.status === 'active'
      const simulated = this.isSimulated()

      let heartbeatOk = false
      if (!simulated) {
        // In real mode, try to read a MAVLink heartbeat
        try {
          const port = this.config.port as string
          const serialResult = await this.getBridgeManager().getBridge().readSerial(port, 280)
          const packet = parseMAVLinkPacket(serialResult.data)
          heartbeatOk = packet !== null && packet.header.messageId === 0
        } catch {
          heartbeatOk = false
        }
      } else {
        // In simulation, always "heartbeat ok" if connected
        heartbeatOk = true
      }

      const healthy = dbHealthy && (simulated || heartbeatOk)
      this.lastHealthCheckTime = new Date()
      this.emitEvent('health_check', { healthy, simulated })
      return {
        healthy,
        details: {
          status: device?.status,
          firmware: device?.firmware,
          port: device?.port,
          mavlinkVersion: 2,
          heartbeat: heartbeatOk ? 'ok' : 'timeout',
          mode: simulated ? 'simulation' : 'real',
        },
        latency: Date.now() - startTime,
      }
    } catch (err) {
      return { healthy: false, details: { error: err instanceof Error ? err.message : 'Unknown' }, latency: Date.now() - startTime }
    }
  }

  async readData(): Promise<Record<string, unknown>> {
    if (!this.isConnected() || !this.deviceId) {
      this.emitEvent('error', 'Cannot read: not connected')
      return { error: 'Not connected' }
    }
    try {
      const simulated = this.isSimulated()

      if (simulated) {
        // Simulation: use physics-based models
        const simBridge = this.getBridgeManager().getSimulationBridge()
        const attitude = simBridge.getPixhawkAttitude()
        const gps = simBridge.getGPSPosition()
        const heartbeatCount = simBridge.incrementHeartbeat()

        const data: Record<string, unknown> = {
          roll: attitude.roll,
          pitch: attitude.pitch,
          yaw: attitude.yaw,
          altitude: attitude.altitude,
          heading: attitude.heading,
          speed: attitude.speed,
          motor_rpm_1: attitude.motorRpms[0],
          motor_rpm_2: attitude.motorRpms[1],
          motor_rpm_3: attitude.motorRpms[2],
          flightMode: simBridge.getState().pixhawkFlightMode,
          armingStatus: simBridge.getState().pixhawkArmed ? 'ARMED' : 'DISARMED',
          mavlinkPackets: heartbeatCount,
          gpsLat: gps.lat,
          gpsLng: gps.lng,
          simulated: true,
        }

        // Persist to telemetry DB
        await this.writeTelemetryToDb(this.deviceId, {
          roll: data.roll as number,
          pitch: data.pitch as number,
          yaw: data.yaw as number,
          altitude: data.altitude as number,
          heading: data.heading as number,
          speed: data.speed as number,
        })

        this.emitEvent('data_read', data)
        return data
      }

      // Real mode: read MAVLink packets from serial
      const port = this.config.port as string
      const serialResult = await this.getBridgeManager().getBridge().readSerial(port, 4096)

      // Parse all MAVLink packets in the buffer
      const packets: MAVLinkPacket[] = []
      let offset = 0
      while (offset < serialResult.data.length) {
        const remaining = serialResult.data.subarray(offset)
        const packet = parseMAVLinkPacket(remaining)
        if (packet) {
          packets.push(packet)
          const packetSize = packet.header.version === 2
            ? 12 + packet.header.payloadLength + 2
            : 6 + packet.header.payloadLength + 2
          offset += packetSize
        } else {
          offset++
        }
      }

      const attitude = extractMAVLinkAttitude(packets)

      // Also get latest telemetry from DB for metrics not in current packet
      const dbData = await this.readTelemetryFromDb(this.deviceId, [
        'altitude', 'heading', 'speed', 'roll', 'pitch', 'yaw',
        'motor_rpm_1', 'motor_rpm_2', 'motor_rpm_3',
      ])

      const data: Record<string, unknown> = {
        ...dbData,
        roll: attitude.roll,
        pitch: attitude.pitch,
        yaw: attitude.yaw,
        flightMode: attitude.armed ? 'ARMED' : 'DISARMED',
        armingStatus: attitude.armed ? 'ARMED' : 'DISARMED',
        mavlinkPackets: packets.length,
        heartbeatReceived: attitude.heartbeatReceived,
        simulated: false,
      }

      // Persist parsed data
      await this.writeTelemetryToDb(this.deviceId, {
        roll: attitude.roll,
        pitch: attitude.pitch,
        yaw: attitude.yaw,
      })

      this.emitEvent('data_read', data)
      return data
    } catch (err) {
      this.emitEvent('error', err)
      return { error: err instanceof Error ? err.message : 'Read error' }
    }
  }

  async writeData(data: Record<string, unknown>): Promise<WriteResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot write: not connected' }
    }
    try {
      await this.writeTelemetryToDb(this.deviceId, data)
      this.emitEvent('data_write', data)
      return { success: true, message: 'Data written to Pixhawk telemetry store' }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Write error'
      return { success: false, message: this.lastError }
    }
  }

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot execute command: not connected', simulated: this.isSimulated() }
    }

    const simulated = this.isSimulated()

    try {
      switch (command) {
        case 'arm': {
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setPixhawkArmed(true)
            this.emitEvent('command_executed', { command, params, simulated: true })
            return { success: true, message: 'Vehicle ARMED (simulated)', simulated: true }
          }
          // Real: send MAVLink ARM command (command_long #76, param1=1)
          {
            const port = this.config.port as string
            const armPacket = this.buildMAVLinkCommandLong(76, 1)
            await this.getBridgeManager().getBridge().writeSerial(port, armPacket)
            this.emitEvent('command_executed', { command, params, simulated: false })
            return { success: true, message: 'ARM command sent via MAVLink', simulated: false }
          }
        }

        case 'disarm': {
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setPixhawkArmed(false)
            this.emitEvent('command_executed', { command, params, simulated: true })
            return { success: true, message: 'Vehicle DISARMED (simulated)', simulated: true }
          }
          {
            const port = this.config.port as string
            const disarmPacket = this.buildMAVLinkCommandLong(76, 0)
            await this.getBridgeManager().getBridge().writeSerial(port, disarmPacket)
            this.emitEvent('command_executed', { command, params, simulated: false })
            return { success: true, message: 'DISARM command sent via MAVLink', simulated: false }
          }
        }

        case 'setFlightMode': {
          const mode = (params?.mode as string) ?? 'STABILIZE'
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setPixhawkFlightMode(mode)
            this.emitEvent('command_executed', { command, params, simulated: true })
            return { success: true, message: `Flight mode set to ${mode} (simulated)`, simulated: true }
          }
          {
            const port = this.config.port as string
            const modeMap: Record<string, number> = {
              STABILIZE: 0, ACRO: 1, ALT_HOLD: 2, AUTO: 3, GUIDED: 4, LOITER: 5, RTL: 6, CIRCLE: 7, LAND: 9,
            }
            const modeNum = modeMap[mode] ?? 0
            const modePacket = this.buildMAVLinkCommandLong(76, modeNum)
            await this.getBridgeManager().getBridge().writeSerial(port, modePacket)
            this.emitEvent('command_executed', { command, params, simulated: false })
            return { success: true, message: `Flight mode ${mode} command sent via MAVLink`, simulated: false }
          }
        }

        case 'takeoff': {
          const altitude = (params?.altitude as number) ?? 10
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setPixhawkArmed(true)
            this.emitEvent('command_executed', { command, params, simulated: true })
            return { success: true, message: `Takeoff to ${altitude}m (simulated)`, data: { altitude }, simulated: true }
          }
          {
            const port = this.config.port as string
            const takeoffPacket = this.buildMAVLinkCommandLong(22, 0, 0, 0, 0, altitude)
            await this.getBridgeManager().getBridge().writeSerial(port, takeoffPacket)
            this.emitEvent('command_executed', { command, params, simulated: false })
            return { success: true, message: `Takeoff to ${altitude}m command sent via MAVLink`, data: { altitude }, simulated: false }
          }
        }

        case 'land': {
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setPixhawkArmed(false)
            this.emitEvent('command_executed', { command, params, simulated: true })
            return { success: true, message: 'LAND command executed (simulated)', simulated: true }
          }
          {
            const port = this.config.port as string
            const landPacket = this.buildMAVLinkCommandLong(76, 9)
            await this.getBridgeManager().getBridge().writeSerial(port, landPacket)
            this.emitEvent('command_executed', { command, params, simulated: false })
            return { success: true, message: 'LAND command sent via MAVLink', simulated: false }
          }
        }

        case 'rtl': {
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setPixhawkFlightMode('RTL')
            this.emitEvent('command_executed', { command, params, simulated: true })
            return { success: true, message: 'Return-to-Launch executed (simulated)', simulated: true }
          }
          {
            const port = this.config.port as string
            const rtlPacket = this.buildMAVLinkCommandLong(76, 6)
            await this.getBridgeManager().getBridge().writeSerial(port, rtlPacket)
            this.emitEvent('command_executed', { command, params, simulated: false })
            return { success: true, message: 'RTL command sent via MAVLink', simulated: false }
          }
        }

        default:
          return { success: false, message: `Unknown command: ${command}. Supported: arm, disarm, setFlightMode, takeoff, land, rtl`, simulated }
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Command execution error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError, simulated }
    }
  }

  /** Build a minimal MAVLink v1 COMMAND_LONG packet */
  private buildMAVLinkCommandLong(commandId: number, param1: number, param2 = 0, param3 = 0, param4 = 0, param5 = 0): Buffer {
    // MAVLink v1 COMMAND_LONG (#76) packet structure
    const payloadLength = 33
    const buf = Buffer.alloc(6 + payloadLength + 2)
    buf[0] = MAVLINK_V1_STX           // STX
    buf[1] = payloadLength             // payload length
    buf[2] = 0                         // sequence (simplified)
    buf[3] = 255                       // system ID (GCS)
    buf[4] = 0                         // component ID
    buf[5] = 76                        // message ID = COMMAND_LONG
    // Payload
    buf.writeFloatLE(param1, 6)        // param1
    buf.writeFloatLE(param2, 10)       // param2
    buf.writeFloatLE(param3, 14)       // param3
    buf.writeFloatLE(param4, 18)       // param4
    buf.writeFloatLE(param5, 22)       // param5
    buf.writeFloatLE(0, 26)            // param6
    buf.writeFloatLE(0, 30)            // param7
    buf.writeUInt16LE(commandId, 34)   // command
    buf[36] = 0                        // target system
    buf[37] = 0                        // target component
    buf[38] = 0                        // confirmation
    // Checksum (simplified — real MAVLink uses X.25 CRC)
    let crc = 0xFFFF
    for (let i = 1; i < 6 + payloadLength; i++) {
      crc ^= buf[i] & 0xFF
      for (let j = 0; j < 8; j++) {
        if (crc & 1) { crc = (crc >> 1) ^ 0xA001 } else { crc >>= 1 }
      }
    }
    buf[39] = crc & 0xFF
    buf[40] = (crc >> 8) & 0xFF
    return buf
  }
}

// --- RaspberryPiDriver ---
// Companion computer via SSH / local execution

export class RaspberryPiDriver extends DeviceDriver {
  readonly driverName = 'Raspberry Pi 4B Driver'
  readonly deviceType: DeviceType = 'companion_computer'
  readonly supportedProtocols: Protocol[] = ['usb', 'uart']

  async connect(deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult> {
    this.connectionState = 'connecting'
    this.emitEvent('connecting')
    try {
      const device = await this.findDeviceInDb(deviceId)
      if (!device) {
        this.connectionState = 'error'
        this.lastError = `Device not found in DB: ${deviceId}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }
      if (device.deviceType !== 'companion_computer') {
        this.connectionState = 'error'
        this.lastError = `Device type mismatch: expected companion_computer, got ${device.deviceType}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }

      const startTime = Date.now()
      const host = config?.host ?? 'localhost'
      const port = config?.sshPort ?? 22

      await this.updateDeviceStatus(deviceId, 'active')

      this.deviceId = deviceId
      this.config = { host, sshPort: port, protocol: 'ssh', ...(config || {}) }
      this.connectionState = 'connected'
      this.connectedAt = new Date()
      this.lastError = null
      this.emitEvent('connected', { host, port, mode: this.getBridgeManager().getMode() })

      const latency = Date.now() - startTime
      const modeLabel = this.isSimulated() ? 'simulation' : 'real hardware'
      return { success: true, message: `Connected to RPi 4B at ${host}:${port} via SSH [${modeLabel}]`, latency }
    } catch (err) {
      this.connectionState = 'error'
      this.lastError = err instanceof Error ? err.message : 'Unknown connection error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError }
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      await this.updateDeviceStatus(this.deviceId, 'offline')
    }
    this.connectionState = 'disconnected'
    this.deviceId = null
    this.connectedAt = null
    this.emitEvent('disconnected')
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    if (!this.isConnected() || !this.deviceId) {
      return { healthy: false, details: { error: 'Not connected' }, latency: Date.now() - startTime }
    }
    try {
      const device = await this.findDeviceInDb(this.deviceId)
      const dbHealthy = device?.status === 'active'
      const simulated = this.isSimulated()

      this.lastHealthCheckTime = new Date()
      this.emitEvent('health_check', { healthy: dbHealthy, simulated })

      let details: Record<string, unknown>
      if (simulated) {
        const sysData = this.getBridgeManager().getSimulationBridge().getRPiSystemData()
        details = {
          status: device?.status,
          firmware: device?.firmware,
          cpuTemp: sysData.cpuTemp,
          memUsage: `${sysData.memUsage.toFixed(1)}%`,
          diskUsage: `${((1 - sysData.diskFree / 32000) * 100).toFixed(1)}%`,
          uptime: this.getUptime(),
          mode: 'simulation',
        }
      } else {
        details = {
          status: device?.status,
          firmware: device?.firmware,
          mode: 'real',
        }
      }

      return {
        healthy: dbHealthy,
        details,
        latency: Date.now() - startTime,
      }
    } catch (err) {
      return { healthy: false, details: { error: err instanceof Error ? err.message : 'Unknown' }, latency: Date.now() - startTime }
    }
  }

  async readData(): Promise<Record<string, unknown>> {
    if (!this.isConnected() || !this.deviceId) {
      this.emitEvent('error', 'Cannot read: not connected')
      return { error: 'Not connected' }
    }
    try {
      const simulated = this.isSimulated()

      if (simulated) {
        const simBridge = this.getBridgeManager().getSimulationBridge()
        const sysData = simBridge.getRPiSystemData()

        const data: Record<string, unknown> = {
          cpuTemp: sysData.cpuTemp,
          memUsage: sysData.memUsage,
          diskFree: sysData.diskFree,
          agentStatus: 'running',
          wifiRssi: sysData.wifiRssi,
          uptime: this.getUptime(),
          temperature: sysData.cpuTemp,
          current_draw: 1.2 + Math.random() * 0.3, // RPi current draw varies 1.2-1.5A
          simulated: true,
        }

        await this.writeTelemetryToDb(this.deviceId, {
          temperature: data.cpuTemp as number,
          current_draw: data.current_draw as number,
        })

        this.emitEvent('data_read', data)
        return data
      }

      // Real mode: read from actual system
      const dbData = await this.readTelemetryFromDb(this.deviceId, ['temperature', 'current_draw'])
      const data: Record<string, unknown> = {
        ...dbData,
        agentStatus: 'running',
        simulated: false,
      }

      this.emitEvent('data_read', data)
      return data
    } catch (err) {
      this.emitEvent('error', err)
      return { error: err instanceof Error ? err.message : 'Read error' }
    }
  }

  async writeData(data: Record<string, unknown>): Promise<WriteResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot write: not connected' }
    }
    try {
      await this.writeTelemetryToDb(this.deviceId, data)
      this.emitEvent('data_write', data)
      return { success: true, message: 'Data written to RPi companion store' }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Write error'
      return { success: false, message: this.lastError }
    }
  }

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot execute command: not connected', simulated: this.isSimulated() }
    }

    const simulated = this.isSimulated()

    try {
      switch (command) {
        case 'reboot': {
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'Reboot command (simulated)' : 'Reboot command sent', simulated }
        }

        case 'shutdown': {
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'Shutdown command (simulated)' : 'Shutdown command sent', simulated }
        }

        case 'restartAgent': {
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'Agent restart (simulated)' : 'Agent restart command sent', simulated }
        }

        case 'exec': {
          const cmd = params?.command as string | undefined
          if (!cmd) {
            return { success: false, message: 'exec command requires "command" parameter', simulated }
          }
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? `Exec "${cmd}" (simulated)` : `Exec "${cmd}" sent`, simulated }
        }

        default:
          return { success: false, message: `Unknown command: ${command}. Supported: reboot, shutdown, restartAgent, exec`, simulated }
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Command execution error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError, simulated }
    }
  }
}

// --- GPSDriver ---
// u-blox NEO-M8N via UART

export class GPSDriver extends DeviceDriver {
  readonly driverName = 'u-blox NEO-M8N Driver'
  readonly deviceType: DeviceType = 'gps'
  readonly supportedProtocols: Protocol[] = ['uart']

  async connect(deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult> {
    this.connectionState = 'connecting'
    this.emitEvent('connecting')
    try {
      const device = await this.findDeviceInDb(deviceId)
      if (!device) {
        this.connectionState = 'error'
        this.lastError = `Device not found in DB: ${deviceId}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }
      if (device.deviceType !== 'gps') {
        this.connectionState = 'error'
        this.lastError = `Device type mismatch: expected gps, got ${device.deviceType}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }

      const startTime = Date.now()
      const port = device.port || '/dev/ttyUSB0'
      const baudRate = config?.baudRate ?? 9600

      // Open serial for GPS (NMEA/UBX protocol)
      try {
        await this.getBridgeManager().getBridge().openSerial({
          path: port,
          baudRate: baudRate as number,
        })
      } catch (bridgeErr) {
        console.warn(`[GPSDriver] Bridge open failed for ${port}: ${bridgeErr instanceof Error ? bridgeErr.message : bridgeErr}`)
      }

      await this.updateDeviceStatus(deviceId, 'active')

      this.deviceId = deviceId
      this.config = { port, baudRate, protocol: 'nmea', ...(config || {}) }
      this.connectionState = 'connected'
      this.connectedAt = new Date()
      this.lastError = null
      this.emitEvent('connected', { port, baudRate, mode: this.getBridgeManager().getMode() })

      const latency = Date.now() - startTime
      const modeLabel = this.isSimulated() ? 'simulation' : 'real hardware'
      return { success: true, message: `Connected to NEO-M8N on ${port} at ${baudRate} baud (NMEA/UBX) [${modeLabel}]`, latency }
    } catch (err) {
      this.connectionState = 'error'
      this.lastError = err instanceof Error ? err.message : 'Unknown connection error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError }
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      const port = this.config.port as string | undefined
      if (port) {
        try { await this.getBridgeManager().getBridge().closeSerial(port) } catch { /* ignore */ }
      }
      await this.updateDeviceStatus(this.deviceId, 'offline')
    }
    this.connectionState = 'disconnected'
    this.deviceId = null
    this.connectedAt = null
    this.emitEvent('disconnected')
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    if (!this.isConnected() || !this.deviceId) {
      return { healthy: false, details: { error: 'Not connected' }, latency: Date.now() - startTime }
    }
    try {
      const device = await this.findDeviceInDb(this.deviceId)
      const healthy = device?.status === 'active'
      const simulated = this.isSimulated()
      this.lastHealthCheckTime = new Date()
      this.emitEvent('health_check', { healthy, simulated })

      if (simulated) {
        const gps = this.getBridgeManager().getSimulationBridge().getGPSPosition()
        return {
          healthy,
          details: {
            status: device?.status,
            firmware: device?.firmware,
            fixType: gps.fixType,
            satellitesVisible: gps.satellitesVisible,
            hdop: gps.hdop,
            mode: 'simulation',
          },
          latency: Date.now() - startTime,
        }
      }

      return {
        healthy,
        details: {
          status: device?.status,
          firmware: device?.firmware,
          mode: 'real',
        },
        latency: Date.now() - startTime,
      }
    } catch (err) {
      return { healthy: false, details: { error: err instanceof Error ? err.message : 'Unknown' }, latency: Date.now() - startTime }
    }
  }

  async readData(): Promise<Record<string, unknown>> {
    if (!this.isConnected() || !this.deviceId) {
      this.emitEvent('error', 'Cannot read: not connected')
      return { error: 'Not connected' }
    }
    try {
      const simulated = this.isSimulated()

      if (simulated) {
        const simBridge = this.getBridgeManager().getSimulationBridge()
        const gps = simBridge.getGPSPosition()

        const data: Record<string, unknown> = {
          gps_lat: gps.lat,
          gps_lng: gps.lng,
          altitude: 50 + noise(70, 2, Date.now() / 1000),
          speed: 0 + noise(71, 0.5, Date.now() / 1000),
          heading: ((noise(72, 20, Date.now() / 1000) % 360) + 360) % 360,
          fixType: gps.fixType,
          satellitesVisible: gps.satellitesVisible,
          hdop: gps.hdop,
          vdop: gps.vdop,
          simulated: true,
        }

        await this.writeTelemetryToDb(this.deviceId, {
          gps_lat: data.gps_lat as number,
          gps_lng: data.gps_lng as number,
          altitude: data.altitude as number,
          speed: data.speed as number,
          heading: data.heading as number,
        })

        this.emitEvent('data_read', data)
        return data
      }

      // Real mode: read NMEA sentences from serial and parse
      const port = this.config.port as string
      const serialResult = await this.getBridgeManager().getBridge().readSerial(port, 1024)
      const nmeaString = serialResult.data.toString('ascii')
      const parsed = this.parseNMEA(nmeaString)

      const dbData = await this.readTelemetryFromDb(this.deviceId, ['gps_lat', 'gps_lng', 'altitude', 'speed', 'heading'])

      const data: Record<string, unknown> = {
        ...dbData,
        ...parsed,
        simulated: false,
      }

      if (parsed.gps_lat && parsed.gps_lng) {
        await this.writeTelemetryToDb(this.deviceId, {
          gps_lat: parsed.gps_lat as number,
          gps_lng: parsed.gps_lng as number,
        })
      }

      this.emitEvent('data_read', data)
      return data
    } catch (err) {
      this.emitEvent('error', err)
      return { error: err instanceof Error ? err.message : 'Read error' }
    }
  }

  async writeData(data: Record<string, unknown>): Promise<WriteResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot write: not connected' }
    }
    try {
      await this.writeTelemetryToDb(this.deviceId, data)
      this.emitEvent('data_write', data)
      return { success: true, message: 'Data written to GPS telemetry store' }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Write error'
      return { success: false, message: this.lastError }
    }
  }

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot execute command: not connected', simulated: this.isSimulated() }
    }

    const simulated = this.isSimulated()

    try {
      switch (command) {
        case 'setRate': {
          const rate = (params?.rate as number) ?? 1
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? `GPS update rate set to ${rate}Hz (simulated)` : `GPS rate config sent`, data: { rate }, simulated }
        }

        case 'reset': {
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'GPS reset (simulated)' : 'GPS reset command sent', simulated }
        }

        default:
          return { success: false, message: `Unknown command: ${command}. Supported: setRate, reset`, simulated }
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Command execution error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError, simulated }
    }
  }

  /** Minimal NMEA sentence parser for GGA and RMC */
  private parseNMEA(data: string): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const line of data.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('$GPGGA') || trimmed.startsWith('$GNGGA')) {
        const fields = trimmed.split(',')
        if (fields.length >= 10) {
          const latRaw = parseFloat(fields[2])
          const latDir = fields[3]
          const lngRaw = parseFloat(fields[4])
          const lngDir = fields[5]
          const fixQuality = parseInt(fields[6], 10)
          const satellites = parseInt(fields[7], 10)
          const hdop = parseFloat(fields[8])
          const alt = parseFloat(fields[9])

          if (!isNaN(latRaw) && !isNaN(lngRaw)) {
            result.gps_lat = (latRaw / 100 + (latRaw % 100) / 60) * (latDir === 'S' ? -1 : 1)
            result.gps_lng = (lngRaw / 100 + (lngRaw % 100) / 60) * (lngDir === 'W' ? -1 : 1)
          }
          result.fixType = fixQuality > 0 ? '3D' : 'No Fix'
          result.satellitesVisible = isNaN(satellites) ? 0 : satellites
          result.hdop = isNaN(hdop) ? 99 : hdop
          result.altitude = isNaN(alt) ? 0 : alt
        }
      }
      if (trimmed.startsWith('$GPRMC') || trimmed.startsWith('$GNRMC')) {
        const fields = trimmed.split(',')
        if (fields.length >= 8) {
          const speed = parseFloat(fields[7])
          result.speed = isNaN(speed) ? 0 : speed * 0.514444 // knots to m/s
          const course = parseFloat(fields[8])
          result.heading = isNaN(course) ? 0 : course
        }
      }
    }
    return result
  }
}

// --- CameraDriver ---
// RPi Camera V2 via CSI interface

export class CameraDriver extends DeviceDriver {
  readonly driverName = 'RPi Camera V2 Driver'
  readonly deviceType: DeviceType = 'camera'
  readonly supportedProtocols: Protocol[] = ['gpio']

  async connect(deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult> {
    this.connectionState = 'connecting'
    this.emitEvent('connecting')
    try {
      const device = await this.findDeviceInDb(deviceId)
      if (!device) {
        this.connectionState = 'error'
        this.lastError = `Device not found in DB: ${deviceId}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }
      if (device.deviceType !== 'camera') {
        this.connectionState = 'error'
        this.lastError = `Device type mismatch: expected camera, got ${device.deviceType}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }

      const startTime = Date.now()
      const devicePath = device.port || '/dev/video0'
      const resolution = config?.resolution ?? '3280x2464'

      await this.updateDeviceStatus(deviceId, 'active')

      this.deviceId = deviceId
      this.config = { devicePath, resolution, protocol: 'csi', ...(config || {}) }
      this.connectionState = 'connected'
      this.connectedAt = new Date()
      this.lastError = null
      this.emitEvent('connected', { devicePath, resolution, mode: this.getBridgeManager().getMode() })

      const latency = Date.now() - startTime
      const modeLabel = this.isSimulated() ? 'simulation' : 'real hardware'
      return { success: true, message: `Connected to RPi Camera V2 on ${devicePath} (${resolution}) [${modeLabel}]`, latency }
    } catch (err) {
      this.connectionState = 'error'
      this.lastError = err instanceof Error ? err.message : 'Unknown connection error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError }
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      await this.updateDeviceStatus(this.deviceId, 'offline')
    }
    this.connectionState = 'disconnected'
    this.deviceId = null
    this.connectedAt = null
    this.emitEvent('disconnected')
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    if (!this.isConnected() || !this.deviceId) {
      return { healthy: false, details: { error: 'Not connected' }, latency: Date.now() - startTime }
    }
    try {
      const device = await this.findDeviceInDb(this.deviceId)
      const healthy = device?.status === 'active'
      const simulated = this.isSimulated()
      this.lastHealthCheckTime = new Date()
      this.emitEvent('health_check', { healthy, simulated })
      return {
        healthy,
        details: {
          status: device?.status,
          firmware: device?.firmware,
          sensorModel: 'IMX219',
          resolution: this.config.resolution ?? '3280x2464',
          capturing: simulated ? this.getBridgeManager().getSimulationBridge().getCameraCapturing() : false,
          mode: simulated ? 'simulation' : 'real',
        },
        latency: Date.now() - startTime,
      }
    } catch (err) {
      return { healthy: false, details: { error: err instanceof Error ? err.message : 'Unknown' }, latency: Date.now() - startTime }
    }
  }

  async readData(): Promise<Record<string, unknown>> {
    if (!this.isConnected() || !this.deviceId) {
      this.emitEvent('error', 'Cannot read: not connected')
      return { error: 'Not connected' }
    }
    try {
      const simulated = this.isSimulated()
      const t = Date.now() / 1000

      if (simulated) {
        const simBridge = this.getBridgeManager().getSimulationBridge()
        const data: Record<string, unknown> = {
          sensorModel: 'IMX219',
          resolution: this.config.resolution ?? '3280x2464',
          iso: Math.round(100 + noise(80, 50, t)),
          shutterSpeed: `1/${Math.round(120 + noise(81, 40, t))}`,
          capturing: simBridge.getCameraCapturing(),
          framesCaptured: simBridge.getCameraFramesCaptured(),
          simulated: true,
        }
        this.emitEvent('data_read', data)
        return data
      }

      // Real mode: camera status from device
      const data: Record<string, unknown> = {
        sensorModel: 'IMX219',
        resolution: this.config.resolution ?? '3280x2464',
        simulated: false,
      }
      this.emitEvent('data_read', data)
      return data
    } catch (err) {
      this.emitEvent('error', err)
      return { error: err instanceof Error ? err.message : 'Read error' }
    }
  }

  async writeData(data: Record<string, unknown>): Promise<WriteResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot write: not connected' }
    }
    try {
      this.emitEvent('data_write', data)
      return { success: true, message: `Camera command executed: ${JSON.stringify(data)}` }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Write error'
      return { success: false, message: this.lastError }
    }
  }

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot execute command: not connected', simulated: this.isSimulated() }
    }

    const simulated = this.isSimulated()

    try {
      switch (command) {
        case 'capture': {
          if (simulated) {
            const simBridge = this.getBridgeManager().getSimulationBridge()
            const frameCount = simBridge.incrementCameraFrames()
            this.emitEvent('command_executed', { command, params, simulated: true })
            return { success: true, message: `Photo captured (simulated), frame #${frameCount}`, data: { frameCount }, simulated: true }
          }
          this.emitEvent('command_executed', { command, params, simulated: false })
          return { success: true, message: 'Capture command sent to camera', simulated: false }
        }

        case 'startVideo': {
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setCameraCapturing(true)
          }
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'Video recording started (simulated)' : 'Start video command sent', simulated }
        }

        case 'stopVideo': {
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setCameraCapturing(false)
          }
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'Video recording stopped (simulated)' : 'Stop video command sent', simulated }
        }

        case 'setResolution': {
          const res = (params?.resolution as string) ?? '3280x2464'
          this.config.resolution = res
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: `Resolution set to ${res}${simulated ? ' (simulated)' : ''}`, data: { resolution: res }, simulated }
        }

        default:
          return { success: false, message: `Unknown command: ${command}. Supported: capture, startVideo, stopVideo, setResolution`, simulated }
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Command execution error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError, simulated }
    }
  }
}

// --- I2CSensorDriver ---
// BME280 (temp/humidity/pressure) + MPU6050 (accel/gyro) via I2C

export class I2CSensorDriver extends DeviceDriver {
  readonly driverName = 'I2C Sensor Driver (BME280/MPU6050)'
  readonly deviceType: DeviceType = 'sensor'
  readonly supportedProtocols: Protocol[] = ['i2c']

  async connect(deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult> {
    this.connectionState = 'connecting'
    this.emitEvent('connecting')
    try {
      const device = await this.findDeviceInDb(deviceId)
      if (!device) {
        this.connectionState = 'error'
        this.lastError = `Device not found in DB: ${deviceId}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }
      if (device.deviceType !== 'sensor') {
        this.connectionState = 'error'
        this.lastError = `Device type mismatch: expected sensor, got ${device.deviceType}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }

      const startTime = Date.now()
      const bus = config?.bus ?? 1
      const addressStr = device.address || '0x76'
      const address = parseInt(addressStr, 16)

      // Open I2C through bridge
      try {
        await this.getBridgeManager().getBridge().openI2C({ busNumber: bus as number, address })
      } catch (bridgeErr) {
        console.warn(`[I2CSensorDriver] Bridge open failed: ${bridgeErr instanceof Error ? bridgeErr.message : bridgeErr}`)
      }

      await this.updateDeviceStatus(deviceId, 'active')

      this.deviceId = deviceId
      this.config = { bus, address, protocol: 'i2c', ...(config || {}) }
      this.connectionState = 'connected'
      this.connectedAt = new Date()
      this.lastError = null
      this.emitEvent('connected', { bus, address, mode: this.getBridgeManager().getMode() })

      const latency = Date.now() - startTime
      const modeLabel = this.isSimulated() ? 'simulation' : 'real hardware'
      return { success: true, message: `Connected to I2C sensor at 0x${addressStr} on bus ${bus} [${modeLabel}]`, latency }
    } catch (err) {
      this.connectionState = 'error'
      this.lastError = err instanceof Error ? err.message : 'Unknown connection error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError }
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      const bus = this.config.bus as number | undefined
      if (bus !== undefined) {
        try { await this.getBridgeManager().getBridge().closeI2C(bus) } catch { /* ignore */ }
      }
      await this.updateDeviceStatus(this.deviceId, 'offline')
    }
    this.connectionState = 'disconnected'
    this.deviceId = null
    this.connectedAt = null
    this.emitEvent('disconnected')
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    if (!this.isConnected() || !this.deviceId) {
      return { healthy: false, details: { error: 'Not connected' }, latency: Date.now() - startTime }
    }
    try {
      const device = await this.findDeviceInDb(this.deviceId)
      const healthy = device?.status === 'active'
      const simulated = this.isSimulated()
      this.lastHealthCheckTime = new Date()
      this.emitEvent('health_check', { healthy, simulated })
      return {
        healthy,
        details: {
          status: device?.status,
          firmware: device?.firmware,
          i2cAddress: device?.address,
          bus: this.config.bus,
          chipId: device?.firmware === 'BME280' ? 0x60 : 0x68,
          mode: simulated ? 'simulation' : 'real',
        },
        latency: Date.now() - startTime,
      }
    } catch (err) {
      return { healthy: false, details: { error: err instanceof Error ? err.message : 'Unknown' }, latency: Date.now() - startTime }
    }
  }

  async readData(): Promise<Record<string, unknown>> {
    if (!this.isConnected() || !this.deviceId) {
      this.emitEvent('error', 'Cannot read: not connected')
      return { error: 'Not connected' }
    }
    try {
      const device = await this.findDeviceInDb(this.deviceId)
      const isBme280 = device?.firmware === 'BME280'
      const isMpu6050 = device?.firmware === 'MPU6050'
      const simulated = this.isSimulated()

      if (simulated) {
        const simBridge = this.getBridgeManager().getSimulationBridge()
        let data: Record<string, unknown>

        if (isBme280) {
          const bme = simBridge.getBME280Data()
          data = {
            temperature: bme.temperature,
            humidity: bme.humidity,
            pressure: bme.pressure,
            sensorType: 'BME280',
            i2cAddress: device?.address,
            simulated: true,
          }
          await this.writeTelemetryToDb(this.deviceId, {
            temperature: data.temperature as number,
            humidity: data.humidity as number,
            pressure: data.pressure as number,
          })
        } else if (isMpu6050) {
          const mpu = simBridge.getMPU6050Data()
          data = {
            roll: mpu.roll,
            pitch: mpu.pitch,
            yaw: mpu.yaw,
            sensorType: 'MPU6050',
            i2cAddress: device?.address,
            simulated: true,
          }
          await this.writeTelemetryToDb(this.deviceId, {
            roll: data.roll as number,
            pitch: data.pitch as number,
            yaw: data.yaw as number,
          })
        } else {
          data = {
            temperature: simBridge.getBME280Data().temperature,
            sensorType: device?.firmware,
            i2cAddress: device?.address,
            simulated: true,
          }
          await this.writeTelemetryToDb(this.deviceId, {
            temperature: data.temperature as number,
          })
        }

        this.emitEvent('data_read', data)
        return data
      }

      // Real mode: read from I2C bus
      const bus = this.config.bus as number
      const address = this.config.address as number

      if (isBme280) {
        // BME280: read 8 bytes from register 0xF7
        const result = await this.getBridgeManager().getBridge().readI2C(bus, address, 8, 0xF7)
        const rawTemp = (result.data[3] << 12) | (result.data[4] << 4) | (result.data[5] >> 4)
        const rawPressure = (result.data[0] << 12) | (result.data[1] << 4) | (result.data[2] >> 4)
        const rawHumidity = (result.data[6] << 8) | result.data[7]
        // Simplified conversion (real BME280 requires compensation coefficients)
        const temp = rawTemp / 100.0
        const pressure = rawPressure / 100.0
        const humidity = rawHumidity / 1024.0

        const data: Record<string, unknown> = {
          temperature: temp,
          humidity,
          pressure,
          sensorType: 'BME280',
          i2cAddress: device?.address,
          simulated: false,
        }
        await this.writeTelemetryToDb(this.deviceId, { temperature: temp, humidity, pressure })
        this.emitEvent('data_read', data)
        return data
      }

      if (isMpu6050) {
        // MPU6050: read 14 bytes from register 0x3B
        const result = await this.getBridgeManager().getBridge().readI2C(bus, address, 14, 0x3B)
        const accelX = (result.data[0] << 8) | result.data[1]
        const accelY = (result.data[2] << 8) | result.data[3]
        const accelZ = (result.data[4] << 8) | result.data[5]
        const gyroX = (result.data[8] << 8) | result.data[9]
        const gyroY = (result.data[10] << 8) | result.data[11]
        const gyroZ = (result.data[12] << 8) | result.data[13]
        // Convert to degrees (simplified)
        const roll = Math.atan2(accelY, accelZ) * (180 / Math.PI)
        const pitch = Math.atan2(-accelX, Math.sqrt(accelY * accelY + accelZ * accelZ)) * (180 / Math.PI)
        const yaw = gyroZ / 131.0

        const data: Record<string, unknown> = {
          roll,
          pitch,
          yaw,
          accelX, accelY, accelZ,
          gyroX, gyroY, gyroZ,
          sensorType: 'MPU6050',
          i2cAddress: device?.address,
          simulated: false,
        }
        await this.writeTelemetryToDb(this.deviceId, { roll, pitch, yaw })
        this.emitEvent('data_read', data)
        return data
      }

      // Generic sensor
      const dbData = await this.readTelemetryFromDb(this.deviceId, ['temperature'])
      const data: Record<string, unknown> = {
        ...dbData,
        sensorType: device?.firmware,
        i2cAddress: device?.address,
        simulated: false,
      }
      this.emitEvent('data_read', data)
      return data
    } catch (err) {
      this.emitEvent('error', err)
      return { error: err instanceof Error ? err.message : 'Read error' }
    }
  }

  async writeData(data: Record<string, unknown>): Promise<WriteResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot write: not connected' }
    }
    try {
      await this.writeTelemetryToDb(this.deviceId, data)
      this.emitEvent('data_write', data)
      return { success: true, message: 'Data written to I2C sensor telemetry store' }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Write error'
      return { success: false, message: this.lastError }
    }
  }

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot execute command: not connected', simulated: this.isSimulated() }
    }

    const simulated = this.isSimulated()

    try {
      switch (command) {
        case 'reset': {
          if (!simulated) {
            const bus = this.config.bus as number
            const address = this.config.address as number
            await this.getBridgeManager().getBridge().writeI2C(bus, address, 0xE0, Buffer.from([0xB6]))
          }
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'Sensor reset (simulated)' : 'Reset command sent to I2C sensor', simulated }
        }

        case 'setOversampling': {
          const level = (params?.level as number) ?? 1
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? `Oversampling set to ${level} (simulated)` : `Oversampling config sent`, data: { level }, simulated }
        }

        default:
          return { success: false, message: `Unknown command: ${command}. Supported: reset, setOversampling`, simulated }
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Command execution error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError, simulated }
    }
  }
}

// --- RadioDriver ---
// SiK 433MHz Telemetry Radio via UART

export class RadioDriver extends DeviceDriver {
  readonly driverName = 'SiK 433MHz Radio Driver'
  readonly deviceType: DeviceType = 'radio'
  readonly supportedProtocols: Protocol[] = ['uart']

  async connect(deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult> {
    this.connectionState = 'connecting'
    this.emitEvent('connecting')
    try {
      const device = await this.findDeviceInDb(deviceId)
      if (!device) {
        this.connectionState = 'error'
        this.lastError = `Device not found in DB: ${deviceId}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }
      if (device.deviceType !== 'radio') {
        this.connectionState = 'error'
        this.lastError = `Device type mismatch: expected radio, got ${device.deviceType}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }

      const startTime = Date.now()
      const port = device.port || '/dev/ttyUSB1'
      const baudRate = config?.baudRate ?? 57600

      try {
        await this.getBridgeManager().getBridge().openSerial({
          path: port,
          baudRate: baudRate as number,
        })
      } catch (bridgeErr) {
        console.warn(`[RadioDriver] Bridge open failed for ${port}: ${bridgeErr instanceof Error ? bridgeErr.message : bridgeErr}`)
      }

      await this.updateDeviceStatus(deviceId, 'active')

      this.deviceId = deviceId
      this.config = { port, baudRate, protocol: 'sik', frequency: '433MHz', ...(config || {}) }
      this.connectionState = 'connected'
      this.connectedAt = new Date()
      this.lastError = null
      this.emitEvent('connected', { port, baudRate, mode: this.getBridgeManager().getMode() })

      const latency = Date.now() - startTime
      const modeLabel = this.isSimulated() ? 'simulation' : 'real hardware'
      return { success: true, message: `Connected to SiK 433MHz radio on ${port} at ${baudRate} baud [${modeLabel}]`, latency }
    } catch (err) {
      this.connectionState = 'error'
      this.lastError = err instanceof Error ? err.message : 'Unknown connection error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError }
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      const port = this.config.port as string | undefined
      if (port) {
        try { await this.getBridgeManager().getBridge().closeSerial(port) } catch { /* ignore */ }
      }
      await this.updateDeviceStatus(this.deviceId, 'offline')
    }
    this.connectionState = 'disconnected'
    this.deviceId = null
    this.connectedAt = null
    this.emitEvent('disconnected')
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    if (!this.isConnected() || !this.deviceId) {
      return { healthy: false, details: { error: 'Not connected' }, latency: Date.now() - startTime }
    }
    try {
      const device = await this.findDeviceInDb(this.deviceId)
      const healthy = device?.status === 'active'
      const simulated = this.isSimulated()
      this.lastHealthCheckTime = new Date()
      this.emitEvent('health_check', { healthy, simulated })

      if (simulated) {
        const radioData = this.getBridgeManager().getSimulationBridge().getRadioData()
        return {
          healthy,
          details: {
            status: device?.status,
            firmware: device?.firmware,
            frequency: '433MHz',
            rssi: radioData.rssi,
            noiseFloor: radioData.noiseFloor,
            linkQuality: radioData.linkQuality,
            mode: 'simulation',
          },
          latency: Date.now() - startTime,
        }
      }

      return {
        healthy,
        details: {
          status: device?.status,
          firmware: device?.firmware,
          frequency: '433MHz',
          mode: 'real',
        },
        latency: Date.now() - startTime,
      }
    } catch (err) {
      return { healthy: false, details: { error: err instanceof Error ? err.message : 'Unknown' }, latency: Date.now() - startTime }
    }
  }

  async readData(): Promise<Record<string, unknown>> {
    if (!this.isConnected() || !this.deviceId) {
      this.emitEvent('error', 'Cannot read: not connected')
      return { error: 'Not connected' }
    }
    try {
      const simulated = this.isSimulated()

      if (simulated) {
        const simBridge = this.getBridgeManager().getSimulationBridge()
        const radioData = simBridge.getRadioData()

        const data: Record<string, unknown> = {
          frequency: '433MHz',
          rssi: radioData.rssi,
          noiseFloor: radioData.noiseFloor,
          linkQuality: radioData.linkQuality,
          txPower: radioData.txPower,
          signal_strength: radioData.rssi,
          simulated: true,
        }

        await this.writeTelemetryToDb(this.deviceId, {
          signal_strength: data.signal_strength as number,
        })

        this.emitEvent('data_read', data)
        return data
      }

      // Real mode: SiK radio exposes RSSI and other stats via MAVLink RADIO_STATUS (#109)
      const port = this.config.port as string
      const serialResult = await this.getBridgeManager().getBridge().readSerial(port, 1024)
      const packets: MAVLinkPacket[] = []
      let offset = 0
      while (offset < serialResult.data.length) {
        const remaining = serialResult.data.subarray(offset)
        const packet = parseMAVLinkPacket(remaining)
        if (packet) {
          packets.push(packet)
          const packetSize = packet.header.version === 2
            ? 12 + packet.header.payloadLength + 2
            : 6 + packet.header.payloadLength + 2
          offset += packetSize
        } else {
          offset++
        }
      }

      const dbData = await this.readTelemetryFromDb(this.deviceId, ['signal_strength'])
      const data: Record<string, unknown> = {
        ...dbData,
        frequency: '433MHz',
        simulated: false,
      }

      // Parse RADIO_STATUS from MAVLink packets
      for (const pkt of packets) {
        if (pkt.header.messageId === 109 && pkt.payload.length >= 9) {
          data.rssi = pkt.payload[0]
          data.noiseFloor = pkt.payload[2]
          data.linkQuality = pkt.payload[4]
          data.txPower = pkt.payload[6]
          data.signal_strength = pkt.payload[0]
          break
        }
      }

      if (typeof data.signal_strength === 'number') {
        await this.writeTelemetryToDb(this.deviceId, { signal_strength: data.signal_strength })
      }

      this.emitEvent('data_read', data)
      return data
    } catch (err) {
      this.emitEvent('error', err)
      return { error: err instanceof Error ? err.message : 'Read error' }
    }
  }

  async writeData(data: Record<string, unknown>): Promise<WriteResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot write: not connected' }
    }
    try {
      await this.writeTelemetryToDb(this.deviceId, data)
      this.emitEvent('data_write', data)
      return { success: true, message: 'Data written to radio telemetry store' }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Write error'
      return { success: false, message: this.lastError }
    }
  }

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot execute command: not connected', simulated: this.isSimulated() }
    }

    const simulated = this.isSimulated()

    try {
      switch (command) {
        case 'setTxPower': {
          const power = (params?.power as number) ?? 20
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? `TX power set to ${power}dBm (simulated)` : `TX power config sent`, data: { power }, simulated }
        }

        case 'enterATMode': {
          // SiK radios use AT command mode for configuration
          if (!simulated) {
            const port = this.config.port as string
            await this.getBridgeManager().getBridge().writeSerial(port, Buffer.from('+++', 'ascii'))
          }
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'Entered AT mode (simulated)' : 'AT mode command sent', simulated }
        }

        default:
          return { success: false, message: `Unknown command: ${command}. Supported: setTxPower, enterATMode`, simulated }
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Command execution error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError, simulated }
    }
  }
}

// --- BatteryDriver ---
// 4S LiPo 4000mAh Monitor via ADC/PWM

export class BatteryDriver extends DeviceDriver {
  readonly driverName = '4S LiPo Battery Monitor Driver'
  readonly deviceType: DeviceType = 'battery'
  readonly supportedProtocols: Protocol[] = ['adc']

  async connect(deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult> {
    this.connectionState = 'connecting'
    this.emitEvent('connecting')
    try {
      const device = await this.findDeviceInDb(deviceId)
      if (!device) {
        this.connectionState = 'error'
        this.lastError = `Device not found in DB: ${deviceId}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }
      if (device.deviceType !== 'battery') {
        this.connectionState = 'error'
        this.lastError = `Device type mismatch: expected battery, got ${device.deviceType}`
        this.emitEvent('error', this.lastError)
        return { success: false, message: this.lastError }
      }

      const startTime = Date.now()
      const adcChannel = config?.adcChannel ?? 0
      const cellCount = config?.cellCount ?? 4
      const capacityMah = config?.capacityMah ?? 4000
      const currentDraw = config?.currentDraw ?? 8.5

      // Open ADC through bridge
      try {
        await this.getBridgeManager().getBridge().openADC({
          channel: adcChannel as number,
          resolution: 4096,
          voltageRef: 3.3,
        })
      } catch (bridgeErr) {
        console.warn(`[BatteryDriver] Bridge open failed: ${bridgeErr instanceof Error ? bridgeErr.message : bridgeErr}`)
      }

      // In simulation, initialize the battery model
      if (this.isSimulated()) {
        this.getBridgeManager().getSimulationBridge().setBatteryConnected(
          cellCount as number,
          capacityMah as number,
          currentDraw as number,
        )
      }

      await this.updateDeviceStatus(deviceId, 'active')

      this.deviceId = deviceId
      this.config = { adcChannel, cellCount, capacityMah, currentDraw, protocol: 'adc', ...(config || {}) }
      this.connectionState = 'connected'
      this.connectedAt = new Date()
      this.lastError = null
      this.emitEvent('connected', { adcChannel, cellCount, mode: this.getBridgeManager().getMode() })

      const latency = Date.now() - startTime
      const modeLabel = this.isSimulated() ? 'simulation' : 'real hardware'
      return { success: true, message: `Connected to 4S LiPo monitor on ADC channel ${adcChannel} (${cellCount} cells) [${modeLabel}]`, latency }
    } catch (err) {
      this.connectionState = 'error'
      this.lastError = err instanceof Error ? err.message : 'Unknown connection error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError }
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      const channel = this.config.adcChannel as number | undefined
      if (channel !== undefined) {
        try { await this.getBridgeManager().getBridge().closeADC(channel) } catch { /* ignore */ }
      }
      await this.updateDeviceStatus(this.deviceId, 'offline')
    }
    this.connectionState = 'disconnected'
    this.deviceId = null
    this.connectedAt = null
    this.emitEvent('disconnected')
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    if (!this.isConnected() || !this.deviceId) {
      return { healthy: false, details: { error: 'Not connected' }, latency: Date.now() - startTime }
    }
    try {
      const device = await this.findDeviceInDb(this.deviceId)
      const healthy = device?.status === 'active'
      const simulated = this.isSimulated()
      this.lastHealthCheckTime = new Date()
      this.emitEvent('health_check', { healthy, simulated })
      return {
        healthy,
        details: {
          status: device?.status,
          cellCount: this.config.cellCount,
          adcChannel: this.config.adcChannel,
          monitoringActive: healthy,
          mode: simulated ? 'simulation' : 'real',
        },
        latency: Date.now() - startTime,
      }
    } catch (err) {
      return { healthy: false, details: { error: err instanceof Error ? err.message : 'Unknown' }, latency: Date.now() - startTime }
    }
  }

  async readData(): Promise<Record<string, unknown>> {
    if (!this.isConnected() || !this.deviceId) {
      this.emitEvent('error', 'Cannot read: not connected')
      return { error: 'Not connected' }
    }
    try {
      const simulated = this.isSimulated()

      if (simulated) {
        const simBridge = this.getBridgeManager().getSimulationBridge()
        const cellCount = this.config.cellCount as number
        const chargeFrac = simBridge.getBatteryChargeFraction()
        const totalVoltage = lipoVoltage(cellCount, chargeFrac)
        const cellVoltages = simBridge.getBatteryCellVoltages()
        const currentDraw = this.config.currentDraw as number
        const capacityMah = this.config.capacityMah as number

        // Determine charging status based on charge level and current draw
        const chargingStatus = chargeFrac >= 1.0 ? 'full' : 'discharging'
        const capacityRemaining = Math.round(chargeFrac * 100)

        const data: Record<string, unknown> = {
          battery_voltage: parseFloat(totalVoltage.toFixed(2)),
          current_draw: currentDraw + noise(90, 0.5, Date.now() / 1000),
          cellCount,
          cellVoltages: cellVoltages.map(v => parseFloat(v.toFixed(3))),
          capacityRemaining,
          chargingStatus,
          estimatedTimeRemaining: (capacityMah * chargeFrac) / (currentDraw * 1000), // hours
          simulated: true,
        }

        await this.writeTelemetryToDb(this.deviceId, {
          battery_voltage: data.battery_voltage as number,
          current_draw: data.current_draw as number,
        })

        this.emitEvent('data_read', data)
        return data
      }

      // Real mode: read from ADC
      const channel = this.config.adcChannel as number
      let voltage: number
      try {
        const adcResult = await this.getBridgeManager().getBridge().readADC(channel)
        voltage = adcResult.voltage
      } catch {
        // If direct ADC not available, fall back to DB
        const dbData = await this.readTelemetryFromDb(this.deviceId, ['battery_voltage', 'current_draw'])
        const data: Record<string, unknown> = {
          ...dbData,
          cellCount: this.config.cellCount,
          simulated: false,
        }
        this.emitEvent('data_read', data)
        return data
      }

      const cellCount = this.config.cellCount as number
      // Convert ADC voltage back to actual battery voltage (accounting for voltage divider)
      const dividerRatio = (cellCount * 4.2) / 3.3 // Assuming divider scales max voltage to 3.3V ref
      const batteryVoltage = voltage * dividerRatio
      const chargeFrac = Math.max(0, Math.min(1, (batteryVoltage - cellCount * 3.0) / (cellCount * 1.2)))

      const data: Record<string, unknown> = {
        battery_voltage: parseFloat(batteryVoltage.toFixed(2)),
        current_draw: this.config.currentDraw as number,
        cellCount,
        capacityRemaining: Math.round(chargeFrac * 100),
        chargingStatus: chargeFrac >= 0.99 ? 'full' : 'discharging',
        simulated: false,
      }

      await this.writeTelemetryToDb(this.deviceId, {
        battery_voltage: data.battery_voltage as number,
        current_draw: data.current_draw as number,
      })

      this.emitEvent('data_read', data)
      return data
    } catch (err) {
      this.emitEvent('error', err)
      return { error: err instanceof Error ? err.message : 'Read error' }
    }
  }

  async writeData(data: Record<string, unknown>): Promise<WriteResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot write: not connected' }
    }
    try {
      await this.writeTelemetryToDb(this.deviceId, data)
      this.emitEvent('data_write', data)
      return { success: true, message: 'Data written to battery telemetry store' }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Write error'
      return { success: false, message: this.lastError }
    }
  }

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResult> {
    if (!this.isConnected() || !this.deviceId) {
      return { success: false, message: 'Cannot execute command: not connected', simulated: this.isSimulated() }
    }

    const simulated = this.isSimulated()

    try {
      switch (command) {
        case 'setCurrentDraw': {
          const current = (params?.currentDraw as number) ?? 8.5
          this.config.currentDraw = current
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setBatteryConnected(
              this.config.cellCount as number,
              this.config.capacityMah as number,
              current,
            )
          }
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: `Current draw set to ${current}A${simulated ? ' (simulated)' : ''}`, data: { currentDraw: current }, simulated }
        }

        case 'resetCharge': {
          if (simulated) {
            this.getBridgeManager().getSimulationBridge().setBatteryConnected(
              this.config.cellCount as number,
              this.config.capacityMah as number,
              this.config.currentDraw as number,
            )
          }
          this.emitEvent('command_executed', { command, params, simulated })
          return { success: true, message: simulated ? 'Battery charge reset to 100% (simulated)' : 'Charge reset command sent', simulated }
        }

        default:
          return { success: false, message: `Unknown command: ${command}. Supported: setCurrentDraw, resetCharge`, simulated }
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Command execution error'
      this.emitEvent('error', this.lastError)
      return { success: false, message: this.lastError, simulated }
    }
  }
}

// ============================================================
// DriverRegistry — Singleton registry for all device drivers
// ============================================================

export class DriverRegistry {
  private static instance: DriverRegistry
  private drivers: Map<string, DeviceDriver> = new Map()
  private globalEventListeners: DriverEventCallback[] = []

  private constructor() {
    // Register default drivers
    this.registerDriver(new PixhawkDriver())
    this.registerDriver(new RaspberryPiDriver())
    this.registerDriver(new GPSDriver())
    this.registerDriver(new CameraDriver())
    this.registerDriver(new I2CSensorDriver())
    this.registerDriver(new RadioDriver())
    this.registerDriver(new BatteryDriver())
  }

  static getInstance(): DriverRegistry {
    if (!DriverRegistry.instance) {
      DriverRegistry.instance = new DriverRegistry()
    }
    return DriverRegistry.instance
  }

  registerDriver(driver: DeviceDriver): void {
    const key = driver.deviceType
    this.drivers.set(key, driver)

    // Forward driver events to global listeners
    driver.onEvent((event) => {
      for (const cb of this.globalEventListeners) {
        try { cb(event) } catch (e) { console.error('[DriverRegistry] Global event listener error:', e) }
      }
    })
  }

  getDriver(deviceType: string): DeviceDriver | null {
    return this.drivers.get(deviceType) ?? null
  }

  getAllDrivers(): DeviceDriver[] {
    return Array.from(this.drivers.values())
  }

  onGlobalEvent(callback: DriverEventCallback): () => void {
    this.globalEventListeners.push(callback)
    return () => {
      this.globalEventListeners = this.globalEventListeners.filter(cb => cb !== callback)
    }
  }

  async connectDevice(deviceType: string, deviceId: string, config?: Record<string, unknown>): Promise<ConnectionResult> {
    const driver = this.drivers.get(deviceType)
    if (!driver) {
      return { success: false, message: `No driver registered for device type: ${deviceType}` }
    }

    // If already connected, disconnect first
    if (driver.isConnected()) {
      await driver.disconnect()
    }

    return driver.connect(deviceId, config)
  }

  async disconnectDevice(deviceType: string): Promise<void> {
    const driver = this.drivers.get(deviceType)
    if (!driver) {
      throw new Error(`No driver registered for device type: ${deviceType}`)
    }
    await driver.disconnect()
  }

  async healthCheckAll(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {}
    for (const [type, driver] of this.drivers) {
      if (driver.isConnected()) {
        results[type] = await driver.healthCheck()
      } else {
        results[type] = { healthy: false, details: { error: 'Not connected' }, latency: 0 }
      }
    }
    return results
  }

  /** Get the current hardware bridge mode */
  getBridgeMode(): BridgeMode {
    return HardwareBridgeManager.getInstance().getMode()
  }

  /** Switch to real hardware mode (falls back to simulation if unavailable) */
  async setRealMode(): Promise<{ mode: BridgeMode; message: string }> {
    return HardwareBridgeManager.getInstance().setRealMode()
  }

  /** Switch to simulation mode */
  setSimulationMode(): void {
    HardwareBridgeManager.getInstance().setSimulationMode()
  }
}
