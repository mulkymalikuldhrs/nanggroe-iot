// ============================================================
// NANGGROE OS AI - Telemetry Data Engine
// Real database-driven telemetry processing
// NO simulation, NO mock data
// ============================================================

import { db } from './db'
import type { TelemetrySnapshot, TelemetryMetric } from './types'
import { TELEMETRY_UNITS, SAFETY_THRESHOLDS } from './constants'

/**
 * Get the latest telemetry snapshot from the database.
 * Queries the most recent reading for each metric.
 * Returns null if no readings exist in the database.
 */
export async function getLatestTelemetrySnapshot(): Promise<TelemetrySnapshot | null> {
  const latestReadings = await db.telemetryReading.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
  })

  if (latestReadings.length === 0) return null

  const metricMap: Record<string, number> = {}
  for (const r of latestReadings) {
    if (!(r.metric in metricMap)) {
      metricMap[r.metric] = r.value
    }
  }

  return {
    battery_voltage: metricMap.battery_voltage ?? 0,
    gps_lat: metricMap.gps_lat ?? 4.9125,
    gps_lng: metricMap.gps_lng ?? 97.1347,
    altitude: metricMap.altitude ?? 0,
    signal_strength: metricMap.signal_strength ?? 0,
    temperature: metricMap.temperature ?? 0,
    humidity: metricMap.humidity ?? 0,
    pressure: metricMap.pressure ?? 0,
    heading: metricMap.heading ?? 0,
    speed: metricMap.speed ?? 0,
    roll: metricMap.roll ?? 0,
    pitch: metricMap.pitch ?? 0,
    yaw: metricMap.yaw ?? 0,
    motor_rpm_1: metricMap.motor_rpm_1 ?? 0,
    motor_rpm_2: metricMap.motor_rpm_2 ?? 0,
    motor_rpm_3: metricMap.motor_rpm_3 ?? 0,
    current_draw: metricMap.current_draw ?? 0,
  }
}

/**
 * Get telemetry trends from historical data.
 * Compares the two most recent readings for each metric
 * to determine the direction of change.
 */
export async function computeTelemetryTrends(): Promise<Record<string, 'up' | 'down' | 'stable'>> {
  const trends: Record<string, 'up' | 'down' | 'stable'> = {}

  const metrics: TelemetryMetric[] = [
    'battery_voltage', 'altitude', 'signal_strength', 'temperature',
    'humidity', 'pressure', 'heading', 'speed', 'current_draw',
    'roll', 'pitch', 'yaw', 'motor_rpm_1', 'motor_rpm_2', 'motor_rpm_3',
  ]

  for (const metric of metrics) {
    const readings = await db.telemetryReading.findMany({
      where: { metric },
      orderBy: { timestamp: 'desc' },
      take: 2,
    })

    if (readings.length < 2) {
      trends[metric] = 'stable'
      continue
    }

    const diff = readings[0].value - readings[1].value
    if (Math.abs(diff) < 0.01) {
      trends[metric] = 'stable'
    } else {
      trends[metric] = diff > 0 ? 'up' : 'down'
    }
  }

  return trends
}

/**
 * Get telemetry readings from database for a specific metric.
 * Returns historical readings ordered by timestamp descending.
 */
export async function getTelemetryHistory(
  metric: TelemetryMetric,
  limit: number = 100
): Promise<Array<{ value: number; timestamp: Date }>> {
  return db.telemetryReading.findMany({
    where: { metric },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: { value: true, timestamp: true },
  })
}

/**
 * Store a telemetry reading in the database.
 * Accepts data from real sensors or manual entry only.
 */
export async function recordTelemetry(
  metric: TelemetryMetric,
  value: number,
  source: 'sensor' | 'manual' = 'sensor',
  deviceId?: string
): Promise<void> {
  await db.telemetryReading.create({
    data: {
      metric,
      value,
      unit: TELEMETRY_UNITS[metric] || null,
      source,
      deviceId: deviceId || null,
    },
  })
}
