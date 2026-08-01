// Phase 2D-D closure (bounded audit-coverage gap): the prior exact-version GitHub Advisory
// Database queries did not set `type`, so they silently covered only the default
// GitHub-reviewed advisory class and never independently evidenced `unreviewed` or `malware`
// results. These offline, mocked-fetch tests are the permanent contract proving the scanner
// queries all three types, batches correctly, and never treats a failed query as zero
// advisories found.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { extractPackageVersions } from '../scripts/security/lockfile-inventory.mjs';
import {
  AdvisoryScanError,
  buildBatches,
  buildQueryUrl,
  scanAdvisories,
  writeRawEvidence,
} from '../scripts/security/github-advisory-scan.mjs';

function mockResponse({ status = 200, body = [], headers = {} } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const lowered = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    status,
    text: async () => text,
    headers: { get: (name) => lowered[name.toLowerCase()] },
  };
}

// 1. exact lockfile package extraction
test('extracts exact package/version pairs from a lockfileVersion 3 structure', () => {
  const lockfile = {
    lockfileVersion: 3,
    packages: {
      '': { name: 'portfolio-astro', version: '0.0.1' },
      'node_modules/left-pad': { version: '1.3.0' },
    },
  };
  assert.deepEqual(extractPackageVersions(lockfile), [{ name: 'left-pad', version: '1.3.0' }]);
});

// 2. scoped package names
test('preserves scoped package names intact', () => {
  const lockfile = { packages: { 'node_modules/@astrojs/mdx': { version: '7.0.3' } } };
  assert.deepEqual(extractPackageVersions(lockfile), [{ name: '@astrojs/mdx', version: '7.0.3' }]);
});

// 3. duplicate package versions
test('deduplicates identical package/version pairs found at multiple lockfile paths', () => {
  const lockfile = {
    packages: {
      'node_modules/lodash': { version: '4.17.21' },
      'node_modules/foo/node_modules/lodash': { version: '4.17.21' },
    },
  };
  assert.equal(extractPackageVersions(lockfile).length, 1);
});

// 4. multiple versions of one package
test('retains multiple versions of the same package as separate entries', () => {
  const lockfile = {
    packages: {
      'node_modules/sharp': { version: '0.35.3' },
      'node_modules/wrangler/node_modules/sharp': { version: '0.35.2' },
    },
  };
  const versions = extractPackageVersions(lockfile).map((entry) => entry.version).sort();
  assert.deepEqual(versions, ['0.35.2', '0.35.3']);
});

// 5, 6, 7. reviewed / unreviewed / malware query composition
for (const type of ['reviewed', 'unreviewed', 'malware']) {
  test(`composes a ${type} query with ecosystem=npm and exact affects values`, () => {
    const url = new URL(buildQueryUrl({ type, packages: [{ name: 'left-pad', version: '1.3.0' }] }));
    assert.equal(url.searchParams.get('ecosystem'), 'npm');
    assert.equal(url.searchParams.get('type'), type);
    assert.equal(url.searchParams.get('affects'), 'left-pad@1.3.0');
  });
}

// 8. encoded-URL-length batching
test('batches by encoded URL length, not only by item count', () => {
  const entries = Array.from({ length: 50 }, (_, i) => ({ name: `@some-scope/package-name-${i}`, version: '1.0.0-alpha.1' }));
  const batches = buildBatches(entries, { type: 'reviewed', maxUrlLength: 600, maxPackages: 1000 });
  assert.ok(batches.length > 1, 'a tight URL budget must force multiple batches even under the package-count ceiling');
  for (const batch of batches) {
    const url = buildQueryUrl({ type: 'reviewed', packages: batch.packages });
    assert.ok(url.length <= 600, `batch URL length ${url.length} exceeds the ceiling`);
  }
  assert.equal(batches.flatMap((batch) => batch.packages).length, entries.length);
});

