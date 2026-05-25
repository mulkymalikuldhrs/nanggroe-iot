import { NextRequest, NextResponse } from 'next/server'
import { CommunicationService } from '@/lib/communication'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const service = CommunicationService.getInstance()
    const result = await service.sendBeep(body.pattern || 'warning')
    return NextResponse.json({ success: result.sent, data: result })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
