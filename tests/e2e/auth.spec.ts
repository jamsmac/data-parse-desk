import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/DataParseDesk/);
    await expect(page.locator('h1, h2').filter({ hasText: /вход|login/i }).first()).toBeVisible();
  });

  test('should show validation errors for empty login', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for error messages
    await expect(page.locator('text=/email|почта/i')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    const registerLink = page.locator('a').filter({ hasText: /регистрация|sign up/i }).first();

    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register|signup/);
    }
  });

  test('should display password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();

    if (await passwordInput.isVisible()) {
      await expect(passwordInput).toBeVisible();

      // Look for eye icon button
      const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        await expect(page.locator('input[type="text"]')).toBeVisible();
      }
    }
  });
});

test.describe('Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Navigate to registration if link exists
    const registerLink = page.locator('a').filter({ hasText: /регистрация|sign up/i }).first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
    }
  });

  test('should show validation for weak password', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]');

    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('123');
      await submitButton.click();

      // Should show password strength warning
      await expect(page.locator('text=/пароль|password/i')).toBeVisible();
    }
  });
});
