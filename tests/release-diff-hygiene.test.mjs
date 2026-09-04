import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { verifyReleaseDiffHygiene } from '../scripts/release/diff-hygiene.mjs';
import { resolvePublicCanonicalSource } from '../scripts/release/public-lineage.mjs';

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

// Phase 5-D1E-R1b: this same guard runs in two distinct contexts. The internal `fixture()` above
// covers the implementation-worktree context (HEAD is a normal commit; base comes from the current
// public master's Canonical-Source trailer). These fixtures cover the public-safe CI context (HEAD is
// itself a `git commit-tree`-built release commit) — the exact shape GitHub Actions checks out fresh
// for `release/*` branches, where the internal implementation history the Canonical-Source trailer
// names was never pushed and will never exist, regardless of fetch depth.
function releaseFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-diff-hygiene-release-'));
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'master']);
  git(['config', 'user.name', 'Release Test']);
  git(['config', 'user.email', 'release@example.invalid']);
  writeFileSync(path.join(root, 'public.txt'), 'public content\n');
  git(['add', '.']);
  git(['commit', '-qm', 'public master content']);
  const master = git(['rev-parse', 'HEAD']);
  return { root, git, master };
}

function buildReleaseCommit(root, git, { parent, canonicalSource }) {
  const tree = git(['write-tree']);
  const digest = 'b'.repeat(64);
  const message = `release: publish reviewed candidate\n\nCanonical-Source: ${canonicalSource}\nCanonical-Tree: ${tree}\nCanonical-Artifact: ${digest}\nRelease-Manifest: ${digest}\n`;
  const commit = execFileSync('git', ['commit-tree', tree, '-p', parent], { cwd: root, encoding: 'utf8', input: message }).trim();
  return { commit, tree };
}

test('public-safe CI context: a release commit whose Canonical-Source object does not exist locally still resolves — base is its own real parent', () => {
  const { root, git, master } = releaseFixture();
  const missingInternalSource = 'f'.repeat(40);
  assert.throws(() => execFileSync('git', ['cat-file', '-e', missingInternalSource], { cwd: root, stdio: 'ignore' }));
  writeFileSync(path.join(root, 'public.txt'), 'public content\nrelease line\n');
  git(['add', '.']);
  const { commit: releaseCommit } = buildReleaseCommit(root, git, { parent: master, canonicalSource: missingInternalSource });
  const result = verifyReleaseDiffHygiene(root, { head: releaseCommit });
  assert.equal(result.base, master);
  assert.equal(result.head, releaseCommit);
});

test('public-safe CI context still catches a real whitespace defect — it is not merely ref resolution', () => {
  const { root, git, master } = releaseFixture();
  writeFileSync(path.join(root, 'public.txt'), 'public content\nbad line \n');
  git(['add', '.']);
  const { commit: releaseCommit } = buildReleaseCommit(root, git, { parent: master, canonicalSource: 'f'.repeat(40) });
  assert.throws(
    () => verifyReleaseDiffHygiene(root, { head: releaseCommit }),
    /public\.txt.*trailing whitespace/s,
  );
});

test('a release-trailer-shaped commit with two parents is rejected as public-safe and fails closed rather than guessing a parent', () => {
  const { root, git, master } = releaseFixture();
  git(['checkout', '-qb', 'other', master]);
  writeFileSync(path.join(root, 'other.txt'), 'other\n');
  git(['add', '.']);
  git(['commit', '-qm', 'unrelated second-parent commit']);
  const otherParent = git(['rev-parse', 'HEAD']);
  git(['checkout', '-q', 'master']);
  writeFileSync(path.join(root, 'public.txt'), 'public content\nmerge-shaped line\n');
  git(['add', '.']);
  const tree = git(['write-tree']);
  const digest = 'b'.repeat(64);
  const message = `release: merge-shaped\n\nCanonical-Source: ${'a'.repeat(40)}\nCanonical-Tree: ${tree}\nCanonical-Artifact: ${digest}\nRelease-Manifest: ${digest}\n`;
  const twoParentCommit = execFileSync('git', ['commit-tree', tree, '-p', master, '-p', otherParent], { cwd: root, encoding: 'utf8', input: message }).trim();
  // This fixture's plain master carries no Canonical-Source trailer of its own, so the internal
  // fallback also cannot resolve — proving the two-parent commit is never silently treated as
  // public-safe (which would have produced a result instead of throwing).
  assert.throws(() => verifyReleaseDiffHygiene(root, { head: twoParentCommit }), /Canonical-Source trailer/);
});

