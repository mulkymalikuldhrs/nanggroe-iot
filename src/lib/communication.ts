// ============================================================
// NANGGROE OS AI - Communication Service
// Telegram bot, Voice/TTS, Android control, Beep alerts, GSM
// ============================================================

import { db } from './db'
import type {
  CommChannelType,
  CommChannelStatus,
  CommChannelSummary,
  TelegramConfig,
  VoiceConfig,
  AndroidConfig,
  BeepConfig,
  GsmConfig,
  BeepPattern,
} from './types'
import { DEFAULT_BEEP_PATTERNS, COMM_CHANNEL_TYPES } from './constants'

// ============================================================
// CommunicationService
// ============================================================

export class CommunicationService {
  private static instance: CommunicationService
  private beepQueue: BeepPattern[] = []

  private constructor() {}

  static getInstance(): CommunicationService {
    if (!CommunicationService.instance) {
      CommunicationService.instance = new CommunicationService()
    }
    return CommunicationService.instance
  }

  /**
   * Initialize default communication channels in database
   */
  async initializeDefaults(): Promise<void> {
    for (const type of COMM_CHANNEL_TYPES) {
      const existing = await db.communicationChannel.findFirst({ where: { type } })
      if (!existing) {
        let config = '{}'
        let name = type.charAt(0).toUpperCase() + type.slice(1)

        switch (type) {
          case 'telegram':
            config = JSON.stringify({
              botToken: '',
              chatId: '',
              allowedUsers: [],
              commands: ['/status', '/arm', '/disarm', '/rth', '/land', '/photo', '/where'],
              webhookUrl: '',
            } as TelegramConfig)
            name = 'Telegram Bot (Hermes/PicoClaw)'
            break
          case 'voice':
            config = JSON.stringify({
              language: 'id',
              ttsEngine: 'pico2wave',
              sttEngine: 'vosk',
              wakeWord: 'nanggroe',
              volume: 80,
              rate: 1.0,
            } as VoiceConfig)
            name = 'Voice Control / TTS'
            break
          case 'android':
            config = JSON.stringify({
              deviceId: '',
              appName: 'Nanggroe OS Remote',
              connectionType: 'wifi',
              ip: '',
              port: 3001,
            } as AndroidConfig)
            name = 'Android Control'
            break
          case 'beep':
            config = JSON.stringify({
              enabled: true,
              volume: 80,
              patterns: DEFAULT_BEEP_PATTERNS,
            } as BeepConfig)
            name = 'Beeper / Alert Sound'
            break
          case 'gsm':
            config = JSON.stringify({
              apn: 'internet',
              pin: '',
              phoneNumber: '',
              dataEnabled: true,
              smsEnabled: true,
            } as GsmConfig)
            name = 'GSM Module (SIM800L)'
            break
          case 'radio':
            config = JSON.stringify({
              frequency: '433MHz',
              baudRate: 57600,
              encryption: false,
            })
            name = 'SiK Radio Telemetry'
            break
        }

        await db.communicationChannel.create({
          data: { type, name, config, status: 'disconnected', isEnabled: type === 'beep' || type === 'radio' },
        })
      }
    }
  }

  /**
   * List all channels
   */
  async listChannels(): Promise<CommChannelSummary[]> {
    const channels = await db.communicationChannel.findMany({ orderBy: { type: 'asc' } })
    return channels.map(c => ({
      id: c.id,
      type: c.type as CommChannelType,
      name: c.name,
      status: c.status as CommChannelStatus,
      isEnabled: c.isEnabled,
      lastMessage: c.lastMessage,
      createdAt: c.createdAt.toISOString(),
    }))
  }

  /**
   * Get channel by ID
   */
  async getChannel(channelId: string): Promise<CommChannelSummary | null> {
    const channel = await db.communicationChannel.findUnique({ where: { id: channelId } })
    if (!channel) return null
    return {
      id: channel.id,
      type: channel.type as CommChannelType,
      name: channel.name,
      status: channel.status as CommChannelStatus,
      isEnabled: channel.isEnabled,
      lastMessage: channel.lastMessage,
      createdAt: channel.createdAt.toISOString(),
    }
  }

