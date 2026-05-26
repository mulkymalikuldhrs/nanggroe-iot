// ============================================================
// NANGGROE IOT - GSM Module Service
// GSM modem AT command interface, SMS send/receive,
// signal strength monitoring, network registration status,
// and GPRS data connection management.
// Integrates with hardware-bridge for serial communication.
// ============================================================

import { db } from './db'
import type { GsmConfig } from './types'

// ============================================================
// Types
// ============================================================

export type GsmConnectionState = 'disconnected' | 'initializing' | 'connected' | 'error'

export interface GsmModemInfo {
  manufacturer: string
  model: string
  revision: string
  imei: string
  simStatus: 'ready' | 'not_inserted' | 'pin_required' | 'error'
  simOperator: string
}

export interface GsmSignalInfo {
  /** CSQ value 0-31 (0 = -113dBm, 31 = -51dBm) */
  csq: number
  /** Estimated dBm value */
  dBm: number
  /** Signal quality label */
  quality: 'no_signal' | 'poor' | 'fair' | 'good' | 'excellent'
  /** Bit Error Rate (0-7, 99 = unknown) */
  ber: number
}

export type GsmNetworkStatus = 'not_registered' | 'registered_home' | 'searching' | 'denied' | 'unknown' | 'registered_roaming'

export interface GsmNetworkInfo {
  status: GsmNetworkStatus
  operator: string
  accessTechnology: string // GSM, EDGE, UMTS, LTE, etc.
  band: string
  cellId?: string
  locationAreaCode?: string
}

export interface GsmSmsMessage {
  index: number
  status: 'unread' | 'read' | 'unsent' | 'sent'
  from: string
  timestamp: string
  message: string
}

export interface GsmGprsStatus {
  connected: boolean
  ipAddress: string
  apn: string
  bytesSent: number
  bytesReceived: number
}

export interface GsmSendSmsResult {
  sent: boolean
  reference?: number
  error?: string
}

export interface HardwareBridgeResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

export interface AtCommandResult {
  success: boolean
  response: string
  rawData?: string
  error?: string
  latencyMs?: number
}

// ============================================================
// AT Command Helpers
// ============================================================

/** Parse CSQ (signal quality) response: +CSQ: <rssi>,<ber> */
function parseCsqResponse(response: string): { csq: number; ber: number } | null {
  const match = response.match(/\+CSQ:\s*(\d+),\s*(\d+)/)
  if (!match) return null
  return { csq: parseInt(match[1], 10), ber: parseInt(match[2], 10) }
}

/** Convert CSQ value (0-31) to dBm */
function csqTodBm(csq: number): number {
  if (csq === 0) return -113
  if (csq === 31) return -51
  if (csq === 99) return -999 // Not known or not detectable
  return -113 + csq * 2
}

/** Determine signal quality from CSQ value */
function csqToQuality(csq: number): GsmSignalInfo['quality'] {
  if (csq === 99 || csq === 0) return 'no_signal'
  if (csq <= 9) return 'poor'
  if (csq <= 14) return 'fair'
  if (csq <= 19) return 'good'
  return 'excellent'
}

/** Parse CREG (network registration) response: +CREG: <n>,<stat>[,<lac>,<ci>] */
function parseCregResponse(response: string): { status: GsmNetworkStatus; lac?: string; ci?: string } | null {
  const match = response.match(/\+CREG:\s*\d,\s*(\d)(?:,\s*"([0-9A-Fa-f]+)",\s*"([0-9A-Fa-f]+)")?/)
  if (!match) return null
  const statMap: Record<string, GsmNetworkStatus> = {
    '0': 'not_registered',
    '1': 'registered_home',
    '2': 'searching',
    '3': 'denied',
    '4': 'unknown',
    '5': 'registered_roaming',
  }
  return {
    status: statMap[match[1]] ?? 'unknown',
    lac: match[2],
    ci: match[3],
  }
}

