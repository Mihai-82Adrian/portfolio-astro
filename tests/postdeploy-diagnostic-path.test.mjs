import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveMissingAssetPath, verifyPostdeploy } from '../scripts/release/postdeploy.mjs';

const BASE = 'https://me-mateescu.de/';

test('deriveMissingAssetPath produces a distinct path per release ID', () => {
  const pathA = deriveMissingAssetPath('git-0123456789abcdef');
  const pathB = deriveMissingAssetPath('git-fedcba9876543210');
  assert.notEqual(pathA, pathB);
  assert.match(pathA, /^\/_astro\/postdeploy-missing-0123456789abcdef\.js$/);
  assert.match(pathB, /^\/_astro\/postdeploy-missing-fedcba9876543210\.js$/);
});

test('deriveMissingAssetPath rejects a malformed release ID', () => {
  assert.throws(() => deriveMissingAssetPath('not-a-release-id'), /valid release ID/);
});

const HOME_HTML = `<!DOCTYPE html><html><head>
  <link rel="alternate" hreflang="de" href="https://me-mateescu.de/">
  <link rel="alternate" hreflang="en" href="https://me-mateescu.de/en/">
  <link rel="alternate" hreflang="ro" href="https://me-mateescu.de/ro/">
  <link rel="alternate" hreflang="x-default" href="https://me-mateescu.de/">
</head><body>
  <script type="module" src="/_astro/entry.ABC123.js"></script>
</body></html>`;

// postdeploy.mjs's request() helper asserts response.url === the requested href — a plain
// `new Response(...)` leaves .url empty (browsers/undici only populate it from a real fetch), so
// every fake response here must have it defined explicitly to satisfy that redirect-safety check.
function withUrl(response, url) {
  Object.defineProperty(response, 'url', { value: url, configurable: true });
  return response;
}

function buildFakeFetch(releaseId, sourceRevision) {
  const missingAssetPath = deriveMissingAssetPath(releaseId);
  return async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.href;
    const pathname = new URL(url).pathname;
    const method = init.method ?? 'GET';

    const html = (body, headers = {}) => withUrl(new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy-report-only': 'default-src \'self\'; report-uri /api/csp-report; report-to csp-endpoint',
        'reporting-endpoints': 'csp-endpoint="/api/csp-report"',
        'cache-control': 'public, max-age=3600, must-revalidate',
        ...headers,
      },
    }), url);
    const notFound = () => withUrl(new Response('not found', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } }), url);
    const js = (body) => withUrl(new Response(body, { status: 200, headers: { 'content-type': 'text/javascript; charset=utf-8' } }), url);

    if (pathname === '/') return html(HOME_HTML);
    if (['/en/', '/ro/', '/datenschutz/', '/tools/salary-tax/', '/robots.txt', '/sitemap-index.xml'].includes(pathname)) return html('ok');
    if (pathname === '/phase-2c-missing-document') return notFound();
    if (pathname === missingAssetPath) return notFound();
    if (pathname === '/release-manifest.json') return notFound();
    if (pathname === '/sbom.cdx.json') return notFound();
    if (pathname === '/api/health' && method === 'GET') {
      return withUrl(new Response(JSON.stringify({ data: { release: { releaseId, sourceRevision } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }), url);
    }
    if (pathname === '/api/health' && method === 'HEAD') return withUrl(new Response('', { status: 200 }), url);
    if (pathname === '/api/sample-review' && method === 'HEAD') return withUrl(new Response(null, { status: 204 }), url);
    if (pathname === '/_astro/entry.ABC123.js') return js(`import{t}from"./ai-privacy-notice.DEF456.js";console.log(t);`);
    if (pathname === '/_astro/ai-privacy-notice.DEF456.js') return js(`var a="ai-openai-v2";export{a as t};`);
    throw new Error(`fakeFetch: unexpected request for ${pathname}`);
  };
}

test('two different release IDs derive two different diagnostic paths, each independently returning 404', async () => {
  const releaseA = 'git-1111111111111111';
  const releaseB = 'git-2222222222222222';
  const sourceRevision = 'a'.repeat(40);

  const requestedA = [];
  const requestedB = [];
  const wrap = (fetchImpl, log) => (input, init) => {
    log.push(new URL(typeof input === 'string' ? input : input.href).pathname);
    return fetchImpl(input, init);
  };

  const resultA = await verifyPostdeploy({
    baseUrl: BASE,
    expectedReleaseId: releaseA,
    expectedSourceRevision: sourceRevision,
    fetchImpl: wrap(buildFakeFetch(releaseA, sourceRevision), requestedA),
  });
  const resultB = await verifyPostdeploy({
    baseUrl: BASE,
    expectedReleaseId: releaseB,
    expectedSourceRevision: sourceRevision,
    fetchImpl: wrap(buildFakeFetch(releaseB, sourceRevision), requestedB),
  });

  assert.equal(resultA.result, 'PASS');
  assert.equal(resultB.result, 'PASS');

  const pathA = deriveMissingAssetPath(releaseA);
  const pathB = deriveMissingAssetPath(releaseB);
  assert.notEqual(pathA, pathB);
  assert.ok(requestedA.includes(pathA), 'release A run must request its own derived diagnostic path.');
  assert.ok(requestedB.includes(pathB), 'release B run must request its own derived diagnostic path.');
  assert.ok(!requestedA.includes(pathB), 'release A run must never request release B\'s diagnostic path.');
  assert.ok(!requestedB.includes(pathA), 'release B run must never request release A\'s diagnostic path.');
});

test('verifyPostdeploy fails closed if the derived diagnostic path does not return 404', async () => {
  const releaseId = 'git-3333333333333333';
  const sourceRevision = 'b'.repeat(40);
  const badFetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.href;
    const pathname = new URL(url).pathname;
    if (pathname === deriveMissingAssetPath(releaseId)) {
      return withUrl(new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }), url);
    }
    return buildFakeFetch(releaseId, sourceRevision)(input, init);
  };
  await assert.rejects(
    () => verifyPostdeploy({ baseUrl: BASE, expectedReleaseId: releaseId, expectedSourceRevision: sourceRevision, fetchImpl: badFetch }),
    /expected 404, received 200/,
  );
});

test('verifyPostdeploy fails closed if the missing-asset 404 carries an immutable Cache-Control (Phase 5-D1A-P/R1 regression)', () => {
  const releaseId = 'git-4444444444444444';
  const sourceRevision = 'c'.repeat(40);
  const poisonedFetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.href;
    const pathname = new URL(url).pathname;
    if (pathname === deriveMissingAssetPath(releaseId)) {
      return withUrl(new Response('not found', {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' },
      }), url);
    }
    return buildFakeFetch(releaseId, sourceRevision)(input, init);
  };
  return assert.rejects(
    () => verifyPostdeploy({ baseUrl: BASE, expectedReleaseId: releaseId, expectedSourceRevision: sourceRevision, fetchImpl: poisonedFetch }),
    /must not receive an immutable Cache-Control/,
  );
});
