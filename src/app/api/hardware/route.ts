// ============================================================
// NANGGROE OS AI - Hardware Detection & Management API
// GET  /api/hardware — List all hardware devices with profiles
// POST /api/hardware — Trigger hardware detection scan (DB-based)
// PUT  /api/hardware — Update device status/profile
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const deviceType = searchParams.get('deviceType')

    // Build where clause
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (deviceType) where.deviceType = deviceType

    const devices = await db.hardwareDevice.findMany({
      where,
      include: {
        profiles: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get summary stats
    const stats = {
      total: await db.hardwareDevice.count(),
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    }

    const allDevices = await db.hardwareDevice.findMany()
    for (const d of allDevices) {
      stats.byStatus[d.status] = (stats.byStatus[d.status] || 0) + 1
      stats.byType[d.deviceType] = (stats.byType[d.deviceType] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      data: {
        devices,
        stats,
      },
    })
  } catch (error) {
    console.error('[Hardware API] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve hardware devices' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Real hardware detection: query the database for existing devices
    // and check their last-seen timestamps to determine current status.
    // If no devices exist, the seed function handles initial device creation.
    const existingDevices = await db.hardwareDevice.findMany()
    let newDevices = 0
    let updatedDevices = 0
    let offlineDevices = 0

    for (const device of existingDevices) {
      const timeSinceLastSeen = Date.now() - new Date(device.lastSeen).getTime()
      const isStale = timeSinceLastSeen > 60000 // 1 minute

      if (isStale && device.status !== 'offline') {
        // Mark stale devices as offline
        await db.hardwareDevice.update({
          where: { id: device.id },
          data: { status: 'offline' },
        })
        offlineDevices++
      } else if (!isStale && device.status === 'offline') {
        // Mark recently-seen offline devices as active
        await db.hardwareDevice.update({
          where: { id: device.id },
          data: { status: 'active', lastSeen: new Date() },
        })
        updatedDevices++
      } else if (!isStale) {
        // Update lastSeen for active devices
        await db.hardwareDevice.update({
          where: { id: device.id },
          data: { lastSeen: new Date() },
        })
        updatedDevices++
      }
    }

    // Create alert for scan result
    await db.alert.create({
      data: {
        level: 'info',
        source: 'system',
        title: 'Hardware Scan Complete',
        message: `Scan checked ${existingDevices.length} devices. Updated: ${updatedDevices}, Offline: ${offlineDevices}`,
        category: 'hardware',
        isRead: false,
      },
    })

    const finalDevices = await db.hardwareDevice.findMany({
      include: { profiles: true },
      orderBy: { lastSeen: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        scanned: existingDevices.length,
        newDevices,
        updatedDevices,
        offlineDevices,
        devices: finalDevices,
      },
      message: `Hardware scan complete: ${updatedDevices} updated, ${offlineDevices} offline`,
    })
  } catch (error) {
    console.error('[Hardware API] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform hardware scan' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, status, profileId, profileConfig } = body as {
      deviceId?: string
      status?: string
      profileId?: string
      profileConfig?: Record<string, unknown>
    }

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400 }
      )
    }

    const device = await db.hardwareDevice.findUnique({
      where: { id: deviceId },
    })

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }

    // Update device status
    if (status) {
      await db.hardwareDevice.update({
        where: { id: deviceId },
        data: {
          status,
          lastSeen: new Date(),
        },
      })
    }

    // Update profile config
    if (profileId && profileConfig) {
      await db.hardwareProfile.update({
        where: { id: profileId },
        data: { config: JSON.stringify(profileConfig) },
      })
    }

    const updatedDevice = await db.hardwareDevice.findUnique({
      where: { id: deviceId },
      include: { profiles: true },
    })

    return NextResponse.json({
      success: true,
      data: updatedDevice,
      message: 'Device updated successfully',
    })
  } catch (error) {
    console.error('[Hardware API] PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update hardware device' },
      { status: 500 }
    )
  }
}
