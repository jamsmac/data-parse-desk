/**
 * E2E Test Helpers
 * Utilities for stable and reliable E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for element with retry logic
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' } = {}
) {
  const timeout = options.timeout || 10000;
  const state = options.state || 'visible';

  await page.waitForSelector(selector, { timeout, state });
}

/**
 * Login helper - reusable across tests
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login');

  // Wait for form to be ready
  await waitForElement(page, 'input[type="email"]');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await waitForNetworkIdle(page);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Click user menu
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Profile"), button[aria-label*="user"]').first();

  if (await userMenu.isVisible({ timeout: 5000 })) {
    await userMenu.click();

    // Click logout
    const logoutButton = page.locator('text=/выйти|logout|sign out/i');
    await logoutButton.click();

    // Wait for redirect to login
    await page.waitForURL(/login|auth/, { timeout: 10000 });
  }
}

/**
 * Create test database
 */
export async function createTestDatabase(page: Page, name: string) {
  // Click create button
  await page.click('button:has-text("Создать"), button:has-text("Create"), [data-testid="create-database"]');

  // Wait for dialog
  await waitForElement(page, 'input[placeholder*="название"], input[placeholder*="name"]');

  // Fill name
  await page.fill('input[placeholder*="название"], input[placeholder*="name"]', name);

  // Submit
  await page.click('button[type="submit"]:has-text("Создать"), button[type="submit"]:has-text("Create")');

  // Wait for creation
  await waitForNetworkIdle(page);

  // Verify database appears
  await expect(page.locator(`text="${name}"`)).toBeVisible({ timeout: 10000 });

  return name;
}

/**
 * Delete test database
 */
export async function deleteTestDatabase(page: Page, name: string) {
  // Find database card
  const dbCard = page.locator(`[data-testid="database-card"]:has-text("${name}")`).first();

  if (await dbCard.isVisible({ timeout: 5000 })) {
    // Click options menu
    await dbCard.locator('button[aria-label*="меню"], button[aria-label*="menu"], button[aria-label*="options"]').click();

    // Click delete
    await page.click('text=/удалить|delete/i');

    // Confirm deletion
    await page.click('button:has-text("Удалить"), button:has-text("Delete"), button:has-text("Confirm")');

    // Wait for deletion
    await waitForNetworkIdle(page);

    // Verify database is gone
    await expect(page.locator(`text="${name}"`)).not.toBeVisible();
  }
}

/**
 * Import CSV data
 */
export async function importCSV(page: Page, csvContent: string, fileName = 'test.csv') {
  // Click import button
  await page.click('button:has-text("Импорт"), button:has-text("Import")');

  // Wait for file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.waitFor({ state: 'attached', timeout: 10000 });

  // Create file from string content
  const buffer = Buffer.from(csvContent, 'utf-8');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: 'text/csv',
    buffer,
  });

  // Wait for parsing
  await waitForNetworkIdle(page);

  // Click next/confirm
  const nextButton = page.locator('button:has-text("Далее"), button:has-text("Next"), button:has-text("Confirm")');
  if (await nextButton.isVisible({ timeout: 5000 })) {
    await nextButton.click();
    await waitForNetworkIdle(page);
  }
}

/**
 * Take screenshot on failure
 */
export async function takeScreenshotOnFailure(page: Page, testName: string) {
  try {
    const screenshot = await page.screenshot({
      path: `test-results/screenshots/${testName.replace(/\s+/g, '-')}-${Date.now()}.png`,
      fullPage: true,
    });
    return screenshot;
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    return null;
  }
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message?: string, timeout = 5000) {
  const toastSelector = '[data-testid="toast"], [role="status"], .toast, [class*="toast"]';

  await page.waitForSelector(toastSelector, { timeout, state: 'visible' });

  if (message) {
    await expect(page.locator(`${toastSelector}:has-text("${message}")`)).toBeVisible();
  }
}

/**
 * Wait for loading to finish
 */
export async function waitForLoading(page: Page, timeout = 10000) {
  // Wait for loading spinners to disappear
  const loadingSelectors = [
    '[data-testid="loading"]',
    '[data-testid="spinner"]',
    '.loading',
    '.spinner',
    '[aria-label*="loading"]',
  ];

  for (const selector of loadingSelectors) {
    const loading = page.locator(selector);
    if (await loading.isVisible({ timeout: 1000 }).catch(() => false)) {
      await loading.waitFor({ state: 'hidden', timeout });
    }
  }
}

/**
 * Retry action with exponential backoff
 */
export async function retryWithBackoff<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  url: string | RegExp,
  response: unknown,
  status = 200
) {
  await page.route(url, async route => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Test data generator
 */
export const generateTestData = {
  email: () => `test-${Date.now()}@example.com`,
  password: () => `Pass${Math.random().toString(36).slice(2)}123!`,
  databaseName: () => `Test DB ${Date.now()}`,
  projectName: () => `Test Project ${Date.now()}`,
  tableName: () => `test_table_${Date.now()}`,
};

/**
 * Cleanup test data
 */
export async function cleanupTestData(page: Page) {
  // Delete all databases with "Test" in name
  const testDatabases = page.locator('[data-testid="database-card"]:has-text("Test")');
  const count = await testDatabases.count();

  for (let i = 0; i < count; i++) {
    try {
      const db = testDatabases.nth(i);
      const name = await db.locator('[data-testid="database-name"]').textContent();
      if (name && name.includes('Test')) {
        await deleteTestDatabase(page, name);
      }
    } catch (error) {
      console.error('Failed to cleanup database:', error);
    }
  }
}
