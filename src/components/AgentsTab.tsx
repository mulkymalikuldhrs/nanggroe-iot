'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bot,
  Send,
  Loader2,
  Zap,
  MessageSquare,
  Shield,
  MapPin,
  Radio,
} from 'lucide-react'

interface AgentMessage {
  id: string
  agent: string
  role: string
  content: string
  metadata?: string | null
  timestamp: string
  missionId?: string | null
}

interface AgentStatus {
  enabled: boolean
  status: string
  lastMessage: AgentMessage | null
}

const AGENT_COLORS: Record<string, { bg: string; text: string; icon: string; border: string; label: string }> = {
  hermes: {
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    icon: 'text-teal-400',
    border: 'border-teal-500/25',
    label: 'Hermes',
  },
  picoclaw: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    icon: 'text-amber-400',
    border: 'border-amber-500/25',
    label: 'PicoClaw',
  },
  operator: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
    border: 'border-emerald-500/25',
    label: 'Operator',
  },
  system: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    icon: 'text-slate-400',
    border: 'border-slate-500/25',
    label: 'System',
  },
}

const QUICK_COMMANDS = [
  { label: 'Peta area Lhoksukon', icon: MapPin, prompt: 'Peta area Lhoksukon untuk pemetaan udara' },
  { label: 'Status drone', icon: Radio, prompt: 'Status drone saat ini' },
  { label: 'RTH sekarang', icon: Shield, prompt: 'Return to home sekarang' },
  { label: 'Cek baterai', icon: Zap, prompt: 'Cek level baterai drone' },
  { label: 'Kondisi cuaca', icon: MessageSquare, prompt: 'Kondisi cuaca untuk penerbangan hari ini' },
  { label: 'Rencana misi baru', icon: MapPin, prompt: 'Buat rencana misi pemetaan baru untuk area persawahan' },
]

export function AgentsTab() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({})
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/agents?limit=100')
        const json = await res.json()
        if (mounted && json.success) {
          setMessages(json.data.messages)
          setAgentStatus(json.data.agentStatus)
        }
      } catch {
        // silent
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [refreshKey])

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [messages])

  const handleSend = async (text?: string) => {
    const message = (text || inputText).trim()
    if (!message || sending) return

    setSending(true)
    setInputText('')

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message, includeContext: true }),
      })
      const json = await res.json()
      if (json.success) {
        refresh()
      }
    } catch {
      // silent
    }

    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getAgentStyle = (agent: string) => AGENT_COLORS[agent] || AGENT_COLORS.system

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <Card className="bg-slate-900 border-white/5 flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-200">Hermes Chat</CardTitle>
                <Badge variant="outline" className="text-[10px] text-teal-400 border-teal-500/30">
                  {messages.length} messages
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Natural language interaction with strategic planning AI
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
              <ScrollArea className="flex-1" ref={scrollRef}>
                <div className="space-y-3 max-h-[50vh] lg:max-h-[55vh] overflow-y-auto pr-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <Bot className="w-8 h-8 mb-2 text-slate-600" />
                      <p className="text-xs">No messages yet</p>
                      <p className="text-[10px] text-slate-600">Send a command to start interacting with Hermes</p>
                    </div>
                  ) : (
                    [...messages].reverse().map((msg) => {
                      const style = getAgentStyle(msg.agent)
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${msg.agent === 'operator' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                            {msg.agent === 'hermes' ? (
                              <Bot className={`w-3.5 h-3.5 ${style.icon}`} />
                            ) : msg.agent === 'picoclaw' ? (
                              <Shield className={`w-3.5 h-3.5 ${style.icon}`} />
                            ) : msg.agent === 'operator' ? (
                              <MessageSquare className={`w-3.5 h-3.5 ${style.icon}`} />
                            ) : (
                              <Zap className={`w-3.5 h-3.5 ${style.icon}`} />
                            )}
                          </div>
                          <div className={`max-w-[80%] ${msg.agent === 'operator' ? 'text-right' : ''}`}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] font-medium ${style.text}`}>{style.label}</span>
                              <span className="text-[9px] text-slate-600 font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                              {msg.role && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 border-white/10 text-slate-500">
                                  {msg.role}
                                </Badge>
                              )}
                            </div>
                            <div className={`p-2.5 rounded-lg text-xs text-slate-200 leading-relaxed ${
                              msg.agent === 'operator'
                                ? 'bg-emerald-500/10 border border-emerald-500/15'
                                : msg.agent === 'hermes'
                                ? 'bg-teal-500/10 border border-teal-500/15'
                                : msg.agent === 'picoclaw'
                                ? 'bg-amber-500/10 border border-amber-500/15'
                                : 'bg-slate-800/50 border border-white/5'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Input */}
          <div className="mt-3 flex items-center gap-2">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send command to Hermes..."
              className="bg-slate-900 border-white/10 text-white placeholder:text-slate-600"
              disabled={sending}
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={sending || !inputText.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white h-9 px-4"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {/* Quick Commands */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((cmd) => (
              <Button
                key={cmd.label}
                size="sm"
                variant="outline"
                onClick={() => handleSend(cmd.prompt)}
                className="h-6 text-[10px] border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
              >
                <cmd.icon className="w-3 h-3 mr-1" />
                {cmd.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Agent Status Sidebar */}
        <div className="w-full lg:w-64 shrink-0">
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-200">Agent Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Hermes */}
              <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-white">Hermes</p>
                      <div className={`w-1.5 h-1.5 rounded-full ${agentStatus.hermes?.status === 'online' ? 'bg-emerald-500 animate-pulse-dot' : 'bg-slate-600'}`} />
                    </div>
                    <p className="text-[9px] text-slate-500">Strategic Planning</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[9px] ${agentStatus.hermes?.status === 'online' ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-600'}`}>
                  {agentStatus.hermes?.status || 'offline'}
                </Badge>
                {agentStatus.hermes?.lastMessage && (
                  <p className="text-[9px] text-slate-600 mt-2 truncate">
                    {agentStatus.hermes.lastMessage.content.substring(0, 60)}...
                  </p>
                )}
              </div>

              {/* PicoClaw */}
              <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-white">PicoClaw</p>
                      <div className={`w-1.5 h-1.5 rounded-full ${agentStatus.picoclaw?.status === 'online' ? 'bg-emerald-500 animate-pulse-dot' : 'bg-slate-600'}`} />
                    </div>
                    <p className="text-[9px] text-slate-500">Tactical Safety</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[9px] ${agentStatus.picoclaw?.status === 'online' ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-600'}`}>
                  {agentStatus.picoclaw?.status || 'offline'}
                </Badge>
                {agentStatus.picoclaw?.lastMessage && (
                  <p className="text-[9px] text-slate-600 mt-2 truncate">
                    {agentStatus.picoclaw.lastMessage.content.substring(0, 60)}...
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="p-3 bg-slate-800/30 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  <span className="text-teal-400 font-medium">Hermes</span> handles strategic decisions, mission planning, and route optimization.{' '}
                  <span className="text-amber-400 font-medium">PicoClaw</span> monitors real-time telemetry and executes safety protocols.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