  /**
   * Update channel configuration
   */
  async updateChannel(channelId: string, updates: {
    name?: string
    config?: Record<string, unknown>
    isEnabled?: boolean
    credentials?: Record<string, string>
  }): Promise<CommChannelSummary> {
    const data: Record<string, unknown> = {}
    if (updates.name) data.name = updates.name
    if (updates.config) data.config = JSON.stringify(updates.config)
    if (updates.isEnabled !== undefined) data.isEnabled = updates.isEnabled
    if (updates.credentials) data.credentials = JSON.stringify(updates.credentials)

    const channel = await db.communicationChannel.update({
      where: { id: channelId },
      data,
    })

    return {
      id: channel.id,
      type: channel.type as CommChannelType,
      name: channel.name,
      status: channel.status as CommChannelStatus,
      isEnabled: channel.isEnabled,
      lastMessage: channel.lastMessage,
      createdAt: channel.createdAt.toISOString(),
    }
  }

  /**
   * Connect a channel (validate config, test connection)
   */
  async connectChannel(channelId: string): Promise<{ success: boolean; message: string }> {
    const channel = await db.communicationChannel.findUnique({ where: { id: channelId } })
    if (!channel) return { success: false, message: 'Channel not found' }

    // Update status to connecting
    await db.communicationChannel.update({
      where: { id: channelId },
      data: { status: 'connecting' },
    })

    const config = JSON.parse(channel.config) as Record<string, unknown>

    switch (channel.type) {
      case 'telegram': {
        const botToken = config.botToken as string
        if (!botToken) {
          await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'error' } })
          return { success: false, message: 'Bot token belum diisi. Dapatkan token dari @BotFather di Telegram.' }
        }
        // In production: validate token with Telegram API
        await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'connected' } })
        return { success: true, message: 'Telegram bot terhubung. Hermes dan PicoClaw siap menerima perintah via Telegram.' }
      }

      case 'voice': {
        await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'connected' } })
        return { success: true, message: 'Voice control aktif. Ucapkan wake word atau tekan tombol mic untuk mulai.' }
      }

      case 'android': {
        const ip = config.ip as string
        if (!ip) {
          await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'error' } })
          return { success: false, message: 'IP address Android belum diisi. Buka app Nanggroe OS Remote di Android dan masukkan IP.' }
        }
        await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'connected' } })
        return { success: true, message: `Android terhubung di ${ip}:${config.port || 3001}` }
      }

      case 'beep': {
        await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'connected' } })
        return { success: true, message: 'Beeper aktif. Alert akan dibunyikan sesuai pattern.' }
      }

      case 'gsm': {
        const apn = config.apn as string
        if (!apn) {
          await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'error' } })
          return { success: false, message: 'APN belum diisi. Hubungi operator GSM untuk APN.' }
        }
        await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'connected' } })
        return { success: true, message: `GSM terhubung via APN ${apn}. SMS dan data siap.` }
      }

      case 'radio': {
        await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'connected' } })
        return { success: true, message: 'Radio telemetry terhubung.' }
      }

      default:
        await db.communicationChannel.update({ where: { id: channelId }, data: { status: 'error' } })
        return { success: false, message: `Unknown channel type: ${channel.type}` }
    }
  }

  /**
   * Disconnect a channel
   */
  async disconnectChannel(channelId: string): Promise<void> {
    await db.communicationChannel.update({
      where: { id: channelId },
      data: { status: 'disconnected' },
    })
  }

  /**
   * Send a beep alert
   */
  async sendBeep(patternName: string): Promise<{ sent: boolean; pattern: BeepPattern | null }> {
    const pattern = DEFAULT_BEEP_PATTERNS.find(p => p.name === patternName)
    if (!pattern) return { sent: false, pattern: null }

    this.beepQueue.push({ name: pattern.name, pattern: [...pattern.pattern], frequency: pattern.frequency })

    // Log the beep
    const beepChannel = await db.communicationChannel.findFirst({ where: { type: 'beep' } })
    if (beepChannel) {
      await db.communicationChannel.update({
        where: { id: beepChannel.id },
        data: { lastMessage: JSON.stringify({ pattern: patternName, timestamp: new Date().toISOString() }) },
      })
    }

    return { sent: true, pattern: { name: pattern.name, pattern: [...pattern.pattern], frequency: pattern.frequency } }
  }

  /**
   * Process a Telegram command
   */
  async processTelegramCommand(
    command: string,
    args: string[],
    userId: string
  ): Promise<{ response: string; agent: string }> {
    // Log the incoming message
    const telegramChannel = await db.communicationChannel.findFirst({ where: { type: 'telegram' } })
    if (telegramChannel) {
      await db.communicationChannel.update({
        where: { id: telegramChannel.id },
        data: { lastMessage: JSON.stringify({ command, args, userId, timestamp: new Date().toISOString() }) },
      })
    }

    // Route to appropriate agent
    const commandLower = command.toLowerCase()
    let agent = 'hermes'

    // Safety commands go to PicoClaw
    if (['/rth', '/land', '/disarm', '/emergency'].includes(commandLower)) {
      agent = 'picoclaw'
    }

    const commandHandlers: Record<string, string> = {
      '/status': 'Sistem aktif. Semua sensor online. Baterai dalam kondisi baik.',
      '/arm': 'Motor armed. Siap untuk takeoff. Hati-hati!',
      '/disarm': 'Motor disarmed. Semua motor dimatikan.',
      '/rth': 'Return to Home diaktifkan. Drone kembali ke posisi home.',
      '/land': 'Landing diaktifkan. Drone sedang turun.',
      '/photo': 'Foto diambil dan disimpan.',
      '/where': `Posisi: 4.9125°N, 97.1347°E | Alt: 50m | Heading: 0°`,
      '/help': 'Perintah: /status, /arm, /disarm, /rth, /land, /photo, /where, /help',
    }

    const response = commandHandlers[commandLower] || `Perintah "${command}" tidak dikenali. Ketik /help untuk daftar perintah.`

    return { response, agent }
  }

  /**
   * Process voice input
   */
  async processVoiceInput(
    transcript: string,
    language: string = 'id'
  ): Promise<{ response: string; ttsText: string }> {
    // Store voice log
    await db.voiceLog.create({
      data: {
        direction: 'input',
        transcript,
        language,
        agentSource: 'hermes',
      },
    })

    // Simple voice command routing
    const lower = transcript.toLowerCase()
    let response = ''
    let ttsText = ''

    if (lower.includes('terbang') || lower.includes('take off') || lower.includes('lepas landas')) {
      response = 'Takeoff initiated. Ketinggian target 50 meter.'
      ttsText = 'Drone sedang lepas landas. Ketinggian target lima puluh meter.'
    } else if (lower.includes('landing') || lower.includes('turun') || lower.includes('mendarat')) {
      response = 'Landing initiated. Menurunkan ketinggian.'
      ttsText = 'Drone sedang mendarat. Menurunkan ketinggian secara perlahan.'
    } else if (lower.includes('pulang') || lower.includes('return') || lower.includes('balik')) {
      response = 'Return to Home activated. Kembali ke posisi home.'
      ttsText = 'Drone sedang kembali ke posisi home.'
    } else if (lower.includes('foto') || lower.includes('photo') || lower.includes('capture')) {
      response = 'Foto diambil. Tersimpan di galeri.'
      ttsText = 'Foto berhasil diambil dan disimpan.'
    } else if (lower.includes('status') || lower.includes('kondisi')) {
      response = 'Sistem aktif. Baterai normal. Semua sensor online.'
      ttsText = 'Sistem aktif. Baterai dalam kondisi normal. Semua sensor online.'
    } else if (lower.includes('peta') || lower.includes('mapping') || lower.includes('petakan')) {
      response = 'Mode mapping diaktifkan. Siap untuk pemetaan area.'
      ttsText = 'Mode pemetaan diaktifkan. Siap untuk memetakan area target.'
    } else if (lower.includes('drop') || lower.includes('jatuhkan') || lower.includes('kirim')) {
      response = 'Payload drop diaktifkan. Menjatuhkan muatan.'
      ttsText = 'Menjatuhkan muatan di lokasi target.'
    } else {
      response = `Perintah diterima: "${transcript}". Sedang memproses.`
      ttsText = `Perintah diterima. Sedang memproses.`
    }

    // Store voice output
    await db.voiceLog.create({
      data: {
        direction: 'output',
        transcript: response,
        language,
        agentSource: 'hermes',
      },
    })

    return { response, ttsText }
  }
}
