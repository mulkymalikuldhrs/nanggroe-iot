// ============================================================
// NANGGROE IOT - Alerts SSE Stream
// GET /api/stream/alerts — Real-time alerts via Server-Sent Events
// Polls for unread/unresolved alerts every 5 seconds
// ============================================================

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

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
          const alerts = await db.alert.findMany({
            where: {
              isRead: false,
              isResolved: false,
            },
            orderBy: { timestamp: 'desc' },
            take: 20,
          })

          const stats = {
            unread: await db.alert.count({ where: { isRead: false } }),
            unresolved: await db.alert.count({ where: { isResolved: false } }),
            critical: await db.alert.count({ where: { level: 'critical', isResolved: false } }),
            warning: await db.alert.count({ where: { level: 'warning', isResolved: false } }),
          }

          sendEvent({
            type: 'alerts',
            alerts,
            stats,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          sendEvent({
            type: 'error',
            message: 'Failed to fetch alerts',
            timestamp: new Date().toISOString(),
          })
        }
      }, 5000)

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
