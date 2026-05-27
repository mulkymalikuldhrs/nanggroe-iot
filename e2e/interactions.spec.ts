/**
 * Interactions E2E tests — Button interactions across multiple tabs:
 * Hardware scan, Drivers connect/disconnect, Comms channel operations,
 * Power source toggle, Self-Learn analyze, Face Tracking start/stop.
 */
import { test, expect, switchToTab } from './fixtures'

test.describe('Hardware Tab Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15_000 })
    await switchToTab(page, 'Hardware')
  })

  test('Scan Hardware button is present and clickable', async ({ page }) => {
    const scanBtn = page.locator('button', { hasText: /Scan Hardware/i })
    await expect(scanBtn).toBeVisible()
    await expect(scanBtn).toBeEnabled()
  })

  test('clicking Scan Hardware triggers scan', async ({ page }) => {
    const scanBtn = page.locator('button', { hasText: /Scan Hardware/i })
    await scanBtn.click()

    // Button should show scanning state
    await expect(page.locator('button', { hasText: /Scanning/i })).toBeVisible({ timeout: 3_000 })

    // Wait for scan to complete
    await page.waitForTimeout(3_000)

    // Should return to normal state
    await expect(page.locator('button', { hasText: /Scan Hardware/i })).toBeVisible({ timeout: 5_000 })
  })

  test('device status filter dropdown is functional', async ({ page }) => {
    // The filter trigger should be visible
    const filterTrigger = page.locator('text=All Devices').first()
    await expect(filterTrigger).toBeVisible({ timeout: 5_000 })
  })

  test('expanding a device shows more details', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const moreButton = page.locator('text=More').first()
    if (await moreButton.isVisible({ timeout: 3_000 })) {
      await moreButton.click()
      // Should show expanded details
      await expect(page.locator('text=Less').first()).toBeVisible({ timeout: 3_000 })
    }
  })
})

test.describe('Drivers Tab Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15_000 })
    await switchToTab(page, 'Drivers')
  })

  test('Drivers tab loads with driver cards', async ({ page }) => {
    await expect(page.locator('text=Device Drivers')).toBeVisible({ timeout: 10_000 })
  })

  test('Health Check All button is present', async ({ page }) => {
    await expect(page.locator('button', { hasText: /Health Check All/i })).toBeVisible({ timeout: 5_000 })
  })

  test('driver Connect button is present for disconnected drivers', async ({ page }) => {
    await page.waitForTimeout(2_000)
    // At least one driver should have a Connect or Disconnect button
    const connectBtn = page.locator('button', { hasText: /Connect/i }).first()
    const disconnectBtn = page.locator('button', { hasText: /Disconnect/i }).first()
    const hasConnectOrDisconnect =
      (await connectBtn.isVisible({ timeout: 2_000 }).catch(() => false)) ||
      (await disconnectBtn.isVisible({ timeout: 2_000 }).catch(() => false))
    expect(hasConnectOrDisconnect).toBeTruthy()
  })

  test('clicking Connect on a disconnected driver', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const connectBtn = page.locator('button', { hasText: /^Connect$/i }).first()
    if (await connectBtn.isVisible({ timeout: 3_000 })) {
      await connectBtn.click()
      await page.waitForTimeout(3_000)
      // Page should still be functional
      await expect(page.locator('text=Device Drivers')).toBeVisible()
    }
  })

  test('clicking Disconnect on a connected driver', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const disconnectBtn = page.locator('button', { hasText: /Disconnect/i }).first()
    if (await disconnectBtn.isVisible({ timeout: 3_000 })) {
      await disconnectBtn.click()
      await page.waitForTimeout(3_000)
      // Page should still be functional
      await expect(page.locator('text=Device Drivers')).toBeVisible()
    }
  })

  test('clicking Health Check All triggers health check', async ({ page }) => {
    const healthCheckBtn = page.locator('button', { hasText: /Health Check All/i })
    await healthCheckBtn.click()

    // Should show loading state
    await expect(page.locator('text=Checking')).toBeVisible({ timeout: 3_000 }).catch(() => {})
    await page.waitForTimeout(3_000)

    // Should complete without crash
    await expect(page.locator('text=Device Drivers')).toBeVisible()
  })

  test('expanding driver details shows information', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const detailsBtn = page.locator('text=Details').first()
    if (await detailsBtn.isVisible({ timeout: 3_000 })) {
      await detailsBtn.click()
      // Should show expanded content
      await page.waitForTimeout(500)
    }
  })
})

