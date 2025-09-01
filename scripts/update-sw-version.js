#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate a version string based on current timestamp
function generateVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `v${year}-${month}-${day}-${hour}${minute}`;
}

// Update service worker version
function updateServiceWorkerVersion() {
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  
  if (!fs.existsSync(swPath)) {
    console.error('Service worker file not found:', swPath);
    process.exit(1);
  }
  
  const newVersion = generateVersion();
  console.log(`Updating cache version to: ${newVersion}`);
  
  // Update service worker
  let swContent = fs.readFileSync(swPath, 'utf8');
  swContent = swContent.replace(
    /const CACHE_VERSION = '[^']*';/,
    `const CACHE_VERSION = '${newVersion}';`
  );
  
  fs.writeFileSync(swPath, swContent);
  console.log('✅ Service worker updated');
  
  // Update manifest with version query parameter
  if (fs.existsSync(manifestPath)) {
    let manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // Add version to start_url to force manifest refresh
    manifest.start_url = `/?v=${newVersion}`;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Manifest updated');
  }
  
  console.log(`🚀 Cache version updated to: ${newVersion}`);
  return newVersion;
}

// Run if called directly
if (require.main === module) {
  updateServiceWorkerVersion();
}

module.exports = { updateServiceWorkerVersion, generateVersion };
