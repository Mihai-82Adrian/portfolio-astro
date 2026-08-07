import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = readFileSync(path.join(ROOT, 'src/components/common/CookieConsent.astro'), 'utf8');
const tokens = JSON.parse(readFileSync(path.join(ROOT, 'src/data/design-tokens.json'), 'utf8'));

// --- WCAG 2.x relative-luminance contrast ratio: the one piece of non-trivial
// logic in this file, so it gets its own self-check against known reference
// pairs before anything else trusts it. ---
function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const v = hex[1];
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }
  const rgb = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  throw new Error(`Unsupported color format: "${value}"`);
}

function relativeLuminance(colorValue) {
  const [r, g, b] = parseColor(colorValue);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(colorA, colorB) {
  const lA = relativeLuminance(colorA);
  const lB = relativeLuminance(colorB);
  const [hi, lo] = lA > lB ? [lA, lB] : [lB, lA];
  return (hi + 0.05) / (lo + 0.05);
}

function mixOverOpaqueBg(fgColor, weightPercent, opaqueBg) {
  // Simulates `color-mix(in srgb, fg W%, transparent)` painted over an
  // opaque backdrop: alpha compositing collapses to a linear RGB blend.
  const [fr, fg2, fb] = parseColor(fgColor);
  const [br, bg2, bb] = parseColor(opaqueBg);
  const w = weightPercent / 100;
  const r = Math.round(fr * w + br * (1 - w));
  const g = Math.round(fg2 * w + bg2 * (1 - w));
  const b = Math.round(fb * w + bb * (1 - w));
  return `rgb(${r}, ${g}, ${b})`;
}

test('contrastRatio() matches known WCAG reference pairs', () => {
  assert.ok(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.01, 'black/white must be 21:1');
  assert.ok(Math.abs(contrastRatio('#FFFFFF', '#FFFFFF') - 1) < 0.001, 'identical colors must be 1:1');
  assert.ok(Math.abs(contrastRatio('rgb(0,0,0)', 'rgb(255,255,255)') - 21) < 0.01, 'rgb() form must parse identically to hex');
});

// --- Resolve `tokens.colors.a.b[c]` / `tokens.colors.a.b.c` expressions found
// in the component's define:vars object against the real design-tokens.json,
// so these tests fail if the source ever points at the wrong token — not just
// if the token name string is missing. ---
function resolveTokenPath(expr) {
  const dotted = expr.replace(/\[(\d+)\]/g, '.$1');
  const parts = dotted.split('.').slice(1); // drop leading "tokens"
  let node = tokens;
  for (const part of parts) {
    assert.ok(node && Object.prototype.hasOwnProperty.call(node, part), `Token path "${expr}" does not resolve (stuck at "${part}").`);
    node = node[part];
  }
  assert.equal(typeof node, 'string', `Token path "${expr}" must resolve to a hex color string.`);
  return node;
}

function extractBalanced(source, openIndex) {
  let depth = 0;
  let end = openIndex;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  return { content: source.slice(openIndex + 1, end), end };
}

function extractDefineVarsBlock(source) {
  const start = source.indexOf('define:vars={{');
  assert.ok(start >= 0, 'CookieConsent.astro must declare a define:vars block.');
  const openBrace = source.indexOf('{{', start) + 1;
  return extractBalanced(source, openBrace).content;
}

function extractStyleBlock(source) {
  const start = source.lastIndexOf('<style');
  assert.ok(start >= 0, 'CookieConsent.astro must declare a <style> block.');
  const end = source.indexOf('</style>', start);
  return source.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, ''); // strip comments so they can't contaminate selector-header parsing
}

function resolveDefineVars(source) {
  const block = extractDefineVarsBlock(source);
  const vars = {};
  for (const rawEntry of block.split(',')) {
    const entry = rawEntry.trim();
    const colonIdx = entry.indexOf(':');
    if (colonIdx === -1) continue; // shorthand prop (e.g. colorAccentRgb) — not a color path
    const name = entry.slice(0, colonIdx).trim();
    const expr = entry.slice(colonIdx + 1).trim();
    if (expr.startsWith('tokens.colors.')) vars[name] = resolveTokenPath(expr);
  }
  return vars;
}

// Every top-level CSS rule as { selectors: string[], body }. @media blocks are
// unwrapped one level so their nested rules are collected too (with their
// selectors as written — this project's only media query never re-colors
// text, verified by a dedicated test below).
function collectRules(source) {
  const rules = [];
  let i = 0;
  while (i < source.length) {
    const brace = source.indexOf('{', i);
    if (brace === -1) break;
    const header = source.slice(i, brace).trim();
    const { content, end } = extractBalanced(source, brace);
    if (header.startsWith('@media')) {
      rules.push(...collectRules(content));
    } else if (header) {
      const selectors = header.split(',').map((s) => s.trim().replace(/\s+/g, ' '));
      rules.push({ selectors, body: content });
    }
    i = end + 1;
  }
  return rules;
}

