#!/usr/bin/env node
// Phase 2D-C Wave 1: permanent built-output verifier for the owner's "no more 404 pages"
// launch policy. Scans every built dist/**/*.html file for same-origin references
// (internal anchors, nav, footer, CTAs, canonical, hreflang, RSS/Atom head links,
// JSON-LD structured-data URLs, OG/Twitter/icon/manifest metadata, form actions) and
// the tracked `_redirects` contract, and fails if any resolves to a route that does not
// exist in the build. Also verifies every sitemap URL. Ignores external URLs,
// mailto:/tel:, and in-page fragments.
//
// Closure note (Phase 2D-C Wave 1 acceptance): `--strict` was previously parsed but had
// no effect on outcomes. It now gates a distinct class of findings — malformed same-origin
// URL strings and unclassifiable dynamic redirect rules — that standard mode reports as
// warnings (visibility without failure) because they are "we cannot fully prove this"
// cases, not confirmed dead references. Confirmed dead references (a redirect destination,
// JSON-LD URL, metadata asset, or form action that resolves to a route absent from the
// build; a structurally malformed `_redirects` line; malformed JSON-LD) always fail in
// both modes — that is the core defect class this verifier exists to catch permanently.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parse } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const { values: args } = parseArgs({
  options: { strict: { type: 'boolean', default: false } },
});

const SITE_ORIGIN = 'https://me-mateescu.de';

const URL_KEYS = new Set(['url', '@id', 'sameAs', 'image', 'logo', 'contentUrl', 'mainEntityOfPage']);

export function normalizePathname(pathname) {
  if (!pathname) return '/';
  let p = pathname;
  if (!p.startsWith('/')) p = `/${p}`;
  const isFileLike = /\.[a-zA-Z0-9]+$/.test(p);
  if (p !== '/' && !isFileLike && !p.endsWith('/')) p += '/';
  return p;
}

export async function buildKnownRouteSet(distDir = DIST, rootDir = ROOT) {
  const htmlFiles = await glob('**/*.html', { cwd: distDir });
  const known = new Set();
  for (const rel of htmlFiles) {
    const routePath = '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
    known.add(normalizePathname(routePath));
  }
  // Non-HTML same-origin assets/feeds that pages legitimately link to.
  const otherFiles = await glob('**/*.{xml,txt,json,ico,webmanifest}', { cwd: distDir });
  for (const rel of otherFiles) known.add('/' + rel);
  // Any static asset under dist (images, fonts, generated _astro chunks, etc.)
  const assetFiles = await glob('**/*', { cwd: distDir, nodir: true });
  for (const rel of assetFiles) known.add('/' + rel);
  // Pages Functions are real same-origin endpoints (e.g. form actions) that never appear
  // as built dist/**/*.html output — they are compiled separately by the Pages runtime.
  const functionsDir = path.join(rootDir, 'functions', 'api');
  if (existsSync(functionsDir)) {
    const functionFiles = await glob('**/*.{ts,js}', { cwd: functionsDir });
    for (const rel of functionFiles) {
      known.add(normalizePathname('/api/' + rel.replace(/\.(ts|js)$/, '')));
    }
  }
  return known;
}

function isIgnorable(href) {
  if (!href) return true;
  if (href.startsWith('#')) return true;
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return true;
  if (href.startsWith('data:') || href.startsWith('blob:') || href.startsWith('javascript:')) return true;
  return false;
}

function toSameOriginPathname(href, baseHref) {
  let url;
  try {
    url = new URL(href, baseHref);
  } catch {
    return null; // unparseable — not our concern here
  }
  if (url.origin !== SITE_ORIGIN) return null; // external — not checked here
  // decodeURIComponent: the known-route set is built from raw filesystem names
  // (which may contain spaces/umlauts), while URL parsing percent-encodes them.
  return normalizePathname(decodeURIComponent(url.pathname));
}

