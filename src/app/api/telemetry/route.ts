// ============================================================
// NANGGROE OS AI - Telemetry API
// GET  /api/telemetry — Get latest telemetry readings
// POST /api/telemetry — Add new telemetry reading (sensor/manual)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getLatestTelemetrySnapshot } from '@/lib/telemetry'
import { picoclawCheck } from '@/lib/agents'
import type { PicoClawCheckResult } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const metric = searchParams.get('metric')
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '100')
    const snapshot = searchParams.get('snapshot') === 'true'
    const safetyCheck = searchParams.get('safety') === 'true'

    // If snapshot requested, read the latest telemetry from the database
    if (snapshot) {
      const telemetrySnapshot = await getLatestTelemetrySnapshot()

      let safetyResult: PicoClawCheckResult | null = null
      if (safetyCheck && telemetrySnapshot) {
        safetyResult = picoclawCheck(telemetrySnapshot)

        // Create alerts for any critical/warning issues found
        for (const alert of safetyResult.alerts) {
          await db.alert.create({
            data: {
              level: alert.level,
              source: 'picoclaw',
              title: `${alert.metric} ${alert.level}`,
              message: alert.message,
              category: 'safety',
              isRead: false,
            },
          })
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          snapshot: telemetrySnapshot,
          safety: safetyResult,
          inFlight: !!(await db.mission.findFirst({ where: { status: 'active' } })),
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Build where clause for historical data
    const where: Record<string, unknown> = {}
    if (deviceId) where.deviceId = deviceId
    if (metric) where.metric = metric
    if (source) where.source = source

    const readings = await db.telemetryReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    // Get latest reading per metric
    const latestByMetric: Record<string, typeof readings[0]> = {}
    for (const r of readings) {
      if (!latestByMetric[r.metric]) {
        latestByMetric[r.metric] = r
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        readings,
        latestByMetric,
        total: readings.length,
      },
    })
  } catch (error) {
    console.error('[Telemetry API] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve telemetry data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { readings } = body as {
      readings?: Array<{
        deviceId?: string
        metric: string
        value: number
        unit?: string
        source?: string
      }>
    }

    // Accept real sensor or manual telemetry readings only
    if (readings && Array.isArray(readings)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created: any[] = []
      for (const r of readings) {
        const reading = await db.telemetryReading.create({
          data: {
            deviceId: r.deviceId || null,
            metric: r.metric,
            value: r.value,
            unit: r.unit || null,
            source: r.source || 'sensor',
          },
        })
        created.push(reading)
      }

      return NextResponse.json({
        success: true,
        data: { readings: created },
        message: `Created ${created.length} telemetry readings`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Provide readings array with sensor or manual data' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Telemetry API] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create telemetry readings' },
      { status: 500 }
    )
  }
}