function findRule(rules, selector) {
  const match = rules.find((r) => r.selectors.includes(selector));
  assert.ok(match, `Expected a standalone rule for selector "${selector}".`);
  return match.body;
}

function colorPropertyExpr(rules, selector, prop = 'color') {
  // A selector can appear in more than one rule (e.g. the shared
  // ".btn-accept, .btn-reject, .btn-settings { padding: ... }" base plus its
  // own specific rule) — search every rule that selector participates in,
  // not just the first, for the one that actually declares this property.
  const candidates = rules.filter((r) => r.selectors.includes(selector));
  assert.ok(candidates.length > 0, `Expected a rule for selector "${selector}".`);
  for (const r of candidates) {
    const match = r.body.match(new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+);`));
    if (match) return match[1].trim();
  }
  assert.fail(`Expected "${selector}" to set ${prop} in one of its rules.`);
}

// Resolves either `var(--name)` (looked up in the define:vars map) or a
// literal color (#hex / rgb()) straight through.
function resolveColorExpr(expr, vars) {
  const varRef = expr.match(/^var\(--([\w$]+)\)$/);
  if (varRef) {
    assert.ok(varRef[1] in vars, `Referenced var --${varRef[1]} is not declared by define:vars.`);
    return vars[varRef[1]];
  }
  return expr;
}

const styleBlock = extractStyleBlock(SOURCE);
const cssVars = resolveDefineVars(SOURCE);
const rules = collectRules(styleBlock);
const darkBg = 'rgb(20, 20, 20)';

test('the dark banner background is the documented opaque literal', () => {
  const bannerDarkBg = colorPropertyExpr(rules, ':global(.dark) .cookie-banner', 'background');
  assert.equal(bannerDarkBg, darkBg);
});

// Ground truth for the reported defect: these are the exact colors the
// banner rendered with before the fix (light-mode ink on the rgb(20,20,20)
// dark banner). If a future edit reverts the dark override, these must fail.
test('the previously reported light-token colors fail WCAG AA on the dark banner background', () => {
  assert.ok(contrastRatio('#2C2C2C', darkBg) < 4.5, 'title ink #2C2C2C on #141414 must read as a documented failure');
  assert.ok(contrastRatio('#5A5A5A', darkBg) < 4.5, 'description ink #5A5A5A on #141414 must read as a documented failure');
  assert.ok(contrastRatio('#4A6451', darkBg) < 4.5, 'accent/link ink #4A6451 on #141414 must read as a documented failure');
});

function darkColor(selector, prop = 'color') {
  const expr = colorPropertyExpr(rules, `:global(.dark) ${selector}`, prop);
  return resolveColorExpr(expr, cssVars);
}

function lightColor(selector, prop = 'color') {
  const expr = colorPropertyExpr(rules, selector, prop);
  return resolveColorExpr(expr, cssVars);
}

test('dark summary layer at 360x800 — title and description meet contrast targets', () => {
  const titleRatio = contrastRatio(darkColor('.cookie-title'), darkBg);
  const descRatio = contrastRatio(darkColor('.cookie-description'), darkBg);
  assert.ok(titleRatio >= 7, `.cookie-title must hit the AAA 7:1 target, got ${titleRatio.toFixed(2)}:1`);
  assert.ok(descRatio >= 7, `.cookie-description must hit the AAA 7:1 target, got ${descRatio.toFixed(2)}:1`);
});

test('dark summary layer at 421x869 — layout media query introduces no color override, so the 360x800 result still holds', () => {
  const mobileMarker = '@media (max-width: 640px) {';
  const mobileStart = styleBlock.indexOf(mobileMarker);
  assert.ok(mobileStart >= 0, 'Expected the mobile layout media query.');
  const mobileBlock = extractBalanced(styleBlock, mobileStart + mobileMarker.length - 1).content;
  assert.doesNotMatch(mobileBlock, /\bcolor\s*:/, 'Mobile breakpoint must not re-color any consent-banner text (would make contrast viewport-dependent).');
  const titleRatio = contrastRatio(darkColor('.cookie-title'), darkBg);
  assert.ok(titleRatio >= 7);
});

test('dark link meets 4.5:1 minimum', () => {
  const ratio = contrastRatio(darkColor('.cookie-link'), darkBg);
  assert.ok(ratio >= 4.5, `.cookie-link must hit at least 4.5:1, got ${ratio.toFixed(2)}:1`);
});

test('dark Settings button reads as an active control, not disabled', () => {
  const ratio = contrastRatio(darkColor('.btn-settings'), darkBg);
  assert.ok(ratio >= 4.5, `.btn-settings text must hit at least 4.5:1, got ${ratio.toFixed(2)}:1`);
});

test('dark settings layer — toggle label, meta, and description meet contrast targets', () => {
  const labelRatio = contrastRatio(darkColor('.cookie-toggle-label'), darkBg);
  const metaRatio = contrastRatio(darkColor('.cookie-toggle-meta'), darkBg);
  const descRatio = contrastRatio(darkColor('.cookie-toggle-desc'), darkBg);
  assert.ok(labelRatio >= 7, `.cookie-toggle-label must hit 7:1, got ${labelRatio.toFixed(2)}:1`);
  assert.ok(metaRatio >= 4.5, `.cookie-toggle-meta must hit 4.5:1, got ${metaRatio.toFixed(2)}:1`);
  assert.ok(descRatio >= 7, `.cookie-toggle-desc must hit 7:1, got ${descRatio.toFixed(2)}:1`);
});

test('light mode is unchanged — same elements still meet their targets against the light banner', () => {
  const lightBg = cssVars.colorBg;
  assert.ok(contrastRatio(lightColor('.cookie-title'), lightBg) >= 7);
  assert.ok(contrastRatio(lightColor('.cookie-description'), lightBg) >= 4.5);
  assert.ok(contrastRatio(lightColor('.cookie-link'), lightBg) >= 4.5);
});

test('dark .btn-accept text is legible on the light accent surface (regression: hardcoded white text)', () => {
  const lightInk = colorPropertyExpr(rules, '.btn-accept', 'color');
  assert.equal(lightInk, 'white', 'Light-mode .btn-accept must keep its white text.');
  const darkSurface = darkColor('.btn-accept', 'background');
  const darkInk = darkColor('.btn-accept', 'color');
  const ratioLight = contrastRatio('#FFFFFF', darkSurface);
  const ratioFixed = contrastRatio(darkInk, darkSurface);
  assert.ok(ratioLight < 4.5, `sanity check: white on the dark accent surface should itself be a documented failure, got ${ratioLight.toFixed(2)}:1`);
  assert.ok(ratioFixed >= 4.5, `.btn-accept dark-mode text must hit 4.5:1 against its dark-mode surface, got ${ratioFixed.toFixed(2)}:1`);
});

test('dark .btn-reject stays legible once its composited surface flips (regression: light-on-light after a naive token swap)', () => {
  const bgExpr = colorPropertyExpr(rules, ':global(.dark) .btn-reject', 'background');
  const bgMatch = bgExpr.match(/^color-mix\(in srgb,\s*var\(--([\w$]+)\)\s*(\d+)%,\s*transparent\)$/);
  assert.ok(bgMatch, ':global(.dark) .btn-reject background must be a color-mix() of a dark-mode ink var over transparent.');
  const mixColor = cssVars[bgMatch[1]];
  assert.ok(mixColor, `color-mix references undeclared var --${bgMatch[1]}.`);
  const weight = Number(bgMatch[2]);
  const effectiveBg = mixOverOpaqueBg(mixColor, weight, darkBg);
  const ink = darkColor('.btn-reject');
  const ratio = contrastRatio(ink, effectiveBg);
  assert.ok(ratio >= 4.5, `.btn-reject dark-mode text must hit 4.5:1 against its composited background, got ${ratio.toFixed(2)}:1`);
});

test('dark focus-visible ring color meets the 3:1 non-text minimum against the banner surface', () => {
  const ring = tokens.colors.eucalyptus[400]; // matches global.css `dark:focus-visible:ring-eucalyptus-400`
  const ratio = contrastRatio(ring, darkBg);
  assert.ok(ratio >= 3, `dark focus ring must hit at least 3:1 against the banner surface, got ${ratio.toFixed(2)}:1`);
  assert.doesNotMatch(styleBlock, /outline:\s*none/, 'CookieConsent must not suppress the global focus-visible outline.');
});

test('dark overrides never reassign the base custom properties themselves (would be shadowed by define:vars inlining every element)', () => {
  const darkBannerRule = findRule(rules, ':global(.dark) .cookie-banner');
  assert.doesNotMatch(
    darkBannerRule,
    /--color\w*:/,
    'Reassigning --colorText/--colorAccent/etc. inside a class-based dark rule cannot win: Astro\'s define:vars inlines those exact custom properties on every element in this component, and an inline (non-!important) declaration always beats an external stylesheet rule for the same property on the same element. Override the resolved color/background/border property instead.',
  );
});
