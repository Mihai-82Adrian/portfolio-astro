// Permanent contract for the KaTeX asset-generation pipeline (Phase 3-C Step 2B-1RR3).
//
// scripts/sync-katex-assets.mjs regenerates public/katex/ from the locked `katex` package.
// It must be invoked explicitly, as the first step of `npm run dev` and `npm run build` —
// never only through the implicit `predev`/`prebuild` npm lifecycle hooks, which a common
// operator npm setting (`ignore-scripts=true`) silently suppresses. A build that depends
// solely on that implicit hook firing produced a release artifact missing every KaTeX asset
// on any host with that setting, while an isolated container build (which never inherits a
// host user's `~/.npmrc`) built correctly — see the Step 2B-1RR2 bisection evidence.
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ─── package.json contract: explicit invocation, no reliance on implicit hooks ────────────

test('package.json does not define predev/prebuild — release-critical generation must not be reachable only through an implicit npm lifecycle hook', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal('predev' in pkg.scripts, false, 'predev must not exist');
  assert.equal('prebuild' in pkg.scripts, false, 'prebuild must not exist');
});

test('npm run build invokes sync-katex-assets.mjs explicitly, before astro build', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const build = pkg.scripts.build;
  const syncIndex = build.indexOf('node scripts/sync-katex-assets.mjs');
  const astroIndex = build.indexOf('astro build');
  assert.ok(syncIndex !== -1, `"build" must explicitly invoke sync-katex-assets.mjs: ${build}`);
  assert.ok(astroIndex !== -1, `"build" must invoke astro build: ${build}`);
  assert.ok(syncIndex < astroIndex, `sync-katex-assets.mjs must run before astro build: ${build}`);
});

test('npm run dev invokes sync-katex-assets.mjs explicitly, before astro dev', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const dev = pkg.scripts.dev;
  const syncIndex = dev.indexOf('node scripts/sync-katex-assets.mjs');
  const astroIndex = dev.indexOf('astro dev');
  assert.ok(syncIndex !== -1, `"dev" must explicitly invoke sync-katex-assets.mjs: ${dev}`);
  assert.ok(astroIndex !== -1, `"dev" must invoke astro dev: ${dev}`);
  assert.ok(syncIndex < astroIndex, `sync-katex-assets.mjs must run before astro dev: ${dev}`);
});

// ─── Sync script contract: clean destination, copy only css+fonts, never JS/contrib ───────

test('scripts/sync-katex-assets.mjs regenerates public/katex/ from the installed katex package only', () => {
  execFileSync('node', [path.join(ROOT, 'scripts/sync-katex-assets.mjs')], { cwd: ROOT });

  const generatedCss = readFileSync(path.join(ROOT, 'public/katex/katex.min.css'));
  const sourceCss = readFileSync(path.join(ROOT, 'node_modules/katex/dist/katex.min.css'));
  assert.deepEqual(generatedCss, sourceCss);

  const generatedFonts = readdirSync(path.join(ROOT, 'public/katex/fonts')).sort();
  const sourceFonts = readdirSync(path.join(ROOT, 'node_modules/katex/dist/fonts')).sort();
  assert.deepEqual(generatedFonts, sourceFonts);

  // The unused client-side JS bundles (and their non-global .replace() sanitization
  // findings) must never be regenerated into tracked/served source.
  for (const unused of ['katex.js', 'katex.mjs', 'katex.min.js', 'contrib']) {
    assert.equal(existsSync(path.join(ROOT, 'public/katex', unused)), false, unused);
  }
});

// ─── Built artifact contract: run only via `verify:katex-assets:built` / `verify:katex-assets`,
// after a build has already happened (see package.json) — a missing dist/ is a hard failure,
// not a silently skipped test, so this cannot pass because the gate ran things out of order.

test('the built dist/ ships the expected KaTeX CSS and font files', () => {
  const dist = path.join(ROOT, 'dist');
  assert.ok(existsSync(dist), 'run npm run build before verify:katex-assets');
  const cssPath = path.join(dist, 'katex/katex.min.css');
  assert.ok(existsSync(cssPath), 'dist/katex/katex.min.css must exist');
  assert.ok(readFileSync(cssPath).length > 0, 'dist/katex/katex.min.css must not be empty');

  const fontsDir = path.join(dist, 'katex/fonts');
  assert.ok(existsSync(fontsDir), 'dist/katex/fonts must exist');
  const fonts = readdirSync(fontsDir);
  assert.ok(fonts.length > 0, 'dist/katex/fonts must not be empty');
  assert.ok(
    fonts.every((f) => /\.(ttf|woff2?)$/.test(f)),
    `dist/katex/fonts must contain only font files, found: ${fonts.join(', ')}`
  );
});

test('the built dist/ never ships the unused KaTeX JavaScript bundle or contrib helpers', () => {
  const dist = path.join(ROOT, 'dist');
  assert.ok(existsSync(dist), 'run npm run build before verify:katex-assets');
  for (const unused of ['katex/katex.js', 'katex/katex.mjs', 'katex/katex.min.js', 'katex/contrib']) {
    assert.equal(existsSync(path.join(dist, unused)), false, `dist/${unused} must not exist`);
  }
});
