'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSSE } from '@/hooks/use-sse'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Bot,
  Cpu,
  MapPin,
  Battery,
  Signal,
  Mountain,
  AlertTriangle,
  Wifi,
  Play,
  Zap,
} from 'lucide-react'
import { BootFlowPanel } from './BootFlowPanel'
import { useToast } from '@/hooks/use-toast'

interface SystemData {
  name: string
  version: string
  mode: string
  region: string
  homePosition: { lat: number; lng: number }
  uptime: number
  uptimeFormatted: string
  devices: { total: number; active: number }
  activeMission: { id: string; name: string; type: string; status: string } | null
  agents: {
    hermes: { enabled: boolean; status: string }
    picoclaw: { enabled: boolean; status: string }
  }
  session: { id: string; name: string; mode: string } | null
  alerts: { unread: number }
  config: Record<string, string>
}

interface TelemetrySnapshot {
  battery_voltage: number
  gps_lat: number
  gps_lng: number
  altitude: number
  signal_strength: number
  temperature: number
  humidity: number
  pressure: number
  heading: number
  speed: number
  roll: number
  pitch: number
  yaw: number
  motor_rpm_1: number
  motor_rpm_2: number
  motor_rpm_3: number
  current_draw: number
}

interface AlertData {
  id: string
  level: string
  source: string
  title: string
  message: string
  category: string
  isRead: boolean
  isResolved: boolean
  timestamp: string
}

const MODE_COLORS: Record<string, string> = {
  discovery: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  planning: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  build: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  debug: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  optimize: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
}

const ALERT_COLORS: Record<string, string> = {
  info: 'text-teal-400',
  warning: 'text-amber-400',
  critical: 'text-rose-400',
}

