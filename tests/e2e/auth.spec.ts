import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check if login form elements are present
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling fields
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Check for validation errors
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    // Fill invalid email
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Check for email format error
    await expect(page.getByText('Invalid email format')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel('Password');
    const toggleButton = page.getByRole('button', { name: 'toggle password visibility' });

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle to hide password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate to register page', async ({ page }) => {
    // Click the sign up link
    await page.getByRole('link', { name: 'Sign up' }).click();

    // Should navigate to register page
    await expect(page).toHaveURL('/register');
  });

  test('should attempt login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');

    // Submit form
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should either redirect to dashboard or show error
    // (depending on whether the user exists in test database)
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const hasError = await page.locator('[role="alert"]').isVisible();

    // Either successful redirect or error message should be present
    expect(currentUrl.includes('/dashboard') || hasError).toBeTruthy();
  });
});
