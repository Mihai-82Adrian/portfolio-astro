// Phase 2D-C Wave 6: locks the final product-acceptance surface reconciled in
// PHASE_2D_C_WAVE6_PRODUCT_ACCEPTANCE_REGISTER.md so a future change cannot silently drop a
// representative route class or a Fin-Tools Hub link without failing a permanent test.
// Requires a prior `npm run build`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

test('dist/ has been built before running this suite', () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'run `npm run build` before this test');
});

const REPRESENTATIVE_ROUTES = [
  'index.html', 'en/index.html', 'ro/index.html',
  'about/index.html', 'en/about/index.html', 'ro/about/index.html',
  'services/index.html', 'datenaufbereitung-fuer-ki/index.html',
  'projects/index.html', 'projects/gds/index.html', 'projects/genesis/index.html',
  'projects/mindhafen/index.html', 'projects/profitminds/index.html',
  'certifications/index.html', 'en/certifications/index.html', 'ro/certifications/index.html',
  'experience/index.html',
  'tools/index.html',
  'tools/cashflow-forecast/index.html', 'tools/founder-compass/index.html',
  'tools/investment-analytics/index.html', 'tools/salary-tax/index.html',
  'tools/startup-runway/index.html', 'tools/xrechnung/index.html',
  'blog/index.html', 'blog/rust-lifetimes-guide/index.html',
  'blog/xrechnung-generator-local-first-en16931/index.html',
  'now/index.html', 'ai/index.html',
  'datenschutz/index.html', 'discovery-call/index.html',
  'sample-struktur-pruefen/index.html',
  '404.html',
];

test('every representative route class from the final acceptance pass exists in the build', () => {
  for (const relPath of REPRESENTATIVE_ROUTES) {
    assert.ok(existsSync(path.join(DIST, relPath)), `missing representative route: ${relPath}`);
  }
});

test('the Fin-Tools Hub links to all six tools (no tool orphaned from its hub)', () => {
  const html = readFileSync(path.join(DIST, 'tools/index.html'), 'utf8');
  for (const slug of [
    'cashflow-forecast', 'founder-compass', 'investment-analytics',
    'salary-tax', 'startup-runway', 'xrechnung',
  ]) {
    assert.match(html, new RegExp(`href="/tools/${slug}/?"`), `Hub must link to /tools/${slug}`);
  }
});

test('locked single-language route classes carry no fabricated DE/EN/RO alternate for the same slug', () => {
  for (const relPath of ['tools/index.html', 'now/index.html', 'ai/index.html', 'blog/index.html']) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    assert.doesNotMatch(html, /hreflang="de"[^>]*hreflang="en"[^>]*hreflang="ro"/s, `${relPath} must not emit a full DE/EN/RO hreflang set`);
  }
});
