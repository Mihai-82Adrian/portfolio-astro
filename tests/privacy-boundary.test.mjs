// Permanent deterministic privacy-boundary suite.
//
// Covers three invariants required by the approved consent architecture:
//   1. The versioned consent model in src/lib/consent.ts (pure logic, no DOM
//      needed — a fake Storage is injected), including the v2 -> v3
//      migration contract.
//   2. The production build never ships an unconditional third-party script
//      tag for Cloudflare Web Analytics/RUM (performance, opt-in only),
//      Ahrefs (acquisition, opt-in only), or Giscus (comments, click-to-load
//      only) — each must only ever be injected by JS at runtime, after the
//      matching user action.
//   3. The persisted consent record's shape is closed and contains no
//      visitor identifier.
//
// No test contacts a real network endpoint. Build-dependent checks are
// skipped if dist/ is missing (run `npm run verify:privacy` to build first).
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textMentionsHost } from './helpers/url-assertions.mjs';

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

test('readPreferences: no stored value returns undecided, both channels off', () => {
  const storage = new FakeStorage();
  const prefs = readPreferences(storage);
  assert.equal(prefs.version, CONSENT_VERSION);
  assert.equal(prefs.decided, false);
  assert.equal(prefs.performanceAnalytics.cloudflareRum, false);
  assert.equal(prefs.acquisitionAnalytics.ahrefs, false);
});

// ─── Consent module: legacy (pre-v2) migration ─────────────────────────────

test('readPreferences: legacy cookie-consent=true does NOT grant any analytics consent', () => {
  const storage = new FakeStorage();
  storage.setItem('cookie-consent', 'true');
  const prefs = readPreferences(storage);
  assert.equal(prefs.performanceAnalytics.cloudflareRum, false);
  assert.equal(prefs.acquisitionAnalytics.ahrefs, false);
  assert.equal(prefs.decided, false, 'a legacy informational dismissal is not an analytics decision');
});

test('readPreferences: legacy key is removed so it is never read again', () => {
  const storage = new FakeStorage();
  storage.setItem('cookie-consent', 'true');
  readPreferences(storage);
  assert.equal(storage.getItem('cookie-consent'), null);
});

// ─── Consent module: v2 -> v3 migration ────────────────────────────────────

test('readPreferences: v2 analytics=true migrates to Ahrefs only, never Cloudflare', () => {
  const storage = new FakeStorage();
  const v2 = { version: 2, analytics: true, decided: true, updatedAt: '2026-01-01T00:00:00.000Z' };
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(v2));
  const prefs = readPreferences(storage);
  assert.equal(prefs.version, CONSENT_VERSION);
  assert.equal(prefs.acquisitionAnalytics.ahrefs, true);
  assert.equal(
    prefs.performanceAnalytics.cloudflareRum,
    false,
    'an old Ahrefs-only decision must never be silently extended to a newly introduced purpose'
  );
  assert.equal(prefs.decided, true);
  assert.equal(prefs.updatedAt, v2.updatedAt, 'the original decision timestamp is preserved across migration');
});

test('readPreferences: v2 analytics=false migrates to both channels off', () => {
  const storage = new FakeStorage();
  const v2 = { version: 2, analytics: false, decided: true, updatedAt: '2026-01-01T00:00:00.000Z' };
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(v2));
  const prefs = readPreferences(storage);
  assert.equal(prefs.acquisitionAnalytics.ahrefs, false);
  assert.equal(prefs.performanceAnalytics.cloudflareRum, false);
  assert.equal(prefs.decided, true);
});

test('readPreferences: malformed stored JSON falls back to safe defaults (decided=false)', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, '{not valid json');
  const prefs = readPreferences(storage);
  assert.equal(prefs.decided, false);
  assert.equal(prefs.performanceAnalytics.cloudflareRum, false);
  assert.equal(prefs.acquisitionAnalytics.ahrefs, false);
});

