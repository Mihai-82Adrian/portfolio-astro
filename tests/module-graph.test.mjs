import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyModuleGraph } from '../scripts/release/module-graph.mjs';

const BASE = 'https://me-mateescu.de/';

function fakeFetch(routes) {
  return async (input) => {
    const url = typeof input === 'string' ? input : input.href ?? String(input);
    const path = new URL(url).pathname;
    const route = routes[path];
    if (!route) throw new Error(`fakeFetch: no route registered for ${path}`);
    return new Response(route.body, {
      status: route.status ?? 200,
      headers: { 'content-type': route.contentType ?? 'text/javascript; charset=utf-8' },
    });
  };
}

const HOMEPAGE_HTML = `<!DOCTYPE html><html><head></head><body>
  <script type="module" src="/_astro/entry.ABC123.js"></script>
</body></html>`;

test('follows same-origin static imports and confirms the ai-privacy-notice chunk', async () => {
  const routes = {
    '/': { body: HOMEPAGE_HTML, contentType: 'text/html; charset=utf-8' },
    '/_astro/entry.ABC123.js': { body: `import{t}from"./ai-privacy-notice.DEF456.js";console.log(t);` },
    '/_astro/ai-privacy-notice.DEF456.js': { body: `var a="ai-openai-v2";export{a as t};` },
  };
  const result = await verifyModuleGraph({ baseUrl: BASE, fetchImpl: fakeFetch(routes) });
  assert.equal(result.result, 'PASS');
  assert.equal(result.aiPrivacyNoticeModuleChecked, true);
  assert.deepEqual(result.modules.sort(), ['/_astro/entry.ABC123.js', '/_astro/ai-privacy-notice.DEF456.js'].sort());
});

test('fails closed when a module URL returns HTML instead of JavaScript (wrong content-type)', async () => {
  const routes = {
    '/': { body: HOMEPAGE_HTML, contentType: 'text/html; charset=utf-8' },
    '/_astro/entry.ABC123.js': {
      body: '<!DOCTYPE html><html><body>stale cached page</body></html>',
      contentType: 'text/html; charset=utf-8',
    },
  };
  await assert.rejects(
    () => verifyModuleGraph({ baseUrl: BASE, fetchImpl: fakeFetch(routes) }),
    /expected a JavaScript MIME type/,
  );
});

test('fails closed when a module URL returns a non-200 status', async () => {
  const routes = {
    '/': { body: HOMEPAGE_HTML, contentType: 'text/html; charset=utf-8' },
    '/_astro/entry.ABC123.js': { body: 'not found', status: 404, contentType: 'text/html; charset=utf-8' },
  };
  await assert.rejects(
    () => verifyModuleGraph({ baseUrl: BASE, fetchImpl: fakeFetch(routes) }),
    /returned 404, expected 200/,
  );
});

test('fails closed when a module URL claims a JavaScript content-type but the body is actually HTML', async () => {
  const routes = {
    '/': { body: HOMEPAGE_HTML, contentType: 'text/html; charset=utf-8' },
    '/_astro/entry.ABC123.js': {
      body: '<!doctype html><html><body>mislabeled</body></html>',
      contentType: 'application/javascript',
    },
  };
  await assert.rejects(
    () => verifyModuleGraph({ baseUrl: BASE, fetchImpl: fakeFetch(routes) }),
    /returned HTML content under a JavaScript module URL/,
  );
});

test('fails when the graph never reaches the ai-privacy-notice chunk', async () => {
  const routes = {
    '/': { body: HOMEPAGE_HTML, contentType: 'text/html; charset=utf-8' },
    '/_astro/entry.ABC123.js': { body: `console.log("no imports here");` },
  };
  await assert.rejects(
    () => verifyModuleGraph({ baseUrl: BASE, fetchImpl: fakeFetch(routes) }),
    /never reached the ai-privacy-notice chunk/,
  );
});

test('ignores cross-origin module scripts referenced from the entry page', async () => {
  const html = `<!DOCTYPE html><html><body>
    <script type="module" src="https://evil.example/x.js"></script>
    <script type="module" src="/_astro/entry.ABC123.js"></script>
  </body></html>`;
  const routes = {
    '/': { body: html, contentType: 'text/html; charset=utf-8' },
    '/_astro/entry.ABC123.js': { body: `import{t}from"./ai-privacy-notice.DEF456.js";console.log(t);` },
    '/_astro/ai-privacy-notice.DEF456.js': { body: `var a="ai-openai-v2";export{a as t};` },
  };
  const result = await verifyModuleGraph({ baseUrl: BASE, fetchImpl: fakeFetch(routes) });
  assert.equal(result.result, 'PASS');
  assert.ok(!result.modules.some((entry) => entry.includes('evil.example')));
});
