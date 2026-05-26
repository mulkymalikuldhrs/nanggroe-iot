// ============================================================
// NANGGROE IOT - Hardware Simulator Service
// Generates simulated telemetry & device data for testing
// when no real hardware is connected.
// All simulated data is clearly marked with source='simulation'
// and stored in the database via Prisma.
// ============================================================

import { db } from './db'
import type { TelemetryMetric } from './types'
import { TELEMETRY_UNITS } from './constants'

// ============================================================
// Types
// ============================================================

export type SimulationProfile = 'drone' | 'rover' | 'boat' | 'amphibious' | 'arm' | 'idle'

export interface SimulationStatus {
  isRunning: boolean
  profile: SimulationProfile
  startedAt: string | null
  tickCount: number
  intervalMs: number
}

export interface SimulatedDevice {
  name: string
  deviceType: string
  protocol: string
  port?: string
  address?: string
  capabilities?: string[]
  firmware?: string
}

export interface SensorDataPoint {
  metric: TelemetryMetric
  value: number
  unit: string
  simulated: true
}

// ============================================================
// Profile Definitions
// Each profile defines realistic ranges and drift behavior
// ============================================================

interface MetricRange {
  min: number
  max: number
  /** Per-tick drift (additive noise range). 0 = slowly drifting sinusoidal. */
  noise: number
  /** Typical starting value */
  base: number
}

interface SimulationProfileConfig {
  label: string
  description: string
  metrics: Partial<Record<TelemetryMetric, MetricRange>>
  devices: SimulatedDevice[]
  drift: {
    /** How quickly values drift per tick (0-1) */
    rate: number
    /** Whether battery slowly discharges */
    batteryDrain: boolean
    /** Whether position slowly changes */
    positionDrift: boolean
  }
}

