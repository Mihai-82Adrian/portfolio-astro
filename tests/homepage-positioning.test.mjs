// Wave 4 (Homepage, Positioning and Service Funnel): proves the Fin-Tools Hub is discoverable
// from the homepage's primary "what I do" hub in all three locales, and that the sitewide footer
// no longer frames the Fin-Tools Hub / applied-AI work as a mere hobby — both were concrete
// findings (POS-02, POS-04) in PHASE_2D_C_WAVE4_POSITIONING_REGISTER.md.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { translations } from '../src/data/translations.ts';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const HOMEPAGE_BY_LOCALE = {
  de: 'index.html',
  en: 'en/index.html',
  ro: 'ro/index.html',
};

test('dist/ has been built before running this suite', () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'run `npm run build` before this test');
});

for (const [locale, relPath] of Object.entries(HOMEPAGE_BY_LOCALE)) {
  test(`[${locale}] homepage links the Fin-Tools Hub from the primary "what I do" hub`, () => {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    assert.match(html, /href="\/tools"/, 'homepage must link /tools');
    assert.match(html, /Fin-Tools Hub/, 'homepage must name the Fin-Tools Hub explicitly');
  });

  test(`[${locale}] home.subtitle names FinTech, not only a generic accountant identity`, () => {
    const subtitle = translations[locale].home.subtitle;
    assert.match(subtitle, /FinTech/i);
  });
}

test('footer.description no longer frames the Fin-Tools Hub / applied AI work as a hobby, in any tracked locale', () => {
  for (const locale of ['de', 'en', 'ro']) {
    const description = translations[locale].footer.description;
    assert.doesNotMatch(description, /Hobby/i, `${locale} footer description must not demote FinTech/AI work to a hobby`);
    assert.match(description, /Fin-Tools Hub/i, `${locale} footer description must name the Fin-Tools Hub`);
  }
});

// Acceptance closure (POS-11 through POS-13, PHASE_2D_C_WAVE4_POSITIONING_REGISTER.md): the
// Fin-Tools Hub is German-only/DACH-scoped, so the homepage card linking to it from every locale
// must carry a visible language/jurisdiction disclosure — not buried in title/aria-label/metadata.
test('[de] Fin-Tools Hub card communicates Germany/DACH relevance', () => {
  const html = readFileSync(path.join(DIST, HOMEPAGE_BY_LOCALE.de), 'utf8');
  assert.match(html, /deutsche Finanz- und Steuervorgaben/, 'DE card must name German/DACH relevance in visible copy');
});

test('[en] Fin-Tools Hub card visibly discloses German-language availability before navigation', () => {
  const html = readFileSync(path.join(DIST, HOMEPAGE_BY_LOCALE.en), 'utf8');
  assert.match(html, /Available in German/, 'EN card must visibly state the tools are in German');
  assert.match(html, /German\/DACH/, 'EN card must visibly state German/DACH scope');
});

test('[ro] Fin-Tools Hub card visibly discloses German-language availability before navigation', () => {
  const html = readFileSync(path.join(DIST, HOMEPAGE_BY_LOCALE.ro), 'utf8');
  assert.match(html, /limba german/i, 'RO card must visibly state the tools are in German');
  assert.match(html, /Germania\/DACH/, 'RO card must visibly state German/DACH scope');
});

test('corrected DE about.description no longer contains the invalid ungrammatical phrase', () => {
  const description = translations.de.about.description;
  assert.doesNotMatch(
    description,
    /Entwickler des Fin-Tools Hub und angewandte KI-Systeme/,
    'DE about.description must not regress to the case-disagreement phrasing'
  );
  assert.match(description, /Fin-Tools Hub/);
});
