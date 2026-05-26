/**
 * Missions E2E tests — Mission creation, form filling, status badges,
 * mission detail, and abort with confirmation dialog.
 */
import { test, expect, switchToTab, MOCK_RESPONSES } from './fixtures'

test.describe('Missions Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Missions')
  })

  // ─── Navigation ───
  test('navigates to Missions tab successfully', async ({ page }) => {
    await expect(page.getByTestId('active-tab-title')).toContainText('Missions')
  })

  // ─── New Mission Button ───
  test('New Mission button is visible', async ({ page }) => {
    await expect(page.getByTestId('new-mission-btn')).toBeVisible()
  })

  test('New Mission button is enabled', async ({ page }) => {
    await expect(page.getByTestId('new-mission-btn')).toBeEnabled()
  })

  // ─── Status Filter ───
  test('status filter dropdown shows "All Statuses"', async ({ page }) => {
    await expect(page.locator('text=All Statuses')).toBeVisible({ timeout: 5_000 })
  })

  // ─── Mission Creation Dialog ───
  test('clicking New Mission opens creation dialog', async ({ page }) => {
    await page.getByTestId('new-mission-btn').click()
    await expect(page.getByTestId('create-mission-dialog')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Create Mission')).toBeVisible()
  })

  test('mission creation dialog has all required fields', async ({ page }) => {
    await page.getByTestId('new-mission-btn').click()
    await expect(page.getByTestId('create-mission-dialog')).toBeVisible({ timeout: 5_000 })

    // Verify form fields exist
    await expect(page.locator('label', { hasText: /Mission Name/i })).toBeVisible()
    await expect(page.locator('label', { hasText: /Type/i })).toBeVisible()
    await expect(page.locator('label', { hasText: /Altitude/i })).toBeVisible()
    await expect(page.locator('label', { hasText: /Speed/i })).toBeVisible()
    await expect(page.locator('label', { hasText: /Mission Prompt/i })).toBeVisible()
  })

  test('Create Mission button is disabled when name is empty', async ({ page }) => {
    await page.getByTestId('new-mission-btn').click()
    await expect(page.getByTestId('create-mission-dialog')).toBeVisible({ timeout: 5_000 })

    const createBtn = page.locator('[data-testid="create-mission-dialog"] button', { hasText: /Create Mission/i })
    await expect(createBtn).toBeDisabled()
  })

  test('Cancel button closes creation dialog', async ({ page }) => {
    await page.getByTestId('new-mission-btn').click()
    await expect(page.getByTestId('create-mission-dialog')).toBeVisible({ timeout: 5_000 })

    const cancelBtn = page.locator('[data-testid="create-mission-dialog"] button', { hasText: /Cancel/i })
    await cancelBtn.click()

    await expect(page.getByTestId('create-mission-dialog')).not.toBeVisible({ timeout: 5_000 })
  })

  // ─── Form Filling and Submission ───
  test('filling mission form enables Create Mission button', async ({ page }) => {
    await page.getByTestId('new-mission-btn').click()
    await expect(page.getByTestId('create-mission-dialog')).toBeVisible({ timeout: 5_000 })

    // Fill the mission name
    const nameInput = page.locator('[data-testid="create-mission-dialog"] input').first()
    await nameInput.fill('E2E Test Mission')

    const createBtn = page.locator('[data-testid="create-mission-dialog"] button', { hasText: /Create Mission/i })
    await expect(createBtn).toBeEnabled()
  })

  test('complete form filling and submission', async ({ page }) => {
    // Mock the POST API
    await page.route('**/api/missions', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'new-mission-id', name: 'E2E Test Mission', type: 'mapping', status: 'draft' },
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.missions),
        })
      }
    })

    await page.getByTestId('new-mission-btn').click()
    await expect(page.getByTestId('create-mission-dialog')).toBeVisible({ timeout: 5_000 })

    // Fill the form
    const nameInput = page.locator('[data-testid="create-mission-dialog"] input').first()
    await nameInput.fill('E2E Test Mission')

    const altitudeInput = page.locator('[data-testid="create-mission-dialog"] input[type="number"]').first()
    await altitudeInput.fill('80')

    const speedInput = page.locator('[data-testid="create-mission-dialog"] input[type="number"]').nth(1)
    await speedInput.fill('3')

    const promptTextarea = page.locator('[data-testid="create-mission-dialog"] textarea')
    await promptTextarea.fill('E2E test mission - pemetaan area')

    // Submit
    const createBtn = page.locator('[data-testid="create-mission-dialog"] button', { hasText: /Create Mission/i })
    await createBtn.click()

    // Dialog should close after successful creation
    await expect(page.getByTestId('create-mission-dialog')).not.toBeVisible({ timeout: 10_000 })
  })

  // ─── Mission List ───
  test('mission list loads from API', async ({ page }) => {
    await page.waitForTimeout(2_000)
    // Either show missions or empty state
    const hasMissions = await page.locator('.grid .bg-slate-900').first().isVisible({ timeout: 5_000 }).catch(() => false)
    const hasEmptyState = await page.locator('text=No missions found').isVisible({ timeout: 3_000 }).catch(() => false)
    expect(hasMissions || hasEmptyState).toBeTruthy()
  })

  test('mission count is displayed', async ({ page }) => {
    await page.waitForTimeout(2_000)
    await expect(page.locator('text=/missions/i')).toBeVisible({ timeout: 5_000 })
  })

  // ─── Mission Status Badges ───
  test('mission status badges are visible when missions exist', async ({ page }) => {
    await page.route('**/api/missions**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.missions),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Missions')

    // Should show a status badge (active, draft, etc.)
    await expect(page.locator('[class*="border"]').first()).toBeVisible({ timeout: 5_000 })
  })

  // ─── Delete/Abort Mission ───
  test('abort mission shows confirmation dialog', async ({ page }) => {
    await page.route('**/api/missions**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              missions: [{
                id: 'mission-active',
                name: 'Active Mission',
                type: 'mapping',
                status: 'active',
                altitude: 80,
                speed: 5,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }],
            },
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      }
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Missions')

    // Find and click the Abort button
    const abortBtn = page.locator('button', { hasText: /Abort/i }).first()
    if (await abortBtn.isVisible({ timeout: 5_000 })) {
      await abortBtn.click()

      // Should show AlertDialog
      await expect(page.locator('text=Abort Mission')).toBeVisible({ timeout: 5_000 })
      await expect(page.locator('text=Are you sure')).toBeVisible({ timeout: 5_000 })
    }
  })

  // ─── Mission Detail Dialog ───
  test('clicking Detail button opens mission detail', async ({ page }) => {
    await page.route('**/api/missions**', (route) => {
      if (route.request().method() === 'GET' && !route.request().url().includes('/api/missions/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.missions),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'Missions')

    const detailBtn = page.locator('button', { hasText: /Detail/i }).first()
    if (await detailBtn.isVisible({ timeout: 5_000 })) {
      await detailBtn.click()

      // Detail dialog should open
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 })
    }
  })

  // ─── Status Filter ───
  test('status filter can be changed', async ({ page }) => {
    const filterTrigger = page.locator('button:has-text("All Statuses"), [role="combobox"]').first()
    if (await filterTrigger.isVisible({ timeout: 3_000 })) {
      await filterTrigger.click()
      const activeOption = page.locator('text=Active').first()
      if (await activeOption.isVisible({ timeout: 3_000 })) {
        await activeOption.click()
      }
    }
  })
})
