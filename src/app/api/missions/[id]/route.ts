// ============================================================
// NANGGROE IOT - Single Mission Operations API
// GET    /api/missions/[id] — Get mission details with logs & messages
// PATCH  /api/missions/[id] — Update mission fields
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const mission = await db.mission.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
        agentMessages: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    })

    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const parsedMission = {
      ...mission,
      waypoints: JSON.parse(mission.waypoints),
      parameters: mission.parameters ? JSON.parse(mission.parameters) : null,
      areaPolygon: mission.areaPolygon ? JSON.parse(mission.areaPolygon) : null,
    }

    return NextResponse.json({
      success: true,
      data: parsedMission,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve mission details' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, type, status, waypoints, parameters, areaPolygon, altitude, speed, overlapFront, overlapSide, gsd } = body as {
      name?: string
      description?: string
      type?: string
      status?: string
      waypoints?: Array<{ lat: number; lng: number; alt: number; action: string }>
      parameters?: Record<string, unknown>
      areaPolygon?: Array<{ lat: number; lng: number }>
      altitude?: number
      speed?: number
      overlapFront?: number
      overlapSide?: number
      gsd?: number
    }

    const mission = await db.mission.findUnique({ where: { id } })
    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      )
    }

    // Validate status transitions using the same state machine as PUT /api/missions
    const VALID_TRANSITIONS: Record<string, string[]> = {
      draft: ['planned'],
      planned: ['active'],
      active: ['paused', 'completed', 'failed', 'aborted'],
      paused: ['active', 'completed', 'failed', 'aborted'],
      completed: [],
      failed: [],
      aborted: [],
    }

    if (status !== undefined && status !== mission.status) {
      const allowedNext = VALID_TRANSITIONS[mission.status] || []
      if (!allowedNext.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status transition from "${mission.status}" to "${status}". Allowed transitions: ${JSON.stringify(VALID_TRANSITIONS[mission.status])}`,
          },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type
    if (status !== undefined) updateData.status = status
    if (waypoints !== undefined) updateData.waypoints = JSON.stringify(waypoints)
    if (parameters !== undefined) updateData.parameters = JSON.stringify(parameters)
    if (areaPolygon !== undefined) updateData.areaPolygon = JSON.stringify(areaPolygon)
    if (altitude !== undefined) updateData.altitude = altitude
    if (speed !== undefined) updateData.speed = speed
    if (overlapFront !== undefined) updateData.overlapFront = overlapFront
    if (overlapSide !== undefined) updateData.overlapSide = overlapSide
    if (gsd !== undefined) updateData.gsd = gsd

    // Handle status-specific timestamps
    if (status === 'active' && !mission.startedAt) {
      updateData.startedAt = new Date()
    }
    if (status === 'completed' || status === 'failed' || status === 'aborted') {
      updateData.completedAt = new Date()
    }

    const updatedMission = await db.mission.update({
      where: { id },
      data: updateData,
    })

    // Log the update
    await db.missionLog.create({
      data: {
        missionId: id,
        level: 'info',
        source: 'operator',
        message: `Mission updated: ${Object.keys(updateData).filter(k => k !== 'updatedAt').join(', ')}`,
        data: JSON.stringify({ updatedFields: Object.keys(updateData) }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedMission,
      message: 'Mission updated successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update mission' },
      { status: 500 }
    )
  }
}
