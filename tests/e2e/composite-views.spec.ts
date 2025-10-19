import { test, expect } from '@playwright/test';

test.describe('Composite Views Module', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/projects');
    
    // Navigate to a project
    await page.click('a[href*="/projects/"]');
    await page.waitForURL(/\/projects\/.+/);
  });

  test('should display Composite Views tab', async ({ page }) => {
    const tab = page.locator('text=Composite Views');
    await expect(tab).toBeVisible();
  });

  test('should open Composite View Builder', async ({ page }) => {
    await page.click('text=Composite Views');
    await page.click('text=Create Composite View');
    
    const dialog = page.locator('text=Create Composite View');
    await expect(dialog).toBeVisible();
  });

  test('should create a composite view', async ({ page }) => {
    await page.click('text=Composite Views');
    await page.click('text=Create Composite View');
    
    // Fill in view details
    await page.fill('input[placeholder*="name"]', 'Test Composite View');
    await page.fill('textarea[placeholder*="description"]', 'Test description');
    
    // Add a checklist column
    await page.click('text=Add Column');
    await page.selectOption('select', 'checklist');
    await page.fill('input[placeholder*="column name"]', 'Tasks');
    
    // Save
    await page.click('button:has-text("Create View")');
    
    // Verify it appears in the list
    await expect(page.locator('text=Test Composite View')).toBeVisible();
  });

  test('should toggle checklist items', async ({ page }) => {
    // Assuming a composite view exists
    await page.click('text=Composite Views');
    await page.click('[data-testid="composite-view-item"]').first();
    
    // Toggle a checklist item
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();
    
    // Verify progress bar updates
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
  });

  test('should update status column', async ({ page }) => {
    await page.click('text=Composite Views');
    await page.click('[data-testid="composite-view-item"]').first();
    
    // Update status
    await page.click('[data-testid="status-select"]').first();
    await page.click('text=In Progress');
    
    // Verify status updated
    await expect(page.locator('text=In Progress')).toBeVisible();
  });

  test('should update progress bar', async ({ page }) => {
    await page.click('text=Composite Views');
    await page.click('[data-testid="composite-view-item"]').first();
    
    // Update progress
    const input = page.locator('input[type="number"]').first();
    await input.fill('75');
    await input.blur();
    
    // Verify progress updated
    await expect(page.locator('text=75%')).toBeVisible();
  });

  test('should export composite view data', async ({ page }) => {
    await page.click('text=Composite Views');
    await page.click('[data-testid="composite-view-item"]').first();
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export');
    await page.click('text=CSV');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });
});
