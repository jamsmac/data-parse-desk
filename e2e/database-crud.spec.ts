import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Database CRUD Operations
 * Критичный путь: Создание, просмотр, редактирование, удаление БД
 */

test.describe('Database CRUD', () => {
  // В реальных условиях нужна аутентификация
  // Для тестов можно использовать test user или моки
  test.beforeEach(async ({ page }) => {
    // TODO: Добавить автологин или использовать сохраненные cookies
    await page.goto('/dashboard');
  });

  test('should display dashboard page', async ({ page }) => {
    // Проверяем, что дашборд отображается
    await expect(page.locator('text=/Dashboard|Главная/i')).toBeVisible();
  });

  test('should open create database dialog', async ({ page }) => {
    // Клик на кнопку создания БД
    const createButton = page.getByRole('button', { name: /создать|create.*database/i });
    await createButton.click();

    // Проверяем, что диалог открылся
    await expect(page.locator('text=/Создание базы данных|Create Database/i')).toBeVisible();

    // Проверяем наличие полей формы
    await expect(page.getByLabel(/название|name/i)).toBeVisible();
    await expect(page.getByLabel(/описание|description/i)).toBeVisible();
  });

  test('should create a new database', async ({ page }) => {
    const dbName = `Test DB ${Date.now()}`;

    // Открываем диалог создания
    const createButton = page.getByRole('button', { name: /создать|create.*database/i });
    await createButton.click();

    // Заполняем форму
    await page.getByLabel(/название|name/i).fill(dbName);
    await page.getByLabel(/описание|description/i).fill('Test database for E2E testing');

    // Выбираем иконку (если есть)
    const iconPicker = page.locator('[data-testid="icon-picker"]').first();
    if (await iconPicker.isVisible()) {
      await iconPicker.click();
      await page.locator('[data-icon]').first().click();
    }

    // Отправляем форму
    const submitButton = page.getByRole('button', { name: /создать|create/i }).last();
    await submitButton.click();

    // Проверяем, что БД создана и отображается
    await expect(page.locator(`text="${dbName}"`)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to database view', async ({ page }) => {
    // Находим любую БД и кликаем на нее
    const firstDatabase = page.locator('[data-testid="database-card"]').first();

    if (await firstDatabase.isVisible()) {
      await firstDatabase.click();

      // Проверяем, что перешли на страницу БД
      await expect(page).toHaveURL(/.*\/database\/.+/);

      // Проверяем наличие элементов страницы БД
      await expect(page.locator('text=/Загрузить файл|Upload/i')).toBeVisible();
    }
  });

  test('should search databases', async ({ page }) => {
    // Находим поле поиска
    const searchInput = page.getByPlaceholder(/поиск|search/i);

    if (await searchInput.isVisible()) {
      // Вводим поисковый запрос
      await searchInput.fill('Test');

      // Проверяем, что результаты фильтруются
      await page.waitForTimeout(500); // Даем время на дебаунс

      // Все видимые БД должны содержать "Test"
      const visibleDatabases = page.locator('[data-testid="database-card"]');
      const count = await visibleDatabases.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const text = await visibleDatabases.nth(i).textContent();
          expect(text?.toLowerCase()).toContain('test');
        }
      }
    }
  });
});