test('a normal non-release HEAD whose public master points at an unavailable Canonical-Source object fails closed with an explicit diagnostic', () => {
  const { root, git, master } = releaseFixture();
  const missingSource = 'c'.repeat(40);
  git(['commit', '--allow-empty', '-qm', `release: publish\n\nCanonical-Source: ${missingSource}`]);
  const newMaster = git(['rev-parse', 'HEAD']);
  git(['checkout', '-qb', 'impl', newMaster]);
  writeFileSync(path.join(root, 'impl.txt'), 'impl\n');
  git(['add', '.']);
  git(['commit', '-qm', 'normal implementation commit']);
  assert.throws(
    () => verifyReleaseDiffHygiene(root),
    /cannot resolve a base.*does not exist in this checkout's object database/s,
  );
});

// Phase 5-D2-B PR-CI closure: GitHub's pull_request checkout is neither of the two contexts above —
// it is `refs/pull/N/merge`, a synthetic two-parent commit ("Merge <head> into <base>") that
// publicSafeReleaseParent() always rejects (it requires exactly one parent, checked before any
// trailer inspection) and that carries no Canonical-Source trailer of its own for the fallback to
// resolve. This reproduces that exact shape — a plain GitHub-style merge commit, not a hand-built
// release-trailer-shaped one — to prove the explicit `base` override (wired from
// github.event.pull_request.base.sha in quality-gates.yml) resolves it correctly.
function syntheticPrMergeFixture(prLine) {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-diff-hygiene-pr-merge-'));
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'master']);
  git(['config', 'user.name', 'Release Test']);
  git(['config', 'user.email', 'release@example.invalid']);
  writeFileSync(path.join(root, 'public.txt'), 'public content\n');
  git(['add', '.']);
  git(['commit', '-qm', 'public master content']);
  const master = git(['rev-parse', 'HEAD']);
  git(['checkout', '-qb', 'pr-head', master]);
  writeFileSync(path.join(root, 'public.txt'), `public content\n${prLine}\n`);
  git(['add', '.']);
  git(['commit', '-qm', 'public-safe PR head commit']);
  const prHead = git(['rev-parse', 'HEAD']);
  const tree = git(['write-tree']);
  const mergeCommit = execFileSync(
    'git',
    ['commit-tree', tree, '-p', master, '-p', prHead],
    { cwd: root, encoding: 'utf8', input: `Merge ${prHead} into ${master}\n` },
  ).trim();
  git(['checkout', '-q', 'master']);
  return { root, git, master, prHead, mergeCommit };
}

test('A: synthetic PR-merge HEAD with an explicit base passes cleanly, without needing the internal Canonical-Source object', () => {
  const { root, master, mergeCommit } = syntheticPrMergeFixture('a clean added line');
  const result = verifyReleaseDiffHygiene(root, { base: master, head: mergeCommit });
  assert.equal(result.base, master);
  assert.equal(result.head, mergeCommit);
});

test('B: synthetic PR-merge HEAD with an explicit base still catches a real whitespace defect', () => {
  const { root, master, mergeCommit } = syntheticPrMergeFixture('bad line ');
  assert.throws(
    () => verifyReleaseDiffHygiene(root, { base: master, head: mergeCommit }),
    /public\.txt.*trailing whitespace/s,
  );
});

