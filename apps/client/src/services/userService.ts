import { type User } from '../components/users/UserTable';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'technician';
  password: string;
  worksiteIds: string[];
  isActive: boolean;
}

export interface UpdateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'technician';
  password?: string;
  worksiteIds: string[];
  isActive: boolean;
}

export interface Worksite {
  id: string;
  name: string;
}

class UserService {
  private baseUrl = '/api/users';

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getUsers(): Promise<User[]> {
    const response = await this.request<{ data: User[] }>('');
    return response.data;
  }

  async getUserById(id: string): Promise<User> {
    const response = await this.request<{ data: User }>(`/${id}`);
    return response.data;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const response = await this.request<{ data: User }>('', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.data;
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    const response = await this.request<{ data: User }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.request<void>(`/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
    const response = await this.request<{ data: User }>(`/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return response.data;
  }

  async assignWorksites(id: string, worksiteIds: string[]): Promise<User> {
    const response = await this.request<{ data: User }>(`/${id}/worksites`, {
      method: 'PATCH',
      body: JSON.stringify({ worksiteIds }),
    });
    return response.data;
  }

  async getWorksites(): Promise<Worksite[]> {
    const response = await this.request<{ data: Worksite[] }>('/worksites');
    return response.data;
  }
}

export const userService = new UserService();