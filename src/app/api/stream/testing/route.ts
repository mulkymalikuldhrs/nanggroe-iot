// ============================================================
// NANGGROE OS AI - Testing SSE Stream
// GET /api/stream/testing — Real-time test execution progress
// Sends test status updates, results, and progress events
// ============================================================

import { NextRequest } from 'next/server'
import { TestingService } from '@/lib/testing'
import type { TestEventCallback } from '@/lib/testing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const testingService = TestingService.getInstance()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Stream may be closed
        }
      }

      // Send initial connection event with current test state
      sendEvent({
        type: 'connected',
        timestamp: new Date().toISOString(),
        data: {
          totalTests: testingService.getAllTests().length,
          totalSuites: testingService.getAllSuites().length,
          pending: testingService.getAllTests().filter(t => t.status === 'pending').length,
          running: testingService.getAllTests().filter(t => t.status === 'running').length,
          completed: testingService.getAllTests().filter(t => ['passed', 'failed', 'error', 'skipped'].includes(t.status)).length,
        },
      })

      // Send initial state snapshot
      const allTests = testingService.getAllTests()
      const allSuites = testingService.getAllSuites()

      if (allTests.length > 0) {
        sendEvent({
          type: 'test_state',
          tests: allTests.map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            target: t.target,
            status: t.status,
            hasResult: !!t.result,
          })),
          timestamp: new Date().toISOString(),
        })
      }

      if (allSuites.length > 0) {
        sendEvent({
          type: 'suite_state',
          suites: allSuites.map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            status: s.status,
            totalTests: s.tests.length,
            results: s.results,
          })),
          timestamp: new Date().toISOString(),
        })
      }

      // Subscribe to real-time test events
      const eventCallback: TestEventCallback = (event) => {
        sendEvent(event)
      }

      const unsubscribe = testingService.addEventListener(eventCallback)

      // Periodic heartbeat + state refresh every 5 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          const currentTests = testingService.getAllTests()
          const currentSuites = testingService.getAllSuites()

          const summary = {
            total: currentTests.length,
            pending: currentTests.filter(t => t.status === 'pending').length,
            running: currentTests.filter(t => t.status === 'running').length,
            passed: currentTests.filter(t => t.status === 'passed').length,
            failed: currentTests.filter(t => t.status === 'failed').length,
            error: currentTests.filter(t => t.status === 'error').length,
            skipped: currentTests.filter(t => t.status === 'skipped').length,
            suites: currentSuites.length,
          }

          sendEvent({
            type: 'heartbeat',
            summary,
            timestamp: new Date().toISOString(),
          })
        } catch {
          // Ignore heartbeat errors
        }
      }, 5000)

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        unsubscribe()
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
