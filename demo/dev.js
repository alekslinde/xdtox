#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting development server...\n');

// Start Tailwind in watch mode
const tailwind = spawn('npx', ['tailwindcss', '-i', 'src/styles.css', '-o', 'dist/styles.css', '--watch'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});

// Start HTTP server
const server = spawn('node', [path.join(__dirname, 'server.js')], {
  stdio: 'inherit',
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  tailwind.kill();
  server.kill();
  process.exit(0);
});

tailwind.on('error', (err) => {
  console.error('Tailwind error:', err);
  process.exit(1);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