test('respects the API maximum package count per batch independent of URL length', () => {
  const entries = Array.from({ length: 5 }, (_, i) => ({ name: `pkg-${i}`, version: '1.0.0' }));
  const batches = buildBatches(entries, { type: 'reviewed', maxPackages: 2, maxUrlLength: 100_000 });
  assert.equal(batches.length, 3);
  assert.equal(batches[0].packages.length, 2);
  assert.equal(batches[2].packages.length, 1);
});

// 9. pagination
test('follows Link header pagination across multiple pages and aggregates results', async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) {
      return mockResponse({
        body: [{ ghsa_id: 'GHSA-aaaa-aaaa-aaaa' }],
        headers: { link: '<https://api.github.com/advisories?after=CURSOR1&type=reviewed>; rel="next"' },
      });
    }
    return mockResponse({ body: [{ ghsa_id: 'GHSA-bbbb-bbbb-bbbb' }] });
  };
  const result = await scanAdvisories({ entries: [{ name: 'left-pad', version: '1.3.0' }], types: ['reviewed'], fetchImpl });
  assert.equal(call, 2);
  assert.equal(result.results.reviewed.totalResultCount, 2);
  assert.deepEqual(result.results.reviewed.ghsaIds, ['GHSA-aaaa-aaaa-aaaa', 'GHSA-bbbb-bbbb-bbbb']);
});

// 10. HTTP failure
test('throws on an HTTP failure instead of treating it as zero advisories', async () => {
  const fetchImpl = async () => mockResponse({ status: 500, body: 'boom' });
  await assert.rejects(
    scanAdvisories({ entries: [{ name: 'left-pad', version: '1.3.0' }], types: ['reviewed'], fetchImpl }),
    (error) => error instanceof AdvisoryScanError && error.code === 'HTTP_FAILURE',
  );
});

// 11. rate-limit response
test('throws a RATE_LIMITED error on HTTP 403/429 instead of silently succeeding', async () => {
  const fetchImpl = async () => mockResponse({ status: 429, body: { message: 'rate limited' } });
  await assert.rejects(
    scanAdvisories({ entries: [{ name: 'left-pad', version: '1.3.0' }], types: ['unreviewed'], fetchImpl }),
    (error) => error instanceof AdvisoryScanError && error.code === 'RATE_LIMITED',
  );
});

// 12. malformed JSON
test('throws on malformed JSON instead of returning zero advisories', async () => {
  const fetchImpl = async () => mockResponse({ status: 200, body: '{not valid json' });
  await assert.rejects(
    scanAdvisories({ entries: [{ name: 'left-pad', version: '1.3.0' }], types: ['malware'], fetchImpl }),
    (error) => error instanceof AdvisoryScanError && error.code === 'MALFORMED_JSON',
  );
});

// 13. partial batch failure
test('aborts the whole type when one batch in a multi-batch scan fails, rather than reporting a partial result', async () => {
  const entries = Array.from({ length: 3 }, (_, i) => ({ name: `left-pad-${i}`, version: '1.3.0' }));
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) return mockResponse({ status: 200, body: [{ ghsa_id: 'GHSA-cccc-cccc-cccc' }] });
    return mockResponse({ status: 500, body: 'boom' });
  };
  await assert.rejects(
    scanAdvisories({ entries, types: ['reviewed'], fetchImpl, batchOptions: { maxPackages: 1, maxUrlLength: 100_000 } }),
    (error) => error instanceof AdvisoryScanError && error.code === 'HTTP_FAILURE',
  );
  assert.equal(call, 2, 'must stop after the failing batch instead of continuing to scan the remainder');
});

