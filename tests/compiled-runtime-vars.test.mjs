import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ALLOWLIST, auditCompiledRuntimeVars } from '../scripts/verify-compiled-runtime-vars.mjs';

function fixtureDir(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'portfolio-runtime-vars-'));
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), contents);
  }
  return dir;
}

test('passes when every var(--color-*) reference is defined somewhere in the compiled output', () => {
  const dir = fixtureDir({
    'a.css': '--color-primary:#4a6b4e;.x{color:var(--color-primary)}',
  });
  try {
    const { violations } = auditCompiledRuntimeVars(dir);
    assert.deepEqual(violations, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fails on a new, undefined var(--color-*) reference with no fallback', () => {
  const dir = fixtureDir({
    'a.css': '.x{border-color:var(--color-brand-new-999)}',
  });
  try {
    const { violations } = auditCompiledRuntimeVars(dir);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].literal, 'var(--color-brand-new-999)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('does not flag a var() reference that carries its own fallback value', () => {
  const dir = fixtureDir({
    'a.css': '.x{color:var(--color-brand-999, #000)}',
  });
  try {
    const { violations } = auditCompiledRuntimeVars(dir);
    assert.deepEqual(violations, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('cross-references definitions and usages across separate compiled chunk files', () => {
  const dir = fixtureDir({
    'a.css': '--color-shared-token:#123456;',
    'b.css': '.y{background:var(--color-shared-token)}',
  });
  try {
    const { violations } = auditCompiledRuntimeVars(dir);
    assert.deepEqual(violations, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the allowlist only suppresses its own exact literals, not other undefined names', () => {
  assert.ok(ALLOWLIST.has('var(--color-eucalyptus-500)'));
  const dir = fixtureDir({
    'a.css': '.x{outline-color:var(--color-eucalyptus-500)}.y{border-color:var(--color-eucalyptus-999)}',
  });
  try {
    const { violations } = auditCompiledRuntimeVars(dir);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].literal, 'var(--color-eucalyptus-999)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('recurses into nested chunk subdirectories', () => {
  const dir = fixtureDir({});
  mkdirSync(path.join(dir, 'nested'));
  writeFileSync(path.join(dir, 'nested', 'c.css'), '.z{color:var(--color-deep-500)}');
  try {
    const { violations } = auditCompiledRuntimeVars(dir);
    assert.equal(violations.length, 1);
    assert.match(violations[0].file, /nested/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
