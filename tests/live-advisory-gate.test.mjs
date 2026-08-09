import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runLiveAdvisoryGate } from '../scripts/release/live-advisory-gate.mjs';

function mockResponse(body = []) {
  const text = JSON.stringify(body);
  return { status: 200, text: async () => text, headers: { get: () => undefined } };
}

function tempRoot(lockfile) {
  const dir = mkdtempSync(path.join(tmpdir(), 'portfolio-live-advisory-'));
  writeFileSync(
    path.join(dir, 'package-lock.json'),
    JSON.stringify(lockfile ?? { lockfileVersion: 3, packages: { '': {}, 'node_modules/left-pad': { version: '1.3.0' } } }),
  );
  return dir;
}

test('passes closed with zero unresolved advisories when every query returns empty', async () => {
  const root = tempRoot();
  const outputDir = path.join(root, 'out');
  try {
    const summary = await runLiveAdvisoryGate({ root, outputDir, fetchImpl: async () => mockResponse([]) });
    assert.equal(summary.result, 'PASS');
    assert.deepEqual(summary.unresolvedGhsaIds, []);
    const written = JSON.parse(readFileSync(path.join(outputDir, 'live-advisory-summary.json'), 'utf8'));
    assert.equal(written.result, 'PASS');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed when an applicable advisory is not in the approved-risk list', async () => {
  const root = tempRoot();
  const outputDir = path.join(root, 'out');
  try {
    await assert.rejects(
      () =>
        runLiveAdvisoryGate({
          root,
          outputDir,
          fetchImpl: async (url) => (url.includes('type=reviewed') ? mockResponse([{ ghsa_id: 'GHSA-aaaa-bbbb-cccc' }]) : mockResponse([])),
        }),
      /unresolved applicable GHSA record/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts an advisory explicitly present in the approved-risk list', async () => {
  const root = tempRoot();
  const outputDir = path.join(root, 'out');
  try {
    const summary = await runLiveAdvisoryGate({
      root,
      outputDir,
      approvedRisk: [{ advisoryId: 'GHSA-aaaa-bbbb-cccc' }],
      fetchImpl: async (url) => (url.includes('type=reviewed') ? mockResponse([{ ghsa_id: 'GHSA-aaaa-bbbb-cccc' }]) : mockResponse([])),
    });
    assert.equal(summary.result, 'PASS');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('propagates a rate-limit failure as a thrown error, never a silent zero result', async () => {
  const root = tempRoot();
  const outputDir = path.join(root, 'out');
  try {
    await assert.rejects(
      () => runLiveAdvisoryGate({ root, outputDir, fetchImpl: async () => ({ status: 429, text: async () => '', headers: { get: () => undefined } }) }),
      /failed closed/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
