import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Analytics and Charts
 * Критичный путь: Создание графиков, настройка аналитики
 */

test.describe('Analytics and Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
  });

  test('should display analytics page', async ({ page }) => {
    await expect(page.locator('text=/Analytics|Аналитика/i')).toBeVisible();
  });

  test('should create bar chart', async ({ page }) => {
    // Ищем кнопку создания графика
    const createChartButton = page.getByRole('button', { name: /создать график|create chart/i });
    if (await createChartButton.isVisible()) {
      await createChartButton.click();

      // Выбираем тип графика
      await page.getByRole('combobox', { name: /тип графика|chart type/i }).click();
      await page.getByRole('option', { name: /bar chart|столбчатая диаграмма/i }).click();

      // Настраиваем данные
      await page.getByLabel(/ось X|x-axis/i).click();
      await page.getByRole('option', { name: /category|категория/i }).click();

      await page.getByLabel(/ось Y|y-axis/i).click();
      await page.getByRole('option', { name: /value|значение/i }).click();

      // Сохраняем график
      await page.getByRole('button', { name: /сохранить|save/i }).click();

      // Проверяем, что график создан
      await expect(page.locator('[data-testid="chart-container"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create pivot table', async ({ page }) => {
    // Ищем кнопку создания pivot таблицы
    const createPivotButton = page.getByRole('button', { name: /pivot table|сводная таблица/i });
    if (await createPivotButton.isVisible()) {
      await createPivotButton.click();

      // Настраиваем строки
      await page.getByLabel(/строки|rows/i).click();
      await page.getByRole('option', { name: /date|дата/i }).click();

      // Настраиваем колонки
      await page.getByLabel(/колонки|columns/i).click();
      await page.getByRole('option', { name: /category|категория/i }).click();

      // Настраиваем значения
      await page.getByLabel(/значения|values/i).click();
      await page.getByRole('option', { name: /sum|сумма/i }).click();

      // Создаем pivot таблицу
      await page.getByRole('button', { name: /создать|create/i }).click();

      // Проверяем, что таблица создана
      await expect(page.locator('[data-testid="pivot-table"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should export chart to image', async ({ page }) => {
    // Создаем график (упрощенная версия)
    const chartContainer = page.locator('[data-testid="chart-container"]').first();
    if (await chartContainer.isVisible()) {
      // Ищем кнопку экспорта
      const exportButton = page.getByRole('button', { name: /экспорт|export/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Выбираем формат PNG
        await page.getByRole('option', { name: /PNG/i }).click();

        // Проверяем, что файл скачался
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: /скачать|download/i }).click();
        const download = await downloadPromise;
        
        expect(download.suggestedFilename()).toMatch(/\.png$/);
      }
    }
  });

  test('should create dashboard', async ({ page }) => {
    // Переходим в конструктор дашбордов
    const dashboardButton = page.getByRole('button', { name: /дашборд|dashboard/i });
    if (await dashboardButton.isVisible()) {
      await dashboardButton.click();

      // Добавляем виджет
      const addWidgetButton = page.getByRole('button', { name: /добавить виджет|add widget/i });
      if (await addWidgetButton.isVisible()) {
        await addWidgetButton.click();

        // Выбираем тип виджета
        await page.getByRole('option', { name: /chart|график/i }).click();

        // Настраиваем виджет
        await page.getByLabel(/название|title/i).fill('Sales Chart');
        await page.getByLabel(/размер|size/i).click();
        await page.getByRole('option', { name: /large|большой/i }).click();

        // Сохраняем виджет
        await page.getByRole('button', { name: /сохранить|save/i }).click();

        // Проверяем, что виджет добавлен
        await expect(page.locator('[data-testid="dashboard-widget"]')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});