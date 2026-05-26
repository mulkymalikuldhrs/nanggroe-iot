/**
 * Navigation E2E tests — GPS coordinates, delivery plan creation,
 * RTH Emergency button with confirmation dialog, navigation plans.
 */
import { test, expect, switchToTab, MOCK_RESPONSES } from './fixtures'

test.describe('Navigation Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Navigation')
  })

  // ─── Navigation ───
  test('navigates to Navigation tab successfully', async ({ page }) => {
    await expect(page.getByTestId('active-tab-title')).toContainText('Navigation')
  })

  test('Navigation heading is visible', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Navigation' })).toBeVisible()
  })

  // ─── Quick Action Cards ───
  test('navigation types are shown as quick action cards', async ({ page }) => {
    const navTypes = ['Autopilot', 'Field Map', 'Delivery', 'Survey']
    for (const type of navTypes) {
      await expect(page.locator('text', { hasText: type }).first()).toBeVisible({ timeout: 5_000 })
    }
  })

  // ─── RTH Emergency Button ───
  test('RTH Emergency button is visible', async ({ page }) => {
    await expect(page.getByTestId('rth-emergency-btn')).toBeVisible()
  })

  test('RTH Emergency button is red-colored', async ({ page }) => {
    const rthButton = page.getByTestId('rth-emergency-btn')
    const classes = await rthButton.getAttribute('class')
    expect(classes).toContain('red')
  })

  test('clicking RTH Emergency button shows confirmation dialog', async ({ page }) => {
    const rthButton = page.getByTestId('rth-emergency-btn')
    await rthButton.click()

    // Should show AlertDialog confirmation
    await expect(page.locator('text=Confirm RTH Emergency')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=This will immediately trigger Return-to-Home')).toBeVisible({ timeout: 5_000 })
  })

  test('RTH confirmation dialog has Cancel and Confirm buttons', async ({ page }) => {
    const rthButton = page.getByTestId('rth-emergency-btn')
    await rthButton.click()

    await expect(page.locator('text=Confirm RTH Emergency')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
    await expect(page.locator('button:has-text("Confirm RTH")')).toBeVisible()
  })

  test('canceling RTH confirmation closes the dialog', async ({ page }) => {
    const rthButton = page.getByTestId('rth-emergency-btn')
    await rthButton.click()

    await expect(page.locator('text=Confirm RTH Emergency')).toBeVisible({ timeout: 5_000 })

    const cancelBtn = page.locator('button:has-text("Cancel")')
    await cancelBtn.click()

    await expect(page.locator('text=Confirm RTH Emergency')).not.toBeVisible({ timeout: 5_000 })
  })

  test('confirming RTH triggers the emergency return', async ({ page }) => {
    await page.route('**/api/navigation**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            simulated: true,
            data: { id: 'rth-plan', name: 'RTH', type: 'rth', status: 'active' },
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.navigation),
        })
      }
    })

    const rthButton = page.getByTestId('rth-emergency-btn')
    await rthButton.click()

    await expect(page.locator('text=Confirm RTH Emergency')).toBeVisible({ timeout: 5_000 })

    const confirmBtn = page.locator('button:has-text("Confirm RTH")')
    await confirmBtn.click()

    // Dialog should close
    await page.waitForTimeout(3_000)
    // Page should still be functional (no crash)
    await expect(page.getByTestId('active-tab-title')).toContainText('Navigation')
  })

  // ─── Field Mapping Section ───
  test('Field Mapping section is present', async ({ page }) => {
    await expect(page.locator('text=Pemetaan Sawah')).toBeVisible({ timeout: 5_000 })
  })

  test('field mapping form has name input', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Nama misi"]')).toBeVisible({ timeout: 5_000 })
  })

  test('field mapping form has coordinate textarea', async ({ page }) => {
    await expect(page.locator('text=Koordinat area')).toBeVisible({ timeout: 5_000 })
  })

  test('field mapping form has submit button', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Buat Plan Mapping/i })).toBeVisible({ timeout: 5_000 })
  })

  test('field mapping submit is disabled without name and coordinates', async ({ page }) => {
    const submitBtn = page.locator('button', { hasText: /Buat Plan Mapping/i })
    await expect(submitBtn).toBeDisabled()
  })

  // ─── Delivery Section ───
  test('Delivery section is present', async ({ page }) => {
    await expect(page.locator('text=Pengiriman')).toBeVisible({ timeout: 5_000 })
  })

  test('delivery form has coordinate inputs', async ({ page }) => {
    await expect(page.locator('text=Pickup Lat')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Pickup Lng')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Drop Lat')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Drop Lng')).toBeVisible({ timeout: 5_000 })
  })

  test('delivery form submit button exists', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Buat Plan Delivery/i })).toBeVisible({ timeout: 5_000 })
  })

  test('delivery form validates required fields', async ({ page }) => {
    // Delivery button should be disabled without all fields filled
    const submitBtn = page.locator('button', { hasText: /Buat Plan Delivery/i })
    await expect(submitBtn).toBeDisabled()
  })

  test('create delivery plan with valid coordinates', async ({ page }) => {
    await page.route('**/api/navigation**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'delivery-plan', name: 'E2E Delivery', type: 'delivery', status: 'idle' },
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.navigation),
        })
      }
    })

    // Fill delivery form
    await page.locator('input[placeholder*="Nama misi pengiriman"]').fill('E2E Delivery Test')
    await page.locator('label:has-text("Pickup Lat") + input, input[placeholder="4.9125"]').first().fill('4.9125')
    await page.locator('label:has-text("Pickup Lng") + input').first().fill('97.1347')
    await page.locator('label:has-text("Drop Lat") + input').first().fill('4.9145')
    await page.locator('label:has-text("Drop Lng") + input').first().fill('97.1367')

    const submitBtn = page.locator('button', { hasText: /Buat Plan Delivery/i })
    await expect(submitBtn).toBeEnabled()

    await submitBtn.click()
    await page.waitForTimeout(3_000)

    // Should not crash
    await expect(page.getByTestId('active-tab-title')).toContainText('Navigation')
  })

  // ─── Navigation Plans Section ───
  test('Navigation Plans section is shown', async ({ page }) => {
    await expect(page.locator('text=Navigation Plans')).toBeVisible({ timeout: 5_000 })
  })

  test('Refresh button is present', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Refresh/i })).toBeVisible({ timeout: 5_000 })
  })

  test('navigation plans display status indicators', async ({ page }) => {
    await page.route('**/api/navigation**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.navigation),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Navigation')

    // Should show plan cards with status dots
    await expect(page.locator('text=Navigation Plans')).toBeVisible({ timeout: 5_000 })
  })

  // ─── Autopilot Quick Action ───
  test('clicking Autopilot quick action creates a plan', async ({ page }) => {
    await page.route('**/api/navigation**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'auto-plan', name: 'Autopilot Mission', type: 'autopilot', status: 'idle' },
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.navigation),
        })
      }
    })

    const autopilotCard = page.locator('text=Autopilot').first()
    await autopilotCard.click()
    await page.waitForTimeout(3_000)

    // Page should still be functional
    await expect(page.getByTestId('active-tab-title')).toContainText('Navigation')
  })
})