/** Parse SMS listing response: +CMGL: <index>,"<stat>","<oa>",,"<scts>"<data> */
function parseCmglResponse(response: string): GsmSmsMessage[] {
  const messages: GsmSmsMessage[] = []
  const regex = /\+CMGL:\s*(\d+),"([^"]*)","([^"]*)",,"([^"]*)"\r?\n([^\r\n]*)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(response)) !== null) {
    const statusMap: Record<string, GsmSmsMessage['status']> = {
      'REC UNREAD': 'unread',
      'REC READ': 'read',
      'STO UNSENT': 'unsent',
      'STO SENT': 'sent',
    }
    messages.push({
      index: parseInt(match[1], 10),
      status: statusMap[match[2]] ?? 'unread',
      from: match[3],
      timestamp: match[4],
      message: match[5],
    })
  }
  return messages
}

// ============================================================
// Hardware Bridge Interface
// ============================================================

const HARDWARE_BRIDGE_PORT = process.env.HARDWARE_BRIDGE_PORT || '3010'

async function callHardwareBridge(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<HardwareBridgeResponse> {
  try {
    const url = `/api/hardware${endpoint}?XTransformPort=${HARDWARE_BRIDGE_PORT}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Hardware bridge returned ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()
    return { success: true, data: data as Record<string, unknown> }
  } catch (error) {
    return {
      success: false,
      error: `Hardware bridge unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// ============================================================
// GsmModuleEngine — Singleton
// ============================================================

class GsmModuleEngine {
  private static instance: GsmModuleEngine
  private connectionState: GsmConnectionState = 'disconnected'
  private modemInfo: GsmModemInfo | null = null
  private serialPort: string = '/dev/serial0'
  private baudRate: number = 9600
  private config: GsmConfig | null = null
  private signalMonitorInterval: ReturnType<typeof setInterval> | null = null

  private constructor() {}

  static getInstance(): GsmModuleEngine {
    if (!GsmModuleEngine.instance) {
      GsmModuleEngine.instance = new GsmModuleEngine()
    }
    return GsmModuleEngine.instance
  }

  // -------------------------------------------
  // Send AT Command via hardware bridge
  // -------------------------------------------

  private async sendAtCommand(command: string, timeoutMs: number = 5000): Promise<AtCommandResult> {
    const start = Date.now()

    try {
      const result = await callHardwareBridge('/serial/write', {
        port: this.serialPort,
        baudRate: this.baudRate,
        data: `${command}\r\n`,
        timeout: timeoutMs,
        expectResponse: true,
        endMarkers: ['OK', 'ERROR', '>'],
      })

      const latencyMs = Date.now() - start

      if (!result.success) {
        return {
          success: false,
          response: '',
          error: result.error ?? 'Hardware bridge failed',
          latencyMs,
        }
      }

      const rawData = (result.data?.response as string) ?? (result.data?.data as string) ?? ''
      const success = rawData.includes('OK') || rawData.includes('>')

      return {
        success,
        response: rawData,
        rawData,
        latencyMs,
      }
    } catch (error) {
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - start,
      }
    }
  }

  // -------------------------------------------
  // Connect GSM modem
  // -------------------------------------------

  async connect(serialPort?: string, baudRate?: number): Promise<{
    success: boolean
    message: string
    modemInfo?: GsmModemInfo
  }> {
    if (this.connectionState === 'connected') {
      return { success: true, message: 'GSM module already connected' }
    }

    this.connectionState = 'initializing'
    this.serialPort = serialPort ?? this.serialPort
    this.baudRate = baudRate ?? this.baudRate

    // Load config from database
    try {
      const gsmChannel = await db.communicationChannel.findFirst({
        where: { type: 'gsm' },
      })

      if (gsmChannel) {
        this.config = JSON.parse(gsmChannel.config) as GsmConfig
        if (!serialPort) {
          const parsed = JSON.parse(gsmChannel.config) as GsmConfig & { serialPort?: string; baudRate?: number }
          this.serialPort = parsed.serialPort ?? this.serialPort
          this.baudRate = parsed.baudRate ?? this.baudRate
        }

        await db.communicationChannel.update({
          where: { id: gsmChannel.id },
          data: { status: 'connecting' },
        })
      }
    } catch (error) {
    }

    try {
      // Step 1: Test communication with AT
      const atResult = await this.sendAtCommand('AT', 3000)
      if (!atResult.success) {
        this.connectionState = 'error'
        await this.updateChannelStatus('error')
        return {
          success: false,
          message: `GSM modem not responding on ${this.serialPort}. Check wiring and power. Error: ${atResult.error}`,
        }
      }

      // Step 2: Disable echo
      await this.sendAtCommand('ATE0', 2000)

      // Step 3: Get modem info
      const manufacturer = await this.sendAtCommand('AT+CGMI', 3000)
      const model = await this.sendAtCommand('AT+CGMM', 3000)
      const revision = await this.sendAtCommand('AT+CGMR', 3000)
      const imei = await this.sendAtCommand('AT+CGSN', 3000)

      // Step 4: Check SIM status
      const simResult = await this.sendAtCommand('AT+CPIN?', 3000)
      let simStatus: GsmModemInfo['simStatus'] = 'error'
      if (simResult.response.includes('+CPIN: READY')) {
        simStatus = 'ready'
      } else if (simResult.response.includes('+CPIN: SIM NOT INSERTED')) {
        simStatus = 'not_inserted'
      } else if (simResult.response.includes('+CPIN: SIM PIN')) {
        simStatus = 'pin_required'
        // Try to enter PIN if configured
        if (this.config?.pin) {
          const pinResult = await this.sendAtCommand(`AT+CPIN=${this.config.pin}`, 5000)
          if (pinResult.success) {
            simStatus = 'ready'
          }
        }
      }

      // Step 5: Get operator name
      const operatorResult = await this.sendAtCommand('AT+COPS?', 5000)
      let simOperator = 'Unknown'
      const operatorMatch = operatorResult.response.match(/\+COPS:\s*\d,\s*\d,"([^"]*)"/)
      if (operatorMatch) {
        simOperator = operatorMatch[1]
      }

      this.modemInfo = {
        manufacturer: manufacturer.response.replace(/OK|\r|\n/g, '').trim() || 'Unknown',
        model: model.response.replace(/OK|\r|\n/g, '').trim() || 'Unknown',
        revision: revision.response.replace(/OK|\r|\n/g, '').trim() || 'Unknown',
        imei: imei.response.replace(/OK|\r|\n/g, '').trim() || 'Unknown',
        simStatus,
        simOperator,
      }

      // Step 6: Configure SMS text mode
      await this.sendAtCommand('AT+CMGF=1', 3000) // Text mode
      await this.sendAtCommand('AT+CNMI=2,1,0,0,0', 3000) // New SMS notification

      // Step 7: Enable GPRS if configured
      if (this.config?.dataEnabled) {
        await this.configureGprs()
      }

      this.connectionState = 'connected'
      await this.updateChannelStatus('connected')

      // Start periodic signal monitoring
      this.startSignalMonitoring()

      return {
        success: true,
        message: `GSM module connected: ${this.modemInfo.manufacturer} ${this.modemInfo.model}, SIM: ${simStatus}, Operator: ${simOperator}`,
        modemInfo: this.modemInfo,
      }
    } catch (error) {
      this.connectionState = 'error'
      await this.updateChannelStatus('error')
      return {
        success: false,
        message: `GSM connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  // -------------------------------------------
  // Disconnect GSM modem
  // -------------------------------------------

  async disconnect(): Promise<void> {
    if (this.signalMonitorInterval) {
      clearInterval(this.signalMonitorInterval)
      this.signalMonitorInterval = null
    }

    try {
      // Power down the modem gracefully
      await this.sendAtCommand('AT+CPOWD=1', 5000)
    } catch {
      // Ignore errors on disconnect
    }

    this.connectionState = 'disconnected'
    this.modemInfo = null
    await this.updateChannelStatus('disconnected')
  }

  // -------------------------------------------
  // Send SMS
  // -------------------------------------------

  async sendSms(phoneNumber: string, message: string): Promise<GsmSendSmsResult> {
    if (this.connectionState !== 'connected') {
      return { sent: false, error: 'GSM module not connected. Call connectGSM() first.' }
    }

    if (!this.config?.smsEnabled) {
      return { sent: false, error: 'SMS is not enabled in GSM configuration.' }
    }

    // SMS length limit (GSM 7-bit: 160 chars, UCS2: 70 chars)
    if (message.length > 160) {
      return { sent: false, error: `Message too long (${message.length} chars). Maximum is 160 characters.` }
    }

    try {
      // Enter SMS input mode
      const cmgsResult = await this.sendAtCommand(`AT+CMGS="${phoneNumber}"`, 5000)
      if (!cmgsResult.success && !cmgsResult.response.includes('>')) {
        return { sent: false, error: `Failed to enter SMS mode: ${cmgsResult.error}` }
      }

      // Send message content with Ctrl+Z (0x1A) terminator
      const sendResult = await this.sendAtCommand(`${message}\x1A`, 30000) // 30s timeout for SMS send

      if (sendResult.success) {
        // Parse message reference from +CMGS: <mr>
        const refMatch = sendResult.response.match(/\+CMGS:\s*(\d+)/)
        const reference = refMatch ? parseInt(refMatch[1], 10) : undefined

        // Log SMS to communication channel
        await this.logSmsEvent('sent', phoneNumber, message)

        return { sent: true, reference }
      }

      return { sent: false, error: `SMS send failed: ${sendResult.response}` }
    } catch (error) {
      return { sent: false, error: `SMS send error: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  // -------------------------------------------
  // Read SMS messages
  // -------------------------------------------

  async readSms(filter: 'all' | 'unread' | 'read' = 'unread'): Promise<GsmSmsMessage[]> {
    if (this.connectionState !== 'connected') {
      throw new Error('GSM module not connected. Call connectGSM() first.')
    }

    try {
      const filterMap: Record<string, string> = {
        all: '"ALL"',
        unread: '"REC UNREAD"',
        read: '"REC READ"',
      }

      const result = await this.sendAtCommand(`AT+CMGL=${filterMap[filter] ?? '"ALL"'}`, 10000)

      if (!result.success) {
        throw new Error(`Failed to read SMS: ${result.error}`)
      }

      const messages = parseCmglResponse(result.response)

      // Log received messages to communication channel
      if (messages.length > 0) {
        for (const msg of messages) {
          await this.logSmsEvent('received', msg.from, msg.message)
        }
      }

      return messages
    } catch (error) {
      throw new Error(`SMS read error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // -------------------------------------------
  // Get Signal Strength
  // -------------------------------------------

  async getSignalStrength(): Promise<GsmSignalInfo> {
    if (this.connectionState !== 'connected') {
      return { csq: 99, dBm: -999, quality: 'no_signal', ber: 99 }
    }

    try {
      const result = await this.sendAtCommand('AT+CSQ', 3000)

      if (!result.success) {
        return { csq: 99, dBm: -999, quality: 'no_signal', ber: 99 }
      }

      const parsed = parseCsqResponse(result.response)
      if (!parsed) {
        return { csq: 99, dBm: -999, quality: 'no_signal', ber: 99 }
      }

      return {
        csq: parsed.csq,
        dBm: csqTodBm(parsed.csq),
        quality: csqToQuality(parsed.csq),
        ber: parsed.ber,
      }
    } catch {
      return { csq: 99, dBm: -999, quality: 'no_signal', ber: 99 }
    }
  }

  // -------------------------------------------
  // Get Network Status
  // -------------------------------------------

  async getNetworkStatus(): Promise<GsmNetworkInfo> {
    if (this.connectionState !== 'connected') {
      return {
        status: 'not_registered',
        operator: 'N/A',
        accessTechnology: 'N/A',
        band: 'N/A',
      }
    }

    try {
      // Get registration status
      const cregResult = await this.sendAtCommand('AT+CREG?', 5000)
      const parsed = parseCregResponse(cregResult.response)

      // Get operator info
      const copsResult = await this.sendAtCommand('AT+COPS?', 5000)
      let operator = 'Unknown'
      let accessTech = 'GSM'
      const copsMatch = copsResult.response.match(/\+COPS:\s*\d,\s*\d,"([^"]*)"(?:,\s*(\d+))?/)
      if (copsMatch) {
        operator = copsMatch[1]
        const actCode = copsMatch[2]
        const actMap: Record<string, string> = {
          '0': 'GSM',
          '1': 'GSM Compact',
          '2': 'UTRAN',
          '3': 'GSM w/EGPRS',
          '4': 'UTRAN w/HSDPA',
          '5': 'UTRAN w/HSUPA',
          '6': 'UTRAN w/HSDPA+HSUPA',
          '7': 'E-UTRAN',
        }
        accessTech = actMap[actCode ?? '0'] ?? 'GSM'
      }

      return {
        status: parsed?.status ?? 'unknown',
        operator,
        accessTechnology: accessTech,
        band: accessTech === 'E-UTRAN' ? 'LTE' : accessTech.includes('GSM') ? '900/1800MHz' : 'WCDMA',
        cellId: parsed?.ci,
        locationAreaCode: parsed?.lac,
      }
    } catch {
      return {
        status: 'unknown',
        operator: 'Unknown',
        accessTechnology: 'N/A',
        band: 'N/A',
      }
    }
  }

  // -------------------------------------------
  // GPRS Configuration
  // -------------------------------------------

  private async configureGprs(): Promise<boolean> {
    const apn = this.config?.apn ?? 'internet'

    try {
      // Set APN
      await this.sendAtCommand(`AT+CSTT="${apn}","",""`, 5000)
      // Bring up wireless connection
      await this.sendAtCommand('AT+CIICR', 15000)
      // Get IP address
      const ipResult = await this.sendAtCommand('AT+CIFSR', 10000)

      if (ipResult.success && ipResult.response.trim().length > 0) {
        return true
      }

      return false
    } catch (error) {
      return false
    }
  }

  // -------------------------------------------
  // Get GPRS Status
  // -------------------------------------------

  async getGprsStatus(): Promise<GsmGprsStatus> {
    if (this.connectionState !== 'connected') {
      return { connected: false, ipAddress: '', apn: '', bytesSent: 0, bytesReceived: 0 }
    }

    try {
      const ipResult = await this.sendAtCommand('AT+CIFSR', 5000)
      const ip = ipResult.success ? ipResult.response.trim() : ''

      return {
        connected: ip.length > 0 && /^\d+\.\d+\.\d+\.\d+$/.test(ip),
        ipAddress: ip,
        apn: this.config?.apn ?? '',
        bytesSent: 0, // SIM800L doesn't expose this directly
        bytesReceived: 0,
      }
    } catch {
      return { connected: false, ipAddress: '', apn: '', bytesSent: 0, bytesReceived: 0 }
    }
  }

  // -------------------------------------------
  // Get Connection State
  // -------------------------------------------

  getConnectionState(): GsmConnectionState {
    return this.connectionState
  }

  // -------------------------------------------
  // Get Modem Info
  // -------------------------------------------

  getModemInfo(): GsmModemInfo | null {
    return this.modemInfo
  }

  // -------------------------------------------
  // Signal Monitor (periodic)
  // -------------------------------------------

  private startSignalMonitoring(): void {
    if (this.signalMonitorInterval) {
      clearInterval(this.signalMonitorInterval)
    }

    // Monitor signal every 30 seconds
    this.signalMonitorInterval = setInterval(async () => {
      try {
        const signal = await this.getSignalStrength()
        await this.logSignalStrength(signal)
      } catch {
        // Ignore monitoring errors
      }
    }, 30000)
  }

  // -------------------------------------------
  // Update DB channel status
  // -------------------------------------------

  private async updateChannelStatus(status: string): Promise<void> {
    try {
      const gsmChannel = await db.communicationChannel.findFirst({
        where: { type: 'gsm' },
      })

      if (gsmChannel) {
        await db.communicationChannel.update({
          where: { id: gsmChannel.id },
          data: {
            status,
            lastMessage: JSON.stringify({
              event: `gsm_${status}`,
              modemInfo: this.modemInfo,
              timestamp: new Date().toISOString(),
            }),
          },
        })
      }
    } catch (error) {
    }
  }

  // -------------------------------------------
  // Log SMS event
  // -------------------------------------------

  private async logSmsEvent(direction: 'sent' | 'received', phoneNumber: string, message: string): Promise<void> {
    try {
      const gsmChannel = await db.communicationChannel.findFirst({
        where: { type: 'gsm' },
      })

      if (gsmChannel) {
        await db.communicationChannel.update({
          where: { id: gsmChannel.id },
          data: {
            lastMessage: JSON.stringify({
              event: `sms_${direction}`,
              from: direction === 'received' ? phoneNumber : undefined,
              to: direction === 'sent' ? phoneNumber : undefined,
              messagePreview: message.substring(0, 50),
              timestamp: new Date().toISOString(),
            }),
          },
        })
      }
    } catch (error) {
    }
  }

  // -------------------------------------------
  // Log signal strength to telemetry
  // -------------------------------------------

  private async logSignalStrength(signal: GsmSignalInfo): Promise<void> {
    try {
      await db.telemetryReading.create({
        data: {
          metric: 'signal_strength',
          value: signal.dBm === -999 ? 0 : signal.dBm,
          unit: 'dBm',
          source: 'gsm',
        },
      })
    } catch (error) {
    }
  }
}

// ============================================================
// Exported Functions
// ============================================================

/**
 * Connect to the GSM modem.
 * Initializes the modem, checks SIM status, configures SMS mode,
 * and optionally sets up GPRS data connection.
 */
export async function connectGSM(serialPort?: string, baudRate?: number): Promise<{
  success: boolean
  message: string
  modemInfo?: GsmModemInfo
}> {
  return GsmModuleEngine.getInstance().connect(serialPort, baudRate)
}

/**
 * Send an SMS message to the specified phone number.
 * Maximum message length is 160 characters (GSM 7-bit encoding).
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<GsmSendSmsResult> {
  return GsmModuleEngine.getInstance().sendSms(phoneNumber, message)
}

/**
 * Read SMS messages from the SIM card.
 * Can filter by all, unread, or read messages.
 */
export async function readSMS(filter: 'all' | 'unread' | 'read' = 'unread'): Promise<GsmSmsMessage[]> {
  return GsmModuleEngine.getInstance().readSms(filter)
}

/**
 * Get current GSM signal strength.
 * Returns CSQ value, estimated dBm, quality label, and BER.
 */
export async function getSignalStrength(): Promise<GsmSignalInfo> {
  return GsmModuleEngine.getInstance().getSignalStrength()
}

/**
 * Get GSM network registration status and operator information.
 */
export async function getNetworkStatus(): Promise<GsmNetworkInfo> {
  return GsmModuleEngine.getInstance().getNetworkStatus()
}

/**
 * Disconnect from the GSM modem.
 * Sends power-down command and cleans up resources.
 */
export async function disconnectGSM(): Promise<void> {
  return GsmModuleEngine.getInstance().disconnect()
}

/**
 * Get current GPRS data connection status.
 */
export async function getGprsStatus(): Promise<GsmGprsStatus> {
  return GsmModuleEngine.getInstance().getGprsStatus()
}

/**
 * Get GSM module connection state.
 */
export function getGsmConnectionState(): GsmConnectionState {
  return GsmModuleEngine.getInstance().getConnectionState()
}

/**
 * Get GSM modem information (manufacturer, model, IMEI, SIM status).
 */
export function getGsmModemInfo(): GsmModemInfo | null {
  return GsmModuleEngine.getInstance().getModemInfo()
}
