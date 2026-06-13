# Cache Busting Strategy

Cache busting is automatically handled during the build process to ensure users always receive the latest version of assets.

## How It Works

During the build (`npm run build`), a SHA256 hash is generated from the combined content of all built assets (code.js + styles.css). The first 8 characters of this hash serve as the cache buster identifier.

The hash is stored in `dist/manifest.json` for reference:

```json
{
  "cacheBuster": "1b758981"
}
```

## Implementation Details

- **Hash generation**: `crypto.createHash('sha256').update(code + css).digest('hex').substring(0, 8)`
- **Trigger**: Hash changes whenever either bundled code or compiled CSS changes
- **Storage**: Saved to `dist/manifest.json` for CI/CD pipelines or deployment scripts

## Usage Patterns

### Pattern 1: Query Parameter (for external assets)

If assets were served externally, append the cache buster as a query parameter:

```html
<script src="dist/code.js?v=1b758981"></script>
<link rel="stylesheet" href="dist/styles.css?v=1b758981">
```

Use the manifest file in your deployment script:

```javascript
const manifest = require('./dist/manifest.json');
const cacheBuster = manifest.cacheBuster;
// Now use ${cacheBuster} in template generation
```

### Pattern 2: Filename Hashing (for static file servers)

For maximum cache efficiency, rename outputs during build:

```javascript
const outputCode = `dist/code.${cacheBuster}.js`;
const outputCSS = `dist/styles.${cacheBuster}.css`;
```

Then update references in the HTML accordingly. The build script can be extended to support this.

### Pattern 3: Content-based URLs (recommended for CDNs)

Serve assets from a CDN that uses content-hashing natively. Update the build process to output manifest entries for each asset.

## Current Setup

The current build produces:
- **dist/code.js** - Minified bundled JavaScript
- **dist/styles.css** - Minified compiled CSS  
- **dist/ui.html** - Final HTML with inlined CSS
- **dist/manifest.json** - Build metadata including cache buster hash

All CSS and JavaScript are already inlined in `dist/ui.html`, so browser caching is handled by the HTTP headers on the HTML file itself.

## For Future Changes

To extend cache busting further:

1. **If adding external assets**: Use query parameters with the cache buster from manifest.json
2. **If serving from a CDN**: Implement filename-based hashing with the cache buster hash
3. **If using a static site generator**: Reference manifest.json during template rendering

The hash will automatically update whenever the source code or styles change, ensuring no stale assets are served.
