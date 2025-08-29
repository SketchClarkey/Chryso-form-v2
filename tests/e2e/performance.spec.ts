import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should load home page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for main content to be visible
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should load login page quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login');

    // Wait for form to be visible
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Login page should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check for performance metrics using Performance Observer API
    const performanceMetrics = await page.evaluate(() => {
      return new Promise(resolve => {
        const metrics: Record<string, number> = {};

        // Get FCP (First Contentful Paint)
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'paint') {
              metrics[entry.name] = entry.startTime;
            }
          });

          if (metrics['first-contentful-paint']) {
            resolve(metrics);
          }
        });

        observer.observe({ entryTypes: ['paint'] });

        // Fallback timeout
        setTimeout(() => resolve(metrics), 2000);
      });
    });

    if (performanceMetrics && typeof performanceMetrics === 'object') {
      const fcp = (performanceMetrics as Record<string, number>)['first-contentful-paint'];
      if (fcp) {
        // FCP should be under 1.8 seconds (good threshold)
        expect(fcp).toBeLessThan(1800);
      }
    }
  });

  test('should handle large data sets efficiently', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(2000);

    // Navigate to a page that might have lots of data
    await page.goto('/forms');

    const startTime = Date.now();

    // Wait for content to load
    await page.waitForSelector('table, [data-testid="forms-container"]', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load data within reasonable time even with large datasets
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have efficient image loading', async ({ page }) => {
    await page.goto('/');

    // Check for image optimization
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const image = images.nth(i);

        // Wait for image to load
        await image.waitFor({ state: 'visible' });

        // Check if images have loading attributes for optimization
        const loading = await image.getAttribute('loading');
        const hasOptimization =
          loading === 'lazy' || (await image.getAttribute('decoding')) === 'async';

        // At least some images should be optimized
        if (i === 0) {
          // First image might not be lazy loaded
          continue;
        } else {
          expect(hasOptimization).toBeTruthy();
        }
      }
    }
  });

  test('should minimize JavaScript bundle size impact', async ({ page }) => {
    // Start measuring from navigation
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check that page is interactive quickly
    const startTime = Date.now();

    // Wait for interactive elements to be available
    await page.waitForFunction(
      () => {
        const buttons = document.querySelectorAll('button');
        const links = document.querySelectorAll('a');
        return buttons.length > 0 || links.length > 0;
      },
      { timeout: 3000 }
    );

    const interactiveTime = Date.now() - startTime;

    // Page should become interactive within 3 seconds
    expect(interactiveTime).toBeLessThan(3000);
  });

  test('should handle navigation efficiently', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(2000);

    // Test navigation performance
    const pages = ['/dashboard', '/forms', '/templates', '/reports'];

    for (const pagePath of pages) {
      const startTime = Date.now();

      await page.goto(pagePath);

      // Wait for page content
      await page.waitForSelector('main, [role="main"]', { timeout: 5000 });

      const loadTime = Date.now() - startTime;

      // Each page should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    }
  });

  test('should handle API requests efficiently', async ({ page }) => {
    // Monitor network requests
    const apiRequests: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now(),
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const request = apiRequests.find(req => req.url === response.url());
        if (request) {
          request.responseTime = Date.now() - request.timestamp;
          request.status = response.status();
        }
      }
    });

    // Navigate to a page that makes API calls
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    // Check API response times
    const slowRequests = apiRequests.filter(req => req.responseTime > 2000);

    // Most API requests should be under 2 seconds
    expect(slowRequests.length).toBeLessThan(apiRequests.length * 0.2);
  });
});
