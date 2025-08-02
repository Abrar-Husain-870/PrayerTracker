// PWA utilities to generate manifest and handle installation

export const generateManifestBlob = () => {
  const manifest = {
    "short_name": "Namaaz Tracker",
    "name": "Jamā'ah Journal - Namaaz Tracker",
    "description": "Track your daily Namaaz habits and build spiritual discipline with prayer tracking, progress analytics, and community features.",
    "icons": [
      {
        "src": "/android-chrome-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": "/android-chrome-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "maskable"
      },
      {
        "src": "/android-chrome-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": "/android-chrome-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "maskable"
      }
    ],
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#0ea5e9",
    "background_color": "#ffffff",
    "orientation": "any",
    "scope": "/",
    "categories": ["lifestyle", "productivity", "health"],
    "lang": "en",
    "dir": "ltr",
    "prefer_related_applications": false
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json'
  });
  
  return URL.createObjectURL(blob);
};

export const injectDynamicManifest = () => {
  // Remove existing manifest link
  const existingManifest = document.querySelector('link[rel="manifest"]');
  if (existingManifest) {
    existingManifest.remove();
  }

  // Create new manifest link with blob URL
  const manifestUrl = generateManifestBlob();
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = manifestUrl;
  document.head.appendChild(manifestLink);

  console.log('PWA Utils: Dynamic manifest injected:', manifestUrl);
  return manifestUrl;
};

export const checkPWAInstallability = () => {
  const checks = {
    https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    serviceWorker: 'serviceWorker' in navigator,
    manifest: !!document.querySelector('link[rel="manifest"]'),
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    userAgent: navigator.userAgent
  };

  console.log('PWA Installability Check:', checks);
  return checks;
};
