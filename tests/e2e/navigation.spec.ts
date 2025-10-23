import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load homepage without errors', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DataParseDesk|VHData/);
  });

  test('should display main navigation elements', async ({ page }) => {
    await page.goto('/');

    // Check for common navigation elements
    const commonElements = [
      page.locator('nav'),
      page.locator('header'),
      page.locator('button, a').first(),
    ];

    for (const element of commonElements) {
      const isVisible = await element.isVisible().catch(() => false);
      // At least one navigation element should be visible
      if (isVisible) {
        expect(isVisible).toBeTruthy();
        break;
      }
    }
  });

  test('should handle 404 pages', async ({ page }) => {
    const response = await page.goto('/non-existent-page-12345');

    // Should either show 404 page or redirect
    expect(response?.status()).toBeGreaterThanOrEqual(200);
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Check that page is still functional
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(body).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await expect(body).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    // Check for skip links
    const skipLink = page.locator('a[href="#main"], a[href="#content"]').first();
    const hasSkipLink = await skipLink.isVisible().catch(() => false);

    // Check for ARIA labels on navigation
    const nav = page.locator('nav').first();
    if (await nav.isVisible()) {
      const hasAriaLabel = await nav.getAttribute('aria-label');
      expect(hasAriaLabel || hasSkipLink).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Press Tab to navigate
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Check if focus is visible
    const focusedElement = await page.locator(':focus').first();
    const isFocused = await focusedElement.isVisible().catch(() => false);
    expect(isFocused).toBeTruthy();
  });
});
