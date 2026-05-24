// ============================================================
// NANGGROE OS AI - Telemetry Simulator
// Generates realistic telemetry data for Aceh Utara MVP
// ============================================================

import type { TelemetrySnapshot, TelemetryMetric } from './types'
import { TELEMETRY_UNITS } from './constants'

// Simulator state — tracks gradual changes between readings
interface SimState {
  batteryDrain: number // cumulative drain factor
  heading: number
  altitude: number
  speed: number
  roll: number
  pitch: number
  yaw: number
  lat: number
  lng: number
  tick: number
}

const initialState: SimState = {
  batteryDrain: 0,
  heading: 45,
  altitude: 0,
  speed: 0,
  roll: 0,
  pitch: 0,
  yaw: 0,
  lat: 4.9125,
  lng: 97.1347,
  tick: 0,
}

let simState: SimState = { ...initialState }

export function resetSimState(): void {
  simState = { ...initialState }
}

// Pseudo-random with seed-like behavior for consistency
function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * 2 * range
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Generate a full telemetry snapshot for the current sim tick.
 * Battery voltage gradually decreases over time.
 * GPS coordinates slowly drift around the Aceh Utara region.
 * Attitude values simulate gentle flight dynamics.
 */
export function generateTelemetrySnapshot(isInFlight: boolean = false): TelemetrySnapshot {
  simState.tick++

  if (isInFlight) {
    // Simulate flight dynamics
    simState.batteryDrain += 0.002 + Math.random() * 0.003
    simState.altitude = jitter(60, 8)
    simState.speed = jitter(5, 1.5)
    simState.heading = (simState.heading + jitter(1, 2)) % 360
    simState.roll = jitter(0, 5)
    simState.pitch = jitter(0, 3)
    simState.yaw = jitter(0, 4)

    // GPS drift around Aceh Utara
    simState.lat = jitter(4.9125, 0.003)
    simState.lng = jitter(97.1347, 0.003)
  } else {
    // Ground idle state
    simState.altitude = jitter(0, 0.5)
    simState.speed = jitter(0, 0.2)
    simState.roll = jitter(0, 0.5)
    simState.pitch = jitter(0, 0.5)
    simState.yaw = jitter(0, 1)
    simState.batteryDrain += 0.0001
  }

  const batteryVoltage = clamp(14.8 - simState.batteryDrain, 12.0, 14.8)

  return {
    battery_voltage: Math.round(batteryVoltage * 100) / 100,
    gps_lat: Math.round(simState.lat * 100000) / 100000,
    gps_lng: Math.round(simState.lng * 100000) / 100000,
    altitude: Math.round(clamp(simState.altitude, 0, 120) * 10) / 10,
    signal_strength: Math.round(jitter(-50, 15) * 10) / 10,
    temperature: Math.round(jitter(29, 3) * 10) / 10,
    humidity: Math.round(jitter(78, 10) * 10) / 10,
    pressure: Math.round(jitter(1010, 4) * 10) / 10,
    heading: Math.round((simState.heading + 360) % 360),
    speed: Math.round(clamp(simState.speed, 0, 15) * 10) / 10,
    roll: Math.round(simState.roll * 100) / 100,
    pitch: Math.round(simState.pitch * 100) / 100,
    yaw: Math.round(((simState.yaw + 360) % 360) * 100) / 100,
    motor_rpm_1: isInFlight ? Math.round(jitter(4500, 300)) : 0,
    motor_rpm_2: isInFlight ? Math.round(jitter(4500, 300)) : 0,
    motor_rpm_3: isInFlight ? Math.round(jitter(4500, 300)) : 0,
    current_draw: isInFlight ? Math.round(jitter(18, 4) * 10) / 10 : Math.round(jitter(0.5, 0.2) * 10) / 10,
  }
}

/**
 * Generate individual telemetry readings from a snapshot.
 * Returns an array of readings suitable for bulk insert.
 */
export function generateTelemetryReadings(
  snapshot: TelemetrySnapshot,
  deviceId?: string,
  source: 'sensor' | 'simulated' | 'manual' = 'simulated'
): Array<{ metric: TelemetryMetric; value: number; unit: string; deviceId?: string; source: string }> {
  const readings: Array<{ metric: TelemetryMetric; value: number; unit: string; deviceId?: string; source: string }> = []

  for (const [metric, value] of Object.entries(snapshot)) {
    const unit = TELEMETRY_UNITS[metric] || ''
    readings.push({
      metric: metric as TelemetryMetric,
      value: value as number,
      unit,
      deviceId,
      source,
    })
  }

  return readings
}

/**
 * Generate a single telemetry reading for a specific metric.
 */
export function generateSingleReading(
  metric: TelemetryMetric,
  deviceId?: string,
  source: 'sensor' | 'simulated' | 'manual' = 'simulated'
): { metric: TelemetryMetric; value: number; unit: string; deviceId?: string; source: string } {
  const snapshot = generateTelemetrySnapshot(false)
  const value = snapshot[metric]
  const unit = TELEMETRY_UNITS[metric] || ''

  return {
    metric,
    value: value as number,
    unit,
    deviceId,
    source,
  }
}

/**
 * Get the current simulator tick (useful for debugging).
 */
export function getSimTick(): number {
  return simState.tick
}
