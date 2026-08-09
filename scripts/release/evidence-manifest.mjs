#!/usr/bin/env node
// Deterministic evidence-package manifest helper (Phase 5-D1E Workstream D).
// A prior evidence archive's MANIFEST.sha256 tried to list a checksum for
// itself, which cannot produce a stable final self-hash. This helper's
// contract: MANIFEST.sha256 lists every OTHER file under the payload
// directory, never itself, and never an external archive .sha256 sidecar
// (which lives alongside the .tar.gz, not inside the payload directory this
// helper walks).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const MANIFEST_NAME = 'MANIFEST.sha256';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, base, out);
    } else if (entry.isFile()) {
      const relative = path.relative(base, full).split(path.sep).join('/');
      if (relative !== MANIFEST_NAME) out.push(relative);
    }
  }
  return out.sort();
}

// Payload files, excluding MANIFEST.sha256 itself. Never pass an external
// archive .sha256 sidecar's directory as `payloadDir` — this only walks
// inside the evidence package, which never contains that sidecar.
export function listPayloadFiles(payloadDir) {
  return walk(payloadDir);
}

export function buildManifestLines(payloadDir) {
  return listPayloadFiles(payloadDir).map((relative) => {
    const digest = sha256(readFileSync(path.join(payloadDir, relative)));
    return `${digest}  ${relative}`;
  });
}

export function writeManifest(payloadDir) {
  const lines = buildManifestLines(payloadDir);
  writeFileSync(path.join(payloadDir, MANIFEST_NAME), `${lines.join('\n')}\n`);
  return lines.length;
}

export class ManifestVerificationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ManifestVerificationError';
    this.errors = errors;
  }
}

// Verifies every MANIFEST.sha256-listed file against its exact bytes on
// disk. Rejects: the manifest listing itself, duplicate paths, a missing
// payload file, and a modified (hash-mismatched) payload file.
export function verifyManifest(payloadDir) {
  const manifestPath = path.join(payloadDir, MANIFEST_NAME);
  const raw = readFileSync(manifestPath, 'utf8').trimEnd();
  const lines = raw.length > 0 ? raw.split('\n') : [];
  const errors = [];
  const seen = new Set();
  let verified = 0;

  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64}) {2}(.+)$/);
    if (!match) {
      errors.push(`Malformed manifest line: ${line}`);
      continue;
    }
    const [, expectedDigest, relative] = match;
    if (relative === MANIFEST_NAME) {
      errors.push(`Manifest must not list itself: ${relative}`);
      continue;
    }
    if (seen.has(relative)) {
      errors.push(`Duplicate manifest entry: ${relative}`);
      continue;
    }
    seen.add(relative);

    const target = path.join(payloadDir, relative);
    let bytes;
    try {
      bytes = readFileSync(target);
    } catch {
      errors.push(`Missing payload file: ${relative}`);
      continue;
    }
    const actualDigest = sha256(bytes);
    if (actualDigest !== expectedDigest) {
      errors.push(`Digest mismatch for ${relative}: expected ${expectedDigest}, got ${actualDigest}`);
      continue;
    }
    verified += 1;
  }

  if (errors.length > 0) {
    throw new ManifestVerificationError(`${errors.length} manifest verification error(s)`, errors);
  }
  return { verified, total: lines.length };
}

function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: node scripts/release/evidence-manifest.mjs <payload-directory> [--verify]');
  if (process.argv.includes('--verify')) {
    const { verified, total } = verifyManifest(dir);
    console.log(`${verified}/${total} manifest-listed payload files verified`);
  } else {
    const count = writeManifest(dir);
    console.log(`Wrote ${MANIFEST_NAME} with ${count} payload file(s).`);
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) main();
