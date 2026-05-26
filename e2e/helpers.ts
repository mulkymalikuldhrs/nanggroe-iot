/**
 * Helper utilities for Nanggroe IoT E2E tests
 */
import { type Page, type Route } from '@playwright/test'
import { MOCK_RESPONSES, type TabId, TAB_LABELS } from './fixtures'

/**
 * Wait for a specific API call to complete
 * @param page - Playwright page instance
 * @param url - URL pattern to match (e.g., '/api/hardware')
 * @param options - Optional timeout and method filter
 */
export async function waitForApiCall(
  page: Page,
  url: string,
  options?: { timeout?: number; method?: string }
): Promise<void> {
  const timeout = options?.timeout ?? 10_000
  const method = options?.method

  await page.waitForResponse(
    (response) => {
      const urlMatches = response.url().includes(url)
      const methodMatches = method ? response.request().method() === method : true
      return urlMatches && methodMatches
    },
    { timeout }
  )
}

/**
 * Navigate to a specific tab by clicking it in the sidebar or mobile nav
 * @param page - Playwright page instance
 * @param tabId - Tab identifier (e.g., 'hardware', 'agents')
 */
export async function navigateToTab(page: Page, tabId: TabId): Promise<void> {
  const label = TAB_LABELS[tabId]

  // Try data-testid first
  const testIdBtn = page.getByTestId(`nav-tab-${tabId}`)
  if (await testIdBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await testIdBtn.click()
    return
  }

  // Try desktop sidebar
  const sidebarBtn = page.locator('aside nav button', { hasText: label })
  if (await sidebarBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await sidebarBtn.click()
    return
  }

  // Fallback to mobile bottom nav
  const mobileBtn = page.locator('nav button', { hasText: label }).first()
  await mobileBtn.click()
}

/**
 * Fill multiple form fields at once
 * @param page - Playwright page instance
 * @param fields - Object mapping selectors/labels to values
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    // Try to find input by associated label text
    const inputByLabel = page.locator(`label:has-text("${label}") + input, label:has-text("${label}") ~ input`).first()
    if (await inputByLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await inputByLabel.fill(value)
      continue
    }

    // Try by placeholder
    const inputByPlaceholder = page.locator(`input[placeholder*="${label}"]`).first()
    if (await inputByPlaceholder.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await inputByPlaceholder.fill(value)
      continue
    }

    // Try textarea by label
    const textareaByLabel = page.locator(`label:has-text("${label}") + textarea, label:has-text("${label}") ~ textarea`).first()
    if (await textareaByLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await textareaByLabel.fill(value)
      continue
    }
  }
}

/**
 * Mock an API response for testing without a running backend
 * @param page - Playwright page instance
 * @param url - URL pattern to match (e.g., '/api/hardware')
 * @param response - Response object or status/body
 */
export async function mockApiResponse(
  page: Page,
  url: string,
  response: { status?: number; body: Record<string, unknown> }
): Promise<void> {
  await page.route(`**${url}**`, (route: Route) => {
    route.fulfill({
      status: response.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    })
  })
}

/**
 * Mock a specific API method (GET, POST, PUT, DELETE)
 */
export async function mockApiMethod(
  page: Page,
  url: string,
  method: string,
  response: { status?: number; body: Record<string, unknown> }
): Promise<void> {
  await page.route(`**${url}**`, (route: Route) => {
    if (route.request().method() === method) {
      route.fulfill({
        status: response.status ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(response.body),
      })
    } else {
      route.continue()
    }
  })
}

/**
 * Setup all API mocks for a page (useful for testing without backend)
 * @param page - Playwright page instance
 */
export async function setupApiMocks(page: Page): Promise<void> {
  await mockApiResponse(page, '/api/hardware', { body: MOCK_RESPONSES.hardware })
  await mockApiResponse(page, '/api/missions', { body: MOCK_RESPONSES.missions })
  await mockApiResponse(page, '/api/agents', { body: MOCK_RESPONSES.agents })
  await mockApiResponse(page, '/api/telemetry', { body: MOCK_RESPONSES.telemetry })
  await mockApiResponse(page, '/api/power', { body: MOCK_RESPONSES.power })
  await mockApiResponse(page, '/api/navigation', { body: MOCK_RESPONSES.navigation })
  await mockApiResponse(page, '/api/system', { body: MOCK_RESPONSES.system })
  await mockApiResponse(page, '/api/flash', { body: MOCK_RESPONSES.flash })
}

/**
 * Wait for loading skeletons to disappear
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in ms
 */
export async function waitForLoadingComplete(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    () => {
      const skeletons = document.querySelectorAll('.animate-pulse, [data-loading]')
      const loaders = document.querySelectorAll('.loader, [data-testid="loading"]')
      return skeletons.length === 0 && loaders.length === 0
    },
    { timeout }
  ).catch(() => {})
  await page.waitForTimeout(300)
}

/**
 * Dismiss any open dialogs by pressing Escape
 */
export async function dismissDialogs(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

/**
 * Get the text content of the active tab header
 */
export async function getActiveHeader(page: Page): Promise<string> {
  const header = page.locator('header h2')
  return (await header.textContent())?.trim() || ''
}

/**
 * Check if an element is visible with a short timeout
 */
export async function isVisible(page: Page, selector: string, timeout = 3_000): Promise<boolean> {
  return page.locator(selector).isVisible({ timeout }).catch(() => false)
}

/**
 * Click a button and wait for a network response
 */
export async function clickAndWaitForApi(
  page: Page,
  buttonSelector: string,
  apiUrl: string,
  options?: { timeout?: number; method?: string }
): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes(apiUrl) && (options?.method ? res.request().method() === options.method : true),
      { timeout: options?.timeout ?? 10_000 }
    ),
    page.locator(buttonSelector).click(),
  ])
  // Wait for response processing
  await page.waitForTimeout(500)
}
