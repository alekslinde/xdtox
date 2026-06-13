#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;
const root = path.join(__dirname, '..');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = path.normalize(parsedUrl.pathname);

  // Remove leading slash and resolve path
  if (pathname === '/') pathname = '/demo/index.html';
  let filePath = path.join(root, pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Try to serve the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      }
    } else {
      const ext = path.extname(filePath);
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content);
    }
  });
});

let attemptedPort = PORT;
let maxAttempts = 10;

function startServer(port, attempts = 0) {
  server.listen(port, () => {
    console.log(`\n🚀 Server running at http://localhost:${port}`);
    console.log(`📸 Screenshots: http://localhost:${port}/demo.html\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
      console.log(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
      attemptedPort = port + 1;
      startServer(port + 1, attempts + 1);
    } else if (err.code === 'EADDRINUSE') {
      console.error(`✗ Could not find an available port after ${maxAttempts} attempts`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);

process.on('SIGINT', () => {
  console.log('\nServer stopped');
  process.exit(0);
});