export function OverviewTab() {
  const [system, setSystem] = useState<SystemData | null>(null)
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null)
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)
  const [liveConnected, setLiveConnected] = useState(false)
  const { toast } = useToast()

  // SSE real-time telemetry stream
  const { connected: sseConnected } = useSSE<{
    type: string
    snapshot: TelemetrySnapshot
    timestamp: string
  }>({
    url: '/api/stream/telemetry',
    enabled: true,
    onMessage: (data) => {
      if (data.type === 'telemetry' && data.snapshot) {
        setTelemetry(data.snapshot)
        setLiveConnected(true)
      }
    },
  })

  // Sync live connection state
  useEffect(() => {
    setLiveConnected(sseConnected)
  }, [sseConnected])

  const fetchSystem = useCallback(async () => {
    try {
      const res = await fetch('/api/system')
      const json = await res.json()
      if (json.success) setSystem(json.data)
    } catch (err) {
      toast.error('Failed to fetch system data: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }, [])

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry?snapshot=true&safety=true')
      const json = await res.json()
      if (json.success && json.data.snapshot) {
        setTelemetry(json.data.snapshot)
      }
    } catch (err) {
      toast.error('Failed to fetch telemetry: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?limit=5')
      const json = await res.json()
      if (json.success) setAlerts(json.data.alerts)
    } catch (err) {
      toast.error('Failed to fetch alerts: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }, [])

  const handleSeed = async () => {
    try {
      await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: true }),
      })
      fetchSystem()
      fetchTelemetry()
      fetchAlerts()
    } catch (err) {
      toast.error('Failed to seed database: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchSystem(), fetchTelemetry(), fetchAlerts()])
      setLoading(false)
    }
    load()
  }, [fetchSystem, fetchTelemetry, fetchAlerts])

  // Auto-refresh telemetry every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchTelemetry, 3000)
    return () => clearInterval(interval)
  }, [fetchTelemetry])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-900 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    )
  }

  const mode = system?.mode || 'discovery'
  const batteryPct = telemetry
    ? Math.max(0, Math.min(100, ((telemetry.battery_voltage - 12.6) / (16.8 - 12.6)) * 100))
    : 0

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSeed}
          className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
        >
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          Seed Database
        </Button>

      </div>

      {/* System Mode + Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Mode */}
        <Card className="bg-slate-900 border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">System Mode</span>
              <Play className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${MODE_COLORS[mode] || MODE_COLORS.discovery} border text-xs`}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              Uptime: {system?.uptimeFormatted || '0s'}
            </p>
          </CardContent>
        </Card>

        {/* Battery */}
        <Card className="bg-slate-900 border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Battery</span>
              <Battery className={`w-3.5 h-3.5 ${batteryPct > 30 ? 'text-emerald-400' : batteryPct > 15 ? 'text-amber-400' : 'text-rose-400'}`} />
            </div>
            <p className={`text-2xl font-bold font-mono ${batteryPct > 30 ? 'text-emerald-400' : batteryPct > 15 ? 'text-amber-400' : 'text-rose-400'}`}>
              {telemetry ? telemetry.battery_voltage.toFixed(1) : '—'}V
            </p>
            <Progress value={batteryPct} className="h-1.5 mt-2 bg-white/5 [&>div]:bg-emerald-500" />
            <p className="text-[10px] text-slate-500 mt-1">{batteryPct.toFixed(0)}% remaining</p>
          </CardContent>
        </Card>

        {/* Altitude */}
        <Card className="bg-slate-900 border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Altitude</span>
              <Mountain className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-teal-400">
              {telemetry ? telemetry.altitude.toFixed(1) : '—'}
              <span className="text-sm text-slate-500 ml-1">m</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-2">Max: 120m</p>
          </CardContent>
        </Card>

        {/* Signal */}
        <Card className="bg-slate-900 border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Signal</span>
              <Signal className={`w-3.5 h-3.5 ${(telemetry?.signal_strength || 0) > -60 ? 'text-emerald-400' : (telemetry?.signal_strength || 0) > -75 ? 'text-amber-400' : 'text-rose-400'}`} />
            </div>
            <p className={`text-2xl font-bold font-mono ${(telemetry?.signal_strength || 0) > -60 ? 'text-emerald-400' : (telemetry?.signal_strength || 0) > -75 ? 'text-amber-400' : 'text-rose-400'}`}>
              {telemetry ? telemetry.signal_strength : '—'}
              <span className="text-sm text-slate-500 ml-1">dBm</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-2">
              {(telemetry?.signal_strength || 0) > -60 ? 'Strong' : (telemetry?.signal_strength || 0) > -75 ? 'Fair' : 'Weak'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agents + Mission + GPS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Status */}
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-200">AI Agents</CardTitle>
            <CardDescription className="text-xs">Multi-agent intelligence status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Hermes */}
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                <Bot className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">Hermes</p>
                  <div className={`w-2 h-2 rounded-full ${system?.agents.hermes.status === 'online' ? 'bg-emerald-500 animate-pulse-dot' : 'bg-slate-600'}`} />
                </div>
                <p className="text-[10px] text-slate-500 truncate">Strategic Planning Agent</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${system?.agents.hermes.status === 'online' ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-600'}`}>
                {system?.agents.hermes.status || 'offline'}
              </Badge>
            </div>
            {/* PicoClaw */}
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">PicoClaw</p>
                  <div className={`w-2 h-2 rounded-full ${system?.agents.picoclaw.status === 'online' ? 'bg-emerald-500 animate-pulse-dot' : 'bg-slate-600'}`} />
                </div>
                <p className="text-[10px] text-slate-500 truncate">Tactical Safety Agent</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${system?.agents.picoclaw.status === 'online' ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-600'}`}>
                {system?.agents.picoclaw.status || 'offline'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Active Mission */}
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-200">Active Mission</CardTitle>
            <CardDescription className="text-xs">Current operation status</CardDescription>
          </CardHeader>
          <CardContent>
            {system?.activeMission ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{system.activeMission.name}</p>
                    <p className="text-[10px] text-slate-500">{system.activeMission.type}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border text-xs">
                  {system.activeMission.status}
                </Badge>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                <MapPin className="w-6 h-6 mb-2 text-slate-600" />
                <p className="text-xs">No active mission</p>
                <p className="text-[10px] text-slate-600">Create one from Missions tab</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPS + Devices */}
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-200">Position & Devices</CardTitle>
            <CardDescription className="text-xs">GPS fix & hardware summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-300 font-mono">
                  {telemetry ? `${telemetry.gps_lat.toFixed(4)}°N` : '—'}{' '}
                  {telemetry ? `${telemetry.gps_lng.toFixed(4)}°E` : '—'}
                </p>
                <p className="text-[10px] text-slate-500">GPS Fix</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <Cpu className="w-4 h-4 text-teal-400" />
              <div>
                <p className="text-xs text-slate-300">
                  {system?.devices.active || 0} / {system?.devices.total || 0}
                  <span className="text-slate-500 ml-1">active</span>
                </p>
                <p className="text-[10px] text-slate-500">Devices Detected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boot Flow + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BootFlowPanel />

        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm text-slate-200">Recent Alerts</CardTitle>
                <CardDescription className="text-xs">
                  {system?.alerts.unread || 0} unread alerts
                </CardDescription>
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2 p-2.5 bg-slate-800/50 rounded-lg border border-white/5"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                      alert.level === 'critical' ? 'bg-rose-500' :
                      alert.level === 'warning' ? 'bg-amber-500' : 'bg-teal-500'
                    }`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${ALERT_COLORS[alert.level] || 'text-slate-300'}`}>
                        {alert.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                <AlertTriangle className="w-6 h-6 mb-2 text-slate-600" />
                <p className="text-xs">No alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
