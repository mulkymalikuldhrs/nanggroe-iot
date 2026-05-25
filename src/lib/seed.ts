// ============================================================
// NANGGROE OS AI - Database Seed (Initial Setup Only)
// Populates the database with initial system configuration,
// default hardware devices, and an initial session.
// This is NOT mock/simulated data — it represents the actual
// hardware configuration for the Aceh Utara MVP platform.
// Run once for initial database population.
// ============================================================

import { db } from './db'
import { DEFAULT_CONFIG, DEFAULT_HARDWARE } from './constants'

export async function seedDatabase(): Promise<{
  configs: number
  devices: number
  session: string
}> {
  console.log('[Seed] Starting NANGGROE OS AI database seeding...')

  // 1. Seed system configuration
  let configCount = 0
  for (const config of DEFAULT_CONFIG) {
    const existing = await db.systemConfig.findUnique({ where: { key: config.key } })
    if (!existing) {
      await db.systemConfig.create({
        data: {
          key: config.key,
          value: config.value,
          category: config.category,
        },
      })
      configCount++
    }
  }
  console.log(`[Seed] Created ${configCount} system config entries`)

  // 2. Seed default hardware devices
  let deviceCount = 0
  for (const hw of DEFAULT_HARDWARE) {
    const existing = await db.hardwareDevice.findFirst({
      where: { name: hw.name, deviceType: hw.deviceType },
    })
    if (!existing) {
      const device = await db.hardwareDevice.create({
        data: {
          name: hw.name,
          deviceType: hw.deviceType,
          protocol: hw.protocol,
          status: 'detected',
          vendorId: ((hw as Record<string, unknown>).vendorId as string | null) ?? null,
          productId: ((hw as Record<string, unknown>).productId as string | null) ?? null,
          port: ((hw as Record<string, unknown>).port as string | null) ?? null,
          address: ((hw as Record<string, unknown>).address as string | null) ?? null,
          capabilities: hw.capabilities ?? null,
          firmware: hw.firmware ?? null,
        },
      })

      // Create a default hardware profile for each device
      const adapterMap: Record<string, string> = {
        flight_controller: 'pixhawk',
        companion_computer: 'raspberry_pi',
        gps: 'ublox_neo_m8n',
        camera: 'rpi_camera_v2',
        sensor: 'bme280_mpu6050',
        radio: 'sik_radio',
        battery: 'lipo_monitor',
        motor: 'sunnysky_v2216',
        esc: 'blheli_s',
      }

      await db.hardwareProfile.create({
        data: {
          deviceId: device.id,
          adapterName: adapterMap[hw.deviceType] || 'generic',
          config: JSON.stringify({ baudRate: 57600, autoConnect: true }),
          isDefault: true,
        },
      })

      deviceCount++
    }
  }
  console.log(`[Seed] Created ${deviceCount} hardware devices`)

  // 3. Create initial session
  const existingSession = await db.session.findFirst({ where: { status: 'active' } })
  let sessionId: string
  if (!existingSession) {
    const session = await db.session.create({
      data: {
        name: 'Initial Session — Aceh Utara MVP',
        mode: 'discovery',
        status: 'active',
        config: JSON.stringify({
          region: 'Aceh Utara',
          homePosition: { lat: 4.9125, lng: 97.1347 },
          platform: 'tricopter_amphibious',
        }),
      },
    })
    sessionId = session.id
    console.log(`[Seed] Created initial session: ${session.id}`)
  } else {
    sessionId = existingSession.id
    console.log(`[Seed] Active session already exists: ${existingSession.id}`)
  }

  // 4. Create initial system alerts
  const existingAlerts = await db.alert.count()
  if (existingAlerts === 0) {
    await db.alert.createMany({
      data: [
        {
          level: 'info',
          source: 'system',
          title: 'System Initialized',
          message: 'NANGGROE OS AI has been initialized. All subsystems nominal.',
          category: 'system',
          isRead: false,
        },
        {
          level: 'info',
          source: 'hermes',
          title: 'Hermes Agent Online',
          message: 'Strategic planning agent is online and ready for mission commands.',
          category: 'system',
          isRead: false,
        },
        {
          level: 'info',
          source: 'picoclaw',
          title: 'PicoClaw Agent Online',
          message: 'Tactical safety agent is online and monitoring telemetry.',
          category: 'system',
          isRead: false,
        },
      ],
    })
    console.log('[Seed] Created initial system alerts')
  }

  console.log('[Seed] Seeding complete!')
  return {
    configs: configCount,
    devices: deviceCount,
    session: sessionId,
  }
}
