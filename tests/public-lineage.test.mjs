import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { verifyReleaseCommit } from '../scripts/release/public-lineage.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

test('canonical-candidate vs. deployed-public-preview release identity is explicitly documented (Workstream B §5.2)', () => {
  assert.match(
    read('docs/operations/rollback-postdeploy.md'),
    /deployed public preview release identity/i,
    'rollback-postdeploy.md must name and distinguish the deployed identity from the canonical candidate identity',
  );
  assert.match(
    read('scripts/release/provenance.mjs'),
    /public-safe preview build differs from the internal canonical candidate/i,
    'provenance.mjs must carry the same clarification next to readSourceIdentity()',
  );
});

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-lineage-test-'));
  execFileSync('git', ['init', '-q', '-b', 'master'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Release Test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'release@example.invalid'], { cwd: root });
  writeFileSync(path.join(root, 'index.txt'), 'public\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'public'], { cwd: root });
  execFileSync('git', ['switch', '-qc', 'release/candidate'], { cwd: root });
  writeFileSync(path.join(root, 'index.txt'), 'candidate\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  const tree = execFileSync('git', ['write-tree'], { cwd: root, encoding: 'utf8' }).trim();
  const source = 'a'.repeat(40);
  const digest = 'b'.repeat(64);
  execFileSync('git', ['commit', '-qm', [
    'release candidate',
    '',
    `Canonical-Source: ${source}`,
    `Canonical-Tree: ${tree}`,
    `Canonical-Artifact: ${digest}`,
    `Release-Manifest: ${'c'.repeat(64)}`,
  ].join('\n')], { cwd: root });
  return { root, source, digest };
}

test('release commit has one public parent, exact canonical tree, and bounded trailers', () => {
  const { root, source, digest } = fixture();
  const result = verifyReleaseCommit(root);
  assert.equal(result['Canonical-Source'], source);
  assert.equal(result['Canonical-Artifact'], digest);
});

test('release commit rejects tracked generated evidence and a non-public parent', () => {
  const generated = fixture();
  mkdirSync(path.join(generated.root, '.artifacts'), { recursive: true });
  writeFileSync(path.join(generated.root, '.artifacts', 'release.json'), '{}');
  execFileSync('git', ['add', '-f', '.artifacts/release.json'], { cwd: generated.root });
  execFileSync('git', ['commit', '-qm', 'forbidden'], { cwd: generated.root });
  assert.throws(() => verifyReleaseCommit(generated.root), /canonical source|one parent|parent|forbidden/i);
});

// Phase 3-B2 (Workstream B / public-parent resolution): the previous implementation always
// preferred local refs/heads/master over refs/remotes/origin/master. In this project's normal
// multi-worktree topology, a separate, intentionally protected local `master` worktree shares
// refs/heads/* with every other worktree and can legitimately sit at a different revision than
// refs/remotes/origin/master (confirmed during Phase 3-B Wave 1) — silently preferring the local
// ref there would have parented a real release commit on the wrong "public master".

test('local-master shadowing: ambiguous refs/heads/master vs refs/remotes/origin/master fails closed without --public-parent', () => {
  const { root } = fixture();
  // git init -b master already makes refs/heads/master the release commit's true public parent
  // (from fixture()); point refs/remotes/origin/master at the release commit itself, a different
  // revision, to simulate a stale/diverged local master worktree.
  execFileSync('git', ['update-ref', 'refs/remotes/origin/master', 'release/candidate'], { cwd: root });
  assert.throws(() => verifyReleaseCommit(root), /ambiguous public master/i);
});

test('explicit --public-parent resolves an ambiguous ref by name and verifies correctly', () => {
  const { root } = fixture();
  const masterSha = execFileSync('git', ['rev-parse', 'master'], { cwd: root, encoding: 'utf8' }).trim();
  execFileSync('git', ['update-ref', 'refs/remotes/origin/master', 'release/candidate'], { cwd: root });
  const result = verifyReleaseCommit(root, { publicParent: 'refs/heads/master' });
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD^'], { cwd: root, encoding: 'utf8' }).trim(), masterSha);
  assert.ok(result['Canonical-Source']);
});

test('explicit --public-parent resolves an ambiguous ref by raw SHA and verifies correctly', () => {
  const { root } = fixture();
  const masterSha = execFileSync('git', ['rev-parse', 'master'], { cwd: root, encoding: 'utf8' }).trim();
  execFileSync('git', ['update-ref', 'refs/remotes/origin/master', 'release/candidate'], { cwd: root });
  const result = verifyReleaseCommit(root, { publicParent: masterSha });
  assert.ok(result['Canonical-Source']);
});

test('explicit --public-parent that does not match the release commit\'s actual parent fails', () => {
  const { root } = fixture();
  // Point the explicit parent at the release commit itself (definitely not its own parent).
  assert.throws(
    () => verifyReleaseCommit(root, { publicParent: 'release/candidate' }),
    /preview release parent must be current master/i,
  );
});

test('missing public-master reference (no local, no remote, no explicit) fails closed', () => {
  const { root } = fixture();
  execFileSync('git', ['branch', '-D', 'master'], { cwd: root });
  assert.throws(() => verifyReleaseCommit(root), /public master reference is unavailable/i);
});

test('two agreeing candidates (normal single-clone case) resolve without an explicit --public-parent', () => {
  const { root } = fixture();
  const masterSha = execFileSync('git', ['rev-parse', 'master'], { cwd: root, encoding: 'utf8' }).trim();
  // A fresh clone/CI checkout normally has refs/remotes/origin/master pointing at the same commit
  // as refs/heads/master — this must keep resolving automatically, no explicit flag required.
  execFileSync('git', ['update-ref', 'refs/remotes/origin/master', masterSha], { cwd: root });
  const result = verifyReleaseCommit(root);
  assert.ok(result['Canonical-Source']);
});
