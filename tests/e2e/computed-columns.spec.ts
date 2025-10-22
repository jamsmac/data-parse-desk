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

async function createDatabase(page: Page, name: string, columns: any[]) {
  await page.click('button:has-text("Новая база данных")');
  await page.fill('input[placeholder="Название"]', name);

  // Add columns
  for (const col of columns) {
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', col.name);
    await page.selectOption('[data-testid="column-type"]', col.type);
    if (col.required) {
      await page.check('[data-testid="column-required"]');
    }
    await page.click('[data-testid="save-column"]');
  }

  await page.click('button:has-text("Создать")');
  await page.click(`text=${name}`);
}

test.describe('Computed Columns - Lookup', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Should create a Lookup column', async ({ page }) => {
    // Create source database (Customers)
    await createDatabase(page, 'Customers', [
      { name: 'customer_id', type: 'text', required: true },
      { name: 'email', type: 'text', required: true },
      { name: 'full_name', type: 'text', required: true }
    ]);

    // Add customer data
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-customer_id"]', 'CUST-001');
    await page.fill('[data-testid="field-email"]', 'john@example.com');
    await page.fill('[data-testid="field-full_name"]', 'John Doe');
    await page.click('[data-testid="save-row"]');

    // Go back to dashboard
    await page.click('[data-testid="back-to-dashboard"]');

    // Create target database (Orders)
    await createDatabase(page, 'Orders', [
      { name: 'order_id', type: 'text', required: true },
      { name: 'customer_id', type: 'text', required: true },
      { name: 'amount', type: 'number', required: true }
    ]);

    // Add Lookup column
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'customer_email');
    await page.selectOption('[data-testid="column-type"]', 'lookup');

    // Configure lookup
    await page.selectOption('[data-testid="lookup-source-database"]', 'Customers');
    await page.selectOption('[data-testid="lookup-relation-column"]', 'customer_id');
    await page.selectOption('[data-testid="lookup-target-column"]', 'id');
    await page.selectOption('[data-testid="lookup-value-column"]', 'email');

    await page.click('[data-testid="save-column"]');

    // Verify column was created
    await expect(page.locator('th:has-text("customer_email")')).toBeVisible();
  });

  test('Should automatically calculate Lookup values', async ({ page }) => {
    // Assumes databases are already set up from previous test
    // Navigate to Orders database
    await page.click('text=Orders');

    // Add order
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-order_id"]', 'ORD-001');
    await page.fill('[data-testid="field-customer_id"]', 'CUST-001');
    await page.fill('[data-testid="field-amount"]', '299.99');
    await page.click('[data-testid="save-row"]');

    // Lookup column should show customer email
    const lookupCell = page.locator('[data-cell-id*="customer_email"]').first();
    await expect(lookupCell).toHaveText('john@example.com', { timeout: 5000 });
  });

  test('Should handle missing lookup references', async ({ page }) => {
    await page.click('text=Orders');

    // Add order with non-existent customer
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-order_id"]', 'ORD-002');
    await page.fill('[data-testid="field-customer_id"]', 'NONEXISTENT');
    await page.fill('[data-testid="field-amount"]', '99.99');
    await page.click('[data-testid="save-row"]');

    // Lookup column should show empty or error
    const lookupCell = page.locator('[data-cell-id*="customer_email"]').last();
    await expect(lookupCell).toBeEmpty();
  });

  test('Should update Lookup when source data changes', async ({ page }) => {
    // Navigate to Customers
    await page.click('text=Customers');

    // Update customer email
    const emailCell = page.locator('[data-cell-id*="email"]').first();
    await emailCell.click();
    await emailCell.fill('newemail@example.com');
    await emailCell.press('Enter');

    // Navigate back to Orders
    await page.click('[data-testid="back-to-dashboard"]');
    await page.click('text=Orders');

    // Lookup value should be updated
    const lookupCell = page.locator('[data-cell-id*="customer_email"]').first();
    await expect(lookupCell).toHaveText('newemail@example.com', { timeout: 5000 });
  });

  test('Should support nested Lookup chains', async ({ page }) => {
    // Create three-level relationship:
    // Products -> Categories -> Departments

    await createDatabase(page, 'Departments', [
      { name: 'dept_id', type: 'text', required: true },
      { name: 'dept_name', type: 'text', required: true }
    ]);

    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-dept_id"]', 'DEPT-001');
    await page.fill('[data-testid="field-dept_name"]', 'Electronics');
    await page.click('[data-testid="save-row"]');

    await page.click('[data-testid="back-to-dashboard"]');

    await createDatabase(page, 'Categories', [
      { name: 'cat_id', type: 'text', required: true },
      { name: 'cat_name', type: 'text', required: true },
      { name: 'dept_id', type: 'text', required: true }
    ]);

    // Add Lookup for department name
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'dept_name');
    await page.selectOption('[data-testid="column-type"]', 'lookup');
    await page.selectOption('[data-testid="lookup-source-database"]', 'Departments');
    await page.selectOption('[data-testid="lookup-relation-column"]', 'dept_id');
    await page.selectOption('[data-testid="lookup-value-column"]', 'dept_name');
    await page.click('[data-testid="save-column"]');

    // Verify nested lookup works
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-cat_id"]', 'CAT-001');
    await page.fill('[data-testid="field-cat_name"]', 'Laptops');
    await page.fill('[data-testid="field-dept_id"]', 'DEPT-001');
    await page.click('[data-testid="save-row"]');

    const lookupCell = page.locator('[data-cell-id*="dept_name"]').first();
    await expect(lookupCell).toHaveText('Electronics');
  });
});

