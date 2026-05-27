'use client'

import { useEffect, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Map,
  Mountain,
  Plus,
  Play,
  Pause,
  Square,
  XCircle,
  Eye,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Plane,
  Search,
  Sprout,
  Shield,
  Truck,
  Layers,
} from 'lucide-react'
import { MISSION_TYPE_LABELS, MISSION_STATUS_LABELS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Mission {
  id: string
  name: string
  description?: string | null
  type: string
  status: string
  prompt?: string | null
  altitude: number
  speed: number
  createdAt: string
  updatedAt: string
  startedAt?: string | null
  completedAt?: string | null
}

interface MissionDetail {
  id: string
  name: string
  description?: string | null
  type: string
  status: string
  prompt?: string | null
  altitude: number
  speed: number
  overlapFront: number
  overlapSide: number
  waypoints: Array<{ lat: number; lng: number; alt: number; action: string }>
  logs: Array<{ id: string; level: string; source: string; message: string; timestamp: string }>
  agentMessages: Array<{ id: string; agent: string; role: string; content: string; timestamp: string }>
  createdAt: string
  updatedAt: string
}

const TYPE_ICONS: Record<string, typeof Map> = {
  mapping: Layers,
  survey: Search,
  delivery: Truck,
  patrol: Shield,
  inspection: Plane,
  agriculture: Sprout,
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  planned: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failed: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  aborted: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

const LOG_COLORS: Record<string, string> = {
  debug: 'text-slate-400',
  info: 'text-teal-400',
  warning: 'text-amber-400',
  error: 'text-rose-400',
  critical: 'text-rose-400',
}

export function MissionsTab() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedMission, setSelectedMission] = useState<MissionDetail | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [abortMissionId, setAbortMissionId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const { toast } = useToast()

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('mapping')
  const [formPrompt, setFormPrompt] = useState('')
  const [formAltitude, setFormAltitude] = useState('50')
  const [formSpeed, setFormSpeed] = useState('5')
  const [formDescription, setFormDescription] = useState('')

  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const url = statusFilter !== 'all' ? `/api/missions?status=${statusFilter}` : '/api/missions'
        const res = await fetch(url)
        const json = await res.json()
        if (mounted && json.success) setMissions(json.data.missions)
      } catch (err) {
        toast.error('Failed to load missions: ' + (err instanceof Error ? err.message : 'Unknown error'))
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [refreshKey, statusFilter])

  const handleCreate = async () => {
    if (!formName.trim()) return
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          type: formType,
          prompt: formPrompt || undefined,
          description: formDescription || undefined,
          altitude: parseFloat(formAltitude) || 50,
          speed: parseFloat(formSpeed) || 5,
        }),
      })
      if (res.ok) {
        setCreateOpen(false)
        setFormName('')
        setFormPrompt('')
        setFormDescription('')
        setFormAltitude('50')
        setFormSpeed('5')
        refresh()
      }
    } catch (err) {
      toast.error('Failed to create mission: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleAction = async (missionId: string, action: string) => {
    setActionLoading(missionId)
    try {
      await fetch('/api/missions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId, action }),
      })
      refresh()
      if (selectedMission?.id === missionId) {
        fetchMissionDetail(missionId)
      }
    } catch (err) {
      toast.error('Failed to update mission: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
    setActionLoading(null)
  }

  const fetchMissionDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/missions/${id}`)
      const json = await res.json()
      if (json.success) {
        setSelectedMission(json.data)
        setDetailOpen(true)
      }
    } catch (err) {
      toast.error('Failed to load mission detail: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const getMissionActions = (status: string) => {
    switch (status) {
      case 'draft':
      case 'planned':
        return [{ action: 'start', label: 'Start', icon: Play, color: 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10' }]
      case 'active':
        return [
          { action: 'pause', label: 'Pause', icon: Pause, color: 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10' },
          { action: 'stop', label: 'Stop', icon: Square, color: 'text-slate-400 border-slate-500/30 hover:bg-slate-500/10' },
          { action: 'abort', label: 'Abort', icon: XCircle, color: 'text-rose-400 border-rose-500/30 hover:bg-rose-500/10' },
        ]
      case 'paused':
        return [
          { action: 'resume', label: 'Resume', icon: Play, color: 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10' },
          { action: 'abort', label: 'Abort', icon: XCircle, color: 'text-rose-400 border-rose-500/30 hover:bg-rose-500/10' },
        ]
      default:
        return []
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 bg-slate-900 border-white/10 text-xs">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="aborted">Aborted</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-500">{missions.length} missions</span>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          data-testid="new-mission-btn"
          className="bg-teal-600 hover:bg-teal-700 text-white h-8"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Mission
        </Button>
      </div>

      {/* Mission Grid */}
      {missions.length === 0 ? (
        <Card className="bg-slate-900 border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Map className="w-10 h-10 mb-3 text-slate-600" />
            <p className="text-sm">No missions found</p>
            <p className="text-xs text-slate-600 mt-1">Create a new mission to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.map((mission) => {
            const TypeIcon = TYPE_ICONS[mission.type] || Map
            const actions = getMissionActions(mission.status)
            return (
              <Card key={mission.id} aria-label={`Mission: ${mission.name} - ${mission.status}`} className="bg-slate-900 border-white/5 hover:border-white/10 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                        <TypeIcon className="w-4 h-4 text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{mission.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {MISSION_TYPE_LABELS[mission.type] || mission.type}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${STATUS_COLORS[mission.status] || STATUS_COLORS.draft} border text-[10px]`}>
                      {MISSION_STATUS_LABELS[mission.status] || mission.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3 h-3" />
                      {mission.altitude}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {mission.speed}m/s
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(mission.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {actions.map((a) => {
                      if (a.action === 'abort') {
                        return (
                          <AlertDialog key={a.action} open={abortMissionId === mission.id} onOpenChange={(open) => !open && setAbortMissionId(null)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`h-7 text-[10px] border ${a.color}`}
                              onClick={() => setAbortMissionId(mission.id)}
                              disabled={actionLoading === mission.id}
                            >
                              <a.icon className="w-3 h-3 mr-1" />
                              {a.label}
                            </Button>
                            <AlertDialogContent role="dialog" aria-describedby="abort-description" className="bg-slate-900 border-slate-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Abort Mission</AlertDialogTitle>
                                <AlertDialogDescription id="abort-description" className="text-slate-400">
                                  Are you sure you want to abort &quot;{mission.name}&quot;? This will immediately stop the mission and mark it as aborted. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { setAbortMissionId(null); handleAction(mission.id, 'abort') }} className="bg-rose-600 hover:bg-rose-700 text-white">
                                  Abort Mission
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )
                      }
                      return (
                        <Button
                          key={a.action}
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(mission.id, a.action)}
                          disabled={actionLoading === mission.id}
                          className={`h-7 text-[10px] border ${a.color}`}
                        >
                          <a.icon className="w-3 h-3 mr-1" />
                          {a.label}
                        </Button>
                      )
                    })}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => fetchMissionDetail(mission.id)}
                      className="h-7 text-[10px] text-slate-400 hover:text-white ml-auto"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Detail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Mission Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="create-mission-dialog" className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Create Mission</DialogTitle>
            <DialogDescription className="text-slate-400">
              Plan a new drone operation for Aceh Utara region
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Mission Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Pemetaan Lhoksukon Barat"
                className="bg-slate-800 border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="bg-slate-800 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {Object.entries(MISSION_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Description</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description"
                  className="bg-slate-800 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Altitude (m)</Label>
                <Input
                  type="number"
                  value={formAltitude}
                  onChange={(e) => setFormAltitude(e.target.value)}
                  className="bg-slate-800 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Speed (m/s)</Label>
                <Input
                  type="number"
                  value={formSpeed}
                  onChange={(e) => setFormSpeed(e.target.value)}
                  className="bg-slate-800 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Mission Prompt (Natural Language)</Label>
              <Textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="e.g. Peta area persawahan di Lhoksukon, ketinggian 80m, overlap 75/65"
                rows={3}
                className="bg-slate-800 border-white/10 text-white resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-white/10 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formName.trim()} className="bg-teal-600 hover:bg-teal-700 text-white">
              Create Mission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mission Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedMission?.name || 'Mission Detail'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedMission ? `${MISSION_TYPE_LABELS[selectedMission.type] || selectedMission.type} — ${MISSION_STATUS_LABELS[selectedMission.status] || selectedMission.status}` : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedMission && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-slate-800/50 rounded-lg border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase">Altitude</p>
                    <p className="text-sm font-mono text-teal-400">{selectedMission.altitude}m</p>
                  </div>
                  <div className="p-2.5 bg-slate-800/50 rounded-lg border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase">Speed</p>
                    <p className="text-sm font-mono text-teal-400">{selectedMission.speed}m/s</p>
                  </div>
                  <div className="p-2.5 bg-slate-800/50 rounded-lg border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase">Overlap F/S</p>
                    <p className="text-sm font-mono text-teal-400">{selectedMission.overlapFront}/{selectedMission.overlapSide}%</p>
                  </div>
                  <div className="p-2.5 bg-slate-800/50 rounded-lg border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase">Waypoints</p>
                    <p className="text-sm font-mono text-teal-400">{selectedMission.waypoints.length}</p>
                  </div>
                </div>

                {/* Waypoints */}
                {selectedMission.waypoints.length > 0 && (
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Waypoints</h4>
                    <div className="space-y-1.5">
                      {selectedMission.waypoints.map((wp, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-white/5 text-xs">
                          <MapPin className="w-3 h-3 text-teal-400" />
                          <span className="text-slate-300 font-mono">{wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}</span>
                          <span className="text-slate-500">{wp.alt}m</span>
                          <Badge variant="outline" className="text-[9px] border-white/10 text-slate-400 ml-auto">{wp.action}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Logs */}
                {selectedMission.logs.length > 0 && (
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Mission Logs</h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {selectedMission.logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded border border-white/5">
                          <ChevronRight className={`w-3 h-3 mt-0.5 ${LOG_COLORS[log.level] || 'text-slate-400'}`} />
                          <div className="min-w-0">
                            <p className={`text-xs ${LOG_COLORS[log.level] || 'text-slate-300'}`}>{log.message}</p>
                            <p className="text-[9px] text-slate-600 font-mono">{new Date(log.timestamp).toLocaleTimeString()} · {log.source}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Messages */}
                {selectedMission.agentMessages.length > 0 && (
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Agent Messages</h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {selectedMission.agentMessages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded border border-white/5">
                          <div className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center shrink-0 ${
                            msg.agent === 'hermes' ? 'bg-teal-500/20 text-teal-400' :
                            msg.agent === 'picoclaw' ? 'bg-amber-500/20 text-amber-400' :
                            msg.agent === 'operator' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {msg.agent.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-300">{msg.content}</p>
                            <p className="text-[9px] text-slate-600 font-mono">{new Date(msg.timestamp).toLocaleTimeString()} · {msg.agent} · {msg.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


