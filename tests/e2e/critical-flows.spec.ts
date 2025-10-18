import { test, expect } from '@playwright/test';

// Test configuration
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

const NEW_USER = {
  email: `user${Date.now()}@example.com`,
  password: 'SecurePass123!'
};

test.describe('Critical User Flows', () => {
  test.describe('Authentication Flow', () => {
    test('Should protect routes from unauthenticated access', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL('/login');
      await expect(page.locator('text=Вход в VHData')).toBeVisible();
    });

    test('Should redirect to dashboard after successful login', async ({ page }) => {
      await page.goto('/login');

      // Fill login form
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('text=Мои базы данных')).toBeVisible();
    });

    test('Should handle invalid login credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill with invalid credentials
      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');

      // Submit form
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=Ошибка входа')).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test('Should allow user registration with valid data', async ({ page }) => {
      await page.goto('/register');

      // Fill registration form
      await page.fill('input[type="email"]', NEW_USER.email);
      await page.fill('input[type="password"]', NEW_USER.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard after successful registration
      await expect(page).toHaveURL('/dashboard');
    });

    test('Should validate password requirements', async ({ page }) => {
      await page.goto('/register');

      // Try weak password
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'weak');

      // Check for validation message
      await expect(page.locator('text=минимум 8 символов')).toBeVisible();

      // Submit button should be disabled
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Database CRUD Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    });

    test('Should create a new database', async ({ page }) => {
      // Click create button
      await page.click('button:has-text("Новая база данных")');

      // Fill database form
      await page.fill('input[placeholder="Название"]', 'Test Database');
      await page.fill('textarea[placeholder="Описание"]', 'Test description');

      // Select icon
      await page.click('text=📊');

      // Submit
      await page.click('button:has-text("Создать")');

      // Verify database was created
      await expect(page.locator('text=Test Database')).toBeVisible();
    });

    test('Should navigate to database view', async ({ page }) => {
      // Click on first database card
      const firstDatabase = page.locator('.database-card').first();
      await firstDatabase.click();

      // Should navigate to database view
      await expect(page).toHaveURL(/\/database\/.+/);
      await expect(page.locator('text=Таблица данных')).toBeVisible();
    });

    test('Should search databases', async ({ page }) => {
      // Enter search query
      await page.fill('input[placeholder="Поиск баз данных..."]', 'Test');

      // Check that results are filtered
      const databases = page.locator('.database-card');
      const count = await databases.count();

      for (let i = 0; i < count; i++) {
        const text = await databases.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('test');
      }
    });

    test('Should delete a database', async ({ page }) => {
      // Create a database first
      await page.click('button:has-text("Новая база данных")');
      await page.fill('input[placeholder="Название"]', 'To Delete');
      await page.click('button:has-text("Создать")');

      // Find and delete the database
      const dbCard = page.locator('text=To Delete').locator('..');
      await dbCard.hover();
      await dbCard.locator('button[aria-label="Delete"]').click();

      // Confirm deletion
      await page.click('button:has-text("Удалить")');

      // Verify database was deleted
      await expect(page.locator('text=To Delete')).not.toBeVisible();
    });
  });

  test.describe('Formula Engine', () => {
    test.beforeEach(async ({ page }) => {
      // Login and navigate to a database
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Navigate to first database
      await page.locator('.database-card').first().click();
    });

    test('Should create a formula column', async ({ page }) => {
      // Add new column
      await page.click('button:has-text("Добавить колонку")');

      // Configure as formula column
      await page.fill('input[placeholder="Название колонки"]', 'Total');
      await page.selectOption('select[name="type"]', 'formula');

      // Enter formula
      await page.fill('textarea[placeholder="Формула"]', 'SUM({price} * {quantity})');

      // Save column
      await page.click('button:has-text("Сохранить")');

      // Verify column was created
      await expect(page.locator('th:has-text("Total")')).toBeVisible();
    });

    test('Should prevent dangerous formula patterns', async ({ page }) => {
      // Try to create column with dangerous formula
      await page.click('button:has-text("Добавить колонку")');
      await page.fill('input[placeholder="Название колонки"]', 'Danger');
      await page.selectOption('select[name="type"]', 'formula');

      // Try dangerous patterns
      const dangerousFormulas = [
        'eval("alert(1)")',
        'Function("return this")()',
        '__proto__.polluted = true'
      ];

      for (const formula of dangerousFormulas) {
        await page.fill('textarea[placeholder="Формула"]', formula);
        await page.click('button:has-text("Сохранить")');

        // Should show error
        await expect(page.locator('text=недопустимая формула')).toBeVisible();
      }
    });
  });

  test.describe('File Import/Export', () => {
    test.beforeEach(async ({ page }) => {
      // Login and navigate to a database
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Navigate to first database
      await page.locator('.database-card').first().click();
    });

    test('Should import CSV file', async ({ page }) => {
      // Click import button
      await page.click('button:has-text("Импорт")');

      // Create test CSV content
      const csvContent = 'Name,Price,Quantity\nProduct 1,100,5\nProduct 2,200,3';
      const buffer = Buffer.from(csvContent);

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: buffer
      });

      // Map columns
      await page.click('button:has-text("Далее")');

      // Confirm import
      await page.click('button:has-text("Импортировать")');

      // Verify data was imported
      await expect(page.locator('text=Product 1')).toBeVisible();
      await expect(page.locator('text=Product 2')).toBeVisible();
    });

    test('Should export data', async ({ page }) => {
      // Click export button
      await page.click('button:has-text("Экспорт")');

      // Select format
      await page.selectOption('select[name="format"]', 'csv');

      // Start download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Скачать")')
      ]);

      // Verify download started
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test.describe('Error Handling', () => {
    test('Should handle network errors gracefully', async ({ page, context }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Simulate network failure
      await context.route('**/api/**', route => route.abort());

      // Try to create database
      await page.click('button:has-text("Новая база данных")');
      await page.fill('input[placeholder="Название"]', 'Test');
      await page.click('button:has-text("Создать")');

      // Should show error message
      await expect(page.locator('text=Ошибка подключения')).toBeVisible();

      // Should show retry button
      await expect(page.locator('button:has-text("Повторить")')).toBeVisible();
    });

    test('Should handle 404 pages', async ({ page }) => {
      await page.goto('/non-existent-page');

      // Should show 404 page
      await expect(page.locator('text=404')).toBeVisible();
      await expect(page.locator('text=Страница не найдена')).toBeVisible();

      // Should have link to home
      await expect(page.locator('a[href="/"]')).toBeVisible();
    });

    test('Should validate form inputs', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('input[type="email"]:invalid')).toBeVisible();
      await expect(page.locator('input[type="password"]:invalid')).toBeVisible();

      // Enter invalid email
      await page.fill('input[type="email"]', 'not-an-email');

      // Should show email validation error
      await expect(page.locator('input[type="email"]:invalid')).toBeVisible();
    });
  });

  test.describe('Performance Tests', () => {
    test('Should load dashboard quickly', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');

      // Measure dashboard load time
      const startTime = Date.now();
      await page.waitForURL('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('Should handle large datasets', async ({ page }) => {
      // Login and navigate to database
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Create database with many rows
      await page.click('button:has-text("Новая база данных")');
      await page.fill('input[placeholder="Название"]', 'Large Dataset');
      await page.click('button:has-text("Создать")');

      // Navigate to database
      await page.click('text=Large Dataset');

      // Generate large CSV
      let csv = 'ID,Name,Value\n';
      for (let i = 0; i < 1000; i++) {
        csv += `${i},Item ${i},${Math.random() * 1000}\n`;
      }

      // Import large dataset
      await page.click('button:has-text("Импорт")');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'large.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv)
      });

      // Should handle import without crashing
      await page.click('button:has-text("Импортировать")');
      await page.waitForTimeout(5000); // Wait for import to complete

      // Should display data
      await expect(page.locator('text=Item 0')).toBeVisible();
    });
  });
});

