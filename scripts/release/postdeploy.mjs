#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
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
  await request('/_astro/phase-2c-missing-asset.js', { status: 404 });
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

  return {
    result: 'PASS',
    origin: base.origin,
    releaseId: expectedReleaseId,
    sourceRevision: expectedSourceRevision,
    checks: 17,
    methods: ['GET', 'HEAD'],
    providerCanary: 'not-run',
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
