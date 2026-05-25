// ============================================================
// NANGGROE OS AI - Power Management Service
// Battery, Solar panel, GSM power monitoring
// ============================================================

import { db } from './db'
import type { PowerSourceType, PowerSourceStatus, PowerSourceSummary, SolarConfig } from './types'

// ============================================================
// PowerService
// ============================================================

export class PowerService {
  private static instance: PowerService

  private constructor() {}

  static getInstance(): PowerService {
    if (!PowerService.instance) {
      PowerService.instance = new PowerService()
    }
    return PowerService.instance
  }

  /**
   * Initialize default power sources
   */
  async initializeDefaults(): Promise<void> {
    const defaults = [
      {
        type: 'battery',
        name: '4S LiPo 4000mAh (Utama)',
        status: 'unknown',
        capacity: 4000,
        currentLevel: 0,
        voltage: 0,
        current: 0,
        temperature: 0,
        config: JSON.stringify({ cells: 4, nominalVoltage: 14.8, maxChargeVoltage: 16.8, minVoltage: 12.0 }),
      },
      {
        type: 'solar',
        name: 'Panel Surya 5W (Darurat)',
        status: 'offline',
        capacity: 5000,
        currentLevel: 0,
        voltage: 0,
        current: 0,
        temperature: 0,
        config: JSON.stringify({
          panelWattage: 5,
          chargeControllerType: 'TP4056',
          batteryType: 'LiPo',
          emergencyOnly: true,
          minVoltageThreshold: 13.0,
        } as SolarConfig),
      },
      {
        type: 'gsm',
        name: 'GSM Module (SIM800L)',
        status: 'offline',
        capacity: 0,
        currentLevel: 0,
        voltage: 3.7,
        current: 0,
        temperature: 0,
        config: JSON.stringify({ module: 'SIM800L', powerSource: 'buck_converter_3v7' }),
      },
    ]

    for (const source of defaults) {
      const existing = await db.powerSource.findFirst({ where: { type: source.type } })
      if (!existing) {
        await db.powerSource.create({ data: source })
      }
    }
  }

  /**
   * List all power sources
   */
  async listPowerSources(): Promise<PowerSourceSummary[]> {
    const sources = await db.powerSource.findMany({ orderBy: { type: 'asc' } })
    return sources.map(s => ({
      id: s.id,
      type: s.type as PowerSourceType,
      name: s.name,
      status: s.status as PowerSourceStatus,
      capacity: s.capacity,
      currentLevel: s.currentLevel,
      voltage: s.voltage,
      current: s.current,
      temperature: s.temperature,
      lastReading: s.lastReading.toISOString(),
    }))
  }

  /**
   * Update power source reading
   */
  async updateReading(
    sourceId: string,
    reading: { voltage?: number; current?: number; temperature?: number; currentLevel?: number }
  ): Promise<PowerSourceSummary> {
    const source = await db.powerSource.findUnique({ where: { id: sourceId } })
    if (!source) throw new Error('Power source not found')

    // Determine status based on readings
    let status: PowerSourceStatus = source.status as PowerSourceStatus
    const config = source.config ? JSON.parse(source.config) : {}

    if (source.type === 'battery') {
      const voltage = reading.voltage ?? source.voltage
      if (voltage <= 0) status = 'offline'
      else if (voltage >= (config.maxChargeVoltage || 16.8) * 0.98) status = 'full'
      else if (reading.current && reading.current > 0) status = 'charging'
      else status = 'discharging'

      // Alert on critical battery
      if (voltage > 0 && voltage <= 12.6) {
        await db.alert.create({
          data: {
            level: 'critical',
            source: 'battery',
            title: 'Baterai Kritis!',
            message: `Tegangan baterai ${voltage}V — segera lakukan landing atau RTH!`,
            category: 'safety',
            isRead: false,
          },
        })
      }
    } else if (source.type === 'solar') {
      const voltage = reading.voltage ?? source.voltage
      if (voltage > 0) status = 'charging'
      else status = 'offline'
    }

    const updated = await db.powerSource.update({
      where: { id: sourceId },
      data: {
        ...reading,
        status,
        lastReading: new Date(),
      },
    })

    return {
      id: updated.id,
      type: updated.type as PowerSourceType,
      name: updated.name,
      status: updated.status as PowerSourceStatus,
      capacity: updated.capacity,
      currentLevel: updated.currentLevel,
      voltage: updated.voltage,
      current: updated.current,
      temperature: updated.temperature,
      lastReading: updated.lastReading.toISOString(),
    }
  }

  /**
   * Get power status summary
   */
  async getPowerStatus(): Promise<{
    mainBattery: { voltage: number; percentage: number; status: string; estimatedMinutes: number }
    solar: { voltage: number; isCharging: boolean; wattage: number }
    gsm: { voltage: number; isConnected: boolean }
    emergencyMode: boolean
  }> {
    const sources = await db.powerSource.findMany()
    const battery = sources.find(s => s.type === 'battery')
    const solar = sources.find(s => s.type === 'solar')
    const gsm = sources.find(s => s.type === 'gsm')

    const batteryConfig = battery?.config ? JSON.parse(battery.config) : {}
    const minV = batteryConfig.minVoltage || 12.0
    const maxV = batteryConfig.maxChargeVoltage || 16.8
    const batteryPercent = battery ? Math.max(0, Math.min(100, ((battery.voltage - minV) / (maxV - minV)) * 100)) : 0
    const estimatedMinutes = battery && battery.current > 0 && battery.voltage > minV
      ? Math.round(((battery.voltage - minV) * battery.capacity) / (battery.current * 60))
      : 0

    const solarConfig = solar?.config ? JSON.parse(solar.config) : {}

    return {
      mainBattery: {
        voltage: battery?.voltage ?? 0,
        percentage: Math.round(batteryPercent),
        status: battery?.status ?? 'unknown',
        estimatedMinutes,
      },
      solar: {
        voltage: solar?.voltage ?? 0,
        isCharging: solar?.status === 'charging',
        wattage: solarConfig.panelWattage || 5,
      },
      gsm: {
        voltage: gsm?.voltage ?? 0,
        isConnected: gsm?.status !== 'offline',
      },
      emergencyMode: battery ? battery.voltage <= 13.0 && solar?.status === 'charging' : false,
    }
  }
}
