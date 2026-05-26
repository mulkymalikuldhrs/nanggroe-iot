import { NextRequest, NextResponse } from 'next/server'
import { PowerService } from '@/lib/power'

export async function GET() {
  try {
    const service = PowerService.getInstance()
    await service.initializeDefaults()
    const [sources, status] = await Promise.all([
      service.listPowerSources(),
      service.getPowerStatus(),
    ])
    return NextResponse.json({ success: true, data: { sources, status } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.sourceId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: sourceId' },
        { status: 400 }
      )
    }

    const service = PowerService.getInstance()
    const source = await service.updateReading(body.sourceId, body.reading)
    return NextResponse.json({ success: true, data: source })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
