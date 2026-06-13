#!/usr/bin/env node

// Utility to retrieve the current cache buster hash from manifest.json
// Usage: node scripts/get-cache-buster.js [--json]

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'dist', 'manifest.json');

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const cacheBuster = manifest.cacheBuster;

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ cacheBuster }));
  } else {
    console.log(cacheBuster);
  }

  process.exit(0);
} catch (err) {
  console.error('Error reading cache buster:', err.message);
  process.exit(1);
}
