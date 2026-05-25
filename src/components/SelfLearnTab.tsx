'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, AlertCircle, Lightbulb, BarChart3, FileText,
  ArrowRightLeft, Activity, Zap, Shield, Battery, Cpu,
} from 'lucide-react'
import { toast } from 'sonner'

// ---- Types ----
interface PatternDetection {
  metric: string
  patternType: string
  description: string
  confidence: number
  dataPoints: number
  firstSeen: string
  lastSeen: string
  severity: 'info' | 'warning' | 'critical'
  recommendation?: string
}

interface DecisionRecord {
  id: string
  agentName: string
  decisionType: string
  context: string
  action: string
  expectedOutcome: string
  actualOutcome?: string
  outcomeSuccess?: boolean
  confidence: number
  timestamp: string
  reviewedAt?: string
}

interface PerformanceMetrics {
  missionSuccessRate: number
  missionTotal: number
  missionCompleted: number
  missionFailed: number
  avgBatteryEfficiency: number
  avgFlightTime: number
  avgDistancePerMission: number
  safetyIncidentCount: number
  lastCalculated: string
}

interface AdaptiveParameter {
  key: string
  currentValue: number
  suggestedValue: number
  confidence: number
  reason: string
  category: 'pid' | 'flight' | 'safety' | 'navigation' | 'power'
  lastAdjusted: string
}

interface LearningReport {
  generatedAt: string
  periodStart: string
  periodEnd: string
  summary: string
  patternsDetected: number
  decisionsRecorded: number
  decisionsReviewed: number
  performanceChange: 'improved' | 'stable' | 'degraded'
  topPatterns: PatternDetection[]
  parameterSuggestions: AdaptiveParameter[]
  insights: string[]
  recommendations: string[]
}

