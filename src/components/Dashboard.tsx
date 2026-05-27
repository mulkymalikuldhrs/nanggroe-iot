'use client'

import { lazy, Suspense, ComponentType, useCallback, useRef } from 'react'
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
  HardDrive,
  Upload,
  TestTube,
  Plug,
  Rocket,
  MessageSquare,
  Navigation,
  Battery,
  Brain,
  Eye,
} from 'lucide-react'
import { useDashboardStore } from '@/lib/store'

const OverviewTab = lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab })))
const TelemetryTab = lazy(() => import('./TelemetryTab').then(m => ({ default: m.TelemetryTab })))
const MissionsTab = lazy(() => import('./MissionsTab').then(m => ({ default: m.MissionsTab })))
const HardwareTab = lazy(() => import('./HardwareTab').then(m => ({ default: m.HardwareTab })))
const AgentsTab = lazy(() => import('./AgentsTab').then(m => ({ default: m.AgentsTab })))
const LogsTab = lazy(() => import('./LogsTab').then(m => ({ default: m.LogsTab })))
const McpTab = lazy(() => import('./McpTab').then(m => ({ default: m.McpTab })))
const CalibrationTab = lazy(() => import('./CalibrationTab').then(m => ({ default: m.CalibrationTab })))
const DoctorTab = lazy(() => import('./DoctorTab').then(m => ({ default: m.DoctorTab })))
const AssemblyTab = lazy(() => import('./AssemblyTab').then(m => ({ default: m.AssemblyTab })))
const DriversTab = lazy(() => import('./DriversTab').then(m => ({ default: m.DriversTab })))
const FlashTab = lazy(() => import('./FlashTab').then(m => ({ default: m.FlashTab })))
const TestingTab = lazy(() => import('./TestingTab').then(m => ({ default: m.TestingTab })))
const ExtensionTab = lazy(() => import('./ExtensionTab').then(m => ({ default: m.ExtensionTab })))
const RobotBuilderTab = lazy(() => import('./RobotBuilderTab').then(m => ({ default: m.RobotBuilderTab })))
const CommsTab = lazy(() => import('./CommsTab').then(m => ({ default: m.CommsTab })))
const NavigationTab = lazy(() => import('./NavigationTab').then(m => ({ default: m.NavigationTab })))
const PowerTab = lazy(() => import('./PowerTab').then(m => ({ default: m.PowerTab })))
const SelfLearnTab = lazy(() => import('./SelfLearnTab').then(m => ({ default: m.SelfLearnTab })))
const FaceTrackingTab = lazy(() => import('./FaceTrackingTab').then(m => ({ default: m.FaceTrackingTab })))

function TabLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

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
  { id: 'drivers' as const, label: 'Drivers', icon: HardDrive },
  { id: 'flash' as const, label: 'Flash', icon: Upload },
  { id: 'testing' as const, label: 'Testing', icon: TestTube },
  { id: 'extension' as const, label: 'Extension', icon: Plug },
  { id: 'robot-builder' as const, label: 'Robot Builder', icon: Rocket },
  { id: 'comms' as const, label: 'Communications', icon: MessageSquare },
  { id: 'navigation' as const, label: 'Navigation', icon: Navigation },
  { id: 'power' as const, label: 'Power', icon: Battery },
  { id: 'self-learn' as const, label: 'Self-Learn', icon: Brain },
  { id: 'face-tracking' as const, label: 'Face Tracking', icon: Eye },
]

type TabId = (typeof NAV_ITEMS)[number]['id']

const TAB_COMPONENTS: Record<TabId, ComponentType> = {
  'overview': OverviewTab,
  'telemetry': TelemetryTab,
  'missions': MissionsTab,
  'hardware': HardwareTab,
  'agents': AgentsTab,
  'mcp': McpTab,
  'calibration': CalibrationTab,
  'logs': LogsTab,
  'doctor': DoctorTab,
  'assembly': AssemblyTab,
  'drivers': DriversTab,
  'flash': FlashTab,
  'testing': TestingTab,
  'extension': ExtensionTab,
  'robot-builder': RobotBuilderTab,
  'comms': CommsTab,
  'navigation': NavigationTab,
  'power': PowerTab,
  'self-learn': SelfLearnTab,
  'face-tracking': FaceTrackingTab,
}

export function Dashboard() {
  const activeTab = useDashboardStore((s) => s.activeTab as TabId)
  const setActiveTab = useDashboardStore((s) => s.setActiveTab)
  const navRef = useRef<HTMLElement>(null)
  const mobileNavRef = useRef<HTMLElement>(null)

  const handleNavKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = NAV_ITEMS.findIndex((item) => item.id === activeTab)
    let newIndex = currentIndex

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      newIndex = (currentIndex + 1) % NAV_ITEMS.length
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      newIndex = (currentIndex - 1 + NAV_ITEMS.length) % NAV_ITEMS.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      newIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      newIndex = NAV_ITEMS.length - 1
    } else {
      return
    }

    const newTabId = NAV_ITEMS[newIndex].id
    setActiveTab(newTabId)
    // Focus the newly active tab button
    requestAnimationFrame(() => {
      const activeBtn = navRef.current?.querySelector(`[data-tab-id="${newTabId}"]`) as HTMLElement
        || mobileNavRef.current?.querySelector(`[data-tab-id="${newTabId}"]`) as HTMLElement
      activeBtn?.focus()
    })
  }, [activeTab, setActiveTab])

  const getTabComponent = (): ComponentType => {
    return TAB_COMPONENTS[activeTab] ?? OverviewTab
  }

  const renderTab = () => {
    const TabComponent = getTabComponent()
    return (
      <Suspense fallback={<TabLoading />}>
        <TabComponent />
      </Suspense>
    )
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside data-testid="sidebar" role="navigation" aria-label="Main navigation" className="hidden md:flex flex-col w-64 bg-slate-900/80 border-r border-white/5 shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 data-testid="brand-title" className="text-sm font-bold text-white tracking-wide">NANGGROE IOT</h1>
              <p className="text-[10px] text-slate-400 font-mono">v2.0.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav ref={navRef} role="tablist" className="flex-1 p-3 space-y-1" onKeyDown={handleNavKeyDown}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                data-testid={`nav-tab-${item.id}`}
                data-tab-id={item.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${item.id}`}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={isActive ? 0 : -1}
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
            <div data-testid="system-online-dot" className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span data-testid="region-info">Aceh Utara Region</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1 font-mono">4.9125°N, 97.1347°E</p>
        </div>
      </aside>

      {/* Main Content */}
      <main aria-label="Content area" className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header data-testid="top-bar" className="h-12 bg-slate-900/60 border-b border-white/5 flex items-center px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-500 md:hidden" />
            <h2 data-testid="active-tab-title" className="text-sm font-semibold text-white">
              {NAV_ITEMS.find((i) => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              <span data-testid="system-online">System Online</span>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div data-testid="tab-content" id={`tabpanel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="flex-1 overflow-y-auto">
          {renderTab()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav ref={mobileNavRef} data-testid="mobile-nav" role="tablist" aria-label="Main navigation" className="md:hidden flex bg-slate-900 border-t border-white/5 shrink-0" onKeyDown={handleNavKeyDown}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              data-testid={`mobile-nav-tab-${item.id}`}
              data-tab-id={item.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${item.id}`}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={isActive ? 0 : -1}
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
