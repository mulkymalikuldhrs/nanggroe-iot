import { NextRequest, NextResponse } from 'next/server'
import { NavigationService } from '@/lib/navigation'

export async function GET(request: NextRequest) {
  try {
    const service = NavigationService.getInstance()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as string | undefined

    const plans = await service.listPlans(
      type as 'gps_track' | 'autopilot' | 'rth' | 'field_mapping' | 'survey' | 'delivery' | undefined
    )
    return NextResponse.json({ success: true, data: plans })
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
    const service = NavigationService.getInstance()

    let plan
    if (body.action === 'field-mapping') {
      plan = await service.generateFieldMappingPlan(
        body.name,
        body.areaPolygon,
        body.altitude,
        body.overlapFront,
        body.overlapSide,
        body.speed
      )
    } else if (body.action === 'delivery') {
      plan = await service.generateDeliveryPlan(body.name, body.task, body.projectId)
    } else if (body.action === 'rth') {
      const result = await service.executeRTH()
      return NextResponse.json({ success: true, data: result })
    } else {
      plan = await service.createPlan(
        body.name,
        body.type || 'gps_track',
        body.waypoints || [],
        body.homePosition,
        body.parameters,
        body.projectId
      )
    }

    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