test.describe('Computed Columns - Rollup', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Should create a Rollup column with SUM aggregation', async ({ page }) => {
    // Create Orders database
    await createDatabase(page, 'Orders', [
      { name: 'order_id', type: 'text', required: true },
      { name: 'customer_id', type: 'text', required: true },
      { name: 'amount', type: 'number', required: true }
    ]);

    // Add sample orders
    const orders = [
      { order_id: 'ORD-001', customer_id: 'CUST-001', amount: 100 },
      { order_id: 'ORD-002', customer_id: 'CUST-001', amount: 200 },
      { order_id: 'ORD-003', customer_id: 'CUST-002', amount: 150 }
    ];

    for (const order of orders) {
      await page.click('[data-testid="add-row"]');
      await page.fill('[data-testid="field-order_id"]', order.order_id);
      await page.fill('[data-testid="field-customer_id"]', order.customer_id);
      await page.fill('[data-testid="field-amount"]', order.amount.toString());
      await page.click('[data-testid="save-row"]');
    }

    await page.click('[data-testid="back-to-dashboard"]');

    // Create Customers database
    await createDatabase(page, 'Customers', [
      { name: 'customer_id', type: 'text', required: true },
      { name: 'name', type: 'text', required: true }
    ]);

    // Add Rollup column for total order value
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'total_order_value');
    await page.selectOption('[data-testid="column-type"]', 'rollup');

    // Configure rollup
    await page.selectOption('[data-testid="rollup-source-database"]', 'Orders');
    await page.selectOption('[data-testid="rollup-relation-column"]', 'customer_id');
    await page.selectOption('[data-testid="rollup-target-column"]', 'customer_id');
    await page.selectOption('[data-testid="rollup-value-column"]', 'amount');
    await page.selectOption('[data-testid="rollup-aggregation"]', 'sum');

    await page.click('[data-testid="save-column"]');

    // Add customer
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-customer_id"]', 'CUST-001');
    await page.fill('[data-testid="field-name"]', 'John Doe');
    await page.click('[data-testid="save-row"]');

    // Rollup should show sum of orders (100 + 200 = 300)
    const rollupCell = page.locator('[data-cell-id*="total_order_value"]').first();
    await expect(rollupCell).toHaveText('300', { timeout: 5000 });
  });

  test('Should support COUNT aggregation', async ({ page }) => {
    await page.click('text=Customers');

    // Add Rollup column for order count
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'order_count');
    await page.selectOption('[data-testid="column-type"]', 'rollup');

    await page.selectOption('[data-testid="rollup-source-database"]', 'Orders');
    await page.selectOption('[data-testid="rollup-relation-column"]', 'customer_id');
    await page.selectOption('[data-testid="rollup-target-column"]', 'customer_id');
    await page.selectOption('[data-testid="rollup-aggregation"]', 'count');

    await page.click('[data-testid="save-column"]');

    // Should show count of 2 orders for CUST-001
    const rollupCell = page.locator('[data-cell-id*="order_count"]').first();
    await expect(rollupCell).toHaveText('2', { timeout: 5000 });
  });

  test('Should support AVG aggregation', async ({ page }) => {
    await page.click('text=Customers');

    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'avg_order_value');
    await page.selectOption('[data-testid="column-type"]', 'rollup');

    await page.selectOption('[data-testid="rollup-source-database"]', 'Orders');
    await page.selectOption('[data-testid="rollup-relation-column"]', 'customer_id');
    await page.selectOption('[data-testid="rollup-value-column"]', 'amount');
    await page.selectOption('[data-testid="rollup-aggregation"]', 'avg');

    await page.click('[data-testid="save-column"]');

    // Should show average of 150 (100 + 200 / 2)
    const rollupCell = page.locator('[data-cell-id*="avg_order_value"]').first();
    await expect(rollupCell).toHaveText('150', { timeout: 5000 });
  });

  test('Should support MIN and MAX aggregations', async ({ page }) => {
    await page.click('text=Customers');

    // Add MIN rollup
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'min_order');
    await page.selectOption('[data-testid="column-type"]', 'rollup');
    await page.selectOption('[data-testid="rollup-source-database"]', 'Orders');
    await page.selectOption('[data-testid="rollup-value-column"]', 'amount');
    await page.selectOption('[data-testid="rollup-aggregation"]', 'min');
    await page.click('[data-testid="save-column"]');

    // Add MAX rollup
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'max_order');
    await page.selectOption('[data-testid="column-type"]', 'rollup');
    await page.selectOption('[data-testid="rollup-source-database"]', 'Orders');
    await page.selectOption('[data-testid="rollup-value-column"]', 'amount');
    await page.selectOption('[data-testid="rollup-aggregation"]', 'max');
    await page.click('[data-testid="save-column"]');

    // Verify values
    await expect(page.locator('[data-cell-id*="min_order"]').first()).toHaveText('100');
    await expect(page.locator('[data-cell-id*="max_order"]').first()).toHaveText('200');
  });

  test('Should support COUNTUNIQUE aggregation', async ({ page }) => {
    // Navigate to Orders and add duplicate amounts
    await page.click('text=Orders');
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-order_id"]', 'ORD-004');
    await page.fill('[data-testid="field-customer_id"]', 'CUST-001');
    await page.fill('[data-testid="field-amount"]', '100'); // Duplicate amount
    await page.click('[data-testid="save-row"]');

    await page.click('[data-testid="back-to-dashboard"]');
    await page.click('text=Customers');

    // Add COUNTUNIQUE rollup
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'unique_amounts');
    await page.selectOption('[data-testid="column-type"]', 'rollup');
    await page.selectOption('[data-testid="rollup-source-database"]', 'Orders');
    await page.selectOption('[data-testid="rollup-value-column"]', 'amount');
    await page.selectOption('[data-testid="rollup-aggregation"]', 'countunique');
    await page.click('[data-testid="save-column"]');

    // Should show 2 unique amounts (100, 200)
    const rollupCell = page.locator('[data-cell-id*="unique_amounts"]').first();
    await expect(rollupCell).toHaveText('2', { timeout: 5000 });
  });

  test('Should apply filters to Rollup', async ({ page }) => {
    await page.click('text=Customers');

    // Add Rollup with filter
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'high_value_orders');
    await page.selectOption('[data-testid="column-type"]', 'rollup');

    await page.selectOption('[data-testid="rollup-source-database"]', 'Orders');
    await page.selectOption('[data-testid="rollup-aggregation"]', 'count');

    // Add filter: amount >= 150
    await page.click('[data-testid="add-rollup-filter"]');
    await page.selectOption('[data-testid="filter-column"]', 'amount');
    await page.selectOption('[data-testid="filter-operator"]', 'gte');
    await page.fill('[data-testid="filter-value"]', '150');

    await page.click('[data-testid="save-column"]');

    // Should only count orders >= 150 (ORD-002: 200, ORD-003: 150)
    // For CUST-001: only ORD-002 (200) matches
    const rollupCell = page.locator('[data-cell-id*="high_value_orders"]').first();
    await expect(rollupCell).toHaveText('1', { timeout: 5000 });
  });

  test('Should update Rollup when source data changes', async ({ page }) => {
    await page.click('text=Customers');

    // Note initial total_order_value
    const rollupCell = page.locator('[data-cell-id*="total_order_value"]').first();
    await expect(rollupCell).toHaveText('300');

    // Navigate to Orders and add new order
    await page.click('[data-testid="back-to-dashboard"]');
    await page.click('text=Orders');

    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-order_id"]', 'ORD-005');
    await page.fill('[data-testid="field-customer_id"]', 'CUST-001');
    await page.fill('[data-testid="field-amount"]', '50');
    await page.click('[data-testid="save-row"]');

    // Go back to Customers
    await page.click('[data-testid="back-to-dashboard"]');
    await page.click('text=Customers');

    // Rollup should be updated (300 + 50 = 350)
    await expect(rollupCell).toHaveText('350', { timeout: 5000 });
  });

  test('Should handle empty Rollup results', async ({ page }) => {
    await page.click('text=Customers');

    // Add customer with no orders
    await page.click('[data-testid="add-row"]');
    await page.fill('[data-testid="field-customer_id"]', 'CUST-003');
    await page.fill('[data-testid="field-name"]', 'Jane Smith');
    await page.click('[data-testid="save-row"]');

    // Rollup columns should show 0 or empty
    const sumCell = page.locator('[data-cell-id*="total_order_value"]').last();
    const countCell = page.locator('[data-cell-id*="order_count"]').last();

    await expect(sumCell).toHaveText(/^(0|)$/);
    await expect(countCell).toHaveText('0');
  });
});

