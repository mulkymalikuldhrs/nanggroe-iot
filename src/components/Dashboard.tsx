'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Activity,
  Map,
  Cpu,
  Bot,
  ScrollText,
  ChevronRight,
  Zap,
  Puzzle,
  Wrench,
  Heart,
} from 'lucide-react'
import { OverviewTab } from './OverviewTab'
import { TelemetryTab } from './TelemetryTab'
import { MissionsTab } from './MissionsTab'
import { HardwareTab } from './HardwareTab'
import { AgentsTab } from './AgentsTab'
import { LogsTab } from './LogsTab'
import { McpTab } from './McpTab'
import { CalibrationTab } from './CalibrationTab'
import { DoctorTab } from './DoctorTab'
import { AssemblyTab } from './AssemblyTab'

const NAV_ITEMS = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'telemetry' as const, label: 'Telemetry', icon: Activity },
  { id: 'missions' as const, label: 'Missions', icon: Map },
  { id: 'hardware' as const, label: 'Hardware', icon: Cpu },
  { id: 'agents' as const, label: 'AI Agents', icon: Bot },
  { id: 'mcp' as const, label: 'MCP Tools', icon: Puzzle },
  { id: 'calibration' as const, label: 'Calibration', icon: Wrench },
  { id: 'logs' as const, label: 'Logs', icon: ScrollText },
  { id: 'doctor' as const, label: 'Doctor', icon: Heart },
  { id: 'assembly' as const, label: 'Assembly', icon: Wrench },
]

type TabId = (typeof NAV_ITEMS)[number]['id']

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />
      case 'telemetry':
        return <TelemetryTab />
      case 'missions':
        return <MissionsTab />
      case 'hardware':
        return <HardwareTab />
      case 'agents':
        return <AgentsTab />
      case 'mcp':
        return <McpTab />
      case 'calibration':
        return <CalibrationTab />
      case 'logs':
        return <LogsTab />
      case 'doctor':
        return <DoctorTab />
      case 'assembly':
        return <AssemblyTab />
      default:
        return <OverviewTab />
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/80 border-r border-white/5 shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">NANGGROE OS AI</h1>
              <p className="text-[10px] text-slate-400 font-mono">v1.0.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-teal-500/60" />}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span>Aceh Utara Region</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1 font-mono">4.9125°N, 97.1347°E</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 bg-slate-900/60 border-b border-white/5 flex items-center px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-500 md:hidden" />
            <h2 className="text-sm font-semibold text-white">
              {NAV_ITEMS.find((i) => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              <span>System Online</span>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {renderTab()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden flex bg-slate-900 border-t border-white/5 shrink-0">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-teal-400' : 'text-slate-500'
              }`}
            >
              <item.icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
