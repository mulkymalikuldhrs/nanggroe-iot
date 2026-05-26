/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Shared test fixtures and utilities for Nanggroe IoT E2E tests
 */
import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test'

// ─── Dashboard Tab IDs (matching Dashboard.tsx NAV_ITEMS) ───
export const TAB_IDS = [
  'overview',
  'telemetry',
  'missions',
  'hardware',
  'agents',
  'mcp',
  'calibration',
  'logs',
  'doctor',
  'assembly',
  'drivers',
  'flash',
  'testing',
  'extension',
  'robot-builder',
  'comms',
  'navigation',
  'power',
  'self-learn',
  'face-tracking',
] as const

export type TabId = (typeof TAB_IDS)[number]

// ─── Tab display labels (matching Dashboard.tsx NAV_ITEMS) ───
export const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  telemetry: 'Telemetry',
  missions: 'Missions',
  hardware: 'Hardware',
  agents: 'AI Agents',
  mcp: 'MCP Tools',
  calibration: 'Calibration',
  logs: 'Logs',
  doctor: 'Doctor',
  assembly: 'Assembly',
  drivers: 'Drivers',
  flash: 'Flash',
  testing: 'Testing',
  extension: 'Extension',
  'robot-builder': 'Robot Builder',
  comms: 'Communications',
  navigation: 'Navigation',
  power: 'Power',
  'self-learn': 'Self-Learn',
  'face-tracking': 'Face Tracking',
}

// ─── API endpoints to test ───
export const API_ENDPOINTS = {
  health: '/api',
  hardware: '/api/hardware',
  missions: '/api/missions',
  telemetry: '/api/telemetry',
  agents: '/api/agents',
  doctor: '/api/doctor',
  system: '/api/system',
  alerts: '/api/alerts',
  power: '/api/power',
  navigation: '/api/navigation',
  comms: '/api/comms',
  robotTemplates: '/api/robot-templates',
  projects: '/api/projects',
  drivers: '/api/drivers',
  calibration: '/api/calibration',
  aiMemory: '/api/ai-memory',
  selfLearn: '/api/self-learn',
  faceTracking: '/api/face-tracking',
  hardwareBridge: '/api/hardware-bridge',
  extension: '/api/extension',
  mcp: '/api/mcp',
  testing: '/api/testing',
  bootflow: '/api/bootflow',
  assembly: '/api/assembly',
  flash: '/api/flash',
  agentsChat: '/api/agents/chat',
  llmChat: '/api/llm/chat',
} as const

