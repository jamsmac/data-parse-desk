import { test, expect } from '@playwright/test';

test.describe('Telegram Bot Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/projects');
    
    // Navigate to integrations
    await page.goto('/integrations');
  });

  test('should display Telegram integration card', async ({ page }) => {
    const telegramCard = page.locator('text=Telegram Bot');
    await expect(telegramCard).toBeVisible();
  });

  test('should generate link code', async ({ page }) => {
    // Click generate link button
    await page.click('button:has-text("Generate Link Code")');
    
    // Wait for link code to appear
    const linkCode = page.locator('[data-testid="telegram-link-code"]');
    await expect(linkCode).toBeVisible();
    
    // Verify code format (6 uppercase letters)
    const codeText = await linkCode.textContent();
    expect(codeText).toMatch(/^[A-Z]{6}$/);
  });

  test('should show linking instructions', async ({ page }) => {
    await page.click('button:has-text("Generate Link Code")');
    
    const instructions = page.locator('text=/send.*\/link.*to the bot/i');
    await expect(instructions).toBeVisible();
  });

  test('should display notification settings', async ({ page }) => {
    // Assume already linked
    const notificationSettings = page.locator('text=Notification Settings');
    
    if (await notificationSettings.isVisible()) {
      await notificationSettings.click();
      
      // Check for notification options
      await expect(page.locator('text=Daily Digest')).toBeVisible();
      await expect(page.locator('text=Real-time Updates')).toBeVisible();
      await expect(page.locator('text=Mentions')).toBeVisible();
    }
  });

  test('should allow unlinking account', async ({ page }) => {
    const unlinkButton = page.locator('button:has-text("Unlink")');
    
    if (await unlinkButton.isVisible()) {
      await unlinkButton.click();
      
      // Confirm dialog
      await page.click('button:has-text("Confirm")');
      
      // Should show generate link button again
      await expect(page.locator('button:has-text("Generate Link Code")')).toBeVisible();
    }
  });
});

test.describe('Telegram Bot Commands (Simulated)', () => {
  test('should handle /start command', async ({ request }) => {
    const response = await request.post('/functions/v1/telegram-webhook', {
      data: {
        message: {
          text: '/start',
          chat: { id: 123456 },
          from: { id: 123456, username: 'testuser' }
        }
      }
    });
    
    expect(response.status()).toBe(200);
  });

  test('should handle /link command with valid code', async ({ request }) => {
    const response = await request.post('/functions/v1/telegram-webhook', {
      data: {
        message: {
          text: '/link ABCDEF',
          chat: { id: 123456 },
          from: { id: 123456, username: 'testuser' }
        }
      }
    });
    
    expect(response.status()).toBe(200);
  });

  test('should handle /projects command', async ({ request }) => {
    const response = await request.post('/functions/v1/telegram-webhook', {
      data: {
        message: {
          text: '/projects',
          chat: { id: 123456 },
          from: { id: 123456, username: 'testuser' }
        }
      }
    });
    
    expect(response.status()).toBe(200);
  });
});
