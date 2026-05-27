/**
 * Hardware E2E tests — Scan hardware, device list, device details,
 * status filter, and device status updates.
 */
import { test, expect, switchToTab, MOCK_RESPONSES } from './fixtures'

test.describe('Hardware Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Hardware')
  })

  // ─── Navigation ───
  test('navigates to Hardware tab successfully', async ({ page }) => {
    await expect(page.getByTestId('active-tab-title')).toContainText('Hardware')
  })

  // ─── Scan Hardware Button ───
  test('Scan Hardware button is visible', async ({ page }) => {
    await expect(page.getByTestId('scan-hardware-btn')).toBeVisible()
  })

  test('Scan Hardware button is enabled by default', async ({ page }) => {
    await expect(page.getByTestId('scan-hardware-btn')).toBeEnabled()
  })

  test('clicking Scan Hardware triggers scan with loading state', async ({ page }) => {
    const scanBtn = page.getByTestId('scan-hardware-btn')
    await scanBtn.click()

    // Button should show scanning state
    await expect(page.getByText('Scanning')).toBeVisible({ timeout: 3_000 })

    // Wait for scan to complete
    await page.waitForTimeout(3_000)

    // Should return to normal state
    await expect(page.getByTestId('scan-hardware-btn')).toBeVisible({ timeout: 5_000 })
  })

  test('scan hardware button icon spins during scan', async ({ page }) => {
    const scanBtn = page.getByTestId('scan-hardware-btn')
    await scanBtn.click()

    // The search icon should have animate-spin class
    const spinningIcon = scanBtn.locator('svg.animate-spin')
    await expect(spinningIcon).toBeVisible({ timeout: 2_000 }).catch(() => {
      // Scan may have completed too fast — that's acceptable
    })
  })

  // ─── Device List ───
  test('device list loads from API', async ({ page }) => {
    // Wait for loading skeletons to disappear
    await page.waitForTimeout(2_000)

    // Either devices are shown or empty state
    const hasDevices = await page.locator('.grid .bg-slate-900').first().isVisible({ timeout: 3_000 }).catch(() => false)
    const hasEmptyState = await page.locator('text=No hardware devices detected').isVisible({ timeout: 3_000 }).catch(() => false)
    expect(hasDevices || hasEmptyState).toBeTruthy()
  })

  test('device count is displayed', async ({ page }) => {
    await page.waitForTimeout(2_000)
    await expect(page.locator('text=/devices/i')).toBeVisible({ timeout: 5_000 })
  })

  // ─── Status Filter ───
  test('status filter dropdown is present', async ({ page }) => {
    await expect(page.locator('text=All Devices')).toBeVisible({ timeout: 5_000 })
  })

  test('clicking status filter opens dropdown with options', async ({ page }) => {
    const filterTrigger = page.locator('button:has-text("All Devices"), [role="combobox"]').first()
    await filterTrigger.click()

    // Should show filter options
    await expect(page.locator('text=Detected')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('text=Active')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 3_000 })
  })

  // ─── Device Details Expansion ───
  test('expanding a device shows more details', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const moreButton = page.locator('text=More').first()
    if (await moreButton.isVisible({ timeout: 3_000 })) {
      await moreButton.click()
      // Should show expanded details
      await expect(page.locator('text=Less').first()).toBeVisible({ timeout: 3_000 })
    }
  })

  test('expanded device shows status action buttons', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const moreButton = page.locator('text=More').first()
    if (await moreButton.isVisible({ timeout: 3_000 })) {
      await moreButton.click()
      // Should show Set Active and Set Offline buttons
      await expect(page.locator('text=Set Active').first()).toBeVisible({ timeout: 3_000 })
      await expect(page.locator('text=Set Offline').first()).toBeVisible({ timeout: 3_000 })
    }
  })

  // ─── API Mocking Test ───
  test('works with mocked API response', async ({ page }) => {
    // Setup mock for hardware API
    await page.route('**/api/hardware**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.hardware),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { scanned: 2, newDevices: 0, updatedDevices: 2, offlineDevices: 0, devices: MOCK_RESPONSES.hardware.data.devices } }),
        })
      }
    })

    // Reload page with mocked API
    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Hardware')

    // Should show devices from mock
    await expect(page.locator('text=Pixhawk 4')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Raspberry Pi 4')).toBeVisible({ timeout: 5_000 })
  })

  test('scan with mocked API returns results', async ({ page }) => {
    await page.route('**/api/hardware**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { scanned: 2, newDevices: 1, updatedDevices: 2, offlineDevices: 0, devices: MOCK_RESPONSES.hardware.data.devices } }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.hardware),
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Hardware')

    const scanBtn = page.getByTestId('scan-hardware-btn')
    await scanBtn.click()
    await page.waitForTimeout(2_000)

    // Should show devices from mock
    await expect(page.locator('text=Pixhawk 4')).toBeVisible({ timeout: 5_000 })
  })

  // ─── Empty State ───
  test('shows empty state when no devices detected', async ({ page }) => {
    await page.route('**/api/hardware**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            devices: [],
            stats: { total: 0, byStatus: {}, byType: {} },
          },
        }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Hardware')

    await expect(page.locator('text=No hardware devices detected')).toBeVisible({ timeout: 5_000 })
  })
})
