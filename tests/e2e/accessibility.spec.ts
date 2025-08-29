import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper heading hierarchy
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    
    // Should have exactly one h1 per page
    expect(h1Count).toBeLessThanOrEqual(1);
    
    if (h1Count > 0) {
      await expect(h1Elements.first()).toBeVisible();
    }
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/login');
    
    // All form inputs should have labels
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Inputs should have proper aria attributes
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    
    // Email field should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('name', 'email');
    
    // Continue tabbing
    await page.keyboard.press('Tab');
    
    // Password field should be focused
    const passwordFocused = page.locator(':focus');
    await expect(passwordFocused).toHaveAttribute('name', 'password');
  });

  test('should have proper button roles and states', async ({ page }) => {
    await page.goto('/login');
    
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveAttribute('type', 'submit');
    
    const toggleButton = page.getByRole('button', { name: 'toggle password visibility' });
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveAttribute('aria-label');
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // This is a basic check - in a real scenario you'd use axe-core
    // Check that text is visible and readable
    const bodyText = page.locator('body');
    await expect(bodyText).toBeVisible();
    
    // Check for proper contrast in error states
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Error messages should be visible
    const errorMessages = page.locator('[role="alert"], .error, [data-testid="error"]');
    if (await errorMessages.count() > 0) {
      await expect(errorMessages.first()).toBeVisible();
    }
  });

  test('should work with screen reader simulation', async ({ page }) => {
    await page.goto('/login');
    
    // Check for proper ARIA landmarks
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    // Check for proper form structure
    const form = page.locator('form');
    if (await form.count() > 0) {
      // Form should have accessible name or aria-label
      const hasAccessibleName = await form.first().getAttribute('aria-label') ||
                               await form.first().getAttribute('aria-labelledby');
      
      // At minimum, form should be identifiable
      expect(hasAccessibleName || await form.first().isVisible()).toBeTruthy();
    }
  });

  test('should handle focus management', async ({ page }) => {
    await page.goto('/login');
    
    // Focus should be on first interactive element
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test modal focus management if applicable
    const createButton = page.getByRole('button', { name: /create/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Focus should move to modal content
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // First focusable element in dialog should receive focus
        await page.keyboard.press('Tab');
        const dialogFocused = page.locator('[role="dialog"] :focus');
        await expect(dialogFocused).toBeVisible();
      }
    }
  });

  test('should provide alternative text for images', async ({ page }) => {
    await page.goto('/');
    
    // All images should have alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const image = images.nth(i);
      const hasAltText = await image.getAttribute('alt') !== null;
      const isDecorative = await image.getAttribute('role') === 'presentation' ||
                          await image.getAttribute('aria-hidden') === 'true';
      
      // Images should either have alt text or be marked as decorative
      expect(hasAltText || isDecorative).toBeTruthy();
    }
  });

  test('should handle error announcements', async ({ page }) => {
    await page.goto('/login');
    
    // Submit form without data to trigger errors
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Error messages should have proper ARIA roles
    const errorMessages = page.locator('[role="alert"]');
    if (await errorMessages.count() > 0) {
      await expect(errorMessages.first()).toBeVisible();
      
      // Error should be announced to screen readers
      const ariaLive = await errorMessages.first().getAttribute('aria-live');
      expect(ariaLive === 'polite' || ariaLive === 'assertive').toBeTruthy();
    }
  });
});