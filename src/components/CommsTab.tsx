'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageSquare, Phone, Smartphone, Bell, Radio, Wifi,
  Send, Mic, Volume2, Link2, Unlink,
} from 'lucide-react'

interface Channel {
  id: string
  type: string
  name: string
  status: string
  isEnabled: boolean
  lastMessage?: string | null
  createdAt: string
}

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  telegram: MessageSquare,
  voice: Phone,
  android: Smartphone,
  beep: Bell,
  gsm: Radio,
  radio: Wifi,
}

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-yellow-500',
  disconnected: 'bg-slate-500',
  error: 'bg-red-500',
}

export function CommsTab() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [telegramInput, setTelegramInput] = useState('')
  const [voiceInput, setVoiceInput] = useState('')
  const [chatLog, setChatLog] = useState<Array<{ from: string; message: string }>>([])

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/comms')
      const data = await res.json()
      if (data.success) setChannels(data.data)
    } catch (err) {
      console.error('Failed to fetch channels:', err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/comms')
        const data = await res.json()
        if (!cancelled && data.success) setChannels(data.data)
      } catch (err) {
        console.error('Failed to fetch channels:', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const toggleChannel = async (channelId: string, enable: boolean) => {
    try {
      await fetch(`/api/comms/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enable }),
      })
      fetchChannels()
    } catch (err) {
      console.error('Failed to toggle channel:', err)
    }
  }

  const connectChannel = async (channelId: string) => {
    try {
      await fetch(`/api/comms/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' }),
      })
      fetchChannels()
    } catch (err) {
      console.error('Failed to connect channel:', err)
    }
  }

  const disconnectChannel = async (channelId: string) => {
    try {
      await fetch(`/api/comms/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })
      fetchChannels()
    } catch (err) {
      console.error('Failed to disconnect channel:', err)
    }
  }

  const sendTelegramCommand = async () => {
    if (!telegramInput.trim()) return
    try {
      const res = await fetch('/api/comms/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: telegramInput, args: [], userId: 'dashboard' }),
      })
      const data = await res.json()
      if (data.success) {
        setChatLog(prev => [
          ...prev,
          { from: 'operator', message: telegramInput },
          { from: data.data.agent, message: data.data.response },
        ])
        setTelegramInput('')
      }
    } catch (err) {
      console.error('Telegram command failed:', err)
    }
  }

  const sendVoiceCommand = async () => {
    if (!voiceInput.trim()) return
    try {
      const res = await fetch('/api/comms/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: voiceInput, language: 'id' }),
      })
      const data = await res.json()
      if (data.success) {
        setChatLog(prev => [
          ...prev,
          { from: 'operator', message: voiceInput },
          { from: 'hermes', message: data.data.response },
        ])
        setVoiceInput('')
      }
    } catch (err) {
      console.error('Voice command failed:', err)
    }
  }

  const sendBeep = async (pattern: string) => {
    try {
      await fetch('/api/comms/beep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern }),
      })
    } catch (err) {
      console.error('Beep failed:', err)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Communications</h2>
        <p className="text-sm text-slate-400 mt-1">Telegram, Voice, Android, Beep, GSM - kontrol robot dari mana saja</p>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel) => {
          const IconComp = CHANNEL_ICONS[channel.type] || MessageSquare
          return (
            <Card key={channel.id} className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComp className="w-5 h-5 text-teal-400" />
                    <CardTitle className="text-sm text-white">{channel.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[channel.status] || 'bg-slate-500'}`} />
                    <Switch
                      checked={channel.isEnabled}
                      onCheckedChange={(checked) => toggleChannel(channel.id, checked)}
                    />
                  </div>
                </div>
                <CardDescription className="text-[10px] text-slate-500">
                  Status: {channel.status}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  {channel.status !== 'connected' ? (
                    <Button size="sm" variant="outline" onClick={() => connectChannel(channel.id)} className="flex-1">
                      <Link2 className="w-3 h-3 mr-1" />
                      Connect
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => disconnectChannel(channel.id)} className="flex-1">
                      <Unlink className="w-3 h-3 mr-1" />
                      Disconnect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Telegram Command Console */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-400" />
            Telegram Command Console
          </CardTitle>
          <CardDescription>Kirim perintah ke Hermes/PicoClaw via Telegram</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="/status, /arm, /disarm, /rth, /land, /photo..."
                value={telegramInput}
                onChange={(e) => setTelegramInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTelegramCommand()}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button size="sm" onClick={sendTelegramCommand} className="bg-teal-600 hover:bg-teal-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {/* Quick Commands */}
            <div className="flex flex-wrap gap-1">
              {['/status', '/arm', '/disarm', '/rth', '/land', '/photo', '/where'].map(cmd => (
                <Button key={cmd} size="sm" variant="outline" className="text-xs h-7"
                  onClick={() => { setTelegramInput(cmd); }}>
                  {cmd}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Control */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Mic className="w-4 h-4 text-teal-400" />
            Voice Control / TTS
          </CardTitle>
          <CardDescription>Perintah suara dan text-to-speech feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ketik perintah suara: 'terbang', 'landing', 'pulang', 'foto'..."
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendVoiceCommand()}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <Button size="sm" onClick={sendVoiceCommand} className="bg-teal-600 hover:bg-teal-700">
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Beep Controls */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-400" />
            Beep Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['startup', 'warning', 'critical', 'success', 'land', 'rth', 'arm', 'disarm'].map(pattern => (
              <Button key={pattern} size="sm" variant="outline" className="text-xs"
                onClick={() => sendBeep(pattern)}>
                🔔 {pattern}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Log */}
      {chatLog.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-sm text-white">Chat Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {chatLog.map((log, i) => (
                  <div key={i} className={`text-xs p-2 rounded ${
                    log.from === 'operator' ? 'bg-slate-800 text-slate-300' :
                    log.from === 'picoclaw' ? 'bg-red-900/30 text-red-300' :
                    'bg-teal-900/30 text-teal-300'
                  }`}>
                    <span className="font-semibold">[{log.from}]</span> {log.message}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
