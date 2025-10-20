import { test, expect } from '@playwright/test';

test.describe('Smart Schema Generator', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/projects');
    
    // Create/select a project
    await page.click('a[href*="/projects/"]');
  });

  test('should open Schema Generator dialog', async ({ page }) => {
    const generateButton = page.locator('button:has-text("Generate Schema")');
    await generateButton.click();
    
    await expect(page.locator('text=Smart Schema Generator')).toBeVisible();
  });

  test('should generate schema from text description', async ({ page }) => {
    await page.click('button:has-text("Generate Schema")');
    
    // Select text input method
    await page.click('button:has-text("Text Description")');
    
    // Enter description
    const description = `
      Create an e-commerce system with:
      - Products with name, price, description, stock
      - Customers with name, email, phone
      - Orders connecting customers and products
    `;
    await page.fill('textarea', description);
    
    // Click analyze
    await page.click('button:has-text("Analyze")');
    
    // Wait for AI processing
    await page.waitForTimeout(3000);
    
    // Should show preview
    await expect(page.locator('text=Schema Preview')).toBeVisible();
  });

  test('should generate schema from JSON', async ({ page }) => {
    await page.click('button:has-text("Generate Schema")');
    
    // Select JSON input method
    await page.click('button:has-text("JSON File")');
    
    // Paste JSON
    const jsonData = JSON.stringify({
      users: [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ],
      posts: [
        { id: 1, title: 'First Post', user_id: 1, content: 'Hello' }
      ]
    }, null, 2);
    
    await page.fill('textarea', jsonData);
    await page.click('button:has-text("Analyze")');
    
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Schema Preview')).toBeVisible();
  });

  test('should generate schema from CSV', async ({ page }) => {
    await page.click('button:has-text("Generate Schema")');
    
    // Select CSV input method
    await page.click('button:has-text("CSV File")');
    
    // Upload CSV file (simulated)
    const csvContent = 'name,email,age\nJohn,john@example.com,30\nJane,jane@example.com,25';
    const buffer = Buffer.from(csvContent);
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    });
    
    await page.click('button:has-text("Analyze")');
    
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Schema Preview')).toBeVisible();
  });

  test('should show detected tables and columns', async ({ page }) => {
    await page.click('button:has-text("Generate Schema")');
    await page.click('button:has-text("Text Description")');
    
    await page.fill('textarea', 'A simple blog with posts and comments');
    await page.click('button:has-text("Analyze")');
    
    await page.waitForTimeout(3000);
    
    // Should detect tables
    await expect(page.locator('text=/posts/i')).toBeVisible();
    await expect(page.locator('text=/comments/i')).toBeVisible();
  });

  test('should allow editing schema before creation', async ({ page }) => {
    await page.click('button:has-text("Generate Schema")');
    await page.click('button:has-text("Text Description")');
    
    await page.fill('textarea', 'Products with name and price');
    await page.click('button:has-text("Analyze")');
    
    await page.waitForTimeout(3000);
    
    // Should have edit capability
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.locator('input[name="tableName"]')).toBeVisible();
    }
  });

  test('should handle insufficient credits error', async ({ page }) => {
    await page.click('button:has-text("Generate Schema")');
    await page.click('button:has-text("Text Description")');
    
    await page.fill('textarea', 'Test schema');
    
    // Mock insufficient credits
    await page.route('**/functions/v1/ai-analyze-schema', route => {
      route.fulfill({
        status: 402,
        body: JSON.stringify({ error: 'Insufficient credits' })
      });
    });
    
    await page.click('button:has-text("Analyze")');
    
    await expect(page.locator('text=/insufficient.*credits/i')).toBeVisible();
  });

  test('should create schema from preview', async ({ page }) => {
    await page.click('button:has-text("Generate Schema")');
    await page.click('button:has-text("Text Description")');
    
    await page.fill('textarea', 'Simple notes app with title and content');
    await page.click('button:has-text("Analyze")');
    
    await page.waitForTimeout(3000);
    
    const createButton = page.locator('button:has-text("Create Schema")');
    await createButton.click();
    
    // Should show success message
    await expect(page.locator('text=/schema.*created/i')).toBeVisible({ timeout: 10000 });
  });
});
