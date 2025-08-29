import PWAService from './pwaService';

interface SyncQueueItem {
  id: string;
  type: 'form' | 'attachment' | 'settings';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineForm {
  id: string;
  data: any;
  lastModified: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
}

class OfflineService {
  private static instance: OfflineService;
  private pwaService: PWAService;
  private syncQueue: SyncQueueItem[] = [];
  private isSync: boolean = false;
  private networkStatus: NetworkStatus = { isOnline: navigator.onLine };
  private syncCallbacks: Array<(status: string, progress?: number) => void> = [];

  private constructor() {
    this.pwaService = PWAService.getInstance();
    this.initializeNetworkMonitoring();
    this.loadSyncQueue();
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private initializeNetworkMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      this.onConnectionRestored();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
    });

    // Monitor connection quality if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const updateConnectionInfo = () => {
        this.networkStatus.connectionType = connection.type;
        this.networkStatus.effectiveType = connection.effectiveType;
        this.networkStatus.downlink = connection.downlink;
      };

      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await this.pwaService.getOfflineData('sync_queue');
      if (queueData && Array.isArray(queueData)) {
        this.syncQueue = queueData;
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await this.pwaService.storeOfflineData('sync_queue', this.syncQueue, 'system');
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private onConnectionRestored(): void {
    console.log('Connection restored, attempting sync...');
    this.notifySyncStatus('Connection restored', 0);

    // Wait a moment for connection to stabilize
    setTimeout(() => {
      this.processSync();
    }, 1000);
  }

  private notifySyncStatus(status: string, progress?: number): void {
    this.syncCallbacks.forEach(callback => callback(status, progress));
  }

  // Public Methods

  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  public isOnline(): boolean {
    return this.networkStatus.isOnline;
  }

  public hasGoodConnection(): boolean {
    if (!this.networkStatus.isOnline) return false;

    // Check connection quality
    if (this.networkStatus.effectiveType) {
      return ['4g', '3g'].includes(this.networkStatus.effectiveType);
    }

    return true; // Assume good connection if we can't determine quality
  }

  public onSyncStatusChange(callback: (status: string, progress?: number) => void): void {
    this.syncCallbacks.push(callback);
  }

  public async storeFormOffline(formId: string, formData: any): Promise<void> {
    const offlineForm: OfflineForm = {
      id: formId,
      data: formData,
      lastModified: Date.now(),
      syncStatus: 'pending',
    };

    await this.pwaService.storeOfflineData(`form_${formId}`, offlineForm, 'form');

    // Add to sync queue
    this.addToSyncQueue({
      id: `form_${formId}_${Date.now()}`,
      type: 'form',
      action: formId.startsWith('new_') ? 'create' : 'update',
      data: formData,
      timestamp: Date.now(),
      retryCount: 0,
    });
  }

  public async getOfflineForm(formId: string): Promise<OfflineForm | null> {
    try {
      const offlineForm = await this.pwaService.getOfflineData(`form_${formId}`);
      return offlineForm as OfflineForm;
    } catch (error) {
      console.error('Failed to get offline form:', error);
      return null;
    }
  }

  public async getOfflineForms(): Promise<OfflineForm[]> {
    try {
      const formsData = await this.pwaService.getOfflineDataByType('form');
      return formsData.map(item => item.data as OfflineForm);
    } catch (error) {
      console.error('Failed to get offline forms:', error);
      return [];
    }
  }

  public async storeAttachmentOffline(
    attachmentId: string,
    blob: Blob,
    metadata: any
  ): Promise<void> {
    try {
      // Store blob data
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const attachmentData = {
        id: attachmentId,
        base64Data: base64,
        metadata: {
          ...metadata,
          size: blob.size,
          type: blob.type,
        },
        lastModified: Date.now(),
        syncStatus: 'pending',
      };

      await this.pwaService.storeOfflineData(
        `attachment_${attachmentId}`,
        attachmentData,
        'attachment'
      );

      // Add to sync queue
      this.addToSyncQueue({
        id: `attachment_${attachmentId}_${Date.now()}`,
        type: 'attachment',
        action: 'create',
        data: attachmentData,
        timestamp: Date.now(),
        retryCount: 0,
      });
    } catch (error) {
      console.error('Failed to store attachment offline:', error);
      throw error;
    }
  }

  private addToSyncQueue(item: SyncQueueItem): void {
    this.syncQueue.push(item);
    this.saveSyncQueue();

    // Try immediate sync if online
    if (this.isOnline() && !this.isSync) {
      this.processSync();
    }
  }

  public async processSync(): Promise<void> {
    if (this.isSync || !this.isOnline() || this.syncQueue.length === 0) {
      return;
    }

    this.isSync = true;
    this.notifySyncStatus('Starting sync...', 0);

    try {
      const totalItems = this.syncQueue.length;
      let syncedItems = 0;

      for (let i = this.syncQueue.length - 1; i >= 0; i--) {
        const item = this.syncQueue[i];

        try {
          const success = await this.syncItem(item);

          if (success) {
            // Remove from queue
            this.syncQueue.splice(i, 1);
            syncedItems++;

            const progress = (syncedItems / totalItems) * 100;
            this.notifySyncStatus(`Synced ${syncedItems} of ${totalItems} items`, progress);
          } else {
            // Increment retry count
            item.retryCount++;

            // Remove if too many retries
            if (item.retryCount >= 3) {
              console.warn('Item failed too many times, removing:', item.id);
              this.syncQueue.splice(i, 1);
            }
          }
        } catch (error) {
          console.error('Sync item error:', error);
          item.retryCount++;
        }

        // Small delay between items
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await this.saveSyncQueue();

      if (syncedItems > 0) {
        this.notifySyncStatus(`Sync complete - ${syncedItems} items synced`, 100);
      } else {
        this.notifySyncStatus('No items to sync', 100);
      }
    } catch (error) {
      console.error('Sync process error:', error);
      this.notifySyncStatus('Sync failed', 0);
    } finally {
      this.isSync = false;

      // Clear status after delay
      setTimeout(() => {
        this.notifySyncStatus('', 0);
      }, 3000);
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      switch (item.type) {
        case 'form':
          return await this.syncForm(item);
        case 'attachment':
          return await this.syncAttachment(item);
        default:
          console.warn('Unknown sync item type:', item.type);
          return false;
      }
    } catch (error) {
      console.error('Sync item failed:', item.id, error);
      return false;
    }
  }

  private async syncForm(item: SyncQueueItem): Promise<boolean> {
    const { action, data } = item;

    try {
      const response = await fetch(`/api/forms${action === 'update' ? `/${data.id}` : ''}`, {
        method: action === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Update local stored form to mark as synced
        const formKey = `form_${data.id || data.formId}`;
        const offlineForm = await this.pwaService.getOfflineData(formKey);
        if (offlineForm) {
          offlineForm.syncStatus = 'synced';
          await this.pwaService.storeOfflineData(formKey, offlineForm, 'form');
        }

        return true;
      } else {
        console.error('Form sync failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Form sync error:', error);
      return false;
    }
  }

  private async syncAttachment(item: SyncQueueItem): Promise<boolean> {
    const { data } = item;

    try {
      // Convert base64 back to blob
      const binaryString = atob(data.base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.metadata.type });

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', blob, data.metadata.filename);
      formData.append('metadata', JSON.stringify(data.metadata));

      const response = await fetch('/api/attachments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      return response.ok;
    } catch (error) {
      console.error('Attachment sync error:', error);
      return false;
    }
  }

  public getSyncQueueStatus(): { pending: number; failed: number } {
    const pending = this.syncQueue.filter(item => item.retryCount < 3).length;
    const failed = this.syncQueue.filter(item => item.retryCount >= 3).length;

    return { pending, failed };
  }

  public async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  public async getOfflineStorageInfo(): Promise<{
    size: number;
    formCount: number;
    attachmentCount: number;
  }> {
    try {
      const forms = await this.getOfflineForms();
      const attachmentsData = await this.pwaService.getOfflineDataByType('attachment');
      const cacheInfo = await this.pwaService.getCacheInfo();

      return {
        size: cacheInfo.size,
        formCount: forms.length,
        attachmentCount: attachmentsData.length,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { size: 0, formCount: 0, attachmentCount: 0 };
    }
  }
}

export default OfflineService;
