/**
 * Authentication Fixtures
 * Provides authenticated page context for tests
 */

import { test as base, Page } from '@playwright/test';
import { login, generateTestData } from '../helpers/test-helpers';

type AuthFixtures = {
  authenticatedPage: Page;
  testUser: { email: string; password: string };
};

export const test = base.extend<AuthFixtures>({
  /**
   * Fixture: authenticatedPage
   * Provides a page that's already logged in
   */
  authenticatedPage: async ({ page }, use) => {
    // Use existing test user or create new one
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    };

    // Login
    await login(page, testUser.email, testUser.password);

    // Use the authenticated page
    await use(page);

    // Cleanup after test (optional)
    // await logout(page);
  },

  /**
   * Fixture: testUser
   * Provides test user credentials
   */
  testUser: async ({}, use) => {
    const user = {
      email: process.env.TEST_USER_EMAIL || generateTestData.email(),
      password: process.env.TEST_USER_PASSWORD || generateTestData.password(),
    };

    await use(user);
  },
});

export { expect } from '@playwright/test';
