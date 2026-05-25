// ============================================================
// NANGGROE OS AI - Database Seed (Initial Setup Only)
// Populates the database with initial system configuration,
// default hardware devices, and an initial session.
// This is NOT mock/simulated data — it represents the actual
// hardware configuration for the Aceh Utara MVP platform.
// Run once for initial database population.
// ============================================================

import { db } from './db'
import {
  DEFAULT_CONFIG,
  DEFAULT_HARDWARE,
  BUILTIN_ROBOT_TEMPLATES,
  COMM_CHANNEL_TYPES,
  COMM_CHANNEL_LABELS,
  COMM_CHANNEL_ICONS,
  POWER_SOURCE_TYPES,
  POWER_SOURCE_LABELS,
} from './constants'

export async function seedDatabase(): Promise<{
  configs: number
  devices: number
  templates: number
  channels: number
  powerSources: number
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

  // 3. Seed robot templates from BUILTIN_ROBOT_TEMPLATES
  let templateCount = 0
  for (const tmpl of BUILTIN_ROBOT_TEMPLATES) {
    const existing = await db.robotTemplate.findFirst({
      where: { name: tmpl.name, category: tmpl.category },
    })
    if (!existing) {
      await db.robotTemplate.create({
        data: {
          name: tmpl.name,
          description: tmpl.description,
          category: tmpl.category,
          icon: tmpl.icon,
          requiredHardware: JSON.stringify(tmpl.requiredHardware),
          requiredFirmware: JSON.stringify(tmpl.requiredFirmware),
          capabilities: JSON.stringify(tmpl.capabilities),
          autoConfig: JSON.stringify({ autoDetect: true, autoCalibrate: true }),
          assemblyGuide: JSON.stringify(tmpl.assemblyGuide),
          wiringDiagram: JSON.stringify(tmpl.wiringDiagram),
          difficulty: tmpl.difficulty,
          estimatedBuildHours: tmpl.estimatedBuildHours,
          isOfficial: tmpl.isOfficial,
          version: '1.0.0',
        },
      })
      templateCount++
    }
  }
  console.log(`[Seed] Created ${templateCount} robot templates`)

  // 4. Seed default communication channels
  let channelCount = 0
  const defaultChannelConfigs: Record<string, Record<string, unknown>> = {
    telegram: { botToken: '', chatId: '', commands: ['/status', '/arm', '/disarm', '/rth', '/land', '/help'] },
    voice: { language: 'id', ttsEnabled: true, sttEnabled: true, wakeWord: 'nanggroe' },
    android: { port: 8081, authRequired: true, joystickEnabled: true },
    beep: { pin: 18, patterns: ['startup', 'warning', 'critical', 'success', 'land', 'rth', 'arm', 'disarm'] },
    gsm: { serialPort: '/dev/ttyUSB2', baudRate: 115200, emergencyNumber: '', apn: '' },
    radio: { frequency: '433MHz', protocol: 'mavlink', baudRate: 57600 },
  }
  for (const type of COMM_CHANNEL_TYPES) {
    const existing = await db.communicationChannel.findFirst({
      where: { type: type, name: COMM_CHANNEL_LABELS[type] ?? type },
    })
    if (!existing) {
      await db.communicationChannel.create({
        data: {
          type: type,
          name: COMM_CHANNEL_LABELS[type] ?? type,
          config: JSON.stringify(defaultChannelConfigs[type] ?? {}),
          status: 'disconnected',
          isEnabled: type === 'radio', // Only radio is enabled by default
        },
      })
      channelCount++
    }
  }
  console.log(`[Seed] Created ${channelCount} communication channels`)

  // 5. Seed default power sources
  let powerSourceCount = 0
  const defaultPowerConfigs: Record<string, Record<string, unknown>> = {
    battery: { chemistry: 'LiPo', cellCount: 4, maxVoltage: 16.8, minVoltage: 12.6, nominalVoltage: 14.8, capacityMah: 4000 },
    solar: { wattage: 5, voltage: 5, chargingMode: 'emergency', chargeController: 'PWM' },
    gsm: { batteryType: 'Li-Ion', capacityMah: 1200, voltage: 3.7, purpose: 'GSM module backup' },
    usb: { voltage: 5, maxCurrent: 3, purpose: 'Development power' },
  }
  for (const type of POWER_SOURCE_TYPES) {
    const existing = await db.powerSource.findFirst({
      where: { type: type, name: POWER_SOURCE_LABELS[type] ?? type },
    })
    if (!existing) {
      const batteryDefaults = type === 'battery'
        ? { capacity: 4000, voltage: 14.8, current: 0, currentLevel: 100, temperature: 25 }
        : type === 'solar'
          ? { capacity: 5000, voltage: 0, current: 0, currentLevel: 0, temperature: 25 }
          : { capacity: 0, voltage: 0, current: 0, currentLevel: 0, temperature: 0 }

      await db.powerSource.create({
        data: {
          type: type,
          name: POWER_SOURCE_LABELS[type] ?? type,
          status: type === 'battery' ? 'full' : type === 'solar' ? 'offline' : 'unknown',
          config: JSON.stringify(defaultPowerConfigs[type] ?? {}),
          ...batteryDefaults,
        },
      })
      powerSourceCount++
    }
  }
  console.log(`[Seed] Created ${powerSourceCount} power sources`)

  // 6. Create initial session
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

  // 7. Create initial system alerts
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
    templates: templateCount,
    channels: channelCount,
    powerSources: powerSourceCount,
    session: sessionId,
  }
}