// 14. returned advisory aggregation
test('aggregates GHSA ids across all three query types without duplication', async () => {
  const fetchImpl = async (url) => {
    const type = new URL(url).searchParams.get('type');
    if (type === 'reviewed') return mockResponse({ body: [{ ghsa_id: 'GHSA-1111-1111-1111' }] });
    if (type === 'unreviewed') return mockResponse({ body: [{ ghsa_id: 'GHSA-1111-1111-1111' }, { ghsa_id: 'GHSA-2222-2222-2222' }] });
    return mockResponse({ body: [] });
  };
  const result = await scanAdvisories({ entries: [{ name: 'left-pad', version: '1.3.0' }], fetchImpl });
  assert.deepEqual(result.aggregate.ghsaIds, ['GHSA-1111-1111-1111', 'GHSA-2222-2222-2222']);
  assert.deepEqual(result.types, ['reviewed', 'unreviewed', 'malware']);
});

// 15. deterministic output ordering
test('produces deterministic, sorted GHSA ordering regardless of input entry order', async () => {
  const fetchImpl = async () => mockResponse({ body: [{ ghsa_id: 'GHSA-2222-2222-2222' }, { ghsa_id: 'GHSA-1111-1111-1111' }] });
  const forward = await scanAdvisories({
    entries: [{ name: 'b-pkg', version: '1.0.0' }, { name: 'a-pkg', version: '1.0.0' }],
    types: ['reviewed'],
    fetchImpl,
  });
  const reversed = await scanAdvisories({
    entries: [{ name: 'a-pkg', version: '1.0.0' }, { name: 'b-pkg', version: '1.0.0' }],
    types: ['reviewed'],
    fetchImpl,
  });
  assert.deepEqual(forward.results.reviewed.ghsaIds, ['GHSA-1111-1111-1111', 'GHSA-2222-2222-2222']);
  assert.deepEqual(forward.results.reviewed.ghsaIds, reversed.results.reviewed.ghsaIds);
});

// 16. no use of authorization headers
test('never sends an Authorization header or any token-shaped header', async () => {
  const seenHeaders = [];
  const fetchImpl = async (_url, init) => {
    seenHeaders.push(init.headers);
    return mockResponse({ body: [] });
  };
  await scanAdvisories({ entries: [{ name: 'left-pad', version: '1.3.0' }], types: ['reviewed'], fetchImpl });
  assert.ok(seenHeaders.length > 0);
  for (const headers of seenHeaders) {
    assert.ok(!('Authorization' in headers) && !('authorization' in headers));
    assert.equal(headers.Accept, 'application/vnd.github+json');
    assert.ok(headers['X-GitHub-Api-Version']);
  }
});

// 17. no false zero result after a failed query
test('never resolves with a result after a failed query — it rejects instead of reporting zero advisories', async () => {
  const fetchImpl = async () => mockResponse({ status: 503, body: 'unavailable' });
  await assert.rejects(scanAdvisories({ entries: [{ name: 'left-pad', version: '1.3.0' }], types: ['reviewed'], fetchImpl }));
});

// 18. raw-evidence manifest checksums must verify the bytes actually written to disk
test('raw-response-checksums.sha256 hashes the exact stored file bytes, not the pre-write HTTP body', () => {
  const outputDir = mkdtempSync(path.join(tmpdir(), 'advisory-evidence-'));
  try {
    const results = {
      reviewed: {
        batches: [
          {
            batchId: 0,
            pages: [{ pageIndex: 0, rawBody: '[]' }],
          },
        ],
      },
    };
    writeRawEvidence(outputDir, results);

    const storedFile = readFileSync(path.join(outputDir, 'raw', 'reviewed-batch0-page0.json'));
    const manifest = readFileSync(path.join(outputDir, 'raw-response-checksums.sha256'), 'utf8');
    const expectedLine = `${createHash('sha256').update(storedFile).digest('hex')}  raw/reviewed-batch0-page0.json`;

    assert.equal(storedFile.toString('utf8'), '[]\n', 'the rawBody must be written with its trailing newline');
    assert.equal(manifest.trim(), expectedLine, 'the manifest entry must be the checksum of the bytes on disk');
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