test('readPreferences: structurally unrecognized (neither v3 nor v2) JSON falls back to safe defaults', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ version: 99, whatever: true }));
  const prefs = readPreferences(storage);
  assert.equal(prefs.decided, false, 'unrecognized data must never be assumed to be a decision');
  assert.equal(prefs.performanceAnalytics.cloudflareRum, false);
  assert.equal(prefs.acquisitionAnalytics.ahrefs, false);
});

// ─── Consent module: explicit v3 decisions ─────────────────────────────────

test('writePreferences: accepting both persists a decided v3 record with both channels on', () => {
  const storage = new FakeStorage();
  const result = writePreferences({ cloudflareRum: true, ahrefs: true }, storage);
  assert.equal(result.version, CONSENT_VERSION);
  assert.equal(result.decided, true);
  assert.equal(result.performanceAnalytics.cloudflareRum, true);
  assert.equal(result.acquisitionAnalytics.ahrefs, true);

  const persisted = JSON.parse(storage.getItem(CONSENT_STORAGE_KEY));
  assert.deepEqual(persisted, result);
});

test('writePreferences: rejecting both records a decision without granting either channel', () => {
  const storage = new FakeStorage();
  const result = writePreferences({ cloudflareRum: false, ahrefs: false }, storage);
  assert.equal(result.performanceAnalytics.cloudflareRum, false);
  assert.equal(result.acquisitionAnalytics.ahrefs, false);
  assert.equal(result.decided, true, 'rejecting is still a decision — the banner must not reappear every visit');
});

test('writePreferences: performance-only grants exactly Cloudflare RUM', () => {
  const storage = new FakeStorage();
  const result = writePreferences({ cloudflareRum: true, ahrefs: false }, storage);
  assert.equal(result.performanceAnalytics.cloudflareRum, true);
  assert.equal(result.acquisitionAnalytics.ahrefs, false);
});

test('writePreferences: acquisition-only grants exactly Ahrefs', () => {
  const storage = new FakeStorage();
  const result = writePreferences({ cloudflareRum: false, ahrefs: true }, storage);
  assert.equal(result.performanceAnalytics.cloudflareRum, false);
  assert.equal(result.acquisitionAnalytics.ahrefs, true);
});

test('writePreferences: repeated identical writes do not change the granted channels', () => {
  const storage = new FakeStorage();
  writePreferences({ cloudflareRum: true, ahrefs: false }, storage);
  const result = writePreferences({ cloudflareRum: true, ahrefs: false }, storage);
  assert.equal(result.performanceAnalytics.cloudflareRum, true);
  assert.equal(result.acquisitionAnalytics.ahrefs, false);
});

// ─── Consent module: withdrawal ────────────────────────────────────────────

test('withdrawal: accepting both then rejecting both leaves both channels off', () => {
  const storage = new FakeStorage();
  writePreferences({ cloudflareRum: true, ahrefs: true }, storage);
  writePreferences({ cloudflareRum: false, ahrefs: false }, storage);
  const prefs = readPreferences(storage);
  assert.equal(prefs.performanceAnalytics.cloudflareRum, false);
  assert.equal(prefs.acquisitionAnalytics.ahrefs, false);
  assert.equal(prefs.decided, true);
});

test('withdrawal: turning off only Cloudflare RUM leaves an already-approved Ahrefs channel on', () => {
  const storage = new FakeStorage();
  writePreferences({ cloudflareRum: true, ahrefs: true }, storage);
  writePreferences({ cloudflareRum: false, ahrefs: true }, storage);
  const prefs = readPreferences(storage);
  assert.equal(prefs.performanceAnalytics.cloudflareRum, false);
  assert.equal(prefs.acquisitionAnalytics.ahrefs, true, 'the channel that remained approved must keep working');
});

// ─── Consent module: closed shape, no visitor identifier ───────────────────

