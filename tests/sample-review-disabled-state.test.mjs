// Phase 2D-C Wave 1 (Decision 3 / DEBT-02 / FUNNEL-SAMPLEREVIEW-01): HIDE-FROM-LAUNCH.
// While SAMPLE_REVIEW_ENABLED is false, the built page must show a static, honest
// disabled notice instead of a live-looking submission form — no <form> targeting
// /api/sample-review may render, so no request can ever be emitted client-side.
// Requires a prior `npm run build`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { FEATURE_CONTROLS } from '../functions/_lib/feature-controls.ts';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const PAGES = [
  { locale: 'de', file: 'sample-struktur-pruefen/index.html', disabledNoticeSnippet: 'derzeit noch nicht verfügbar' },
  { locale: 'en', file: 'en/sample-structure-review/index.html', disabledNoticeSnippet: 'not yet available' },
  { locale: 'ro', file: 'ro/revizuire-structura-esantion/index.html', disabledNoticeSnippet: 'nu este încă disponibil' },
];

test('dist/ has been built before running this suite', () => {
  assert.ok(existsSync(path.join(DIST, PAGES[0].file)), 'run `npm run build` before this test');
});

test('SAMPLE_REVIEW_ENABLED compiled default is false (backend stays fail-closed)', () => {
  assert.equal(FEATURE_CONTROLS.SAMPLE_REVIEW_ENABLED, false);
});

for (const { locale, file, disabledNoticeSnippet } of PAGES) {
  test(`[${locale}] sample review page shows a static disabled notice, no live submission form`, () => {
    const html = readFileSync(path.join(DIST, file), 'utf-8');

    // No form element posts to the sample-review endpoint — no request can ever be
    // emitted from this page while the feature is off.
    assert.equal(html.includes('action="/api/sample-review"'), false, `${locale}: a live form targeting /api/sample-review must not render while disabled`);

    // The honest, static disabled notice is present in the server-rendered HTML
    // (not JS-dependent — visible even with JavaScript disabled).
    assert.ok(html.includes(disabledNoticeSnippet), `${locale}: expected the disabled notice text to be present`);

    // A bounded contact alternative remains available.
    assert.ok(html.includes('mailto:kontakt@me-mateescu.de'), `${locale}: expected a mailto contact alternative`);
  });
}
