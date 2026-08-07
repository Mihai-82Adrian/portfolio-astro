import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SOURCE = readFileSync(
  path.join(fileURLToPath(new URL('..', import.meta.url)), 'src/components/common/CookieConsent.astro'),
  'utf8',
);

function extractDefineVarsBlock(source) {
  const start = source.indexOf('define:vars={{');
  assert.ok(start >= 0, 'CookieConsent.astro must declare a define:vars block.');
  const openBrace = source.indexOf('{{', start) + 1;
  let depth = 0;
  let end = openBrace;
  for (let i = openBrace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  return source.slice(openBrace, end);
}

function extractStyleBlock(source) {
  const start = source.indexOf('</style>') >= 0 ? source.lastIndexOf('<style') : -1;
  assert.ok(start >= 0, 'CookieConsent.astro must declare a <style> block.');
  const end = source.indexOf('</style>', start);
  return source.slice(start, end);
}

test('every CSS custom property referenced in CookieConsent.astro is declared by define:vars', () => {
  const varsBlock = extractDefineVarsBlock(SOURCE);
  const declared = new Set([...varsBlock.matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*(?::|,|$)/gm)].map((m) => m[1]));
  // Guard against the extraction itself finding nothing (would make the test vacuously pass).
  assert.ok(declared.size >= 5, `Expected several declared custom properties, found ${declared.size}.`);

  const styleBlock = extractStyleBlock(SOURCE);
  const referenced = [...styleBlock.matchAll(/var\(\s*--([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  assert.ok(referenced.length > 0, 'Expected at least one var(--...) reference in the style block.');

  for (const name of referenced) {
    assert.ok(
      declared.has(name),
      `CSS references var(--${name}) but define:vars never declares "${name}" — this is exactly the class of bug that made the consent banner background invalid/transparent (undefined --color-bg-rgb).`,
    );
  }
});

test('the two former undefined kebab-case custom properties never reappear', () => {
  assert.doesNotMatch(SOURCE, /--color-bg-rgb\b/, 'Regression: --color-bg-rgb was never defined anywhere and made the banner background invalid.');
  assert.doesNotMatch(SOURCE, /--color-accent-rgb\b/, 'Regression: --color-accent-rgb was never defined anywhere.');
});

function extractMediaQueryBlock(source, query) {
  const marker = `@media ${query} {`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Expected a "${query}" media query.`);
  const openBrace = start + marker.length - 1;
  let depth = 0;
  let end = openBrace;
  for (let i = openBrace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  return source.slice(openBrace + 1, end);
}

test('mobile media query gives the consent banner a full-width bottom-sheet layout with safe-area padding and 44px+ touch targets', () => {
  const styleBlock = extractStyleBlock(SOURCE);
  const mobileBlock = extractMediaQueryBlock(styleBlock, '(max-width: 640px)');
  assert.match(mobileBlock, /env\(safe-area-inset-bottom\)/, 'Mobile layout must respect the bottom safe-area inset.');
  assert.match(mobileBlock, /flex-direction:\s*column/, 'Mobile actions must stack full-width rather than wrap inline.');
  assert.match(mobileBlock, /min-height:\s*4[4-9]px/, 'Mobile action buttons must meet the 44px+ touch-target minimum.');
});

function extractRuleBlock(source, selector) {
  const marker = `${selector} {`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Expected a "${selector}" rule.`);
  const openBrace = start + marker.length - 1;
  let depth = 0;
  let end = openBrace;
  for (let i = openBrace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  return source.slice(openBrace + 1, end);
}

test('the consent banner surface is fully opaque (alpha exactly 1) on every viewport, in both light and dark mode', () => {
  const styleBlock = extractStyleBlock(SOURCE);

  assert.doesNotMatch(
    styleBlock,
    /backdrop-filter\s*:/i,
    'Regression: backdrop-filter/-webkit-backdrop-filter was measured as non-functional (computed "none") in the live deployment and must not be reintroduced — it only adds a false impression of a blur effect that never renders.',
  );

  const lightRule = extractRuleBlock(styleBlock, '.cookie-banner');
  assert.doesNotMatch(
    lightRule,
    /background:\s*rgba?\([^)]*,\s*0?\.\d+\s*\)/,
    'Regression: the banner background must not use any alpha < 1 (e.g. the former 0.92) — it must be a fully opaque solid color.',
  );
  assert.match(lightRule, /background:\s*var\(--colorBg\)\s*;/, 'Light-mode banner background must be the solid --colorBg token.');

  const darkRule = extractRuleBlock(styleBlock, ':global(.dark) .cookie-banner');
  assert.doesNotMatch(
    darkRule,
    /background:\s*rgba\(/,
    'Regression: the dark-mode banner background must not use rgba() with any alpha < 1 — it must be a fully opaque solid color.',
  );
  assert.match(darkRule, /background:\s*rgb\(20,\s*20,\s*20\)\s*;/, 'Dark-mode banner background must be a fully opaque rgb() with no alpha channel.');
});
