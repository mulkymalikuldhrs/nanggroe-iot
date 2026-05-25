// ============================================================
// NANGGROE OS AI - Self-Learning API Route
// GET    /api/self-learn — Get learning status, reports, suggestions, performance
// POST   /api/self-learn — Record decisions, trigger analysis, auto-tune
// PUT    /api/self-learn — Review decisions, apply suggestions
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSelfLearnService } from '@/lib/self-learn'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    const service = getSelfLearnService()

    switch (action) {
      case 'status': {
        const stats = await service.getStats()
        return NextResponse.json({ success: true, data: stats })
      }

      case 'report': {
        const periodHours = parseInt(searchParams.get('periodHours') || '168', 10)
        const report = await service.generateLearningReport(periodHours)
        return NextResponse.json({ success: true, data: report })
      }

      case 'suggestions': {
        const suggestions = await service.suggestImprovements()
        return NextResponse.json({ success: true, data: { suggestions, total: suggestions.length } })
      }

      case 'performance': {
        const performance = await service.trackPerformance()
        return NextResponse.json({ success: true, data: performance })
      }

      case 'patterns': {
        const metric = searchParams.get('metric') as string | undefined
        const hours = parseInt(searchParams.get('hours') || '24', 10)
        const patterns = await service.analyzePatterns(
          metric as 'battery_voltage' | 'altitude' | 'speed' | 'temperature' | 'signal_strength' | 'current_draw' | undefined,
          hours
        )
        return NextResponse.json({ success: true, data: { patterns, total: patterns.length } })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}. Valid actions: status, report, suggestions, performance, patterns` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[SelfLearn API] GET error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get learning data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const service = getSelfLearnService()

    if (!body.action) {
      return NextResponse.json(
        { success: false, error: 'action is required in request body' },
        { status: 400 }
      )
    }

    switch (body.action) {
      case 'record_decision': {
        const { agentName, decisionType, context, action, expectedOutcome, confidence, telemetrySnapshot } = body
        if (!agentName || !decisionType || !context || !action || !expectedOutcome) {
          return NextResponse.json(
            { success: false, error: 'agentName, decisionType, context, action, and expectedOutcome are required' },
            { status: 400 }
          )
        }
        const record = await service.recordDecision(
          agentName, decisionType, context, action, expectedOutcome, confidence || 0.5, telemetrySnapshot
        )
        return NextResponse.json({ success: true, data: record }, { status: 201 })
      }

      case 'analyze': {
        const metric = body.metric as string | undefined
        const hours = body.hours || 24
        const patterns = await service.analyzePatterns(
          metric as 'battery_voltage' | 'altitude' | 'speed' | 'temperature' | 'signal_strength' | 'current_draw' | undefined,
          hours
        )
        return NextResponse.json({ success: true, data: { patterns, total: patterns.length } })
      }

      case 'auto_tune': {
        const { key, newValue, reason } = body
        if (!key || newValue === undefined || !reason) {
          return NextResponse.json(
            { success: false, error: 'key, newValue, and reason are required' },
            { status: 400 }
          )
        }
        const result = await service.autoTuneParameter(key, newValue, reason)
        if (!result) {
          return NextResponse.json(
            { success: false, error: 'Failed to auto-tune parameter. It may not exist or is non-numeric.' },
            { status: 400 }
          )
        }
        return NextResponse.json({ success: true, data: result })
      }

      case 'generate_report': {
        const periodHours = body.periodHours || 168
        const report = await service.generateLearningReport(periodHours)
        return NextResponse.json({ success: true, data: report })
      }

      case 'transfer_knowledge': {
        const { sourceProjectId, targetProjectId, category, knowledge } = body
        if (!sourceProjectId || !targetProjectId || !category || !knowledge) {
          return NextResponse.json(
            { success: false, error: 'sourceProjectId, targetProjectId, category, and knowledge are required' },
            { status: 400 }
          )
        }
        const result = await service.transferKnowledge({ sourceProjectId, targetProjectId, category, knowledge })
        return NextResponse.json({ success: true, data: result })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${body.action}. Valid actions: record_decision, analyze, auto_tune, generate_report, transfer_knowledge` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[SelfLearn API] POST error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process learning action' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const service = getSelfLearnService()

    if (!body.action) {
      return NextResponse.json(
        { success: false, error: 'action is required in request body' },
        { status: 400 }
      )
    }

    switch (body.action) {
      case 'review_decision': {
        const { decisionId, actualOutcome, outcomeSuccess } = body
        if (!decisionId || !actualOutcome || outcomeSuccess === undefined) {
          return NextResponse.json(
            { success: false, error: 'decisionId, actualOutcome, and outcomeSuccess are required' },
            { status: 400 }
          )
        }
        const reviewed = await service.reviewDecision(decisionId, actualOutcome, outcomeSuccess)
        if (!reviewed) {
          return NextResponse.json(
            { success: false, error: `Decision ${decisionId} not found` },
            { status: 404 }
          )
        }
        return NextResponse.json({ success: true, data: reviewed })
      }

      case 'apply_suggestion': {
        const { key, newValue, reason } = body
        if (!key || newValue === undefined || !reason) {
          return NextResponse.json(
            { success: false, error: 'key, newValue, and reason are required' },
            { status: 400 }
          )
        }
        const result = await service.autoTuneParameter(key, newValue, reason)
        if (!result) {
          return NextResponse.json(
            { success: false, error: 'Failed to apply suggestion. Parameter may not exist or is non-numeric.' },
            { status: 400 }
          )
        }
        return NextResponse.json({ success: true, data: result })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${body.action}. Valid actions: review_decision, apply_suggestion` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[SelfLearn API] PUT error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update learning data' },
      { status: 500 }
    )
  }
}
