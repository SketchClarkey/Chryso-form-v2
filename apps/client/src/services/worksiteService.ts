import { type Worksite } from '../components/worksites/WorksiteTable';

export interface CreateWorksiteData {
  name: string;
  customerName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contacts: Array<{
    name: string;
    position?: string;
    phone?: string;
    email?: string;
    isPrimary: boolean;
  }>;
  equipment: Array<{
    id: string;
    type: 'pump' | 'tank' | 'dispenser' | 'pulseMeter';
    model?: string;
    serialNumber?: string;
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs-repair';
    lastServiceDate?: string;
    notes?: string;
  }>;
  isActive: boolean;
}

export interface UpdateWorksiteData extends CreateWorksiteData {}

class WorksiteService {
  private baseUrl = '/api/worksites';

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

  async getWorksites(): Promise<Worksite[]> {
    const response = await this.request<{ data: Worksite[] }>('');
    return response.data;
  }

  async getWorksiteById(id: string): Promise<Worksite> {
    const response = await this.request<{ data: Worksite }>(`/${id}`);
    return response.data;
  }

  async createWorksite(worksiteData: CreateWorksiteData): Promise<Worksite> {
    const response = await this.request<{ data: Worksite }>('', {
      method: 'POST',
      body: JSON.stringify(worksiteData),
    });
    return response.data;
  }

  async updateWorksite(id: string, worksiteData: UpdateWorksiteData): Promise<Worksite> {
    const response = await this.request<{ data: Worksite }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(worksiteData),
    });
    return response.data;
  }

  async deleteWorksite(id: string): Promise<void> {
    await this.request<void>(`/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleWorksiteStatus(id: string, isActive: boolean): Promise<Worksite> {
    const response = await this.request<{ data: Worksite }>(`/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return response.data;
  }

  async addEquipment(worksiteId: string, equipment: any): Promise<Worksite> {
    const response = await this.request<{ data: Worksite }>(`/${worksiteId}/equipment`, {
      method: 'POST',
      body: JSON.stringify(equipment),
    });
    return response.data;
  }

  async updateEquipment(
    worksiteId: string,
    equipmentId: string,
    equipment: any
  ): Promise<Worksite> {
    const response = await this.request<{ data: Worksite }>(
      `/${worksiteId}/equipment/${equipmentId}`,
      {
        method: 'PUT',
        body: JSON.stringify(equipment),
      }
    );
    return response.data;
  }

  async removeEquipment(worksiteId: string, equipmentId: string): Promise<Worksite> {
    const response = await this.request<{ data: Worksite }>(
      `/${worksiteId}/equipment/${equipmentId}`,
      {
        method: 'DELETE',
      }
    );
    return response.data;
  }
}

export const worksiteService = new WorksiteService();
