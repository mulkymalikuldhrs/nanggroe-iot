// ============================================================
// NANGGROE IOT - API Key Authentication Middleware
// Validates API key on critical routes to prevent unauthorized access
// Uses timing-safe comparison to prevent timing attacks
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

const API_KEY = process.env.NANGGROE_API_KEY || ''

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if both strings are equal, false otherwise.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against self to maintain constant time, then return false
    timingSafeEqual(Buffer.from(a), Buffer.from(a))
    return false
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// For development: if no API key is set, all requests are allowed
// For production: API key MUST be set
export function validateApiKey(request: NextRequest): NextResponse | null {
  // Skip auth in development if no key configured
  if (!API_KEY && process.env.NODE_ENV === 'development') {
    return null // Allow
  }

  const key = request.headers.get('x-api-key') ||
              request.headers.get('authorization')?.replace('Bearer ', '') ||
              new URL(request.url).searchParams.get('api_key')

  if (!key || !safeEqual(key, API_KEY)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — Invalid or missing API key' },
      { status: 401 }
    )
  }

  return null // Allow
}
