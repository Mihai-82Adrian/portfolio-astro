// Phase 3-A closure: no single number ("415 tests", "511 tests", "83 tests") was ever derived
// from a canonical command — this is the permanent guard that keeps `npm run verify:full-suite`
// honest by asserting every test file on disk is both covered by that glob and wired into at
// least one package.json script, so a new test file can never go silently unexercised.
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function diskTestFiles() {
  return globSync('tests/**/*.test.mjs', { cwd: ROOT }).sort();
}

function scriptsInvokingNodeTest() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const files = new Set();
  for (const command of Object.values(pkg.scripts)) {
    const match = command.match(/node --test ([^&]+)/);
    if (!match) continue;
    for (const token of match[1].trim().split(/\s+/)) {
      for (const resolved of globSync(token, { cwd: ROOT })) files.add(resolved);
    }
  }
  return files;
}

test('every test file on disk lives under tests/*.test.mjs or tests/financial/*.test.mjs — the canonical verify:full-suite globs', () => {
  const shallow = new Set([
    ...globSync('tests/*.test.mjs', { cwd: ROOT }),
    ...globSync('tests/financial/*.test.mjs', { cwd: ROOT }),
  ]);
  for (const file of diskTestFiles()) {
    assert.ok(shallow.has(file), `${file} is outside the verify:full-suite globs and would be silently skipped`);
  }
});

test('every test file on disk is wired into at least one package.json script — none are orphaned from the release gate', () => {
  const wired = scriptsInvokingNodeTest();
  const orphaned = diskTestFiles().filter((file) => !wired.has(file));
  assert.deepEqual(orphaned, [], 'these test files are never invoked by any package.json script');
});