// Classifies an arbitrary reference value (JSON-LD URL, metadata content/href, form
// action) that is expected to sometimes be same-origin. Unlike `toSameOriginPathname`
// (used for the original anchor/canonical/hreflang/feed checks, whose semantics are
// unchanged), this distinguishes a genuinely malformed value from an external one so
// callers can gate malformed values behind `--strict`.
export function classifySameOriginReference(value, baseHref, siteOrigin = SITE_ORIGIN) {
  if (typeof value !== 'string' || value.length === 0) return { type: 'malformed' };
  if (isIgnorable(value)) return { type: 'ignorable' };
  let url;
  try {
    url = new URL(value, baseHref);
  } catch {
    return { type: 'malformed' };
  }
  if (url.origin !== siteOrigin) return { type: 'external' };
  return { type: 'same-origin', pathname: normalizePathname(decodeURIComponent(url.pathname)) };
}

export function collectJsonLdUrls(node, found = []) {
  if (node == null || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdUrls(item, found);
    return found;
  }
  for (const [key, value] of Object.entries(node)) {
    // Plain-object and object-in-array `@id` references (e.g. `{ mainEntityOfPage: { '@id':
    // '...' } }`) are intentionally not special-cased here: `@id` is itself a URL_KEYS
    // entry, so the unconditional recursion below already discovers them exactly once.
    if (URL_KEYS.has(key) && typeof value === 'string') {
      found.push(value);
    } else if (URL_KEYS.has(key) && Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') found.push(entry);
      }
    }
    if (value && typeof value === 'object') collectJsonLdUrls(value, found);
  }
  return found;
}

const METADATA_META_SELECTORS = [
  ['meta[property="og:url"]', 'content'],
  ['meta[property="og:image"]', 'content'],
  ['meta[name="twitter:image"]', 'content'],
];
const METADATA_LINK_SELECTORS = ['link[rel="icon"]', 'link[rel="apple-touch-icon"]', 'link[rel="manifest"]', 'link[rel="mask-icon"]'];

export function collectMetadataTargets(root) {
  const targets = [];
  for (const [selector, attr] of METADATA_META_SELECTORS) {
    for (const el of root.querySelectorAll(selector)) {
      const value = el.getAttribute(attr);
      if (value) targets.push({ kind: selector, value });
    }
  }
  for (const selector of METADATA_LINK_SELECTORS) {
    for (const el of root.querySelectorAll(selector)) {
      const value = el.getAttribute('href');
      if (value) targets.push({ kind: selector, value });
    }
  }
  return targets;
}

export function collectFormActions(root) {
  return root.querySelectorAll('form').map((form) => ({ action: form.getAttribute('action') ?? null }));
}

// `_redirects` (Cloudflare Pages / Netlify format): "SOURCE DESTINATION [STATUS]" per
// line, comments start with `#`. Source paths are intentionally NOT required to exist as
// built HTML pages (they are redirect triggers, not pages).
export function parseRedirects(text) {
  const records = [];
  text.split('\n').forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) {
      records.push({ line: index + 1, raw: trimmed, malformed: true, reason: 'expected "SOURCE DESTINATION [STATUS]"' });
      return;
    }
    const [source, destination, status] = parts;
    if (status !== undefined && !/^\d{3}$/.test(status)) {
      records.push({ line: index + 1, raw: trimmed, malformed: true, reason: `invalid status code "${status}"` });
      return;
    }
    records.push({ line: index + 1, raw: trimmed, malformed: false, source, destination, status: status ?? null });
  });
  return records;
}

// Classifies a redirect destination as external (skip), static (must resolve exactly),
// dynamic (only the statically provable prefix before the first `:name`/`*` token is
// validated — the substituted remainder cannot be proven without a request), or
// unclassifiable (a dynamic-looking rule this verifier does not understand well enough
// to partially validate; `--strict` fails these rather than silently ignoring them).
export function classifyRedirectDestination(destination) {
  if (typeof destination !== 'string' || destination.length === 0) return { type: 'malformed' };
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(destination)) return { type: 'external' };
  if (!destination.startsWith('/')) return { type: 'malformed' };
  if (!/[:*]/.test(destination)) return { type: 'static', pathname: destination };
  const validDynamic = /^\/[\w\-./]*(?::[A-Za-z_]\w*|\*)[\w\-./]*$/.test(destination);
  if (!validDynamic) return { type: 'unclassifiable' };
  const idx = destination.search(/[:*]/);
  return { type: 'dynamic', prefix: destination.slice(0, idx) };
}