const PROFILES: Record<SimulationProfile, SimulationProfileConfig> = {
  drone: {
    label: 'Drone Tricopter',
    description: 'Simulated tricopter drone in flight with 3 motors, GPS lock, and IMU data',
    metrics: {
      battery_voltage: { min: 12.0, max: 16.8, noise: 0.05, base: 15.2 },
      gps_lat: { min: 4.90, max: 4.93, noise: 0.00005, base: 4.9125 },
      gps_lng: { min: 97.12, max: 97.15, noise: 0.00005, base: 97.1347 },
      altitude: { min: 0, max: 120, noise: 0.5, base: 50 },
      signal_strength: { min: -90, max: -30, noise: 2, base: -55 },
      temperature: { min: 20, max: 50, noise: 0.3, base: 32 },
      humidity: { min: 40, max: 95, noise: 1, base: 78 },
      pressure: { min: 990, max: 1020, noise: 0.5, base: 1010 },
      heading: { min: 0, max: 360, noise: 2, base: 180 },
      speed: { min: 0, max: 15, noise: 0.5, base: 5 },
      roll: { min: -30, max: 30, noise: 1.5, base: 0 },
      pitch: { min: -30, max: 30, noise: 1.5, base: 0 },
      yaw: { min: -180, max: 180, noise: 2, base: 0 },
      motor_rpm_1: { min: 0, max: 8000, noise: 50, base: 4500 },
      motor_rpm_2: { min: 0, max: 8000, noise: 50, base: 4500 },
      motor_rpm_3: { min: 0, max: 8000, noise: 50, base: 4200 },
      current_draw: { min: 0, max: 30, noise: 0.5, base: 12 },
    },
    devices: [
      { name: 'Pixhawk 4 (sim)', deviceType: 'flight_controller', protocol: 'uart', port: '/dev/ttyAMA0', capabilities: ['mavlink', 'gps', 'imu', 'barometer', 'compass'], firmware: 'ArduPilot 4.5.7' },
      { name: 'Raspberry Pi 4B (sim)', deviceType: 'companion_computer', protocol: 'usb', port: '/dev/ttyS0', capabilities: ['wifi', 'bluetooth', 'gpio', 'camera_interface'], firmware: 'Raspberry Pi OS 64-bit' },
      { name: 'u-blox NEO-M8N (sim)', deviceType: 'gps', protocol: 'uart', port: '/dev/ttyUSB0', capabilities: ['gps', 'glonass', 'galileo'], firmware: '1.00' },
      { name: 'Pi Camera V2 (sim)', deviceType: 'camera', protocol: 'gpio', port: '/dev/video0', capabilities: ['still_capture', 'video', 'resolution_8mp'], firmware: 'IMX219' },
      { name: 'BME280 (sim)', deviceType: 'sensor', protocol: 'i2c', address: '0x76', capabilities: ['temperature', 'humidity', 'pressure'], firmware: 'BME280' },
      { name: 'MPU6050 (sim)', deviceType: 'sensor', protocol: 'i2c', address: '0x68', capabilities: ['accelerometer', 'gyroscope'], firmware: 'MPU6050' },
      { name: 'SiK Radio (sim)', deviceType: 'radio', protocol: 'uart', port: '/dev/ttyUSB1', capabilities: ['433mhz', 'mavlink', 'range_1km'], firmware: 'SiK 2.0' },
      { name: '4S LiPo 4000mAh (sim)', deviceType: 'battery', protocol: 'adc', capabilities: ['voltage_monitoring', 'current_monitoring'] },
      { name: 'Motor 1 (sim)', deviceType: 'motor', protocol: 'esc', capabilities: ['brushless', 'kv900'] },
      { name: 'Motor 2 (sim)', deviceType: 'motor', protocol: 'esc', capabilities: ['brushless', 'kv900'] },
      { name: 'Motor 3 (sim)', deviceType: 'motor', protocol: 'esc', capabilities: ['brushless', 'kv900'] },
    ],
    drift: { rate: 0.02, batteryDrain: true, positionDrift: true },
  },
  rover: {
    label: 'Rover Darat 4 Roda',
    description: 'Simulated 4-wheel rover driving on terrain with GPS and obstacle detection',
    metrics: {
      battery_voltage: { min: 9.0, max: 12.6, noise: 0.03, base: 11.8 },
      gps_lat: { min: 4.90, max: 4.93, noise: 0.00003, base: 4.9125 },
      gps_lng: { min: 97.12, max: 97.15, noise: 0.00003, base: 97.1347 },
      altitude: { min: 0, max: 50, noise: 0.3, base: 5 },
      signal_strength: { min: -90, max: -30, noise: 2, base: -60 },
      temperature: { min: 25, max: 45, noise: 0.3, base: 35 },
      humidity: { min: 50, max: 95, noise: 1, base: 80 },
      pressure: { min: 1000, max: 1020, noise: 0.3, base: 1010 },
      heading: { min: 0, max: 360, noise: 1, base: 90 },
      speed: { min: 0, max: 5, noise: 0.2, base: 2 },
      roll: { min: -10, max: 10, noise: 0.5, base: 0 },
      pitch: { min: -15, max: 15, noise: 0.5, base: 0 },
      yaw: { min: -180, max: 180, noise: 1, base: 0 },
      current_draw: { min: 0, max: 15, noise: 0.3, base: 5 },
    },
    devices: [
      { name: 'Pixhawk 4 Rover (sim)', deviceType: 'flight_controller', protocol: 'uart', port: '/dev/ttyAMA0', capabilities: ['rover_mode', 'gps', 'obstacle_avoidance'], firmware: 'ArduPilot 4.5.7 Rover' },
      { name: 'Raspberry Pi 4B (sim)', deviceType: 'companion_computer', protocol: 'usb', capabilities: ['wifi', 'gpio'] },
      { name: 'u-blox NEO-M8N (sim)', deviceType: 'gps', protocol: 'uart', port: '/dev/ttyUSB0', capabilities: ['gps'] },
      { name: 'USB Camera (sim)', deviceType: 'camera', protocol: 'usb', port: '/dev/video0', capabilities: ['video'] },
    ],
    drift: { rate: 0.2, batteryDrain: true, positionDrift: true },
  },
  boat: {
    label: 'Kapal Amfibi USV',
    description: 'Simulated surface vessel on water with GPS navigation and water sensors',
    metrics: {
      battery_voltage: { min: 12.0, max: 16.8, noise: 0.04, base: 14.8 },
      gps_lat: { min: 4.90, max: 4.93, noise: 0.00004, base: 4.9125 },
      gps_lng: { min: 97.12, max: 97.15, noise: 0.00004, base: 97.1347 },
      altitude: { min: -1, max: 2, noise: 0.2, base: 0 },
      signal_strength: { min: -90, max: -30, noise: 3, base: -65 },
      temperature: { min: 22, max: 38, noise: 0.3, base: 28 },
      humidity: { min: 70, max: 100, noise: 1, base: 90 },
      pressure: { min: 1005, max: 1018, noise: 0.4, base: 1012 },
      heading: { min: 0, max: 360, noise: 3, base: 270 },
      speed: { min: 0, max: 8, noise: 0.3, base: 3 },
      roll: { min: -20, max: 20, noise: 3, base: 0 },
      pitch: { min: -10, max: 10, noise: 2, base: 0 },
      current_draw: { min: 0, max: 20, noise: 0.5, base: 8 },
    },
    devices: [
      { name: 'Pixhawk 4 Boat (sim)', deviceType: 'flight_controller', protocol: 'uart', capabilities: ['boat_mode', 'gps'], firmware: 'ArduPilot 4.5.7 Boat' },
      { name: 'Raspberry Pi 4B (sim)', deviceType: 'companion_computer', protocol: 'usb', capabilities: ['wifi', 'gpio'] },
      { name: 'u-blox NEO-M8N (sim)', deviceType: 'gps', protocol: 'uart', capabilities: ['gps'] },
    ],
    drift: { rate: 0.25, batteryDrain: true, positionDrift: true },
  },
  amphibious: {
    label: 'Amphibious Tricopter',
    description: 'Simulated amphibious tricopter that can fly, float, and drive on land',
    metrics: {
      battery_voltage: { min: 12.0, max: 16.8, noise: 0.05, base: 14.8 },
      gps_lat: { min: 4.90, max: 4.93, noise: 0.00005, base: 4.9125 },
      gps_lng: { min: 97.12, max: 97.15, noise: 0.00005, base: 97.1347 },
      altitude: { min: -1, max: 120, noise: 0.5, base: 25 },
      signal_strength: { min: -90, max: -30, noise: 2, base: -50 },
      temperature: { min: 22, max: 45, noise: 0.3, base: 30 },
      humidity: { min: 50, max: 100, noise: 1, base: 85 },
      pressure: { min: 990, max: 1020, noise: 0.5, base: 1010 },
      heading: { min: 0, max: 360, noise: 2, base: 135 },
      speed: { min: 0, max: 12, noise: 0.4, base: 4 },
      roll: { min: -25, max: 25, noise: 2, base: 0 },
      pitch: { min: -25, max: 25, noise: 2, base: 0 },
      yaw: { min: -180, max: 180, noise: 2, base: 0 },
      motor_rpm_1: { min: 0, max: 8000, noise: 50, base: 4000 },
      motor_rpm_2: { min: 0, max: 8000, noise: 50, base: 4000 },
      motor_rpm_3: { min: 0, max: 8000, noise: 50, base: 3800 },
      current_draw: { min: 0, max: 25, noise: 0.5, base: 10 },
    },
    devices: [
      { name: 'Pixhawk 4 Amphibious (sim)', deviceType: 'flight_controller', protocol: 'uart', capabilities: ['tricopter', 'rover_mode', 'boat_mode', 'gps', 'imu'], firmware: 'ArduPilot 4.5.7 Tricopter' },
      { name: 'Raspberry Pi 4B (sim)', deviceType: 'companion_computer', protocol: 'usb', capabilities: ['wifi', 'bluetooth', 'gpio', 'camera_interface'] },
      { name: 'u-blox NEO-M8N (sim)', deviceType: 'gps', protocol: 'uart', capabilities: ['gps', 'glonass'] },
      { name: 'Pi Camera V2 (sim)', deviceType: 'camera', protocol: 'gpio', capabilities: ['still_capture', 'video'] },
      { name: 'BME280 (sim)', deviceType: 'sensor', protocol: 'i2c', address: '0x76', capabilities: ['temperature', 'humidity', 'pressure'] },
      { name: 'MPU6050 (sim)', deviceType: 'sensor', protocol: 'i2c', address: '0x68', capabilities: ['accelerometer', 'gyroscope'] },
    ],
    drift: { rate: 0.3, batteryDrain: true, positionDrift: true },
  },
  arm: {
    label: 'Robotic Arm 6-DOF',
    description: 'Simulated 6-DOF robotic arm with servo feedback and grip force sensor',
    metrics: {
      battery_voltage: { min: 4.5, max: 5.5, noise: 0.02, base: 5.0 },
      temperature: { min: 20, max: 50, noise: 0.3, base: 28 },
      humidity: { min: 30, max: 80, noise: 1, base: 55 },
      pressure: { min: 1000, max: 1020, noise: 0.3, base: 1010 },
      current_draw: { min: 0, max: 10, noise: 0.2, base: 2 },
    },
    devices: [
      { name: 'Arduino Mega 2560 (sim)', deviceType: 'flight_controller', protocol: 'usb', capabilities: ['servo_control', 'adc', 'i2c'], firmware: 'Nanggroe Arm Controller 1.0.0' },
      { name: 'PCA9685 (sim)', deviceType: 'sensor', protocol: 'i2c', address: '0x40', capabilities: ['pwm_driver', '16_channel'], firmware: 'PCA9685' },
      { name: 'MPU6050 (sim)', deviceType: 'sensor', protocol: 'i2c', address: '0x68', capabilities: ['accelerometer', 'gyroscope'], firmware: 'MPU6050' },
    ],
    drift: { rate: 0.1, batteryDrain: false, positionDrift: false },
  },
  idle: {
    label: 'Idle / No Simulation',
    description: 'No active simulation — system at rest with minimal sensor readings',
    metrics: {
      battery_voltage: { min: 12.0, max: 16.8, noise: 0.01, base: 15.6 },
      temperature: { min: 20, max: 35, noise: 0.2, base: 25 },
      humidity: { min: 50, max: 90, noise: 0.5, base: 70 },
      pressure: { min: 1005, max: 1018, noise: 0.2, base: 1012 },
    },
    devices: [],
    drift: { rate: 0.05, batteryDrain: false, positionDrift: false },
  },
}

