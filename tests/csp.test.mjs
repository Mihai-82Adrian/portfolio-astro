import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'node-html-parser';
import { installFakeCaches } from './helpers/fake-caches.mjs';
import { textMentionsHost } from './helpers/url-assertions.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
const HEADERS = path.join(DIST, '_headers');
const POLICY_HEADER = 'Content-Security-Policy-Report-Only';
installFakeCaches();

function headerValue(source, name) {
  const line = source.split('\n').find((candidate) => candidate.trimStart().startsWith(`${name}:`));
  return line?.slice(line.indexOf(':') + 1).trim() ?? '';
}

function directives(policy) {
  return new Map(policy.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...values] = part.split(/\s+/);
    return [name, values];
  }));
}

test('built Pages headers expose one deterministic report-only policy and same-origin reporting endpoint', () => {
  assert.ok(existsSync(HEADERS), 'run npm run build before verify:csp');
  const source = readFileSync(HEADERS, 'utf8');
  const policy = headerValue(source, POLICY_HEADER);
  const parsed = directives(policy);

  assert.ok(policy);
  assert.equal(headerValue(source, 'Content-Security-Policy'), '');
  assert.equal(headerValue(source, 'Reporting-Endpoints'), 'csp-endpoint="/api/csp-report"');
  assert.deepEqual([...parsed.keys()], [
    'default-src',
    'base-uri',
    'object-src',
    'form-action',
    'script-src',
    'style-src',
    'img-src',
    'font-src',
    'connect-src',
    'frame-src',
    'media-src',
    'manifest-src',
    'worker-src',
    'report-uri',
    'report-to',
  ]);
  assert.deepEqual(parsed.get('default-src'), ["'self'"]);
  assert.deepEqual(parsed.get('object-src'), ["'none'"]);
  assert.deepEqual(parsed.get('base-uri'), ["'self'"]);
  assert.deepEqual(parsed.get('form-action'), ["'self'"]);
  assert.ok(parsed.get('script-src').includes("'unsafe-inline'"));
  assert.ok(parsed.get('style-src').includes("'unsafe-inline'"));
  assert.equal(policy.includes("'unsafe-eval'"), false);
  assert.equal(policy.includes('*'), false);
  assert.equal(/(?:^|\s)https:(?:\s|;|$)/.test(policy), false);
  assert.equal(textMentionsHost(policy, 'api.openai.com'), false);
  assert.equal(textMentionsHost(policy, 'api.resend.com'), false);
  assert.deepEqual(parsed.get('report-uri'), ['/api/csp-report']);
  assert.deepEqual(parsed.get('report-to'), ['csp-endpoint']);
});

test('policy grants only inventoried browser resource origins, not ordinary external links', () => {
  const policy = headerValue(readFileSync(HEADERS, 'utf8'), POLICY_HEADER);
  const permitted = [...policy.matchAll(/https:\/\/[A-Za-z0-9.-]+/g)].map(([value]) => value);
  assert.deepEqual([...new Set(permitted)].sort(), [
    'https://analytics.ahrefs.com',
    'https://api.github.com',
    'https://giscus.app',
    'https://open.spotify.com',
    'https://www.youtube.com',
  ]);
  const permittedHosts = permitted.map((value) => new URL(value).hostname);
  for (const linkOnly of ['cal.eu', 'www.linkedin.com', 'github.com', 'openai.com']) {
    assert.equal(permittedHosts.includes(linkOnly), false, `${linkOnly} is link-only or server-only`);
  }
  assert.equal(textMentionsHost(policy, 'via.placeholder.com'), false);
});

test('built HTML contains no automatic optional third-party script, frame, or obsolete image load', () => {
  const htmlFiles = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.html')) htmlFiles.push(file);
    }
  };
  visit(DIST);
  for (const file of htmlFiles) {
    const root = parse(readFileSync(file, 'utf8'));
    const resourceUrls = [
      ...root.querySelectorAll('script[src]').map((node) => node.getAttribute('src')),
      ...root.querySelectorAll('iframe[src]').map((node) => node.getAttribute('src')),
      ...root.querySelectorAll('img[src]').map((node) => node.getAttribute('src')),
    ].filter(Boolean);
    assert.equal(
      resourceUrls.some((value) => /analytics\.ahrefs|giscus\.app|youtube\.com|spotify\.com|via\.placeholder\.com/.test(value)),
      false,
      path.relative(DIST, file),
    );
  }
});

async function loadCollector() {
  return import('../functions/api/csp-report.ts');
}

function request(contentType, body, method = 'POST') {
  return new Request('https://me-mateescu.de/api/csp-report?drop=QUERY_CANARY', {
    method,
    headers: {
      'Content-Type': contentType,
      'User-Agent': 'USER_AGENT_CANARY',
      Cookie: 'COOKIE_CANARY',
      Referer: 'https://referrer.example/REFERRER_CANARY',
      'CF-Connecting-IP': '203.0.113.77',
    },
    body: method === 'POST' ? body : undefined,
  });
}

