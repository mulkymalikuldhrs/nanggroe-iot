// ============================================================
// NANGGROE IOT - Agent Communication API
// GET  /api/agents — Get agent messages
// POST /api/agents — Send message to agent
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getLatestTelemetrySnapshot } from '@/lib/telemetry'
import { picoclawCheck } from '@/lib/agents'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agent = searchParams.get('agent')
    const missionId = searchParams.get('missionId')
    const role = searchParams.get('role')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (agent) where.agent = agent
    if (missionId) where.missionId = missionId
    if (role) where.role = role

    const messages = await db.agentMessage.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    // Get agent status from SystemConfig in database
    const [agentConfigs, lastMessages] = await Promise.all([
      db.systemConfig.findMany({
        where: {
          key: { in: ['hermes.enabled', 'hermes.status', 'picoclaw.enabled', 'picoclaw.status'] },
        },
      }),
      // Single query for both agents' last messages instead of N+1 separate findFirst calls
      db.agentMessage.findMany({
        where: { agent: { in: ['hermes', 'picoclaw'] } },
        orderBy: { timestamp: 'desc' },
        distinct: ['agent'],
      }),
    ])

    const agentConfigMap: Record<string, string> = {}
    for (const c of agentConfigs) {
      agentConfigMap[c.key] = c.value
    }

    const hermesLastMsg = lastMessages.find(m => m.agent === 'hermes') ?? null
    const picoclawLastMsg = lastMessages.find(m => m.agent === 'picoclaw') ?? null

    const agentStatus = {
      hermes: {
        enabled: agentConfigMap['hermes.enabled'] !== 'false',
        status: agentConfigMap['hermes.status'] || (agentConfigMap['hermes.enabled'] === 'false' ? 'offline' : 'online'),
        lastMessage: hermesLastMsg,
      },
      picoclaw: {
        enabled: agentConfigMap['picoclaw.enabled'] !== 'false',
        status: agentConfigMap['picoclaw.status'] || (agentConfigMap['picoclaw.enabled'] === 'false' ? 'offline' : 'online'),
        lastMessage: picoclawLastMsg,
      },
    }

    return NextResponse.json({
      success: true,
      data: {
        messages,
        agentStatus,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve agent messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent, role, content, missionId, metadata } = body as {
      agent: string
      role?: string
      content: string
      missionId?: string
      metadata?: Record<string, unknown>
    }

    if (!agent || !content) {
      return NextResponse.json(
        { success: false, error: 'agent and content are required' },
        { status: 400 }
      )
    }

    // Store the operator message
    const message = await db.agentMessage.create({
      data: {
        missionId: missionId || null,
        agent,
        role: role || 'command',
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    // If sending to PicoClaw, run a safety check using real telemetry data and respond
    if (agent === 'picoclaw') {
      const telemetrySnapshot = await getLatestTelemetrySnapshot()

      let picoclawResponseContent: string
      let safetyMeta: Record<string, unknown>

      if (telemetrySnapshot) {
        const safetyResult = picoclawCheck(telemetrySnapshot)
        picoclawResponseContent = safetyResult.safe
          ? `All systems nominal. ${safetyResult.alerts.length} minor alerts detected. No action required.`
          : `SAFETY ALERT: ${safetyResult.alerts.filter(a => a.level === 'critical').length} critical and ${safetyResult.alerts.filter(a => a.level === 'warning').length} warning conditions detected. Recommended actions: ${safetyResult.actions.map(a => a.type).join(', ')}`
        safetyMeta = {
          safetyResult: {
            safe: safetyResult.safe,
            alertCount: safetyResult.alerts.length,
            actionCount: safetyResult.actions.length,
          },
        }
      } else {
        picoclawResponseContent = 'No telemetry data available. Please ensure sensors are connected and sending data.'
        safetyMeta = { safetyResult: { safe: false, alertCount: 0, actionCount: 0, noData: true } }
      }

      const picoclawResponse = await db.agentMessage.create({
        data: {
          missionId: missionId || null,
          agent: 'picoclaw',
          role: 'response',
          content: picoclawResponseContent,
          metadata: JSON.stringify(safetyMeta),
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          sent: message,
          response: picoclawResponse,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { sent: message },
      message: 'Message sent to agent',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to send agent message' },
      { status: 500 }
    )
  }
}
