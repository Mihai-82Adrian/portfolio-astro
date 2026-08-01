import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createManifest } from '../scripts/release/provenance.mjs';
import { verifyPostdeploy } from '../scripts/release/postdeploy.mjs';
import { planRollback } from '../scripts/release/rollback.mjs';

const REVISION = 'a'.repeat(40);
const RELEASE_ID = 'git-0123456789abcdef';
const ALTERNATE_LINKS = [
  '<link rel="alternate" hreflang="de" href="https://me-mateescu.de/">',
  '<link href="https://me-mateescu.de/en/" hreflang="en" rel="alternate">',
  '<link\n  rel="alternate"\n  hreflang="ro"\n  href="https://me-mateescu.de/ro/">',
  '<link rel = "alternate" href = "https://me-mateescu.de/" hreflang = "x-default">',
];

function response(url, status, { headers = {}, text = '', json } = {}) {
  return {
    url,
    status,
    headers: new Headers(headers),
    text: async () => text,
    json: async () => json,
  };
}

function postdeployFetch(homeText, calls = []) {
  const fetchImpl = async (url, init) => {
    calls.push([url.pathname, init.method]);
    if (url.pathname === '/') {
      return response(url.href, 200, {
        headers: {
          'Content-Security-Policy-Report-Only': 'default-src self; report-uri /api/csp-report; report-to csp-endpoint',
          'Reporting-Endpoints': 'csp-endpoint="/api/csp-report"',
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        },
        text: homeText,
      });
    }
    if (url.pathname === '/api/health') {
      return response(url.href, 200, {
        json: { data: { release: { releaseId: RELEASE_ID, sourceRevision: REVISION } } },
      });
    }
    if (url.pathname === '/api/sample-review') return response(url.href, 204);
    if (url.pathname.includes('missing') || /(?:release-manifest|sbom\.cdx)/.test(url.pathname)) {
      return response(url.href, 404);
    }
    return response(url.href, 200);
  };
  return fetchImpl;
}

function verifyHome(homeText, calls = []) {
  return verifyPostdeploy({
    baseUrl: 'http://127.0.0.1:8788/',
    expectedReleaseId: RELEASE_ID,
    expectedSourceRevision: REVISION,
    fetchImpl: postdeployFetch(homeText, calls),
  });
}

test('postdeploy verifier is GET/HEAD-only and checks the production hreflang set', async () => {
  const calls = [];
  const result = await verifyHome(ALTERNATE_LINKS.join('\n'), calls);
  assert.equal(result.result, 'PASS');
  assert.deepEqual([...new Set(calls.map(([, method]) => method))].sort(), ['GET', 'HEAD']);
  assert.equal(calls.some(([route]) => route.includes('/api/chat')), false);
});

test('postdeploy verifier identifies every missing production hreflang alternate', async () => {
  for (const missing of ['de', 'en', 'ro', 'x-default']) {
    const html = ALTERNATE_LINKS.filter((link) => !new RegExp(`hreflang\\s*=\\s*["']${missing}["']`).test(link)).join('\n');
    await assert.rejects(verifyHome(html), new RegExp(`hreflang.*${missing}`, 'i'));
  }
});

test('region-qualified hreflang values do not satisfy the current site contract', async () => {
  await assert.rejects(
    verifyHome('<link hreflang="de-DE"><link hreflang="en-US"><link hreflang="ro-RO"><link hreflang="x-default">'),
    /hreflang.*de/i,
  );
});

function manifest(revision) {
  return createManifest({
    source: { sourceRevision: revision, sourceTreeClean: true, sourceCommitTime: '2026-07-24T12:00:00.000Z' },
    packageName: 'portfolio-astro',
    nodeVersion: 'v22.22.3',
    npmVersion: '11.16.0',
    checksums: {
      trackedSource: '0'.repeat(64),
      packageJson: '1'.repeat(64),
      packageLock: '2'.repeat(64),
      config: '3'.repeat(64),
      wranglerConfig: '4'.repeat(64),
      artifactTree: revision[0].repeat(64),
      sbom: '5'.repeat(64),
    },
  });
}

test('rollback planner validates retained evidence and emits a mutation-free ordered plan', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-rollback-'));
  const current = path.join(root, 'current');
  const target = path.join(root, 'target');
  mkdirSync(current);
  mkdirSync(target);
  mkdirSync(path.join(target, 'deploy'));
  writeFileSync(path.join(target, 'artifact-tree.sha256'), `${'b'.repeat(64)}  deploy\n`);
  const currentFile = path.join(current, 'release-manifest.json');
  const targetFile = path.join(target, 'release-manifest.json');
  writeFileSync(currentFile, JSON.stringify(manifest('a'.repeat(40))));
  writeFileSync(targetFile, JSON.stringify(manifest('b'.repeat(40))));
  const plan = planRollback(currentFile, targetFile);
  assert.equal(plan.action, 'PLAN_ONLY');
  assert.equal(plan.target.publicReleaseCommit, 'b'.repeat(40));
  assert.match(plan.execution, /No Git, Cloudflare, provider, or deployment command/);
  assert.ok(plan.checklist.length >= 5);
});
