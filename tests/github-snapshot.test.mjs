// Permanent deterministic suite for the GitHub static-snapshot flow (PRIV-018).
//
// The browser must never contact api.github.com; scripts/update-github-snapshot.mjs
// is a manual-only tool that refreshes the tracked src/data/github-snapshot.json.
// It is never invoked by build or test, validates its two upstream payloads
// strictly, computes a deterministic summary, and never overwrites the
// existing snapshot on failure.
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSnapshot,
  computeLanguages,
  validateReposPayload,
  validateUserPayload,
} from '../scripts/update-github-snapshot.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── Schema validation ──────────────────────────────────────────────────────

test('validateUserPayload: rejects a non-object', () => {
  assert.throws(() => validateUserPayload(null));
  assert.throws(() => validateUserPayload('not an object'));
});

test('validateUserPayload: rejects a missing or non-integer public_repos', () => {
  assert.throws(() => validateUserPayload({}));
  assert.throws(() => validateUserPayload({ public_repos: '5' }));
  assert.throws(() => validateUserPayload({ public_repos: -1 }));
  assert.throws(() => validateUserPayload({ public_repos: 1.5 }));
});

test('validateUserPayload: extracts only the public repository count', () => {
  const result = validateUserPayload({ public_repos: 5 });
  assert.deepEqual(result, { publicRepositoryCount: 5 });
});

test('validateUserPayload: ignores total_private_repos even if a payload happened to include it', () => {
  // Unauthenticated /users/{username} never returns this field for any account, but the
  // validator must not surface it even if present — this script has no basis to claim a
  // private-repository count regardless of what an unexpected payload contains.
  const result = validateUserPayload({ public_repos: 4, total_private_repos: 9 });
  assert.deepEqual(result, { publicRepositoryCount: 4 });
});

test('validateReposPayload: rejects a non-array', () => {
  assert.throws(() => validateReposPayload({}));
  assert.throws(() => validateReposPayload(null));
});

test('validateReposPayload: bounds the number of repos considered', () => {
  const many = Array.from({ length: 150 }, () => ({ language: 'Rust', size: 10 }));
  const result = validateReposPayload(many);
  assert.equal(result.length, 100);
});

test('validateReposPayload: treats a missing/non-string language as null and a bad size as zero', () => {
  const result = validateReposPayload([
    { language: null, size: 10 },
    { language: 42, size: 10 },
    { language: 'Rust', size: -5 },
    { language: 'Rust', size: 'not a number' },
  ]);
  assert.deepEqual(result, [
    { language: null, size: 10 },
    { language: null, size: 10 },
    { language: 'Rust', size: 0 },
    { language: 'Rust', size: 0 },
  ]);
});

// ─── Deterministic computation ──────────────────────────────────────────────

test('computeLanguages: ranks by percentage descending, ties broken by name ascending', () => {
  const repos = [
    { language: 'Rust', size: 60 },
    { language: 'Julia', size: 20 },
    { language: 'Zig', size: 20 },
    { language: null, size: 1000 }, // no language: excluded entirely
  ];
  const result = computeLanguages(repos);
  assert.deepEqual(result, [
    { name: 'Rust', percentage: 60 },
    { name: 'Julia', percentage: 20 },
    { name: 'Zig', percentage: 20 },
  ]);
});

test('computeLanguages: caps the result at the top 5 languages', () => {
  const repos = Array.from({ length: 8 }, (_, i) => ({ language: `Lang${i}`, size: 8 - i }));
  const result = computeLanguages(repos);
  assert.equal(result.length, 5);
});

test('computeLanguages: returns an empty list when no repo has a language', () => {
  assert.deepEqual(computeLanguages([{ language: null, size: 10 }]), []);
  assert.deepEqual(computeLanguages([]), []);
});

test('buildSnapshot: is deterministic for the same input (aside from the passed-in timestamp)', () => {
  const input = {
    userPayload: { public_repos: 5, total_private_repos: 2 },
    reposPayload: [
      { language: 'Rust', size: 70 },
      { language: 'TypeScript', size: 30 },
    ],
    generatedAt: '2026-01-01T00:00:00.000Z',
  };
  const a = buildSnapshot(input);
  const b = buildSnapshot(input);
  assert.deepEqual(a, b);
  assert.deepEqual(a, {
    generatedAt: '2026-01-01T00:00:00.000Z',
    username: 'Mihai-82Adrian',
    publicRepositoryCount: 5,
    languages: [
      { name: 'Rust', percentage: 70 },
      { name: 'TypeScript', percentage: 30 },
    ],
  });
});