test('writePreferences: the persisted record has exactly the expected closed shape', () => {
  const storage = new FakeStorage();
  writePreferences({ cloudflareRum: true, ahrefs: true }, storage);
  const persisted = JSON.parse(storage.getItem(CONSENT_STORAGE_KEY));
  assert.deepEqual(Object.keys(persisted).sort(), [
    'acquisitionAnalytics',
    'decided',
    'performanceAnalytics',
    'updatedAt',
    'version',
  ]);
  assert.deepEqual(Object.keys(persisted.performanceAnalytics), ['cloudflareRum']);
  assert.deepEqual(Object.keys(persisted.acquisitionAnalytics), ['ahrefs']);
});

test('writePreferences: no field resembling a persistent visitor identifier is ever stored', () => {
  const storage = new FakeStorage();
  writePreferences({ cloudflareRum: true, ahrefs: true }, storage);
  const serialized = storage.getItem(CONSENT_STORAGE_KEY);
  for (const forbidden of ['visitorId', 'clientId', 'userId', 'uuid', 'fingerprint', 'deviceId']) {
    assert.equal(
      new RegExp(forbidden, 'i').test(serialized),
      false,
      `stored consent record must not contain "${forbidden}"`
    );
  }
});

// ─── Build output: no unconditional third-party script tags ───────────────

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
  'dist HTML never contains an unconditional Cloudflare RUM beacon <script src> tag',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const htmlFiles = collectHtmlFiles(distDir);
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      assert.doesNotMatch(
        html,
        /<script[^>]+src=["']https:\/\/static\.cloudflareinsights\.com/i,
        `${path.relative(distDir, file)} ships an unconditional Cloudflare RUM beacon tag`
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
  'the built JS ships both the Cloudflare RUM and Ahrefs consent-gating code (features are not just deleted)',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const assetsDir = path.join(distDir, '_astro');
    assert.ok(existsSync(assetsDir), 'expected a dist/_astro bundle directory');
    const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    const contents = jsFiles.map((f) => readFileSync(path.join(assetsDir, f), 'utf8'));
    assert.ok(
      contents.some((c) => textMentionsHost(c, 'analytics.ahrefs.com')),
      'expected some bundled JS to reference analytics.ahrefs.com (consent-gated loader)'
    );
    assert.ok(
      contents.some((c) => textMentionsHost(c, 'static.cloudflareinsights.com')),
      'expected some bundled JS to reference static.cloudflareinsights.com (consent-gated loader)'
    );
  }
);

test(
  'the homepage build ships the accept/reject controls and the two independent settings toggles',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const homepage = path.join(distDir, 'index.html');
    assert.ok(existsSync(homepage), 'expected dist/index.html');
    const html = readFileSync(homepage, 'utf8');
    assert.match(html, /id="accept-analytics"/);
    assert.match(html, /id="reject-analytics"/);
    assert.match(html, /id="open-privacy-settings"/);
    assert.match(html, /id="toggle-performance-analytics"/);
    assert.match(html, /id="toggle-acquisition-analytics"/);
    assert.match(html, /id="save-privacy-settings"/);
  }
);

test(
  'dist never references api.github.com (PRIV-018: static GitHub snapshot only)',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const htmlFiles = collectHtmlFiles(distDir);
    for (const file of htmlFiles) {
      assert.equal(
        textMentionsHost(readFileSync(file, 'utf8'), 'api.github.com'),
        false,
        `${path.relative(distDir, file)} must not reference api.github.com`
      );
    }
    const assetsDir = path.join(distDir, '_astro');
    if (existsSync(assetsDir)) {
      for (const f of readdirSync(assetsDir).filter((name) => name.endsWith('.js'))) {
        assert.equal(
          textMentionsHost(readFileSync(path.join(assetsDir, f), 'utf8'), 'api.github.com'),
          false,
          `${f} must not reference api.github.com`
        );
      }
    }
  }
);

// ─── Manual RUM token wiring (Phase 3-C Step 2C-2) ─────────────────────────
//
// The Cloudflare Pages Web Analytics integration and zone Automatic Setup were both disabled
// remotely for future deployments in Step 2C-1; this step re-points the application's own
// consent-gated loader at the new manual-install site token Cloudflare issued as a side effect.
// These checks use the real, publicly-committed client-side token values (both the retired one
// and the current one) — this token is delivered to every visitor's browser by design, so it is
// not a secret, unlike a server-side API key.

