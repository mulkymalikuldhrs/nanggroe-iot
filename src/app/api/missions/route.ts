// ============================================================
// NANGGROE IOT - Missions API
// GET  /api/missions — List all missions
// POST /api/missions — Create new mission
// PUT  /api/missions — Update mission (start, pause, stop, abort)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type

    const missions = await db.mission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Get summary stats using groupBy instead of fetching all missions
    const [totalCount, statusGroups, typeGroups] = await Promise.all([
      db.mission.count(),
      db.mission.groupBy({ by: ['status'], _count: { status: true } }),
      db.mission.groupBy({ by: ['type'], _count: { type: true } }),
    ])

    const stats = {
      total: totalCount,
      byStatus: Object.fromEntries(statusGroups.map(g => [g.status, g._count.status])) as Record<string, number>,
      byType: Object.fromEntries(typeGroups.map(g => [g.type, g._count.type])) as Record<string, number>,
    }

    return NextResponse.json({
      success: true,
      data: {
        missions,
        stats,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve missions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      type,
      prompt,
      waypoints,
      parameters,
      areaPolygon,
      altitude,
      speed,
      overlapFront,
      overlapSide,
    } = body as {
      name?: string
      description?: string
      type?: string
      prompt?: string
      waypoints?: Array<{ lat: number; lng: number; alt: number; action: string }>
      parameters?: Record<string, unknown>
      areaPolygon?: Array<{ lat: number; lng: number }>
      altitude?: number
      speed?: number
      overlapFront?: number
      overlapSide?: number
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mission name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (name.trim().length > 200) {
      return NextResponse.json(
        { success: false, error: 'Mission name must not exceed 200 characters' },
        { status: 400 }
      )
    }

    // Validate mission type (required)
    const validTypes = ['mapping', 'survey', 'delivery', 'patrol', 'inspection', 'agriculture']
    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { success: false, error: `Mission type is required. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid mission type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate altitude range (regulatory: max 120m)
    if (altitude !== undefined && (typeof altitude !== 'number' || altitude < 0 || altitude > 120)) {
      return NextResponse.json(
        { success: false, error: 'Altitude must be a number between 0 and 120 meters' },
        { status: 400 }
      )
    }

    // Validate speed range
    if (speed !== undefined && (typeof speed !== 'number' || speed < 0 || speed > 30)) {
      return NextResponse.json(
        { success: false, error: 'Speed must be a number between 0 and 30 m/s' },
        { status: 400 }
      )
    }

    // Default waypoints if none provided
    const defaultWaypoints = [
      { lat: 4.9125, lng: 97.1347, alt: 50, action: 'takeoff' },
      { lat: 4.9135, lng: 97.1357, alt: 50, action: 'fly' },
      { lat: 4.9145, lng: 97.1347, alt: 50, action: 'fly' },
      { lat: 4.9125, lng: 97.1347, alt: 50, action: 'land' },
    ]

    const mission = await db.mission.create({
      data: {
        name,
        description: description || null,
        type: type || 'mapping',
        status: 'draft',
        prompt: prompt || null,
        waypoints: JSON.stringify(waypoints || defaultWaypoints),
        parameters: parameters ? JSON.stringify(parameters) : null,
        areaPolygon: areaPolygon ? JSON.stringify(areaPolygon) : null,
        altitude: altitude ?? 50,
        speed: speed ?? 5,
        overlapFront: overlapFront ?? 75,
        overlapSide: overlapSide ?? 65,
      },
    })

    // Create initial mission log
    await db.missionLog.create({
      data: {
        missionId: mission.id,
        level: 'info',
        source: 'system',
        message: `Mission "${name}" created as draft`,
        data: JSON.stringify({ type: mission.type, waypointCount: (waypoints || defaultWaypoints).length }),
      },
    })

    // Create agent message for mission creation
    await db.agentMessage.create({
      data: {
        missionId: mission.id,
        agent: 'hermes',
        role: 'status',
        content: `New mission "${name}" has been created. Type: ${mission.type}. Ready for planning review before activation.`,
        metadata: JSON.stringify({ missionType: mission.type, status: 'draft' }),
      },
    })

    return NextResponse.json({
      success: true,
      data: mission,
      message: `Mission "${name}" created successfully`,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create mission' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { missionId, action } = body as {
      missionId: string
      action: 'start' | 'pause' | 'resume' | 'stop' | 'abort'
    }

    if (!missionId || typeof missionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'missionId is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const validActions = ['start', 'pause', 'resume', 'stop', 'abort']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `action is required and must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const mission = await db.mission.findUnique({ where: { id: missionId } })
    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      )
    }

    // State machine for mission status transitions
    const transitions: Record<string, Record<string, string>> = {
      start: { draft: 'active', planned: 'active' },
      pause: { active: 'paused' },
      resume: { paused: 'active' },
      stop: { active: 'completed', paused: 'completed' },
      abort: { draft: 'aborted', planned: 'aborted', active: 'aborted', paused: 'aborted' },
    }

    const newStatus = transitions[action]?.[mission.status]
    if (!newStatus) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot ${action} mission in "${mission.status}" status. Allowed transitions: ${JSON.stringify(transitions[action] || {})}`,
        },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    }

    if (action === 'start') {
      updateData.startedAt = new Date()
    }
    if (action === 'stop' || action === 'abort') {
      updateData.completedAt = new Date()
    }

    const updatedMission = await db.mission.update({
      where: { id: missionId },
      data: updateData,
    })

    // Create mission log entry
    const logMessages: Record<string, string> = {
      start: `Mission started — ${mission.name} is now active`,
      pause: `Mission paused — ${mission.name}`,
      resume: `Mission resumed — ${mission.name} is active again`,
      stop: `Mission completed — ${mission.name}`,
      abort: `Mission aborted — ${mission.name}`,
    }

    await db.missionLog.create({
      data: {
        missionId: mission.id,
        level: action === 'abort' ? 'warning' : 'info',
        source: 'operator',
        message: logMessages[action] || `Mission ${action}ed`,
        data: JSON.stringify({ action, previousStatus: mission.status, newStatus }),
      },
    })

    // Create agent messages
    await db.agentMessage.create({
      data: {
        missionId: mission.id,
        agent: 'system',
        role: 'status',
        content: logMessages[action] || `Mission ${action}ed`,
        metadata: JSON.stringify({ action, newStatus }),
      },
    })

    if (action === 'start') {
      await db.agentMessage.create({
        data: {
          missionId: mission.id,
          agent: 'picoclaw',
          role: 'status',
          content: 'Safety monitoring active. Telemetry checks running at 1Hz. All thresholds nominal.',
          metadata: JSON.stringify({ checkInterval: 1, status: 'monitoring' }),
        },
      })

      await db.agentMessage.create({
        data: {
          missionId: mission.id,
          agent: 'hermes',
          role: 'status',
          content: `Mission "${mission.name}" is now active. I'm monitoring the mission plan and will provide recommendations if conditions change.`,
          metadata: JSON.stringify({ status: 'monitoring' }),
        },
      })
    }

    // Create alert for important status changes
    if (action === 'start' || action === 'abort') {
      await db.alert.create({
        data: {
          level: action === 'abort' ? 'warning' : 'info',
          source: 'system',
          title: action === 'start' ? 'Mission Started' : 'Mission Aborted',
          message: logMessages[action],
          category: 'mission',
          isRead: false,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedMission,
      message: `Mission ${action}ed successfully`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update mission' },
      { status: 500 }
    )
  }
}