export async function verify(distDir = DIST, rootDir = ROOT, { strict = false } = {}) {
  const known = await buildKnownRouteSet(distDir, rootDir);
  const htmlFiles = await glob('**/*.html', { cwd: distDir });

  const failures = [];
  const warnings = [];
  let checked = 0;

  for (const rel of htmlFiles) {
    const fileRoutePath = normalizePathname('/' + rel.replace(/index\.html$/, '').replace(/\.html$/, ''));
    const baseHref = `${SITE_ORIGIN}${fileRoutePath}`;
    const html = await fs.readFile(path.join(distDir, rel), 'utf-8');
    const root = parse(html, { comment: false });

    const refs = [];
    for (const a of root.querySelectorAll('a[href]')) {
      refs.push({ kind: 'internal-link', href: a.getAttribute('href') });
    }
    for (const link of root.querySelectorAll('link[rel="canonical"]')) {
      refs.push({ kind: 'canonical', href: link.getAttribute('href') });
    }
    for (const link of root.querySelectorAll('link[rel="alternate"][hreflang]')) {
      refs.push({ kind: `hreflang:${link.getAttribute('hreflang')}`, href: link.getAttribute('href') });
    }
    for (const link of root.querySelectorAll('link[rel="alternate"][type]')) {
      refs.push({ kind: 'feed-link', href: link.getAttribute('href') });
    }

    for (const { kind, href } of refs) {
      if (isIgnorable(href)) continue;
      const pathname = toSameOriginPathname(href, baseHref);
      if (pathname === null) continue; // external, skip
      checked++;
      if (!known.has(pathname)) {
        failures.push({ file: rel, kind, href, resolved: pathname });
      }
    }

    for (const scriptEl of root.querySelectorAll('script[type="application/ld+json"]')) {
      checked++;
      let parsed;
      try {
        parsed = JSON.parse(scriptEl.rawText);
      } catch {
        failures.push({ file: rel, kind: 'json-ld-malformed', href: '(inline script)', resolved: null });
        continue;
      }
      for (const raw of collectJsonLdUrls(parsed)) {
        const classification = classifySameOriginReference(raw, baseHref);
        if (classification.type === 'ignorable' || classification.type === 'external') continue;
        if (classification.type === 'malformed') {
          warnings.push({ file: rel, kind: 'json-ld-url-malformed', href: raw, resolved: null });
          continue;
        }
        checked++;
        if (!known.has(classification.pathname)) {
          failures.push({ file: rel, kind: 'json-ld-url', href: raw, resolved: classification.pathname });
        }
      }
    }

    for (const { kind, value } of collectMetadataTargets(root)) {
      const classification = classifySameOriginReference(value, baseHref);
      if (classification.type === 'ignorable' || classification.type === 'external') continue;
      if (classification.type === 'malformed') {
        warnings.push({ file: rel, kind: `metadata:${kind}-malformed`, href: value, resolved: null });
        continue;
      }
      checked++;
      if (!known.has(classification.pathname)) {
        failures.push({ file: rel, kind: `metadata:${kind}`, href: value, resolved: classification.pathname });
      }
    }

    for (const { action } of collectFormActions(root)) {
      if (!action) continue; // explicitly allowed: browser-default self-submission
      const classification = classifySameOriginReference(action, baseHref);
      if (classification.type === 'ignorable' || classification.type === 'external') continue;
      if (classification.type === 'malformed') {
        warnings.push({ file: rel, kind: 'form-action-malformed', href: action, resolved: null });
        continue;
      }
      checked++;
      if (!known.has(classification.pathname)) {
        failures.push({ file: rel, kind: 'form-action', href: action, resolved: classification.pathname });
      }
    }
  }

  // Sitemap URLs
  const sitemapFiles = await glob('sitemap*.xml', { cwd: distDir });
  for (const rel of sitemapFiles) {
    const xml = await fs.readFile(path.join(distDir, rel), 'utf-8');
    const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
    for (const [, loc] of locMatches) {
      if (loc.endsWith('.xml')) continue; // sitemap-index entries pointing at other sitemaps
      const pathname = toSameOriginPathname(loc, SITE_ORIGIN);
      if (pathname === null) continue;
      checked++;
      if (!known.has(pathname)) {
        failures.push({ file: rel, kind: 'sitemap-loc', href: loc, resolved: pathname });
      }
    }
  }

  // `_redirects`
  const redirectsPath = path.join(rootDir, 'public', '_redirects');
  if (existsSync(redirectsPath)) {
    const text = await fs.readFile(redirectsPath, 'utf-8');
    for (const record of parseRedirects(text)) {
      checked++;
      if (record.malformed) {
        failures.push({ file: '_redirects', kind: 'redirect-malformed', href: record.raw, resolved: null, reason: record.reason });
        continue;
      }
      const classification = classifyRedirectDestination(record.destination);
      if (classification.type === 'external') continue;
      if (classification.type === 'malformed') {
        failures.push({ file: '_redirects', kind: 'redirect-malformed', href: record.destination, resolved: null });
        continue;
      }
      if (classification.type === 'unclassifiable') {
        warnings.push({ file: '_redirects', kind: 'redirect-unclassifiable-dynamic', href: record.destination, resolved: null });
        continue;
      }
      if (classification.type === 'static') {
        const pathname = normalizePathname(classification.pathname);
        if (!known.has(pathname)) {
          failures.push({ file: '_redirects', kind: 'redirect-destination', href: record.destination, resolved: pathname });
        }
        continue;
      }
      // dynamic: only the statically provable prefix is checked.
      const prefix = normalizePathname(classification.prefix || '/');
      const prefixKnown = known.has(prefix) || [...known].some((k) => k.startsWith(prefix));
      if (!prefixKnown) {
        failures.push({ file: '_redirects', kind: 'redirect-dynamic-prefix', href: record.destination, resolved: prefix });
      }
    }
  }

  return { failures, warnings, checked, pages: htmlFiles.length };
}

