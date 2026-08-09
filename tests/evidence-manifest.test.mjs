import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ManifestVerificationError, MANIFEST_NAME, listPayloadFiles, verifyManifest, writeManifest } from '../scripts/release/evidence-manifest.mjs';

function payload(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'portfolio-evidence-manifest-'));
  for (const [name, contents] of Object.entries(files)) {
    const full = path.join(dir, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  return dir;
}

test('every listed payload hash verifies exact bytes', () => {
  const dir = payload({ 'FINAL_REPORT.md': 'report', 'screenshots/a.png': 'binary-ish' });
  try {
    writeManifest(dir);
    const result = verifyManifest(dir);
    assert.deepEqual(result, { verified: 2, total: 2 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the manifest does not list itself', () => {
  const dir = payload({ 'a.md': 'x' });
  try {
    writeManifest(dir);
    const manifest = readFileSync(path.join(dir, MANIFEST_NAME), 'utf8');
    assert.ok(!manifest.includes(MANIFEST_NAME));
    assert.deepEqual(listPayloadFiles(dir), ['a.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the manifest does not list an external archive sidecar placed outside the payload directory', () => {
  const dir = payload({ 'a.md': 'x' });
  const sidecarSibling = `${dir}.tar.gz.sha256`;
  writeFileSync(sidecarSibling, 'irrelevant, lives outside the payload dir');
  try {
    writeManifest(dir);
    assert.deepEqual(listPayloadFiles(dir), ['a.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(sidecarSibling, { force: true });
  }
});

test('rejects a manifest with a duplicate path entry', () => {
  const dir = payload({ 'a.md': 'x' });
  try {
    writeManifest(dir);
    const digest = readFileSync(path.join(dir, MANIFEST_NAME), 'utf8').trim();
    writeFileSync(path.join(dir, MANIFEST_NAME), `${digest}\n${digest}\n`);
    assert.throws(() => verifyManifest(dir), ManifestVerificationError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fails when a manifest-listed payload file is missing', () => {
  const dir = payload({ 'a.md': 'x' });
  try {
    writeManifest(dir);
    rmSync(path.join(dir, 'a.md'));
    assert.throws(() => verifyManifest(dir), (error) => error.errors.some((line) => /Missing payload file/.test(line)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fails when a manifest-listed payload file was modified after the manifest was written', () => {
  const dir = payload({ 'a.md': 'original' });
  try {
    writeManifest(dir);
    writeFileSync(path.join(dir, 'a.md'), 'tampered');
    assert.throws(() => verifyManifest(dir), (error) => error.errors.some((line) => /Digest mismatch/.test(line)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects a manifest that lists itself (the historical D1D defect)', () => {
  const dir = payload({ 'a.md': 'x' });
  try {
    writeManifest(dir);
    const selfDigest = createHash('sha256').update(readFileSync(path.join(dir, MANIFEST_NAME))).digest('hex');
    const existing = readFileSync(path.join(dir, MANIFEST_NAME), 'utf8');
    writeFileSync(path.join(dir, MANIFEST_NAME), `${existing}${selfDigest}  ${MANIFEST_NAME}\n`);
    assert.throws(() => verifyManifest(dir), (error) => error.errors.some((line) => /must not list itself/.test(line)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
