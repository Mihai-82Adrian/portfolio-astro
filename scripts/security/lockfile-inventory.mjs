#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const NAME_PATTERN = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

// Every non-root entry in lockfileVersion 3 `packages` is keyed by its node_modules path;
// the exact installed package name is the final path segment (kept intact for scoped
// packages, e.g. `node_modules/@scope/name` -> `@scope/name`) unless the lockfile records
// an explicit alias via `name`.
export function extractPackageVersions(lockfile) {
  const packages = lockfile?.packages ?? {};
  const seen = new Map();
  for (const [key, entry] of Object.entries(packages)) {
    if (key === '') continue; // root project entry, not an installed dependency
    if (!key.startsWith('node_modules/')) continue;
    const lastSegment = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
    const name = entry?.name ?? lastSegment;
    const version = entry?.version;
    if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
      throw new Error(`Invalid package name in lockfile at ${key}: ${JSON.stringify(name)}`);
    }
    if (typeof version !== 'string' || !VERSION_PATTERN.test(version)) {
      throw new Error(`Invalid or missing exact version for ${name} at ${key}: ${JSON.stringify(version)}`);
    }
    seen.set(`${name}@${version}`, { name, version });
  }
  return [...seen.values()].sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
}

export function buildInventory(lockfileContent) {
  const lockfile = JSON.parse(lockfileContent);
  const entries = extractPackageVersions(lockfile);
  return {
    schemaVersion: 1,
    lockfileSha256: sha256(lockfileContent),
    count: entries.length,
    entries,
  };
}

function main() {
  const outputDir = process.argv[2];
  if (!outputDir) {
    throw new Error('Usage: node scripts/security/lockfile-inventory.mjs <external-output-directory>');
  }
  const lockfileContent = readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8');
  const inventory = buildInventory(lockfileContent);
  mkdirSync(outputDir, { recursive: true });
  const jsonBody = `${JSON.stringify(inventory, null, 2)}\n`;
  const txtBody = `${inventory.entries.map((entry) => `${entry.name}@${entry.version}`).join('\n')}\n`;
  writeFileSync(path.join(outputDir, 'exact-lock-package-versions.json'), jsonBody);
  writeFileSync(path.join(outputDir, 'exact-lock-package-versions.txt'), txtBody);
  writeFileSync(
    path.join(outputDir, 'exact-lock-package-versions.sha256'),
    `${sha256(jsonBody)}  exact-lock-package-versions.json\n${sha256(txtBody)}  exact-lock-package-versions.txt\n`,
  );
  console.log(`Inventory written: ${inventory.count} exact package/version pairs (lockfile sha256 ${inventory.lockfileSha256}).`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main();
}
