import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Authentication fixture for E2E tests
 * Provides authenticated page context for tests that require logged-in users
 */

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Get test credentials from environment
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'TestPassword123!';

    // Navigate to login page
    await page.goto('/login');

    // Wait for login form to be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Fill in credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for successful authentication (redirect to dashboard or tables)
    await page.waitForURL(/\/(dashboard|tables)/, { timeout: 10000 });

    // Verify authentication succeeded
    await expect(page).toHaveURL(/\/(dashboard|tables)/);

    // Provide authenticated page to test
    await use(page);

    // Cleanup: logout after test (optional)
    // await page.click('[data-testid="user-menu"]');
    // await page.click('[data-testid="logout"]');
  },
});

export { expect };
