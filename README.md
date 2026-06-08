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
│   ├── helpers.js       Pure helper functions, shared with tests
│   ├── helpers.test.js  Jest unit tests for all helper functions
│   ├── ui.html          UI source template (edit this, not the root ui.html)
│   └── styles.css       Tailwind directives + custom component CSS
├── scripts/
│   └── build.js         Inlines compiled CSS into ui.html for Figma
├── dist/
│   └── styles.css       Compiled Tailwind output (git-ignored or committed)
├── manifest.json        Figma plugin manifest
├── ui.html              Built UI output — what Figma actually loads
├── tailwind.config.js   Tailwind configuration
└── package.json
```

### Key files

**`src/code.js`** runs inside Figma's plugin sandbox. It has access to the `figma` API but no DOM. It listens for messages from the UI (`scan`, `strip`, `resize`) and posts results back.

**`src/helpers.js`** contains the five pure detection functions with no Figma dependencies, making them independently testable:

| Function | Purpose |
|---|---|
| `isClipPathGroup(node)` | Detects the outer "Clip path group" wrapper |
| `isFrameNameGroup(node, frameName)` | Detects the inner group named after the frame |
| `isClipMaskNode(node, frameName)` | Detects the `clip-{name}` mask node |
| `looksLikeXDFrame(frame)` | Returns true if a frame has the full XD structure |
| `isBackgroundVector(node, frame)` | Detects a full-frame background vector path |

**`src/ui.html`** is the source template. It contains a `/* INLINE_CSS */` placeholder that the build script replaces with compiled CSS. **Do not edit the root `ui.html` directly** — changes will be overwritten on the next build.

---

## Development

### Prerequisites

- Node.js 18+
- Figma desktop app

### Install dependencies

```bash
npm install
```

### Build

Compiles Tailwind and inlines the CSS into `ui.html`:

```bash
npm run build
```

### Watch mode

Recompiles CSS on every `src/styles.css` change. You still need to run `node scripts/build.js` (or `npm run build`) to update `ui.html` — or reload the plugin in Figma:

```bash
npm run dev
```

### Tests

```bash
npm test
```

All 27 tests cover the five helper functions across normal inputs, edge cases, and boundary conditions.

---

## Making changes

### Changing the UI

1. Edit `src/ui.html` (layout/markup) or `src/styles.css` (styles).
2. Run `npm run build`.
3. In Figma: **Plugins → Development → XDtox → Reload plugin**.

Tailwind utility classes can be used directly in `src/ui.html`. Custom CSS that can't be expressed as utilities (clip-paths, animations, scrollbar styling) lives in the `@layer components` and `@layer utilities` blocks in `src/styles.css`.

### Changing the detection logic

Edit the relevant function in `src/helpers.js` and update or add tests in `src/helpers.test.js`. Run `npm run build` — esbuild bundles `helpers.js` directly into `code.js`, so there is no manual sync step.

---

## License

MIT © [Aleks Linde](https://alekslinde.com)