async function main() {
  try {
    await fs.access(DIST);
  } catch {
    console.error('verify-route-integrity: dist/ not found — run `npm run build` first.');
    process.exit(1);
  }

  const { failures, warnings, checked, pages } = await verify(DIST, ROOT, { strict: args.strict });
  const effectiveFailures = args.strict ? [...failures, ...warnings] : failures;

  if (warnings.length > 0 && !args.strict) {
    console.warn(`verify-route-integrity: ${warnings.length} unclassified/malformed reference(s) found (not failing — run with --strict to enforce):`);
    for (const w of warnings.slice(0, 200)) {
      console.warn(`  [${w.kind}] ${w.file} -> ${w.href}`);
    }
  }

  if (effectiveFailures.length > 0) {
    console.error(`verify-route-integrity: FAIL — ${effectiveFailures.length} finding(s) (checked ${checked} references across ${pages} pages, ${args.strict ? 'strict' : 'standard'} mode).`);
    for (const f of effectiveFailures.slice(0, 200)) {
      console.error(`  [${f.kind}] ${f.file} -> ${f.href} (resolved ${f.resolved ?? 'n/a'})${f.reason ? ` — ${f.reason}` : ''}`);
    }
    process.exit(1);
  }

  console.log(`verify-route-integrity: PASS — 0 dead same-origin references across ${checked} checked references in ${pages} pages (${args.strict ? 'strict' : 'standard'} mode).`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
