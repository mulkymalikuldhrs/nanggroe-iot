'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Navigation, Home, Truck, Map,
  Play, Ruler, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mappingName, setMappingName] = useState('')
  const [mappingCoords, setMappingCoords] = useState('')
  const [deliveryName, setDeliveryName] = useState('')
  const [pickupLat, setPickupLat] = useState('')
  const [pickupLng, setPickupLng] = useState('')
  const [dropLat, setDropLat] = useState('')
  const [dropLng, setDropLng] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [rthLoading, setRthLoading] = useState(false)
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null)

  const mappingRef = useRef<HTMLDivElement>(null)
  const deliveryRef = useRef<HTMLDivElement>(null)

  const fetchPlans = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/navigation')
      const data = await res.json()
      if (data.success) setPlans(data.data)
    } catch {
      setError('Gagal memuat navigation plans. Periksa koneksi server.')
      toast.error('Gagal memuat navigation plans')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchPlans().finally(() => setLoading(false))
  }, [fetchPlans])

  const executeRTH = async () => {
    setRthLoading(true)
    try {
      const res = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rth' }),
      })
      const data = await res.json()
      if (data.simulated) {
        toast.success('⚠️ SIMULATED: Return-to-Home — no real command was sent to the drone', { duration: 8000 })
      } else if (data.success) {
        toast.success('Return-to-Home berhasil diaktifkan')
      } else {
        toast.error('RTH gagal: ' + (data.warning || data.error || 'Unknown error'))
      }
      fetchPlans()
    } catch {
      toast.error('RTH gagal diaktifkan')
    } finally {
      setRthLoading(false)
    }
  }

  const createAutopilotPlan = async () => {
    setSubmitting('autopilot')
    try {
      const res = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Autopilot Mission',
          type: 'autopilot',
          waypoints: [],
          homePosition: null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Autopilot plan berhasil dibuat')
        fetchPlans()
      } else {
        toast.error(data.error || 'Gagal membuat autopilot plan')
      }
    } catch {
      toast.error('Gagal membuat autopilot plan')
    } finally {
      setSubmitting(null)
    }
  }

  const createSurveyPlan = async () => {
    setSubmitting('survey')
    try {
      const res = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Survey Mission',
          type: 'survey',
          waypoints: [],
          homePosition: null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Survey plan berhasil dibuat')
        fetchPlans()
      } else {
        toast.error(data.error || 'Gagal membuat survey plan')
      }
    } catch {
      toast.error('Gagal membuat survey plan')
    } finally {
      setSubmitting(null)
    }
  }

  const createMappingPlan = async () => {
    if (!mappingName || !mappingCoords) return
    setSubmitting('mapping')
    try {
      const coords = mappingCoords.split('\n').map(line => {
        const [lat, lng] = line.split(',').map(Number)
        return { lat, lng }
      }).filter(c => !isNaN(c.lat) && !isNaN(c.lng))

      if (coords.length < 3) {
        toast.error('Minimal 3 koordinat diperlukan untuk area polygon')
        return
      }

      const res = await fetch('/api/navigation', {
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
      const data = await res.json()
      if (data.success) {
        toast.success('Plan mapping berhasil dibuat')
        setMappingName('')
        setMappingCoords('')
        fetchPlans()
      } else {
        toast.error(data.error || 'Gagal membuat plan mapping')
      }
    } catch {
      toast.error('Gagal membuat plan mapping')
    } finally {
      setSubmitting(null)
    }
  }

  const createDeliveryPlan = async () => {
    if (!deliveryName) {
      toast.error('Nama misi pengiriman wajib diisi')
      return
    }

    const pLat = parseFloat(pickupLat)
    const pLng = parseFloat(pickupLng)
    const dLat = parseFloat(dropLat)
    const dLng = parseFloat(dropLng)

    const isValidCoord = (lat: number, lng: number) =>
      !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

    if (!isValidCoord(pLat, pLng)) {
      toast.error('Koordinat pickup tidak valid. Latitude harus -90 s/d 90, Longitude harus -180 s/d 180')
      return
    }
    if (!isValidCoord(dLat, dLng)) {
      toast.error('Koordinat drop tidak valid. Latitude harus -90 s/d 90, Longitude harus -180 s/d 180')
      return
    }

    setSubmitting('delivery')
    try {
      const res = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delivery',
          name: deliveryName,
          task: {
            pickupPoint: { lat: pLat, lng: pLng, alt: 0 },
            dropPoint: { lat: dLat, lng: dLng, alt: 0 },
            payloadWeight: 0.5,
            dropCommand: 'servo',
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Plan delivery berhasil dibuat')
        setDeliveryName('')
        setPickupLat('')
        setPickupLng('')
        setDropLat('')
        setDropLng('')
        fetchPlans()
      } else {
        toast.error(data.error || 'Gagal membuat plan delivery')
      }
    } catch {
      toast.error('Gagal membuat plan delivery')
    } finally {
      setSubmitting(null)
    }
  }

  const activatePlan = async (planId: string) => {
    setActivatingPlanId(planId)
    try {
      await fetch(`/api/navigation/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      })
      toast.success('Plan berhasil diaktifkan')
      fetchPlans()
    } catch {
      toast.error('Gagal mengaktifkan plan')
    } finally {
      setActivatingPlanId(null)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-12 w-40" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  // Error state
  if (error && plans.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Navigation</h2>
            <p className="text-sm text-slate-400 mt-1">GPS, Autopilot, Return-to-Home, Field Mapping, Delivery</p>
          </div>
        </div>
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPlans} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Navigation</h2>
          <p className="text-sm text-slate-400 mt-1">GPS, Autopilot, Return-to-Home, Field Mapping, Delivery</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button data-testid="rth-emergency-btn" className="bg-red-600 hover:bg-red-700" disabled={rthLoading}>
              {rthLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Home className="w-4 h-4 mr-2" />}
              RTH Emergency
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent role="alertdialog" aria-describedby="rth-description" className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirm RTH Emergency</AlertDialogTitle>
              <AlertDialogDescription id="rth-description" className="text-slate-400">
                This will immediately trigger Return-to-Home. The drone will abort its current mission and navigate back to the home position. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeRTH} className="bg-red-600 hover:bg-red-700 text-white">
                Confirm RTH
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Autopilot', icon: Navigation, color: 'bg-blue-500/20 border-blue-500/30 text-blue-400', action: createAutopilotPlan, actionKey: 'autopilot' },
          { label: 'Field Map', icon: Map, color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400', action: () => mappingRef.current?.scrollIntoView({ behavior: 'smooth' }), actionKey: 'fieldmap' },
          { label: 'Delivery', icon: Truck, color: 'bg-purple-500/20 border-purple-500/30 text-purple-400', action: () => deliveryRef.current?.scrollIntoView({ behavior: 'smooth' }), actionKey: 'delivery-quick' },
          { label: 'Survey', icon: Ruler, color: 'bg-orange-500/20 border-orange-500/30 text-orange-400', action: createSurveyPlan, actionKey: 'survey' },
        ].map(action => (
          <Card
            key={action.label}
            className={`${action.color} border cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={action.action}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              {submitting === action.actionKey ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <action.icon className="w-6 h-6" />
              )}
              <span className="text-xs font-medium">{action.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Field Mapping Creator */}
      <div ref={mappingRef}>
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
              aria-label="Mapping mission name"
              aria-required="true"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Koordinat area (lat, lng per baris)</label>
              <textarea
                placeholder={"4.9125, 97.1347\n4.9135, 97.1347\n4.9135, 97.1357\n4.9125, 97.1357"}
                value={mappingCoords}
                onChange={(e) => setMappingCoords(e.target.value)}
                aria-label="GPS coordinates for mapping area"
                aria-required="true"
                className="w-full h-24 bg-slate-800 border border-slate-700 text-white text-xs rounded-md p-2 font-mono"
              />
            </div>
            <Button
              onClick={createMappingPlan}
              disabled={!mappingName || !mappingCoords || submitting === 'mapping'}
              className="bg-teal-600 hover:bg-teal-700 w-full"
            >
              {submitting === 'mapping' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <Map className="w-4 h-4 mr-2" />
                  Buat Plan Mapping
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Creator */}
      <div ref={deliveryRef}>
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
              aria-label="Delivery mission name"
              aria-required="true"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400">Pickup Lat</label>
                <Input placeholder="4.9125" value={pickupLat} onChange={(e) => setPickupLat(e.target.value)}
                  aria-label="Pickup latitude" aria-required="true"
                  className="bg-slate-800 border-slate-700 text-white text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Pickup Lng</label>
                <Input placeholder="97.1347" value={pickupLng} onChange={(e) => setPickupLng(e.target.value)}
                  aria-label="Pickup longitude" aria-required="true"
                  className="bg-slate-800 border-slate-700 text-white text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Drop Lat</label>
                <Input placeholder="4.9145" value={dropLat} onChange={(e) => setDropLat(e.target.value)}
                  aria-label="Drop latitude" aria-required="true"
                  className="bg-slate-800 border-slate-700 text-white text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Drop Lng</label>
                <Input placeholder="97.1367" value={dropLng} onChange={(e) => setDropLng(e.target.value)}
                  aria-label="Drop longitude" aria-required="true"
                  className="bg-slate-800 border-slate-700 text-white text-xs" />
              </div>
            </div>
            <Button
              onClick={createDeliveryPlan}
              disabled={!deliveryName || !pickupLat || !pickupLng || !dropLat || !dropLng || submitting === 'delivery'}
              className="bg-teal-600 hover:bg-teal-700 w-full"
            >
              {submitting === 'delivery' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Buat Plan Delivery
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Plans List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Navigation Plans</h3>
          <Button variant="outline" size="sm" onClick={fetchPlans} className="border-slate-700 text-slate-400">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
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
                  <Button
                    size="sm"
                    onClick={() => activatePlan(plan.id)}
                    disabled={activatingPlanId === plan.id}
                    className="mt-2 bg-teal-600 hover:bg-teal-700"
                  >
                    {activatingPlanId === plan.id ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 mr-1" />
                    )}
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
