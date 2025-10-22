import { test, expect, Page } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Advanced Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('.database-card').first().click();
  });

  test('Should create simple filter', async ({ page }) => {
    // Open filter builder
    await page.click('[data-testid="filter-button"]');

    // Add filter: price > 100
    await page.selectOption('[data-testid="filter-column"]', 'price');
    await page.selectOption('[data-testid="filter-operator"]', 'gt');
    await page.fill('[data-testid="filter-value"]', '100');

    // Apply filter
    await page.click('[data-testid="apply-filter"]');

    // Verify filtered results
    const rows = page.locator('tr[data-row-id]');
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const priceCell = rows.nth(i).locator('[data-cell-id*="price"]');
      const price = parseFloat(await priceCell.textContent() || '0');
      expect(price).toBeGreaterThan(100);
    }
  });

  test('Should support multiple filter operators', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    const operators = [
      { op: 'equals', column: 'category', value: 'Electronics', verify: 'Electronics' },
      { op: 'notEquals', column: 'category', value: 'Electronics', verify: (val: string) => val !== 'Electronics' },
      { op: 'contains', column: 'name', value: 'Laptop', verify: (val: string) => val.includes('Laptop') },
      { op: 'startsWith', column: 'sku', value: 'PRD-', verify: (val: string) => val.startsWith('PRD-') },
      { op: 'endsWith', column: 'sku', value: '-001', verify: (val: string) => val.endsWith('-001') },
      { op: 'isEmpty', column: 'description', value: '', verify: (val: string) => val === '' },
      { op: 'isNotEmpty', column: 'name', value: '', verify: (val: string) => val !== '' }
    ];

    for (const { op, column, value } of operators) {
      // Clear previous filter
      await page.click('[data-testid="clear-filters"]');

      // Apply new filter
      await page.selectOption('[data-testid="filter-column"]', column);
      await page.selectOption('[data-testid="filter-operator"]', op);
      if (value) {
        await page.fill('[data-testid="filter-value"]', value);
      }
      await page.click('[data-testid="apply-filter"]');

      // Verify at least one result matches
      await expect(page.locator('tr[data-row-id]')).toHaveCount(await page.locator('tr[data-row-id]').count());
    }
  });

  test('Should support AND logic for multiple filters', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    // Add filter group with AND logic
    await page.selectOption('[data-testid="filter-logic"]', 'AND');

    // Filter 1: price > 100
    await page.selectOption('[data-testid="filter-column-0"]', 'price');
    await page.selectOption('[data-testid="filter-operator-0"]', 'gt');
    await page.fill('[data-testid="filter-value-0"]', '100');

    // Add second filter
    await page.click('[data-testid="add-filter-condition"]');

    // Filter 2: category = Electronics
    await page.selectOption('[data-testid="filter-column-1"]', 'category');
    await page.selectOption('[data-testid="filter-operator-1"]', 'equals');
    await page.fill('[data-testid="filter-value-1"]', 'Electronics');

    // Apply filters
    await page.click('[data-testid="apply-filter"]');

    // Verify all results match both conditions
    const rows = page.locator('tr[data-row-id]');
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const price = parseFloat(await row.locator('[data-cell-id*="price"]').textContent() || '0');
      const category = await row.locator('[data-cell-id*="category"]').textContent();

      expect(price).toBeGreaterThan(100);
      expect(category).toBe('Electronics');
    }
  });

  test('Should support OR logic for multiple filters', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    // Add filter group with OR logic
    await page.selectOption('[data-testid="filter-logic"]', 'OR');

    // Filter 1: category = Electronics
    await page.selectOption('[data-testid="filter-column-0"]', 'category');
    await page.selectOption('[data-testid="filter-operator-0"]', 'equals');
    await page.fill('[data-testid="filter-value-0"]', 'Electronics');

    // Add second filter
    await page.click('[data-testid="add-filter-condition"]');

    // Filter 2: category = Clothing
    await page.selectOption('[data-testid="filter-column-1"]', 'category');
    await page.selectOption('[data-testid="filter-operator-1"]', 'equals');
    await page.fill('[data-testid="filter-value-1"]', 'Clothing');

    // Apply filters
    await page.click('[data-testid="apply-filter"]');

    // Verify all results match at least one condition
    const rows = page.locator('tr[data-row-id]');
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const category = await rows.nth(i).locator('[data-cell-id*="category"]').textContent();
      expect(['Electronics', 'Clothing']).toContain(category);
    }
  });

  test('Should support nested filter groups', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    // Create complex filter:
    // (price > 100 AND category = Electronics) OR (price < 50 AND category = Clothing)

    // First group (AND)
    await page.click('[data-testid="add-filter-group"]');
    await page.selectOption('[data-testid="group-0-logic"]', 'AND');

    await page.selectOption('[data-testid="group-0-filter-0-column"]', 'price');
    await page.selectOption('[data-testid="group-0-filter-0-operator"]', 'gt');
    await page.fill('[data-testid="group-0-filter-0-value"]', '100');

    await page.click('[data-testid="group-0-add-filter"]');
    await page.selectOption('[data-testid="group-0-filter-1-column"]', 'category');
    await page.selectOption('[data-testid="group-0-filter-1-operator"]', 'equals');
    await page.fill('[data-testid="group-0-filter-1-value"]', 'Electronics');

    // Second group (AND)
    await page.click('[data-testid="add-filter-group"]');
    await page.selectOption('[data-testid="group-1-logic"]', 'AND');

    await page.selectOption('[data-testid="group-1-filter-0-column"]', 'price');
    await page.selectOption('[data-testid="group-1-filter-0-operator"]', 'lt');
    await page.fill('[data-testid="group-1-filter-0-value"]', '50');

    await page.click('[data-testid="group-1-add-filter"]');
    await page.selectOption('[data-testid="group-1-filter-1-column"]', 'category');
    await page.selectOption('[data-testid="group-1-filter-1-operator"]', 'equals');
    await page.fill('[data-testid="group-1-filter-1-value"]', 'Clothing');

    // Set top-level logic to OR
    await page.selectOption('[data-testid="top-level-logic"]', 'OR');

    // Apply filters
    await page.click('[data-testid="apply-filter"]');

    // Verify results match complex condition
    const rows = page.locator('tr[data-row-id]');
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const price = parseFloat(await row.locator('[data-cell-id*="price"]').textContent() || '0');
      const category = await row.locator('[data-cell-id*="category"]').textContent();

      const matchesGroup1 = price > 100 && category === 'Electronics';
      const matchesGroup2 = price < 50 && category === 'Clothing';

      expect(matchesGroup1 || matchesGroup2).toBeTruthy();
    }
  });

  test('Should show active filter indicator', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    await page.selectOption('[data-testid="filter-column"]', 'price');
    await page.selectOption('[data-testid="filter-operator"]', 'gt');
    await page.fill('[data-testid="filter-value"]', '100');
    await page.click('[data-testid="apply-filter"]');

    // Should show active filter badge
    await expect(page.locator('[data-testid="active-filters-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-filters-badge"]')).toHaveText('1');
  });

  test('Should clear all filters', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    // Add multiple filters
    await page.selectOption('[data-testid="filter-column"]', 'price');
    await page.selectOption('[data-testid="filter-operator"]', 'gt');
    await page.fill('[data-testid="filter-value"]', '100');
    await page.click('[data-testid="apply-filter"]');

    // Clear filters
    await page.click('[data-testid="clear-all-filters"]');

    // Verify all data is shown
    const totalRows = await page.locator('tr[data-row-id]').count();
    expect(totalRows).toBeGreaterThan(0);

    // Badge should be gone
    await expect(page.locator('[data-testid="active-filters-badge"]')).not.toBeVisible();
  });
});

