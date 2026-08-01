// Guards the owner-locked route-language policy (Phase 2D-C Wave 1):
// intentionally single-language routes (Blog, Tools, /now, /ai, /projects) must
// never emit hreflang alternates for /en//ro/ variants that do not exist, while
// genuine DE/EN/RO route families keep full path-substitution alternates.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSingleLanguageRoute,
  getRouteAlternateUrls,
  getAlternateUrls,
} from '../src/utils/i18n.ts';

const SITE = 'https://me-mateescu.de';

test('locked single-language routes are recognized by exact path and by subpath', () => {
  assert.equal(getSingleLanguageRoute('/blog'), 'en');
  assert.equal(getSingleLanguageRoute('/blog/some-post'), 'en');
  assert.equal(getSingleLanguageRoute('/blog/category/fintech'), 'en');
  assert.equal(getSingleLanguageRoute('/tools'), 'de');
  assert.equal(getSingleLanguageRoute('/tools/xrechnung'), 'de');
  assert.equal(getSingleLanguageRoute('/now'), 'en');
  assert.equal(getSingleLanguageRoute('/ai'), 'en');
  assert.equal(getSingleLanguageRoute('/projects'), 'en');
  assert.equal(getSingleLanguageRoute('/projects/gds'), 'en');
});

test('locked single-language routes do not falsely match unrelated prefixes', () => {
  assert.equal(getSingleLanguageRoute('/nowhere'), null);
  assert.equal(getSingleLanguageRoute('/aikido'), null);
  assert.equal(getSingleLanguageRoute('/toolshed'), null);
  assert.equal(getSingleLanguageRoute('/projectsomething'), null);
});

test('genuine DE/EN/RO route families are not locked', () => {
  for (const path of ['/about', '/en/about', '/ro/about', '/services', '/discovery-call']) {
    assert.equal(getSingleLanguageRoute(path), null, `${path} must not be a locked single-language route`);
  }
});

test('getRouteAlternateUrls narrows locked routes to self + x-default only', () => {
  for (const [path, lang] of [
    ['/tools/xrechnung', 'de'],
    ['/now', 'en'],
    ['/ai', 'en'],
    ['/blog/some-post', 'en'],
    ['/projects/gds', 'en'],
  ]) {
    const urls = getRouteAlternateUrls(path, SITE);
    assert.deepEqual(Object.keys(urls).sort(), [lang, 'x-default'].sort(), `${path} must emit only its real language + x-default`);
    assert.equal(urls[lang], urls['x-default'], `${path}: self-referencing hreflang must equal x-default`);
    assert.ok(urls[lang].endsWith(path.endsWith('/') ? path : `${path}/`) || urls[lang].includes(path), `${path}: hreflang target must point at the real route itself, not a translated variant`);
    // must never claim a translation into the other two languages
    for (const otherLang of ['de', 'en', 'ro'].filter((l) => l !== lang)) {
      assert.ok(!(otherLang in urls), `${path} must not emit an hreflang alternate for '${otherLang}'`);
    }
  }
});

test('getRouteAlternateUrls falls through to full path-substitution for genuine DE/EN/RO routes', () => {
  const urls = getRouteAlternateUrls('/about', SITE);
  const expected = getAlternateUrls('/about', SITE);
  assert.deepEqual(urls, expected);
  assert.deepEqual(Object.keys(urls).sort(), ['de', 'en', 'ro', 'x-default'].sort());
});
