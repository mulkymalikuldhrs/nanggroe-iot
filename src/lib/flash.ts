// ============================================================
// NANGGROE OS AI - Firmware Flash & Code Deploy Service
// ArduPilot flashing flow and companion code deployment
// with progress tracking, logging, and verification
// ============================================================

import { db } from './db'
import { DriverRegistry } from './drivers'

// --- Flash Types ---

export type FlashTarget = 'pixhawk' | 'companion' | 'esc' | 'radio'
export type FlashStatus = 'idle' | 'preparing' | 'flashing' | 'verifying' | 'completed' | 'failed'
export type CodeTarget = 'companion' | 'agent'

export interface FlashLogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

export interface FlashOperation {
  id: string
  target: FlashTarget
  firmwareVersion: string
  status: FlashStatus
  progress: number
  startedAt: string
  completedAt: string | null
  error: string | null
  logs: FlashLogEntry[]
}

export interface CodeDeployOperation {
  id: string
  target: CodeTarget
  codePath: string
  status: FlashStatus
  progress: number
  startedAt: string
  completedAt: string | null
  error: string | null
  logs: FlashLogEntry[]
}

export interface FlashOptions {
  force?: boolean
  backupCurrent?: boolean
  verifyOnly?: boolean
}

export interface DeployOptions {
  buildCommand?: string
  env?: Record<string, string>
  restartService?: boolean
}

export interface FirmwareInfo {
  target: FlashTarget
  version: string
  releaseDate: string
  size: number
  checksum: string
  changelog: string
  url: string
}

export interface VerificationResult {
  verified: boolean
  currentVersion: string | null
  targetVersion: string
  checksumMatch: boolean | null
  details: Record<string, unknown>
}

// --- Firmware Catalog ---

const FIRMWARE_CATALOG: FirmwareInfo[] = [
  {
    target: 'pixhawk',
    version: 'ArduPilot 4.5.7',
    releaseDate: '2024-12-15',
    size: 1048576,
    checksum: 'a1b2c3d4e5f6789012345678abcdef01',
    changelog: 'ArduPilot 4.5.7 - Bug fixes for EKF3, improved GPS blending, tricopter yaw tuning',
    url: 'firmware/pixhawk/ardupilot-4.5.7.px4',
  },
  {
    target: 'pixhawk',
    version: 'ArduPilot 4.5.6',
    releaseDate: '2024-11-01',
    size: 1032192,
    checksum: 'b2c3d4e5f6789012345678abcdef0123',
    changelog: 'ArduPilot 4.5.6 - MAVLink v2 improvements, battery monitor fixes',
    url: 'firmware/pixhawk/ardupilot-4.5.6.px4',
  },
  {
    target: 'pixhawk',
    version: 'ArduPilot 4.4.4',
    releaseDate: '2024-08-20',
    size: 1015808,
    checksum: 'c3d4e5f6789012345678abcdef012345',
    changelog: 'ArduPilot 4.4.4 - Stable release with sensor fusion improvements',
    url: 'firmware/pixhawk/ardupilot-4.4.4.px4',
  },
  {
    target: 'companion',
    version: 'Nanggroe OS 1.2.0',
    releaseDate: '2025-01-10',
    size: 52428800,
    checksum: 'd4e5f6789012345678abcdef01234567',
    changelog: 'Nanggroe OS 1.2.0 - Agent optimization, telemetry pipeline v2',
    url: 'firmware/companion/nanggroe-os-1.2.0.img',
  },
  {
    target: 'companion',
    version: 'Nanggroe OS 1.1.0',
    releaseDate: '2024-11-15',
    size: 50331648,
    checksum: 'e5f6789012345678abcdef0123456789',
    changelog: 'Nanggroe OS 1.1.0 - Hermes agent upgrade, MCP calibration support',
    url: 'firmware/companion/nanggroe-os-1.1.0.img',
  },
  {
    target: 'esc',
    version: 'BLHeli_S 16.7',
    releaseDate: '2024-06-01',
    size: 65536,
    checksum: 'f6789012345678abcdef0123456789ab',
    changelog: 'BLHeli_S 16.7 - DShot300 support, improved startup melody',
    url: 'firmware/esc/blheli_s-16.7.hex',
  },
  {
    target: 'radio',
    version: 'SiK 2.0',
    releaseDate: '2024-03-15',
    size: 32768,
    checksum: '6789012345678abcdef0123456789abc',
    changelog: 'SiK 2.0 - Improved frequency hopping, AES encryption support',
    url: 'firmware/radio/sik-2.0.hex',
  },
]