test.describe('Computed Columns - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Should efficiently calculate Lookup for many rows', async ({ page }) => {
    // Create database with 100 rows
    await createDatabase(page, 'LargeOrders', [
      { name: 'order_id', type: 'text', required: true },
      { name: 'customer_id', type: 'text', required: true }
    ]);

    // Add Lookup column
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'customer_name');
    await page.selectOption('[data-testid="column-type"]', 'lookup');
    await page.selectOption('[data-testid="lookup-source-database"]', 'Customers');
    await page.click('[data-testid="save-column"]');

    // Add 100 rows via bulk import
    await page.click('[data-testid="import-button"]');

    let csv = 'order_id,customer_id\n';
    for (let i = 0; i < 100; i++) {
      csv += `ORD-${i},CUST-001\n`;
    }

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'orders.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv)
    });

    const startTime = Date.now();
    await page.click('button:has-text("Импортировать")');
    await page.waitForSelector('text=Import complete', { timeout: 30000 });
    const importTime = Date.now() - startTime;

    // Should complete within reasonable time (< 15 seconds)
    expect(importTime).toBeLessThan(15000);

    // Verify lookups are calculated
    const lookupCells = page.locator('[data-cell-id*="customer_name"]');
    const count = await lookupCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Should batch Rollup calculations', async ({ page }) => {
    // Measure time to recalculate rollups after bulk update
    await page.click('text=Orders');

    // Update all orders
    await page.click('[data-testid="select-all"]');
    await page.click('[data-testid="bulk-edit"]');
    await page.fill('[data-testid="bulk-field-amount"]', '500');
    await page.click('[data-testid="apply-bulk-edit"]');

    // Navigate to Customers to see updated rollups
    const startTime = Date.now();
    await page.click('[data-testid="back-to-dashboard"]');
    await page.click('text=Customers');

    // Wait for rollups to recalculate
    await page.waitForSelector('[data-cell-id*="total_order_value"]');
    const recalcTime = Date.now() - startTime;

    // Should recalculate quickly (< 5 seconds)
    expect(recalcTime).toBeLessThan(5000);
  });
});

