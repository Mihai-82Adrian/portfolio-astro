// Phase 2D-C Wave 6: closes the Pagefind runtime accessibility carry-in from Wave 5
// (register W5-24/W5-31). Requires a prior `npm run build`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SEARCH_SOURCE = readFileSync(path.join(ROOT, 'src/components/Search.astro'), 'utf8');

test('dist/blog/ has been built before running this suite', () => {
  assert.ok(existsSync(path.join(DIST, 'blog/index.html')), 'run `npm run build` before this test');
});

test('source: the static template no longer ships a <label for> that points at nothing', () => {
  const template = SEARCH_SOURCE.split('<script>')[0];
  assert.doesNotMatch(template, /<label[^>]*for=/, 'a static label-for pointing at a not-yet-mounted input is itself an a11y fault');
});

test('source: the MutationObserver is armed before PagefindUI runs (the root cause of the original race)', () => {
  const observerIdx = SEARCH_SOURCE.indexOf('new MutationObserver');
  const pagefindUiIdx = SEARCH_SOURCE.indexOf('new window.PagefindUI');
  assert.ok(observerIdx > -1 && pagefindUiIdx > -1, 'both must be present in source');
  assert.ok(observerIdx < pagefindUiIdx, 'observing only after PagefindUI runs would miss its synchronous initial DOM insertion');
});

test('source: the observer sets a stable id, name, and aria-label on the real Pagefind input (no id/for pairing)', () => {
  assert.match(SEARCH_SOURCE, /input\.id\s*=\s*['"]search-input['"]/);
  assert.match(SEARCH_SOURCE, /setAttribute\(['"]name['"],\s*['"]search['"]\)/);
  assert.match(SEARCH_SOURCE, /setAttribute\(['"]aria-label['"],\s*['"]Search blog posts['"]\)/);
});

test('source: the observer marks the result-count message as a polite live region and never disconnects early', () => {
  assert.match(SEARCH_SOURCE, /setAttribute\(['"]role['"],\s*['"]status['"]\)/);
  assert.match(SEARCH_SOURCE, /setAttribute\(['"]aria-live['"],\s*['"]polite['"]\)/);
  assert.doesNotMatch(SEARCH_SOURCE, /observer\.disconnect\(\)/, 'Svelte recreates the message node per keystroke; disconnecting after the first fix would leave later searches unannounced');
});

test('built output: /blog/ has exactly one Pagefind search container (no duplicate-id setup)', () => {
  const html = readFileSync(path.join(DIST, 'blog/index.html'), 'utf8');
  const matches = html.match(/id="pagefind-search"/g) ?? [];
  assert.equal(matches.length, 1, 'exactly one #pagefind-search container must exist on the page');
  assert.doesNotMatch(html, /<label[^>]*for="search-input"/, 'no dangling static label must ship in the built page');
});

test('built output: the inlined fix (id/name/aria-label wiring, ordered before PagefindUI) is actually present in what ships', () => {
  const html = readFileSync(path.join(DIST, 'blog/index.html'), 'utf8');
  assert.match(html, /"search-input"/);
  assert.match(html, /"aria-label","Search blog posts"|"Search blog posts"/);
  assert.match(html, /"aria-live","polite"|"polite"/);

  const observerIdx = html.indexOf('new MutationObserver');
  const pagefindUiIdx = html.search(/new window\.PagefindUI|PagefindUI\(\{/);
  assert.ok(observerIdx > -1 && pagefindUiIdx > -1);
  assert.ok(observerIdx < pagefindUiIdx, 'the shipped, minified script must preserve observe-before-init ordering');
});