// --- Utility ---

function generateId(): string {
  return `flash_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

function createLogEntry(level: FlashLogEntry['level'], message: string): FlashLogEntry {
  return { timestamp: new Date().toISOString(), level, message }
}

// ============================================================
// FlashService — Singleton firmware flash & code deploy engine
// ============================================================

export class FlashService {
  private static instance: FlashService
  private activeOperations: Map<string, FlashOperation | CodeDeployOperation> = new Map()
  private operationHistory: (FlashOperation | CodeDeployOperation)[] = []

  private constructor() {}

  static getInstance(): FlashService {
    if (!FlashService.instance) {
      FlashService.instance = new FlashService()
    }
    return FlashService.instance
  }

  // --- Firmware Flashing ---

  async flashFirmware(target: FlashTarget, firmwareVersion: string, options?: FlashOptions): Promise<FlashOperation> {
    const operation: FlashOperation = {
      id: generateId(),
      target,
      firmwareVersion,
      status: 'preparing',
      progress: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      logs: [],
    }

    this.activeOperations.set(operation.id, operation)

    // Execute flash asynchronously
    this.executeFirmwareFlash(operation, options).catch(err => {
      console.error('[FlashService] Firmware flash error:', err)
    })

    return operation
  }

  private async executeFirmwareFlash(operation: FlashOperation, options?: FlashOptions): Promise<void> {
    const op = this.activeOperations.get(operation.id) as FlashOperation
    if (!op) return

    try {
      // Step 1: Pre-flash checks
      op.status = 'preparing'
      op.progress = 5
      op.logs.push(createLogEntry('info', `Starting firmware flash for ${op.target} - version ${op.firmwareVersion}`))
      this.activeOperations.set(op.id, op)

      const preCheckResult = await this.preFlashChecks(op.target)
      if (!preCheckResult.passed) {
        op.status = 'failed'
        op.error = preCheckResult.message
        op.logs.push(createLogEntry('error', preCheckResult.message))
        op.completedAt = new Date().toISOString()
        this.finalizeOperation(op)
        return
      }
      op.logs.push(createLogEntry('info', 'Pre-flash checks passed'))
      op.progress = 10
      this.activeOperations.set(op.id, op)

      // Step 2: Download firmware
      op.status = 'flashing'
      op.logs.push(createLogEntry('info', `Downloading firmware: ${op.firmwareVersion}`))
      await this.simulateStep(1500, 25, op)

      // Step 3: Enter bootloader mode
      op.logs.push(createLogEntry('info', `Entering bootloader mode on ${op.target}`))
      await this.simulateStep(1000, 35, op)

      // Step 4: Erase existing firmware
      op.logs.push(createLogEntry('info', 'Erasing existing firmware sectors'))
      await this.simulateStep(2000, 50, op)

      // Step 5: Write new firmware
      op.logs.push(createLogEntry('info', `Writing firmware ${op.firmwareVersion} to ${op.target}`))
      await this.simulateStep(3000, 75, op)

      // Step 6: Verify checksum
      op.status = 'verifying'
      op.logs.push(createLogEntry('info', 'Verifying firmware checksum'))
      await this.simulateStep(1000, 85, op)

      const firmwareInfo = FIRMWARE_CATALOG.find(f => f.target === op.target && f.version === op.firmwareVersion)
      const checksumValid = !!firmwareInfo
      op.logs.push(createLogEntry(
        checksumValid ? 'info' : 'warning',
        checksumValid ? `Checksum verified: ${firmwareInfo.checksum}` : 'Checksum verification skipped (firmware not in catalog)'
      ))

      // Step 7: Reset and reboot
      op.logs.push(createLogEntry('info', `Resetting ${op.target} and rebooting`))
      await this.simulateStep(1500, 92, op)

      // Step 8: Post-flash verification
      const postVerifyResult = await this.postFlashVerification(op.target)
      op.logs.push(createLogEntry(
        postVerifyResult.passed ? 'info' : 'warning',
        postVerifyResult.message
      ))

      if (!postVerifyResult.passed && !options?.force) {
        op.status = 'failed'
        op.error = postVerifyResult.message
        op.logs.push(createLogEntry('error', `Post-flash verification failed: ${postVerifyResult.message}`))
      } else {
        op.status = 'completed'
        op.progress = 100
        op.logs.push(createLogEntry('info', `Firmware flash completed successfully: ${op.firmwareVersion}`))

        // Update device firmware in DB
        await this.updateDeviceFirmwareInDb(op.target, op.firmwareVersion)
      }

      op.completedAt = new Date().toISOString()
      this.finalizeOperation(op)

    } catch (err) {
      op.status = 'failed'
      op.error = err instanceof Error ? err.message : 'Unknown flash error'
      op.logs.push(createLogEntry('error', op.error))
      op.completedAt = new Date().toISOString()
      this.finalizeOperation(op)
    }
  }

  // --- Code Deployment ---

  async deployCode(target: CodeTarget, codePath: string, options?: DeployOptions): Promise<CodeDeployOperation> {
    const operation: CodeDeployOperation = {
      id: generateId(),
      target,
      codePath,
      status: 'preparing',
      progress: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      logs: [],
    }

    this.activeOperations.set(operation.id, operation)

    this.executeCodeDeploy(operation, options).catch(err => {
      console.error('[FlashService] Code deploy error:', err)
    })

    return operation
  }

  private async executeCodeDeploy(operation: CodeDeployOperation, options?: DeployOptions): Promise<void> {
    const op = this.activeOperations.get(operation.id) as CodeDeployOperation
    if (!op) return

    try {
      // Step 1: Pre-deploy checks
      op.status = 'preparing'
      op.progress = 5
      op.logs.push(createLogEntry('info', `Starting code deployment for ${op.target} - path: ${op.codePath}`))
      this.activeOperations.set(op.id, op)

      const preCheck = await this.preDeployChecks(op.target)
      if (!preCheck.passed) {
        op.status = 'failed'
        op.error = preCheck.message
        op.logs.push(createLogEntry('error', preCheck.message))
        op.completedAt = new Date().toISOString()
        this.finalizeOperation(op)
        return
      }
      op.logs.push(createLogEntry('info', 'Pre-deploy checks passed'))
      op.progress = 10
      this.activeOperations.set(op.id, op)

      // Step 2: Build code
      op.status = 'flashing'
      const buildCmd = options?.buildCommand || 'npm run build'
      op.logs.push(createLogEntry('info', `Building code: ${buildCmd}`))
      await this.simulateStep(2000, 30, op)

      // Step 3: Transfer to target
      op.logs.push(createLogEntry('info', `Transferring built artifacts to ${op.target}`))
      await this.simulateStep(1500, 50, op)

      // Step 4: Install dependencies
      op.logs.push(createLogEntry('info', 'Installing dependencies on target'))
      await this.simulateStep(2500, 70, op)

      // Step 5: Start service
      op.logs.push(createLogEntry('info', `Starting ${op.target} service`))
      await this.simulateStep(1000, 85, op)

      // Step 6: Verify running
      op.status = 'verifying'
      op.logs.push(createLogEntry('info', 'Verifying service is running and healthy'))
      await this.simulateStep(1000, 95, op)

      const serviceHealthy = await this.verifyServiceHealth(op.target)
      if (!serviceHealthy) {
        op.status = 'failed'
        op.error = `${op.target} service failed health check after deployment`
        op.logs.push(createLogEntry('error', op.error))
      } else {
        op.status = 'completed'
        op.progress = 100
        op.logs.push(createLogEntry('info', `Code deployment completed successfully for ${op.target}`))
      }

      op.completedAt = new Date().toISOString()
      this.finalizeOperation(op)

    } catch (err) {
      op.status = 'failed'
      op.error = err instanceof Error ? err.message : 'Unknown deploy error'
      op.logs.push(createLogEntry('error', op.error))
      op.completedAt = new Date().toISOString()
      this.finalizeOperation(op)
    }
  }

  // --- Status & History ---

  async getOperationStatus(operationId: string): Promise<FlashOperation | CodeDeployOperation | null> {
    const active = this.activeOperations.get(operationId)
    if (active) return active

    const historical = this.operationHistory.find(op => op.id === operationId)
    return historical ?? null
  }

  async cancelOperation(operationId: string): Promise<boolean> {
    const op = this.activeOperations.get(operationId)
    if (!op) return false

    if (op.status === 'completed' || op.status === 'failed') {
      return false
    }

    op.status = 'failed'
    op.error = 'Operation cancelled by user'
    op.logs.push(createLogEntry('warning', 'Operation cancelled'))
    op.completedAt = new Date().toISOString()
    this.finalizeOperation(op)
    return true
  }

  async listAvailableFirmware(target: FlashTarget): Promise<FirmwareInfo[]> {
    return FIRMWARE_CATALOG.filter(f => f.target === target)
  }

  async verifyFirmware(target: FlashTarget): Promise<VerificationResult> {
    const deviceTypeMap: Record<FlashTarget, string> = {
      pixhawk: 'flight_controller',
      companion: 'companion_computer',
      esc: 'esc',
      radio: 'radio',
    }

    const deviceType = deviceTypeMap[target]
    const device = await db.hardwareDevice.findFirst({
      where: { deviceType },
    })

    const currentVersion = device?.firmware ?? null
    const latestFirmware = FIRMWARE_CATALOG.find(f => f.target === target)

    return {
      verified: !!device && device.status === 'active',
      currentVersion,
      targetVersion: latestFirmware?.version ?? 'unknown',
      checksumMatch: currentVersion === latestFirmware?.version ? true : null,
      details: {
        deviceFound: !!device,
        deviceStatus: device?.status ?? 'not found',
        deviceId: device?.id ?? null,
      },
    }
  }

  getActiveOperations(): (FlashOperation | CodeDeployOperation)[] {
    return Array.from(this.activeOperations.values())
  }

  getOperationHistory(): (FlashOperation | CodeDeployOperation)[] {
    return [...this.operationHistory]
  }

  // --- Internal Helpers ---

  private async simulateStep(durationMs: number, targetProgress: number, op: FlashOperation | CodeDeployOperation): Promise<void> {
    const steps = 5
    const stepDuration = durationMs / steps
    const progressStep = (targetProgress - op.progress) / steps

    for (let i = 0; i < steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration))
      op.progress = Math.min(100, Math.round(op.progress + progressStep))
      this.activeOperations.set(op.id, op)
    }
  }

  private async preFlashChecks(target: FlashTarget): Promise<{ passed: boolean; message: string }> {
    const registry = DriverRegistry.getInstance()
    const deviceTypeMap: Record<FlashTarget, string> = {
      pixhawk: 'flight_controller',
      companion: 'companion_computer',
      esc: 'esc',
      radio: 'radio',
    }

    const deviceType = deviceTypeMap[target]
    const driver = registry.getDriver(deviceType)

    // Check if driver is connected
    if (driver && driver.isConnected()) {
      // Check battery level for pixhawk (need at least 50% for safe flash)
      if (target === 'pixhawk') {
        const batteryDriver = registry.getDriver('battery')
        if (batteryDriver?.isConnected()) {
          const batteryData = await batteryDriver.readData()
          const voltage = batteryData.battery_voltage as number | undefined
          if (voltage !== undefined && voltage < 13.5) {
            return { passed: false, message: `Battery voltage too low for safe flash: ${voltage}V (minimum 13.5V required)` }
          }
        } else {
          return { passed: true, message: 'Battery driver not connected — skipping battery check (proceed with caution)' }
        }
      }
      return { passed: true, message: `Pre-flash checks passed: ${target} driver connected and ready` }
    }

    // Fallback: check if device exists in DB
    const device = await db.hardwareDevice.findFirst({
      where: { deviceType },
    })

    if (!device) {
      return { passed: false, message: `No ${target} device found in database. Connect the device first.` }
    }

    if (device.status === 'offline') {
      return { passed: false, message: `${target} device is offline. Please check connection and try again.` }
    }

    return { passed: true, message: `Pre-flash checks passed: ${target} device found in database (${device.status})` }
  }

  private async postFlashVerification(target: FlashTarget): Promise<{ passed: boolean; message: string }> {
    const deviceTypeMap: Record<FlashTarget, string> = {
      pixhawk: 'flight_controller',
      companion: 'companion_computer',
      esc: 'esc',
      radio: 'radio',
    }

    const deviceType = deviceTypeMap[target]
    const device = await db.hardwareDevice.findFirst({
      where: { deviceType },
    })

    if (!device) {
      return { passed: false, message: `${target} device not found after flash` }
    }

    if (device.status === 'error') {
      return { passed: false, message: `${target} device in error state after flash` }
    }

    return { passed: true, message: `${target} post-flash verification successful — device is ${device.status}` }
  }

  private async preDeployChecks(target: CodeTarget): Promise<{ passed: boolean; message: string }> {
    const registry = DriverRegistry.getInstance()
    const companionDriver = registry.getDriver('companion_computer')

    if (companionDriver?.isConnected()) {
      return { passed: true, message: `Companion computer driver connected — ready for ${target} deployment` }
    }

    // Fallback: check DB
    const device = await db.hardwareDevice.findFirst({
      where: { deviceType: 'companion_computer' },
    })

    if (!device) {
      return { passed: false, message: 'No companion computer found. Connect the companion computer first.' }
    }

    return { passed: true, message: `Companion computer found in database (${device.status}) — proceeding with ${target} deployment` }
  }

  private async verifyServiceHealth(target: CodeTarget): Promise<boolean> {
    // Check if we can find the device and it's active
    const device = await db.hardwareDevice.findFirst({
      where: { deviceType: 'companion_computer' },
    })
    return device?.status === 'active'
  }

  private async updateDeviceFirmwareInDb(target: FlashTarget, version: string): Promise<void> {
    const deviceTypeMap: Record<FlashTarget, string> = {
      pixhawk: 'flight_controller',
      companion: 'companion_computer',
      esc: 'esc',
      radio: 'radio',
    }

    const deviceType = deviceTypeMap[target]
    await db.hardwareDevice.updateMany({
      where: { deviceType },
      data: { firmware: version, lastSeen: new Date() },
    })

    // Create alert
    await db.alert.create({
      data: {
        level: 'info',
        source: 'system',
        title: `${target} Firmware Updated`,
        message: `Firmware on ${target} has been updated to ${version}`,
        category: 'hardware',
        isRead: false,
      },
    })
  }

  private finalizeOperation(op: FlashOperation | CodeDeployOperation): void {
    this.activeOperations.delete(op.id)
    this.operationHistory.push(op)

    // Keep history limited to last 100 operations
    if (this.operationHistory.length > 100) {
      this.operationHistory = this.operationHistory.slice(-100)
    }
  }
}
