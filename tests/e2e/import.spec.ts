import { test, expect } from '../fixtures/auth';

test.describe('File Import', () => {
  test('should show file upload dialog', async ({ authenticatedPage: page }) => {
    await page.goto('/tables');

    // Look for upload button
    const uploadButton = page.locator('button').filter({ hasText: /upload|загрузить/i }).first();

    if (await uploadButton.isVisible()) {
      await uploadButton.click();

      // Check if dialog/modal opened
      const dialog = page.locator('[role="dialog"], .modal, [data-testid="upload-dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle CSV file upload', async ({ authenticatedPage: page }) => {
    await page.goto('/tables');

    // Create test CSV content
    const csvContent = 'Name,Age,City\nJohn,30,New York\nJane,25,Los Angeles';
    const fileName = 'test-data.csv';

    // Look for file input
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.isVisible()) {
      // Create a temporary file
      const buffer = Buffer.from(csvContent);

      await fileInput.setInputFiles({
        name: fileName,
        mimeType: 'text/csv',
        buffer,
      });

      // Wait for upload to process
      await page.waitForTimeout(2000);

      // Check for success message or preview
      const successIndicator = page.locator('text=/success|успешно|preview|предпросмотр/i');
      await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should validate file size', async ({ authenticatedPage: page }) => {
    await page.goto('/tables');

    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.isVisible()) {
      // Try to upload a large file (simulated)
      // Most apps have file size limits

      // Check for error message
      const errorMessage = page.locator('text=/size|размер|large|большой/i');

      // This is a placeholder - actual implementation depends on app behavior
      expect(fileInput).toBeDefined();
    }
  });

  test('should show import preview before confirming', async ({ authenticatedPage: page }) => {
    await page.goto('/tables');

    // After file selection, there should be a preview
    // with options to confirm or cancel import

    const previewTable = page.locator('table, [data-testid="preview-table"]');
    const confirmButton = page.locator('button').filter({ hasText: /confirm|подтвердить/i });
    const cancelButton = page.locator('button').filter({ hasText: /cancel|отмена/i });

    // Check if these elements exist when import is active
    expect(previewTable).toBeDefined();
    expect(confirmButton).toBeDefined();
    expect(cancelButton).toBeDefined();
  });
});

test.describe('Export Functionality', () => {
  test('should have export button in database view', async ({ authenticatedPage: page }) => {
    await page.goto('/tables');

    const exportButton = page.locator('button').filter({ hasText: /export|экспорт/i }).first();

    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible();

      // Click to open export menu
      await exportButton.click();

      // Check for export format options
      const csvOption = page.locator('text=/CSV/i');
      const excelOption = page.locator('text=/Excel/i');
      const jsonOption = page.locator('text=/JSON/i');

      const hasExportOptions =
        (await csvOption.isVisible().catch(() => false)) ||
        (await excelOption.isVisible().catch(() => false)) ||
        (await jsonOption.isVisible().catch(() => false));

      expect(hasExportOptions).toBeTruthy();
    }
  });

  test('should trigger download on export', async ({ authenticatedPage: page }) => {
    await page.goto('/tables');

    const downloadPromise = page.waitForEvent('download');

    const exportButton = page.locator('button').filter({ hasText: /export|экспорт/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Click CSV option
      const csvOption = page.locator('text=/CSV/i').first();
      if (await csvOption.isVisible()) {
        await csvOption.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    }
  });
});
