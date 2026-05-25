'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Navigation, MapPin, Home, Crosshair, Truck, Map,
  Play, Plus, Route, Ruler,
} from 'lucide-react'

interface NavPlan {
  id: string
  name: string
  type: string
  status: string
  waypoints: Array<{ lat: number; lng: number; alt: number; action: string }>
  homePosition?: { lat: number; lng: number; alt: number } | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  gps_track: 'GPS Tracking',
  autopilot: 'Autopilot',
  rth: 'Return to Home',
  field_mapping: 'Field Mapping',
  survey: 'Survey',
  delivery: 'Delivery',
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-slate-500',
  active: 'bg-emerald-500',
  paused: 'bg-yellow-500',
  completed: 'bg-blue-500',
  aborted: 'bg-red-500',
}

export function NavigationTab() {
  const [plans, setPlans] = useState<NavPlan[]>([])
  const [mappingName, setMappingName] = useState('')
  const [mappingCoords, setMappingCoords] = useState('')
  const [deliveryName, setDeliveryName] = useState('')
  const [pickupLat, setPickupLat] = useState('')
  const [pickupLng, setPickupLng] = useState('')
  const [dropLat, setDropLat] = useState('')
  const [dropLng, setDropLng] = useState('')

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/navigation')
      const data = await res.json()
      if (data.success) setPlans(data.data)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/navigation')
        const data = await res.json()
        if (!cancelled && data.success) setPlans(data.data)
      } catch (err) {
        console.error('Failed to fetch plans:', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const executeRTH = async () => {
    try {
      await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rth' }),
      })
      fetchPlans()
    } catch (err) {
      console.error('RTH failed:', err)
    }
  }

  const createMappingPlan = async () => {
    if (!mappingName || !mappingCoords) return
    try {
      const coords = mappingCoords.split('\n').map(line => {
        const [lat, lng] = line.split(',').map(Number)
        return { lat, lng }
      }).filter(c => !isNaN(c.lat) && !isNaN(c.lng))

      if (coords.length < 3) return

      await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'field-mapping',
          name: mappingName,
          areaPolygon: coords,
          altitude: 50,
          overlapFront: 75,
          overlapSide: 65,
          speed: 5,
        }),
      })
      setMappingName('')
      setMappingCoords('')
      fetchPlans()
    } catch (err) {
      console.error('Field mapping failed:', err)
    }
  }

  const createDeliveryPlan = async () => {
    if (!deliveryName || !pickupLat || !dropLat) return
    try {
      await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delivery',
          name: deliveryName,
          task: {
            pickupPoint: { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng), alt: 0 },
            dropPoint: { lat: parseFloat(dropLat), lng: parseFloat(dropLng), alt: 0 },
            payloadWeight: 0.5,
            dropCommand: 'servo',
          },
        }),
      })
      setDeliveryName('')
      fetchPlans()
    } catch (err) {
      console.error('Delivery plan failed:', err)
    }
  }

  const activatePlan = async (planId: string) => {
    try {
      await fetch(`/api/navigation/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      })
      fetchPlans()
    } catch (err) {
      console.error('Activate plan failed:', err)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Navigation</h2>
          <p className="text-sm text-slate-400 mt-1">GPS, Autopilot, Return-to-Home, Field Mapping, Delivery</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={executeRTH}>
          <Home className="w-4 h-4 mr-2" />
          RTH Emergency
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Autopilot', icon: Navigation, color: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
          { label: 'Field Map', icon: Map, color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
          { label: 'Delivery', icon: Truck, color: 'bg-purple-500/20 border-purple-500/30 text-purple-400' },
          { label: 'Survey', icon: Ruler, color: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
        ].map(action => (
          <Card key={action.label} className={`${action.color} border cursor-pointer hover:opacity-80 transition-opacity`}>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <action.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{action.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Field Mapping Creator */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Map className="w-4 h-4 text-teal-400" />
            Pemetaan Sawah / Area
          </CardTitle>
          <CardDescription>Buat plan mapping untuk memetakan sawah, kebun, atau area dari atas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Nama misi (contoh: Pemetaan Sawah Pak Ahmad)"
            value={mappingName}
            onChange={(e) => setMappingName(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Koordinat area (lat, lng per baris)</label>
            <textarea
              placeholder={"4.9125, 97.1347\n4.9135, 97.1347\n4.9135, 97.1357\n4.9125, 97.1357"}
              value={mappingCoords}
              onChange={(e) => setMappingCoords(e.target.value)}
              className="w-full h-24 bg-slate-800 border border-slate-700 text-white text-xs rounded-md p-2 font-mono"
            />
          </div>
          <Button onClick={createMappingPlan} disabled={!mappingName || !mappingCoords}
            className="bg-teal-600 hover:bg-teal-700 w-full">
            <Map className="w-4 h-4 mr-2" />
            Buat Plan Mapping
          </Button>
        </CardContent>
      </Card>

      {/* Delivery Creator */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-teal-400" />
            Pengiriman / Drop Material
          </CardTitle>
          <CardDescription>Kirim pupuk, benih, atau material ke titik tujuan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Nama misi pengiriman"
            value={deliveryName}
            onChange={(e) => setDeliveryName(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Pickup Lat</label>
              <Input placeholder="4.9125" value={pickupLat} onChange={(e) => setPickupLat(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Pickup Lng</label>
              <Input placeholder="97.1347" value={pickupLng} onChange={(e) => setPickupLng(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Drop Lat</label>
              <Input placeholder="4.9145" value={dropLat} onChange={(e) => setDropLat(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Drop Lng</label>
              <Input placeholder="97.1367" value={dropLng} onChange={(e) => setDropLng(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs" />
            </div>
          </div>
          <Button onClick={createDeliveryPlan} disabled={!deliveryName}
            className="bg-teal-600 hover:bg-teal-700 w-full">
            <Truck className="w-4 h-4 mr-2" />
            Buat Plan Delivery
          </Button>
        </CardContent>
      </Card>

      {/* Navigation Plans List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Navigation Plans</h3>
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-white">{plan.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_LABELS[plan.type] || plan.type}
                      </Badge>
                      <span className="text-[10px] text-slate-500">
                        {plan.waypoints.length} waypoints
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[plan.status] || 'bg-slate-500'}`} />
                    <span className="text-xs text-slate-400">{plan.status}</span>
                  </div>
                </div>
                {plan.status === 'idle' && (
                  <Button size="sm" onClick={() => activatePlan(plan.id)} className="mt-2 bg-teal-600 hover:bg-teal-700">
                    <Play className="w-3 h-3 mr-1" />
                    Activate
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Belum ada navigation plan</p>
          )}
        </div>
      </div>
    </div>
  )
}
