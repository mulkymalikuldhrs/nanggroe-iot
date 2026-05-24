// ============================================================
// NANGGROE OS AI - Agent Logic
// Hermes (strategic planner) + PicoClaw (tactical real-time)
// ============================================================

import ZAI from 'z-ai-web-dev-sdk'
import type {
  SystemContext,
  HermesResponse,
  PicoClawCheckResult,
  PicoClawAlert,
  PicoClawAction,
  TelemetrySnapshot,
} from './types'
import { SAFETY_THRESHOLDS } from './constants'

// --- Hermes System Prompt ---
const HERMES_SYSTEM_PROMPT = `You are Hermes, the strategic planning agent for NANGGROE OS AI — an autonomous modular robotics operating system designed for drone tricopter amphibious platforms.

## Your Role
You are the high-level strategic intelligence. You design missions, optimize routes, analyze terrain, and provide mission-critical recommendations. You work alongside PicoClaw, the tactical real-time safety agent.

## System Knowledge
- **Platform**: Tricopter amphibious drone (3 motors, waterproof, VTOL capable)
- **Region**: Aceh Utara, Indonesia (4.9°N, 97.1°E) — coastal, tropical climate
- **Sensors**: BME280 (temp/humidity/pressure), MPU6050 (IMU), GPS NEO-M8N, RPi Camera V2
- **Flight Controller**: Pixhawk 4 running ArduPilot
- **Companion Computer**: Raspberry Pi 4B
- **Max Altitude**: 120m (regulatory limit)
- **Battery**: 4S LiPo 4000mAh (14.8V nominal, 12.0V critical)
- **Communication**: SiK 433MHz radio (1km range)

## Mission Types You Can Plan
1. **Mapping** — Aerial photogrammetry with configurable overlap and GSD
2. **Survey** — Land survey with waypoint-based data collection
3. **Delivery** — Point-to-point payload delivery
4. **Patrol** — Repeated route surveillance
5. **Inspection** — Targeted infrastructure inspection
6. **Agriculture** — Precision agriculture (crop health, spraying)

## Response Format
Always respond with structured JSON:
{
  "type": "mission_plan" | "recommendation" | "alert" | "status" | "clarification",
  "content": "Human-readable explanation",
  "data": { ... relevant structured data ... },
  "priority": "low" | "medium" | "high" | "critical"
}

## Guidelines
- Always consider battery safety margins (land at 13.2V warning, 12.6V critical)
- Account for Aceh Utara weather patterns (high humidity, sudden rain)
- Include RTH (Return To Home) waypoints in all mission plans
- Consider radio signal degradation near buildings and terrain
- Provide realistic flight time estimates based on battery and payload
- When in doubt about safety, always recommend conservative action
- If the operator's request is unclear, ask for clarification rather than assuming

## Example Responses

For a mapping mission request:
{
  "type": "mission_plan",
  "content": "I've designed a mapping mission for the requested 2-hectare area near Lhokseumawe. The mission uses lawnmower pattern with 75/65 overlap for 2cm GSD at 50m altitude. Estimated flight time: 18 minutes with 22% battery margin. RTH at 13.5V.",
  "data": {
    "missionType": "mapping",
    "altitude": 50,
    "speed": 5,
    "overlapFront": 75,
    "overlapSide": 65,
    "gsd": 2.0,
    "estimatedFlightTime": 18,
    "batteryMargin": 22,
    "waypoints": [...]
  },
  "priority": "medium"
}

For a safety concern:
{
  "type": "alert",
  "content": "Wind speed estimates exceed 8 m/s based on weather data. Recommend postponing mapping mission or switching to heavier payload configuration for stability.",
  "data": { "windSpeed": 8.5, "maxSafeWindSpeed": 7, "recommendation": "postpone" },
  "priority": "high"
}`

/**
 * Hermes AI Response — Uses z-ai-web-dev-sdk for strategic planning.
 * Returns a structured HermesResponse object.
 */
