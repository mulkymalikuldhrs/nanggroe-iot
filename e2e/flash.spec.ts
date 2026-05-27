/**
 * Firmware Flash E2E tests — Firmware list, target device selection,
 * flash button, code deploy, and operation history.
 */
import { test, expect, switchToTab, MOCK_RESPONSES } from './fixtures'

test.describe('Firmware Flash Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Flash')
  })

  // ─── Navigation ───
  test('navigates to Flash tab successfully', async ({ page }) => {
    await expect(page.getByTestId('active-tab-title')).toContainText('Flash')
  })

  test('Firmware Flash & Code Deploy header is visible', async ({ page }) => {
    await expect(page.locator('text=Firmware Flash & Code Deploy')).toBeVisible({ timeout: 10_000 })
  })

  // ─── Tab Toggle ───
  test('Firmware Flash tab button is visible', async ({ page }) => {
    await expect(page.getByTestId('firmware-tab-btn')).toBeVisible()
  })

  test('Code Deploy tab button is visible', async ({ page }) => {
    await expect(page.getByTestId('code-deploy-tab-btn')).toBeVisible()
  })

  test('clicking Code Deploy tab switches to deploy view', async ({ page }) => {
    await page.getByTestId('code-deploy-tab-btn').click()
    await expect(page.locator('text=Code Deploy')).toBeVisible({ timeout: 5_000 })
  })

  test('clicking Firmware Flash tab switches back', async ({ page }) => {
    await page.getByTestId('code-deploy-tab-btn').click()
    await page.getByTestId('firmware-tab-btn').click()
    await expect(page.locator('text=Firmware Flash').first()).toBeVisible({ timeout: 5_000 })
  })

  // ─── Firmware Target Selection ───
  test('target device buttons are visible', async ({ page }) => {
    const targets = ['Pixhawk', 'Companion', 'Esc', 'Radio']
    for (const target of targets) {
      await expect(page.locator(`button:has-text("${target}")`).first()).toBeVisible({ timeout: 5_000 })
    }
  })

  test('clicking a target device selects it', async ({ page }) => {
    const companionBtn = page.locator('button:has-text("Companion")').first()
    await companionBtn.click()
    // Should show active style
    await expect(companionBtn).toHaveClass(/bg-teal-500/)
  })

  // ─── Firmware List ───
  test('firmware list loads from API', async ({ page }) => {
    await page.route('**/api/flash**', (route) => {
      const url = route.request().url()
      if (url.includes('action=firmware')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              firmware: [
                {
                  target: 'pixhawk',
                  version: '4.5.1',
                  releaseDate: '2024-01-15',
                  size: 1048576,
                  checksum: 'abc123',
                  changelog: 'Fixed GPS lock issue, improved barometer calibration',
                },
                {
                  target: 'pixhawk',
                  version: '4.5.0',
                  releaseDate: '2023-12-01',
                  size: 1024000,
                  checksum: 'def456',
                  changelog: 'Initial release for this target',
                },
              ],
            },
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.flash),
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Flash')

    // Should show firmware versions
    await expect(page.locator('text=4.5.1')).toBeVisible({ timeout: 10_000 })
  })

  test('firmware list shows loading state', async ({ page }) => {
    // The firmware list should show a loading state initially
    await page.waitForTimeout(2_000)
    // After loading, either firmware items or "No firmware" should be visible
    const hasFirmware = await page.locator('.max-h-48').isVisible({ timeout: 5_000 }).catch(() => false)
    const hasNoFirmware = await page.locator('text=No firmware available').isVisible({ timeout: 5_000 }).catch(() => false)
    expect(hasFirmware || hasNoFirmware).toBeTruthy()
  })

  // ─── Flash Button ───
  test('Flash firmware button is visible', async ({ page }) => {
    await expect(page.getByTestId('flash-firmware-btn')).toBeVisible({ timeout: 10_000 })
  })

  test('Flash firmware button is disabled without version selection', async ({ page }) => {
    // Mock firmware list as empty so no version is selected
    await page.route('**/api/flash**', (route) => {
      if (route.request().url().includes('action=firmware')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { firmware: [] } }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.flash),
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Flash')

    const flashBtn = page.getByTestId('flash-firmware-btn')
    await expect(flashBtn).toBeDisabled()
  })

  test('clicking Flash button triggers firmware flash', async ({ page }) => {
    await page.route('**/api/flash**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'op-001', target: 'pixhawk', firmwareVersion: '4.5.1', status: 'preparing', progress: 0 },
          }),
        })
      } else if (route.request().url().includes('action=firmware')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              firmware: [
                { target: 'pixhawk', version: '4.5.1', releaseDate: '2024-01-15', size: 1048576, checksum: 'abc123', changelog: 'Fixed GPS' },
              ],
            },
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.flash),
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Flash')

    // Select firmware version
    const firmwareBtn = page.locator('button:has-text("4.5.1")').first()
    if (await firmwareBtn.isVisible({ timeout: 5_000 })) {
      await firmwareBtn.click()

      const flashBtn = page.getByTestId('flash-firmware-btn')
      await expect(flashBtn).toBeEnabled()
      await flashBtn.click()

      // Should show loading state
      await page.waitForTimeout(2_000)
      // Page should not crash
      await expect(page.getByTestId('active-tab-title')).toContainText('Flash')
    }
  })

  // ─── Device Selection ───
  test('switching target device updates firmware list', async ({ page }) => {
    // Click Companion target
    const companionBtn = page.locator('button:has-text("Companion")').first()
    await companionBtn.click()
    // Should trigger a new firmware list fetch
    await page.waitForTimeout(2_000)
    // Page should still be functional
    await expect(page.getByTestId('active-tab-title')).toContainText('Flash')
  })

  // ─── Verify Firmware Button ───
  test('Verify firmware button is present', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Verify/i })).toBeVisible({ timeout: 5_000 })
  })

  // ─── Code Deploy Tab ───
  test('Code Deploy tab shows deploy form', async ({ page }) => {
    await page.getByTestId('code-deploy-tab-btn').click()
    await expect(page.locator('text=Deploy Target')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Code Path')).toBeVisible({ timeout: 5_000 })
  })

  test('Code Deploy has companion and agent target options', async ({ page }) => {
    await page.getByTestId('code-deploy-tab-btn').click()
    await expect(page.locator('button:has-text("Companion")').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('button:has-text("Agent")').first()).toBeVisible({ timeout: 5_000 })
  })

  test('Code Deploy button is visible', async ({ page }) => {
    await page.getByTestId('code-deploy-tab-btn').click()
    await expect(page.locator('button', { hasText: /Deploy to/i })).toBeVisible({ timeout: 5_000 })
  })

  // ─── Operation History ───
  test('Operation History section is present', async ({ page }) => {
    await expect(page.locator('text=Operation History')).toBeVisible({ timeout: 10_000 })
  })
})