test('C: synthetic PR-merge HEAD without an explicit base remains fail-closed (the exact real-world bug, unfixed)', () => {
  const { root, mergeCommit } = syntheticPrMergeFixture('a clean added line');
  // No Canonical-Source trailer exists anywhere in this fixture's master, so the two-parent
  // rejection falls through to the same "missing trailer" diagnostic covered by the existing
  // release-trailer-shaped two-parent test above — proving this plain GitHub-style merge commit
  // (no trailers of its own at all) is never silently treated as public-safe either.
  assert.throws(
    () => verifyReleaseDiffHygiene(root, { head: mergeCommit }),
    /Canonical-Source trailer/,
  );
});

test('D: an unresolvable explicit base fails clearly instead of being silently ignored', () => {
  const { root, mergeCommit } = syntheticPrMergeFixture('a clean added line');
  assert.throws(
    () => verifyReleaseDiffHygiene(root, { base: 'not-a-real-commit-ish', head: mergeCommit }),
    /Explicit release diff base "not-a-real-commit-ish" does not resolve to a commit/,
  );
});

// Phase 5-D2-B master-push closure: distinct from the PR synthetic-merge shape above (a two-parent
// commit rejected purely on parent count). A repository-sync commit that becomes the new master HEAD
// via a normal push is single-parented, so publicSafeReleaseParent() proceeds past the parent-count
// check and rejects it for a different reason — it carries Canonical-Source/Canonical-Tree but
// deliberately no Canonical-Artifact/Release-Manifest (not a full release build), so the DIGEST checks
// fail. The fallback then reads the pushed commit's own Canonical-Source, which — being purely
// internal — never exists in a fresh public checkout either. Explicit base (github.event.before, the
// previous master) resolves this the same way it resolves the PR case.
function masterPushSyncFixture(newContentLine) {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-diff-hygiene-master-push-'));
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'master']);
  git(['config', 'user.name', 'Release Test']);
  git(['config', 'user.email', 'release@example.invalid']);
  writeFileSync(path.join(root, 'public.txt'), 'public content\n');
  git(['add', '.']);
  git(['commit', '-qm', 'previous public master content']);
  const oldMaster = git(['rev-parse', 'HEAD']);
  writeFileSync(path.join(root, 'public.txt'), `public content\n${newContentLine}\n`);
  git(['add', '.']);
  const unavailableInternalSource = 'd'.repeat(40);
  const tree = git(['write-tree']);
  git(['commit', '-qm', `chore: reconcile post-release repository state\n\nCanonical-Source: ${unavailableInternalSource}\nCanonical-Tree: ${tree}`]);
  const newHead = git(['rev-parse', 'HEAD']);
  return { root, git, oldMaster, newHead };
}

test('A: master-push repository-sync HEAD with an explicit base (github.event.before) passes cleanly', () => {
  const { root, oldMaster, newHead } = masterPushSyncFixture('a clean added line');
  const result = verifyReleaseDiffHygiene(root, { base: oldMaster, head: newHead });
  assert.equal(result.base, oldMaster);
  assert.equal(result.head, newHead);
});

test('B: master-push repository-sync HEAD with an explicit base still catches a real whitespace defect', () => {
  const { root, oldMaster, newHead } = masterPushSyncFixture('bad line ');
  assert.throws(
    () => verifyReleaseDiffHygiene(root, { base: oldMaster, head: newHead }),
    /public\.txt.*trailing whitespace/s,
  );
});

test('the guard is wired into the unified release-candidate gate under Workflow and release policy', async () => {
  const { phases } = await import('../scripts/release/candidate.mjs');
  const [, scripts] = phases.find(([name]) => name === 'Workflow and release policy');
  assert.ok(scripts.includes('verify:release-diff-hygiene'), 'verify:release-diff-hygiene must be wired into the unified gate.');
});

test('the D1E-era mixed-line-ending defect in src/pages/blog/[slug].astro is repaired in the current release delta', () => {
  // The real development repository intentionally permits local master and the public remote-tracking
  // ref to differ. Select the public identity explicitly for this test; the production guard remains
  // fail-closed when its caller does not disambiguate multiple refs.
  const base = resolvePublicCanonicalSource(ROOT, 'refs/remotes/origin/master');
  const result = verifyReleaseDiffHygiene(ROOT, { base });
  assert.equal(result.head.length, 40);
});