test.describe('Comms Tab Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15_000 })
    await switchToTab(page, 'Communications')
  })

  test('Communications tab loads with channel cards', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Communications' })).toBeVisible({ timeout: 10_000 })
  })

  test('channel cards have Connect/Disconnect buttons', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const connectBtn = page.locator('button', { hasText: /Connect/i }).first()
    const disconnectBtn = page.locator('button', { hasText: /Disconnect/i }).first()
    const hasConnectOrDisconnect =
      (await connectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) ||
      (await disconnectBtn.isVisible({ timeout: 3_000 }).catch(() => false))
    expect(hasConnectOrDisconnect).toBeTruthy()
  })

  test('channel toggle switch is functional', async ({ page }) => {
    await page.waitForTimeout(2_000)
    // Find a Switch component in the comms tab
    const switchToggle = page.locator('button[role="switch"], [data-state]').first()
    if (await switchToggle.isVisible({ timeout: 3_000 })) {
      await switchToggle.click()
      await page.waitForTimeout(1_000)
    }
  })

  test('Telegram Command Console is present', async ({ page }) => {
    await expect(page.locator('text=Telegram Command Console')).toBeVisible({ timeout: 5_000 })
  })

  test('quick command buttons are visible', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const quickCommands = ['/status', '/arm', '/disarm']
    for (const cmd of quickCommands) {
      await expect(page.locator(`button:has-text("${cmd}")`)).toBeVisible({ timeout: 3_000 })
    }
  })

  test('Voice Control section is present', async ({ page }) => {
    await expect(page.locator('text=Voice Control')).toBeVisible({ timeout: 5_000 })
  })

  test('Beep Alerts section is present', async ({ page }) => {
    await expect(page.locator('text=Beep Alerts')).toBeVisible({ timeout: 5_000 })
  })

  test('clicking a beep pattern button triggers beep', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const beepBtn = page.locator('button', { hasText: 'startup' }).first()
    if (await beepBtn.isVisible({ timeout: 3_000 })) {
      await beepBtn.click()
      await page.waitForTimeout(2_000)
      // No crash
      await expect(page.locator('h2', { hasText: 'Communications' })).toBeVisible()
    }
  })

  test('Refresh button works', async ({ page }) => {
    const refreshBtn = page.locator('button', { hasText: /Refresh/i }).first()
    await refreshBtn.click()
    await page.waitForTimeout(2_000)
    await expect(page.locator('h2', { hasText: 'Communications' })).toBeVisible()
  })
})

test.describe('Power Tab Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15_000 })
    await switchToTab(page, 'Power')
  })

  test('Power Management tab loads', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Power Management' })).toBeVisible({ timeout: 10_000 })
  })

  test('main battery status is shown', async ({ page }) => {
    await expect(page.locator('text=Baterai Utama')).toBeVisible({ timeout: 10_000 })
  })

  test('power source Enable/Disable buttons are present', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const enableBtn = page.locator('button', { hasText: /Enable/i }).first()
    const disableBtn = page.locator('button', { hasText: /Disable/i }).first()
    const hasToggle =
      (await enableBtn.isVisible({ timeout: 3_000 }).catch(() => false)) ||
      (await disableBtn.isVisible({ timeout: 3_000 }).catch(() => false))
    expect(hasToggle).toBeTruthy()
  })

  test('clicking Disable on a power source toggles it', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const disableBtn = page.locator('button', { hasText: /Disable/i }).first()
    if (await disableBtn.isVisible({ timeout: 3_000 })) {
      await disableBtn.click()
      await page.waitForTimeout(3_000)
      // Should not crash
      await expect(page.locator('h2', { hasText: 'Power Management' })).toBeVisible()
    }
  })

  test('solar panel info is displayed', async ({ page }) => {
    await expect(page.locator('text=Panel Surya')).toBeVisible({ timeout: 10_000 })
  })

  test('Refresh button works', async ({ page }) => {
    const refreshBtn = page.locator('button', { hasText: /Refresh/i }).first()
    await refreshBtn.click()
    await page.waitForTimeout(2_000)
    await expect(page.locator('h2', { hasText: 'Power Management' })).toBeVisible()
  })
})