const legacyReport = {
  'csp-report': {
    'document-uri': 'https://me-mateescu.de/page?QUERY_CANARY#FRAGMENT_CANARY',
    referrer: 'https://referrer.example/REFERRER_CANARY',
    'blocked-uri': 'https://analytics.ahrefs.com/path?BLOCKED_QUERY_CANARY',
    'effective-directive': 'script-src-elem',
    disposition: 'report',
    'source-file': 'https://me-mateescu.de/SOURCE_FILE_CANARY.js',
    'script-sample': 'SCRIPT_SAMPLE_CANARY',
    'line-number': 9,
    'column-number': 2,
  },
};

test('collector accepts a legacy report, minimizes it once, and returns an empty no-store 204', async () => {
  const { createHandler } = await loadCollector();
  const lines = [];
  const handler = createHandler({
    releaseId: 'git-0123456789abcdef',
    requestIdFactory: () => '11111111-1111-4111-8111-111111111111',
    logSink: (_level, line) => lines.push(line),
  });
  const response = await handler({ request: request('application/csp-report', JSON.stringify(legacyReport)), env: {} });

  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(lines.length, 2);
  const summary = lines.map(JSON.parse).find((event) => event.event === 'csp.summary');
  assert.deepEqual(summary.cspDirectiveClasses, ['script']);
  assert.deepEqual(summary.cspResourceClasses, ['ahrefs']);
  assert.deepEqual(summary.cspDispositions, ['report']);
  assert.equal(summary.acceptedReportCount, 1);
  assert.equal(summary.droppedReportCount, 0);
  assert.equal(lines.map(JSON.parse).filter((event) => event.event === 'request.completed').length, 1);
  assert.doesNotMatch(
    lines.join(''),
    /CANARY|203\.0\.113\.77|analytics\.ahrefs\.com|document-uri|blocked-uri|script-sample|source-file/i,
  );
});

test('collector accepts a bounded modern batch and maps unknown values to bounded classes', async () => {
  const { createHandler } = await loadCollector();
  const lines = [];
  const handler = createHandler({
    releaseId: 'git-0123456789abcdef',
    logSink: (_level, line) => lines.push(JSON.parse(line)),
  });
  const reports = [
    {
      age: 3,
      type: 'csp-violation',
      url: 'https://me-mateescu.de/private?QUERY_CANARY',
      user_agent: 'USER_AGENT_CANARY',
      body: {
        blockedURL: 'https://unknown-host.example/SECRET_PATH_CANARY',
        effectiveDirective: 'future-src',
        disposition: 'report',
        documentURL: 'https://me-mateescu.de/private',
        sourceFile: 'SOURCE_FILE_CANARY',
        sample: 'SCRIPT_SAMPLE_CANARY',
      },
    },
    {
      age: 4,
      type: 'not-a-csp-report',
      body: { blockedURL: 'https://ignored.example/' },
    },
  ];
  const response = await handler({ request: request('application/reports+json', JSON.stringify(reports)), env: {} });
  assert.equal(response.status, 204);
  const summary = lines.find((event) => event.event === 'csp.summary');
  assert.deepEqual(summary.cspDirectiveClasses, ['other']);
  assert.deepEqual(summary.cspResourceClasses, ['other-external']);
  assert.equal(summary.acceptedReportCount, 1);
  assert.equal(summary.droppedReportCount, 1);
  assert.doesNotMatch(JSON.stringify(lines), /CANARY|unknown-host|ignored\.example/);
});

test('collector bounds empty, malformed, media, method, size, count, depth, strings, and controls', async () => {
  const { createHandler, CSP_MAX_BODY_BYTES, CSP_MAX_REPORTS } = await loadCollector();
  const handler = createHandler({ releaseId: 'git-0123456789abcdef', logSink: () => {} });
  const cases = [
    [request('application/csp-report', ''), 204],
    [request('application/csp-report', '{bad json'), 400],
    [request('application/csp-report', '{"not-a-report":{}}'), 400],
    [request('application/reports+json', '{}'), 400],
    [request('application/json', JSON.stringify(legacyReport)), 415],
    [request('application/csp-report', undefined, 'GET'), 405],
    [request('application/csp-report', 'x'.repeat(CSP_MAX_BODY_BYTES + 1)), 413],
    [request('application/reports+json', JSON.stringify(Array.from({ length: CSP_MAX_REPORTS + 3 }, () => ({
      type: 'csp-violation',
      body: { blockedURL: 'inline', effectiveDirective: 'script-src', disposition: 'report' },
    })))), 204],
    [request('application/csp-report', JSON.stringify({ 'csp-report': { nested: { a: { b: { c: {} } } } } })), 400],
    [request('application/csp-report', JSON.stringify({ 'csp-report': {
      'blocked-uri': `https://example.invalid/${'x'.repeat(300)}`,
      'effective-directive': 'script-src',
    } })), 204],
    [request('application/csp-report', JSON.stringify({ 'csp-report': {
      'blocked-uri': 'inline\r\nLOG_INJECTION_CANARY',
      'effective-directive': 'script-src',
    } })), 204],
  ];
  for (const [input, status] of cases) {
    const response = await handler({ request: input, env: {} });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    if (response.status === 204) assert.equal(await response.text(), '');
  }
});
