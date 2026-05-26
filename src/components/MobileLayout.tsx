'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  Activity,
  Map,
  Cpu,
  Bot,
  Puzzle,
  Wrench,
  ScrollText,
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
  Zap,
  MoreHorizontal,
  ChevronLeft,
} from 'lucide-react'
import { usePlatform } from '@/hooks/usePlatform'
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
import { DriversTab } from './DriversTab'
import { FlashTab } from './FlashTab'
import { TestingTab } from './TestingTab'
import { ExtensionTab } from './ExtensionTab'
import { RobotBuilderTab } from './RobotBuilderTab'
import { CommsTab } from './CommsTab'
import { NavigationTab } from './NavigationTab'
import { PowerTab } from './PowerTab'
import { SelfLearnTab } from './SelfLearnTab'
import { FaceTrackingTab } from './FaceTrackingTab'

// Primary nav items shown in bottom bar (max 5 for mobile UX)
const PRIMARY_NAV = [
  { id: 'overview' as const, label: 'Home', icon: LayoutDashboard },
  { id: 'missions' as const, label: 'Missions', icon: Map },
  { id: 'agents' as const, label: 'AI', icon: Bot },
  { id: 'telemetry' as const, label: 'Data', icon: Activity },
  { id: 'more' as const, label: 'More', icon: MoreHorizontal },
]

// Secondary nav items shown in the "More" panel
const SECONDARY_NAV = [
  { id: 'hardware' as const, label: 'Hardware', icon: Cpu },
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
  { id: 'comms' as const, label: 'Comms', icon: MessageSquare },
  { id: 'navigation' as const, label: 'Navigation', icon: Navigation },
  { id: 'power' as const, label: 'Power', icon: Battery },
  { id: 'self-learn' as const, label: 'Self-Learn', icon: Brain },
  { id: 'face-tracking' as const, label: 'Face Tracking', icon: Eye },
]

type TabId =
  | (typeof PRIMARY_NAV)[number]['id']
  | (typeof SECONDARY_NAV)[number]['id']

export function MobileLayout() {
  const { isCapacitor, isNative, isAndroid } = usePlatform()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showMorePanel, setShowMorePanel] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [history, setHistory] = useState<TabId[]>([])

  // Handle Capacitor Android back button
  useEffect(() => {
    if (!isCapacitor) return

    const handleBackButton = () => {
      if (showMorePanel) {
        setShowMorePanel(false)
        return
      }
      if (history.length > 1) {
        const newHistory = [...history]
        newHistory.pop()
        const prevTab = newHistory[newHistory.length - 1]
        setHistory(newHistory)
        setActiveTab(prevTab)
      }
    }

    // Listen for Capacitor back button
    const capacitor = (window as any).Capacitor
    if (capacitor?.Plugins?.App) {
      capacitor.Plugins.App.addListener('backButton', handleBackButton)
    }

    return () => {
      if (capacitor?.Plugins?.App?.removeAllListeners) {
        capacitor.Plugins.App.removeAllListeners('backButton')
      }
    }
  }, [isCapacitor, showMorePanel, history])

  const navigateTo = useCallback(
    (tabId: TabId) => {
      if (tabId === 'more') {
        setShowMorePanel(true)
        return
      }
      setShowMorePanel(false)
      setHistory((prev) => [...prev, tabId])
      setActiveTab(tabId)
      setCanGoBack(true)
    },
    []
  )

  const goBack = useCallback(() => {
    if (showMorePanel) {
      setShowMorePanel(false)
      return
    }
    if (history.length > 1) {
      const newHistory = [...history]
      newHistory.pop()
      const prevTab = newHistory[newHistory.length - 1]
      setHistory(newHistory)
      setActiveTab(prevTab)
      setCanGoBack(newHistory.length > 1)
    }
  }, [history, showMorePanel])

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
      case 'drivers':
        return <DriversTab />
      case 'flash':
        return <FlashTab />
      case 'testing':
        return <TestingTab />
      case 'extension':
        return <ExtensionTab />
      case 'robot-builder':
        return <RobotBuilderTab />
      case 'comms':
        return <CommsTab />
      case 'navigation':
        return <NavigationTab />
      case 'power':
        return <PowerTab />
      case 'self-learn':
        return <SelfLearnTab />
      case 'face-tracking':
        return <FaceTrackingTab />
      default:
        return <OverviewTab />
    }
  }

  const currentLabel =
    PRIMARY_NAV.find((i) => i.id === activeTab)?.label ||
    SECONDARY_NAV.find((i) => i.id === activeTab)?.label ||
    'Nanggroe IoT'

  return (
    <div
      className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden"
      style={{
        // Safe area insets for Capacitor on devices with notches
        paddingTop: isCapacitor ? 'env(safe-area-inset-top)' : 0,
        paddingBottom: isCapacitor ? 'env(safe-area-inset-bottom)' : 0,
      }}
    >
      {/* Top Header Bar */}
      <header className="h-12 bg-slate-900/80 border-b border-white/5 flex items-center px-4 shrink-0">
        {canGoBack && (
          <button
            onClick={goBack}
            className="mr-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors active:bg-white/10"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
        )}
        <div className="flex items-center gap-2">
          {!canGoBack && (
            <div className="w-7 h-7 rounded-md bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-teal-400" />
            </div>
          )}
          <h2 className="text-sm font-semibold text-white">{currentLabel}</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isNative && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 font-mono">
              {isAndroid ? 'Android' : 'Native'}
            </span>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {renderTab()}
      </main>

      {/* Bottom Navigation Bar - Capacitor/Android optimized */}
      <nav className="bg-slate-900 border-t border-white/5 shrink-0 safe-area-bottom">
        <div className="flex items-stretch">
          {PRIMARY_NAV.map((item) => {
            const isActive =
              item.id === 'more'
                ? showMorePanel
                : activeTab === item.id &&
                  !PRIMARY_NAV.some(
                    (p) => p.id === 'more' && showMorePanel
                  )
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`
                  flex-1 flex flex-col items-center justify-center py-2 min-h-[56px]
                  transition-colors duration-150 active:scale-95
                  ${
                    isActive
                      ? 'text-teal-400'
                      : 'text-slate-500 active:text-slate-300'
                  }
                `}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon
                  className={`w-5 h-5 mb-1 ${
                    isActive ? 'text-teal-400' : 'text-slate-500'
                  }`}
                />
                <span className="text-[10px] font-medium leading-tight">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-400 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* More Panel - Slide up drawer for secondary navigation */}
      {showMorePanel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowMorePanel(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full max-w-lg bg-slate-900 rounded-t-2xl border-t border-white/10 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-slate-600" />
            </div>

            <div className="px-4 pb-2">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                All Modules
              </h3>
            </div>

            {/* Grid of secondary nav items */}
            <div className="grid grid-cols-4 gap-1 px-3 pb-6 max-h-[60vh] overflow-y-auto">
              {SECONDARY_NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-xl
                    transition-colors duration-150 active:scale-95
                    ${
                      activeTab === item.id
                        ? 'bg-teal-500/15 text-teal-400'
                        : 'text-slate-400 hover:bg-white/5 active:bg-white/10'
                    }
                  `}
                  aria-label={item.label}
                >
                  <item.icon className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] font-medium leading-tight text-center">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
