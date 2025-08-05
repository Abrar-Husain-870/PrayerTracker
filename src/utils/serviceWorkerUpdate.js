// Service Worker Update Manager
// Handles automatic detection and user-friendly prompts for app updates

class ServiceWorkerUpdateManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
    this.onUpdateAvailable = null;
    this.onUpdateReady = null;
  }

  // Initialize the update manager
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered successfully:', this.registration);

      // Set up update detection
      this.setupUpdateDetection();
      
      // Check for updates immediately
      this.checkForUpdates();
      
      // Check for updates every 30 seconds when app is active
      setInterval(() => {
        if (document.visibilityState === 'visible') {
          this.checkForUpdates();
        }
      }, 30000);

    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }

  // Set up event listeners for update detection
  setupUpdateDetection() {
    if (!this.registration) return;

    // Listen for new service worker installation
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            this.updateAvailable = true;
            console.log('New app version available!');
            
            if (this.onUpdateAvailable) {
              this.onUpdateAvailable();
            }
          }
        }
      });
    });

    // Listen for service worker controller change (update activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New service worker activated, reloading...');
      if (this.onUpdateReady) {
        this.onUpdateReady();
      } else {
        // Fallback: reload automatically
        window.location.reload();
      }
    });
  }

  // Manually check for updates
  async checkForUpdates() {
    if (!this.registration) return;
    
    try {
      await this.registration.update();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  // Apply the pending update
  applyUpdate() {
    if (!this.registration || !this.registration.waiting) {
      console.log('No update waiting');
      return;
    }

    // Tell the waiting service worker to skip waiting and become active
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Force refresh by clearing cache and reloading
  async forceRefresh() {
    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (let name of cacheNames) {
          await caches.delete(name);
        }
      }

      // Clear localStorage and sessionStorage (optional)
      // localStorage.clear();
      // sessionStorage.clear();

      // Force reload
      window.location.reload(true);
    } catch (error) {
      console.error('Force refresh failed:', error);
      // Fallback: simple reload
      window.location.reload();
    }
  }

  // Set callback for when update is available
  setOnUpdateAvailable(callback) {
    this.onUpdateAvailable = callback;
  }

  // Set callback for when update is ready to be applied
  setOnUpdateReady(callback) {
    this.onUpdateReady = callback;
  }
}

// Create singleton instance
const updateManager = new ServiceWorkerUpdateManager();

export default updateManager;
