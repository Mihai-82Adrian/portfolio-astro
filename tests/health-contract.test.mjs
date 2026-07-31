import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createReleaseIdentity,
  writeGeneratedReleaseIdentity,
} from '../scripts/release/provenance.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const GENERATED = path.join(ROOT, 'functions/_generated/release-identity.ts');
const IDENTITY = createReleaseIdentity({
  sourceRevision: 'b'.repeat(40),
  sourceTreeClean: true,
  sourceCommitTime: '2026-07-24T12:00:00.000Z',
});

mkdirSync(path.dirname(GENERATED), { recursive: true });
writeGeneratedReleaseIdentity(GENERATED, IDENTITY);

const { createHandler } = await import('../functions/api/health.ts');

function request(method = 'GET') {
  return new Request('https://me-mateescu.de/api/health', {
    method,
    headers: { 'cf-ray': 'untrusted-health-request-id' },
  });
}

test('GET health returns the normalized public release identity without configuration or egress', async () => {
  let fetchCalls = 0;
  const handler = createHandler({
    releaseIdentity: IDENTITY,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('health must not fetch');
    },
  });
  const response = await handler({ request: request(), env: {} });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.deepEqual(body, {
    ok: true,
    data: {
      service: 'me-mateescu.de',
      status: 'ok',
      release: {
        schemaVersion: 1,
        releaseId: IDENTITY.releaseId,
        sourceRevision: IDENTITY.sourceRevision,
      },
    },
    requestId: body.requestId,
  });
  assert.match(body.requestId, /^[0-9a-f-]{36}$/i);
  assert.notEqual(body.requestId, 'untrusted-health-request-id');
  assert.equal(fetchCalls, 0);
  assert.doesNotMatch(
    JSON.stringify(body),
    /dependency|sbom|node|npm|environment|account|project|secret|quota|ip|provider|path|branch|command/i,
  );
});

test('HEAD health returns equivalent headers and no response body', async () => {
  const handler = createHandler({ releaseIdentity: IDENTITY });
  const response = await handler({ request: request('HEAD'), env: {} });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(await response.text(), '');
});

test('unsupported health methods use the normalized 405 contract', async () => {
  const handler = createHandler({ releaseIdentity: IDENTITY });
  const response = await handler({ request: request('POST'), env: {} });
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET, HEAD');
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'METHOD_NOT_ALLOWED');
  assert.match(body.requestId, /^[0-9a-f-]{36}$/i);
  assert.notEqual(body.requestId, 'untrusted-health-request-id');
});
