import { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string = 'admin@example.com', password: string = 'admin123') {
    await this.page.goto('/login');
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for potential redirect
    await this.page.waitForTimeout(2000);

    // Return whether login was successful
    return !this.page.url().includes('/login');
  }

  async loginAsAdmin() {
    return this.login('admin@example.com', 'admin123');
  }

  async loginAsManager() {
    return this.login('manager@example.com', 'manager123');
  }

  async loginAsTechnician() {
    return this.login('tech@example.com', 'tech123');
  }

  async logout() {
    // Look for user menu or logout button
    const userMenu = this.page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await this.page.getByText('Logout').click();
    } else {
      // Try direct logout button
      const logoutButton = this.page.getByRole('button', { name: 'Logout' });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        // Navigate to logout endpoint
        await this.page.goto('/logout');
      }
    }

    await this.page.waitForTimeout(1000);
  }

  async ensureLoggedIn(email?: string, password?: string) {
    // Check if already logged in
    const isLoginPage = this.page.url().includes('/login');
    const isDashboard = this.page.url().includes('/dashboard');

    if (!isLoginPage && !isDashboard) {
      // Try to access a protected route to check auth status
      await this.page.goto('/dashboard');
      await this.page.waitForTimeout(1000);
    }

    // If redirected to login, perform login
    if (this.page.url().includes('/login')) {
      await this.login(email, password);
    }
  }
}

export class TestData {
  static readonly USERS = {
    ADMIN: {
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
    },
    MANAGER: {
      email: 'manager@example.com',
      password: 'manager123',
      role: 'manager',
    },
    TECHNICIAN: {
      email: 'tech@example.com',
      password: 'tech123',
      role: 'technician',
    },
  };

  static readonly FORMS = {
    SAMPLE_FORM: {
      title: 'Sample Test Form',
      description: 'A form for testing purposes',
    },
    CHEMICAL_FORM: {
      title: 'Chemical Treatment Form',
      description: 'Form for recording chemical treatments',
    },
  };

  static readonly WORKSITES = {
    MAIN_SITE: {
      name: 'Main Test Site',
      address: '123 Test Street, Test City',
    },
    SECONDARY_SITE: {
      name: 'Secondary Test Site',
      address: '456 Test Avenue, Test Town',
    },
  };
}
