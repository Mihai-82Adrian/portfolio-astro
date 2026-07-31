// Permanent deterministic privacy-boundary suite.
//
// Covers two invariants required by the approved consent architecture:
//   1. The versioned consent model in src/lib/consent.ts (pure logic, no DOM
//      needed — a fake Storage is injected).
//   2. The production build never ships an unconditional third-party script
//      tag for Ahrefs (analytics, opt-in only) or Giscus (comments,
//      click-to-load only) — both must only ever be injected by JS at
//      runtime, after the relevant user action.
//
// No test contacts a real network endpoint. Build-dependent checks are
// skipped if dist/ is missing (run `npm run verify:privacy` to build first).
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONSENT_VERSION,
  CONSENT_STORAGE_KEY,
  readPreferences,
  writePreferences,
} from '../src/lib/consent.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

class FakeStorage {
  #store = new Map();
  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }
  setItem(key, value) {
    this.#store.set(key, String(value));
  }
  removeItem(key) {
    this.#store.delete(key);
  }
}

// ─── Consent module: fresh visitor ─────────────────────────────────────────

test('readPreferences: no stored value returns undecided, analytics off', () => {
  const storage = new FakeStorage();
  const prefs = readPreferences(storage);
  assert.equal(prefs.version, CONSENT_VERSION);
  assert.equal(prefs.decided, false);
  assert.equal(prefs.analytics, false);
});

// ─── Consent module: legacy migration ──────────────────────────────────────

test('readPreferences: legacy cookie-consent=true does NOT grant analytics consent', () => {
  const storage = new FakeStorage();
  storage.setItem('cookie-consent', 'true');
  const prefs = readPreferences(storage);
  assert.equal(prefs.analytics, false);
  assert.equal(prefs.decided, false, 'a legacy informational dismissal is not an analytics decision');
});

test('readPreferences: legacy key is removed so it is never read again', () => {
  const storage = new FakeStorage();
  storage.setItem('cookie-consent', 'true');
  readPreferences(storage);
  assert.equal(storage.getItem('cookie-consent'), null);
});

test('readPreferences: malformed stored JSON falls back to safe defaults', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, '{not valid json');
  const prefs = readPreferences(storage);
  assert.equal(prefs.decided, false);
  assert.equal(prefs.analytics, false);
});

// ─── Consent module: explicit decisions ────────────────────────────────────

test('writePreferences(true): grants analytics and persists a decided v2 record', () => {
  const storage = new FakeStorage();
  const result = writePreferences(true, storage);
  assert.equal(result.analytics, true);
  assert.equal(result.decided, true);
  assert.equal(result.version, CONSENT_VERSION);

  const persisted = JSON.parse(storage.getItem(CONSENT_STORAGE_KEY));
  assert.deepEqual(persisted, result);
});

test('writePreferences(false): records an explicit decision without granting analytics', () => {
  const storage = new FakeStorage();
  const result = writePreferences(false, storage);
  assert.equal(result.analytics, false);
  assert.equal(result.decided, true, 'rejecting is still a decision — the banner must not reappear every visit');
});

test('withdrawal: accept then reject leaves analytics off for the next readPreferences call', () => {
  const storage = new FakeStorage();
  writePreferences(true, storage);
  writePreferences(false, storage);
  const prefs = readPreferences(storage);
  assert.equal(prefs.analytics, false);
  assert.equal(prefs.decided, true);
});

// ─── Build output: Ahrefs must never ship as a static, unconditional tag ──

function collectHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectHtmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const buildExists = existsSync(distDir);

test(
  'dist HTML never contains an unconditional Ahrefs <script src> tag',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const htmlFiles = collectHtmlFiles(distDir);
    assert.ok(htmlFiles.length > 0, 'expected built HTML pages');
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      assert.doesNotMatch(
        html,
        /<script[^>]+src=["']https:\/\/analytics\.ahrefs\.com/i,
        `${path.relative(distDir, file)} ships an unconditional Ahrefs script tag`
      );
    }
  }
);

test(
  'dist HTML never contains an unconditional Giscus <script src> tag',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const htmlFiles = collectHtmlFiles(distDir);
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      assert.doesNotMatch(
        html,
        /<script[^>]+src=["']https:\/\/giscus\.app/i,
        `${path.relative(distDir, file)} ships an unconditional Giscus script tag`
      );
    }
  }
);

test(
  'the built JS ships the Ahrefs consent-gating code (feature is not just deleted)',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const assetsDir = path.join(distDir, '_astro');
    assert.ok(existsSync(assetsDir), 'expected a dist/_astro bundle directory');
    const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    const found = jsFiles.some((f) =>
      readFileSync(path.join(assetsDir, f), 'utf8').includes('analytics.ahrefs.com')
    );
    assert.ok(found, 'expected some bundled JS to reference analytics.ahrefs.com (consent-gated loader)');
  }
);

test(
  'the homepage build ships both an accept and a reject control in the consent banner',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const homepage = path.join(distDir, 'index.html');
    assert.ok(existsSync(homepage), 'expected dist/index.html');
    const html = readFileSync(homepage, 'utf8');
    assert.match(html, /id="accept-analytics"/);
    assert.match(html, /id="reject-analytics"/);
  }
);
