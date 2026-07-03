// Flat ESLint config. Each source area runs in a different environment:
//   src/code.js        → Figma plugin sandbox (figma, __html__) + CommonJS
//   src/ui.js, ui.html → browser (window, document, parent)
//   src/helpers*.js    → CommonJS + Jest (tests)
//   scripts/, demo/    → Node
const js      = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  // ui.html is markup; ESLint has no HTML parser here. Its inline JS mirrors
  // src/ui.js, which IS linted.
  { ignores: ['dist/', 'node_modules/', 'scripts/fonts/fonts.inline.css', '**/*.html'] },

  js.configs.recommended,

  // Root-level config files (this file, tailwind.config.js) run under Node.
  {
    files: ['*.config.js', '.prettierrc.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  // Figma plugin backend
  {
    files: ['src/code.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.browser, figma: 'readonly', __html__: 'readonly' },
    },
  },

  // Plugin UI (runs in an iframe). Many top-level functions are invoked from
  // inline on* handlers in ui.html, so they read as "unused" here — downgrade
  // to warnings. `var` reused across separate function scopes trips no-redeclare
  // (var is function-scoped); also a warning, not a real bug.
  {
    files: ['src/ui.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-redeclare': 'warn',
    },
  },

  // Pure helpers + their Jest tests
  {
    files: ['src/helpers.js', 'src/helpers.test.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
  },

  // Build scripts and local demo server
  {
    files: ['scripts/**/*.js', 'demo/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // Turn off rules that conflict with Prettier formatting
  prettier,
];
