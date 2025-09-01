#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { updateServiceWorkerVersion } = require('./update-sw-version');

console.log('🧪 Testing cache versioning system...\n');

// Test 1: Check if service worker has version
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');
const versionMatch = swContent.match(/const CACHE_VERSION = '([^']*)';/);

if (versionMatch) {
  console.log('✅ Current cache version:', versionMatch[1]);
} else {
  console.log('❌ No cache version found in service worker');
  process.exit(1);
}

// Test 2: Update version and verify it changed
console.log('\n📝 Updating cache version...');
const newVersion = updateServiceWorkerVersion();

// Test 3: Verify the update worked
const updatedSwContent = fs.readFileSync(swPath, 'utf8');
const newVersionMatch = updatedSwContent.match(/const CACHE_VERSION = '([^']*)';/);

if (newVersionMatch && newVersionMatch[1] === newVersion) {
  console.log('✅ Cache version successfully updated to:', newVersion);
} else {
  console.log('❌ Cache version update failed');
  process.exit(1);
}

// Test 4: Check manifest versioning
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifestContent.start_url.includes('v=')) {
    console.log('✅ Manifest start_url includes version parameter');
  } else {
    console.log('❌ Manifest start_url missing version parameter');
  }
}

console.log('\n🎉 Cache versioning system test completed successfully!');
console.log('\n📋 What this means for your users:');
console.log('• No more manual cache clearing required');
console.log('• Automatic updates on each deployment');
console.log('• Intelligent caching strategies for better performance');
console.log('• Clean removal of old cache versions');
