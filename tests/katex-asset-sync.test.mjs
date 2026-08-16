// Permanent contract for the KaTeX asset-generation pipeline (Phase 3-C Step 2B-1RR3;
// renderer-ownership remediation, 2026-08-16).
//
// scripts/sync-katex-assets.mjs regenerates public/katex/ from the katex package that
// `rehype-katex` (the actual math renderer wired in astro.config.mjs) resolves at runtime —
// not a hard-coded `node_modules/katex` path. This is the KA-1 invariant: the KaTeX version
// supplying served CSS/fonts must be identical to the KaTeX version rehype-katex used to
// generate the markup. A root-only KaTeX version bump (independent of rehype-katex's own
// dependency range) is npm-installable without conflict but produces two physically separate
// katex installs; KaTeX 0.17+ renamed structural CSS classes (`strut` -> `katex-strut`,
// `sizing` -> `katex-sizing`), so a skewed pair silently ships CSS that no longer styles the
// rendered markup's `.strut`/`.sizing` elements. See
// docs/operations/dependency-hygiene.md for the investigation this codifies.
//
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
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// KA-1: resolve the katex package `rehype-katex` itself resolves at runtime, via normal
// Node module resolution from rehype-katex's own module context — not a hard-coded path —
// so this contract holds regardless of npm hoisting/deduplication placement.
function resolveRendererKatexDir() {
  const rehypeKatexEntry = require.resolve('rehype-katex', { paths: [ROOT] });
  const requireFromRehypeKatex = createRequire(rehypeKatexEntry);
  return path.dirname(requireFromRehypeKatex.resolve('katex/package.json'));
}

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

test('scripts/sync-katex-assets.mjs regenerates public/katex/ from the katex package rehype-katex actually resolves (KA-1)', () => {
  execFileSync('node', [path.join(ROOT, 'scripts/sync-katex-assets.mjs')], { cwd: ROOT });

  const rendererDist = path.join(resolveRendererKatexDir(), 'dist');
  const generatedCss = readFileSync(path.join(ROOT, 'public/katex/katex.min.css'));
  const sourceCss = readFileSync(path.join(rendererDist, 'katex.min.css'));
  assert.deepEqual(generatedCss, sourceCss);

  const generatedFonts = readdirSync(path.join(ROOT, 'public/katex/fonts')).sort();
  const sourceFonts = readdirSync(path.join(rendererDist, 'fonts')).sort();
  assert.deepEqual(generatedFonts, sourceFonts);

  // The unused client-side JS bundles (and their non-global .replace() sanitization
  // findings) must never be regenerated into tracked/served source.
  for (const unused of ['katex.js', 'katex.mjs', 'katex.min.js', 'contrib']) {
    assert.equal(existsSync(path.join(ROOT, 'public/katex', unused)), false, unused);
  }
});

// ─── KA-1 cross-check: served CSS must actually match the renderer's class names ──────────
// This is the invariant the byte-parity test above does not, by itself, prove: it compares
// public/katex/ against whatever the sync script *chose* to read from. This test instead
// renders real math through the production-equivalent pipeline and confirms the resulting
// structural class names all have a matching CSS rule in the file actually served to the
// browser — the check that would have caught a root-katex/renderer-katex version skew.
test('KA-1: served CSS defines the structural classes the renderer actually emits (no version skew)', async () => {
  const { unified } = await import('unified');
  const remarkParse = (await import('remark-parse')).default;
  const remarkMath = (await import('remark-math')).default;
  const remarkRehype = (await import('remark-rehype')).default;
  const rehypeKatex = (await import('rehype-katex')).default;
  const rehypeStringify = (await import('rehype-stringify')).default;

  const html = String(
    unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeStringify)
      .processSync('Fraction: $\\frac{a}{b}$, sized delimiters: $\\left(\\sqrt{x}\\right)$.')
  );

  const emittedClasses = [...new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))];
  // Structural classes with a dedicated CSS rule in every KaTeX version checked so far —
  // excludes semantic-only atom-type classes (mord/mbin/mop/mopen/mclose/mpunct/mrel/
  // minner/mtight) that never have their own CSS rule in any KaTeX version tested: KaTeX
  // applies their spacing via inline styles, not those class selectors, so their absence
  // from CSS is expected and not a skew signal.
  const structuralClasses = emittedClasses.filter((c) =>
    ['strut', 'sizing', 'katex', 'vlist', 'frac-line', 'sqrt', 'delimsizing'].some((needle) => c.includes(needle))
  );
  assert.ok(structuralClasses.length > 0, 'fixture must actually exercise structural KaTeX classes');

  const servedCss = readFileSync(path.join(ROOT, 'public/katex/katex.min.css'), 'utf8');
  const missing = structuralClasses.filter((c) => !servedCss.includes(`.${c}`));
  assert.deepEqual(
    missing,
    [],
    `served public/katex/katex.min.css is missing CSS rules for classes the renderer emits: ${missing.join(', ')} — ` +
      'this is the KaTeX 0.16->0.18 "katex-" class-prefix skew; the katex package that generates ' +
      'the markup and the katex package that supplies public/katex/ have diverged.'
  );
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
