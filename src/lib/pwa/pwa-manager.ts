/**
 * PWA Manager - Handles Progressive Web App functionality
 * including service worker registration, update management, and offline capabilities
 */

import { logger } from '@/lib/logger';

const log = logger.child('PWA');

interface PWAState {
  isSupported: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  installing: boolean;
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
}

class PWAManager {
  private registration: ServiceWorkerRegistration | null = null;
  private deferredPrompt: InstallPromptEvent | null = null;
  private updateCheckInterval: number | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.init();
  }

  /**
   * Initialize PWA Manager
   */
  private async init(): Promise<void> {
    if (!this.isSupported()) {
      log.warn('Service Workers not supported');
      return;
    }

    await this.registerServiceWorker();
    this.setupEventListeners();
    this.checkForUpdates();
    this.startUpdateCheckInterval();
  }

  /**
   * Check if PWA features are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'caches' in window &&
      'PushManager' in window
    );
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        {
          scope: '/',
          updateViaCache: 'none',
        }
      );

      log.info('Service Worker registered successfully');

      // Handle service worker state changes
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Check for existing service worker
      if (this.registration.active) {
        log.info('Service Worker is active');
      }

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.emit('controllerchange');
        log.info('New service worker controller');
      });
    } catch (error) {
      log.error('Service Worker registration failed', error);
      throw error;
    }
  }

  /**
   * Handle service worker update found
   */
  private handleUpdateFound(): void {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;

    log.info('New service worker found');
    this.emit('updatefound');

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New update available
          log.info('New update available');
          this.emit('updateavailable');
        } else {
          // First install
          log.info('Content is cached for offline use');
          this.emit('cached');
        }
      }
    });
  }

  /**
   * Setup event listeners for PWA functionality
   */
  private setupEventListeners(): void {
    // Install prompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as InstallPromptEvent;
      log.info('Install prompt deferred');
      this.emit('installprompt');
    });

    // App installed event
    window.addEventListener('appinstalled', () => {
      log.info('App installed successfully');
      this.deferredPrompt = null;
      this.emit('installed');
    });

    // Online/offline status
    window.addEventListener('online', () => {
      log.info('App is online');
      this.emit('online');
    });

    window.addEventListener('offline', () => {
      log.info('App is offline');
      this.emit('offline');
    });

    // Visibility change for background sync
    document['addEventListener']('visibilitychange', () => {
      if (!document['hidden']) {
        this.checkForUpdates();
      }
    });
  }

  /**
   * Prompt user to install PWA
   */
  async promptInstall(): Promise<{
    outcome: 'accepted' | 'dismissed' | 'not-available';
  }> {
    if (!this.deferredPrompt) {
      return { outcome: 'not-available' };
    }

    try {
      await this.deferredPrompt.prompt();
      const result = await this.deferredPrompt.userChoice;

      this.deferredPrompt = null;

      log.info('Install prompt result', { outcome: result.outcome });
      this.emit('installresult', result);

      return result;
    } catch (error) {
      log.error('Install prompt failed', error);
      return { outcome: 'dismissed' };
    }
  }

  /**
   * Check if app can be installed
   */
  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * Check if app is installed
   */
  isInstalled(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  /**
   * Check if app is offline
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Get current PWA state
   */
  getState(): PWAState {
    return {
      isSupported: this.isSupported(),
      isInstalled: this.isInstalled(),
      isOffline: this.isOffline(),
      updateAvailable: this.hasUpdateAvailable(),
      installing: this.canInstall(),
    };
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
      log.info('Checked for updates');
    } catch (error) {
      log.error('Update check failed', error);
    }
  }

  /**
   * Apply pending service worker update
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      log.warn('No update available to apply');
      return;
    }

    try {
      // Tell the waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Wait for the new service worker to control the page
      return new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener(
            'controllerchange',
            handleControllerChange
          );
          resolve();
        };

        navigator.serviceWorker.addEventListener(
          'controllerchange',
          handleControllerChange
        );
      });
    } catch (error) {
      log.error('Failed to apply update', error);
      throw error;
    }
  }

  /**
   * Check if update is available
   */
  hasUpdateAvailable(): boolean {
    return this?.registration?.waiting !== null;
  }

  /**
   * Start periodic update checks
   */
  private startUpdateCheckInterval(): void {
    // Check for updates every 30 minutes
    this.updateCheckInterval = window.setInterval(
      () => {
        this.checkForUpdates();
      },
      30 * 60 * 1000
    );
  }

  /**
   * Stop periodic update checks
   */
  stopUpdateCheckInterval(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      log.warn('Notifications not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    log.info('Notification permission', { permission });

    return permission;
  }

  /**
   * Show notification
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      await this.registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/images/icon.png',
        badge: options.badge || '/images/badge.png',
        tag: options.tag,
        data: options.data,
        actions: options.actions,
        requireInteraction: options.requireInteraction || false,
      });

      log.info('Notification shown', { title: options.title });
    } catch (error) {
      log.error('Failed to show notification', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          (process.env.PUBLIC_VAPID_PUBLIC_KEY as string) || ''
        ),
      });

      log.info('Push subscription created');
      return subscription;
    } catch (error) {
      log.error('Push subscription failed', error);
      return null;
    }
  }

  /**
   * Get current push subscription
   */
  async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null;

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      log.error('Failed to get push subscription', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    const subscription = await this.getPushSubscription();

    if (!subscription) {
      return true;
    }

    try {
      const result = await subscription.unsubscribe();
      log.info('Push unsubscribed', { result });
      return result;
    } catch (error) {
      log.error('Push unsubscribe failed', error);
      return false;
    }
  }

  /**
   * Cache resources for offline use
   */
  async cacheResources(urls: string[]): Promise<void> {
    if (!('caches' in window)) {
      throw new Error('Cache API not supported');
    }

    try {
      const cache = await caches.open('user-cache-v1');
      await cache.addAll(urls);
      log.info('Resources cached', { count: urls.length });
    } catch (error) {
      log.error('Failed to cache resources', error);
      throw error;
    }
  }

  /**
   * Clear cached data
   */
  async clearCache(cacheNames?: string[]): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const names = cacheNames || (await caches.keys());

      await Promise.all(names.map((name) => caches.delete(name)));

      log.info('Cache cleared');
    } catch (error) {
      log.error('Failed to clear cache', error);
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Convert VAPID key for push subscription
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopUpdateCheckInterval();
    this.listeners.clear();
  }
}

// Create and export singleton instance
export const pwaManager = new PWAManager();

// Export types for TypeScript users
export type { PWAState, NotificationOptions, InstallPromptEvent };

// Export class for custom implementations
export { PWAManager };
