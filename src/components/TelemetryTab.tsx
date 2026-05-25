'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Battery,
  MapPin,
  Mountain,
  Signal,
  Thermometer,
  Droplets,
  Gauge,
  Compass,
  Activity,
  RotateCw,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Radio,
} from 'lucide-react'
import { TELEMETRY_LABELS, TELEMETRY_UNITS, SAFETY_THRESHOLDS } from '@/lib/constants'

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

interface MetricCardConfig {
  key: keyof TelemetrySnapshot
  icon: typeof Battery
  format: (v: number) => string
  colorFn: (v: number) => string
}

const METRIC_CARDS: MetricCardConfig[] = [
  {
    key: 'battery_voltage',
    icon: Battery,
    format: (v) => v.toFixed(1),
    colorFn: (v) => v > 13.2 ? 'text-emerald-400' : v > 12.6 ? 'text-amber-400' : 'text-rose-400',
  },
  {
    key: 'gps_lat',
    icon: MapPin,
    format: (v) => v.toFixed(4) + '°N',
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'gps_lng',
    icon: MapPin,
    format: (v) => v.toFixed(4) + '°E',
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'altitude',
    icon: Mountain,
    format: (v) => v.toFixed(1),
    colorFn: (v) => v <= 110 ? 'text-emerald-400' : v <= 120 ? 'text-amber-400' : 'text-rose-400',
  },
  {
    key: 'signal_strength',
    icon: Signal,
    format: (v) => v.toString(),
    colorFn: (v) => v > -60 ? 'text-emerald-400' : v > -75 ? 'text-amber-400' : 'text-rose-400',
  },
  {
    key: 'temperature',
    icon: Thermometer,
    format: (v) => v.toFixed(1),
    colorFn: (v) => v <= 40 ? 'text-emerald-400' : v <= 50 ? 'text-amber-400' : 'text-rose-400',
  },
  {
    key: 'humidity',
    icon: Droplets,
    format: (v) => v.toFixed(0),
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'pressure',
    icon: Gauge,
    format: (v) => v.toFixed(0),
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'heading',
    icon: Compass,
    format: (v) => v.toFixed(0) + '°',
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'speed',
    icon: Activity,
    format: (v) => v.toFixed(1),
    colorFn: (v) => v <= 12 ? 'text-emerald-400' : v <= 15 ? 'text-amber-400' : 'text-rose-400',
  },
  {
    key: 'roll',
    icon: RotateCw,
    format: (v) => v.toFixed(1) + '°',
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'pitch',
    icon: RotateCw,
    format: (v) => v.toFixed(1) + '°',
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'yaw',
    icon: RotateCw,
    format: (v) => v.toFixed(1) + '°',
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'motor_rpm_1',
    icon: Activity,
    format: (v) => v.toFixed(0),
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'motor_rpm_2',
    icon: Activity,
    format: (v) => v.toFixed(0),
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'motor_rpm_3',
    icon: Activity,
    format: (v) => v.toFixed(0),
    colorFn: () => 'text-teal-400',
  },
  {
    key: 'current_draw',
    icon: Gauge,
    format: (v) => v.toFixed(1),
    colorFn: (v) => v <= 25 ? 'text-emerald-400' : v <= 30 ? 'text-amber-400' : 'text-rose-400',
  },
]

function getTrend(current: number, previous: number | null): 'up' | 'down' | 'stable' {
  if (previous === null) return 'stable'
  const diff = current - previous
  if (Math.abs(diff) < 0.01) return 'stable'
  return diff > 0 ? 'up' : 'down'
}

function getStatusLevel(key: string, value: number): 'normal' | 'warning' | 'critical' {
  const thresholds = SAFETY_THRESHOLDS as Record<string, { warning: number; critical: number }>
  const t = thresholds[key]
  if (!t) return 'normal'

  // For signal_strength, lower is worse
  if (key === 'signal_strength') {
    if (value <= t.critical) return 'critical'
    if (value <= t.warning) return 'warning'
    return 'normal'
  }

  // For most metrics, higher is worse
  if (value >= t.critical) return 'critical'
  if (value >= t.warning) return 'warning'
  return 'normal'
}

