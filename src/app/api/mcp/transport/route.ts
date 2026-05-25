// ============================================================
// NANGGROE OS AI - MCP SSE Transport API Route
// GET  /api/mcp/transport — Opens SSE connection for server-to-client messages
// POST /api/mcp/transport — Handles client-to-server JSON-RPC requests
// Implements MCP over HTTP+SSE transport (protocol version 2024-11-05)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMCPServer, MCP_PROTOCOL_VERSION } from '@/lib/mcp'
import type { MCPRequest, MCPResponse } from '@/lib/mcp'

// --- Session Management ---

interface SSESession {
  id: string
  createdAt: number
  lastActivity: number
}

const sessions = new Map<string, SSESession>()
const SESSION_TTL = 30 * 60 * 1000 // 30 minutes
const HEARTBEAT_INTERVAL = 15_000 // 15 seconds

// Clean up expired sessions periodically
function cleanupSessions(): void {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      sessions.delete(id)
    }
  }
}

function createSession(): string {
  const id = `mcp-session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
  sessions.set(id, {
    id,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  })
  return id
}

function validateSession(id: string): boolean {
  const session = sessions.get(id)
  if (!session) return false
  session.lastActivity = Date.now()
  return true
}

// --- CORS Headers ---

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  }
}

// ============================================================
// OPTIONS: CORS preflight
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

// ============================================================
// GET: SSE Connection for server-to-client messages
// ============================================================

export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('mcp-session-id') || request.nextUrl.searchParams.get('sessionId')

  if (sessionId && !validateSession(sessionId)) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401, headers: corsHeaders() }
    )
  }

  const effectiveSessionId = sessionId || createSession()

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        sessionId: effectiveSessionId,
        protocolVersion: MCP_PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
      })}\n\n`
      controller.enqueue(encoder.encode(connectEvent))

      // Send server info
      const mcpServer = getMCPServer()
      const serverInfo = mcpServer.getServerInfo()
      const infoEvent = `event: server_info\ndata: ${JSON.stringify(serverInfo)}\n\n`
      controller.enqueue(encoder.encode(infoEvent))

      // Set up heartbeat
      const heartbeat = setInterval(() => {
        try {
          const pingEvent = `event: ping\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString(),
            sessionId: effectiveSessionId,
          })}\n\n`
          controller.enqueue(encoder.encode(pingEvent))
        } catch {
          clearInterval(heartbeat)
        }
      }, HEARTBEAT_INTERVAL)

      // Clean up on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })

      // Periodic session cleanup
      const cleanup = setInterval(cleanupSessions, 60_000)
      request.signal.addEventListener('abort', () => {
        clearInterval(cleanup)
      })
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Mcp-Session-Id': effectiveSessionId,
      ...corsHeaders(),
    },
  })
}

// ============================================================
// POST: Handle client-to-server JSON-RPC requests
// ============================================================

export async function POST(request: NextRequest) {
  const headers = corsHeaders()

  // Validate session if provided
  const sessionId = request.headers.get('mcp-session-id') || request.nextUrl.searchParams.get('sessionId')
  if (sessionId && !validateSession(sessionId)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32001, message: 'Invalid or expired session' },
      },
      { status: 401, headers }
    )
  }

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    const errorResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: Invalid JSON' },
    }
    return NextResponse.json(errorResponse, { status: 400, headers })
  }

  // Handle batch requests (array of requests)
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((req: unknown) => handleSingleRequest(req as MCPRequest, sessionId))
    )
    const effectiveSessionId = sessionId || createSession()
    return NextResponse.json(responses, {
      status: 200,
      headers: {
        ...headers,
        ...(sessionId ? {} : { 'Mcp-Session-Id': effectiveSessionId }),
      },
    })
  }

  // Handle single request
  const response = await handleSingleRequest(body as MCPRequest, sessionId)
  const effectiveSessionId = sessionId || createSession()

  return NextResponse.json(response, {
    status: 200,
    headers: {
      ...headers,
      ...(sessionId ? {} : { 'Mcp-Session-Id': effectiveSessionId }),
    },
  })
}

// --- Request Handler ---

async function handleSingleRequest(
  request: MCPRequest,
  sessionId?: string | null
): Promise<MCPResponse> {
  // Validate JSON-RPC structure
  if (!request || typeof request !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid request: expected JSON object' },
    }
  }

  if (request.jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: request.id ?? null,
      error: { code: -32600, message: 'Invalid request: jsonrpc must be "2.0"' },
    }
  }

  if (!request.method || typeof request.method !== 'string') {
    return {
      jsonrpc: '2.0',
      id: request.id ?? null,
      error: { code: -32600, message: 'Invalid request: method is required' },
    }
  }

  const mcpServer = getMCPServer()

  // Inject session info into params if applicable
  const enrichedParams = sessionId && request.params
    ? { ...request.params, _sessionId: sessionId }
    : request.params

  // Route to MCPServer.handleRequest()
  return mcpServer.handleRequest({
    jsonrpc: request.jsonrpc,
    id: request.id,
    method: request.method,
    params: enrichedParams,
  })
}
