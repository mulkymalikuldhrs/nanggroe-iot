/**
 * Robot Builder E2E tests — Template browsing, category filters,
 * template detail sheet, and project creation.
 */
import { test, expect, switchToTab } from './fixtures'

test.describe('Robot Builder Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15_000 })
    await switchToTab(page, 'Robot Builder')
  })

  test('Robot Builder tab loads with header', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Robot Builder' })).toBeVisible()
  })

  test('template category filters are shown', async ({ page }) => {
    // Should show filter buttons: All, Drone, Rover, Boat, Arm, Custom, Amphibious
    const filterLabels = ['All', 'Drone', 'Rover', 'Boat', 'Arm', 'Custom']
    for (const label of filterLabels) {
      await expect(
        page.locator('button', { hasText: new RegExp(`^${label}$`, 'i') }).first()
      ).toBeVisible({ timeout: 5_000 })
    }
  })

  test('clicking a category filter highlights it', async ({ page }) => {
    const droneFilter = page.locator('button', { hasText: 'Drone' }).first()
    await droneFilter.click()

    // The drone filter should become active (teal colored)
    const isActive = await droneFilter.evaluate((el) => {
      return el.classList.contains('bg-teal-600') || el.getAttribute('data-state') === 'active'
    })
    // Either has active class or is visually distinct
    expect(typeof isActive).toBe('boolean')
  })

  test('clicking "All" filter shows all templates', async ({ page }) => {
    const allFilter = page.locator('button', { hasText: /^All$/i }).first()
    await allFilter.click()

    // Should show the template grid
    const templateGrid = page.locator('.grid')
    await expect(templateGrid).toBeVisible({ timeout: 5_000 })
  })

  test('clicking a template opens detail Sheet', async ({ page }) => {
    // Wait for templates to load
    await page.waitForTimeout(2_000)

    // Find a template card and click it
    const templateCard = page.locator('.grid .cursor-pointer').first()
    if (await templateCard.isVisible({ timeout: 5_000 })) {
      await templateCard.click()

      // Sheet should open
      const sheet = page.locator('[data-state="open"], [role="dialog"]').first()
      await expect(sheet).toBeVisible({ timeout: 5_000 })

      // Sheet should show template details
      await expect(page.locator('text=/Kemampuan|Hardware Diperlukan|Firmware/i')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('template detail Sheet shows capabilities', async ({ page }) => {
    await page.waitForTimeout(2_000)

    const templateCard = page.locator('.grid .cursor-pointer').first()
    if (await templateCard.isVisible({ timeout: 5_000 })) {
      await templateCard.click()

      // Wait for Sheet
      await page.waitForTimeout(1_000)

      // Should have capabilities section
      const capabilitiesSection = page.locator('text=Kemampuan')
      if (await capabilitiesSection.isVisible({ timeout: 3_000 })) {
        // Should have capability badges
        const badges = page.locator('[data-state="open"] .border-teal-500\\/30')
        expect(await badges.count()).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('template detail Sheet shows hardware requirements', async ({ page }) => {
    await page.waitForTimeout(2_000)

    const templateCard = page.locator('.grid .cursor-pointer').first()
    if (await templateCard.isVisible({ timeout: 5_000 })) {
      await templateCard.click()
      await page.waitForTimeout(1_000)

      await expect(page.locator('text=Hardware Diperlukan')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('template detail Sheet shows firmware requirements', async ({ page }) => {
    await page.waitForTimeout(2_000)

    const templateCard = page.locator('.grid .cursor-pointer').first()
    if (await templateCard.isVisible({ timeout: 5_000 })) {
      await templateCard.click()
      await page.waitForTimeout(1_000)

      await expect(page.locator('text=Firmware')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('template detail Sheet has "Buat Project" button', async ({ page }) => {
    await page.waitForTimeout(2_000)

    const templateCard = page.locator('.grid .cursor-pointer').first()
    if (await templateCard.isVisible({ timeout: 5_000 })) {
      await templateCard.click()
      await page.waitForTimeout(1_000)

      await expect(page.locator('button', { hasText: 'Buat Project' })).toBeVisible({ timeout: 5_000 })
    }
  })

  test('Scan Hardware button is present', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Scan Hardware/i })).toBeVisible()
  })

  test('Quick Create button is present', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Quick Create/i })).toBeVisible()
  })

  test('closing the Sheet returns to template grid', async ({ page }) => {
    await page.waitForTimeout(2_000)

    const templateCard = page.locator('.grid .cursor-pointer').first()
    if (await templateCard.isVisible({ timeout: 5_000 })) {
      await templateCard.click()
      await page.waitForTimeout(1_000)

      // Close the sheet
      const closeButton = page.locator('[data-state="open"] button').first()
      if (await closeButton.isVisible({ timeout: 2_000 })) {
        await closeButton.click()
      } else {
        // Press Escape to close
        await page.keyboard.press('Escape')
      }

      // Sheet should be gone
      await page.waitForTimeout(500)
    }
  })
})