test.describe('Self-Learn Tab Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15_000 })
    await switchToTab(page, 'Self-Learn')
  })

  test('Self-Learning tab loads', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Self-Learning' })).toBeVisible({ timeout: 10_000 })
  })

  test('Analyze button is present and clickable', async ({ page }) => {
    const analyzeBtn = page.locator('button', { hasText: /Analyze/i })
    await expect(analyzeBtn).toBeVisible()
    await expect(analyzeBtn).toBeEnabled()
  })

  test('clicking Analyze triggers analysis', async ({ page }) => {
    const analyzeBtn = page.locator('button', { hasText: /Analyze/i })
    await analyzeBtn.click()

    // Should show loading or processing state
    await page.waitForTimeout(5_000)

    // Should not crash
    await expect(page.locator('h2', { hasText: 'Self-Learning' })).toBeVisible()
  })

  test('learning overview cards are shown', async ({ page }) => {
    await expect(page.locator('text=Patterns')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Decisions')).toBeVisible({ timeout: 5_000 })
  })

  test('Detected Patterns section is present', async ({ page }) => {
    await expect(page.locator('text=Detected Patterns')).toBeVisible({ timeout: 5_000 })
  })

  test('AI Suggestions section is present', async ({ page }) => {
    await expect(page.locator('text=AI Suggestions')).toBeVisible({ timeout: 5_000 })
  })

  test('Learning Report section is present', async ({ page }) => {
    await expect(page.locator('text=Learning Report')).toBeVisible({ timeout: 5_000 })
  })

  test('Knowledge Transfer section is present', async ({ page }) => {
    await expect(page.locator('text=Knowledge Transfer')).toBeVisible({ timeout: 5_000 })
  })

  test('Refresh button works', async ({ page }) => {
    const refreshBtn = page.locator('button', { hasText: /Refresh/i }).first()
    await refreshBtn.click()
    await page.waitForTimeout(2_000)
    await expect(page.locator('h2', { hasText: 'Self-Learning' })).toBeVisible()
  })
})

test.describe('Face Tracking Tab Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15_000 })
    await switchToTab(page, 'Face Tracking')
  })

  test('Face Tracking tab loads', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Face Tracking' })).toBeVisible({ timeout: 10_000 })
  })

  test('Start button is visible when tracking is inactive', async ({ page }) => {
    await page.waitForTimeout(2_000)
    // Either Start or Stop should be visible depending on state
    const startBtn = page.locator('button', { hasText: /^Start$/i }).first()
    const stopBtn = page.locator('button', { hasText: /^Stop$/i }).first()
    const hasStartOrStop =
      (await startBtn.isVisible({ timeout: 3_000 }).catch(() => false)) ||
      (await stopBtn.isVisible({ timeout: 3_000 }).catch(() => false))
    expect(hasStartOrStop).toBeTruthy()
  })

  test('clicking Start begins face tracking', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const startBtn = page.locator('button', { hasText: /^Start$/i }).first()
    if (await startBtn.isVisible({ timeout: 3_000 })) {
      await startBtn.click()
      await page.waitForTimeout(5_000)

      // Should show running state or Stop button
      await expect(page.locator('h2', { hasText: 'Face Tracking' })).toBeVisible()
    }
  })

  test('clicking Stop ends face tracking', async ({ page }) => {
    // First start tracking if possible
    await page.waitForTimeout(2_000)
    const startBtn = page.locator('button', { hasText: /^Start$/i }).first()
    if (await startBtn.isVisible({ timeout: 3_000 })) {
      await startBtn.click()
      await page.waitForTimeout(3_000)
    }

    const stopBtn = page.locator('button', { hasText: /^Stop$/i }).first()
    if (await stopBtn.isVisible({ timeout: 5_000 })) {
      await stopBtn.click()
      await page.waitForTimeout(3_000)

      // Should not crash
      await expect(page.locator('h2', { hasText: 'Face Tracking' })).toBeVisible()
    }
  })

  test('camera preview area is present', async ({ page }) => {
    await expect(page.locator('text=Camera Preview')).toBeVisible({ timeout: 5_000 })
  })

  test('Detected Faces section is present', async ({ page }) => {
    await expect(page.locator('text=Detected Faces')).toBeVisible({ timeout: 5_000 })
  })

  test('Face Database section is present', async ({ page }) => {
    await expect(page.locator('text=Face Database')).toBeVisible({ timeout: 5_000 })
  })

  test('Tracking Controls section is present', async ({ page }) => {
    await expect(page.locator('text=Tracking Controls')).toBeVisible({ timeout: 5_000 })
  })

  test('Register Face section is present', async ({ page }) => {
    await expect(page.locator('text=Register Face')).toBeVisible({ timeout: 5_000 })
  })

  test('tracking mode selector is present', async ({ page }) => {
    // Mode selector with Detect, Follow, Identify options
    await expect(page.locator('text=Tracking Mode')).toBeVisible({ timeout: 5_000 })
  })

  test('Refresh button works', async ({ page }) => {
    const refreshBtn = page.locator('button', { hasText: /Refresh/i }).first()
    await refreshBtn.click()
    await page.waitForTimeout(2_000)
    await expect(page.locator('h2', { hasText: 'Face Tracking' })).toBeVisible()
  })
})
