## What changed

<!-- One or two sentences. What does this PR do, and why? -->

## Type

<!-- Delete the ones that don't apply. Matches the commit types in CONTRIBUTING.md. -->

- `feat` — new behaviour
- `fix` — bug fix
- `refactor` — restructuring, no behaviour change
- `docs` — documentation only
- `test` — tests only
- `chore` — tooling, config, dependencies
- `perf` — performance

## Scope

<!-- Delete the ones that don't apply. -->

- `scan` — XD frame detection / scanning
- `strip` — unwrap / delete-mask / promote-fill
- `ui` — ui.html / ui.js / styles.css
- `helpers` — pure helpers + tests
- `build` — build pipeline, fonts, cache buster
- `config` — manifest, tailwind, package config

## Checklist

- [ ] `npm test` passes
- [ ] `npm run lint` is error-free
- [ ] Changes are in `src/` — `dist/` was not hand-edited
- [ ] `npm run build` succeeds and the plugin was reloaded and tested in Figma
- [ ] Node positions are still preserved by any reparenting (core guarantee)
- [ ] New detection logic is a pure function in `src/helpers.js` with a test
- [ ] Any new `postMessage` message type is handled on both the backend and UI side
- [ ] No external requests, CDN scripts, or remote assets were added

## How to verify

<!--
Steps a reviewer can follow. For scan/strip changes, describe the frame
structure you tested against. Before/after screenshots help for UI changes.
-->

## Notes for the reviewer

<!-- Tradeoffs, known gaps, follow-up work, or anything you want a second opinion on. -->
