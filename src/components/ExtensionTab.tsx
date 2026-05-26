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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plug,
  Loader2,
  Wifi,
  WifiOff,
  Send,
  Trash2,
  Plus,
  Key,
  Code,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hash,
  Braces,
} from 'lucide-react'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// ---- Types ----
interface ExtensionConnection {
  id: string
  name: string
  type: 'vscode' | 'jetbrains' | 'vim' | 'custom'
  apiKey: string
  connected: boolean
  connectedAt: string | null
  capabilities: string[]
}

interface ExtensionEvent {
  event: string
  data: unknown
  timestamp: string
  source: string
}

interface ExtensionData {
  connections: ExtensionConnection[]
  totalConnections: number
  connectedCount: number
  capabilities: Record<string, number>
}

interface CompletionItem {
  label: string
  kind: string
  detail: string
  documentation?: string
  insertText: string
}

interface HoverInfo {
  contents: string
  language?: string
}

// ---- Config ----
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  vscode: { label: 'VS Code', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  jetbrains: { label: 'JetBrains', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  vim: { label: 'Vim', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  custom: { label: 'Custom', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30' },
}

function maskApiKey(key: string): string {
  if (key.length <= 12) return '••••••••'
  return key.substring(0, 8) + '••••••••' + key.substring(key.length - 4)
}

function generateApiKeySuggestion(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const segments: string[] = []
  for (let s = 0; s < 4; s++) {
    let segment = ''
    for (let i = 0; i < 8; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)]
    }
    segments.push(segment)
  }
  return `nanggroe_${segments.join('_')}`
}

export function ExtensionTab() {
  const [data, setData] = useState<ExtensionData | null>(null)
  const [events, setEvents] = useState<ExtensionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [regName, setRegName] = useState('')
  const [regType, setRegType] = useState<'vscode' | 'jetbrains' | 'vim' | 'custom'>('vscode')
  const [regApiKey, setRegApiKey] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [commandConnId, setCommandConnId] = useState<string | null>(null)
  const [commandText, setCommandText] = useState('')
  const [commandLoading, setCommandLoading] = useState(false)
  const [commandResult, setCommandResult] = useState<unknown>(null)
  const [snippets, setSnippets] = useState<CompletionItem[]>([])
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [snippetsLoading, setSnippetsLoading] = useState(false)
  const [hoverLoading, setHoverLoading] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/extension')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (err) {
      toast.error('Failed to fetch extension data: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
    setLoading(false)
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/extension?action=events&limit=30')
      const json = await res.json()
      if (json.success) {
        setEvents(json.data)
      }
    } catch (err) {
      toast.error('Failed to fetch extension events: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchEvents()
  }, [data, fetchEvents])

  const handleRegister = async () => {
    if (!regName.trim()) return
    setRegLoading(true)
    setNewlyCreatedKey(null)
    try {
      const res = await fetch('/api/extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: regName.trim(),
          type: regType,
          apiKey: regApiKey || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setNewlyCreatedKey(json.data.apiKey)
        setRegName('')
        setRegApiKey('')
        await fetchData()
        await fetchEvents()
      }
    } catch (err) {
      toast.error('Failed to register extension: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setRegLoading(false)
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    try {
      await fetch('/api/extension', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', connectionId, connected: false }),
      })
      await fetchData()
    } catch (err) {
      toast.error('Failed to disconnect extension: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleUnregister = async (connectionId: string) => {
    try {
      await fetch(`/api/extension?connectionId=${connectionId}`, { method: 'DELETE' })
      await fetchData()
      await fetchEvents()
    } catch (err) {
      toast.error('Failed to unregister extension: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleSendCommand = async () => {
    if (!commandConnId || !commandText.trim()) return
    setCommandLoading(true)
    setCommandResult(null)
    try {
      const res = await fetch('/api/extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'command',
          connectionId: commandConnId,
          command: commandText.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCommandResult(json.data)
        await fetchEvents()
      } else {
        setCommandResult({ error: json.error || 'Command failed' })
      }
    } catch {
      setCommandResult({ error: 'Failed to send command' })
    }
    setCommandLoading(false)
  }

  const handleFetchSnippets = async (connectionId: string) => {
    setSnippetsLoading(true)
    try {
      const res = await fetch(`/api/extension?action=completions&connectionId=${connectionId}&language=typescript&prefix=nanggroe`)
      const json = await res.json()
      if (json.success) {
        setSnippets(json.data)
      }
    } catch (err) {
      toast.error('Failed to fetch snippets: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSnippetsLoading(false)
    }
  }

  const handleFetchHover = async (connectionId: string) => {
    setHoverLoading(true)
    try {
      const res = await fetch(`/api/extension?action=hover&connectionId=${connectionId}&filePath=src/lib/drivers.ts&line=10&column=15`)
      const json = await res.json()
      if (json.success && json.data) {
        setHoverInfo(json.data)
      } else {
        setHoverInfo({ contents: 'No hover info available for this position.' })
      }
    } catch {
      setHoverInfo({ contents: 'Failed to fetch hover info.' })
    } finally {
      setHoverLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-96 bg-slate-900 rounded-xl animate-pulse border border-white/5" />
          <div className="h-96 bg-slate-900 rounded-xl animate-pulse border border-white/5" />
        </div>
      </div>
    )
  }

  const connections = data?.connections || []

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plug className="w-4 h-4 text-teal-400" />
          Extension Bridge
        </h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-emerald-400 flex items-center gap-1">
            <Wifi className="w-3 h-3" />{data?.connectedCount || 0} connected
          </span>
          <span className="text-slate-500">{data?.totalConnections || 0} total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Register New Extension */}
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                Register New Extension
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 block">Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="My Extension"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 block">Type</label>
                  <div className="flex gap-1.5">
                    {(['vscode', 'jetbrains', 'vim', 'custom'] as const).map((type) => {
                      const cfg = TYPE_CONFIG[type]
                      return (
                        <button
                          key={type}
                          onClick={() => setRegType(type)}
                          className={`px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                            regType === type
                              ? `${cfg.bg} ${cfg.color} ${cfg.border} border`
                              : 'bg-slate-800 text-slate-500 border border-white/5 hover:border-white/10'
                          }`}
                        >
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 block">API Key (optional)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={regApiKey}
                      onChange={(e) => setRegApiKey(e.target.value)}
                      placeholder="Auto-generated"
                      className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500/30"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRegApiKey(generateApiKeySuggestion())}
                      className="h-8 px-2 border-white/10 text-slate-400 hover:text-slate-300"
                    >
                      <Key className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRegister}
                disabled={regLoading || !regName.trim()}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {regLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Register Extension
                  </>
                )}
              </Button>

              {newlyCreatedKey && (
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Extension registered! Save this API key — it won&apos;t be shown again:
                  </p>
                  <code className="text-[11px] text-emerald-300 font-mono break-all">{newlyCreatedKey}</code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Extensions */}
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                <Plug className="w-4 h-4 text-teal-400" />
                Connected Extensions
                <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 border text-[9px]">
                  {connections.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <p className="text-[11px] text-slate-600 text-center py-4">No extensions registered yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {connections.map((conn) => {
                    const typeCfg = TYPE_CONFIG[conn.type] || TYPE_CONFIG.custom

                    return (
                      <div key={conn.id} className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`${typeCfg.bg} ${typeCfg.color} ${typeCfg.border} border text-[9px]`}>
                              {typeCfg.label}
                            </Badge>
                            <span className="text-xs text-slate-300 font-medium">{conn.name}</span>
                            {conn.connected ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border text-[9px] flex items-center gap-1">
                                <Wifi className="w-2.5 h-2.5" /> Online
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30 border text-[9px] flex items-center gap-1">
                                <WifiOff className="w-2.5 h-2.5" /> Offline
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* API Key (masked) */}
                        <div className="flex items-center gap-2 mb-2 text-[10px]">
                          <Key className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-500">API Key:</span>
                          <code className="text-slate-400 font-mono">{maskApiKey(conn.apiKey)}</code>
                        </div>

                        {/* Capabilities */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {conn.capabilities.map((cap) => (
                            <span key={cap} className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[9px] text-slate-400">
                              {cap}
                            </span>
                          ))}
                        </div>

                        {/* Connected at */}
                        {conn.connectedAt && (
                          <p className="text-[9px] text-slate-600 mb-2">
                            Connected: {new Date(conn.connectedAt).toLocaleString()}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {conn.connected && (
                            <>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setCommandConnId(conn.id); setCommandText(''); setCommandResult(null) }}
                                    className="h-6 text-[10px] border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                                  >
                                    <Send className="w-3 h-3 mr-1" />
                                    Command
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-white/10 text-white">
                                  <DialogHeader>
                                    <DialogTitle className="text-sm text-slate-200 flex items-center gap-2">
                                      <Send className="w-4 h-4 text-teal-400" />
                                      Send Command to {conn.name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3">
                                    <input
                                      type="text"
                                      value={commandText}
                                      onChange={(e) => setCommandText(e.target.value)}
                                      placeholder="e.g., openFile, runTask, getDiagnostics, readTelemetry, listDevices"
                                      className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500/30"
                                    />
                                    <Button
                                      onClick={handleSendCommand}
                                      disabled={commandLoading || !commandText.trim()}
                                      className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                                    >
                                      {commandLoading ? (
                                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</>
                                      ) : (
                                        <><Send className="w-3.5 h-3.5 mr-1.5" />Send Command</>
                                      )}
                                    </Button>
                                    {commandResult !== null && commandResult !== undefined && (
                                      <div className="p-3 bg-slate-800 rounded-lg border border-white/5 max-h-48 overflow-y-auto">
                                        <pre className="text-[10px] text-slate-300 whitespace-pre-wrap font-mono">
                                          {JSON.stringify(commandResult as Record<string, unknown>, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnect(conn.id)}
                            className="h-6 text-[10px] border-white/10 text-slate-400 hover:bg-white/5"
                          >
                            <WifiOff className="w-3 h-3 mr-1" />
                            Disconnect
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Remove Extension</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  Are you sure you want to unregister &quot;{conn.name}&quot;? This will permanently remove the extension and its API key. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleUnregister(conn.id)} className="bg-rose-600 hover:bg-rose-700 text-white">
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Extension Events */}
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                Extension Events
                <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30 border text-[9px]">
                  {events.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-[11px] text-slate-600 text-center py-4">No events yet</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {events.slice().reverse().map((evt, i) => (
                    <div key={i} className="p-2 bg-slate-800/50 rounded-md border border-white/5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-teal-400 font-mono">{evt.event}</span>
                        <span className="text-[9px] text-slate-600 font-mono">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500">
                        Source: {evt.source}
                        {evt.data ? ` • ${JSON.stringify(evt.data as Record<string, unknown>).substring(0, 60)}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* IDE Features */}
          <Card className="bg-slate-900 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                <Code className="w-4 h-4 text-teal-400" />
                IDE Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Code Snippets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Braces className="w-3 h-3" /> Code Snippets
                  </p>
                  {connections.filter(c => c.connected).length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFetchSnippets(connections.find(c => c.connected)?.id || '')}
                      disabled={snippetsLoading}
                      className="h-5 text-[9px] border-white/10 text-slate-400 hover:text-slate-300 px-2"
                    >
                      {snippetsLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Load'}
                    </Button>
                  )}
                </div>
                {snippets.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {snippets.map((snippet, i) => (
                      <div key={i} className="p-2 bg-slate-800/50 rounded-md border border-white/5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 border text-[8px]">
                            {snippet.kind}
                          </Badge>
                          <span className="text-[10px] text-slate-300 font-mono">{snippet.label}</span>
                        </div>
                        <p className="text-[9px] text-slate-500">{snippet.detail}</p>
                        <div className="mt-1 p-1.5 bg-slate-900 rounded border border-white/5">
                          <pre className="text-[8px] text-slate-400 font-mono whitespace-pre-wrap line-clamp-3">{snippet.insertText}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-600">Connect an extension to view snippets</p>
                )}
              </div>

              {/* Hover Documentation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Hover Documentation
                  </p>
                  {connections.filter(c => c.connected).length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFetchHover(connections.find(c => c.connected)?.id || '')}
                      disabled={hoverLoading}
                      className="h-5 text-[9px] border-white/10 text-slate-400 hover:text-slate-300 px-2"
                    >
                      {hoverLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Load'}
                    </Button>
                  )}
                </div>
                {hoverInfo ? (
                  <div className="p-2.5 bg-slate-800/50 rounded-md border border-white/5">
                    <div className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">{hoverInfo.contents}</div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-600">Connect an extension to view hover docs</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