// ============================================================
// SimulatorEngine — Singleton
// ============================================================

class SimulatorEngine {
  private static instance: SimulatorEngine
  private timer: ReturnType<typeof setInterval> | null = null
  private profile: SimulationProfile = 'idle'
  private tickCount: number = 0
  private intervalMs: number = 1000
  private startedAt: Date | null = null

  /** Running state per metric to generate smooth sinusoidal drift */
  private metricState: Map<string, number> = new Map()

  private constructor() {}

  static getInstance(): SimulatorEngine {
    if (!SimulatorEngine.instance) {
      SimulatorEngine.instance = new SimulatorEngine()
    }
    return SimulatorEngine.instance
  }

  // -------------------------------------------
  // Start / Stop
  // -------------------------------------------

  start(profile: SimulationProfile = 'drone', intervalMs: number = 1000): void {
    if (this.timer) {
      this.stop()
    }

    this.profile = profile
    this.intervalMs = Math.max(250, intervalMs)
    this.tickCount = 0
    this.startedAt = new Date()
    this.metricState.clear()

    // Seed initial state from profile base values
    const profileConfig = PROFILES[profile]
    for (const [metric, range] of Object.entries(profileConfig.metrics)) {
      this.metricState.set(metric, range.base)
    }

    this.timer = setInterval(() => {
      this.tick().catch(err => {
      })
    }, this.intervalMs)

  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.startedAt = null
  }

