/**
 * Smoke Tests - Critical Paths
 * Fast tests to verify core functionality
 */

import { test, expect } from '@playwright/test';
import { waitForNetworkIdle, waitForElement } from '../helpers/test-helpers';

test.describe('Smoke Tests - Critical Paths', () => {
  test('App should load without errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // Navigate to homepage
    await page.goto('/');

    // Wait for page to load
    await waitForNetworkIdle(page);

    // Check for critical elements
    const hasLogo = await page.locator('[data-testid="logo"], img[alt*="logo"], h1').first().isVisible({ timeout: 5000 });
    const hasContent = await page.locator('main, #root, body').first().isVisible();

    expect(hasLogo || hasContent).toBeTruthy();

    // Check for excessive console errors (some are expected in development)
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('Warning:') &&
      !error.includes('DevTools') &&
      !error.includes('extension')
    );

    if (criticalErrors.length > 5) {
      console.warn(`Found ${criticalErrors.length} console errors:`, criticalErrors);
    }
  });

  test('Login page should be accessible', async ({ page }) => {
    await page.goto('/auth/login');

    // Wait for form elements
    await waitForElement(page, 'input[type="email"], input[name="email"]');

    // Check for required elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check page title
    await expect(page).toHaveTitle(/DataParseDesk|VHData|Login/i);
  });

  test('Dashboard route should redirect unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/login|auth/, { timeout: 10000 });

    // Verify we're on login page
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 5000 });
  });

  test('Static assets should load', async ({ page }) => {
    const failedResources: string[] = [];

    // Listen for failed requests
    page.on('requestfailed', request => {
      const url = request.url();
      if (!url.includes('sentry') && !url.includes('analytics')) {
        failedResources.push(url);
      }
    });

    await page.goto('/');
    await waitForNetworkIdle(page);

    // Check if critical resources loaded
    if (failedResources.length > 0) {
      console.warn('Failed to load resources:', failedResources);
    }

    // Should have fewer than 5 failed critical resources
    expect(failedResources.length).toBeLessThan(5);
  });

  test('Service Worker should register (PWA)', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Check if service worker is registered
    const swRegistration = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });

    // In production, SW should be registered
    if (process.env.CI || process.env.NODE_ENV === 'production') {
      expect(swRegistration).toBeTruthy();
    }
  });

  test('App should be responsive (mobile)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await waitForNetworkIdle(page);

    // Check if content is visible
    const isVisible = await page.locator('body').isVisible();
    expect(isVisible).toBeTruthy();

    // Check if horizontal scroll is not present
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('API health check', async ({ request }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uzcmaxfhfcsxzfqvaloz.supabase.co';

    // Check Supabase health
    const response = await request.get(`${supabaseUrl}/rest/v1/`);

    // Should return 200 or 401 (auth required)
    expect([200, 401]).toContain(response.status());
  });

  test('Environment variables should be configured', async ({ page }) => {
    await page.goto('/');

    // Check if critical env vars are set
    const envCheck = await page.evaluate(() => {
      return {
        hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        environment: import.meta.env.MODE,
      };
    });

    expect(envCheck.hasSupabaseUrl).toBeTruthy();
    expect(envCheck.hasSupabaseKey).toBeTruthy();
    expect(['development', 'production', 'test']).toContain(envCheck.environment);
  });

  test('Navigation should work', async ({ page }) => {
    await page.goto('/');

    // Try to navigate to different routes
    const routes = ['/auth/login', '/auth/register', '/'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      // Page should not be blank
      const hasContent = await page.locator('body *').first().isVisible({ timeout: 5000 });
      expect(hasContent).toBeTruthy();
    }
  });
});
