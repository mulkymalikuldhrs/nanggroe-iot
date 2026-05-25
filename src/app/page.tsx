'use client'

import { useSyncExternalStore } from 'react'
import { Dashboard } from '@/components/Dashboard'
import { MobileLayout } from '@/components/MobileLayout'

function useIsCapacitor() {
  return useSyncExternalStore(
    (callback) => {
      // No external store changes to subscribe to for Capacitor detection
      return () => {}
    },
    () => {
      if (typeof window === 'undefined') return false
      const capacitor = (window as any).Capacitor
      return capacitor?.isNativePlatform?.() ?? false
    },
    () => false // Server snapshot
  )
}

export default function Home() {
  const isCapacitor = useIsCapacitor()

  // In Capacitor native app, use the mobile-optimized layout
  if (isCapacitor) {
    return <MobileLayout />
  }

  // On regular web, use Dashboard (which has its own responsive behavior)
  return <Dashboard />
}
