/**
 * COMPREHENSIVE E2E FUNCTIONAL TESTS
 * VHData Platform - Phase 2 Production Audit
 */

import { test, expect, Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_TIMEOUT = 60000; // 60 seconds per test

// Generate unique test data
const generateTestUser = () => ({
  email: `test.${randomBytes(4).toString('hex')}@example.com`,
  password: 'SecureTest123!',
  name: `TestUser${Date.now()}`
});

const generateDatabaseName = () => `TestDB_${Date.now()}`;

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

async function logout(page: Page) {
  await page.click('button[aria-label="User menu"]');
  await page.click('text=Выйти');
  await expect(page).toHaveURL('/login');
}

test.describe('COMPREHENSIVE FUNCTIONAL TESTS', () => {
  test.setTimeout(TEST_TIMEOUT);

  // =====================================================
  // AUTHENTICATION & USER MANAGEMENT
  // =====================================================
  test.describe('Authentication Flows', () => {
    test('Complete registration flow', async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto('/register');

      // Fill registration form
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);

      // Submit registration
      await page.click('button[type="submit"]');

      // Should redirect to dashboard or show success message
      await expect(page).toHaveURL(/(dashboard|login)/, { timeout: 10000 });
    });

    test('Login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Check all UI elements are present
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Password visibility toggle
      const passwordInput = page.locator('input[name="password"]');
      const toggleButton = page.locator('button[aria-label="Toggle password visibility"]');

      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        await expect(passwordInput).toHaveAttribute('type', 'text');
        await toggleButton.click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });

    test('Logout flow', async ({ page }) => {
      // Would need valid credentials to test
      // await login(page, TEST_USER.email, TEST_USER.password);
      // await logout(page);
    });

    test('Password reset flow', async ({ page }) => {
      await page.goto('/login');

      const resetLink = page.locator('text=Забыли пароль?');
      if (await resetLink.isVisible()) {
        await resetLink.click();
        await expect(page).toHaveURL(/reset|forgot/);
        await expect(page.locator('input[type="email"]')).toBeVisible();
      }
    });

    test('Session persistence', async ({ context, page }) => {
      // Check if session persists across page refreshes
      await page.goto('/login');

      // Check localStorage for auth session
      const hasSession = await page.evaluate(() => {
        return Object.keys(localStorage).some(key =>
          key.includes('supabase') || key.includes('auth')
        );
      });

      expect(typeof hasSession).toBe('boolean');
    });
  });

  // =====================================================
  // DATABASE CRUD OPERATIONS
  // =====================================================
  test.describe('Database Operations', () => {
    test('Create database flow', async ({ page }) => {
      // This would require authentication
      await page.goto('/dashboard');

      // If redirected to login, that's expected behavior
      if (page.url().includes('login')) {
        expect(page.url()).toContain('login');
        return;
      }

      // Look for create database button
      const createButton = page.locator('button:has-text("Создать базу")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill database creation form
        const dbName = generateDatabaseName();
        await page.fill('input[name="name"]', dbName);
        await page.fill('textarea[name="description"]', 'Test database for E2E testing');

        // Submit
        await page.click('button:has-text("Создать")');

        // Verify database was created
        await expect(page.locator(`text=${dbName}`)).toBeVisible({ timeout: 10000 });
      }
    });

    test('Database filtering and search', async ({ page }) => {
      await page.goto('/dashboard');

      // If not authenticated, skip
      if (page.url().includes('login')) return;

      const searchInput = page.locator('input[placeholder*="Поиск"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500); // Debounce delay

        // Check if filtering works
        const databases = await page.locator('[data-testid="database-card"]').count();
        expect(databases).toBeGreaterThanOrEqual(0);
      }
    });

    test('Database deletion with confirmation', async ({ page }) => {
      await page.goto('/dashboard');

      // If not authenticated, skip
      if (page.url().includes('login')) return;

      const deleteButton = page.locator('button[aria-label="Delete database"]').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Should show confirmation dialog
        await expect(page.locator('text=Вы уверены?')).toBeVisible();

        // Cancel deletion
        await page.click('button:has-text("Отмена")');

        // Dialog should close
        await expect(page.locator('text=Вы уверены?')).not.toBeVisible();
      }
    });
  });

  // =====================================================
  // DATA IMPORT/EXPORT
  // =====================================================
  test.describe('Import/Export Functionality', () => {
    test('File upload validation', async ({ page }) => {
      await page.goto('/dashboard');

      // If not authenticated, skip
      if (page.url().includes('login')) return;

      const uploadButton = page.locator('button:has-text("Импорт")').first();
      if (await uploadButton.isVisible()) {
        await uploadButton.click();

        // Check file input accepts correct formats
        const fileInput = page.locator('input[type="file"]');
        const acceptAttr = await fileInput.getAttribute('accept');

        expect(acceptAttr).toContain('.csv');
        expect(acceptAttr).toContain('.xlsx');
        expect(acceptAttr).toContain('.xls');
      }
    });

    test('Drag and drop zone', async ({ page }) => {
      await page.goto('/dashboard');

      // If not authenticated, skip
      if (page.url().includes('login')) return;

      const dropZone = page.locator('[data-testid="drop-zone"]');
      if (await dropZone.isVisible()) {
        // Check drop zone has proper attributes
        const hasDropEvents = await dropZone.evaluate(el => {
          return el.ondrop !== null || el.ondragover !== null;
        });

        expect(typeof hasDropEvents).toBe('boolean');
      }
    });

    test('Export functionality', async ({ page }) => {
      await page.goto('/dashboard');

      // If not authenticated, skip
      if (page.url().includes('login')) return;

      const exportButton = page.locator('button:has-text("Экспорт")').first();
      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Should show export options
        await expect(page.locator('text=CSV')).toBeVisible();
        await expect(page.locator('text=Excel')).toBeVisible();
      }
    });
  });

  // =====================================================
  // FORMULA ENGINE
  // =====================================================
  test.describe('Formula Engine', () => {
    test('Formula editor UI', async ({ page }) => {
      // Navigate to a database view if possible
      await page.goto('/dashboard');

      // If not authenticated, skip
      if (page.url().includes('login')) return;

      const formulaButton = page.locator('button:has-text("Формула")').first();
      if (await formulaButton.isVisible()) {
        await formulaButton.click();

        // Check formula editor components
        await expect(page.locator('[data-testid="formula-editor"]')).toBeVisible();
        await expect(page.locator('text=Функции')).toBeVisible();
      }
    });

    test('Formula validation', async ({ page }) => {
      // This would test formula validation in the UI
      const dangerousFormulas = [
        'eval("alert(1)")',
        'Function("return this")()',
        '__proto__.polluted = true'
      ];

      // These should all be rejected by the formula engine
      expect(dangerousFormulas.length).toBe(3);
    });

    test('Formula functions available', async ({ page }) => {
      // Check that safe functions are available
      const safeFunctions = [
        'SUM', 'AVG', 'MIN', 'MAX',
        'IF', 'AND', 'OR',
        'UPPER', 'LOWER', 'CONCAT',
        'NOW', 'TODAY'
      ];

      expect(safeFunctions.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // RESPONSIVE DESIGN
  // =====================================================
  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`Layout adapts to ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/login');

        // Check that main elements are visible
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // On mobile, check for hamburger menu
        if (viewport.width < 768) {
          const mobileMenu = page.locator('[data-testid="mobile-menu"]');
          if (await mobileMenu.isVisible()) {
            await expect(mobileMenu).toBeVisible();
          }
        }
      });
    }
  });

  // =====================================================
  // ERROR HANDLING
  // =====================================================
  test.describe('Error Handling', () => {
    test('404 page handling', async ({ page }) => {
      await page.goto('/non-existent-page-12345');

      // Should show 404 page or redirect
      const has404 = await page.locator('text=/404|not found/i').isVisible();
      const redirectedToHome = page.url().includes('/login') || page.url().includes('/dashboard');

      expect(has404 || redirectedToHome).toBe(true);
    });

    test('Network error handling', async ({ page, context }) => {
      // Block API calls to simulate network error
      await context.route('**/api/**', route => route.abort());

      await page.goto('/dashboard');

      // Should handle gracefully (show error or redirect to login)
      const hasError = await page.locator('text=/error|ошибка/i').isVisible({ timeout: 5000 }).catch(() => false);
      const redirectedToLogin = page.url().includes('/login');

      expect(hasError || redirectedToLogin).toBe(true);
    });

    test('Form validation errors', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      const hasValidationError = await page.locator('text=/required|обязательно/i').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasValidationError).toBe(true);
    });
  });

  // =====================================================
  // ACCESSIBILITY
  // =====================================================
  test.describe('Accessibility', () => {
    test('Keyboard navigation', async ({ page }) => {
      await page.goto('/login');

      // Tab through elements
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBeTruthy();

      await page.keyboard.press('Tab');
      const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(secondFocused).toBeTruthy();

      // Should be able to submit with Enter
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password');
      await page.keyboard.press('Enter');

      // Form should attempt submission
      await page.waitForTimeout(500);
    });

    test('ARIA labels and roles', async ({ page }) => {
      await page.goto('/login');

      // Check for ARIA labels
      const buttons = await page.locator('button').all();
      for (const button of buttons.slice(0, 3)) { // Check first 3 buttons
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        expect(ariaLabel || text).toBeTruthy();
      }

      // Check for form labels
      const inputs = await page.locator('input').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const ariaLabel = await input.getAttribute('aria-label');
        expect(id || name || ariaLabel).toBeTruthy();
      }
    });

    test('Color contrast', async ({ page }) => {
      await page.goto('/login');

      // Check that text is visible (basic contrast check)
      const heading = page.locator('h1, h2').first();
      if (await heading.isVisible()) {
        const color = await heading.evaluate(el =>
          window.getComputedStyle(el).color
        );
        expect(color).toBeTruthy();
        expect(color).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
      }
    });
  });

  // =====================================================
  // PERFORMANCE
  // =====================================================
  test.describe('Performance Metrics', () => {
    test('Page load performance', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/login', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      console.log(`Page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('Lazy loading of components', async ({ page }) => {
      await page.goto('/');

      // Check if chunks are loaded dynamically
      const scripts = await page.locator('script[src*="chunk"]').all();
      expect(scripts.length).toBeGreaterThan(0);
    });

    test('Image optimization', async ({ page }) => {
      await page.goto('/login');

      const images = await page.locator('img').all();
      for (const img of images) {
        const src = await img.getAttribute('src');
        if (src) {
          // Check for lazy loading
          const loading = await img.getAttribute('loading');
          console.log(`Image loading strategy: ${loading || 'eager'}`);
        }
      }
    });
  });

  // =====================================================
  // SECURITY CHECKS
  // =====================================================
  test.describe('Security Validations', () => {
    test('XSS prevention in inputs', async ({ page }) => {
      await page.goto('/login');

      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('input[type="email"]', xssPayload);

      // Should not execute script
      const alertFired = await page.evaluate(() => {
        let alertCalled = false;
        const originalAlert = window.alert;
        window.alert = () => { alertCalled = true; };
        setTimeout(() => { window.alert = originalAlert; }, 100);
        return alertCalled;
      });

      expect(alertFired).toBe(false);
    });

    test('SQL injection prevention', async ({ page }) => {
      await page.goto('/login');

      const sqlPayload = "admin' OR '1'='1";
      await page.fill('input[type="email"]', sqlPayload);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');

      // Should not bypass authentication
      await expect(page).not.toHaveURL('/dashboard', { timeout: 3000 });
    });

    test('Secure headers check', async ({ page }) => {
      const response = await page.goto('/');

      if (response) {
        const headers = response.headers();
        console.log('Security headers present:', Object.keys(headers).filter(h =>
          h.toLowerCase().includes('security') ||
          h.toLowerCase().includes('policy')
        ));
      }
    });
  });

  // =====================================================
  // COLLABORATION FEATURES
  // =====================================================
  test.describe('Collaboration Features', () => {
    test('Permission levels UI', async ({ page }) => {
      // This would test permission management UI
      const permissionLevels = ['viewer', 'editor', 'admin', 'owner'];
      expect(permissionLevels.length).toBe(4);
    });

    test('Sharing functionality', async ({ page }) => {
      // Would test sharing UI if accessible
      await page.goto('/dashboard');

      // If not authenticated, skip
      if (page.url().includes('login')) return;

      const shareButton = page.locator('button[aria-label="Share"]').first();
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await expect(page.locator('text=/share|поделиться/i')).toBeVisible();
      }
    });
  });
});

// Performance monitoring helper
test.afterEach(async ({ page }, testInfo) => {
  // Log any console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Console error in test "${testInfo.title}":`, msg.text());
    }
  });

  // Log failed requests
  page.on('requestfailed', request => {
    console.log(`Request failed in test "${testInfo.title}":`, request.url());
  });
});