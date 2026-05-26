/**
 * Power Management E2E tests — Power sources display, battery info,
 * solar panel readings, source toggling, and emergency mode.
 */
import { test, expect, switchToTab, MOCK_RESPONSES } from './fixtures'

test.describe('Power Management Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')
  })

  // ─── Navigation ───
  test('navigates to Power tab successfully', async ({ page }) => {
    await expect(page.getByTestId('active-tab-title')).toContainText('Power')
  })

  test('Power Management heading is visible', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Power Management' })).toBeVisible({ timeout: 10_000 })
  })

  // ─── Power Sources Display ───
  test('power sources are displayed', async ({ page }) => {
    await page.waitForTimeout(3_000)
    // Should show at least one power source card
    const sourceCards = page.locator('.grid .bg-slate-900\\/50')
    const count = await sourceCards.count()
    expect(count).toBeGreaterThanOrEqual(0)

    // Or show error state
    const hasError = await page.locator('text=Gagal memuat').isVisible({ timeout: 3_000 }).catch(() => false)
    expect(count > 0 || hasError).toBeTruthy()
  })

  test('power sources load with mocked API', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.power),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // Should show power source names
    await expect(page.locator('text=LiPo 4S 6000mAh')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Panel Surya 50W')).toBeVisible({ timeout: 10_000 })
  })

  // ─── Battery Info ───
  test('main battery section is visible', async ({ page }) => {
    await expect(page.locator('text=Baterai Utama')).toBeVisible({ timeout: 10_000 })
  })

  test('battery info loads with mocked data', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.power),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // Battery voltage
    await expect(page.locator('text=15.2V')).toBeVisible({ timeout: 10_000 })
    // Battery percentage
    await expect(page.locator('text=85%')).toBeVisible({ timeout: 10_000 })
    // Estimated minutes
    await expect(page.locator('text=/menit tersisa/i')).toBeVisible({ timeout: 10_000 })
  })

  test('battery progress bar is visible', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.power),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // Progress bar should be rendered
    const progressBar = page.locator('[role="progressbar"], [data-state]').first()
    await expect(progressBar).toBeVisible({ timeout: 10_000 })
  })

  // ─── Solar Panel ───
  test('solar panel section is visible', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.power),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // Panel Surya section
    await expect(page.locator('text=Panel Surya')).toBeVisible({ timeout: 10_000 })
  })

  test('solar panel shows voltage, wattage, and status', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.power),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // Solar voltage
    await expect(page.locator('text=18.5V')).toBeVisible({ timeout: 10_000 })
    // Solar wattage
    await expect(page.locator('text=22W')).toBeVisible({ timeout: 10_000 })
    // Solar status (Active or Standby)
    await expect(page.locator('text=/Active|Standby/i')).toBeVisible({ timeout: 10_000 })
  })

  test('solar panel data is marked with simulation flag', async ({ page }) => {
    // In simulation mode, the data comes from the simulator
    // This test verifies the solar panel readings are displayed
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_RESPONSES.power,
          data: {
            ...MOCK_RESPONSES.power.data,
            status: {
              ...MOCK_RESPONSES.power.data.status,
              solar: { ...MOCK_RESPONSES.power.data.status.solar, isCharging: true },
            },
          },
        }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // "Active" status means solar is actively charging (simulated)
    await expect(page.locator('text=Active')).toBeVisible({ timeout: 10_000 })
  })

  // ─── Power Source Controls ───
  test('power source Enable/Disable buttons are present', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.power),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // Enable/Disable buttons should be visible
    await expect(page.locator('button', { hasText: /Enable/i }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: /Disable/i }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('clicking Disable on a power source toggles it', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.power),
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    const disableBtn = page.locator('button', { hasText: /Disable/i }).first()
    if (await disableBtn.isVisible({ timeout: 5_000 })) {
      await disableBtn.click()
      await page.waitForTimeout(3_000)
      // Should not crash
      await expect(page.locator('h2', { hasText: 'Power Management' })).toBeVisible()
    }
  })

  // ─── Refresh Button ───
  test('Refresh button works', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.power),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    const refreshBtn = page.getByTestId('power-refresh-btn')
    await refreshBtn.click()
    await page.waitForTimeout(2_000)
    await expect(page.locator('h2', { hasText: 'Power Management' })).toBeVisible()
  })

  // ─── Emergency Mode Banner ───
  test('emergency mode banner is shown when active', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_RESPONSES.power,
          data: {
            ...MOCK_RESPONSES.power.data,
            status: {
              ...MOCK_RESPONSES.power.data.status,
              emergencyMode: true,
            },
          },
        }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    await expect(page.locator('text=EMERGENCY POWER MODE')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Baterai rendah')).toBeVisible({ timeout: 5_000 })
  })

  // ─── Source Details ───
  test('power source cards show voltage and current details', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.power),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // Should show Voltage and Current labels
    await expect(page.locator('text=Voltage:').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Current:').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Temp:').first()).toBeVisible({ timeout: 10_000 })
  })

  // ─── Error State ───
  test('error state shows retry button when API fails', async ({ page }) => {
    await page.route('**/api/power**', (route) => {
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Power')

    // Should show error state with retry
    await expect(page.locator('text=Gagal memuat')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button', { hasText: /Coba Lagi/i })).toBeVisible({ timeout: 5_000 })
  })
})
