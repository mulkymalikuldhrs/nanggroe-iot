'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  HardDrive,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Activity,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Cpu,
  MapPin,
  Camera,
  Radio,
  Battery,
  CircuitBoard,
} from 'lucide-react'

// ---- Types ----
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

interface DriverState {
  driverName: string
  deviceType: string
  connectionState: ConnectionState
  deviceId: string | null
  lastError: string | null
  lastHealthCheck: string | null
}

interface DriversData {
  drivers: DriverState[]
  total: number
  connected: number
  disconnected: number
}

interface HealthCheckResult {
  healthy: boolean
  details: Record<string, unknown>
  latency: number
}

// ---- Config ----
const CONNECTION_CONFIG: Record<ConnectionState, { color: string; bg: string; border: string; label: string }> = {
  connected: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', label: 'Connected' },
  connecting: { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', label: 'Connecting' },
  disconnected: { color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30', label: 'Disconnected' },
  error: { color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30', label: 'Error' },
}

const DEVICE_TYPE_ICONS: Record<string, typeof Cpu> = {
  flight_controller: Cpu,
  companion_computer: CircuitBoard,
  gps: MapPin,
  camera: Camera,
  sensor: Activity,
  radio: Radio,
  battery: Battery,
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  flight_controller: 'Pixhawk',
  companion_computer: 'Raspberry Pi',
  gps: 'GPS',
  camera: 'Camera',
  sensor: 'I2C Sensor',
  radio: 'Radio',
  battery: 'Battery',
}

const PROTOCOLS: Record<string, string> = {
  flight_controller: 'MAVLink / UART',
  companion_computer: 'SSH / USB',
  gps: 'NMEA / UART',
  camera: 'CSI / GPIO',
  sensor: 'I2C',
  radio: 'SiK / UART',
  battery: 'ADC / PWM',
}

export function DriversTab() {
  const [data, setData] = useState<DriversData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [healthResults, setHealthResults] = useState<Record<string, HealthCheckResult>>({})
  const [healthCheckAllLoading, setHealthCheckAllLoading] = useState(false)

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/drivers')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch {
      // silent
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/drivers')
        const json = await res.json()
        if (!cancelled && json.success) {
          setData(json.data)
        }
      } catch {
        // silent
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleConnect = async (deviceType: string) => {
    setActionLoading(prev => ({ ...prev, [deviceType]: true }))
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', deviceType, deviceId: `dev_${deviceType}_001` }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchDrivers()
      }
    } catch {
      // silent
    }
    setActionLoading(prev => ({ ...prev, [deviceType]: false }))
  }

  const handleDisconnect = async (deviceType: string) => {
    setActionLoading(prev => ({ ...prev, [deviceType]: true }))
    try {
      await fetch(`/api/drivers?deviceType=${deviceType}`, { method: 'DELETE' })
      await fetchDrivers()
    } catch {
      // silent
    }
    setActionLoading(prev => ({ ...prev, [deviceType]: false }))
  }

  const handleHealthCheck = async (deviceType: string) => {
    setActionLoading(prev => ({ ...prev, [`hc_${deviceType}`]: true }))
    try {
      const res = await fetch('/api/drivers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'command', deviceType, command: 'healthCheck' }),
      })
      const json = await res.json()
      if (json.success && json.data?.result) {
        setHealthResults(prev => ({ ...prev, [deviceType]: json.data.result }))
      }
      await fetchDrivers()
    } catch {
      // silent
    }
    setActionLoading(prev => ({ ...prev, [`hc_${deviceType}`]: false }))
  }

  const handleHealthCheckAll = async () => {
    setHealthCheckAllLoading(true)
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'healthCheckAll' }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setHealthResults(json.data)
      }
      await fetchDrivers()
    } catch {
      // silent
    }
    setHealthCheckAllLoading(false)
  }

  const toggleExpand = (deviceType: string) => {
    setExpandedDriver(expandedDriver === deviceType ? null : deviceType)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-900 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-teal-400" />
            Device Drivers
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {data.connected} connected / {data.total} total drivers
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleHealthCheckAll}
          disabled={healthCheckAllLoading}
          className="bg-teal-600 hover:bg-teal-700 text-white h-8"
        >
          {healthCheckAllLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              Health Check All
            </>
          )}
        </Button>
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.drivers.map((driver) => {
          const cfg = CONNECTION_CONFIG[driver.connectionState]
          const Icon = DEVICE_TYPE_ICONS[driver.deviceType] || HardDrive
          const label = DEVICE_TYPE_LABELS[driver.deviceType] || driver.deviceType
          const protocol = PROTOCOLS[driver.deviceType] || 'Unknown'
          const isExpanded = expandedDriver === driver.deviceType
          const hcResult = healthResults[driver.deviceType]
          const isLoading = actionLoading[driver.deviceType]
          const isHcLoading = actionLoading[`hc_${driver.deviceType}`]

          return (
            <Card
              key={driver.deviceType}
              className={`bg-slate-900 border ${cfg.border} transition-colors`}
            >
              <CardContent className="p-4">
                {/* Card header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-[10px] text-slate-500">{protocol}</p>
                    </div>
                  </div>
                  <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-[10px]`}>
                    {driver.connectionState === 'connected' ? (
                      <Wifi className="w-3 h-3 mr-1" />
                    ) : driver.connectionState === 'error' ? (
                      <XCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <WifiOff className="w-3 h-3 mr-1" />
                    )}
                    {cfg.label}
                  </Badge>
                </div>

                {/* Device ID */}
                {driver.deviceId && (
                  <div className="mb-2 px-2.5 py-1.5 bg-slate-800/50 rounded-lg border border-white/5">
                    <p className="text-[10px] text-slate-500">Device ID</p>
                    <p className="text-[11px] text-slate-300 font-mono">{driver.deviceId}</p>
                  </div>
                )}

                {/* Last Error */}
                {driver.lastError && (
                  <div className="mb-2 px-2.5 py-1.5 bg-rose-500/5 rounded-lg border border-rose-500/20">
                    <p className="text-[10px] text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {driver.lastError}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  {driver.connectionState === 'connected' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(driver.deviceType)}
                      disabled={isLoading}
                      className="h-7 text-[11px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <WifiOff className="w-3 h-3 mr-1" />}
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(driver.deviceType)}
                      disabled={isLoading || driver.connectionState === 'connecting'}
                      className="h-7 text-[11px] bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {isLoading || driver.connectionState === 'connecting' ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Wifi className="w-3 h-3 mr-1" />
                      )}
                      Connect
                    </Button>
                  )}

                  {driver.connectionState === 'connected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleHealthCheck(driver.deviceType)}
                      disabled={isHcLoading}
                      className="h-7 text-[11px] border-white/10 text-slate-300 hover:bg-white/5"
                    >
                      {isHcLoading ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Activity className="w-3 h-3 mr-1" />
                      )}
                      Health
                    </Button>
                  )}

                  <button
                    onClick={() => toggleExpand(driver.deviceType)}
                    className="ml-auto flex items-center gap-1 text-[10px] text-teal-400/70 hover:text-teal-400 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? 'Less' : 'Details'}
                  </button>
                </div>

                {/* Expanded Health Check Result */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    {hcResult ? (
                      <>
                        <div className="flex items-center gap-2">
                          {hcResult.healthy ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span className={`text-xs font-medium ${hcResult.healthy ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {hcResult.healthy ? 'Healthy' : 'Unhealthy'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono ml-auto">{hcResult.latency}ms</span>
                        </div>
                        <div className="p-2.5 bg-slate-800/50 rounded-lg border border-white/5 max-h-32 overflow-y-auto">
                          {Object.entries(hcResult.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-[10px] py-0.5">
                              <span className="text-slate-500">{key}</span>
                              <span className="text-slate-300 font-mono">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-600">No health check data. Click Health to run a check.</p>
                    )}
                    {driver.lastHealthCheck && (
                      <p className="text-[9px] text-slate-600">
                        Last check: {new Date(driver.lastHealthCheck).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
