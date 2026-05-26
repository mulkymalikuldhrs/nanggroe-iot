/**
 * API Health E2E tests — Verify all API endpoints respond correctly,
 * check response times, and test error handling.
 */
import { test, expect, verifyApiEndpoint, API_ENDPOINTS } from './fixtures'

test.describe('API Health Checks', () => {
  // ─── Core Health ───
  test('GET /api — system health check', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.health)
    expect(json.data).toBeDefined()
    expect(json.data.system).toBe('Nanggroe IoT')
    expect(json.data.version).toBeDefined()
    expect(json.data.mode).toBeDefined()
    expect(json.data.uptime).toBeDefined()
    expect(json.data.devices).toBeDefined()
  })

  // ─── Hardware ───
  test('GET /api/hardware — returns devices array', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.hardware)
    expect(json.data.devices).toBeDefined()
    expect(Array.isArray(json.data.devices)).toBeTruthy()
    expect(json.data.stats).toBeDefined()
  })

  // ─── Missions ───
  test('GET /api/missions — returns missions array', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.missions)
    expect(json.data.missions).toBeDefined()
    expect(Array.isArray(json.data.missions)).toBeTruthy()
  })

  // ─── Telemetry ───
  test('GET /api/telemetry — returns telemetry data', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.telemetry)
    expect(json.data).toBeDefined()
  })

  // ─── Agents ───
  test('GET /api/agents — returns agent messages', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.agents)
    expect(json.data).toBeDefined()
  })

  // ─── System ───
  test('GET /api/system — returns config', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.system)
    expect(json.data).toBeDefined()
    expect(json.data.name).toBeDefined()
    expect(json.data.version).toBeDefined()
  })

  // ─── Power ───
  test('GET /api/power — returns power sources', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.power)
    expect(json.data.sources).toBeDefined()
    expect(Array.isArray(json.data.sources)).toBeTruthy()
    expect(json.data.status).toBeDefined()
  })

  // ─── Navigation ───
  test('GET /api/navigation — returns navigation plans', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.navigation)
    expect(json.data).toBeDefined()
  })

  // ─── Doctor ───
  test('GET /api/doctor — returns diagnostics', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.doctor)
    expect(json.data).toBeDefined()
  })

  // ─── Alerts ───
  test('GET /api/alerts — returns alerts', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.alerts)
    expect(json.data).toBeDefined()
  })

  // ─── Comms ───
  test('GET /api/comms — returns channels', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.comms)
    expect(json.data).toBeDefined()
  })

  // ─── Robot Templates ───
  test('GET /api/robot-templates — returns templates', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.robotTemplates)
    expect(json.data).toBeDefined()
  })

  // ─── Projects ───
  test('GET /api/projects — returns projects', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.projects)
    expect(json.data).toBeDefined()
  })

  // ─── Drivers ───
  test('GET /api/drivers — returns drivers', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.drivers)
    expect(json.data.drivers).toBeDefined()
    expect(Array.isArray(json.data.drivers)).toBeTruthy()
  })

  // ─── Calibration ───
  test('GET /api/calibration — returns calibrations', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.calibration)
    expect(json.data).toBeDefined()
  })

  // ─── AI Memory ───
  test('GET /api/ai-memory — returns memories', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.aiMemory)
    expect(json.data).toBeDefined()
  })

  // ─── Self-Learn ───
  test('GET /api/self-learn — returns learning records', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.selfLearn)
    expect(json.data).toBeDefined()
  })

  // ─── Face Tracking ───
  test('GET /api/face-tracking — returns tracking data', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.faceTracking)
    expect(json.data).toBeDefined()
  })

  // ─── Hardware Bridge ───
  test('GET /api/hardware-bridge — returns bus states', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.hardwareBridge)
    expect(json.data).toBeDefined()
  })

  // ─── Extension ───
  test('GET /api/extension — returns connections', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.extension)
    expect(json.data).toBeDefined()
  })

  // ─── MCP ───
  test('GET /api/mcp — returns MCP status', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.mcp)
    expect(json.data).toBeDefined()
  })

  // ─── Testing ───
  test('GET /api/testing — returns test results', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.testing)
    expect(json.data).toBeDefined()
  })

  // ─── Boot Flow ───
  test('GET /api/bootflow — returns boot status', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.bootflow)
    expect(json.data).toBeDefined()
  })

  // ─── Assembly ───
  test('GET /api/assembly — returns assembly data', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.assembly)
    expect(json.data).toBeDefined()
  })

  // ─── Flash ───
  test('GET /api/flash — returns flash operations', async ({ request }) => {
    const json = await verifyApiEndpoint(request, API_ENDPOINTS.flash)
    expect(json.data).toBeDefined()
  })
})

// ─── POST /api/system updates config ───
test.describe('System API POST', () => {
  test('POST /api/system — updates config', async ({ request }) => {
    const response = await request.post('/api/system', {
      data: {
        configs: [{ key: 'test.e2e', value: 'playwright-test', category: 'testing' }],
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.success).toBeTruthy()
  })
})

// ─── API Response Time ───
test.describe('API Response Times', () => {
  const criticalEndpoints = [
    { name: 'Health', path: '/api' },
    { name: 'Hardware', path: '/api/hardware' },
    { name: 'Missions', path: '/api/missions' },
    { name: 'Telemetry', path: '/api/telemetry' },
    { name: 'Agents', path: '/api/agents' },
    { name: 'System', path: '/api/system' },
  ]

  for (const endpoint of criticalEndpoints) {
    test(`GET ${endpoint.path} responds within 5 seconds`, async ({ request }) => {
      const start = Date.now()
      const response = await request.get(endpoint.path)
      const duration = Date.now() - start
      expect(response.ok()).toBeTruthy()
      expect(duration, `${endpoint.name} took ${duration}ms, expected < 5000ms`).toBeLessThan(5000)
    })
  }
})

// ─── API Error Handling ───
test.describe('API Error Handling', () => {
  test('GET /api/nonexistent — returns 404', async ({ request }) => {
    const response = await request.get('/api/nonexistent')
    expect(response.status()).toBe(404)
  })

  test('GET /api/missions/invalid-id — handles bad ID gracefully', async ({ request }) => {
    const response = await request.get('/api/missions/invalid-nonexistent-id')
    // Should return 404 or 200 with error flag
    expect([200, 404].includes(response.status())).toBeTruthy()
  })

  test('POST /api/missions with invalid data — returns error', async ({ request }) => {
    const response = await request.post('/api/missions', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    // Should not be a server crash (5xx for unknown is also acceptable)
    expect(response.status()).not.toBe(200)
  })

  test('PUT /api/hardware without deviceId — returns 400', async ({ request }) => {
    const response = await request.put('/api/hardware', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect(response.status()).toBe(400)
  })

  test('POST /api/agents/chat — chat endpoint responds', async ({ request }) => {
    const response = await request.post('/api/agents/chat', {
      data: {
        prompt: 'Hello test',
        includeContext: true,
      },
      headers: { 'Content-Type': 'application/json' },
    })
    // The endpoint should respond (even if it fails gracefully)
    expect([200, 400, 500].includes(response.status())).toBeTruthy()
  })
})
