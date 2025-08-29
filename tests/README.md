# Testing Guide

This project includes comprehensive testing at multiple levels:

## Test Types

### 1. Unit Tests

- **Location**: `apps/server/src/test/` and
  `apps/client/src/components/**/*.test.tsx`
- **Framework**: Vitest
- **Purpose**: Test individual functions, components, and modules in isolation

#### Server Unit Tests

```bash
npm run test -w apps/server
```

#### Client Unit Tests

```bash
npm run test -w apps/client
```

### 2. Integration Tests

- **Location**: `apps/server/src/test/integration/`
- **Framework**: Vitest + Supertest
- **Purpose**: Test API endpoints with authentication and database interactions

```bash
npm run test -w apps/server -- src/test/integration/
```

### 3. End-to-End Tests

- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Purpose**: Test complete user workflows across the entire application

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## E2E Test Structure

### Test Categories

1. **Authentication** (`auth.spec.ts`)
   - Login/logout workflows
   - Form validation
   - Password visibility toggle
   - Registration flow

2. **Dashboard** (`dashboard.spec.ts`)
   - Main navigation
   - Responsive design
   - User menu interactions

3. **Forms Management** (`forms.spec.ts`)
   - CRUD operations
   - Filtering and search
   - Pagination

4. **Workflows** (`workflow.spec.ts`)
   - Complete user journeys
   - Multi-step processes
   - Cross-page interactions

5. **Accessibility** (`accessibility.spec.ts`)
   - Keyboard navigation
   - Screen reader compatibility
   - ARIA attributes
   - Color contrast

6. **Performance** (`performance.spec.ts`)
   - Page load times
   - Core Web Vitals
   - API response times
   - Image optimization

### Helper Classes

- **AuthHelper** (`helpers/auth.ts`): Streamlines login/logout operations
- **TestData**: Provides consistent test data across specs

## Test Environment Setup

### Prerequisites

1. MongoDB running locally (for integration/E2E tests)
2. Node.js 18+
3. Playwright browsers installed

### Environment Variables

```bash
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/chryso-forms-test
JWT_SECRET=test-jwt-secret-key
JWT_REFRESH_SECRET=test-jwt-refresh-secret-key
```

### Database Setup

E2E tests automatically:

- Clean the test database before running
- Seed necessary test data (users, worksites)
- Use isolated test database (`chryso-forms-e2e`)

## Running Tests

### All Tests

```bash
npm run test:all
```

### Individual Test Suites

```bash
# Server tests only
npm run test -w apps/server

# Client tests only
npm run test -w apps/client

# E2E tests only
npm run test:e2e
```

### Specific Test Files

```bash
# Single E2E spec
npx playwright test auth.spec.ts

# Single integration test
npm run test -w apps/server -- users.integration.test.ts
```

## CI/CD Integration

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main`

The CI pipeline includes:

1. Unit tests (Node 18.x and 20.x)
2. Integration tests
3. E2E tests
4. Linting
5. Build verification

## Test Data Management

### E2E Test Users

- **Admin**: `admin@example.com` / `admin123`
- **Manager**: `manager@example.com` / `manager123`
- **Technician**: `tech@example.com` / `tech123`

### Test Database

- Automatically cleaned before each test run
- Seeded with consistent test data
- Isolated from development/production data

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Tests clean up after themselves
3. **Reliability**: Use proper waits and assertions
4. **Maintainability**: Use helper functions and page objects
5. **Documentation**: Comment complex test scenarios

## Debugging Tests

### Playwright Debug Mode

```bash
npm run test:e2e:debug
```

### View Test Reports

```bash
npx playwright show-report
```

### Screenshots and Videos

Failed tests automatically capture:

- Screenshots
- Videos
- Network traces
- Console logs

## Writing New Tests

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    const auth = new AuthHelper(page);
    await auth.loginAsAdmin();
  });

  test('should do something', async ({ page }) => {
    await page.goto('/feature');
    await expect(page.getByText('Expected Text')).toBeVisible();
  });
});
```

### Component Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```
