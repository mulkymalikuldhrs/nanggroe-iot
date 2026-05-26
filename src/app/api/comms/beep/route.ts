import { NextRequest, NextResponse } from 'next/server'
import { CommunicationService } from '@/lib/communication'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validPatterns = ['warning', 'alert', 'success', 'error', 'startup', 'shutdown', 'notify']
    if (body.pattern && !validPatterns.includes(body.pattern)) {
      return NextResponse.json(
        { success: false, error: `Invalid pattern. Must be one of: ${validPatterns.join(', ')}` },
        { status: 400 }
      )
    }

    const service = CommunicationService.getInstance()
    const result = await service.sendBeep(body.pattern || 'warning')
    return NextResponse.json({ success: result.played, data: result })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
