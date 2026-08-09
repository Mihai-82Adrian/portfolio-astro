import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { verifyReleaseDiffHygiene } from '../scripts/release/diff-hygiene.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

// D1E pushed a formal-gate PASS with 4 unrepaired trailing-whitespace lines in
// src/pages/blog/[slug].astro because no gate phase ever ran `git diff --check` over the actual
// release delta. This fixture reproduces a minimal version of that gap: a "public" master commit
// whose own Canonical-Source trailer names the internal implementation commit the release delta must
// be measured from (resolved dynamically, never hardcoded — see resolvePublicCanonicalSource).
function fixture(seed = 'clean line') {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-diff-hygiene-'));
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'master']);
  git(['config', 'user.name', 'Release Test']);
  git(['config', 'user.email', 'release@example.invalid']);
  writeFileSync(path.join(root, 'clean.txt'), `${seed}\n`);
  git(['add', '.']);
  git(['commit', '-qm', 'implementation base']);
  const source = git(['rev-parse', 'HEAD']);
  git(['commit', '--allow-empty', '-qm', `release: publish\n\nCanonical-Source: ${source}`]);
  git(['switch', '-qc', 'implementation', source]);
  return { root, git, source };
}

test('release-delta diff hygiene passes when the implementation delta introduces no whitespace defect', () => {
  const { root, git } = fixture();
  writeFileSync(path.join(root, 'new-file.txt'), 'a clean added line\n');
  git(['add', '.']);
  git(['commit', '-qm', 'clean addition']);
  const result = verifyReleaseDiffHygiene(root);
  assert.equal(result.base.length, 40);
  assert.equal(result.head, git(['rev-parse', 'HEAD']));
});

test('release-delta diff hygiene fails closed on a newly introduced trailing-whitespace line, naming the offending file', () => {
  const { root, git } = fixture();
  writeFileSync(path.join(root, 'clean.txt'), 'clean line\nbad line \n');
  git(['add', '.']);
  git(['commit', '-qm', 'introduce trailing whitespace']);
  assert.throws(
    () => verifyReleaseDiffHygiene(root),
    /clean\.txt.*trailing whitespace/s,
  );
});

test('release-delta diff hygiene ignores pre-existing whitespace debt in files untouched by the delta', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-diff-hygiene-preexisting-'));
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'master']);
  git(['config', 'user.name', 'Release Test']);
  git(['config', 'user.email', 'release@example.invalid']);
  // Pre-existing debt: this line already has trailing whitespace before the release delta starts.
  writeFileSync(path.join(root, 'legacy.txt'), 'old debt line \n');
  git(['add', '.']);
  git(['commit', '-qm', 'implementation base with pre-existing debt']);
  const source = git(['rev-parse', 'HEAD']);
  git(['commit', '--allow-empty', '-qm', `release: publish\n\nCanonical-Source: ${source}`]);
  git(['switch', '-qc', 'implementation', source]);
  // The delta only adds an unrelated clean file; legacy.txt is never touched.
  writeFileSync(path.join(root, 'unrelated.txt'), 'unrelated clean addition\n');
  git(['add', '.']);
  git(['commit', '-qm', 'unrelated clean addition']);
  const result = verifyReleaseDiffHygiene(root);
  assert.equal(result.head, git(['rev-parse', 'HEAD']));
});

test('release-delta diff hygiene resolves its base dynamically from the current public Canonical-Source trailer, not a hardcoded SHA', () => {
  const first = fixture('clean line A');
  const second = fixture('clean line B');
  assert.notEqual(first.source, second.source, 'fixtures must produce distinct sources to prove no hardcoding');
  writeFileSync(path.join(first.root, 'new-file.txt'), 'clean\n');
  first.git(['add', '.']);
  first.git(['commit', '-qm', 'clean addition']);
  writeFileSync(path.join(second.root, 'new-file.txt'), 'clean\n');
  second.git(['add', '.']);
  second.git(['commit', '-qm', 'clean addition']);
  assert.equal(verifyReleaseDiffHygiene(first.root).base, first.source);
  assert.equal(verifyReleaseDiffHygiene(second.root).base, second.source);
});

test('the guard is wired into the unified release-candidate gate under Workflow and release policy', async () => {
  const { phases } = await import('../scripts/release/candidate.mjs');
  const [, scripts] = phases.find(([name]) => name === 'Workflow and release policy');
  assert.ok(scripts.includes('verify:release-diff-hygiene'), 'verify:release-diff-hygiene must be wired into the unified gate.');
});

test('the D1E-era mixed-line-ending defect in src/pages/blog/[slug].astro is repaired in the current release delta', () => {
  const result = verifyReleaseDiffHygiene(ROOT);
  assert.equal(result.head.length, 40);
});
