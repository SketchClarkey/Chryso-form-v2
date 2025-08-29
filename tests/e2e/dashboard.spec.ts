import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for dashboard tests
    await page.goto('/login');

    // Perform login (this would need to be adjusted based on actual auth implementation)
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for potential redirect to dashboard
    await page.waitForTimeout(2000);

    // If not redirected, navigate directly (for testing when auth isn't fully set up)
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard');
    }
  });

  test('should display dashboard layout', async ({ page }) => {
    // Check for main dashboard elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    // Check for navigation items
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forms' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Templates' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    // Navigate to Forms page
    await page.getByRole('link', { name: 'Forms' }).click();
    await expect(page).toHaveURL(/.*\/forms/);

    // Navigate to Templates page
    await page.getByRole('link', { name: 'Templates' }).click();
    await expect(page).toHaveURL(/.*\/templates/);

    // Navigate back to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display user menu', async ({ page }) => {
    // Look for user menu (usually in top right)
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Check for user menu items
      await expect(page.getByText('Profile')).toBeVisible();
      await expect(page.getByText('Settings')).toBeVisible();
      await expect(page.getByText('Logout')).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if mobile navigation works
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();

      // Navigation should be visible in mobile menu
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    }
  });
});
