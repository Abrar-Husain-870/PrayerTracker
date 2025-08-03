import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = window.navigator.standalone === true;
    const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches;
    
    console.log('PWA Install Check:', {
      isStandalone,
      isInWebAppiOS,
      isInWebAppChrome,
      userAgent: navigator.userAgent,
      isSecure: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    });
    
    if (isStandalone || isInWebAppiOS || isInWebAppChrome) {
      console.log('App is already installed');
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt after a shorter delay for testing
      setTimeout(() => {
        console.log('Showing install prompt');
        setShowInstallPrompt(true);
      }, 3000); // Show after 3 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('App installed successfully');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // For testing: show install prompt even without beforeinstallprompt event
    // This helps on browsers that don't fully support PWA install prompts
    const testTimer = setTimeout(() => {
      if (!deferredPrompt && !isInstalled) {
        console.log('No beforeinstallprompt event detected, showing manual install info');
        setShowInstallPrompt(true);
      }
    }, 8000); // Show after 8 seconds if no event

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(testTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    // Increment install prompt count in localStorage
    const count = Number(localStorage.getItem('pwa-install-prompt-count') || '0');
    localStorage.setItem('pwa-install-prompt-count', String(count + 1));
  };

  // Limit install popup to first three logins (per browser)
  const installPromptCount = Number(localStorage.getItem('pwa-install-prompt-count') || '0');
  if (isInstalled || sessionStorage.getItem('pwa-prompt-dismissed') || installPromptCount >= 3) {
    return null;
  }

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg">🕌</span>
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">Install Jamā’ah Journal</h3>
            <p className="text-gray-600 text-xs mt-1">
              Get quick access to your prayer tracking with our app!
            </p>
            
            {deferredPrompt ? (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Install
                </button>
                
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-gray-600 text-xs font-medium hover:text-gray-800 transition-colors"
                >
                  Not now
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-gray-600 text-xs mb-2">
                  To install manually:
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Chrome/Edge:</strong> Menu → "Install app" or look for ⊕ in address bar</p>
                  <p><strong>Safari:</strong> Share → "Add to Home Screen"</p>
                  <p><strong>Firefox:</strong> Menu → "Install" (if available)</p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="mt-2 px-3 py-1.5 text-gray-600 text-xs font-medium hover:text-gray-800 transition-colors"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
