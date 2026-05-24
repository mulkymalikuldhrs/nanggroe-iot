// ============================================================
// NANGGROE OS AI - Calibration Management API
// GET  /api/calibration — List calibration records
// POST /api/calibration — Start new calibration
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceType = searchParams.get('deviceType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (deviceType) where.deviceType = deviceType
    if (status) where.status = status

    const calibrations = await db.calibration.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      take: limit,
    })

    // Get calibration stats
    const stats = {
      total: await db.calibration.count(),
      pending: await db.calibration.count({ where: { status: 'pending' } }),
      inProgress: await db.calibration.count({ where: { status: 'in_progress' } }),
      completed: await db.calibration.count({ where: { status: 'completed' } }),
      failed: await db.calibration.count({ where: { status: 'failed' } }),
    }

    return NextResponse.json({
      success: true,
      data: {
        calibrations,
        stats,
      },
    })
  } catch (error) {
    console.error('[Calibration API] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve calibration records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceType, deviceId, parameters } = body as {
      deviceType: string
      deviceId?: string
      parameters?: Record<string, unknown>
    }

    if (!deviceType) {
      return NextResponse.json(
        { success: false, error: 'deviceType is required' },
        { status: 400 }
      )
    }

    const validTypes = ['compass', 'accelerometer', 'gyro', 'esc', 'radio']
    if (!validTypes.includes(deviceType)) {
      return NextResponse.json(
        { success: false, error: `Invalid deviceType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create calibration record
    const calibration = await db.calibration.create({
      data: {
        deviceType,
        deviceId: deviceId || null,
        status: 'pending',
        parameters: parameters ? JSON.stringify(parameters) : null,
      },
    })

    // Simulate calibration process asynchronously
    // In production, this would trigger the actual calibration routine
    simulateCalibration(calibration.id, deviceType).catch(err => {
      console.error('[Calibration] Simulation error:', err)
    })

    return NextResponse.json({
      success: true,
      data: calibration,
      message: `Calibration for ${deviceType} initiated. Check status for progress.`,
    }, { status: 201 })
  } catch (error) {
    console.error('[Calibration API] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start calibration' },
      { status: 500 }
    )
  }
}

/**
 * Simulates a calibration process with realistic timing and results.
 * Updates the calibration record in the database as it progresses.
 */
async function simulateCalibration(calibrationId: string, deviceType: string): Promise<void> {
  // Mark as in_progress
  await db.calibration.update({
    where: { id: calibrationId },
    data: { status: 'in_progress' },
  })

  // Simulated calibration durations
  const durations: Record<string, number> = {
    compass: 3000,
    accelerometer: 2000,
    gyro: 2500,
    esc: 4000,
    radio: 1500,
  }

  const duration = durations[deviceType] || 2000

  // Wait for simulated calibration
  await new Promise(resolve => setTimeout(resolve, duration))

  // Simulate calibration results
  const results: Record<string, Record<string, unknown>> = {
    compass: {
      offsets: { x: Math.round((Math.random() - 0.5) * 40), y: Math.round((Math.random() - 0.5) * 40), z: Math.round((Math.random() - 0.5) * 40) },
      deviation: Math.round(Math.random() * 5 * 100) / 100,
      status: 'calibrated',
    },
    accelerometer: {
      offsets: { x: Math.round((Math.random() - 0.5) * 0.1 * 1000) / 1000, y: Math.round((Math.random() - 0.5) * 0.1 * 1000) / 1000, z: Math.round((Math.random() * 0.1 + 0.98) * 1000) / 1000 },
      scaling: 1.0,
      status: 'calibrated',
    },
    gyro: {
      offsets: { x: Math.round((Math.random() - 0.5) * 2 * 100) / 100, y: Math.round((Math.random() - 0.5) * 2 * 100) / 100, z: Math.round((Math.random() - 0.5) * 2 * 100) / 100 },
      noise: Math.round(Math.random() * 0.05 * 1000) / 1000,
      status: 'calibrated',
    },
    esc: {
      minPulse: 1000,
      maxPulse: 2000,
      motorsCalibrated: 3,
      direction: ['CW', 'CCW', 'CW'],
      status: 'calibrated',
    },
    radio: {
      frequency: '433MHz',
      rssi: Math.round(-30 - Math.random() * 30),
      noise: Math.round(-90 - Math.random() * 20),
      linkQuality: Math.round(90 + Math.random() * 10),
      status: 'calibrated',
    },
  }

  // 90% chance of success
  const success = Math.random() > 0.1

  await db.calibration.update({
    where: { id: calibrationId },
    data: {
      status: success ? 'completed' : 'failed',
      results: JSON.stringify(success ? results[deviceType] : { error: 'Calibration failed: insufficient signal quality' }),
    },
  })

  // Create alert for calibration result
  await db.alert.create({
    data: {
      level: success ? 'info' : 'warning',
      source: 'system',
      title: success ? `${deviceType} Calibration Complete` : `${deviceType} Calibration Failed`,
      message: success
        ? `${deviceType} has been successfully calibrated. Results: ${JSON.stringify(results[deviceType]).substring(0, 100)}...`
        : `${deviceType} calibration failed. Please retry or check hardware connections.`,
      category: 'hardware',
      isRead: false,
    },
  })
}