test.describe('Security Tests', () => {
  test('Should validate color inputs to prevent CSS injection', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Try to inject malicious CSS
    await page.click('button:has-text("Новая база данных")');

    // Try dangerous color values
    const dangerousColors = [
      'red; } * { display: none;',
      'javascript:alert(1)',
      'url(javascript:alert(1))',
      'expression(alert(1))'
    ];

    for (const color of dangerousColors) {
      await page.fill('input[name="color"]', color);
      await page.click('button:has-text("Создать")');

      // Should reject dangerous input
      await expect(page.locator('text=Invalid color')).toBeVisible();
    }
  });

  test('Should prevent ReDoS attacks in formula engine', async ({ page }) => {
    // Login and navigate to database
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.locator('.database-card').first().click();

    // Try to create formula with ReDoS pattern
    await page.click('button:has-text("Добавить колонку")');
    await page.fill('input[placeholder="Название колонки"]', 'ReDoS Test');
    await page.selectOption('select[name="type"]', 'formula');

    // Try ReDoS pattern
    const redosPattern = 'REPLACE({text}, "(a+)+b", "x")';
    await page.fill('textarea[placeholder="Формула"]', redosPattern);
    await page.click('button:has-text("Сохранить")');

    // Should reject unsafe pattern
    await expect(page.locator('text=Unsafe regex pattern')).toBeVisible();
  });
});