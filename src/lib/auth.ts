// ============================================================
// NANGGROE IOT - API Key Authentication Middleware
// Validates API key on critical routes to prevent unauthorized access
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.NANGGROE_API_KEY || ''

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

  if (!key || key !== API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — Invalid or missing API key' },
      { status: 401 }
    )
  }

  return null // Allow
}
