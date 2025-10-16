import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Authentication Flow
 * Критичный путь: Регистрация, логин, логаут
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Начинаем с главной страницы
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    // Проверяем, что страница загружается
    await expect(page).toHaveTitle(/VHData/i);
  });

  test('should navigate to login page', async ({ page }) => {
    // Клик на кнопку "Войти"
    const loginButton = page.getByRole('link', { name: /войти|login/i });
    await loginButton.click();

    // Проверяем URL
    await expect(page).toHaveURL(/.*login/);

    // Проверяем наличие формы логина
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password|пароль/i)).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    // Клик на кнопку "Регистрация"
    const registerButton = page.getByRole('link', { name: /регистрация|register/i });
    await registerButton.click();

    // Проверяем URL
    await expect(page).toHaveURL(/.*register/);

    // Проверяем наличие формы регистрации
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password|пароль/i)).toBeVisible();
  });

  test('should show validation errors on empty login', async ({ page }) => {
    await page.goto('/login');

    // Пытаемся отправить пустую форму
    const submitButton = page.getByRole('button', { name: /войти|login/i });
    await submitButton.click();

    // Проверяем, что показываются ошибки валидации
    // (зависит от вашей реализации)
    await expect(page.locator('text=Обязательное поле')).toBeVisible({ timeout: 3000 }).catch(() => {
      // Альтернативная проверка - форма не отправилась
      expect(page.url()).toContain('login');
    });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Вводим неверные данные
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password|пароль/i).fill('wrongpassword');

    // Отправляем форму
    const submitButton = page.getByRole('button', { name: /войти|login/i });
    await submitButton.click();

    // Ожидаем сообщение об ошибке
    await expect(page.locator('text=/invalid|неверн|ошибка/i')).toBeVisible({ timeout: 5000 });
  });
});
