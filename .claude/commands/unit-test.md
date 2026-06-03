# Test skill

Write and run unit tests for a TypeScript source file.

## How to use

Invoke with `/test` optionally followed by a file path or function name:

- `/test` — test the currently open/discussed file
- `/test src/lib/brand-extract.ts` — test a specific file
- `/test hexNorm` — find and test a specific function

## What to do

1. **Identify the target.** If an argument was given, locate the file or function. If none, use the file most recently mentioned in the conversation or opened in the IDE. Read the source file to understand what it exports.

2. **Determine the test file path.** Place the test file alongside the source:
   - `src/lib/brand-extract.ts` → `src/lib/brand-extract.test.ts`
   - `src/code.ts` → `src/code.test.ts`
   If a test file already exists, read it first and extend rather than replace.

3. **Write meaningful tests.** Cover:
   - Normal / happy-path inputs
   - Edge cases (empty string, zero, null/undefined where types allow, 3-char hex for colour helpers, etc.)
   - Any function visible in the diff or recently changed (prioritise those)
   
   Use Jest + TypeScript. Import only from the source file under test — do not mock the module itself. Keep each `it()` description one clear sentence.

4. **Run the tests.**
   ```bash
   npm test -- --testPathPatterns="<test-file-basename>"
   ```

5. **Report results.** Show the pass/fail summary. If any test fails, diagnose and fix either the test (if the assertion was wrong) or the source (if a real bug was found), then re-run until all pass.

## Notes

- The project uses ESM (`"type": "module"`) with ts-jest ESM preset.
- Figma plugin globals (`figma`, `__html__`) are not available in Node — skip or mock them if they appear at module top-level.
- `@/` path alias maps to `src/`.
