'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Battery, Sun, Radio, Usb, Zap, AlertTriangle, Thermometer,
} from 'lucide-react'

interface PowerSource {
  id: string
  type: string
  name: string
  status: string
  capacity: number
  currentLevel: number
  voltage: number
  current: number
  temperature: number
  lastReading: string
}

interface PowerStatus {
  mainBattery: { voltage: number; percentage: number; status: string; estimatedMinutes: number }
  solar: { voltage: number; isCharging: boolean; wattage: number }
  gsm: { voltage: number; isConnected: boolean }
  emergencyMode: boolean
}

const SOURCE_ICONS: Record<string, typeof Battery> = {
  battery: Battery,
  solar: Sun,
  gsm: Radio,
  usb: Usb,
}

const STATUS_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  charging: 'Charging',
  discharging: 'Discharging',
  full: 'Full',
  error: 'Error',
  offline: 'Offline',
}

export function PowerTab() {
  const [sources, setSources] = useState<PowerSource[]>([])
  const [status, setStatus] = useState<PowerStatus | null>(null)

  const fetchPower = useCallback(async () => {
    try {
      const res = await fetch('/api/power')
      const data = await res.json()
      if (data.success) {
        setSources(data.data.sources)
        setStatus(data.data.status)
      }
    } catch (err) {
      console.error('Failed to fetch power data:', err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/power')
        const data = await res.json()
        if (!cancelled && data.success) {
          setSources(data.data.sources)
          setStatus(data.data.status)
        }
      } catch (err) {
        console.error('Failed to fetch power data:', err)
      }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Power Management</h2>
        <p className="text-sm text-slate-400 mt-1">Baterai, Panel Surya, GSM - monitoring daya real-time</p>
      </div>

      {/* Emergency Mode Banner */}
      {status?.emergencyMode && (
        <Card className="bg-red-900/30 border-red-500/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-sm font-bold text-red-400">EMERGENCY POWER MODE</p>
              <p className="text-xs text-red-300">Baterai rendah, panel surya aktif sebagai backup</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Battery Status */}
      {status && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Battery className="w-4 h-4 text-teal-400" />
              Baterai Utama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{status.mainBattery.voltage.toFixed(1)}V</span>
                <Badge variant="outline" className={
                  status.mainBattery.percentage > 50 ? 'border-emerald-500/50 text-emerald-400' :
                  status.mainBattery.percentage > 20 ? 'border-yellow-500/50 text-yellow-400' :
                  'border-red-500/50 text-red-400'
                }>
                  {STATUS_LABELS[status.mainBattery.status] || status.mainBattery.status}
                </Badge>
              </div>
              <Progress value={status.mainBattery.percentage} className="h-3" />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{status.mainBattery.percentage}%</span>
                <span>Est. {status.mainBattery.estimatedMinutes} menit tersisa</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Power Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => {
          const IconComp = SOURCE_ICONS[source.type] || Battery
          return (
            <Card key={source.id} className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComp className="w-5 h-5 text-teal-400" />
                    <CardTitle className="text-sm text-white">{source.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABELS[source.status] || source.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-slate-400">Voltage:</span>
                    <span className="text-white">{source.voltage.toFixed(2)}V</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span className="text-slate-400">Current:</span>
                    <span className="text-white">{source.current.toFixed(2)}A</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-3 h-3 text-red-400" />
                    <span className="text-slate-400">Temp:</span>
                    <span className="text-white">{source.temperature.toFixed(1)}°C</span>
                  </div>
                  {source.capacity > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Battery className="w-3 h-3 text-emerald-400" />
                      <span className="text-slate-400">Capacity:</span>
                      <span className="text-white">{source.capacity}mAh</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Solar Panel Info */}
      {status && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              Panel Surya Darurat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-white">{status.solar.voltage.toFixed(1)}V</p>
                <p className="text-[10px] text-slate-400">Voltage</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{status.solar.wattage}W</p>
                <p className="text-[10px] text-slate-400">Panel Wattage</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${status.solar.isCharging ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {status.solar.isCharging ? 'Active' : 'Standby'}
                </p>
                <p className="text-[10px] text-slate-400">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
