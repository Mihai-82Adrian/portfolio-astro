import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = path.join(ROOT, 'src');

// Regression fixtures are allowed to *mention* the forbidden names as literal
// strings (e.g. in this very test file, or in a doc); only real styling
// sources are scanned.
const STYLE_EXTENSIONS = new Set(['.astro', '.svelte', '.css', '.ts']);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full, acc);
    } else if (STYLE_EXTENSIONS.has(path.extname(entry))) {
      acc.push(full);
    }
  }
  return acc;
}

const SRC_FILES = walk(SRC).map((f) => ({ file: f, rel: path.relative(ROOT, f), source: readFileSync(f, 'utf8') }));

// --- A. forbidden undefined tokens ---------------------------------------

// Bare-token regexes only (immediate closing paren / no valid suffix exists
// for --font-heading|--font-body), so the legitimate Tailwind-generated
// compound tokens --color-text-primary-light / -dark used correctly in
// Search.astro and blog/[slug].astro never false-positive here.
const FORBIDDEN_PATTERNS = [
  { name: '--color-text-primary', re: /var\(--color-text-primary\)/ },
  { name: '--color-text-secondary', re: /var\(--color-text-secondary\)/ },
  { name: '--font-heading', re: /var\(--font-heading\b/ },
  { name: '--font-body', re: /var\(--font-body\b/ },
];

test('no executable src/ styling references the four undefined legacy custom properties', () => {
  assert.ok(SRC_FILES.length > 100, `Sanity check: expected to scan a substantial number of files, found ${SRC_FILES.length}.`);
  const offenders = [];
  for (const { rel, source } of SRC_FILES) {
    for (const { name, re } of FORBIDDEN_PATTERNS) {
      if (re.test(source)) offenders.push(`${rel}: ${name}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Regression: these files still reference an undefined legacy token (never generated anywhere, silently collapses background/border to transparent and text to the ambient inherited color) — ${offenders.join(', ')}`,
  );
});

// --- B. the chosen replacements are actually defined ----------------------

const GLOBAL_CSS = readFileSync(path.join(SRC, 'styles/global.css'), 'utf8');
const TAILWIND_CONFIG = readFileSync(path.join(ROOT, 'tailwind.config.mjs'), 'utf8');

test('the semantic replacement --text-primary/--text-secondary are defined in both :root and .dark', () => {
  const rootBlock = GLOBAL_CSS.slice(GLOBAL_CSS.indexOf(':root {'), GLOBAL_CSS.indexOf('.dark {'));
  const darkBlock = GLOBAL_CSS.slice(GLOBAL_CSS.indexOf('.dark {'));
  for (const token of ['--text-primary', '--text-secondary']) {
    assert.match(rootBlock, new RegExp(`${token}:\\s*#[0-9A-Fa-f]{6}`), `:root must define ${token}.`);
    assert.match(darkBlock, new RegExp(`${token}:\\s*#[0-9A-Fa-f]{6}`), `.dark must define ${token}.`);
  }
});

test('the replacement font utility class font-sans is backed by a real Tailwind theme.fontFamily.sans entry', () => {
  assert.match(
    TAILWIND_CONFIG,
    /fontFamily:\s*{\s*[\s\S]*?sans:\s*\[/,
    'tailwind.config.mjs must define theme.extend.fontFamily.sans (source of the generated .font-sans utility class).',
  );
});

// Regression guard for a mistake made and caught during this exact remediation: Tailwind v4 in
// this project's `@config` (JS-config compat) mode does NOT emit a `--font-sans` custom property
// anywhere — it inlines the resolved font stack directly into the `.font-sans` utility class (see
// dist/_astro/BaseLayout*.css: `.font-sans{font-family:Inter,Geist,...}`, confirmed by build).
// `font-family: var(--font-sans)` would therefore reference a variable that is never defined —
// exactly the same failure class as the original --font-heading/--font-body bug. The correct
// replacement is the `@apply font-sans;` utility (requires `@reference "<path>/global.css";` at
// the top of the component's <style> block, the pattern already established by
// GitHubWidget.astro's pre-existing `@apply text-eucalyptus-700 ...`).
test('no executable src/ styling references the undefined --font-sans custom property', () => {
  const offenders = SRC_FILES.filter(({ source }) => /var\(--font-sans\)/.test(source)).map(({ rel }) => rel);
  assert.deepEqual(offenders, [], `Regression: --font-sans is never generated as a CSS custom property in this project's Tailwind v4 @config mode — ${offenders.join(', ')} must use "@apply font-sans;" instead.`);
});

test('every component using "@apply font-sans;" also declares @reference to global.css in the same <style> block (required for scoped @apply to resolve)', () => {
  const offenders = [];
  for (const { rel, source } of SRC_FILES) {
    const styleBlocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    for (const block of styleBlocks) {
      if (/@apply\s+font-sans;/.test(block) && !/@reference\s+["'][^"']*global\.css["']/.test(block)) {
        offenders.push(rel);
      }
    }
  }
  assert.deepEqual(offenders, [], `Regression: these files use "@apply font-sans;" without the required "@reference \\".../global.css\\";" — ${offenders.join(', ')}`);
});

test('headings and body both already render with font-sans in the base layer (confirms no distinct heading/body family was ever intended)', () => {
  const baseLayerStart = GLOBAL_CSS.indexOf('@layer base {');
  assert.ok(baseLayerStart >= 0, 'Expected a @layer base block.');
  const headingRuleStart = GLOBAL_CSS.indexOf('h1,\n  h2,\n  h3,\n  h4,\n  h5,\n  h6 {', baseLayerStart);
  assert.ok(headingRuleStart >= 0, 'Expected the h1-h6 base typography rule.');
  const ruleEnd = GLOBAL_CSS.indexOf('}', headingRuleStart);
  const headingRule = GLOBAL_CSS.slice(headingRuleStart, ruleEnd);
  assert.match(headingRule, /@apply[^;]*\bfont-sans\b/, 'h1-h6 must apply font-sans — the design system has no separate heading family.');
});

// --- C. theme mechanism: real .dark, not unreachable [data-theme] --------

const SEARCH_SOURCE = readFileSync(path.join(SRC, 'components/Search.astro'), 'utf8');
const PROJECT_METRICS_SOURCE = readFileSync(path.join(SRC, 'components/projects/ProjectMetrics.astro'), 'utf8');

test('Search.astro Pagefind dark selectors target real .dark, never [data-theme]', () => {
  assert.doesNotMatch(SEARCH_SOURCE, /\[data-theme/, 'Regression: Search.astro must not gate any style on [data-theme] — site dark mode is driven exclusively by the .dark class on <html> (src/utils/theme.ts).');
  // Prefixed with the stable #pagefind-search container id, not a bare .pagefind-ui__* class:
  // Pagefind's own generated CSS scopes its defaults with a Svelte build-hash class (confirmed via
  // dist/pagefind/pagefind-ui.css: .pagefind-ui__search-input.svelte-e9gkc3, and a 4-class compound
  // selector for .pagefind-ui__result-link), which outranks a single bare class by CSS specificity
  // regardless of source order. A real browser check (Firefox 7.10) caught this — a bare-class dark
  // override compiled correctly but was still cascade-losing to Pagefind's own CSS in practice. An
  // ID always outranks any number of classes, so this stays correct across Pagefind version bumps.
  for (const selector of [
    ':global(.dark #pagefind-search .pagefind-ui__search-input)',
    ':global(.dark #pagefind-search .pagefind-ui__result-link)',
    ':global(.dark #pagefind-search .pagefind-ui__result-excerpt mark)',
  ]) {
    assert.ok(
      SEARCH_SOURCE.includes(selector),
      `Expected the fully-global, ID-anchored dark selector "${selector}" for both reachability (Pagefind's dynamically injected DOM never carries an Astro component-scope attribute) and specificity (must outrank Pagefind's own Svelte-scoped classes).`,
    );
  }
});

// Phase 5-D1B-R1: D1B's three leaf overrides (input/result-link/mark) left every other Pagefind
// text element (result count, normal excerpt text, sub-results, loading indicator, clear control,
// "Load more results" button) inheriting Pagefind's own un-themed light-mode default
// (--pagefind-ui-text:#393939 etc.), a near-illegible remainder against the dark page background —
// see SEARCH_DARK_ROOT_CAUSE_REMAINDER.md. R1 closes this by setting Pagefind's own native
// --pagefind-ui-* contract on the container, so Pagefind themes every current and future
// un-styled descendant itself, rather than adding one brittle selector per Svelte-generated node.
test('Search.astro sets Pagefind\'s native theme-ownership contract on #pagefind-search, not just the three leaf selectors', () => {
  assert.match(
    SEARCH_SOURCE,
    /:global\(\.dark #pagefind-search\)\s*\{[^}]*--pagefind-ui-text:\s*var\(--text-primary\)[^}]*\}/,
    'Expected :global(.dark #pagefind-search) to set --pagefind-ui-text: var(--text-primary) — the single inheritance root (.pagefind-ui{color:var(--pagefind-ui-text)}) every un-styled Pagefind descendant (message, excerpt, sub-results, loading, clear control, "Load more") falls back to.',
  );
  for (const [pagefindVar, mappedTo] of [
    ['--pagefind-ui-text', 'var(--text-primary)'],
    ['--pagefind-ui-background', 'var(--bg-surface)'],
    ['--pagefind-ui-border', 'var(--border-color)'],
    ['--pagefind-ui-primary', 'var(--color-primary)'],
  ]) {
    assert.match(
      SEARCH_SOURCE,
      new RegExp(`${pagefindVar}:\\s*${mappedTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `Expected ${pagefindVar}: ${mappedTo} — a real, already-.dark-switching runtime semantic token, not an undefined Tailwind name.`,
    );
  }
  // Regression guard: the fix must map to this project's own already-defined runtime tokens
  // (confirmed present in :root/.dark by earlier tests in this file), never back to one of the
  // undefined var(--color-eucalyptus-*)/var(--color-dark-*) names TAILWIND_V4_LEGACY_CONFIG_CSS_VAR_GAP.md
  // documents, and never a plain compatibility alias for the four originally-forbidden tokens.
  const themeOwnershipBlock = SEARCH_SOURCE.match(/:global\(\.dark #pagefind-search\)\s*\{[^}]*\}/)?.[0] ?? '';
  assert.doesNotMatch(themeOwnershipBlock, /var\(--color-eucalyptus/, 'Regression: the Pagefind theme-ownership block must not reference an undefined --color-eucalyptus-* variable.');
  assert.doesNotMatch(themeOwnershipBlock, /var\(--color-dark-/, 'Regression: the Pagefind theme-ownership block must not reference an undefined --color-dark-* variable.');
});

test('ProjectMetrics.astro dark styling is driven by real .dark, and the dead theme prop/data-theme attribute are gone', () => {
  assert.doesNotMatch(PROJECT_METRICS_SOURCE, /\[data-theme/, 'Regression: ProjectMetrics.astro must not gate .metric-card dark styling on [data-theme="dark"] — no caller ever passed theme="dark", making that branch permanently unreachable.');
  assert.doesNotMatch(PROJECT_METRICS_SOURCE, /data-theme=/, 'Regression: the dead data-theme attribute must not be reintroduced (zero callers ever supplied a non-default theme prop).');
  assert.doesNotMatch(PROJECT_METRICS_SOURCE, /theme\?:\s*'light'\s*\|\s*'dark'/, 'Regression: the dead theme prop must not be reintroduced without a real caller.');
  assert.match(PROJECT_METRICS_SOURCE, /:global\(\.dark\)\s*\.metric-card/, 'Expected :global(.dark) .metric-card — the same reachable pattern already used by ProjectCard.astro (:global(.dark) .project-card).');
});

// --- D. secondary-token parity: runtime light value matches canonical source ---

const DESIGN_TOKENS = JSON.parse(readFileSync(path.join(SRC, 'data/design-tokens.json'), 'utf8'));

test('runtime --text-secondary (light) matches the canonical design-tokens.json / tailwind.config.mjs source, not a hand-duplicated hex', () => {
  const canonicalLight = DESIGN_TOKENS.colors.text.secondary.light;
  assert.match(canonicalLight, /^#[0-9A-Fa-f]{6}$/, 'Sanity check: canonical source must resolve to a hex color.');

  const rootBlock = GLOBAL_CSS.slice(GLOBAL_CSS.indexOf(':root {'), GLOBAL_CSS.indexOf('.dark {'));
  const runtimeMatch = rootBlock.match(/--text-secondary:\s*(#[0-9A-Fa-f]{6})/);
  assert.ok(runtimeMatch, ':root must declare --text-secondary as a hex color.');

  assert.equal(
    runtimeMatch[1].toUpperCase(),
    canonicalLight.toUpperCase(),
    `global.css --text-secondary (light) must equal the canonical text.secondary.light (${canonicalLight}), not drift from it (this exact drift — #6B6B6B vs #5A5A5A — was TEXT-SECONDARY-TOKEN-DRIFT-P2).`,
  );

  assert.match(TAILWIND_CONFIG, new RegExp(`light:\\s*'${canonicalLight}'`), 'tailwind.config.mjs must also resolve text.secondary.light to the same canonical hex (cross-source agreement, not just design-tokens.json in isolation).');
});

test('--text-secondary (dark) is unchanged at the canonical value', () => {
  const darkBlock = GLOBAL_CSS.slice(GLOBAL_CSS.indexOf('.dark {'));
  const runtimeMatch = darkBlock.match(/--text-secondary:\s*(#[0-9A-Fa-f]{6})/);
  assert.ok(runtimeMatch, '.dark must declare --text-secondary as a hex color.');
  assert.equal(runtimeMatch[1].toUpperCase(), DESIGN_TOKENS.colors.text.secondary.dark.toUpperCase());
});
