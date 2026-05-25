import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SYSTEM_START_TIME = Date.now()

export async function GET() {
  try {
    // Device counts from DB
    const [
      totalDevices,
      activeDevices,
      errorDevices,
      offlineDevices,
      detectedDevices,
    ] = await Promise.all([
      db.hardwareDevice.count(),
      db.hardwareDevice.count({ where: { status: 'active' } }),
      db.hardwareDevice.count({ where: { status: 'error' } }),
      db.hardwareDevice.count({ where: { status: 'offline' } }),
      db.hardwareDevice.count({ where: { status: 'detected' } }),
    ])

    // Determine mode from hardware bridge config
    let mode = 'simulation'
    try {
      const bridgeConfig = await db.systemConfig.findUnique({
        where: { key: 'hardware_bridge.mode' },
      })
      if (bridgeConfig) {
        mode = bridgeConfig.value
      }
    } catch {
      // Default to simulation
    }

    // System version from config
    let version = '1.0.0'
    try {
      const versionConfig = await db.systemConfig.findUnique({
        where: { key: 'system.version' },
      })
      if (versionConfig) {
        version = versionConfig.value
      }
    } catch {
      // Default version
    }

    const uptimeSeconds = Math.floor((Date.now() - SYSTEM_START_TIME) / 1000)
    const hours = Math.floor(uptimeSeconds / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    const seconds = uptimeSeconds % 60

    return NextResponse.json({
      success: true,
      data: {
        system: 'Nanggroe OS AI',
        version,
        mode,
        uptime: {
          seconds: uptimeSeconds,
          formatted: `${hours}h ${minutes}m ${seconds}s`,
        },
        timestamp: new Date().toISOString(),
        devices: {
          total: totalDevices,
          active: activeDevices,
          detected: detectedDevices,
          error: errorDevices,
          offline: offlineDevices,
        },
      },
    })
  } catch (error) {
    console.error('[System Health API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve system health information',
      },
      { status: 500 }
    )
  }
}
