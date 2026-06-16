// Generates dist-ready self-contained @font-face CSS with base64-embedded
// woff2 fonts (latin subset only) so the Figma plugin UI loads no external
// resources and complies with Figma's CSP.
//
// Run: node scripts/fonts/build-fonts.js
// Output: scripts/fonts/fonts.inline.css

const fs   = require('fs');
const path = require('path');

const dir = __dirname;

// Latin-subset woff2 URLs pulled from the Google Fonts css2 response.
// Syne is a variable font; weights 700 and 800 share the same file.
const FONTS = [
  { family: 'Space Mono', weight: 400, file: 'space-mono-400.woff2' },
  { family: 'Space Mono', weight: 700, file: 'space-mono-700.woff2' },
  { family: 'Syne',       weight: 700, file: 'syne.woff2' },
  { family: 'Syne',       weight: 800, file: 'syne.woff2' },
];

const faces = FONTS.map(({ family, weight, file }) => {
  const b64 = fs.readFileSync(path.join(dir, file)).toString('base64');
  return [
    '@font-face {',
    `  font-family: '${family}';`,
    '  font-style: normal;',
    `  font-weight: ${weight};`,
    '  font-display: swap;',
    `  src: url(data:font/woff2;base64,${b64}) format('woff2');`,
    '}',
  ].join('\n');
});

fs.writeFileSync(path.join(dir, 'fonts.inline.css'), faces.join('\n') + '\n', 'utf-8');
console.log('✓ Wrote scripts/fonts/fonts.inline.css (' +
  Math.round(fs.statSync(path.join(dir, 'fonts.inline.css')).size / 1024) + ' KB)');
