# XDtox

A Figma plugin that strips Adobe XD SVG import artifacts — redundant wrapper groups, clip mask nodes, and background vector paths — from frames in one click.

---

## What it does

When an SVG exported from Adobe XD is imported into Figma, each frame arrives wrapped in a predictable three-layer structure that Figma can't clean up automatically:

```
Frame  "My Frame"
└─ Group  "Clip path group"          ← outer wrapper
     ├─ Group  "My Frame"            ← inner group (same name as frame)
     │    └─ [your actual content]
     └─ Vector  "clip-My_Frame"      ← clip mask node
```

Additionally, the frame background is imported as a full-size vector path rather than a proper Figma fill.

XDtox fixes all three problems in a single pass:

1. **Unwrap groups** — the "Clip path group" and the inner frame-name group are removed, and their children are re-parented directly into the frame at their original positions.
2. **Delete the clip mask** — the `clip-{name}` vector node is removed entirely.
3. **Promote the background fill** — if a full-frame vector path sits at the bottom of the layer stack, its fill is copied to the frame's own fill property and the vector is deleted.

---

## How to use

1. Open the plugin in Figma (**Plugins → XDtox**).
2. Optionally **select specific frames** to target only those; leave nothing selected to scan by scope.
3. Choose a scope — **Current page** or **Whole file**.
4. Click **Scan for XD frames** to preview which frames will be affected.
5. Review the list, then click **Strip XD wrappers** to apply all fixes.

Node positions are preserved throughout. The operation is not undoable via the plugin — use Figma's native Undo (`Cmd/Ctrl+Z`) immediately after if needed.

---

## Project structure

```
xdtox/
├── src/
│   ├── code.js          Figma plugin backend (runs in the plugin sandbox)
│   ├── ui.js            UI logic and event handling
│   ├── helpers.js       Pure helper functions, shared with tests
│   ├── helpers.test.js  Jest unit tests for all helper functions
│   ├── ui.html          UI template (edit this, not the built ui.html)
│   └── styles.css       Tailwind directives + custom component CSS
├── demo/
│   ├── dev.js           Watch mode for local UI preview
│   ├── server.js        Local dev server (serves demo/index.html)
│   ├── index.html       Sandboxed UI preview for development
│   └── mock-data.js     Mock Figma API for testing UI without the plugin
├── scripts/
│   ├── build.js         Inlines compiled CSS and scripts into ui.html
│   └── get-cache-buster.js  Cache busting utility
├── dist/
│   └── styles.css       Compiled Tailwind output
├── manifest.json        Figma plugin manifest
├── tailwind.config.js   Tailwind configuration
└── package.json
```

### Key files

**`src/code.js`** runs inside Figma's plugin sandbox. It has access to the `figma` API but no DOM. It listens for messages from the UI (`scan`, `strip`, `resize`) and posts results back.

**`src/ui.js`** contains all UI logic and event listeners. It communicates with the plugin backend via postMessage. Updates here require a rebuild + Figma reload to test.

**`src/helpers.js`** contains five pure detection functions with no Figma or DOM dependencies, making them independently testable:

| Function | Purpose |
|---|---|
| `isClipPathGroup(node)` | Detects the outer "Clip path group" wrapper |
| `isFrameNameGroup(node, frameName)` | Detects the inner group named after the frame |
| `isClipMaskNode(node, frameName)` | Detects the `clip-{name}` mask node |
| `looksLikeXDFrame(frame)` | Returns true if a frame has the full XD structure |
| `isBackgroundVector(node, frame)` | Detects a full-frame background vector path |

**`src/ui.html`** is the source template (edit this, not the built `ui.html` in the root). It contains `/* INLINE_CSS */` and `/* INLINE_SCRIPT */` placeholders that the build script replaces with compiled CSS and bundled JavaScript.

**`demo/`** provides a sandboxed preview environment for testing UI changes without reloading in Figma. The mock data in `mock-data.js` simulates the Figma API.

---

## Development

### Prerequisites

- Node.js 18+
- Figma desktop app (for testing the actual plugin)

### Install dependencies

```bash
npm install
```

### Build

Compiles Tailwind and inlines CSS + JavaScript into the plugin UI:

```bash
npm run build
```

### Local UI preview

To see UI changes without reloading the plugin repeatedly:

```bash
npm run dev
```

This runs a local dev server at `http://localhost:3000` with live CSS recompilation and the mock Figma API. Test interactions against mock data before confirming in Figma.

### Testing the built plugin

After running `npm run build`:

1. In Figma: **Plugins → Development → XDtox → Reload plugin**.
2. The plugin loads the built files (`ui.html`, bundled CSS/JS, `code.js`).

### Tests

```bash
npm test
```

Runs Jest on `src/helpers.test.js`. All tests cover the five helper functions across normal inputs, edge cases, and boundary conditions. Tests do not require Figma or the DOM.

---

## Making changes

### Changing the UI layout or styles

1. Edit `src/ui.html` (structure/markup) or `src/styles.css` (styles).
2. For quick preview: `npm run dev` and test at `http://localhost:3000` against mock data.
3. When ready: `npm run build` to compile CSS and inline scripts.
4. In Figma: **Plugins → Development → XDtox → Reload plugin** to test the built version.

Tailwind utility classes work directly in `src/ui.html`. Custom CSS that can't be expressed as utilities (clip-paths, animations, scrollbar styling) lives in the `@layer components` and `@layer utilities` blocks in `src/styles.css`.

### Changing UI logic

1. Edit `src/ui.js` (event listeners, message passing, DOM updates).
2. Test locally: `npm run dev`.
3. Build and reload in Figma: `npm run build`, then **Reload plugin**.

### Changing detection logic

1. Edit the relevant function in `src/helpers.js`.
2. Add or update tests in `src/helpers.test.js`.
3. Run `npm test` to verify.
4. Run `npm run build` — esbuild bundles `helpers.js` directly into `code.js`, so there's no manual sync step.

### Changing the plugin backend

Edit `src/code.js` directly. It listens for messages from the UI (`scan`, `strip`, `resize`) and posts results back. After changes, rebuild and reload in Figma.

---

## License

MIT © [Aleks Linde](https://alekslinde.com)
