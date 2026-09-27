#!/usr/bin/env node

// Version bump script:
//   1. Compute the next semver from package.json
//   2. Write it to package.json + package-lock.json
//   3. Sync the v{x.y.z} footer labels in src/ui.html
//   4. Optionally commit and tag (--commit)
//
// Usage: node scripts/bump-version.js <major|minor|patch|x.y.z> [--commit] [--dry-run]
//
// The plugin has no version field in manifest.json (Figma doesn't use one), so
// package.json is the single source of truth and the UI footer mirrors it.

const fs               = require('fs');
const path             = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');

const args    = process.argv.slice(2);
const release = args.find((a) => !a.startsWith('--'));
const commit  = args.includes('--commit');
const dryRun  = args.includes('--dry-run');

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

if (!release) {
  console.error('Usage: node scripts/bump-version.js <major|minor|patch|x.y.z> [--commit] [--dry-run]');
  process.exit(1);
}

// ── 1. Compute the next version ───────────────────────────────────────────────

const pkgPath = path.join(root, 'package.json');
const pkg     = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const current = pkg.version;

const match = current.match(SEMVER);
if (!match) {
  console.error(`ERROR: package.json version "${current}" is not plain semver (x.y.z)`);
  process.exit(1);
}

const [major, minor, patch] = match.slice(1).map(Number);

let next;
if (release === 'major')      next = `${major + 1}.0.0`;
else if (release === 'minor') next = `${major}.${minor + 1}.0`;
else if (release === 'patch') next = `${major}.${minor}.${patch + 1}`;
else if (SEMVER.test(release)) next = release;
else {
  console.error(`ERROR: "${release}" is not major, minor, patch, or an x.y.z version`);
  process.exit(1);
}

if (next === current) {
  console.error(`ERROR: version is already ${current}`);
  process.exit(1);
}

console.log(`${current} → ${next}${dryRun ? '  (dry run)' : ''}`);

// ── 2 + 3. Collect the edits ──────────────────────────────────────────────────

const edits = [];

pkg.version = next;
edits.push([pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'package.json']);

const lockPath = path.join(root, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  lock.version = next;
  // npm mirrors the root version inside the packages map as well.
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = next;
  }
  edits.push([lockPath, JSON.stringify(lock, null, 2) + '\n', 'package-lock.json']);
}

// The footer labels in src/ui.html are the only place the version is shown to
// users. Both panels carry one, so every occurrence gets rewritten.
const uiPath  = path.join(root, 'src', 'ui.html');
const ui      = fs.readFileSync(uiPath, 'utf-8');
// current is already known to match /^\d+\.\d+\.\d+$/, but escape every regex
// metacharacter rather than just the dots so this can't build a bad pattern if
// that guarantee ever moves.
const pattern = new RegExp(`v${current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
const found   = (ui.match(pattern) || []).length;

if (found === 0) {
  console.error(`ERROR: no "v${current}" label found in src/ui.html — update it by hand or fix the bump script`);
  process.exit(1);
}

edits.push([uiPath, ui.replace(pattern, `v${next}`), `src/ui.html (${found} label${found === 1 ? '' : 's'})`]);

// ── 4. Write, then optionally commit and tag ──────────────────────────────────

for (const [file, contents, label] of edits) {
  if (!dryRun) fs.writeFileSync(file, contents);
  console.log(`✓ ${label}`);
}

if (dryRun) {
  console.log('\nNothing written.');
  process.exit(0);
}

if (commit) {
  // execFileSync, not execSync: arguments are passed to git directly rather than
  // through a shell, so paths containing spaces or shell metacharacters are safe.
  const files = edits.map(([file]) => path.relative(root, file));
  const git   = (...args) => execFileSync('git', args, { cwd: root, stdio: 'inherit' });

  git('add', ...files);
  git('commit', '-m', `chore(config): bump version to ${next}`);
  git('tag', '-a', `v${next}`, '-m', `v${next}`);
  console.log(`\n✓ Committed and tagged v${next}`);
  console.log(`  Push with: git push && git push origin v${next}`);
} else {
  console.log(`\nNext: review the diff, then commit and tag:`);
  console.log(`  git commit -am "chore(config): bump version to ${next}" && git tag -a v${next} -m "v${next}"`);
}