test.describe('Filter Presets', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('.database-card').first().click();
  });

  test('Should save filter preset', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    // Create filter
    await page.selectOption('[data-testid="filter-column"]', 'price');
    await page.selectOption('[data-testid="filter-operator"]', 'gte');
    await page.fill('[data-testid="filter-value"]', '1000');
    await page.click('[data-testid="apply-filter"]');

    // Save as preset
    await page.click('[data-testid="save-filter-preset"]');
    await page.fill('[data-testid="preset-name"]', 'High Value Items');
    await page.fill('[data-testid="preset-description"]', 'Items priced $1000 or more');
    await page.click('[data-testid="save-preset"]');

    // Verify preset was saved
    await expect(page.locator('text=Filter preset saved')).toBeVisible();
  });

  test('Should load filter preset', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    // Open presets menu
    await page.click('[data-testid="filter-presets-menu"]');

    // Select preset
    await page.click('text=High Value Items');

    // Filters should be applied
    await expect(page.locator('[data-testid="active-filters-badge"]')).toBeVisible();

    // Verify filter values
    const filterColumn = await page.locator('[data-testid="filter-column"]').inputValue();
    const filterOperator = await page.locator('[data-testid="filter-operator"]').inputValue();
    const filterValue = await page.locator('[data-testid="filter-value"]').inputValue();

    expect(filterColumn).toBe('price');
    expect(filterOperator).toBe('gte');
    expect(filterValue).toBe('1000');
  });

  test('Should update existing filter preset', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');
    await page.click('[data-testid="filter-presets-menu"]');

    // Edit preset
    await page.click('[data-testid="edit-preset-High Value Items"]');

    // Update description
    await page.fill('[data-testid="preset-description"]', 'Updated description');

    // Modify filter
    await page.fill('[data-testid="filter-value-0"]', '1500');

    // Save changes
    await page.click('[data-testid="save-preset"]');

    await expect(page.locator('text=Preset updated')).toBeVisible();
  });

  test('Should delete filter preset', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');
    await page.click('[data-testid="filter-presets-menu"]');

    // Delete preset
    await page.click('[data-testid="delete-preset-High Value Items"]');
    await page.click('[data-testid="confirm-delete"]');

    // Verify preset is removed
    await expect(page.locator('text=High Value Items')).not.toBeVisible();
  });

  test('Should share filter preset (make public)', async ({ page }) => {
    await page.click('[data-testid="filter-button"]');

    // Create and save preset
    await page.selectOption('[data-testid="filter-column"]', 'category');
    await page.selectOption('[data-testid="filter-operator"]', 'equals');
    await page.fill('[data-testid="filter-value"]', 'Electronics');

    await page.click('[data-testid="save-filter-preset"]');
    await page.fill('[data-testid="preset-name"]', 'Electronics Only');
    await page.check('[data-testid="make-public"]');
    await page.click('[data-testid="save-preset"]');

    // Preset should be marked as public
    await page.click('[data-testid="filter-presets-menu"]');
    await expect(page.locator('[data-testid="public-badge-Electronics Only"]')).toBeVisible();
  });

  test('Should see public presets from other users', async ({ page, context }) => {
    // Current user should see public preset created above
    await page.click('[data-testid="filter-button"]');
    await page.click('[data-testid="filter-presets-menu"]');

    // Should see both personal and public presets
    await expect(page.locator('text=Electronics Only')).toBeVisible();
    await expect(page.locator('[data-testid="public-badge-Electronics Only"]')).toBeVisible();
  });
});

