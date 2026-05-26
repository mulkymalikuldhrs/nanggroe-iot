// ============================================================
// NANGGROE IOT - AI Chat with Hermes
// POST /api/agents/chat — Send natural language prompt, get Hermes AI response
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hermesRespond } from '@/lib/agents'
import { validateApiKey } from '@/lib/auth'
import type { SystemContext, TelemetrySnapshot, MissionType, MissionStatus } from '@/lib/types'

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { prompt, missionId, includeContext } = body as {
      prompt: string
      missionId?: string
      includeContext?: boolean
    }

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'prompt is required' },
        { status: 400 }
      )
    }

    // Build system context if requested
    let context: SystemContext | undefined
    if (includeContext !== false) {
      const configs = await db.systemConfig.findMany()
      const configMap: Record<string, string> = {}
      for (const c of configs) {
        configMap[c.key] = c.value
      }

      const totalDevices = await db.hardwareDevice.count()
      const activeDevices = await db.hardwareDevice.count({
        where: { status: 'active' },
      })

      const activeMission = missionId
        ? await db.mission.findUnique({ where: { id: missionId } })
        : await db.mission.findFirst({ where: { status: 'active' } })

      const activeSession = await db.session.findFirst({
        where: { status: 'active' },
      })

      const recentAlerts = await db.alert.findMany({
        where: { isRead: false },
        orderBy: { timestamp: 'desc' },
        take: 5,
      })

      // Generate latest telemetry snapshot
      let latestTelemetry: TelemetrySnapshot | undefined
      const latestReadings = await db.telemetryReading.findMany({
        orderBy: { timestamp: 'desc' },
        take: 50,
      })

      if (latestReadings.length > 0) {
        const metricMap: Record<string, number> = {}
        for (const r of latestReadings) {
          if (!(r.metric in metricMap)) {
            metricMap[r.metric] = r.value
          }
        }
        latestTelemetry = {
          battery_voltage: metricMap.battery_voltage ?? 14.8,
          gps_lat: metricMap.gps_lat ?? 4.9125,
          gps_lng: metricMap.gps_lng ?? 97.1347,
          altitude: metricMap.altitude ?? 0,
          signal_strength: metricMap.signal_strength ?? -50,
          temperature: metricMap.temperature ?? 29,
          humidity: metricMap.humidity ?? 78,
          pressure: metricMap.pressure ?? 1010,
          heading: metricMap.heading ?? 0,
          speed: metricMap.speed ?? 0,
          roll: metricMap.roll ?? 0,
          pitch: metricMap.pitch ?? 0,
          yaw: metricMap.yaw ?? 0,
          motor_rpm_1: metricMap.motor_rpm_1 ?? 0,
          motor_rpm_2: metricMap.motor_rpm_2 ?? 0,
          motor_rpm_3: metricMap.motor_rpm_3 ?? 0,
          current_draw: metricMap.current_draw ?? 0,
        }
      }

      context = {
        mode: configMap['system.mode'] || 'discovery',
        activeMission: activeMission
          ? {
              id: activeMission.id,
              name: activeMission.name,
              description: activeMission.description,
              type: activeMission.type as MissionType,
              status: activeMission.status as MissionStatus,
              prompt: activeMission.prompt,
              waypoints: JSON.parse(activeMission.waypoints),
              altitude: activeMission.altitude,
              speed: activeMission.speed,
              overlapFront: activeMission.overlapFront,
              overlapSide: activeMission.overlapSide,
              gsd: activeMission.gsd,
              startedAt: activeMission.startedAt?.toISOString() || null,
              completedAt: activeMission.completedAt?.toISOString() || null,
              createdAt: activeMission.createdAt.toISOString(),
              updatedAt: activeMission.updatedAt.toISOString(),
            }
          : null,
        deviceCount: totalDevices,
        activeDeviceCount: activeDevices,
        latestTelemetry: latestTelemetry || null,
        recentAlerts: recentAlerts.map(a => ({
          id: a.id,
          level: a.level as 'info' | 'warning' | 'critical',
          source: a.source as 'system' | 'picoclaw' | 'hermes' | 'sensor' | 'battery' | 'gps',
          title: a.title,
          message: a.message,
          category: a.category as 'safety' | 'hardware' | 'mission' | 'system' | 'communication',
          isRead: a.isRead,
          isResolved: a.isResolved,
          timestamp: a.timestamp.toISOString(),
        })),
        sessionMode: activeSession?.mode || 'discovery',
      }
    }

    // Get Hermes AI response
    const hermesResponse = await hermesRespond(prompt, context)

    // Store the operator message
    const operatorMessage = await db.agentMessage.create({
      data: {
        missionId: missionId || null,
        agent: 'operator',
        role: 'command',
        content: prompt,
        metadata: JSON.stringify({ type: 'chat', contextIncluded: !!context }),
      },
    })

    // Store Hermes response
    const hermesMessage = await db.agentMessage.create({
      data: {
        missionId: missionId || null,
        agent: 'hermes',
        role: 'response',
        content: hermesResponse.content,
        metadata: JSON.stringify({
          type: hermesResponse.type,
          priority: hermesResponse.priority,
          data: hermesResponse.data,
        }),
      },
    })

    // If the response is a mission plan, log it (only when a valid missionId exists)
    if (hermesResponse.type === 'mission_plan' && hermesResponse.data) {
      const missionData = hermesResponse.data as Record<string, unknown>
      const validMissionId = missionId || (missionData.missionId as string)
      if (validMissionId) {
        await db.missionLog.create({
          data: {
            missionId: validMissionId,
            level: 'info',
            source: 'hermes',
            message: `Hermes generated mission plan: ${hermesResponse.content.substring(0, 200)}`,
            data: JSON.stringify(hermesResponse.data),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        operatorMessage,
        hermesResponse: {
          message: hermesMessage,
          type: hermesResponse.type,
          priority: hermesResponse.priority,
          data: hermesResponse.data,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process chat with Hermes' },
      { status: 500 }
    )
  }
}