test('buildSnapshot: an invalid user payload throws instead of producing a partial snapshot', () => {
  assert.throws(() =>
    buildSnapshot({ userPayload: { public_repos: 'nope' }, reposPayload: [], generatedAt: 'now' })
  );
});

test('buildSnapshot: an invalid repos payload throws instead of producing a partial snapshot', () => {
  assert.throws(() =>
    buildSnapshot({ userPayload: { public_repos: 1 }, reposPayload: 'not an array', generatedAt: 'now' })
  );
});

// ─── Script invocation contract ─────────────────────────────────────────────

test('the script is never invoked by any npm script (build, test, or otherwise)', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const [name, command] of Object.entries(pkg.scripts)) {
    assert.doesNotMatch(
      command,
      /update-github-snapshot/,
      `npm script "${name}" must not invoke update-github-snapshot.mjs`
    );
  }
});

test('no test file imports the script in a way that would execute its network-calling main()', () => {
  // Importing the module (as this file does) must only bind its named exports —
  // main() must be guarded so import alone never fetches the network.
  const source = readFileSync(path.join(ROOT, 'scripts/update-github-snapshot.mjs'), 'utf8');
  assert.match(
    source,
    /if \(import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`\)/,
    'main() must be guarded so importing the module for its pure functions never triggers a fetch'
  );
});

// ─── Rendering contract ─────────────────────────────────────────────────────

test('GitHubWidget.astro never uses innerHTML or set:html for snapshot data', () => {
  const source = readFileSync(path.join(ROOT, 'src/components/projects/GitHubWidget.astro'), 'utf8');
  assert.doesNotMatch(source, /innerHTML/);
  assert.doesNotMatch(source, /set:html/);
});

test('GitHubWidget.astro no longer imports the removed client-side GitHub fetch utility', () => {
  const source = readFileSync(path.join(ROOT, 'src/components/projects/GitHubWidget.astro'), 'utf8');
  assert.doesNotMatch(source, /utils\/github['"]/);
  assert.equal(existsSync(path.join(ROOT, 'src/utils/github.ts')), false);
});

test('the tracked snapshot file matches the schema buildSnapshot produces', () => {
  const snapshotPath = path.join(ROOT, 'src/data/github-snapshot.json');
  assert.ok(existsSync(snapshotPath), 'expected a tracked src/data/github-snapshot.json');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  assert.deepEqual(Object.keys(snapshot).sort(), [
    'generatedAt',
    'languages',
    'publicRepositoryCount',
    'username',
  ]);
  assert.equal(typeof snapshot.generatedAt, 'string');
  assert.ok(Number.isInteger(snapshot.publicRepositoryCount) && snapshot.publicRepositoryCount >= 0);
  assert.ok(Array.isArray(snapshot.languages));
  assert.ok(snapshot.languages.length <= 5);
  for (const lang of snapshot.languages) {
    assert.deepEqual(Object.keys(lang).sort(), ['name', 'percentage']);
    assert.equal(typeof lang.name, 'string');
    assert.ok(Number.isInteger(lang.percentage));
  }
});

test('the snapshot never claims a private-repository or total-repository count it cannot support', () => {
  // Unauthenticated /users/{username} never reveals private repos for any account, so this
  // script must never present privateRepos=0 or totalRepos=publicRepos as measured facts.
  const snapshotPath = path.join(ROOT, 'src/data/github-snapshot.json');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  assert.equal('privateRepos' in snapshot, false);
  assert.equal('totalRepos' in snapshot, false);
});

test('the tracked snapshot never contains event payloads, commit messages, or actor metadata', () => {
  const snapshotPath = path.join(ROOT, 'src/data/github-snapshot.json');
  const raw = readFileSync(snapshotPath, 'utf8');
  for (const forbidden of ['commit', 'actor', 'payload', 'event', 'message']) {
    assert.equal(
      new RegExp(forbidden, 'i').test(raw),
      false,
      `snapshot must not contain "${forbidden}"`
    );
  }
});
