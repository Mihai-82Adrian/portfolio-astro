// Phase 2D-C Wave 1 (Decision 4 / AI-CHAT-JOBFIT-04): /ai is retained as the English-only
// full-page AI/recruiter experience. Requires a prior `npm run build` (see
// verify:route-integrity / verify:route-integrity:built in package.json).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'node-html-parser';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

test('dist/ has been built before running this suite', () => {
  assert.ok(existsSync(path.join(DIST, 'ai', 'index.html')), 'run `npm run build` before this test (see verify:route-integrity)');
});

test('/ai is included in the public route inventory (built as a real page)', () => {
  const html = readFileSync(path.join(DIST, 'ai', 'index.html'), 'utf-8');
  assert.ok(html.length > 0);
});

test('/ai declares English as its content language', () => {
  const html = readFileSync(path.join(DIST, 'ai', 'index.html'), 'utf-8');
  const root = parse(html);
  assert.equal(root.querySelector('html').getAttribute('lang'), 'en');
});

test('/ai is self-canonical and emits no fictitious DE/RO hreflang alternates', () => {
  const html = readFileSync(path.join(DIST, 'ai', 'index.html'), 'utf-8');
  const root = parse(html);
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  assert.equal(canonical, 'https://me-mateescu.de/ai/');

  const alternates = root.querySelectorAll('link[rel="alternate"][hreflang]');
  const byLang = Object.fromEntries(alternates.map((el) => [el.getAttribute('hreflang'), el.getAttribute('href')]));
  assert.deepEqual(Object.keys(byLang).sort(), ['en', 'x-default']);
  assert.equal(byLang.en, 'https://me-mateescu.de/ai/');
  assert.equal(byLang['x-default'], 'https://me-mateescu.de/ai/');
});

// Wave 3 closure: the outer page shell declaring `lang="en"` (test above) does not, by itself,
// make the embedded ChatWidget's own copy English — ChatWidget.astro defaults to German
// (`props.lang || 'de'`) when no `lang` prop is passed. This proved to be exactly the case here
// until src/pages/ai.astro was made to pass `lang="en"` explicitly, discovered via required
// Section 6 live browser acceptance of the deterministic answer path on /ai.
test('/ai embeds ChatWidget with English copy, not the component default (German)', () => {
  const html = readFileSync(path.join(DIST, 'ai', 'index.html'), 'utf-8');
  const root = parse(html);
  const widget = root.querySelector('[data-chat-widget]');
  assert.ok(widget, 'expected the ChatWidget root element on /ai');
  assert.match(widget.text, /Chat Assistant|AI assistant/i);
  assert.doesNotMatch(widget.text, /KI-Assistent/);
});

test('at least one other public page links to /ai (deliberate discoverability affordance)', () => {
  const homepage = readFileSync(path.join(DIST, 'index.html'), 'utf-8');
  const root = parse(homepage);
  const hasAiLink = root.querySelectorAll('a[href]').some((a) => a.getAttribute('href') === '/ai');
  assert.ok(hasAiLink, 'expected at least one deliberate inbound link to /ai from the homepage (e.g. the chat drawer header)');
});
