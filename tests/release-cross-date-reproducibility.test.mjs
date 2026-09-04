import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { execProjectLocalBin } from '../scripts/project-local-executable.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHIM = path.join(ROOT, 'scripts/release/date-shim.cjs');

// Straddles a UTC calendar-day boundary — the gap the existing same-instant
// reproducibility check (scripts/release/reproducibility.mjs) cannot see.
const CLOCK_T1 = '2026-08-08T23:50:00Z';
const CLOCK_T2 = '2026-08-09T00:10:00Z';

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, base, out);
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out.sort();
}

function digestTree(dir) {
  return walk(dir).map((relative) => ({
    path: relative,
    sha256: createHash('sha256').update(readFileSync(path.join(dir, relative))).digest('hex'),
  }));
}

function buildAt(outDir, fixedNow) {
  execProjectLocalBin(ROOT, 'astro', 'astro', ['build', '--outDir', outDir], {
    cwd: ROOT,
    stdio: 'pipe',
    env: {
      ...process.env,
      TZ: 'UTC',
      NODE_OPTIONS: `--require ${SHIM}`,
      PORTFOLIO_FIXED_NOW: fixedNow,
    },
  });
}

test('static build output is byte-identical across a UTC date boundary', { timeout: 5 * 60_000 }, () => {
  // Built outside the repository: Tailwind v4's automatic content scanner
  // picks up sibling directories left in the repo root as extra utility-class
  // source, which is a pure test-methodology artifact unrelated to this
  // guard (see WALL_CLOCK_NONDETERMINISM_BASELINE.md).
  const t1 = mkdtempSync(path.join(tmpdir(), 'portfolio-crossdate-t1-'));
  const t2 = mkdtempSync(path.join(tmpdir(), 'portfolio-crossdate-t2-'));
  try {
    buildAt(t1, CLOCK_T1);
    buildAt(t2, CLOCK_T2);
    const first = digestTree(t1);
    const second = digestTree(t2);
    assert.deepEqual(
      first.map((f) => f.path),
      second.map((f) => f.path),
      'deployable file list must be identical across a UTC date boundary',
    );
    assert.deepEqual(first, second, 'deployable file bytes must be identical across a UTC date boundary');
  } finally {
    rmSync(t1, { recursive: true, force: true });
    rmSync(t2, { recursive: true, force: true });
  }
});

test('date-shim freezes Date while preserving instanceof identity', () => {
  const probe = statSync(SHIM);
  assert.ok(probe.isFile());
  const output = execFileSync(
    'node',
    ['--require', SHIM, '-e', 'console.log(JSON.stringify({now: Date.now(), isDate: new Date() instanceof Date}))'],
    { encoding: 'utf8', env: { ...process.env, PORTFOLIO_FIXED_NOW: '2026-01-01T00:00:00Z' } },
  );
  const parsed = JSON.parse(output);
  assert.equal(parsed.now, Date.parse('2026-01-01T00:00:00Z'));
  assert.equal(parsed.isDate, true);
});
