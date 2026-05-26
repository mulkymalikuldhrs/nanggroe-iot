'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Heart,
  Database,
  Cpu,
  Bot,
  Activity,
  Battery,
  Signal,
  Wrench,
  AlertTriangle,
  Map,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ---- Types ----
interface HealthCheck {
  database: { status: string; latency: number; message: string }
  hardware: { status: string; totalDevices: number; activeDevices: number; errorDevices: number; issues: string[] }
  agents: { status: string; hermes: boolean; picoclaw: boolean; message: string }
  telemetry: { status: string; lastUpdate: string | null; age: number; message: string }
  battery: { status: string; voltage: number | null; percentage: number | null; message: string }
  signal: { status: string; strength: number | null; message: string }
  calibration: { status: string; pending: number; completed: number; failed: number; message: string }
  alerts: { status: string; unresolvedCritical: number; unresolvedWarning: number; message: string }
  missions: { status: string; activeCount: number; stuckCount: number; message: string }
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  checks: HealthCheck
  recommendations: string[]
}

// ---- Status helpers ----
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  healthy: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: CheckCircle2 },
  degraded: { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: AlertCircle },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: AlertCircle },
  critical: { color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30', icon: XCircle },
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.warning
}

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status)
  const Icon = cfg.icon
  const label = status === 'healthy' ? 'Healthy' : status === 'degraded' ? 'Degraded' : status === 'warning' ? 'Warning' : status === 'critical' ? 'Critical' : status

  return (
    <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-[10px] flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  )
}

// ---- Check card config ----
interface CheckCardConfig {
  key: keyof HealthCheck
  title: string
  icon: typeof Database
  getDetails: (check: HealthCheck[keyof HealthCheck]) => React.ReactNode
}

