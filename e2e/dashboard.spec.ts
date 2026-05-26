/**
 * Dashboard E2E tests — Verify page loads, all 20 navigation tabs,
 * branding, system indicators, tab switching, and mobile nav.
 */
import { test, expect, TAB_IDS, TAB_LABELS, switchToTab, getActiveTabLabel } from './fixtures'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
  })

  // ─── Page Load ───
  test('page loads successfully with no crash', async ({ page }) => {
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="tab-content"]')).toBeVisible()
  })

  // ─── Branding ───
  test('sidebar brand shows "NANGGROE IOT"', async ({ page }) => {
    await expect(page.getByTestId('brand-title')).toContainText('NANGGROE IOT')
  })

  test('sidebar shows version number', async ({ page }) => {
    await expect(page.locator('aside').locator('text=v2.0.0')).toBeVisible()
  })

  // ─── System Online Indicator ───
  test('system online indicator is visible', async ({ page }) => {
    await expect(page.getByTestId('system-online')).toContainText('System Online')
  })

  test('system online dot is green and pulsing', async ({ page }) => {
    const dot = page.getByTestId('system-online-dot')
    await expect(dot).toBeVisible()
    await expect(dot).toHaveClass(/bg-emerald-500/)
  })

  test('region info displays "Aceh Utara Region"', async ({ page }) => {
    await expect(page.getByTestId('region-info')).toContainText('Aceh Utara Region')
  })

  // ─── All 20 Navigation Tabs ───
  test('all 20 navigation tabs are visible in the sidebar', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"] nav')
    for (const tabId of TAB_IDS) {
      const label = TAB_LABELS[tabId]
      const btn = sidebar.locator('button', { hasText: label })
      await expect(btn).toBeVisible()
    }
  })

  test('sidebar renders with correct number of nav items', async ({ page }) => {
    const sidebarButtons = page.locator('[data-testid="sidebar"] nav button')
    await expect(sidebarButtons).toHaveCount(TAB_IDS.length)
  })

  // ─── Tab Switching ───
  test('overview tab is active by default', async ({ page }) => {
    const activeLabel = await getActiveTabLabel(page)
    expect(activeLabel).toBe('Overview')
  })

  test('clicking each tab switches the active panel header', async ({ page }) => {
    for (const tabId of TAB_IDS) {
      const label = TAB_LABELS[tabId]
      const btn = page.getByTestId(`nav-tab-${tabId}`)
      await btn.click()
      const headerLabel = await getActiveTabLabel(page)
      expect(headerLabel).toBe(label)
    }
  })

  test('active tab gets teal highlight style', async ({ page }) => {
    const hardwareBtn = page.getByTestId('nav-tab-hardware')
    await hardwareBtn.click()
    await expect(hardwareBtn).toHaveClass(/bg-teal-500/)
  })

  test('active tab shows ChevronRight icon', async ({ page }) => {
    const hardwareBtn = page.getByTestId('nav-tab-hardware')
    await hardwareBtn.click()
    // The active tab button should contain a chevron right icon
    const chevron = hardwareBtn.locator('svg.lucide-chevron-right')
    await expect(chevron).toBeVisible()
  })

  // ─── Tab Content Rendering ───
  test.describe('Tab content rendering', () => {
    const tabsToVerify: Array<{ id: typeof TAB_IDS[number]; expectedText: string }> = [
      { id: 'overview', expectedText: 'Overview' },
      { id: 'telemetry', expectedText: 'Telemetry' },
      { id: 'missions', expectedText: 'Missions' },
      { id: 'hardware', expectedText: 'Hardware' },
      { id: 'agents', expectedText: 'AI Agents' },
      { id: 'mcp', expectedText: 'MCP Tools' },
      { id: 'calibration', expectedText: 'Calibration' },
      { id: 'logs', expectedText: 'Logs' },
      { id: 'doctor', expectedText: 'Doctor' },
      { id: 'assembly', expectedText: 'Assembly' },
      { id: 'drivers', expectedText: 'Drivers' },
      { id: 'flash', expectedText: 'Flash' },
      { id: 'testing', expectedText: 'Testing' },
      { id: 'extension', expectedText: 'Extension' },
      { id: 'robot-builder', expectedText: 'Robot Builder' },
      { id: 'comms', expectedText: 'Communications' },
      { id: 'navigation', expectedText: 'Navigation' },
      { id: 'power', expectedText: 'Power' },
      { id: 'self-learn', expectedText: 'Self-Learn' },
      { id: 'face-tracking', expectedText: 'Face Tracking' },
    ]

    for (const { id, expectedText } of tabsToVerify) {
      test(`"${expectedText}" tab renders without crash`, async ({ page }) => {
        await switchToTab(page, expectedText)
        const content = page.getByTestId('tab-content')
        await expect(content).toBeVisible()
        // Verify header shows correct label
        const headerLabel = await getActiveTabLabel(page)
        expect(headerLabel).toBe(expectedText)
      })
    }
  })

  // ─── Tab State Preservation ───
  test('switching between tabs preserves previous tab selection', async ({ page }) => {
    await switchToTab(page, 'Hardware')
    expect(await getActiveTabLabel(page)).toBe('Hardware')

    await switchToTab(page, 'Missions')
    expect(await getActiveTabLabel(page)).toBe('Missions')

    // Switch back to Hardware
    await switchToTab(page, 'Hardware')
    expect(await getActiveTabLabel(page)).toBe('Hardware')
  })

  // ─── Mobile Bottom Navigation ───
  test.describe('Mobile responsive', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('mobile bottom nav is visible on small screens', async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
      await expect(page.getByTestId('mobile-nav')).toBeVisible()
    })

    test('desktop sidebar is hidden on mobile', async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
      await expect(page.getByTestId('sidebar')).not.toBeVisible()
    })

    test('clicking mobile nav tab switches active panel', async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
      const hardwareBtn = page.getByTestId('mobile-nav-tab-hardware')
      await hardwareBtn.click()
      const headerLabel = await getActiveTabLabel(page)
      expect(headerLabel).toBe('Hardware')
    })
  })

  // ─── Desktop sidebar visibility ───
  test('desktop sidebar is visible on large screens', async ({ page }) => {
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('mobile bottom nav is hidden on large screens', async ({ page }) => {
    await expect(page.getByTestId('mobile-nav')).not.toBeVisible()
  })
})
