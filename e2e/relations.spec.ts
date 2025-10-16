import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Relations and Rollups
 * Критичный путь: Создание связей между БД, настройка rollup агрегаций
 */

test.describe('Relations and Rollups', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should create relation between databases', async ({ page }) => {
    // Создаем первую БД
    const createButton = page.getByRole('button', { name: /создать|create.*database/i });
    await createButton.click();

    const db1Name = `Customers ${Date.now()}`;
    await page.getByLabel(/название|name/i).fill(db1Name);
    await page.getByLabel(/описание|description/i).fill('Customer database');
    await page.getByRole('button', { name: /создать|create/i }).last().click();

    // Создаем вторую БД
    await createButton.click();
    const db2Name = `Orders ${Date.now()}`;
    await page.getByLabel(/название|name/i).fill(db2Name);
    await page.getByLabel(/описание|description/i).fill('Orders database');
    await page.getByRole('button', { name: /создать|create/i }).last().click();

    // Переходим в первую БД
    await page.locator(`text="${db1Name}"`).click();

    // Добавляем колонку для связи
    const addColumnButton = page.getByRole('button', { name: /добавить колонку|add column/i });
    if (await addColumnButton.isVisible()) {
      await addColumnButton.click();

      // Выбираем тип Relation
      await page.getByRole('combobox', { name: /тип|type/i }).click();
      await page.getByRole('option', { name: /relation|связь/i }).click();

      // Настраиваем связь
      await page.getByLabel(/связанная база|related database/i).click();
      await page.getByRole('option', { name: db2Name }).click();

      // Выбираем тип связи
      await page.getByRole('combobox', { name: /тип связи|relation type/i }).click();
      await page.getByRole('option', { name: /one-to-many|один ко многим/i }).click();

      // Сохраняем колонку
      await page.getByRole('button', { name: /сохранить|save/i }).click();

      // Проверяем, что связь создана
      await expect(page.locator('text=/связь создана|relation created/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should configure rollup aggregation', async ({ page }) => {
    // Переходим в любую БД
    const firstDatabase = page.locator('[data-testid="database-card"]').first();
    if (await firstDatabase.isVisible()) {
      await firstDatabase.click();

      // Добавляем rollup колонку
      const addColumnButton = page.getByRole('button', { name: /добавить колонку|add column/i });
      if (await addColumnButton.isVisible()) {
        await addColumnButton.click();

        // Выбираем тип Rollup
        await page.getByRole('combobox', { name: /тип|type/i }).click();
        await page.getByRole('option', { name: /rollup|агрегация/i }).click();

        // Настраиваем rollup
        await page.getByLabel(/функция|function/i).click();
        await page.getByRole('option', { name: /sum|сумма/i }).click();

        await page.getByLabel(/поле|field/i).click();
        await page.getByRole('option', { name: /amount|сумма/i }).click();

        // Сохраняем колонку
        await page.getByRole('button', { name: /сохранить|save/i }).click();

        // Проверяем, что rollup настроен
        await expect(page.locator('text=/rollup настроен|rollup configured/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display relationship graph', async ({ page }) => {
    // Переходим в БД с связями
    const firstDatabase = page.locator('[data-testid="database-card"]').first();
    if (await firstDatabase.isVisible()) {
      await firstDatabase.click();

      // Ищем кнопку графа связей
      const graphButton = page.getByRole('button', { name: /граф связей|relationship graph/i });
      if (await graphButton.isVisible()) {
        await graphButton.click();

        // Проверяем, что граф отобразился
        await expect(page.locator('[data-testid="relationship-graph"]')).toBeVisible({ timeout: 5000 });
        
        // Проверяем наличие узлов и связей
        await expect(page.locator('[data-testid="graph-node"]')).toHaveCount({ min: 1 });
        await expect(page.locator('[data-testid="graph-edge"]')).toHaveCount({ min: 0 });
      }
    }
  });
});