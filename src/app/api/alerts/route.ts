// ============================================================
// NANGGROE IOT - Alerts Management API
// GET    /api/alerts — List alerts with filters
// PATCH  /api/alerts — Mark alert as read/resolved
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const source = searchParams.get('source')
    const category = searchParams.get('category')
    const isRead = searchParams.get('isRead')
    const isResolved = searchParams.get('isResolved')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (level) where.level = level
    if (source) where.source = source
    if (category) where.category = category
    if (isRead !== null && isRead !== undefined) where.isRead = isRead === 'true'
    if (isResolved !== null && isResolved !== undefined) where.isResolved = isResolved === 'true'

    const alerts = await db.alert.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    // Get alert stats
    const stats = {
      total: await db.alert.count(),
      unread: await db.alert.count({ where: { isRead: false } }),
      unresolved: await db.alert.count({ where: { isResolved: false } }),
      critical: await db.alert.count({ where: { level: 'critical', isResolved: false } }),
      warning: await db.alert.count({ where: { level: 'warning', isResolved: false } }),
      info: await db.alert.count({ where: { level: 'info', isResolved: false } }),
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        stats,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve alerts' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, alertIds, isRead, isResolved, markAllRead } = body as {
      alertId?: string
      alertIds?: string[]
      isRead?: boolean
      isResolved?: boolean
      markAllRead?: boolean
    }

    // Mark all alerts as read
    if (markAllRead) {
      const result = await db.alert.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      })

      return NextResponse.json({
        success: true,
        data: { updated: result.count },
        message: `Marked ${result.count} alerts as read`,
      })
    }

    // Mark specific alerts
    const targetIds = alertIds || (alertId ? [alertId] : [])
    if (targetIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Provide alertId, alertIds, or markAllRead=true' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (isRead !== undefined) updateData.isRead = isRead
    if (isResolved !== undefined) updateData.isResolved = isResolved

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Provide isRead and/or isResolved to update' },
        { status: 400 }
      )
    }

    const result = await db.alert.updateMany({
      where: { id: { in: targetIds } },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: { updated: result.count },
      message: `Updated ${result.count} alerts`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update alerts' },
      { status: 500 }
    )
  }
}