test.describe('Computed Columns - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Should show error for circular Lookup references', async ({ page }) => {
    // Create DB1
    await createDatabase(page, 'DB1', [
      { name: 'id', type: 'text', required: true },
      { name: 'db2_ref', type: 'text', required: false }
    ]);

    // Add Lookup to DB2
    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'db2_value');
    await page.selectOption('[data-testid="column-type"]', 'lookup');
    await page.selectOption('[data-testid="lookup-source-database"]', 'DB2');
    await page.click('[data-testid="save-column"]');

    await page.click('[data-testid="back-to-dashboard"]');

    // Create DB2 with Lookup back to DB1 (circular)
    await createDatabase(page, 'DB2', [
      { name: 'id', type: 'text', required: true },
      { name: 'db1_ref', type: 'text', required: false }
    ]);

    await page.click('[data-testid="add-column"]');
    await page.fill('[data-testid="column-name"]', 'db1_value');
    await page.selectOption('[data-testid="column-type"]', 'lookup');
    await page.selectOption('[data-testid="lookup-source-database"]', 'DB1');
    await page.click('[data-testid="save-column"]');

    // Should show circular reference error
    await expect(page.locator('text=Circular reference detected')).toBeVisible();
  });

  test('Should handle Lookup to deleted database', async ({ page }) => {
    await page.click('text=Orders');

    // Delete source database (Customers)
    await page.click('[data-testid="back-to-dashboard"]');
    const customersCard = page.locator('text=Customers').locator('..');
    await customersCard.hover();
    await customersCard.locator('[data-testid="delete-button"]').click();
    await page.click('[data-testid="confirm-delete"]');

    // Go back to Orders
    await page.click('text=Orders');

    // Lookup column should show error or be disabled
    await expect(page.locator('text=Source database not found')).toBeVisible();
  });
});
