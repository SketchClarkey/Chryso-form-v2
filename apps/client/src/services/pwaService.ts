// Extend ServiceWorkerRegistration to include sync (experimental API)
interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
  };
}

// PWA Service for managing offline functionality and service worker
class PWAService {
  private static instance: PWAService;
  private serviceWorker: ServiceWorker | null = null;
  private isOnline = navigator.onLine;
  private onlineStatusCallbacks: Array<(isOnline: boolean) => void> = [];
  private syncCallbacks: Array<(data: any) => void> = [];
  private updateAvailableCallbacks: Array<() => void> = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  // Initialize PWA functionality
  private initialize(): void {
    // Register service worker
    this.registerServiceWorker();

    // Setup online/offline listeners
    this.setupOnlineStatusListeners();

    // Setup background sync
    this.setupBackgroundSync();

    // Setup beforeinstallprompt handler
    this.setupInstallPrompt();

    console.log('PWA Service initialized');
  }

  // Register the service worker
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('Service Worker registered successfully:', registration);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker installed, update available');
                this.notifyUpdateAvailable();
              }
            });
          }
        });

        // Get active service worker
        this.serviceWorker = registration.active;

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
          this.handleServiceWorkerMessage(event.data);
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Setup online/offline status listeners
  private setupOnlineStatusListeners(): void {
    window.addEventListener('online', () => {
      console.log('App is back online');
      this.isOnline = true;
      this.notifyOnlineStatusChange(true);
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('App went offline');
      this.isOnline = false;
      this.notifyOnlineStatusChange(false);
    });
  }

  // Setup background sync
  private setupBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready
        .then((registration: ExtendedServiceWorkerRegistration) => {
          return registration.sync?.register('chryso-forms-sync');
        })
        .catch(error => {
          console.log('Background sync not supported or registration failed:', error);
        });
    }
  }

  // Setup install prompt handling
  private setupInstallPrompt(): void {
    let deferredPrompt: any = null;

    window.addEventListener('beforeinstallprompt', event => {
      console.log('Install prompt available');
      event.preventDefault();
      deferredPrompt = event;

      // Show custom install prompt
      this.showInstallPrompt(deferredPrompt);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      deferredPrompt = null;

      // Track installation
      this.trackPWAInstall();
    });
  }

  // Handle messages from service worker
  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'SYNC_SUCCESS':
        console.log('Background sync completed for:', data.url);
        this.notifySyncComplete(data);
        break;

      case 'CACHE_UPDATED':
        console.log('Cache updated:', data.cacheName);
        break;

      default:
        console.log('Unknown service worker message:', data);
    }
  }

  // Show install prompt
  private showInstallPrompt(deferredPrompt: any): void {
    // Create custom install banner
    const installBanner = document.createElement('div');
    installBanner.id = 'pwa-install-banner';
    installBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1976d2;
      color: white;
      padding: 12px 16px;
      z-index: 10000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    installBanner.innerHTML = `
      <div>
        <strong>Install Chryso Forms</strong><br>
        <small>Get the full app experience with offline access</small>
      </div>
      <div>
        <button id="pwa-install-btn" style="
          background: white; 
          color: #1976d2; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 4px; 
          cursor: pointer;
          margin-right: 8px;
        ">Install</button>
        <button id="pwa-dismiss-btn" style="
          background: transparent; 
          color: white; 
          border: 1px solid white; 
          padding: 8px 16px; 
          border-radius: 4px; 
          cursor: pointer;
        ">Maybe Later</button>
      </div>
    `;

    document.body.appendChild(installBanner);

    // Handle install button click
    document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('User chose to:', outcome);
        deferredPrompt = null;
      }
      installBanner.remove();
    });

    // Handle dismiss button click
    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      installBanner.remove();

      // Don't show again for this session
      sessionStorage.setItem('pwa-install-dismissed', 'true');
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (document.body.contains(installBanner)) {
        installBanner.remove();
      }
    }, 10000);
  }

  // Track PWA installation
  private trackPWAInstall(): void {
    // Analytics tracking would go here
    console.log('PWA installation tracked');

    // Store install date
    localStorage.setItem('pwa-installed', new Date().toISOString());
  }

  // Public methods

  // Check if app is online
  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Get connection info for mobile optimization
  public getConnectionInfo(): {
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return {};
  }

  // Check if device has good connection for heavy operations
  public hasGoodConnection(): boolean {
    const connection = this.getConnectionInfo();

    // If data saver is enabled, consider as poor connection
    if (connection.saveData) return false;

    // Check effective connection type
    if (connection.effectiveType) {
      return ['4g'].includes(connection.effectiveType);
    }

    // Check downlink speed (Mbps)
    if (connection.downlink !== undefined) {
      return connection.downlink > 1.5; // > 1.5 Mbps considered good
    }

    // Default to true if we can't determine
    return this.isOnline;
  }

  // Subscribe to online status changes
  public onOnlineStatusChange(callback: (isOnline: boolean) => void): void {
    this.onlineStatusCallbacks.push(callback);
  }

  // Subscribe to sync completion
  public onSyncComplete(callback: (data: any) => void): void {
    this.syncCallbacks.push(callback);
  }

  // Subscribe to update available
  public onUpdateAvailable(callback: () => void): void {
    this.updateAvailableCallbacks.push(callback);
  }

  // Manually trigger sync
  public async triggerSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = (await navigator.serviceWorker
          .ready) as ExtendedServiceWorkerRegistration;
        await registration.sync?.register('chryso-forms-sync');
        console.log('Background sync triggered');
      } catch (error) {
        console.error('Failed to trigger sync:', error);
      }
    }
  }

  // Get cache information
  public async getCacheInfo(): Promise<{ size: number; count: number }> {
    return new Promise(resolve => {
      if (this.serviceWorker) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = event => {
          resolve({
            size: event.data.cacheSize || 0,
            count: event.data.cacheCount || 0,
          });
        };

        this.serviceWorker.postMessage({ type: 'GET_CACHE_SIZE' }, [messageChannel.port2]);
      } else {
        resolve({ size: 0, count: 0 });
      }
    });
  }

  // Clear all caches
  public async clearCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      console.log('All caches cleared');
    }
  }

  // Update service worker
  public async updateServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        registration.update();

        // Skip waiting for new service worker
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  }

  // Check if PWA is installed
  public isPWAInstalled(): boolean {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = localStorage.getItem('pwa-installed') !== null;

    return isStandalone || isInstalled;
  }

  // Mobile device detection
  public isMobileDevice(): boolean {
    return (
      window.matchMedia('(max-width: 768px)').matches ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }

  // Get device orientation
  public getOrientation(): 'portrait' | 'landscape' {
    return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
  }

  // Subscribe to orientation changes
  public onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void {
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    const handler = () => callback(mediaQuery.matches ? 'portrait' : 'landscape');
    mediaQuery.addEventListener('change', handler);
  }

  // Enable/disable screen wake lock (keep screen on)
  public async requestWakeLock(): Promise<WakeLockSentinel | null> {
    if ('wakeLock' in navigator) {
      try {
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Screen wake lock acquired');
        return wakeLock;
      } catch (error) {
        console.error('Failed to acquire wake lock:', error);
      }
    }
    return null;
  }

  // Vibrate device (mobile feedback)
  public vibrate(pattern: number | number[]): boolean {
    if ('vibrate' in navigator) {
      return navigator.vibrate(pattern);
    }
    return false;
  }

  // Share content using Web Share API
  public async share(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
    if ('share' in navigator) {
      try {
        await (navigator as any).share(data);
        return true;
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
    return false;
  }

  // Store data for offline use
  public async storeOfflineData(key: string, data: any, type: string = 'general'): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');

      await new Promise((resolve, reject) => {
        const request = store.put({
          key,
          data,
          type,
          lastUpdated: new Date().toISOString(),
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      console.log('Offline data stored:', key);
    } catch (error) {
      console.error('Failed to store offline data:', error);
    }
  }

  // Retrieve offline data
  public async getOfflineData(key: string): Promise<any> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');

      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }

  // Get all offline data by type
  public async getOfflineDataByType(type: string): Promise<any[]> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const index = store.index('type');

      return new Promise((resolve, reject) => {
        const request = index.getAll(type);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get offline data by type:', error);
      return [];
    }
  }

  // Private helper methods

  private notifyOnlineStatusChange(isOnline: boolean): void {
    this.onlineStatusCallbacks.forEach(callback => callback(isOnline));
  }

  private notifySyncComplete(data: any): void {
    this.syncCallbacks.forEach(callback => callback(data));
  }

  private notifyUpdateAvailable(): void {
    this.updateAvailableCallbacks.forEach(callback => callback());
  }

  private async syncOfflineData(): Promise<void> {
    console.log('Syncing offline data...');
    await this.triggerSync();
  }

  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChrysoPWADB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'key' });
          store.createIndex('type', 'type');
          store.createIndex('lastUpdated', 'lastUpdated');
        }

        if (!db.objectStoreNames.contains('pendingRequests')) {
          const store = db.createObjectStore('pendingRequests', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }
}

export default PWAService;
