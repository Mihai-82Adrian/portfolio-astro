#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { verifyModuleGraph } from './module-graph.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

// A fixed diagnostic path can itself become a false pass/fail once a stale response has ever been
// cached under it (Phase 4.1-A: an old 200 text/html response stuck at a fixed /_astro/* path for
// ~22h). Deriving the path from the expected release ID gives every release its own never-before-
// requested URL, so this 404 check can never collide with a previous release's edge-cache entry.
export function deriveMissingAssetPath(expectedReleaseId) {
  invariant(/^git-[a-f0-9]{16}$/.test(expectedReleaseId ?? ''), 'deriveMissingAssetPath requires a valid release ID.');
  return `/_astro/postdeploy-missing-${expectedReleaseId.slice('git-'.length)}.js`;
}

export async function verifyPostdeploy({
  baseUrl,
  expectedReleaseId,
  expectedSourceRevision,
  fetchImpl = fetch,
}) {
  const base = new URL(baseUrl);
  invariant(base.protocol === 'https:' || (base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)), 'Base URL must use HTTPS or a local HTTP origin.');
  invariant(base.pathname === '/' && !base.search && !base.hash, 'Base URL must be an origin.');
  invariant(/^git-[a-f0-9]{16}$/.test(expectedReleaseId), 'Expected release ID is invalid.');
  invariant(/^[a-f0-9]{40}$/.test(expectedSourceRevision), 'Expected source revision is invalid.');

  const request = async (pathname, { method = 'GET', status = 200 } = {}) => {
    const url = new URL(pathname, base);
    const response = await fetchImpl(url, { method, redirect: 'manual', headers: { Accept: 'text/html,application/json;q=0.9,*/*;q=0.1' } });
    invariant(response.url === url.href, `${pathname}: unexpected response origin or redirect.`);
    invariant(response.status === status, `${pathname}: expected ${status}, received ${response.status}.`);
    return response;
  };

  const home = await request('/');
  const csp = home.headers.get('content-security-policy-report-only') ?? '';
  invariant(csp.includes('report-uri /api/csp-report') && csp.includes('report-to csp-endpoint'), 'Report-Only CSP reporting declaration is missing.');
  invariant(!home.headers.has('content-security-policy'), 'CSP enforcement is not approved.');
  invariant((home.headers.get('reporting-endpoints') ?? '').includes('"/api/csp-report"'), 'Same-origin Reporting API endpoint is missing.');
  invariant((home.headers.get('cache-control') ?? '').includes('max-age=3600'), 'Homepage cache contract drift.');
  const homeText = await home.text();
  const hreflangs = new Set(
    [...homeText.matchAll(/<link\b[^>]*\bhreflang\s*=\s*(["'])([^"']+)\1[^>]*>/gi)]
      .map((match) => match[2]),
  );
  for (const required of ['de', 'en', 'ro', 'x-default']) {
    invariant(hreflangs.has(required), `Homepage hreflang ${required} alternate is missing.`);
  }

  for (const route of ['/en/', '/ro/', '/datenschutz/', '/tools/salary-tax/', '/robots.txt', '/sitemap-index.xml']) {
    await request(route);
  }
  await request('/phase-2c-missing-document', { status: 404 });
  const missingAsset = await request(deriveMissingAssetPath(expectedReleaseId), { status: 404 });
  // Phase 5-D1A-R1: the 404 fallback for a nonexistent /_astro/*.js path must never inherit a
  // custom immutable Cache-Control merely because its path ends in .js — this is exactly the
  // shape of the Phase 5-D1A-P production incident (a non-JS response cached "immutable" for a
  // year under a hashed module path). public/_headers' /_astro/* detach rule is the fix; this
  // assertion verifies it end-to-end against a real local Wrangler-served response, not just the
  // _headers source text.
  const missingAssetCacheControl = missingAsset.headers.get('cache-control') ?? '';
  invariant(
    !missingAssetCacheControl.includes('immutable'),
    `A missing /_astro/*.js path must not receive an immutable Cache-Control (got: "${missingAssetCacheControl}").`,
  );
  await request('/release-manifest.json', { status: 404 });
  await request('/sbom.cdx.json', { status: 404 });

  const health = await request('/api/health');
  const payload = await health.json();
  invariant(payload?.data?.release?.releaseId === expectedReleaseId, 'Health release ID mismatch.');
  invariant(payload?.data?.release?.sourceRevision === expectedSourceRevision, 'Health source revision mismatch.');
  const head = await request('/api/health', { method: 'HEAD' });
  invariant((await head.text()) === '', 'Health HEAD response must be empty.');
  const sample = await request('/api/sample-review', { method: 'HEAD', status: 204 });
  invariant((await sample.text()) === '', 'Sample Review HEAD response must be empty.');

  const moduleGraph = await verifyModuleGraph({ baseUrl, fetchImpl });

  return {
    result: 'PASS',
    origin: base.origin,
    releaseId: expectedReleaseId,
    sourceRevision: expectedSourceRevision,
    checks: 18,
    methods: ['GET', 'HEAD'],
    providerCanary: 'not-run',
    moduleGraph,
  };
}

async function main() {
  invariant(!process.argv.includes('--allow-provider-canary'), 'Provider canaries require Phase 3 authorization and are not implemented.');
  const summary = await verifyPostdeploy({
    baseUrl: option('--base-url'),
    expectedReleaseId: option('--expected-release-id'),
    expectedSourceRevision: option('--expected-source-revision'),
  });
  const output = option('--output');
  if (output) {
    const resolved = path.resolve(output);
    invariant(resolved.startsWith(path.join(ROOT, '.artifacts') + path.sep), 'Postdeploy output must stay under ignored .artifacts.');
    mkdirSync(path.dirname(resolved), { recursive: true });
    writeFileSync(resolved, `${JSON.stringify(summary, null, 2)}\n`);
  }
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
