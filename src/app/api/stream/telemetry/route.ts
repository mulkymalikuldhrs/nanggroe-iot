// ============================================================
// NANGGROE OS AI - Telemetry SSE Stream
// GET /api/stream/telemetry — Real-time telemetry via Server-Sent Events
// Sends telemetry snapshot + PicoClaw safety check every 2 seconds
// ============================================================

import { NextRequest } from 'next/server'
import { getLatestTelemetrySnapshot } from '@/lib/telemetry'
import { picoclawCheck } from '@/lib/agents'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Stream may be closed
        }
      }

      // Send initial connection event
      sendEvent({ type: 'connected', timestamp: new Date().toISOString() })

      const interval = setInterval(async () => {
        try {
          const snapshot = await getLatestTelemetrySnapshot()
          if (snapshot) {
            const safetyResult = picoclawCheck(snapshot)
            sendEvent({
              type: 'telemetry',
              snapshot,
              safety: {
                safe: safetyResult.safe,
                alertCount: safetyResult.alerts.length,
                alerts: safetyResult.alerts,
              },
              timestamp: new Date().toISOString(),
            })
          } else {
            sendEvent({ type: 'no_data', timestamp: new Date().toISOString() })
          }
        } catch (error) {
          sendEvent({
            type: 'error',
            message: 'Failed to fetch telemetry',
            timestamp: new Date().toISOString(),
          })
        }
      }, 2000)

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