interface LearningStats {
  patternsCached: number
  decisionsCached: number
  suggestionsCached: number
  performanceCached: boolean
  lastAnalysis: string
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const PATTERN_TYPE_LABELS: Record<string, string> = {
  anomaly: 'Anomaly',
  trend: 'Trend',
  cyclic: 'Cyclic',
  threshold_approach: 'Threshold',
  normal: 'Normal',
}

const PARAM_CATEGORY_ICONS: Record<string, typeof Cpu> = {
  pid: Cpu,
  flight: Activity,
  safety: Shield,
  navigation: Brain,
  power: Battery,
}

export function SelfLearnTab() {
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [patterns, setPatterns] = useState<PatternDetection[]>([])
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [suggestions, setSuggestions] = useState<AdaptiveParameter[]>([])
  const [report, setReport] = useState<LearningReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [applyingSuggestion, setApplyingSuggestion] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Knowledge transfer form
  const [sourceProjectId, setSourceProjectId] = useState('')
  const [targetProjectId, setTargetProjectId] = useState('')
  const [transferCategory, setTransferCategory] = useState('telemetry_pattern')
  const [transferring, setTransferring] = useState(false)

  const fetchAllData = useCallback(async () => {
    try {
      setError(null)
      const [statusRes, patternsRes, perfRes, suggestionsRes] = await Promise.all([
        fetch('/api/self-learn?action=status'),
        fetch('/api/self-learn?action=patterns'),
        fetch('/api/self-learn?action=performance'),
        fetch('/api/self-learn?action=suggestions'),
      ])

      const statusData = await statusRes.json()
      const patternsData = await patternsRes.json()
      const perfData = await perfRes.json()
      const suggestionsData = await suggestionsRes.json()

      if (statusData.success) setStats(statusData.data)
      if (patternsData.success) setPatterns(patternsData.data.patterns || [])
      if (perfData.success) setPerformance(perfData.data)
      if (suggestionsData.success) setSuggestions(suggestionsData.data.suggestions || [])
    } catch (err) {
      console.error('Failed to fetch self-learn data:', err)
      setError('Gagal memuat data self-learning. Periksa koneksi server.')
      toast.error('Gagal memuat data self-learning')
    }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        setError(null)
        const [statusRes, patternsRes, perfRes, suggestionsRes] = await Promise.all([
          fetch('/api/self-learn?action=status'),
          fetch('/api/self-learn?action=patterns'),
          fetch('/api/self-learn?action=performance'),
          fetch('/api/self-learn?action=suggestions'),
        ])

        const statusData = await statusRes.json()
        const patternsData = await patternsRes.json()
        const perfData = await perfRes.json()
        const suggestionsData = await suggestionsRes.json()

        if (active) {
          if (statusData.success) setStats(statusData.data)
          if (patternsData.success) setPatterns(patternsData.data.patterns || [])
          if (perfData.success) setPerformance(perfData.data)
          if (suggestionsData.success) setSuggestions(suggestionsData.data.suggestions || [])
        }
      } catch (err) {
        console.error('Failed to fetch self-learn data:', err)
        if (active) {
          setError('Gagal memuat data self-learning. Periksa koneksi server.')
          toast.error('Gagal memuat data self-learning')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/self-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', hours: 24 }),
      })
      const data = await res.json()
      if (data.success) {
        setPatterns(data.data.patterns || [])
        toast.success(`Analisis selesai: ${data.data.patterns?.length || 0} pola terdeteksi`)
      } else {
        toast.error(data.error || 'Analisis gagal')
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      toast.error('Analisis gagal')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    try {
      const res = await fetch('/api/self-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_report', periodHours: 168 }),
      })
      const data = await res.json()
      if (data.success) {
        setReport(data.data)
        toast.success('Laporan learning berhasil dibuat')
      } else {
        toast.error(data.error || 'Gagal membuat laporan')
      }
    } catch (err) {
      console.error('Report generation failed:', err)
      toast.error('Gagal membuat laporan')
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleApplySuggestion = async (suggestion: AdaptiveParameter) => {
    setApplyingSuggestion(suggestion.key)
    try {
      const res = await fetch('/api/self-learn', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_suggestion',
          key: suggestion.key,
          newValue: suggestion.suggestedValue,
          reason: suggestion.reason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Parameter "${suggestion.key}" berhasil di-update ke ${suggestion.suggestedValue}`)
        fetchAllData()
      } else {
        toast.error(data.error || 'Gagal menerapkan saran')
      }
    } catch (err) {
      console.error('Apply suggestion failed:', err)
      toast.error('Gagal menerapkan saran')
    } finally {
      setApplyingSuggestion(null)
    }
  }

  const handleTransferKnowledge = async () => {
    if (!sourceProjectId || !targetProjectId || !transferCategory) {
      toast.error('Semua field harus diisi')
      return
    }
    setTransferring(true)
    try {
      const res = await fetch('/api/self-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer_knowledge',
          sourceProjectId,
          targetProjectId,
          category: transferCategory,
          knowledge: [{ key: `${transferCategory}:general`, value: { auto: true }, confidence: 0.7, context: 'Auto-transferred from dashboard' }],
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Knowledge berhasil ditransfer: ${data.data.transferred} item`)
        setSourceProjectId('')
        setTargetProjectId('')
      } else {
        toast.error(data.error || 'Gagal transfer knowledge')
      }
    } catch (err) {
      console.error('Knowledge transfer failed:', err)
      toast.error('Gagal transfer knowledge')
    } finally {
      setTransferring(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Self-Learning</h2>
          <p className="text-sm text-slate-400 mt-1">AI yang belajar dari pengalaman dan meningkatkan performa robot</p>
        </div>
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAllData} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Self-Learning</h2>
          <p className="text-sm text-slate-400 mt-1">AI yang belajar dari pengalaman dan meningkatkan performa robot</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing} className="border-slate-700 text-slate-400">
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            Analyze
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAllData} className="border-slate-700 text-slate-400">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Learning Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <Brain className="w-5 h-5 text-teal-400 mb-1" />
            <span className="text-xl font-bold text-white">{stats?.patternsCached ?? 0}</span>
            <span className="text-[10px] text-slate-400">Patterns</span>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-xl font-bold text-white">{stats?.decisionsCached ?? 0}</span>
            <span className="text-[10px] text-slate-400">Decisions</span>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <BarChart3 className="w-5 h-5 text-yellow-400 mb-1" />
            <span className="text-xl font-bold text-white">{performance?.missionSuccessRate ?? 0}%</span>
            <span className="text-[10px] text-slate-400">Success Rate</span>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <Zap className="w-5 h-5 text-purple-400 mb-1" />
            <span className="text-xl font-bold text-white">{stats?.suggestionsCached ?? 0}</span>
            <span className="text-[10px] text-slate-400">Auto-Tuned</span>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {performance && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              Performance Metrics
            </CardTitle>
            <CardDescription className="text-[10px]">
              Last calculated: {new Date(performance.lastCalculated).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{performance.missionSuccessRate}%</p>
                <Progress value={performance.missionSuccessRate} className="h-1.5 mt-1 mb-1" />
                <p className="text-[10px] text-slate-400">Mission Success</p>
                <p className="text-[9px] text-slate-500">{performance.missionCompleted}/{performance.missionTotal} completed</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{performance.avgBatteryEfficiency}%</p>
                <Progress value={performance.avgBatteryEfficiency} className="h-1.5 mt-1 mb-1" />
                <p className="text-[10px] text-slate-400">Battery Efficiency</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{performance.avgFlightTime}m</p>
                <p className="text-[10px] text-slate-400 mt-2">Avg Flight Time</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${performance.safetyIncidentCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {performance.safetyIncidentCount}
                </p>
                <p className="text-[10px] text-slate-400 mt-2">Safety Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Detection */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            Detected Patterns
          </CardTitle>
          <CardDescription>Polap perilaku yang terdeteksi dari data telemetry</CardDescription>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Belum ada pola terdeteksi. Klik &quot;Analyze&quot; untuk memulai analisis.</p>
          ) : (
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {patterns.map((pattern, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={SEVERITY_COLORS[pattern.severity] || ''}>
                          {pattern.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                          {PATTERN_TYPE_LABELS[pattern.patternType] || pattern.patternType}
                        </Badge>
                        <span className="text-[10px] text-slate-500">{pattern.metric}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{Math.round(pattern.confidence * 100)}% conf</span>
                    </div>
                    <p className="text-xs text-slate-300">{pattern.description}</p>
                    {pattern.recommendation && (
                      <p className="text-[10px] text-teal-400 mt-1">💡 {pattern.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            AI Suggestions
          </CardTitle>
          <CardDescription>Saran perbaikan parameter berdasarkan analisis AI</CardDescription>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Belum ada saran AI tersedia.</p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                const CategoryIcon = PARAM_CATEGORY_ICONS[suggestion.category] || Cpu
                return (
                  <div key={suggestion.key} className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CategoryIcon className="w-4 h-4 text-teal-400" />
                          <span className="text-xs font-medium text-white">{suggestion.key}</span>
                          <Badge variant="outline" className="text-[9px] border-slate-600 text-slate-400">
                            {suggestion.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-1">{suggestion.reason}</p>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-slate-500">Current: <span className="text-red-400">{suggestion.currentValue}</span></span>
                          <span className="text-slate-600">→</span>
                          <span className="text-slate-500">Suggested: <span className="text-emerald-400">{suggestion.suggestedValue}</span></span>
                          <span className="text-slate-600">({Math.round(suggestion.confidence * 100)}% conf)</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 h-7 text-[10px]"
                        onClick={() => handleApplySuggestion(suggestion)}
                        disabled={applyingSuggestion === suggestion.key}
                      >
                        {applyingSuggestion === suggestion.key ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3 mr-1" />
                        )}
                        Apply
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Report */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            Learning Report
          </CardTitle>
          <CardDescription>Generate laporan komprehensif dari proses pembelajaran AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="bg-teal-600 hover:bg-teal-700 w-full"
          >
            {generatingReport ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Learning Report (Last 7 Days)
              </>
            )}
          </Button>

          {report && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  {report.performanceChange === 'improved' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                  {report.performanceChange === 'degraded' && <TrendingDown className="w-4 h-4 text-red-400" />}
                  {report.performanceChange === 'stable' && <Minus className="w-4 h-4 text-yellow-400" />}
                  <span className="text-sm font-medium text-white">
                    Performance: {report.performanceChange.charAt(0).toUpperCase() + report.performanceChange.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-3">{report.summary}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-white">{report.patternsDetected}</p>
                    <p className="text-[10px] text-slate-400">Patterns</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{report.decisionsRecorded}</p>
                    <p className="text-[10px] text-slate-400">Decisions</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{report.decisionsReviewed}</p>
                    <p className="text-[10px] text-slate-400">Reviewed</p>
                  </div>
                </div>
              </div>

              {report.insights.length > 0 && (
                <div>
                  <p className="text-[10px] text-teal-400 uppercase tracking-wider mb-2">Insights</p>
                  <ul className="space-y-1">
                    {report.insights.map((insight, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <Lightbulb className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.recommendations.length > 0 && (
                <div>
                  <p className="text-[10px] text-teal-400 uppercase tracking-wider mb-2">Recommendations</p>
                  <ul className="space-y-1">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Transfer */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-teal-400" />
            Knowledge Transfer
          </CardTitle>
          <CardDescription>Transfer pengetahuan antar project robot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Source Project ID</label>
              <Input
                placeholder="project-source-id"
                value={sourceProjectId}
                onChange={(e) => setSourceProjectId(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Target Project ID</label>
              <Input
                placeholder="project-target-id"
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Category</label>
              <Select value={transferCategory} onValueChange={setTransferCategory}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="telemetry_pattern">Telemetry Pattern</SelectItem>
                  <SelectItem value="mission_outcome">Mission Outcome</SelectItem>
                  <SelectItem value="battery_efficiency">Battery Efficiency</SelectItem>
                  <SelectItem value="flight_performance">Flight Performance</SelectItem>
                  <SelectItem value="safety_incident">Safety Incident</SelectItem>
                  <SelectItem value="parameter_optimization">Parameter Optimization</SelectItem>
                  <SelectItem value="environmental_adaptation">Environmental Adaptation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleTransferKnowledge}
            disabled={transferring || !sourceProjectId || !targetProjectId}
            className="bg-teal-600 hover:bg-teal-700 w-full"
          >
            {transferring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transfer Knowledge
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