  getStatus(): SimulationStatus {
    return {
      isRunning: this.timer !== null,
      profile: this.profile,
      startedAt: this.startedAt?.toISOString() ?? null,
      tickCount: this.tickCount,
      intervalMs: this.intervalMs,
    }
  }

  // -------------------------------------------
  // Tick — generate and persist simulated data
  // -------------------------------------------

  private async tick(): Promise<void> {
    this.tickCount++
    const profileConfig = PROFILES[this.profile]
    const dataPoints = generateSensorData(this.profile, this.metricState, profileConfig.drift)

    try {
      // Persist all data points to telemetry readings with source='simulation'
      for (const dp of dataPoints) {
        await db.telemetryReading.create({
          data: {
            metric: dp.metric,
            value: dp.value,
            unit: dp.unit,
            source: 'simulation',
          },
        })
      }
    } catch (error) {
    }
  }
}

// ============================================================
// Exported Functions
// ============================================================

/**
 * Start the hardware simulator with the given profile.
 * Generates simulated telemetry readings at the specified interval
 * and stores them in the database with source='simulation'.
 */
export function startSimulation(profile: SimulationProfile = 'drone', intervalMs: number = 1000): void {
  SimulatorEngine.getInstance().start(profile, intervalMs)
}

/**
 * Stop the currently running simulation.
 */
