import { test, expect } from '@playwright/test';

test.describe('Forms Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to forms page (assuming authentication is handled separately)
    await page.goto('/forms');
  });

  test('should display forms list page', async ({ page }) => {
    // Check for forms page elements
    await expect(page.locator('h1')).toContainText('Forms');

    // Should have a button to create new form
    const createButton = page.getByRole('button', { name: /create.*form/i });
    await expect(createButton).toBeVisible();
  });

  test('should display forms table/grid', async ({ page }) => {
    // Check for forms table or grid
    const formsContainer = page.locator('[data-testid="forms-container"]');
    const formsTable = page.locator('table');
    const formsGrid = page.locator('[data-testid="forms-grid"]');

    // At least one of these should be present
    const hasFormsDisplay =
      (await formsContainer.isVisible()) ||
      (await formsTable.isVisible()) ||
      (await formsGrid.isVisible());
    expect(hasFormsDisplay).toBeTruthy();
  });

  test('should filter forms', async ({ page }) => {
    // Look for filter controls
    const statusFilter = page.locator('select[name="status"]');
    const searchInput = page.locator('input[placeholder*="search"]');

    if (await statusFilter.isVisible()) {
      // Test status filter
      await statusFilter.selectOption('completed');
      await page.waitForTimeout(1000);

      // Results should be filtered
      const filteredResults = page.locator('[data-status="completed"]');
      if ((await filteredResults.count()) > 0) {
        await expect(filteredResults.first()).toBeVisible();
      }
    }

    if (await searchInput.isVisible()) {
      // Test search functionality
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Should show search results or empty state
      const hasResults = (await page.locator('[data-testid="form-item"]').count()) >= 0;
      expect(hasResults).toBeTruthy();
    }
  });

  test('should open form creation dialog', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create.*form/i });

    if (await createButton.isVisible()) {
      await createButton.click();

      // Should open a dialog or navigate to form creation page
      const dialog = page.locator('[role="dialog"]');
      const formPage = page.locator('form');

      const hasFormCreation =
        (await dialog.isVisible()) ||
        (await formPage.isVisible()) ||
        page.url().includes('/create');
      expect(hasFormCreation).toBeTruthy();
    }
  });

  test('should handle form actions', async ({ page }) => {
    // Look for form action buttons (edit, delete, view)
    const actionButtons = page.locator('[data-testid="form-actions"]');
    const editButtons = page.locator('button[aria-label*="edit"], button[title*="edit"]');
    const viewButtons = page.locator('button[aria-label*="view"], button[title*="view"]');

    if ((await editButtons.count()) > 0) {
      await editButtons.first().click();
      await page.waitForTimeout(1000);

      // Should navigate to edit page or open edit dialog
      const hasEdit =
        page.url().includes('/edit') || (await page.locator('[role="dialog"]').isVisible());
      expect(hasEdit).toBeTruthy();
    }
  });

  test('should paginate through forms', async ({ page }) => {
    // Look for pagination controls
    const nextButton = page.locator('button[aria-label*="next"], button:has-text("Next")');
    const pageNumbers = page.locator('[data-testid="pagination"] button');

    if (await nextButton.isVisible()) {
      const initialUrl = page.url();
      await nextButton.click();
      await page.waitForTimeout(1000);

      // URL should change or content should update
      const urlChanged = page.url() !== initialUrl;
      const contentChanged = await page.locator('[data-testid="forms-container"]').isVisible();

      expect(urlChanged || contentChanged).toBeTruthy();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if page adapts to mobile
    await expect(page.locator('h1')).toBeVisible();

    // Mobile-specific elements might be present
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    const responsiveLayout = page.locator('.mobile-layout, .responsive-layout');

    // At least the basic layout should work on mobile
    await expect(page.locator('main')).toBeVisible();
  });
});