export function TelemetryTab() {
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null)
  const [prevTelemetry, setPrevTelemetry] = useState<TelemetrySnapshot | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const prevRef = useRef<TelemetrySnapshot | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/telemetry?snapshot=true&safety=true')
        const json = await res.json()
        if (mounted && json.success && json.data.snapshot) {
          prevRef.current = telemetry
          setPrevTelemetry(telemetry)
          setTelemetry(json.data.snapshot)
          setLastUpdate(new Date().toLocaleTimeString())
        }
      } catch {
        // silent
      }
    }
    load()
    return () => { mounted = false }
  }, [refreshKey])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => setRefreshKey(k => k + 1), 3000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleRefresh = () => {
    setRefreshing(true)
    refresh()
    setTimeout(() => setRefreshing(false), 600)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse-dot' : 'bg-slate-600'}`} />
            {autoRefresh ? 'Live (3s)' : 'Paused'}
          </div>
          {lastUpdate && (
            <span className="text-[10px] text-slate-500 font-mono">Updated: {lastUpdate}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-7 text-xs"
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-7 text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {METRIC_CARDS.map((card) => {
          const value = telemetry ? telemetry[card.key] : null
          const prevValue = prevTelemetry ? prevTelemetry[card.key] : null
          const trend = value !== null ? getTrend(value, prevValue) : 'stable'
          const status = value !== null ? getStatusLevel(card.key, value) : 'normal'
          const Icon = card.icon
          const label = TELEMETRY_LABELS[card.key] || card.key
          const unit = TELEMETRY_UNITS[card.key] || ''

          return (
            <Card
              key={card.key}
              className={`bg-slate-900 border-white/5 transition-colors ${
                status === 'critical' ? 'border-rose-500/30' :
                status === 'warning' ? 'border-amber-500/30' : ''
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{label}</span>
                  <Icon className="w-3 h-3 text-slate-600" />
                </div>
                <div className="flex items-baseline gap-1">
                  <p className={`text-lg font-bold font-mono ${value !== null ? card.colorFn(value) : 'text-slate-600'}`}>
                    {value !== null ? card.format(value) : '—'}
                  </p>
                  {value !== null && (
                    <span className="text-[10px] text-slate-500">{unit}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                  {trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-400" />}
                  {trend === 'stable' && <Minus className="w-3 h-3 text-slate-600" />}
                  {status !== 'normal' && (
                    <Badge className={`text-[8px] px-1 py-0 ${
                      status === 'critical' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                      'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    } border`}>
                      {status}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Attitude Display */}
      {telemetry && (
        <Card className="bg-slate-900 border-white/5">
          <CardContent className="p-4">
            <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Attitude</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 mb-1">Roll</p>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ left: '50%', width: `${Math.abs(telemetry.roll) / 45 * 50}%`, marginLeft: telemetry.roll >= 0 ? '0' : 'auto', marginRight: telemetry.roll < 0 ? '0' : 'auto' }}
                  />
                </div>
                <p className="text-xs font-mono text-teal-400 mt-1">{telemetry.roll.toFixed(1)}°</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 mb-1">Pitch</p>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ left: '50%', width: `${Math.abs(telemetry.pitch) / 45 * 50}%`, marginLeft: telemetry.pitch >= 0 ? '0' : 'auto', marginRight: telemetry.pitch < 0 ? '0' : 'auto' }}
                  />
                </div>
                <p className="text-xs font-mono text-teal-400 mt-1">{telemetry.pitch.toFixed(1)}°</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 mb-1">Yaw</p>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ left: `${(telemetry.yaw / 360) * 100}%`, width: '3px' }}
                  />
                </div>
                <p className="text-xs font-mono text-teal-400 mt-1">{telemetry.yaw.toFixed(1)}°</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
