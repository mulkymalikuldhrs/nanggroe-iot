import { NextRequest, NextResponse } from 'next/server'
import { AiMemoryService } from '@/lib/ai-memory'

export async function GET(request: NextRequest) {
  try {
    const service = AiMemoryService.getInstance()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as string | undefined
    const query = searchParams.get('query') as string | undefined

    if (searchParams.get('stats') === 'true') {
      const stats = await service.getStats()
      return NextResponse.json({ success: true, data: stats })
    }

    const entries = await service.search(
      category as 'conversation' | 'decision' | 'learning' | 'pattern' | 'preference' | undefined,
      query || undefined
    )
    return NextResponse.json({ success: true, data: entries })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const service = AiMemoryService.getInstance()

    if (body.action === 'sync') {
      const result = await service.syncToCloud()
      return NextResponse.json({ success: true, data: result })
    }

    if (body.action === 'recall') {
      const entry = await service.recall(body.category, body.key)
      return NextResponse.json({ success: true, data: entry })
    }

    const entry = await service.remember(
      body.category,
      body.key,
      body.value,
      body.context,
      body.confidence || 1.0,
      body.projectId
    )
    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const service = AiMemoryService.getInstance()
    const deleted = await service.forget(body.memoryId)
    return NextResponse.json({ success: deleted })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
