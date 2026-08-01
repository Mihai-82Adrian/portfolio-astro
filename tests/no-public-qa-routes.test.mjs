// Phase 2D-C Wave 1 (DEBT-01): internal QA/design-system/component-showcase pages must never
// ship as public, indexable routes. They were previously reachable at /design-system-test
// (DE/EN/RO), /test/components, and /test/blog-system with no robots.txt disallow and
// inconsistent noindex. Guards against reintroduction under src/pages.
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const PAGES = path.join(ROOT, 'src', 'pages');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

test('no QA/design-system/component-showcase route exists under src/pages', () => {
  const files = walk(PAGES).map((f) => path.relative(PAGES, f).replace(/\\/g, '/'));

  for (const forbidden of ['design-system-test', 'test/components', 'test/blog-system']) {
    const hit = files.find((f) => f.includes(forbidden));
    assert.equal(hit, undefined, `forbidden QA route reintroduced under src/pages: ${hit}`);
  }
  assert.equal(existsSync(path.join(PAGES, 'test')), false, 'src/pages/test/ must not exist as a public route directory');
});

test('the retired QA fixtures are preserved outside the public route tree', () => {
  const fixturesDir = path.join(ROOT, 'dev', 'qa-fixtures');
  assert.ok(existsSync(fixturesDir), 'dev/qa-fixtures/ should retain the fixtures for developer reference');
  const files = readdirSync(fixturesDir);
  for (const expected of ['design-system-test.astro', 'components.astro', 'blog-system.astro']) {
    assert.ok(files.includes(expected), `expected ${expected} to be preserved in dev/qa-fixtures/`);
  }
});
