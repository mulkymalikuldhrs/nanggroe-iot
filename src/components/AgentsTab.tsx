'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
import { Separator } from '@/components/ui/separator'
import {
  Bot,
  Send,
  Loader2,
  Zap,
  MessageSquare,
  Shield,
  MapPin,
  Radio,
  Activity,
  Navigation,
  Database,
  Play,
  Square,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// --- Types ---

interface AgentMessage {
  id: string
  agent: string
  role: string
  content: string
  metadata?: string | null
  timestamp: string
  missionId?: string | null
}

interface AgentStatusInfo {
  name: string
  type: string
  state: string
  capabilities: string[]
  lastActivity: string | null
  tasksCompleted: number
  tasksFailed: number
  uptime: number
}

interface OrchestratorInfo {
  running: boolean
  uptime: number
  registeredAgents: string[]
  activeAgents: string[]
  taskQueueSize: number
  tasksCompleted: number
  tasksFailed: number
  messagesProcessed: number
  lastTick: string | null
}

interface TaskQueueItem {
  id: string
  type: string
  agent: string
  priority: string
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface CommLogEntry {
  id: string
  from: string
  to: string
  type: string
  priority: string
  payloadSummary: string
  timestamp: string
}

// --- Agent Visual Config ---

const AGENT_COLORS: Record<string, { bg: string; text: string; icon: string; border: string; label: string; desc: string }> = {
  hermes: {
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    icon: 'text-teal-400',
    border: 'border-teal-500/25',
    label: 'Hermes',
    desc: 'Strategic Planning (LLM)',
  },
  picoclaw: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    icon: 'text-amber-400',
    border: 'border-amber-500/25',
    label: 'PicoClaw',
    desc: 'Tactical Safety (Rules)',
  },
  sentinel: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    icon: 'text-red-400',
    border: 'border-red-500/25',
    label: 'Sentinel',
    desc: 'Continuous Monitoring',
  },
  navigator: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    icon: 'text-blue-400',
    border: 'border-blue-500/25',
    label: 'Navigator',
    desc: 'Path Planning & Routing',
  },
  comms_guard: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    icon: 'text-purple-400',
    border: 'border-purple-500/25',
    label: 'CommsGuard',
    desc: 'Communication Monitoring',
  },
  data_steward: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    icon: 'text-cyan-400',
    border: 'border-cyan-500/25',
    label: 'DataSteward',
    desc: 'Data Pipeline & Quality',
  },
  operator: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
    border: 'border-emerald-500/25',
    label: 'Operator',
    desc: 'Human Operator',
  },
  system: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    icon: 'text-slate-400',
    border: 'border-slate-500/25',
    label: 'System',
    desc: 'System Messages',
  },
}

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hermes: Bot,
  picoclaw: Shield,
  sentinel: Activity,
  navigator: Navigation,
  comms_guard: Radio,
  data_steward: Database,
  operator: MessageSquare,
  system: Zap,
}

