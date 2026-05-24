// ============================================================
// NANGGROE OS AI - Hardware Detection & Management API
// GET  /api/hardware — List all hardware devices with profiles
// POST /api/hardware — Trigger hardware detection scan
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
    // Simulate hardware detection scan
    // In production, this would trigger actual USB/I2C/SPI bus scanning
    const scanResults = simulateHardwareScan()

    let newDevices = 0
    let updatedDevices = 0

    for (const detected of scanResults) {
      // Check if device already exists
      const existing = await db.hardwareDevice.findFirst({
        where: {
          name: detected.name,
          deviceType: detected.deviceType,
        },
      })

      if (existing) {
        // Update status and lastSeen
        await db.hardwareDevice.update({
          where: { id: existing.id },
          data: {
            status: detected.status,
            lastSeen: new Date(),
            port: detected.port || existing.port,
            firmware: detected.firmware || existing.firmware,
          },
        })
        updatedDevices++
      } else {
        // Create new device
        const device = await db.hardwareDevice.create({
          data: {
            name: detected.name,
            deviceType: detected.deviceType,
            protocol: detected.protocol,
            status: detected.status,
            vendorId: detected.vendorId,
            productId: detected.productId,
            port: detected.port,
            address: detected.address,
            capabilities: detected.capabilities,
            firmware: detected.firmware,
          },
        })

        // Create default profile
        await db.hardwareProfile.create({
          data: {
            deviceId: device.id,
            adapterName: detected.adapterName || 'generic',
            config: JSON.stringify(detected.profileConfig || {}),
            isDefault: true,
          },
        })

        newDevices++
      }
    }

    // Create alert for scan result
    await db.alert.create({
      data: {
        level: 'info',
        source: 'system',
        title: 'Hardware Scan Complete',
        message: `Scan found ${scanResults.length} devices. New: ${newDevices}, Updated: ${updatedDevices}`,
        category: 'hardware',
        isRead: false,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        scanned: scanResults.length,
        newDevices,
        updatedDevices,
        devices: scanResults,
      },
      message: `Hardware scan complete: ${newDevices} new, ${updatedDevices} updated`,
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

// Simulated hardware scan — returns realistic detected devices
function simulateHardwareScan() {
  return [
    {
      name: 'Pixhawk 4',
      deviceType: 'flight_controller',
      protocol: 'uart',
      status: 'active',
      vendorId: '0x26AC',
      productId: '0x0012',
      port: '/dev/ttyAMA0',
      capabilities: JSON.stringify(['mavlink', 'gps', 'imu', 'barometer', 'compass', 'osd']),
      firmware: 'ArduPilot 4.5.7',
      adapterName: 'pixhawk',
      profileConfig: { baudRate: 57600, protocol: 'mavlink2', streamRate: 10 },
    },
    {
      name: 'Raspberry Pi 4B',
      deviceType: 'companion_computer',
      protocol: 'usb',
      status: 'active',
      vendorId: '0x1D6B',
      productId: '0x0104',
      port: '/dev/ttyS0',
      capabilities: JSON.stringify(['wifi', 'bluetooth', 'gpio', 'camera_interface', 'usb_host']),
      firmware: 'Raspberry Pi OS 64-bit',
      adapterName: 'raspberry_pi',
      profileConfig: { serialPort: '/dev/ttyS0', baudRate: 115200 },
    },
    {
      name: 'u-blox NEO-M8N',
      deviceType: 'gps',
      protocol: 'uart',
      status: 'active',
      vendorId: '0x1546',
      productId: '0x01A7',
      port: '/dev/ttyUSB0',
      capabilities: JSON.stringify(['gps', 'glonass', 'galileo', 'beidou']),
      firmware: '1.00',
      adapterName: 'ublox_neo_m8n',
      profileConfig: { baudRate: 9600, updateRate: 10 },
    },
    {
      name: 'Raspberry Pi Camera V2',
      deviceType: 'camera',
      protocol: 'gpio',
      status: 'active',
      port: '/dev/video0',
      capabilities: JSON.stringify(['still_capture', 'video', 'resolution_8mp']),
      firmware: 'IMX219',
      adapterName: 'rpi_camera_v2',
      profileConfig: { resolution: '3280x2464', fps: 30, format: 'jpeg' },
    },
    {
      name: 'BME280',
      deviceType: 'sensor',
      protocol: 'i2c',
      status: 'active',
      address: '0x76',
      capabilities: JSON.stringify(['temperature', 'humidity', 'pressure']),
      firmware: 'BME280',
      adapterName: 'bme280',
      profileConfig: { i2cBus: 1, address: '0x76', samplingRate: 2 },
    },
    {
      name: 'MPU6050',
      deviceType: 'sensor',
      protocol: 'i2c',
      status: 'active',
      address: '0x68',
      capabilities: JSON.stringify(['accelerometer', 'gyroscope']),
      firmware: 'MPU6050',
      adapterName: 'mpu6050',
      profileConfig: { i2cBus: 1, address: '0x68', accelRange: '2g', gyroRange: '250dps' },
    },
    {
      name: 'SiK Telemetry Radio',
      deviceType: 'radio',
      protocol: 'uart',
      status: 'active',
      port: '/dev/ttyUSB1',
      capabilities: JSON.stringify(['433mhz', 'mavlink', 'range_1km']),
      firmware: 'SiK 2.0',
      adapterName: 'sik_radio',
      profileConfig: { baudRate: 57600, frequency: '433MHz', airSpeed: 64 },
    },
    {
      name: '4S LiPo 4000mAh',
      deviceType: 'battery',
      protocol: 'adc',
      status: 'active',
      capabilities: JSON.stringify(['voltage_monitoring', 'current_monitoring', 'cell_count_4']),
      firmware: null,
      adapterName: 'lipo_monitor',
      profileConfig: { cells: 4, capacity: 4000, minVoltage: 12.6, maxVoltage: 16.8 },
    },
  ]
}
