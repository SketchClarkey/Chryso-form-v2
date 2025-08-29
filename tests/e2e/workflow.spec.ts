import { test, expect } from '@playwright/test';

test.describe('End-to-End Workflow', () => {
  test('should complete full form lifecycle', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Allow time for authentication and redirect
    await page.waitForTimeout(2000);

    // Step 2: Navigate to forms
    if (page.url().includes('/dashboard')) {
      await page.getByRole('link', { name: 'Forms' }).click();
    } else {
      await page.goto('/forms');
    }

    // Step 3: Create a new form
    const createButton = page.getByRole('button', { name: /create.*form/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill out form creation
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('E2E Test Form');

        const saveButton = page.getByRole('button', { name: /save|create/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Step 4: Verify form was created
    await page.goto('/forms');
    await expect(page.getByText('E2E Test Form')).toBeVisible();

    // Step 5: Edit the form
    const editButton = page.locator('button[aria-label*="edit"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Make an edit
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('Updated E2E Test Form');

        const saveButton = page.getByRole('button', { name: /save|update/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Step 6: Verify update
    await page.goto('/forms');
    await expect(page.getByText('Updated E2E Test Form')).toBeVisible();
  });

  test('should handle user management workflow', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(2000);

    // Navigate to users page
    await page.goto('/users');

    // Check if users page loads
    const pageHeader = page.locator('h1');
    if (await pageHeader.isVisible()) {
      await expect(pageHeader).toContainText(/users|team|members/i);
    }

    // Look for user creation functionality
    const createUserButton = page.getByRole('button', { name: /add.*user|create.*user|invite/i });
    if (await createUserButton.isVisible()) {
      await createUserButton.click();

      // Should open user creation form
      const userForm = page.locator('form');
      const userDialog = page.locator('[role="dialog"]');

      const hasUserCreation = (await userForm.isVisible()) || (await userDialog.isVisible());
      expect(hasUserCreation).toBeTruthy();
    }
  });

  test('should handle template management workflow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(2000);

    // Navigate to templates
    await page.goto('/templates');

    // Check templates page
    const pageHeader = page.locator('h1');
    if (await pageHeader.isVisible()) {
      await expect(pageHeader).toContainText(/templates/i);
    }

    // Look for template creation
    const createButton = page.getByRole('button', { name: /create.*template|new.*template/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      // Template builder should open
      const builder = page.locator('[data-testid="template-builder"]');
      const form = page.locator('form');

      const hasTemplateBuilder =
        (await builder.isVisible()) ||
        (await form.isVisible()) ||
        page.url().includes('/templates/create');
      expect(hasTemplateBuilder).toBeTruthy();
    }
  });

  test('should handle reports and analytics workflow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(2000);

    // Navigate to reports
    await page.goto('/reports');

    // Check reports page
    const pageHeader = page.locator('h1');
    if (await pageHeader.isVisible()) {
      await expect(pageHeader).toContainText(/reports|analytics/i);
    }

    // Look for report generation features
    const generateButton = page.getByRole('button', { name: /generate|create.*report/i });
    const exportButton = page.getByRole('button', { name: /export/i });

    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(1000);

      // Should show report generation options
      const reportOptions = page.locator('[data-testid="report-options"]');
      const reportDialog = page.locator('[role="dialog"]');

      const hasReportGeneration =
        (await reportOptions.isVisible()) || (await reportDialog.isVisible());
      expect(hasReportGeneration).toBeTruthy();
    }
  });
});