const QUICK_COMMANDS = [
  { label: 'Peta area Lhoksukon', icon: MapPin, prompt: 'Peta area Lhoksukon untuk pemetaan udara' },
  { label: 'Status drone', icon: Radio, prompt: 'Status drone saat ini' },
  { label: 'RTH sekarang', icon: Shield, prompt: 'Return to home sekarang' },
  { label: 'Cek baterai', icon: Zap, prompt: 'Cek level baterai drone' },
  { label: 'Kondisi cuaca', icon: MessageSquare, prompt: 'Kondisi cuaca untuk penerbangan hari ini' },
  { label: 'Rencana misi baru', icon: MapPin, prompt: 'Buat rencana misi pemetaan baru untuk area persawahan' },
]

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  normal: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const STATE_COLORS: Record<string, string> = {
  idle: 'bg-slate-500',
  thinking: 'bg-blue-500 animate-pulse',
  acting: 'bg-emerald-500 animate-pulse',
  waiting: 'bg-amber-500',
  error: 'bg-red-500',
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

// --- Main Component ---

export function AgentsTab() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [agentStatus, setAgentStatus] = useState<Record<string, { enabled: boolean; status: string; lastMessage: AgentMessage | null }>>({})
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Orchestrator state
  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorInfo | null>(null)
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatusInfo>>({})
  const [taskQueue, setTaskQueue] = useState<TaskQueueItem[]>([])
  const [commLog, setCommLog] = useState<CommLogEntry[]>([])
  const [startingOrchestrator, setStartingOrchestrator] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // --- Load data ---

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const [messagesRes, orchRes] = await Promise.all([
          fetch('/api/agents?limit=100'),
          fetch('/api/agents/orchestrate'),
        ])

        if (mounted) {
          const msgJson = await messagesRes.json()
          if (msgJson.success) {
            setMessages(msgJson.data.messages)
            setAgentStatus(msgJson.data.agentStatus)
          }

          const orchJson = await orchRes.json()
          if (orchJson.success) {
            setOrchestratorStatus(orchJson.data.orchestrator)
            setAgentStatuses(orchJson.data.agents || {})
            setTaskQueue(orchJson.data.taskQueue || [])
            setCommLog(orchJson.data.communicationLog || [])
          }
        }
      } catch (err) {
        toast.error('Failed to load agent data: ' + (err instanceof Error ? err.message : 'Unknown error'))
      }
      if (mounted) setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [refreshKey, toast])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [messages])

  // --- Handlers ---

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
    } catch (err) {
      toast.error('Failed to send message: ' + (err instanceof Error ? err.message : 'Unknown error'))
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

  const handleOrchestratorAction = async (action: 'start' | 'stop') => {
    setStartingOrchestrator(true)
    try {
      const res = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(action === 'start' ? 'Orchestrator started' : 'Orchestrator stopped')
        setTimeout(refresh, 1000)
      } else {
        toast.error(json.error || 'Action failed')
      }
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
    setStartingOrchestrator(false)
  }

  const getAgentStyle = (agent: string) => AGENT_COLORS[agent] || AGENT_COLORS.system
  const getAgentIcon = (agent: string) => AGENT_ICONS[agent] || Zap

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {/* Orchestrator Status Bar */}
          <Card className="bg-slate-900 border-white/5 shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${orchestratorStatus?.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <span className="text-xs font-medium text-slate-200">Orchestrator</span>
                  <Badge variant="outline" className={`text-[9px] ${orchestratorStatus?.running ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-600'}`}>
                    {orchestratorStatus?.running ? 'RUNNING' : 'STOPPED'}
                  </Badge>
                  {orchestratorStatus?.running && (
                    <>
                      <Badge variant="outline" className="text-[9px] text-slate-400 border-white/10">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        {formatUptime(orchestratorStatus.uptime)}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] text-slate-400 border-white/10">
                        {orchestratorStatus.registeredAgents.length} agents
                      </Badge>
                      <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">
                        {orchestratorStatus.tasksCompleted} done
                      </Badge>
                      {orchestratorStatus.tasksFailed > 0 && (
                        <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/30">
                          {orchestratorStatus.tasksFailed} failed
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] text-blue-400 border-blue-500/30">
                        {orchestratorStatus.messagesProcessed} msgs
                      </Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                    onClick={refresh}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                  {orchestratorStatus?.running ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleOrchestratorAction('stop')}
                      disabled={startingOrchestrator}
                    >
                      {startingOrchestrator ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3 mr-1" />}
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleOrchestratorAction('start')}
                      disabled={startingOrchestrator}
                    >
                      {startingOrchestrator ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                      Start Orchestrator
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
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
                <div className="space-y-3 max-h-[35vh] lg:max-h-[40vh] overflow-y-auto pr-2">
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
                      const IconComponent = getAgentIcon(msg.agent)
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${msg.agent === 'operator' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                            <IconComponent className={`w-3.5 h-3.5 ${style.icon}`} />
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
                                : `${style.bg} border ${style.border}`
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
          <div className="mt-1 flex items-center gap-2">
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
          <div className="flex flex-wrap gap-1.5">
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

        {/* Right Sidebar */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
          {/* Agent Status Cards */}
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-200">Agent Fleet</CardTitle>
              <CardDescription className="text-[10px]">
                {orchestratorStatus?.running
                  ? `${orchestratorStatus.activeAgents.length} active / ${orchestratorStatus.registeredAgents.length} registered`
                  : 'Start orchestrator to activate agents'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* All agents */}
              {['hermes', 'picoclaw', 'sentinel', 'navigator', 'comms_guard', 'data_steward'].map((agentName) => {
                const style = getAgentStyle(agentName)
                const IconComponent = getAgentIcon(agentName)
                const status = agentStatuses[agentName]
                const isRegistered = orchestratorStatus?.registeredAgents.includes(agentName)
                const isActive = orchestratorStatus?.activeAgents.includes(agentName)
                const state = status?.state || 'idle'

                return (
                  <div key={agentName} className={`p-2.5 bg-slate-800/50 rounded-lg border ${isActive ? style.border : 'border-white/5'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                        <IconComponent className={`w-3 h-3 ${style.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-medium text-white">{style.label}</p>
                          <div className={`w-1.5 h-1.5 rounded-full ${STATE_COLORS[state] || 'bg-slate-600'}`} />
                        </div>
                        <p className="text-[8px] text-slate-500">{style.desc}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[8px] ${
                          isActive ? 'text-emerald-400 border-emerald-500/30' :
                          isRegistered ? 'text-amber-400 border-amber-500/30' :
                          'text-slate-600 border-slate-600'
                        }`}
                      >
                        {isActive ? state : isRegistered ? 'idle' : 'off'}
                      </Badge>
                    </div>
                    {status && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-slate-600">
                          ✓{status.tasksCompleted} ✗{status.tasksFailed}
                        </span>
                        {status.uptime > 0 && (
                          <span className="text-[8px] text-slate-600">
                            ⏱{formatUptime(status.uptime)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Task Queue */}
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-200">Task Queue</CardTitle>
                <Badge variant="outline" className="text-[9px] text-slate-400 border-white/10">
                  {taskQueue.length} tasks
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {taskQueue.length === 0 ? (
                <p className="text-[10px] text-slate-600 text-center py-3">No tasks in queue</p>
              ) : (
                <ScrollArea className="max-h-40">
                  <div className="space-y-1.5 pr-1">
                    {taskQueue.slice(0, 20).map((task) => (
                      <div key={task.id} className="p-2 bg-slate-800/50 rounded border border-white/5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-slate-300">{task.type}</span>
                          <Badge variant="outline" className={`text-[8px] ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] text-slate-500">{getAgentStyle(task.agent).label}</span>
                          <Badge
                            variant="outline"
                            className={`text-[8px] ${
                              task.status === 'running' ? 'text-blue-400 border-blue-500/30' :
                              task.status === 'completed' ? 'text-emerald-400 border-emerald-500/30' :
                              task.status === 'failed' ? 'text-red-400 border-red-500/30' :
                              'text-slate-500 border-slate-600'
                            }`}
                          >
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Inter-Agent Communication Log */}
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-200">Comm Log</CardTitle>
                <Badge variant="outline" className="text-[9px] text-blue-400 border-blue-500/30">
                  {commLog.length} msgs
                </Badge>
              </div>
              <CardDescription className="text-[10px]">Inter-agent messages</CardDescription>
            </CardHeader>
            <CardContent>
              {commLog.length === 0 ? (
                <p className="text-[10px] text-slate-600 text-center py-3">No messages yet</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-1 pr-1">
                    {[...commLog].reverse().slice(0, 30).map((log) => {
                      const fromStyle = getAgentStyle(log.from)
                      const toStyle = getAgentStyle(log.to === '*' ? 'system' : log.to)
                      return (
                        <div key={log.id} className="p-1.5 bg-slate-800/30 rounded border border-white/5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`text-[9px] font-medium ${fromStyle.text}`}>{fromStyle.label}</span>
                            <span className="text-[8px] text-slate-600">→</span>
                            <span className={`text-[9px] font-medium ${toStyle.text}`}>{log.to === '*' ? 'ALL' : toStyle.label}</span>
                            <Badge variant="outline" className={`text-[7px] ml-auto ${PRIORITY_COLORS[log.priority] || PRIORITY_COLORS.normal}`}>
                              {log.type}
                            </Badge>
                          </div>
                          <p className="text-[8px] text-slate-500 truncate">{log.payloadSummary}</p>
                          <p className="text-[7px] text-slate-700 mt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
