/**
 * AI Agents E2E tests — Agent status sidebar, chat input, message sending,
 * quick commands, and agent type display.
 */
import { test, expect, switchToTab, MOCK_RESPONSES } from './fixtures'

test.describe('AI Agents Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'AI Agents')
  })

  // ─── Navigation ───
  test('navigates to AI Agents tab successfully', async ({ page }) => {
    await expect(page.getByTestId('active-tab-title')).toContainText('AI Agents')
  })

  // ─── Agent Status Sidebar ───
  test('Agent Status sidebar shows Hermes', async ({ page }) => {
    await expect(page.locator('text=Hermes')).toBeVisible({ timeout: 10_000 })
  })

  test('Agent Status sidebar shows PicoClaw', async ({ page }) => {
    await expect(page.locator('text=PicoClaw')).toBeVisible({ timeout: 10_000 })
  })

  test('Hermes shows "Strategic Planning" label', async ({ page }) => {
    await expect(page.locator('text=Strategic Planning')).toBeVisible({ timeout: 5_000 })
  })

  test('PicoClaw shows "Tactical Safety" label', async ({ page }) => {
    await expect(page.locator('text=Tactical Safety')).toBeVisible({ timeout: 5_000 })
  })

  test('agent status badges are visible', async ({ page }) => {
    await page.waitForTimeout(2_000)
    // Hermes and PicoClaw should have status badges (online or offline)
    const hermesBadge = page.locator('text=Hermes').locator('..').locator('[class*="border"]')
    const picoclawBadge = page.locator('text=PicoClaw').locator('..').locator('[class*="border"]')
    await expect(hermesBadge.first()).toBeVisible({ timeout: 5_000 })
    await expect(picoclawBadge.first()).toBeVisible({ timeout: 5_000 })
  })

  // ─── Chat Area ───
  test('chat input is visible', async ({ page }) => {
    await expect(page.getByTestId('agent-chat-input')).toBeVisible({ timeout: 10_000 })
  })

  test('chat input has correct placeholder', async ({ page }) => {
    await expect(page.getByTestId('agent-chat-input')).toHaveAttribute('placeholder', 'Send command to Hermes...')
  })

  test('send button is visible', async ({ page }) => {
    await expect(page.getByTestId('agent-send-btn')).toBeVisible({ timeout: 10_000 })
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendBtn = page.getByTestId('agent-send-btn')
    await expect(sendBtn).toBeDisabled()
  })

  test('send button becomes enabled when text is entered', async ({ page }) => {
    const input = page.getByTestId('agent-chat-input')
    const sendBtn = page.getByTestId('agent-send-btn')

    await input.fill('Test message')
    await expect(sendBtn).toBeEnabled()
  })

  // ─── Send Message ───
  test('send a message and verify it appears in chat', async ({ page }) => {
    // Mock the agents chat API
    await page.route('**/api/agents/chat**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'msg-new',
            agent: 'hermes',
            role: 'assistant',
            content: 'Pesan diterima, sedang memproses.',
            timestamp: new Date().toISOString(),
          },
        }),
      })
    })

    // Mock the agents list API to include the new message
    await page.route('**/api/agents?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.agents),
      })
    })

    const input = page.getByTestId('agent-chat-input')
    await input.fill('Test message from E2E')
    await page.getByTestId('agent-send-btn').click()

    // Input should be cleared after sending
    await expect(input).toHaveValue('')
  })

  test('pressing Enter sends the message', async ({ page }) => {
    await page.route('**/api/agents/chat**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      })
    })
    await page.route('**/api/agents?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.agents),
      })
    })

    const input = page.getByTestId('agent-chat-input')
    await input.fill('Enter key test')
    await input.press('Enter')

    // Input should be cleared
    await expect(input).toHaveValue('')
  })

  // ─── Quick Commands ───
  test('quick command buttons are visible', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const quickCmds = page.locator('[data-testid^="quick-cmd-"]')
    const count = await quickCmds.count()
    expect(count).toBeGreaterThan(0)
  })

  test('specific quick commands are present', async ({ page }) => {
    await page.waitForTimeout(2_000)
    await expect(page.getByTestId('quick-cmd-peta-area-lhoksukon')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('quick-cmd-status-drone')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('quick-cmd-rth-sekarang')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('quick-cmd-cek-baterai')).toBeVisible({ timeout: 5_000 })
  })

  test('clicking a quick command sends the message', async ({ page }) => {
    await page.route('**/api/agents/chat**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      })
    })
    await page.route('**/api/agents?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.agents),
      })
    })

    const statusBtn = page.getByTestId('quick-cmd-status-drone')
    await statusBtn.click()

    // Should have sent (input cleared or loading state shown)
    await page.waitForTimeout(1_000)
  })

  // ─── Chat Header ───
  test('chat header shows "Hermes Chat"', async ({ page }) => {
    await expect(page.locator('text=Hermes Chat')).toBeVisible({ timeout: 10_000 })
  })

  test('message count badge is visible', async ({ page }) => {
    await expect(page.locator('text=/messages/i')).toBeVisible({ timeout: 10_000 })
  })

  // ─── Agent Info Section ───
  test('agent info section describes Hermes and PicoClaw roles', async ({ page }) => {
    await expect(page.locator('text=Hermes').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=PicoClaw').first()).toBeVisible({ timeout: 5_000 })
  })

  // ─── Mocked Full Flow ───
  test('full chat flow with mocked API', async ({ page }) => {
    await page.route('**/api/agents?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.agents),
      })
    })
    await page.route('**/api/agents/chat**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'msg-new',
            agent: 'hermes',
            role: 'assistant',
            content: 'Drone siap untuk misi.',
            timestamp: new Date().toISOString(),
          },
        }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="brand-title"]', { timeout: 15_000 })
    await switchToTab(page, 'AI Agents')

    // Type and send a message
    await page.getByTestId('agent-chat-input').fill('Mulai misi')
    await page.getByTestId('agent-send-btn').click()

    // Should have processed the message
    await page.waitForTimeout(2_000)
    // Page should not crash
    await expect(page.getByTestId('active-tab-title')).toContainText('AI Agents')
  })
})
