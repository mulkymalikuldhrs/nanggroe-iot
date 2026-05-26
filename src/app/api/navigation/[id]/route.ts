import { NextRequest, NextResponse } from 'next/server'
import { NavigationService } from '@/lib/navigation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const service = NavigationService.getInstance()
    const plan = await service.getPlan(id)

    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const service = NavigationService.getInstance()

    if (body.action === 'activate') {
      const plan = await service.activatePlan(id)
      return NextResponse.json({ success: true, data: plan })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const service = NavigationService.getInstance()
    const plan = await service.getPlan(id)
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }
    const deleted = await service.deletePlan(id)
    return NextResponse.json({ success: deleted })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
