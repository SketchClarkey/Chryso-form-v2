export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: 'system' | 'form' | 'user' | 'worksite' | 'equipment';
  userId?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'form' | 'worksite' | 'user' | 'equipment';
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  isPersistent: boolean;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    formStatusChanges: boolean;
    formAssignments: boolean;
    equipmentAlerts: boolean;
    systemUpdates: boolean;
  };
  push: {
    enabled: boolean;
    formStatusChanges: boolean;
    formAssignments: boolean;
    equipmentAlerts: boolean;
    urgentOnly: boolean;
  };
  inApp: {
    enabled: boolean;
    showDesktopNotifications: boolean;
    playSound: boolean;
    autoMarkAsRead: boolean;
  };
}

class NotificationService {
  private baseUrl = '/api/notifications';
  private eventSource: EventSource | null = null;
  private listeners: Array<(notification: Notification) => void> = [];

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

  // Real-time notifications with Server-Sent Events
  startListening(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    this.eventSource = new EventSource(`${this.baseUrl}/stream?token=${token}`);

    this.eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        this.handleIncomingNotification(notification);
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('Notification stream error:', error);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.startListening();
        }
      }, 5000);
    };
  }

  stopListening(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private handleIncomingNotification(notification: Notification): void {
    // Show browser notification if enabled
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      this.showBrowserNotification(notification);
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Notification listener error:', error);
      }
    });
  }

  private showBrowserNotification(notification: Notification): void {
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
      });
    }
  }

  // API Methods
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    category?: string;
    priority?: NotificationPriority;
  }): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');
    if (params?.category) searchParams.set('category', params.category);
    if (params?.priority) searchParams.set('priority', params.priority);

    const response = await this.request<{
      data: {
        notifications: Notification[];
        total: number;
        unreadCount: number;
      }
    }>(`?${searchParams.toString()}`);
    
    return response.data;
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    await this.request<void>('/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  }

  async markAllAsRead(): Promise<void> {
    await this.request<void>('/mark-all-read', {
      method: 'POST',
    });
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.request<void>(`/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async deleteAllRead(): Promise<void> {
    await this.request<void>('/delete-read', {
      method: 'DELETE',
    });
  }

  async getSettings(): Promise<NotificationSettings> {
    const response = await this.request<{ data: NotificationSettings }>('/settings');
    return response.data;
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await this.request<{ data: NotificationSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return response.data;
  }

  async createNotification(notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<Notification> {
    const response = await this.request<{ data: Notification }>('', {
      method: 'POST',
      body: JSON.stringify(notification),
    });
    return response.data;
  }

  // Utility methods for creating specific notification types
  async notifyFormStatusChange(
    formId: string,
    status: string,
    assignedUserId: string,
    formTitle: string
  ): Promise<void> {
    await this.createNotification({
      type: 'info',
      title: 'Form Status Updated',
      message: `Form "${formTitle}" has been ${status}`,
      priority: status === 'rejected' ? 'high' : 'medium',
      category: 'form',
      userId: assignedUserId,
      relatedEntityId: formId,
      relatedEntityType: 'form',
      actionUrl: `/forms/${formId}`,
      actionLabel: 'View Form',
      isPersistent: true,
    });
  }

  async notifyFormAssignment(
    formId: string,
    assignedUserId: string,
    assignedBy: string,
    formTitle: string
  ): Promise<void> {
    await this.createNotification({
      type: 'info',
      title: 'New Form Assignment',
      message: `You have been assigned to form "${formTitle}" by ${assignedBy}`,
      priority: 'medium',
      category: 'form',
      userId: assignedUserId,
      relatedEntityId: formId,
      relatedEntityType: 'form',
      actionUrl: `/forms/${formId}`,
      actionLabel: 'Start Working',
      isPersistent: true,
    });
  }

  async notifyEquipmentAlert(
    equipmentId: string,
    worksiteId: string,
    alertType: string,
    message: string,
    assignedUserIds: string[]
  ): Promise<void> {
    const notifications = assignedUserIds.map(userId => 
      this.createNotification({
        type: 'warning',
        title: 'Equipment Alert',
        message,
        priority: alertType === 'critical' ? 'urgent' : 'high',
        category: 'equipment',
        userId,
        relatedEntityId: equipmentId,
        relatedEntityType: 'equipment',
        actionUrl: `/worksites/${worksiteId}`,
        actionLabel: 'View Equipment',
        isPersistent: true,
      })
    );

    await Promise.all(notifications);
  }

  async notifySystemUpdate(
    title: string,
    message: string,
    targetUserIds?: string[]
  ): Promise<void> {
    const notification = {
      type: 'info' as const,
      title,
      message,
      priority: 'medium' as const,
      category: 'system' as const,
      isPersistent: true,
    };

    if (targetUserIds) {
      const notifications = targetUserIds.map(userId =>
        this.createNotification({ ...notification, userId })
      );
      await Promise.all(notifications);
    } else {
      // Broadcast to all users
      await this.createNotification(notification);
    }
  }

  // Request browser notification permission
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Browser notifications are not supported');
    }

    return await Notification.requestPermission();
  }
}

export const notificationService = new NotificationService();