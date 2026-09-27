# Contributing to XDtox

Thanks for taking an interest. XDtox is a small, dependency-light Figma plugin,
and the goal is to keep it that way — easy to read end to end, easy to verify.

---

## Getting set up

```bash
npm install
npm test          # Jest on the pure helpers
npm run dev       # UI preview at localhost:3000 with a mock Figma API
```

`npm run dev` serves the UI against mock data, so you can iterate on layout and
logic without Figma. For anything that touches the plugin backend you'll need
the real thing:

```bash
npm run build
```

Then in Figma: **Plugins → Development → Import plugin from manifest…** and pick
`dist/manifest.json`. After each rebuild, **Plugins → Development → XDtox →
Reload plugin**.

---

## Project layout

| Path                 | What it is                                                     |
| -------------------- | -------------------------------------------------------------- |
| `src/code.js`        | Plugin backend, runs in the Figma sandbox                      |
| `src/ui.js`          | UI logic — event listeners, message passing, DOM updates       |
| `src/ui.html`        | UI markup. **Edit this, never `dist/ui.html`**                 |
| `src/helpers.js`     | Pure, testable detection functions                             |
| `src/helpers.test.js`| Jest tests for every helper                                    |
| `src/styles.css`     | Tailwind source plus custom `@layer` CSS                       |
| `scripts/build.js`   | Bundle + inline + cache-buster pipeline                        |
| `demo/`              | Local preview harness with a mock Figma API                    |
| `dist/`              | Build output. **Generated — never hand-edit**                  |

---

## Conventions that matter

**Detection logic goes in `src/helpers.js` as a pure function, with a test.**
This is the only unit-tested layer, and it's where the value is — keeping
detection pure is what makes it verifiable without a Figma document. Check the
existing helpers before adding a new one.

**Position preservation is a core guarantee.** Reparenting a node must keep its
original x/y. If you touch the unwrap path, verify this explicitly.

**No network access.** The manifest declares `allowedDomains: ["none"]`. Fonts
and CSS are inlined as base64 so the plugin loads no external resources and
satisfies Figma's CSP. Don't add remote assets, CDN scripts, or requests.

**The backend and UI talk only via `postMessage`** (`scan`, `strip`, `resize`).
If you add a message type, handle it on both sides in the same change.

**Don't hand-edit generated files.** `dist/` comes from `npm run build`, and
`scripts/fonts/fonts.inline.css` comes from `scripts/fonts/build-fonts.js`.

**Keep the `/* INLINE_* */` placeholders** in `src/ui.html` — the build errors
out without them.

**Styling:** Tailwind utilities directly in `src/ui.html`. Anything that can't
be a utility (clip-paths, animations, scrollbars) goes in `@layer
components`/`@layer utilities` in `src/styles.css`. Fonts are Space Mono (mono)
and Syne (display).

**Target is ES2017.** Avoid syntax esbuild would have to down-level further.

**Formatting:** Prettier and ESLint 9 (flat config). Some older files predate
Prettier and use column-aligned style — format the files you're already editing
rather than blanket-running `npm run format`, which produces large noisy diffs.

---

## Before you open a PR

```bash
npm test          # must pass
npm run lint      # must be error-free
npm run build     # must succeed
```

Then reload in Figma and test the actual behaviour. The helpers have unit tests;
the scan and strip operations don't, so manual verification against a real XD
import is the only real check.

---

## Commits

Conventional commits, under 50 characters for the subject:

```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

**Scopes:**

- `scan` — XD frame detection / scanning logic
- `strip` — unwrap / delete-mask / promote-fill operations
- `ui` — `ui.html` / `ui.js` / `styles.css`
- `helpers` — pure helpers and tests
- `build` — `scripts/build.js`, fonts, cache buster
- `config` — manifest, tailwind, package config

Examples:

```
fix(scan): detect nested clip groups
feat(ui): show per-frame strip progress
chore(config): bump esbuild to 0.28
```

Work on a branch named `<type>/<short-description>` — e.g. `fix/clip-detection`.

---

## Releasing

Versions are plain semver. `package.json` is the source of truth;
`manifest.json` has no version field because Figma doesn't use one. The version
is shown to users in the UI footer, so a bump has to touch `src/ui.html` too —
the bump script handles all of it.

```bash
npm run version:patch          # 1.0.2 → 1.0.3   bug fixes
npm run version:minor          # 1.0.2 → 1.1.0   new behaviour, backwards compatible
npm run version:major          # 1.0.2 → 2.0.0   breaking change to plugin behaviour
```

Or set one explicitly, and preview before writing:

```bash
npm run version:bump 2.1.0
npm run version:bump patch -- --dry-run
```

Each of these updates `package.json`, `package-lock.json`, and the version
labels in `src/ui.html`, then prints the commit and tag command. Pass
`--commit` to have it commit and tag in one step:

```bash
npm run version:bump patch -- --commit
git push && git push origin v1.0.3
```

After bumping, run `npm run build` and confirm the footer shows the new version
before publishing.

### What counts as what

- **patch** — bug fixes, detection corrections, dependency updates, copy changes
- **minor** — new detection cases, new UI affordances, anything additive
- **major** — a change in what strip does to a user's document, or removed behaviour

Since the strip operation isn't undoable through the plugin (users rely on
Figma's native undo), any change to what gets deleted deserves a major bump and a
note in the release.