// ─── Mock API response generators ───
export const MOCK_RESPONSES = {
  health: {
    success: true,
    data: {
      system: 'Nanggroe IoT',
      version: '2.0.0',
      mode: 'simulation',
      uptime: { seconds: 3600, formatted: '1h 0m 0s' },
      timestamp: new Date().toISOString(),
      devices: { total: 8, active: 5, detected: 2, error: 0, offline: 1 },
    },
  },
  hardware: {
    success: true,
    data: {
      devices: [
        {
          id: 'hw-001',
          name: 'Pixhawk 4',
          deviceType: 'flight_controller',
          protocol: 'uart',
          status: 'active',
          vendorId: '0x26AC',
          productId: '0x0012',
          port: '/dev/ttyACM0',
          address: null,
          capabilities: '["gps","imu","baro"]',
          firmware: 'ArduPilot 4.5.1',
          lastSeen: new Date().toISOString(),
          profiles: [{ id: 'p1', adapterName: 'MAVLink 2', config: '{}', isDefault: true }],
        },
        {
          id: 'hw-002',
          name: 'Raspberry Pi 4',
          deviceType: 'companion_computer',
          protocol: 'usb',
          status: 'active',
          vendorId: null,
          productId: null,
          port: null,
          address: '192.168.1.10',
          capabilities: '["wifi","bluetooth","gpio"]',
          firmware: 'Raspberry Pi OS 64-bit',
          lastSeen: new Date().toISOString(),
          profiles: [],
        },
      ],
      stats: { total: 2, byStatus: { active: 2 }, byType: { flight_controller: 1, companion_computer: 1 } },
    },
  },
  missions: {
    success: true,
    data: {
      missions: [
        {
          id: 'mission-001',
          name: 'Pemetaan Lhoksukon',
          description: 'Area mapping of Lhoksukon fields',
          type: 'mapping',
          status: 'active',
          prompt: 'Peta area persawahan di Lhoksukon',
          altitude: 80,
          speed: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
    },
  },
  agents: {
    success: true,
    data: {
      messages: [
        {
          id: 'msg-001',
          agent: 'hermes',
          role: 'assistant',
          content: 'Sistem siap untuk misi pemetaan area Lhoksukon.',
          metadata: null,
          timestamp: new Date().toISOString(),
          missionId: 'mission-001',
        },
        {
          id: 'msg-002',
          agent: 'operator',
          role: 'user',
          content: 'Mulai misi pemetaan',
          metadata: null,
          timestamp: new Date().toISOString(),
          missionId: 'mission-001',
        },
      ],
      agentStatus: {
        hermes: { enabled: true, status: 'online', lastMessage: null },
        picoclaw: { enabled: true, status: 'online', lastMessage: null },
      },
    },
  },
  telemetry: {
    success: true,
    data: {
      readings: [
        { id: 'tel-001', sensorType: 'gps', value: '4.9125,97.1347', unit: 'lat,lng', timestamp: new Date().toISOString() },
        { id: 'tel-002', sensorType: 'battery', value: '85', unit: '%', timestamp: new Date().toISOString() },
      ],
    },
  },
  power: {
    success: true,
    data: {
      sources: [
        { id: 'ps-001', type: 'battery', name: 'LiPo 4S 6000mAh', status: 'charging', capacity: 6000, currentLevel: 85, voltage: 15.2, current: 2.1, temperature: 32.5, lastReading: new Date().toISOString() },
        { id: 'ps-002', type: 'solar', name: 'Panel Surya 50W', status: 'discharging', capacity: 0, currentLevel: 0, voltage: 18.5, current: 1.2, temperature: 45.0, lastReading: new Date().toISOString() },
      ],
      status: {
        mainBattery: { voltage: 15.2, percentage: 85, status: 'charging', estimatedMinutes: 120 },
        solar: { voltage: 18.5, isCharging: true, wattage: 22 },
        gsm: { voltage: 3.7, isConnected: true },
        emergencyMode: false,
      },
    },
  },
  navigation: {
    success: true,
    data: [
      { id: 'nav-001', name: 'Autopilot Mission', type: 'autopilot', status: 'idle', waypoints: [], homePosition: { lat: 4.9125, lng: 97.1347, alt: 0 }, createdAt: new Date().toISOString() },
    ],
  },
  system: {
    success: true,
    data: {
      name: 'NANGGROE IOT',
      version: '2.0.0',
      mode: 'simulation',
      region: 'Aceh Utara',
      homePosition: { lat: 4.9125, lng: 97.1347 },
      uptime: 3600000,
      uptimeFormatted: '1h 0m 0s',
      devices: { total: 8, active: 5 },
      activeMission: null,
      agents: { hermes: { enabled: true, status: 'online' }, picoclaw: { enabled: true, status: 'online' } },
      session: null,
      alerts: { unread: 0 },
      config: { 'system.name': 'NANGGROE IOT', 'system.version': '2.0.0' },
    },
  },
  flash: {
    success: true,
    data: {
      activeOperations: [],
      operationHistory: [],
    },
  },
}

// ─── Extended test fixture with helpers ───
type NanggroeFixtures = {
  dashboardPage: Page
}

export const test = base.extend<NanggroeFixtures>({
  dashboardPage: async ({ page }, use) => {
    await page.goto('/')
    await page.waitForSelector('h1, h2', { timeout: 15_000 })
    await use(page)
  },
})

export { expect }

// ─── Helper: Click a sidebar tab by label ───
export async function clickSidebarTab(page: Page, tabLabel: string) {
  // Desktop sidebar navigation — use data-testid first, fallback to text
  const sidebarBtn = page.getByTestId(`nav-tab-${tabLabel.toLowerCase().replace(/\s+/g, '-')}`)
  if (await sidebarBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await sidebarBtn.click()
    return
  }
  // Fallback: sidebar button with text
  const asideBtn = page.locator('aside nav button', { hasText: tabLabel })
  if (await asideBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await asideBtn.click()
    return
  }
  // Fallback: mobile bottom nav
  const mobileBtn = page.locator('nav.flex button', { hasText: tabLabel })
  await mobileBtn.click()
}

// ─── Helper: Wait for tab content to load (skeletons gone) ───
export async function waitForTabContent(page: Page, timeout = 10_000) {
  // Wait for loading skeletons to disappear
  await page.waitForFunction(
    () => document.querySelectorAll('.animate-pulse, [data-loading]').length === 0,
    { timeout }
  ).catch(() => {
    // Some tabs may not have loading skeletons, that's fine
  })
  // Small buffer for rendering
  await page.waitForTimeout(500)
}

// ─── Helper: Switch to a tab and wait for content ───
export async function switchToTab(page: Page, tabLabel: string) {
  await clickSidebarTab(page, tabLabel)
  await waitForTabContent(page)
}

// ─── Helper: Verify API endpoint returns success ───
export async function verifyApiEndpoint(
  request: APIRequestContext,
  endpoint: string,
  options?: { method?: string; body?: Record<string, unknown> }
) {
  const method = options?.method ?? 'GET'
  const response = await request.fetch(endpoint, {
    method,
    data: options?.body,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  expect(response.ok(), `API ${method} ${endpoint} returned ${response.status()}`).toBeTruthy()
  const json = await response.json()
  expect(json.success, `API ${method} ${endpoint} success=false`).toBeTruthy()
  return json
}

// ─── Helper: Get the currently active tab label in header ───
export async function getActiveTabLabel(page: Page): Promise<string> {
  const header = page.locator('header h2')
  return (await header.textContent())?.trim() || ''
}

// ─── Helper: Wait for a toast notification ───
export async function waitForToast(page: Page, timeout = 5_000) {
  // Sonner toast
  const toast = page.locator('[data-sonner-toast], [role="status"]').first()
  await toast.waitFor({ state: 'visible', timeout }).catch(() => {})
  return toast
}

// ─── Helper: Mock all API responses for offline testing ───
export async function mockAllApiResponses(page: Page) {
  await page.route('**/api/hardware**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES.hardware) })
  )
  await page.route('**/api/missions**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES.missions) })
  )
  await page.route('**/api/agents**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES.agents) })
  )
  await page.route('**/api/telemetry**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES.telemetry) })
  )
  await page.route('**/api/power**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES.power) })
  )
  await page.route('**/api/navigation**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES.navigation) })
  )
  await page.route('**/api/system**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES.system) })
  )
  await page.route('**/api/flash**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESPONSES.flash) })
  )
}

// ─── Helper: Navigate to dashboard and ensure loaded ───
export async function navigateToDashboard(page: Page) {
  await page.goto('/')
  await page.waitForSelector('h1', { timeout: 15_000 })
}
