import { test, expect, Page } from '@playwright/test';

// Test users
const USER_1 = {
  email: 'collab-user1@example.com',
  password: 'SecurePass123!'
};

const USER_2 = {
  email: 'collab-user2@example.com',
  password: 'SecurePass123!'
};

// Helper function to login
async function login(page: Page, user: typeof USER_1) {
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Collaboration Features', () => {
  test.describe('User Presence', () => {
    test('Should show active users in the database', async ({ page, context }) => {
      // Login as user 1
      await login(page, USER_1);

      // Navigate to database
      await page.locator('.database-card').first().click();

      // Open second browser context as user 2
      const page2 = await context.newPage();
      await login(page2, USER_2);
      await page2.locator('.database-card').first().click();

      // User 1 should see user 2 in active users
      await expect(page.locator('[data-testid="active-users"]')).toBeVisible();
      await expect(page.locator(`text=${USER_2.email}`)).toBeVisible({ timeout: 10000 });

      // Close user 2's session
      await page2.close();

      // User 1 should no longer see user 2 after a few seconds
      await page.waitForTimeout(6000); // Wait for presence timeout
      await expect(page.locator(`text=${USER_2.email}`)).not.toBeVisible();
    });

    test('Should update user status (active/idle/away)', async ({ page }) => {
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Initially should be active
      const statusIndicator = page.locator('[data-testid="user-status"]').first();
      await expect(statusIndicator).toHaveClass(/active/);

      // Simulate idle (no interaction)
      await page.waitForTimeout(300000); // 5 minutes
      await expect(statusIndicator).toHaveClass(/idle/);
    });

    test('Should track cursor position', async ({ page, context }) => {
      // Login as user 1
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Login as user 2 in another context
      const page2 = await context.newPage();
      await login(page2, USER_2);
      await page2.locator('.database-card').first().click();

      // Move user 2's cursor
      await page2.mouse.move(500, 300);

      // User 1 should see user 2's cursor
      const cursor = page.locator(`[data-testid="cursor-${USER_2.email}"]`);
      await expect(cursor).toBeVisible({ timeout: 5000 });

      await page2.close();
    });
  });

  test.describe('Comments System', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, USER_1);
      await page.locator('.database-card').first().click();
    });

    test('Should add a database-level comment', async ({ page }) => {
      // Open comments panel
      await page.click('[data-testid="comments-button"]');

      // Add comment
      await page.fill('[data-testid="comment-input"]', 'This is a test comment');
      await page.click('[data-testid="submit-comment"]');

      // Verify comment appears
      await expect(page.locator('text=This is a test comment')).toBeVisible();
    });

    test('Should add a row-level comment', async ({ page }) => {
      // Select a row
      const firstRow = page.locator('tr[data-row-id]').first();
      await firstRow.click();

      // Open row comments
      await page.click('[data-testid="row-comments-button"]');

      // Add comment
      await page.fill('[data-testid="comment-input"]', 'Row needs review');
      await page.click('[data-testid="submit-comment"]');

      // Verify comment appears
      await expect(page.locator('text=Row needs review')).toBeVisible();

      // Comment should have row context
      await expect(page.locator('[data-testid="comment-row-context"]')).toBeVisible();
    });

    test('Should reply to a comment', async ({ page }) => {
      // Add initial comment
      await page.click('[data-testid="comments-button"]');
      await page.fill('[data-testid="comment-input"]', 'Original comment');
      await page.click('[data-testid="submit-comment"]');

      // Click reply button
      await page.click('[data-testid="reply-button"]');

      // Add reply
      await page.fill('[data-testid="reply-input"]', 'This is a reply');
      await page.click('[data-testid="submit-reply"]');

      // Verify reply appears nested under original comment
      const commentThread = page.locator('[data-testid="comment-thread"]');
      await expect(commentThread.locator('text=Original comment')).toBeVisible();
      await expect(commentThread.locator('text=This is a reply')).toBeVisible();
    });

    test('Should edit a comment', async ({ page }) => {
      // Add comment
      await page.click('[data-testid="comments-button"]');
      await page.fill('[data-testid="comment-input"]', 'Original text');
      await page.click('[data-testid="submit-comment"]');

      // Edit comment
      await page.click('[data-testid="edit-comment"]');
      await page.fill('[data-testid="edit-comment-input"]', 'Updated text');
      await page.click('[data-testid="save-edit"]');

      // Verify updated text
      await expect(page.locator('text=Updated text')).toBeVisible();
      await expect(page.locator('text=Original text')).not.toBeVisible();
      await expect(page.locator('text=(edited)')).toBeVisible();
    });

    test('Should delete a comment', async ({ page }) => {
      // Add comment
      await page.click('[data-testid="comments-button"]');
      await page.fill('[data-testid="comment-input"]', 'To be deleted');
      await page.click('[data-testid="submit-comment"]');

      // Delete comment
      await page.click('[data-testid="delete-comment"]');
      await page.click('[data-testid="confirm-delete"]');

      // Verify comment is gone
      await expect(page.locator('text=To be deleted')).not.toBeVisible();
    });

    test('Should resolve a comment', async ({ page }) => {
      // Add comment
      await page.click('[data-testid="comments-button"]');
      await page.fill('[data-testid="comment-input"]', 'Issue to resolve');
      await page.click('[data-testid="submit-comment"]');

      // Resolve comment
      await page.click('[data-testid="resolve-comment"]');

      // Verify comment is marked as resolved
      await expect(page.locator('[data-testid="resolved-badge"]')).toBeVisible();

      // Unresolve
      await page.click('[data-testid="unresolve-comment"]');
      await expect(page.locator('[data-testid="resolved-badge"]')).not.toBeVisible();
    });

    test('Should add emoji reaction to comment', async ({ page }) => {
      // Add comment
      await page.click('[data-testid="comments-button"]');
      await page.fill('[data-testid="comment-input"]', 'React to this');
      await page.click('[data-testid="submit-comment"]');

      // Add reaction
      await page.click('[data-testid="add-reaction"]');
      await page.click('[data-testid="emoji-thumbs-up"]');

      // Verify reaction appears
      await expect(page.locator('[data-testid="reaction-👍"]')).toBeVisible();
      await expect(page.locator('[data-testid="reaction-count"]')).toHaveText('1');

      // Remove reaction
      await page.click('[data-testid="reaction-👍"]');
      await expect(page.locator('[data-testid="reaction-👍"]')).not.toBeVisible();
    });

    test('Should show comment count badge', async ({ page }) => {
      // Add multiple comments
      await page.click('[data-testid="comments-button"]');

      for (let i = 1; i <= 3; i++) {
        await page.fill('[data-testid="comment-input"]', `Comment ${i}`);
        await page.click('[data-testid="submit-comment"]');
      }

      // Close and reopen comments
      await page.click('[data-testid="close-comments"]');

      // Verify count badge
      await expect(page.locator('[data-testid="comments-count"]')).toHaveText('3');
    });

    test('Should receive real-time comment updates', async ({ page, context }) => {
      // Open comments as user 1
      await page.click('[data-testid="comments-button"]');

      // Login as user 2 in another context
      const page2 = await context.newPage();
      await login(page2, USER_2);
      await page2.locator('.database-card').first().click();
      await page2.click('[data-testid="comments-button"]');

      // User 2 adds comment
      await page2.fill('[data-testid="comment-input"]', 'Real-time comment');
      await page2.click('[data-testid="submit-comment"]');

      // User 1 should see the comment appear immediately
      await expect(page.locator('text=Real-time comment')).toBeVisible({ timeout: 3000 });

      await page2.close();
    });
  });

  test.describe('Cell Edit Indicators', () => {
    test('Should show when another user is editing a cell', async ({ page, context }) => {
      // Login as user 1
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Login as user 2
      const page2 = await context.newPage();
      await login(page2, USER_2);
      await page2.locator('.database-card').first().click();

      // User 2 starts editing a cell
      const cell = page2.locator('[data-cell-id="row1-price"]');
      await cell.click();

      // User 1 should see edit indicator
      const editIndicator = page.locator('[data-testid="edit-indicator-row1-price"]');
      await expect(editIndicator).toBeVisible({ timeout: 5000 });
      await expect(editIndicator).toContainText(USER_2.email);

      // User 2 finishes editing
      await cell.press('Escape');

      // Indicator should disappear
      await expect(editIndicator).not.toBeVisible();

      await page2.close();
    });

    test('Should prevent concurrent edits of same cell', async ({ page, context }) => {
      // Login as user 1
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Login as user 2
      const page2 = await context.newPage();
      await login(page2, USER_2);
      await page2.locator('.database-card').first().click();

      // User 1 starts editing a cell
      const cell1 = page.locator('[data-cell-id="row1-price"]');
      await cell1.click();

      // User 2 tries to edit same cell
      const cell2 = page2.locator('[data-cell-id="row1-price"]');
      await cell2.click();

      // User 2 should see warning
      await expect(page2.locator('text=Another user is editing this cell')).toBeVisible();

      await page2.close();
    });
  });

  test.describe('Activity Feed', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, USER_1);
      await page.locator('.database-card').first().click();
    });

    test('Should show recent activity', async ({ page }) => {
      // Open activity feed
      await page.click('[data-testid="activity-feed-button"]');

      // Should show activities
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item"]')).toBeVisible();
    });

    test('Should log row creation', async ({ page }) => {
      // Open activity feed
      await page.click('[data-testid="activity-feed-button"]');

      // Create a row
      await page.click('[data-testid="add-row-button"]');
      await page.fill('[data-testid="field-name"]', 'Test Product');
      await page.click('[data-testid="save-row"]');

      // Check activity feed
      await expect(page.locator('text=created a new row')).toBeVisible({ timeout: 3000 });
    });

    test('Should log row updates with changed fields', async ({ page }) => {
      // Open activity feed
      await page.click('[data-testid="activity-feed-button"]');

      // Update a cell
      const cell = page.locator('[data-cell-id="row1-price"]');
      await cell.click();
      await cell.fill('999.99');
      await cell.press('Enter');

      // Check activity feed
      await expect(page.locator('text=updated row')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('text=price')).toBeVisible();
    });

    test('Should log row deletion', async ({ page }) => {
      // Open activity feed
      await page.click('[data-testid="activity-feed-button"]');

      // Delete a row
      const row = page.locator('tr[data-row-id]').first();
      await row.click({ button: 'right' });
      await page.click('[data-testid="delete-row"]');
      await page.click('[data-testid="confirm-delete"]');

      // Check activity feed
      await expect(page.locator('text=deleted a row')).toBeVisible({ timeout: 3000 });
    });

    test('Should filter activity by type', async ({ page }) => {
      await page.click('[data-testid="activity-feed-button"]');

      // Filter to show only updates
      await page.click('[data-testid="filter-activity"]');
      await page.click('[data-testid="filter-updates"]');

      // Should only show update activities
      const activities = page.locator('[data-testid="activity-item"]');
      const count = await activities.count();

      for (let i = 0; i < count; i++) {
        const text = await activities.nth(i).textContent();
        expect(text).toContain('updated');
      }
    });
  });

  test.describe('Collaborative Cursors', () => {
    test('Should show cursor with user name label', async ({ page, context }) => {
      // Login as user 1
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Login as user 2
      const page2 = await context.newPage();
      await login(page2, USER_2);
      await page2.locator('.database-card').first().click();

      // Move user 2's cursor
      await page2.mouse.move(400, 250);

      // User 1 should see cursor with label
      const cursor = page.locator('[data-testid="collaborative-cursor"]');
      await expect(cursor).toBeVisible({ timeout: 5000 });

      const label = page.locator('[data-testid="cursor-label"]');
      await expect(label).toContainText(USER_2.email);

      await page2.close();
    });

    test('Should use different colors for different users', async ({ page, context }) => {
      // Login as user 1
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Login as user 2
      const page2 = await context.newPage();
      await login(page2, USER_2);
      await page2.locator('.database-card').first().click();

      // Move cursor
      await page2.mouse.move(400, 250);

      // Get cursor color
      const cursor = page.locator('[data-testid="collaborative-cursor"]');
      const color1 = await cursor.evaluate(el => getComputedStyle(el).color);

      // Should have a color assigned
      expect(color1).toBeTruthy();

      await page2.close();
    });

    test('Should smoothly animate cursor movements', async ({ page, context }) => {
      // Login as user 1
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Login as user 2
      const page2 = await context.newPage();
      await login(page2, USER_2);
      await page2.locator('.database-card').first().click();

      // Move cursor in steps
      await page2.mouse.move(100, 100);
      await page.waitForTimeout(500);
      await page2.mouse.move(500, 300);

      // Cursor should animate smoothly (check for transition)
      const cursor = page.locator('[data-testid="collaborative-cursor"]');
      const hasTransition = await cursor.evaluate(el => {
        return getComputedStyle(el).transition !== 'all 0s ease 0s';
      });

      expect(hasTransition).toBeTruthy();

      await page2.close();
    });
  });

  test.describe('Mentions in Comments', () => {
    test('Should autocomplete user mentions', async ({ page }) => {
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Open comments
      await page.click('[data-testid="comments-button"]');

      // Type @ to trigger mention autocomplete
      await page.fill('[data-testid="comment-input"]', '@');

      // Should show user suggestions
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
    });

    test('Should notify mentioned user', async ({ page, context }) => {
      // Login as user 1
      await login(page, USER_1);
      await page.locator('.database-card').first().click();

      // Login as user 2 in another context
      const page2 = await context.newPage();
      await login(page2, USER_2);

      // User 1 mentions user 2 in comment
      await page.click('[data-testid="comments-button"]');
      await page.fill('[data-testid="comment-input"]', `@${USER_2.email} Please review`);
      await page.click('[data-testid="submit-comment"]');

      // User 2 should see notification
      await expect(page2.locator('[data-testid="notification-badge"]')).toBeVisible({ timeout: 5000 });

      await page2.close();
    });
  });
});
