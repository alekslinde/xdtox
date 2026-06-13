// Build script:
//   1. Bundle src/code.js → code.js  (esbuild, includes helpers.js)
//   2. Compile Tailwind  → dist/styles.css
//   3. Inline CSS        → ui.html   (what Figma loads)
//   4. Generate cache buster hash and update version

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');

// ── 1. Bundle plugin backend ──────────────────────────────────────────────────

esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'code.js')],
  bundle:      true,
  outfile:     path.join(root, 'dist', 'code.js'),
  platform:    'browser',
  target:      'es2017',
  minify:      true,
});
console.log('✓ Bundled dist/code.js');

// ── 2 + 3. Inline CSS into dist/ui.html ──────────────────────────────────────

const html = fs.readFileSync(path.join(root, 'src', 'ui.html'), 'utf-8');
const css  = fs.readFileSync(path.join(root, 'dist', 'styles.css'), 'utf-8');
const code = fs.readFileSync(path.join(root, 'dist', 'code.js'), 'utf-8');

if (!html.includes('/* INLINE_CSS */')) {
  console.error('ERROR: placeholder /* INLINE_CSS */ not found in src/ui.html');
  process.exit(1);
}

// ── 4. Generate cache buster hash ─────────────────────────────────────────────

const hashInput = code + css;
const cacheBuster = crypto
  .createHash('sha256')
  .update(hashInput)
  .digest('hex')
  .substring(0, 8);

const output = html.replace('/* INLINE_CSS */', css);
fs.writeFileSync(path.join(root, 'dist', 'ui.html'), output, 'utf-8');

// Save cache buster to manifest file for reference
fs.writeFileSync(
  path.join(root, 'dist', 'manifest.json'),
  JSON.stringify({ cacheBuster: cacheBuster }, null, 2),
  'utf-8'
);

console.log('✓ Built dist/ui.html (' + Math.round(Buffer.byteLength(output) / 1024) + ' KB)');
console.log('✓ Cache buster hash: ' + cacheBuster);