const OLD_CF_BEACON_TOKEN = '9a5389ee256948589211112fa787bf5c';

test('BaseLayout.astro source no longer contains the retired Cloudflare beacon token', () => {
  const source = readFileSync(path.join(__dirname, '..', 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
  assert.doesNotMatch(source, new RegExp(OLD_CF_BEACON_TOKEN), 'retired token must not remain in source');
  assert.match(source, /const CF_BEACON_TOKEN = '[a-f0-9]{32}';/, 'expected a single 32-hex-char token literal');
});

test('BaseLayout.astro defines the Cloudflare beacon token exactly once (no duplication)', () => {
  const source = readFileSync(path.join(__dirname, '..', 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
  const matches = source.match(/CF_BEACON_TOKEN = '[a-f0-9]{32}'/g) ?? [];
  assert.equal(matches.length, 1, 'the token must be declared in exactly one place, not duplicated');
});

test('both optional-analytics loaders guard against double injection by element id', () => {
  const source = readFileSync(path.join(__dirname, '..', 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
  assert.match(
    source,
    /function loadCloudflareRum\(\) \{\s*if \(document\.getElementById\(CF_BEACON_SCRIPT_ID\)\) return;/,
    'loadCloudflareRum must return early if its script id already exists'
  );
  assert.match(
    source,
    /function loadAhrefs\(\) \{\s*if \(document\.getElementById\(AHREFS_SCRIPT_ID\)\) return;/,
    'loadAhrefs must return early if its script id already exists'
  );
});

test(
  'dist never contains the retired Cloudflare beacon token, in HTML or built JS',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    for (const file of collectHtmlFiles(distDir)) {
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        new RegExp(OLD_CF_BEACON_TOKEN),
        `${path.relative(distDir, file)} must not ship the retired Cloudflare beacon token`
      );
    }
    const assetsDir = path.join(distDir, '_astro');
    if (existsSync(assetsDir)) {
      for (const f of readdirSync(assetsDir).filter((name) => name.endsWith('.js'))) {
        assert.doesNotMatch(
          readFileSync(path.join(assetsDir, f), 'utf8'),
          new RegExp(OLD_CF_BEACON_TOKEN),
          `${f} must not ship the retired Cloudflare beacon token`
        );
      }
    }
  }
);

test(
  'dist never contains the legacy Cloudflare Pages Analytics baked-injection comment',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    for (const file of collectHtmlFiles(distDir)) {
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        /Cloudflare Pages Analytics/,
        `${path.relative(distDir, file)} must not carry the platform-level Pages Analytics injection marker`
      );
    }
  }
);

test(
  'the current Cloudflare beacon token appears in dist only inside the consent-gated JS bundle, never in HTML',
  { skip: !buildExists && 'dist/ not built — run npm run verify:privacy' },
  () => {
    const currentToken = readFileSync(path.join(__dirname, '..', 'src', 'layouts', 'BaseLayout.astro'), 'utf8')
      .match(/CF_BEACON_TOKEN = '([a-f0-9]{32})'/)[1];
    for (const file of collectHtmlFiles(distDir)) {
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        new RegExp(currentToken),
        `${path.relative(distDir, file)} must not bake the current token directly into HTML`
      );
    }
    const assetsDir = path.join(distDir, '_astro');
    assert.ok(existsSync(assetsDir), 'expected a dist/_astro bundle directory');
    const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    const carriers = jsFiles.filter((f) => readFileSync(path.join(assetsDir, f), 'utf8').includes(currentToken));
    assert.equal(carriers.length, 1, 'expected exactly one built JS chunk to carry the current token');
    const chunkSource = readFileSync(path.join(assetsDir, carriers[0]), 'utf8');
    assert.ok(
      chunkSource.includes('cloudflare-rum-beacon'),
      'the chunk carrying the token must be the consent-gated Cloudflare RUM loader, not an unrelated bundle'
    );
  }
);