const CHECK_CARDS: CheckCardConfig[] = [
  {
    key: 'database',
    title: 'Database',
    icon: Database,
    getDetails: (check) => {
      const c = check as HealthCheck['database']
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Latency</span>
            <span className={`font-mono ${c.latency < 100 ? 'text-emerald-400' : c.latency < 500 ? 'text-amber-400' : 'text-rose-400'}`}>{c.latency}ms</span>
          </div>
          <Progress value={Math.max(0, 100 - c.latency)} className="h-1 bg-white/5 [&>div]:bg-emerald-500" />
        </div>
      )
    },
  },
  {
    key: 'hardware',
    title: 'Hardware',
    icon: Cpu,
    getDetails: (check) => {
      const c = check as HealthCheck['hardware']
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Devices</span>
            <span className="text-slate-300 font-mono">{c.activeDevices}/{c.totalDevices} active</span>
          </div>
          {c.errorDevices > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Errors</span>
              <span className="text-rose-400 font-mono">{c.errorDevices}</span>
            </div>
          )}
          {c.issues.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {c.issues.map((issue, i) => (
                <p key={i} className="text-[9px] text-amber-400/80 leading-tight">• {issue}</p>
              ))}
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: 'agents',
    title: 'AI Agents',
    icon: Bot,
    getDetails: (check) => {
      const c = check as HealthCheck['agents']
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Hermes</span>
            <span className={c.hermes ? 'text-emerald-400' : 'text-rose-400'}>{c.hermes ? '● Online' : '○ Offline'}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">PicoClaw</span>
            <span className={c.picoclaw ? 'text-emerald-400' : 'text-rose-400'}>{c.picoclaw ? '● Online' : '○ Offline'}</span>
          </div>
        </div>
      )
    },
  },
  {
    key: 'telemetry',
    title: 'Telemetry',
    icon: Activity,
    getDetails: (check) => {
      const c = check as HealthCheck['telemetry']
      return (
        <div className="space-y-1.5">
          {c.lastUpdate ? (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Last Update</span>
              <span className="text-slate-300 font-mono">{new Date(c.lastUpdate).toLocaleTimeString()}</span>
            </div>
          ) : null}
          {c.age >= 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Age</span>
              <span className={`font-mono ${c.age < 10 ? 'text-emerald-400' : c.age < 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                {c.age < 60 ? `${c.age}s` : `${Math.floor(c.age / 60)}m ${c.age % 60}s`}
              </span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: 'battery',
    title: 'Battery',
    icon: Battery,
    getDetails: (check) => {
      const c = check as HealthCheck['battery']
      return (
        <div className="space-y-1.5">
          {c.voltage !== null && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Voltage</span>
              <span className={`font-mono ${c.status === 'healthy' ? 'text-emerald-400' : c.status === 'degraded' ? 'text-amber-400' : 'text-rose-400'}`}>
                {c.voltage.toFixed(1)}V
              </span>
            </div>
          )}
          {c.percentage !== null && (
            <Progress value={c.percentage} className="h-1.5 bg-white/5 [&>div]:bg-emerald-500" />
          )}
        </div>
      )
    },
  },
  {
    key: 'signal',
    title: 'Signal',
    icon: Signal,
    getDetails: (check) => {
      const c = check as HealthCheck['signal']
      return (
        <div className="space-y-1.5">
          {c.strength !== null && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Strength</span>
              <span className={`font-mono ${c.status === 'healthy' ? 'text-emerald-400' : c.status === 'degraded' ? 'text-amber-400' : 'text-rose-400'}`}>
                {c.strength} dBm
              </span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: 'calibration',
    title: 'Calibration',
    icon: Wrench,
    getDetails: (check) => {
      const c = check as HealthCheck['calibration']
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Pending</span>
            <span className={c.pending > 0 ? 'text-amber-400 font-mono' : 'text-slate-300 font-mono'}>{c.pending}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Completed</span>
            <span className="text-emerald-400 font-mono">{c.completed}</span>
          </div>
          {c.failed > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Failed</span>
              <span className="text-rose-400 font-mono">{c.failed}</span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: 'alerts',
    title: 'Alerts',
    icon: AlertTriangle,
    getDetails: (check) => {
      const c = check as HealthCheck['alerts']
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Critical</span>
            <span className={c.unresolvedCritical > 0 ? 'text-rose-400 font-mono' : 'text-slate-300 font-mono'}>{c.unresolvedCritical}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Warning</span>
            <span className={c.unresolvedWarning > 0 ? 'text-amber-400 font-mono' : 'text-slate-300 font-mono'}>{c.unresolvedWarning}</span>
          </div>
        </div>
      )
    },
  },
  {
    key: 'missions',
    title: 'Missions',
    icon: Map,
    getDetails: (check) => {
      const c = check as HealthCheck['missions']
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Active</span>
            <span className="text-slate-300 font-mono">{c.activeCount}</span>
          </div>
          {c.stuckCount > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Stuck</span>
              <span className="text-rose-400 font-mono">{c.stuckCount}</span>
            </div>
          )}
        </div>
      )
    },
  },
]

export function DoctorTab() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [expandedCard, setExpandedCard] = useState<keyof HealthCheck | null>(null)
  const { toast } = useToast()

  const runDiagnostics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/doctor')
      const json = await res.json()
      if (json.success) {
        setReport(json.data)
      }
    } catch (err) {
      toast.error('Failed to run diagnostics: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
    setLoading(false)
  }, [])

  // Initial diagnostics run
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/doctor')
        const json = await res.json()
        if (!cancelled && json.success) {
          setReport(json.data)
        }
      } catch (err) {
        toast.error('Failed to run diagnostics: ' + (err instanceof Error ? err.message : 'Unknown error'))
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(runDiagnostics, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, runDiagnostics])

  const toggleExpand = (key: keyof HealthCheck) => {
    setExpandedCard(expandedCard === key ? null : key)
  }

  const overallCfg = report ? getStatusConfig(report.status) : null

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header with controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running...' : 'Run Diagnostics'}
          </Button>
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="data-[state=checked]:bg-teal-600"
            />
            <span className="text-xs text-slate-400">Auto-refresh (10s)</span>
          </div>
        </div>
        {report && (
          <span className="text-[10px] text-slate-500 font-mono">
            Last check: {new Date(report.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Overall Status */}
      {report && overallCfg && (
        <Card className={`bg-slate-900 border ${overallCfg.border}`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl ${overallCfg.bg} border ${overallCfg.border} flex items-center justify-center`}>
                <Heart className={`w-8 h-8 ${overallCfg.color}`} />
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h3 className="text-lg font-bold text-white">System Health</h3>
                  <StatusBadge status={report.status} />
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {report.status === 'healthy' && 'All systems operational — ready for flight operations'}
                  {report.status === 'degraded' && 'Some systems require attention — review recommendations below'}
                  {report.status === 'critical' && 'Critical issues detected — do NOT fly until resolved'}
                </p>
              </div>
              <div className="sm:ml-auto flex items-center gap-4">
                {Object.entries(report.checks).reduce((acc, [, check]) => {
                  const s = check.status
                  acc[s] = (acc[s] || 0) + 1
                  return acc
                }, {} as Record<string, number>) && (
                  <div className="flex items-center gap-3">
                    {Object.entries(
                      Object.entries(report.checks).reduce((acc, [, check]) => {
                        acc[check.status] = (acc[check.status] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                    ).map(([status, count]) => {
                      const cfg = getStatusConfig(status)
                      return (
                        <div key={status} className="flex items-center gap-1.5 text-xs">
                          <div className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                          <span className={cfg.color}>{count}</span>
                          <span className="text-slate-500 capitalize">{status}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && !report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-900 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      )}

      {/* Check Cards Grid */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHECK_CARDS.map((cardConfig) => {
            const checkData = report.checks[cardConfig.key]
            const cfg = getStatusConfig(checkData.status)
            const Icon = cardConfig.icon
            const isExpanded = expandedCard === cardConfig.key

            return (
              <Card
                key={cardConfig.key}
                className={`bg-slate-900 border ${cfg.border} hover:border-white/10 transition-colors`}
              >
                <CardContent className="p-4">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <span className="text-sm font-medium text-white">{cardConfig.title}</span>
                    </div>
                    <StatusBadge status={checkData.status} />
                  </div>

                  {/* Message */}
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    {'message' in checkData ? checkData.message : ''}
                  </p>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(cardConfig.key)}
                    className="flex items-center gap-1 text-[10px] text-teal-400/70 hover:text-teal-400 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? 'Less' : 'Details'}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      {cardConfig.getDetails(checkData)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Recommendations */}
      {report && report.recommendations.length > 0 && (
        <Card className="bg-slate-900 border-white/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-sm text-slate-200">Recommendations</CardTitle>
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 border text-[9px]">
                {report.recommendations.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {report.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 bg-slate-800/50 rounded-lg border border-white/5"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] text-amber-400 font-bold">{i + 1}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !report && (
        <Card className="bg-slate-900 border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Heart className="w-12 h-12 mb-3 text-slate-600" />
            <p className="text-sm">No diagnostics data yet</p>
            <p className="text-xs text-slate-600 mt-1">Click &quot;Run Diagnostics&quot; to check system health</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
