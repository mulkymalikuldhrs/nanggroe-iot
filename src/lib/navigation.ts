// ============================================================
// NANGGROE OS AI - Navigation Service
// GPS tracking, Autopilot, Return-to-Home, Field mapping,
// Measurement, Payload delivery
// ============================================================

import { db } from './db'
import { getLatestTelemetrySnapshot } from './telemetry'
import type {
  NavigationType,
  NavigationStatus,
  NavigationPlanSummary,
  Waypoint,
  FieldMappingResult,
  DeliveryTask,
} from './types'

// ============================================================
// NavigationService
// ============================================================

export class NavigationService {
  private static instance: NavigationService

  private constructor() {}

  static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService()
    }
    return NavigationService.instance
  }

  /**
   * Create a navigation plan
   */
  async createPlan(
    name: string,
    type: NavigationType,
    waypoints: Waypoint[],
    homePosition?: { lat: number; lng: number; alt: number },
    parameters?: Record<string, unknown>,
    projectId?: string
  ): Promise<NavigationPlanSummary> {
    const plan = await db.navigationPlan.create({
      data: {
        name,
        type,
        status: 'idle',
        waypoints: JSON.stringify(waypoints),
        homePosition: homePosition ? JSON.stringify(homePosition) : null,
        parameters: parameters ? JSON.stringify(parameters) : null,
        projectId: projectId || null,
      },
    })

    return this.planToSummary(plan)
  }

  /**
   * List all navigation plans
   */
  async listPlans(type?: NavigationType, status?: NavigationStatus): Promise<NavigationPlanSummary[]> {
    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (status) where.status = status

    const plans = await db.navigationPlan.findMany({ where, orderBy: { createdAt: 'desc' } })
    return plans.map(p => this.planToSummary(p))
  }

  /**
   * Get plan by ID
   */
  async getPlan(planId: string): Promise<NavigationPlanSummary | null> {
    const plan = await db.navigationPlan.findUnique({ where: { id: planId } })
    if (!plan) return null
    return this.planToSummary(plan)
  }

  /**
   * Activate a navigation plan (start execution)
   */
  async activatePlan(planId: string): Promise<NavigationPlanSummary> {
    const plan = await db.navigationPlan.findUnique({ where: { id: planId } })
    if (!plan) throw new Error('Plan not found')

    // Get current position for RTH reference
    const telemetry = await getLatestTelemetrySnapshot()

    const updated = await db.navigationPlan.update({
      where: { id: planId },
      data: {
        status: 'active',
        startedAt: new Date(),
        homePosition: plan.homePosition || JSON.stringify({
          lat: telemetry?.gps_lat ?? 4.9125,
          lng: telemetry?.gps_lng ?? 97.1347,
          alt: telemetry?.altitude ?? 0,
        }),
      },
    })

    return this.planToSummary(updated)
  }

  /**
   * Generate field mapping plan for an area
   * Creates lawnmower pattern waypoints for agricultural mapping
   */
  async generateFieldMappingPlan(
    name: string,
    areaPolygon: Array<{ lat: number; lng: number }>,
    altitude: number = 50,
    overlapFront: number = 75,
    overlapSide: number = 65,
    speed: number = 5
  ): Promise<NavigationPlanSummary> {
    // Calculate bounding box
    const lats = areaPolygon.map(p => p.lat)
    const lngs = areaPolygon.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Camera parameters (Pi Camera V2)
    const sensorWidth = 3.68 // mm
    const focalLength = 3.04 // mm
    const imageWidth = 3280 // pixels
    const gsd = (altitude * sensorWidth * 100) / (focalLength * imageWidth) // cm/pixel

    // Calculate spacing based on overlap
    const footprintWidth = (altitude * sensorWidth) / focalLength // meters
    const footprintHeight = footprintWidth * (2464 / 3280) // 4:3 aspect
    const sideSpacing = footprintWidth * (1 - overlapSide / 100)
    const frontSpacing = footprintHeight * (1 - overlapFront / 100)

    // Generate lawnmower waypoints
    const waypoints: Waypoint[] = []
    let lineIndex = 0
    let currentLng = minLng + sideSpacing / 2

    while (currentLng <= maxLng) {
      if (lineIndex % 2 === 0) {
        // Fly north
        waypoints.push({
          lat: minLat,
          lng: currentLng,
          alt: altitude,
          action: lineIndex === 0 ? 'takeoff' : 'fly',
          speed,
        })
        waypoints.push({
          lat: maxLat,
          lng: currentLng,
          alt: altitude,
          action: 'take_photo',
          speed,
        })
      } else {
        // Fly south
        waypoints.push({
          lat: maxLat,
          lng: currentLng,
          alt: altitude,
          action: 'fly',
          speed,
        })
        waypoints.push({
          lat: minLat,
          lng: currentLng,
          alt: altitude,
          action: 'take_photo',
          speed,
        })
      }

      currentLng += sideSpacing
      lineIndex++
    }

    // Add RTH waypoint
    waypoints.push({
      lat: areaPolygon[0]?.lat ?? 4.9125,
      lng: areaPolygon[0]?.lng ?? 97.1347,
      alt: altitude,
      action: 'land',
    })

    const plan = await db.navigationPlan.create({
      data: {
        name,
        type: 'field_mapping',
        status: 'idle',
        waypoints: JSON.stringify(waypoints),
        homePosition: JSON.stringify({ lat: areaPolygon[0]?.lat ?? 4.9125, lng: areaPolygon[0]?.lng ?? 97.1347, alt: 0 }),
        areaPolygon: JSON.stringify(areaPolygon),
        parameters: JSON.stringify({
          altitude,
          overlapFront,
          overlapSide,
          speed,
          gsd: Math.round(gsd * 100) / 100,
          frontSpacing: Math.round(frontSpacing * 100) / 100,
          sideSpacing: Math.round(sideSpacing * 100) / 100,
          estimatedPhotos: waypoints.filter(w => w.action === 'take_photo').length,
        }),
      },
    })

    return this.planToSummary(plan)
  }

  /**
   * Calculate field mapping results
   */
  async calculateMappingResults(planId: string): Promise<FieldMappingResult> {
    const plan = await db.navigationPlan.findUnique({ where: { id: planId } })
    if (!plan) throw new Error('Plan not found')

    const params = plan.parameters ? JSON.parse(plan.parameters) : {}
    const areaPolygon = plan.areaPolygon ? JSON.parse(plan.areaPolygon) : []

    // Calculate area using Shoelace formula (approximate for small areas)
    let areaSqMeters = 0
    if (areaPolygon.length >= 3) {
      for (let i = 0; i < areaPolygon.length; i++) {
        const j = (i + 1) % areaPolygon.length
        const lat1 = areaPolygon[i].lat * 111320 // meters per degree lat
        const lat2 = areaPolygon[j].lat * 111320
        const lng1 = areaPolygon[i].lng * 111320 * Math.cos(areaPolygon[i].lat * Math.PI / 180)
        const lng2 = areaPolygon[j].lng * 111320 * Math.cos(areaPolygon[j].lat * Math.PI / 180)
        areaSqMeters += lat1 * lng2 - lat2 * lng1
      }
      areaSqMeters = Math.abs(areaSqMeters) / 2
    }

    const areaHectares = Math.round((areaSqMeters / 10000) * 100) / 100
    const gsd = params.gsd || 2.0
    const waypoints = JSON.parse(plan.waypoints) as Waypoint[]
    const photosTaken = waypoints.filter(w => w.action === 'take_photo').length

    // Estimate flight time
    const speed = params.speed || 5
    const totalDistance = this.estimateTotalDistance(waypoints)
    const flightTime = Math.round(totalDistance / speed / 60) // minutes

    return {
      areaHectares,
      photosTaken,
      gsdCmPerPixel: gsd,
      overlapPercent: params.overlapFront || 75,
      flightTime,
      coveragePercent: 100,
    }
  }

  /**
   * Generate delivery plan
   */
  async generateDeliveryPlan(
    name: string,
    task: DeliveryTask,
    projectId?: string
  ): Promise<NavigationPlanSummary> {
    const waypoints: Waypoint[] = [
      { lat: task.pickupPoint.lat, lng: task.pickupPoint.lng, alt: task.pickupPoint.alt + 20, action: 'takeoff' },
      { lat: task.pickupPoint.lat, lng: task.pickupPoint.lng, alt: task.pickupPoint.alt, action: 'hover', hoverTime: 5 },
      { lat: task.dropPoint.lat, lng: task.dropPoint.lng, alt: task.dropPoint.alt + 20, action: 'fly' },
      { lat: task.dropPoint.lat, lng: task.dropPoint.lng, alt: task.dropPoint.alt, action: 'hover', hoverTime: 3 },
      { lat: task.pickupPoint.lat, lng: task.pickupPoint.lng, alt: task.pickupPoint.alt + 20, action: 'fly' },
      { lat: task.pickupPoint.lat, lng: task.pickupPoint.lng, alt: 0, action: 'land' },
    ]

    const plan = await db.navigationPlan.create({
      data: {
        name,
        type: 'delivery',
        status: 'idle',
        waypoints: JSON.stringify(waypoints),
        homePosition: JSON.stringify(task.pickupPoint),
        parameters: JSON.stringify({
          payloadWeight: task.payloadWeight,
          dropCommand: task.dropCommand,
          task,
        }),
        projectId: projectId || null,
      },
    })

    return this.planToSummary(plan)
  }

  /**
   * Execute Return to Home
   */
  async executeRTH(): Promise<{ success: boolean; homePosition: { lat: number; lng: number; alt: number } | null }> {
    const telemetry = await getLatestTelemetrySnapshot()

    // Get home position from config
    const homeLat = await db.systemConfig.findUnique({ where: { key: 'system.home_lat' } })
    const homeLng = await db.systemConfig.findUnique({ where: { key: 'system.home_lng' } })

    const homePosition = {
      lat: homeLat ? parseFloat(homeLat.value) : 4.9125,
      lng: homeLng ? parseFloat(homeLng.value) : 97.1347,
      alt: 0,
    }

    // Create alert
    await db.alert.create({
      data: {
        level: 'warning',
        source: 'picoclaw',
        title: 'Return to Home Activated',
        message: `Autopilot RTH: Kembali ke ${homePosition.lat}°N, ${homePosition.lng}°E. Altitude saat ini: ${telemetry?.altitude ?? 0}m`,
        category: 'safety',
        isRead: false,
      },
    })

    return { success: true, homePosition }
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId: string): Promise<boolean> {
    try {
      await db.navigationPlan.delete({ where: { id: planId } })
      return true
    } catch {
      return false
    }
  }

  // --- Helpers ---

  private planToSummary(plan: {
    id: string
    name: string
    type: string
    status: string
    waypoints: string
    homePosition: string | null
    startedAt: Date | null
    completedAt: Date | null
    createdAt: Date
  }): NavigationPlanSummary {
    return {
      id: plan.id,
      name: plan.name,
      type: plan.type as NavigationType,
      status: plan.status as NavigationStatus,
      waypoints: JSON.parse(plan.waypoints) as Waypoint[],
      homePosition: plan.homePosition ? JSON.parse(plan.homePosition) : null,
      startedAt: plan.startedAt?.toISOString() || null,
      completedAt: plan.completedAt?.toISOString() || null,
      createdAt: plan.createdAt.toISOString(),
    }
  }

  private estimateTotalDistance(waypoints: Waypoint[]): number {
    let total = 0
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1]
      const curr = waypoints[i]
      const dLat = (curr.lat - prev.lat) * 111320
      const dLng = (curr.lng - prev.lng) * 111320 * Math.cos(prev.lat * Math.PI / 180)
      total += Math.sqrt(dLat * dLat + dLng * dLng)
    }
    return total
  }
}
