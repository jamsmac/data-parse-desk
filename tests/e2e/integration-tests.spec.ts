import { test, expect } from '@playwright/test';

test.describe('Module Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/projects');
  });

  test('AI Assistant should work with Composite Views', async ({ page }) => {
    // Navigate to database with composite view
    await page.click('a[href*="/projects/"]');
    await page.click('text=Composite Views');
    
    // Open AI Assistant
    await page.click('button:has-text("AI Assistant")');
    
    // Ask about composite view data
    await page.fill('textarea', 'Analyze the composite view data');
    await page.click('button[type="submit"]');
    
    // Should get response about composite view
    await expect(page.locator('.ai-message')).toBeVisible({ timeout: 15000 });
  });

  test('Schema Generator should create tables that work with Composite Views', async ({ page }) => {
    await page.click('a[href*="/projects/"]');
    
    // Generate schema
    await page.click('button:has-text("Generate Schema")');
    await page.click('button:has-text("Text Description")');
    await page.fill('textarea', 'Orders and customers');
    await page.click('button:has-text("Analyze")');
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Create Schema")');
    await page.waitForTimeout(5000);
    
    // Create composite view from generated tables
    await page.click('text=Composite Views');
    await page.click('button:has-text("Create Composite View")');
    
    // Should see generated tables in source selection
    await expect(page.locator('text=/orders|customers/i')).toBeVisible();
  });

  test('Telegram notifications should work with AI insights', async ({ page }) => {
    // Go to integrations
    await page.goto('/integrations');
    
    // Check Telegram connection
    const telegramCard = page.locator('text=Telegram Bot');
    await expect(telegramCard).toBeVisible();
    
    // Navigate to AI insights
    await page.click('a[href*="/projects/"]');
    await page.click('button:has-text("Insights")');
    
    // Should see notification settings
    const notifSettings = page.locator('text=/notification/i');
    expect(await notifSettings.count()).toBeGreaterThan(0);
  });

  test('Voice input should work in Telegram bot', async ({ page }) => {
    // This is more of a documentation test
    await page.goto('/integrations');
    
    const telegramCard = page.locator('text=Telegram Bot');
    await expect(telegramCard).toBeVisible();
    
    // Should have voice instructions
    await page.click('button:has-text("Help")');
    await expect(page.locator('text=/voice/i')).toBeVisible();
  });

  test('Credits system should work across all AI features', async ({ page }) => {
    // Navigate to credits panel
    await page.goto('/settings');
    
    const creditsPanel = page.locator('text=/credits/i');
    await expect(creditsPanel).toBeVisible();
    
    // Should show credit balance
    await expect(page.locator('[data-testid="credit-balance"]')).toBeVisible();
    
    // Should show usage breakdown
    await expect(page.locator('text=/AI Assistant|Schema Generator/i')).toBeVisible();
  });
});

test.describe('Performance Tests', () => {
  test('Large composite view should load within 3 seconds', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/projects');
    
    await page.click('a[href*="/projects/"]');
    
    const startTime = Date.now();
    await page.click('text=Composite Views');
    await page.click('[data-testid="composite-view-card"]');
    
    // Wait for data to load
    await expect(page.locator('table tbody tr')).toBeVisible({ timeout: 3000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('AI streaming response should start within 2 seconds', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/projects');
    
    await page.click('a[href*="/projects/"]');
    await page.click('a[href*="/database/"]');
    await page.click('button:has-text("AI Assistant")');
    
    const startTime = Date.now();
    await page.fill('textarea', 'Hello');
    await page.click('button[type="submit"]');
    
    // Should start showing response quickly
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 2000 });
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(2000);
  });
});
