import { test, expect } from '@playwright/test';

test.describe('AI Assistant Module', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/projects');
    
    // Navigate to a database
    await page.click('a[href*="/projects/"]');
    await page.click('a[href*="/databases/"]');
  });

  test('should display AI Assistant panel', async ({ page }) => {
    const panel = page.locator('text=AI Assistant');
    await expect(panel).toBeVisible();
  });

  test('should send a message to AI', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');
    await input.fill('How many rows are in this table?');
    
    await page.click('button[aria-label*="Send"]');
    
    // Wait for AI response
    await page.waitForSelector('text=rows', { timeout: 10000 });
    const response = page.locator('[data-testid="ai-message"]').last();
    await expect(response).toBeVisible();
  });

  test('should create a new conversation', async ({ page }) => {
    await page.click('button:has-text("New Conversation")');
    
    const input = page.locator('textarea[placeholder*="Ask"]');
    await expect(input).toBeEmpty();
  });

  test('should view conversation history', async ({ page }) => {
    await page.click('button[aria-label*="History"]');
    
    const historyPanel = page.locator('text=Conversation History');
    await expect(historyPanel).toBeVisible();
  });

  test('should use voice input', async ({ page }) => {
    // Grant microphone permission
    await page.context().grantPermissions(['microphone']);
    
    const voiceButton = page.locator('button[aria-label*="Voice"]');
    await voiceButton.click();
    
    // Verify recording started
    await expect(page.locator('text=Listening')).toBeVisible();
  });

  test('should execute tool calls', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');
    await input.fill('Calculate the sum of the price column');
    
    await page.click('button[aria-label*="Send"]');
    
    // Wait for tool execution
    await page.waitForSelector('[data-testid="tool-result"]', { timeout: 10000 });
    const toolResult = page.locator('[data-testid="tool-result"]');
    await expect(toolResult).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');
    await input.fill('Invalid query that will fail');
    
    await page.click('button[aria-label*="Send"]');
    
    // Verify error message is shown
    await page.waitForSelector('text=error', { timeout: 5000 });
  });
});