export function stopSimulation(): void {
  SimulatorEngine.getInstance().stop()
}

/**
 * Get the current simulation status (running/stopped, profile, tick count, etc.).
 */
export function getSimulationStatus(): SimulationStatus {
  return SimulatorEngine.getInstance().getStatus()
}

/**
 * Simulate detection of hardware devices for the given profile.
 * Creates simulated device entries in the database if they don't already exist.
 * Returns the list of created or existing device IDs.
 */
export async function simulateDevice(profile: SimulationProfile = 'drone'): Promise<string[]> {
  const profileConfig = PROFILES[profile]
  const deviceIds: string[] = []

  for (const device of profileConfig.devices) {
    try {
      // Check if a simulated device with this name already exists
      const existing = await db.hardwareDevice.findFirst({
        where: {
          name: device.name,
          deviceType: device.deviceType,
        },
      })

      if (existing) {
        deviceIds.push(existing.id)
        continue
      }

      const created = await db.hardwareDevice.create({
        data: {
          name: device.name,
          deviceType: device.deviceType,
          protocol: device.protocol,
          port: device.port ?? null,
          address: device.address ?? null,
          capabilities: device.capabilities ? JSON.stringify(device.capabilities) : null,
          firmware: device.firmware ?? null,
          status: 'active',
          lastSeen: new Date(),
        },
      })
      deviceIds.push(created.id)
    } catch (error) {
    }
  }

  return deviceIds
}

/**
 * Generate a single batch of sensor data for the given profile
 * without starting the simulation loop. Useful for one-shot data generation.
 * Updates the provided state map in-place to enable smooth transitions.
 */
export function generateSensorData(
  profile: SimulationProfile = 'drone',
  state?: Map<string, number>,
  driftConfig?: { rate: number; batteryDrain: boolean; positionDrift: boolean },
): SensorDataPoint[] {
  const profileConfig = PROFILES[profile]
  const metricState = state ?? new Map<string, number>()
  const drift = driftConfig ?? profileConfig.drift

  const results: SensorDataPoint[] = []

  for (const [metric, range] of Object.entries(profileConfig.metrics)) {
    const current = metricState.get(metric) ?? range.base

    // Generate noise
    const noise = (Math.random() - 0.5) * 2 * range.noise

    // Sinusoidal drift component for smooth variation
    const driftAmount = drift.rate * (range.max - range.min) * 0.01
    const sinComponent = Math.sin(Date.now() / 10000 + metric.length) * driftAmount

    let nextValue = current + noise + sinComponent

    // Battery drain: slowly decrease voltage over time
    if (drift.batteryDrain && metric === 'battery_voltage') {
      nextValue -= 0.002
    }

    // Position drift: slowly move lat/lng
    if (drift.positionDrift && metric === 'gps_lat') {
      nextValue += (Math.random() - 0.48) * 0.00001
    }
    if (drift.positionDrift && metric === 'gps_lng') {
      nextValue += (Math.random() - 0.48) * 0.00001
    }

    // Clamp to range
    nextValue = Math.max(range.min, Math.min(range.max, nextValue))

    // Update state for next tick
    metricState.set(metric, nextValue)

    results.push({
      metric: metric as TelemetryMetric,
      value: Math.round(nextValue * 1000) / 1000, // 3 decimal precision
      unit: TELEMETRY_UNITS[metric] || '',
      simulated: true,
    })
  }

  return results
}
