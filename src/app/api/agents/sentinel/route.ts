// ============================================================
// NANGGROE IOT - Sentinel Agent API
// GET  /api/agents/sentinel — Get latest safety status
// POST /api/agents/sentinel — Trigger manual check or configure
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { AgentOrchestrator } from '@/lib/agent-orchestrator'
import type { SentinelCheckResult, SentinelConfig } from '@/lib/agents-sentinel'
import type { AgentStatus } from '@/lib/agents'
import type { PicoClawCheckResult } from '@/lib/types'
import { picoclawCheck } from '@/lib/agents'
import { getLatestTelemetrySnapshot } from '@/lib/telemetry'

export async function GET() {
  try {
    const orchestrator = AgentOrchestrator.getInstance()
    const sentinel = orchestrator.getSentinelAgent()

    let safetyStatus: AgentStatus | null = null
    let lastCheckResult: SentinelCheckResult | null = null
    let config: SentinelConfig | null = null

    if (sentinel) {
      lastCheckResult = sentinel.getLastCheckResult()
      config = sentinel.getConfig()
      safetyStatus = sentinel.getStatus()
    }

    // Also get a fresh telemetry snapshot for immediate status
    const telemetry = await getLatestTelemetrySnapshot()
    let currentSafetyCheck: PicoClawCheckResult | null = null

    if (telemetry) {
      currentSafetyCheck = picoclawCheck(telemetry)
    }

    return NextResponse.json({
      success: true,
      data: {
        sentinel: safetyStatus,
        lastCheckResult: lastCheckResult ? {
          timestamp: lastCheckResult.timestamp.toISOString(),
          safe: lastCheckResult.safe,
          criticalCount: lastCheckResult.criticalCount,
          warningCount: lastCheckResult.warningCount,
          alerts: lastCheckResult.alerts,
          actions: lastCheckResult.actions,
          telemetryAge: lastCheckResult.telemetryAge,
        } : null,
        currentSafetyCheck: currentSafetyCheck ? {
          safe: currentSafetyCheck.safe,
          alertCount: currentSafetyCheck.alerts.length,
          actionCount: currentSafetyCheck.actions.length,
          alerts: currentSafetyCheck.alerts,
          actions: currentSafetyCheck.actions,
        } : null,
        config,
        telemetry: telemetry ? {
          battery_voltage: telemetry.battery_voltage,
          altitude: telemetry.altitude,
          speed: telemetry.speed,
          signal_strength: telemetry.signal_strength,
          temperature: telemetry.temperature,
        } : null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get sentinel status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, thresholds } = body as {
      action: string
      thresholds?: Record<string, { warning?: number; critical?: number }>
    }

    const orchestrator = AgentOrchestrator.getInstance()

    // Ensure sentinel is registered
    let sentinel = orchestrator.getSentinelAgent()
    if (!sentinel) {
      orchestrator.registerDefaultAgents()
      sentinel = orchestrator.getSentinelAgent()
    }

    if (!sentinel) {
      return NextResponse.json(
        { success: false, error: 'Sentinel agent not available' },
        { status: 500 }
      )
    }

    switch (action) {
      case 'manual_check': {
        const result = await sentinel.performCheck()
        return NextResponse.json({
          success: true,
          data: {
            timestamp: result.timestamp.toISOString(),
            safe: result.safe,
            criticalCount: result.criticalCount,
            warningCount: result.warningCount,
            alerts: result.alerts,
            actions: result.actions,
            telemetryAge: result.telemetryAge,
          },
        })
      }

      case 'configure': {
        if (thresholds) {
          const currentConfig = sentinel.getConfig()
          const newThresholds = { ...currentConfig.thresholds }

          for (const [metric, values] of Object.entries(thresholds)) {
            if (newThresholds[metric as keyof typeof newThresholds]) {
              newThresholds[metric as keyof typeof newThresholds] = {
                ...newThresholds[metric as keyof typeof newThresholds],
                ...values,
              }
            }
          }

          await sentinel.stop()
          await sentinel.start()

          return NextResponse.json({
            success: true,
            data: {
              message: 'Thresholds updated',
              thresholds: newThresholds,
            },
          })
        }
        return NextResponse.json(
          { success: false, error: 'thresholds object is required for configure action' },
          { status: 400 }
        )
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}. Available: manual_check, configure` },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process sentinel request' },
      { status: 500 }
    )
  }
}