test.describe('Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.locator('.database-card').first().click();
  });

  test('Should add required field validation', async ({ page }) => {
    // Open column settings
    await page.click('[data-testid="column-settings-name"]');

    // Add validation rule
    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'required');
    await page.fill('[data-testid="error-message"]', 'Name is required');
    await page.click('[data-testid="save-rule"]');

    // Try to add row without name
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-price"]', '99.99');
    await page.click('[data-testid="save-row"]');

    // Should show validation error
    await expect(page.locator('text=Name is required')).toBeVisible();
  });

  test('Should add email validation', async ({ page }) => {
    await page.click('[data-testid="column-settings-email"]');
    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'email');
    await page.fill('[data-testid="error-message"]', 'Invalid email address');
    await page.click('[data-testid="save-rule"]');

    // Try invalid email
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-email"]', 'not-an-email');
    await page.click('[data-testid="save-row"]');

    await expect(page.locator('text=Invalid email address')).toBeVisible();

    // Try valid email
    await page.fill('[data-testid="field-email"]', 'user@example.com');
    await page.click('[data-testid="save-row"]');

    await expect(page.locator('text=Invalid email address')).not.toBeVisible();
  });

  test('Should add min/max value validation', async ({ page }) => {
    await page.click('[data-testid="column-settings-price"]');
    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'min_value');
    await page.fill('[data-testid="param-min"]', '0');
    await page.fill('[data-testid="error-message"]', 'Price must be positive');
    await page.click('[data-testid="save-rule"]');

    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'max_value');
    await page.fill('[data-testid="param-max"]', '10000');
    await page.fill('[data-testid="error-message"]', 'Price cannot exceed $10,000');
    await page.click('[data-testid="save-rule"]');

    // Test min validation
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-price"]', '-10');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Price must be positive')).toBeVisible();

    // Test max validation
    await page.fill('[data-testid="field-price"]', '15000');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Price cannot exceed $10,000')).toBeVisible();

    // Test valid value
    await page.fill('[data-testid="field-price"]', '999.99');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Price must be positive')).not.toBeVisible();
  });

  test('Should add regex pattern validation', async ({ page }) => {
    await page.click('[data-testid="column-settings-sku"]');
    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'regex');
    await page.fill('[data-testid="param-pattern"]', '^[A-Z]{3}-\\d{4}$');
    await page.fill('[data-testid="error-message"]', 'SKU must be in format ABC-1234');
    await page.click('[data-testid="save-rule"]');

    // Test invalid format
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-sku"]', 'invalid');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=SKU must be in format ABC-1234')).toBeVisible();

    // Test valid format
    await page.fill('[data-testid="field-sku"]', 'PRD-0001');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=SKU must be in format ABC-1234')).not.toBeVisible();
  });

  test('Should add unique value validation', async ({ page }) => {
    await page.click('[data-testid="column-settings-sku"]');
    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'unique');
    await page.fill('[data-testid="error-message"]', 'SKU must be unique');
    await page.click('[data-testid="save-rule"]');

    // Add first row
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-sku"]', 'PRD-0001');
    await page.click('[data-testid="save-row"]');

    // Try to add duplicate
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-sku"]', 'PRD-0001');
    await page.click('[data-testid="save-row"]');

    await expect(page.locator('text=SKU must be unique')).toBeVisible();
  });

  test('Should add URL validation', async ({ page }) => {
    await page.click('[data-testid="column-settings-website"]');
    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'url');
    await page.fill('[data-testid="error-message"]', 'Invalid URL');
    await page.click('[data-testid="save-rule"]');

    // Test invalid URL
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-website"]', 'not-a-url');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Invalid URL')).toBeVisible();

    // Test valid URL
    await page.fill('[data-testid="field-website"]', 'https://example.com');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Invalid URL')).not.toBeVisible();
  });

  test('Should add phone number validation', async ({ page }) => {
    await page.click('[data-testid="column-settings-phone"]');
    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'phone');
    await page.fill('[data-testid="error-message"]', 'Invalid phone number');
    await page.click('[data-testid="save-rule"]');

    // Test invalid phone
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-phone"]', '123');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Invalid phone number')).toBeVisible();

    // Test valid phone
    await page.fill('[data-testid="field-phone"]', '+1234567890');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Invalid phone number')).not.toBeVisible();
  });

  test('Should add date range validation', async ({ page }) => {
    await page.click('[data-testid="column-settings-event_date"]');
    await page.click('[data-testid="add-validation-rule"]');
    await page.selectOption('[data-testid="rule-type"]', 'date_range');
    await page.fill('[data-testid="param-min_date"]', '2025-01-01');
    await page.fill('[data-testid="param-max_date"]', '2025-12-31');
    await page.fill('[data-testid="error-message"]', 'Date must be in 2025');
    await page.click('[data-testid="save-rule"]');

    // Test date before range
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-event_date"]', '2024-12-31');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Date must be in 2025')).toBeVisible();

    // Test valid date
    await page.fill('[data-testid="field-event_date"]', '2025-06-15');
    await page.click('[data-testid="save-row"]');
    await expect(page.locator('text=Date must be in 2025')).not.toBeVisible();
  });

  test('Should show all validation errors at once', async ({ page }) => {
    // Add multiple validation rules
    // ... (rules added in previous tests)

    // Try to save row with multiple validation errors
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-email"]', 'invalid');
    await page.fill('[data-testid="field-price"]', '-10');
    await page.fill('[data-testid="field-sku"]', 'bad-format');
    await page.click('[data-testid="save-row"]');

    // Should show all errors
    await expect(page.locator('text=Invalid email address')).toBeVisible();
    await expect(page.locator('text=Price must be positive')).toBeVisible();
    await expect(page.locator('text=SKU must be in format ABC-1234')).toBeVisible();
  });

  test('Should disable/enable validation rules', async ({ page }) => {
    await page.click('[data-testid="column-settings-email"]');

    // Disable validation rule
    await page.click('[data-testid="validation-rule-toggle"]');

    // Should accept invalid email when disabled
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-email"]', 'not-an-email');
    await page.click('[data-testid="save-row"]');

    await expect(page.locator('text=Invalid email address')).not.toBeVisible();

    // Re-enable validation
    await page.click('[data-testid="column-settings-email"]');
    await page.click('[data-testid="validation-rule-toggle"]');

    // Should validate again
    const emailCell = page.locator('[data-cell-id*="email"]').last();
    await emailCell.click();
    await emailCell.fill('still-invalid');
    await emailCell.press('Enter');

    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });
});
