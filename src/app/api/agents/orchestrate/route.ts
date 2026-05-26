// ============================================================
// NANGGROE IOT - Agent Orchestration API
// GET  /api/agents/orchestrate — Get orchestrator status
// POST /api/agents/orchestrate — Control orchestrator
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { AgentOrchestrator } from '@/lib/agent-orchestrator'

export async function GET() {
  try {
    const orchestrator = AgentOrchestrator.getInstance()
    const status = orchestrator.getStatus()
    const agentStatuses = orchestrator.getAllAgentStatuses()
    const taskQueue = orchestrator.getTaskQueue()
    const commLog = orchestrator.getCommunicationLog(30)

    return NextResponse.json({
      success: true,
      data: {
        orchestrator: status,
        agents: agentStatuses,
        taskQueue: taskQueue.map(t => ({
          id: t.id,
          type: t.type,
          agent: t.agent,
          priority: t.priority,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          startedAt: t.startedAt?.toISOString() || null,
          completedAt: t.completedAt?.toISOString() || null,
        })),
        communicationLog: commLog.map(l => ({
          id: l.id,
          from: l.from,
          to: l.to,
          type: l.type,
          priority: l.priority,
          payloadSummary: l.payloadSummary,
          timestamp: l.timestamp.toISOString(),
        })),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get orchestrator status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body as { action: string; [key: string]: unknown }

    const orchestrator = AgentOrchestrator.getInstance()

    switch (action) {
      case 'start': {
        orchestrator.registerDefaultAgents()
        await orchestrator.start()
        return NextResponse.json({
          success: true,
          data: { running: true, message: 'Orchestrator started with all default agents' },
        })
      }

      case 'stop': {
        await orchestrator.stop()
        return NextResponse.json({
          success: true,
          data: { running: false, message: 'Orchestrator stopped' },
        })
      }

      case 'submit_task': {
        const { type, agent, priority, payload, missionId, projectId } = body as {
          type: string
          agent: string
          priority?: string
          payload: unknown
          missionId?: string
          projectId?: string
        }
        if (!type || !agent) {
          return NextResponse.json(
            { success: false, error: 'type and agent are required' },
            { status: 400 }
          )
        }
        const taskId = await orchestrator.submitTaskToDb({
          type,
          agent,
          priority: priority || 'normal',
          payload: payload || {},
          missionId,
          projectId,
        })
        return NextResponse.json({
          success: true,
          data: { taskId, message: 'Task submitted to queue' },
        })
      }

      case 'cancel_task': {
        const { taskId } = body as { taskId: string }
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          )
        }
        orchestrator.cancelTask(taskId)
        return NextResponse.json({
          success: true,
          data: { message: 'Task cancelled' },
        })
      }

      case 'send_message': {
        const { from, to, type: msgType, payload: msgPayload, priority: msgPriority } = body as {
          from: string
          to: string
          type: string
          payload: unknown
          priority?: string
        }
        if (!from || !to || !msgType) {
          return NextResponse.json(
            { success: false, error: 'from, to, and type are required' },
            { status: 400 }
          )
        }
        if (to === '*') {
          orchestrator.broadcast(from, {
            type: msgType,
            payload: msgPayload || {},
            priority: (msgPriority || 'normal') as 'critical' | 'high' | 'normal' | 'low',
          })
        } else {
          orchestrator.sendMessage(from, to, {
            type: msgType,
            payload: msgPayload || {},
            priority: (msgPriority || 'normal') as 'critical' | 'high' | 'normal' | 'low',
          })
        }
        return NextResponse.json({
          success: true,
          data: { message: `Message sent from ${from} to ${to}` },
        })
      }

      case 'register_agent': {
        const { agentName } = body as { agentName: string }
        // For now, only support default agents
        const defaultAgentNames = ['hermes', 'picoclaw', 'sentinel', 'navigator', 'comms_guard', 'data_steward']
        if (!defaultAgentNames.includes(agentName)) {
          return NextResponse.json(
            { success: false, error: `Unknown agent: ${agentName}. Available: ${defaultAgentNames.join(', ')}` },
            { status: 400 }
          )
        }
        // Re-register all defaults (idempotent)
        orchestrator.registerDefaultAgents()
        return NextResponse.json({
          success: true,
          data: { message: `Agent "${agentName}" registered` },
        })
      }

      case 'unregister_agent': {
        const { agentName } = body as { agentName: string }
        orchestrator.unregisterAgent(agentName)
        return NextResponse.json({
          success: true,
          data: { message: `Agent "${agentName}" unregistered` },
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}. Available: start, stop, submit_task, cancel_task, send_message, register_agent, unregister_agent` },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process orchestration request' },
      { status: 500 }
    )
  }
}