export async function hermesRespond(
  prompt: string,
  context?: SystemContext
): Promise<HermesResponse> {
  try {
    const zai = new ZAI()

    // Build context message
    let contextMessage = ''
    if (context) {
      contextMessage = `\n\n## Current System Context
- Mode: ${context.mode}
- Active Mission: ${context.activeMission ? `${context.activeMission.name} (${context.activeMission.status})` : 'None'}
- Connected Devices: ${context.deviceCount} (${context.activeDeviceCount} active)
- Session Mode: ${context.sessionMode}`

      if (context.latestTelemetry) {
        const t = context.latestTelemetry
        contextMessage += `\n- Battery: ${t.battery_voltage}V | Altitude: ${t.altitude}m | Speed: ${t.speed}m/s
- GPS: ${t.gps_lat}°N, ${t.gps_lng}°E | Signal: ${t.signal_strength}dBm
- Temp: ${t.temperature}°C | Humidity: ${t.humidity}% | Pressure: ${t.pressure}hPa`
      }

      if (context.recentAlerts.length > 0) {
        contextMessage += `\n- Recent Alerts: ${context.recentAlerts.map(a => `[${a.level}] ${a.title}`).join(', ')}`
      }
    }

    const userMessage = prompt + contextMessage

    const response = await zai.chat.completions.create({
      model: 'default',
      messages: [
        { role: 'system', content: HERMES_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    })

    const responseContent = response.choices?.[0]?.message?.content || ''

    // Try to parse structured JSON from the response
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : responseContent
      const parsed = JSON.parse(jsonStr)

      if (parsed.type && parsed.content) {
        return {
          type: parsed.type || 'status',
          content: parsed.content,
          data: parsed.data,
          priority: parsed.priority || 'medium',
        }
      }
    } catch {
      // Not valid JSON, treat as plain text response
    }

    // Fallback: wrap the response in a standard structure
    return {
      type: 'status',
      content: responseContent,
      priority: 'medium',
    }
  } catch (error) {
    console.error('[Hermes] AI response error:', error)
    return {
      type: 'alert',
      content: 'I encountered an error processing your request. The AI service may be temporarily unavailable. Please try again or use manual mission planning.',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      priority: 'high',
    }
  }
}

/**
 * PicoClaw Safety Check — Deterministic real-time safety analysis.
 * Does NOT use AI — purely rule-based safety monitoring.
 */
export function picoclawCheck(telemetry: TelemetrySnapshot): PicoClawCheckResult {
  const alerts: PicoClawAlert[] = []
  const actions: PicoClawAction[] = []

  // Battery voltage checks
  if (telemetry.battery_voltage <= SAFETY_THRESHOLDS.battery_voltage.critical) {
    alerts.push({
      level: 'critical',
      metric: 'battery_voltage',
      message: `CRITICAL: Battery voltage at ${telemetry.battery_voltage}V — immediate landing required`,
      currentValue: telemetry.battery_voltage,
      threshold: SAFETY_THRESHOLDS.battery_voltage.critical,
    })
    actions.push({
      type: 'rth',
      reason: `Battery critically low at ${telemetry.battery_voltage}V`,
    })
  } else if (telemetry.battery_voltage <= SAFETY_THRESHOLDS.battery_voltage.warning) {
    alerts.push({
      level: 'warning',
      metric: 'battery_voltage',
      message: `WARNING: Battery voltage at ${telemetry.battery_voltage}V — consider returning to home`,
      currentValue: telemetry.battery_voltage,
      threshold: SAFETY_THRESHOLDS.battery_voltage.warning,
    })
    actions.push({
      type: 'alert_operator',
      reason: `Battery low at ${telemetry.battery_voltage}V`,
    })
  }

  // Signal strength checks
  if (telemetry.signal_strength <= SAFETY_THRESHOLDS.signal_strength.critical) {
    alerts.push({
      level: 'critical',
      metric: 'signal_strength',
      message: `CRITICAL: Signal strength at ${telemetry.signal_strength}dBm — risk of control link loss`,
      currentValue: telemetry.signal_strength,
      threshold: SAFETY_THRESHOLDS.signal_strength.critical,
    })
    actions.push({
      type: 'rth',
      reason: `Signal critically weak at ${telemetry.signal_strength}dBm`,
    })
  } else if (telemetry.signal_strength <= SAFETY_THRESHOLDS.signal_strength.warning) {
    alerts.push({
      level: 'warning',
      metric: 'signal_strength',
      message: `WARNING: Signal strength at ${telemetry.signal_strength}dBm — approaching link loss threshold`,
      currentValue: telemetry.signal_strength,
      threshold: SAFETY_THRESHOLDS.signal_strength.warning,
    })
    actions.push({
      type: 'reduce_speed',
      reason: `Signal weak at ${telemetry.signal_strength}dBm — slowing to conserve link`,
    })
  }

  // Altitude checks
  if (telemetry.altitude >= SAFETY_THRESHOLDS.altitude.critical) {
    alerts.push({
      level: 'critical',
      metric: 'altitude',
      message: `CRITICAL: Altitude at ${telemetry.altitude}m — exceeds regulatory limit`,
      currentValue: telemetry.altitude,
      threshold: SAFETY_THRESHOLDS.altitude.critical,
    })
    actions.push({
      type: 'land',
      reason: `Altitude exceeds limit at ${telemetry.altitude}m`,
    })
  } else if (telemetry.altitude >= SAFETY_THRESHOLDS.altitude.warning) {
    alerts.push({
      level: 'warning',
      metric: 'altitude',
      message: `WARNING: Altitude at ${telemetry.altitude}m — approaching regulatory limit`,
      currentValue: telemetry.altitude,
      threshold: SAFETY_THRESHOLDS.altitude.warning,
    })
  }

  // Temperature checks
  if (telemetry.temperature >= SAFETY_THRESHOLDS.temperature.critical) {
    alerts.push({
      level: 'critical',
      metric: 'temperature',
      message: `CRITICAL: Temperature at ${telemetry.temperature}°C — risk of component failure`,
      currentValue: telemetry.temperature,
      threshold: SAFETY_THRESHOLDS.temperature.critical,
    })
    actions.push({
      type: 'land',
      reason: `Temperature critical at ${telemetry.temperature}°C`,
    })
  } else if (telemetry.temperature >= SAFETY_THRESHOLDS.temperature.warning) {
    alerts.push({
      level: 'warning',
      metric: 'temperature',
      message: `WARNING: Temperature at ${telemetry.temperature}°C — monitor closely`,
      currentValue: telemetry.temperature,
      threshold: SAFETY_THRESHOLDS.temperature.warning,
    })
  }

  // Current draw checks
  if (telemetry.current_draw >= SAFETY_THRESHOLDS.current_draw.critical) {
    alerts.push({
      level: 'critical',
      metric: 'current_draw',
      message: `CRITICAL: Current draw at ${telemetry.current_draw}A — possible motor or ESC issue`,
      currentValue: telemetry.current_draw,
      threshold: SAFETY_THRESHOLDS.current_draw.critical,
    })
    actions.push({
      type: 'land',
      reason: `Excessive current draw at ${telemetry.current_draw}A`,
    })
  } else if (telemetry.current_draw >= SAFETY_THRESHOLDS.current_draw.warning) {
    alerts.push({
      level: 'warning',
      metric: 'current_draw',
      message: `WARNING: Current draw at ${telemetry.current_draw}A — above normal operating range`,
      currentValue: telemetry.current_draw,
      threshold: SAFETY_THRESHOLDS.current_draw.warning,
    })
    actions.push({
      type: 'reduce_speed',
      reason: `High current draw at ${telemetry.current_draw}A`,
    })
  }

  // Speed checks
  if (telemetry.speed >= SAFETY_THRESHOLDS.speed.critical) {
    alerts.push({
      level: 'critical',
      metric: 'speed',
      message: `CRITICAL: Speed at ${telemetry.speed}m/s — exceeds safe operating speed`,
      currentValue: telemetry.speed,
      threshold: SAFETY_THRESHOLDS.speed.critical,
    })
    actions.push({
      type: 'reduce_speed',
      reason: `Speed critical at ${telemetry.speed}m/s`,
    })
  } else if (telemetry.speed >= SAFETY_THRESHOLDS.speed.warning) {
    alerts.push({
      level: 'warning',
      metric: 'speed',
      message: `WARNING: Speed at ${telemetry.speed}m/s — above recommended cruise speed`,
      currentValue: telemetry.speed,
      threshold: SAFETY_THRESHOLDS.speed.warning,
    })
  }

  // Motor asymmetry check (if motors are running)
  if (telemetry.motor_rpm_1 > 0 && telemetry.motor_rpm_2 > 0 && telemetry.motor_rpm_3 > 0) {
    const rpms = [telemetry.motor_rpm_1, telemetry.motor_rpm_2, telemetry.motor_rpm_3]
    const avgRpm = rpms.reduce((a, b) => a + b, 0) / 3
    const maxDeviation = Math.max(...rpms.map(r => Math.abs(r - avgRpm)))
    const deviationPercent = (maxDeviation / avgRpm) * 100

    if (deviationPercent > 15) {
      alerts.push({
        level: 'critical',
        metric: 'motor_rpm',
        message: `CRITICAL: Motor RPM asymmetry detected — ${deviationPercent.toFixed(1)}% deviation between motors`,
        currentValue: deviationPercent,
        threshold: 15,
      })
      actions.push({
        type: 'hover',
        reason: `Motor RPM asymmetry at ${deviationPercent.toFixed(1)}%`,
      })
    } else if (deviationPercent > 8) {
      alerts.push({
        level: 'warning',
        metric: 'motor_rpm',
        message: `WARNING: Motor RPM asymmetry — ${deviationPercent.toFixed(1)}% deviation between motors`,
        currentValue: deviationPercent,
        threshold: 8,
      })
    }
  }

  return {
    safe: alerts.filter(a => a.level === 'critical').length === 0,
    alerts,
    actions,
  }
}
