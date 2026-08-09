// Phase 5-D2-B proportional-validation closure: permanent coverage for the deterministic
// change-impact classifier that decides which validation groups Quality Checks runs. See
// scripts/ci/change-impact.mjs for the rule table and rationale.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { classifyChangedFiles, shouldForceFullGate, RULES } from '../scripts/ci/change-impact.mjs';

// Real-git simulations: exercise the exact `git diff --name-only <base> <head>` command
// scripts/ci/change-impact.mjs's main() runs, against a real repository (not a mocked path list),
// to prove the wiring itself -- not only the pure classifyChangedFiles() function above.
function realGitFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-change-impact-'));
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'master']);
  git(['config', 'user.name', 'CI Test']);
  git(['config', 'user.email', 'ci@example.invalid']);
  writeFileSync(path.join(root, 'README.md'), 'baseline\n');
  git(['add', '.']);
  git(['commit', '-qm', 'baseline']);
  const base = git(['rev-parse', 'HEAD']);
  return { root, git, base };
}

function namedFiles(root, git, base, files) {
  for (const file of files) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), 'content\n');
  }
  git(['add', '.']);
  git(['commit', '-qm', 'change']);
  const head = git(['rev-parse', 'HEAD']);
  const changed = git(['diff', '--name-only', base, head]).split('\n').filter(Boolean);
  return changed;
}

test('real-git: docs-only commit classifies to documentation, no KoSIT', () => {
  const { root, git, base } = realGitFixture();
  const changed = namedFiles(root, git, base, ['docs/operations/example.md']);
  const result = classifyChangedFiles(changed);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['documentation']);
});

test('real-git: release-control-plane commit does not select KoSIT', () => {
  const { root, git, base } = realGitFixture();
  const changed = namedFiles(root, git, base, ['.github/workflows/quality-gates.yml']);
  const result = classifyChangedFiles(changed);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['release-control-plane']);
  assert.ok(!result.scripts.includes('verify:xrechnung:kosit'));
});

test('real-git: XRechnung commit selects KoSIT', () => {
  const { root, git, base } = realGitFixture();
  const changed = namedFiles(root, git, base, ['src/lib/xrechnung/cii.ts']);
  const result = classifyChangedFiles(changed);
  assert.equal(result.fullGate, false);
  assert.ok(result.scripts.includes('verify:xrechnung:kosit'));
});

test('real-git: mixed docs+XRechnung commit unions both, still not the full gate', () => {
  const { root, git, base } = realGitFixture();
  const changed = namedFiles(root, git, base, ['README.md', 'src/lib/xrechnung/cii.ts']);
  const result = classifyChangedFiles(changed);
  assert.equal(result.fullGate, false);
  assert.deepEqual(new Set(result.groups), new Set(['documentation', 'xrechnung']));
});

test('real-git: an unrecognized path fails closed to the full gate', () => {
  const { root, git, base } = realGitFixture();
  const changed = namedFiles(root, git, base, ['some/new/unmapped-surface.dat']);
  const result = classifyChangedFiles(changed);
  assert.equal(result.fullGate, true);
});

test('real-git: PR synthetic two-parent merge HEAD -- git diff --name-only still lists the real changed files', () => {
  const { root, git, base } = realGitFixture();
  git(['checkout', '-qb', 'pr-head', base]);
  mkdirSync(path.join(root, 'docs', 'operations'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'operations', 'pr-example.md'), 'content\n');
  git(['add', '.']);
  git(['commit', '-qm', 'pr change']);
  const prHead = git(['rev-parse', 'HEAD']);
  const tree = git(['write-tree']);
  const mergeCommit = execFileSync(
    'git',
    ['commit-tree', tree, '-p', base, '-p', prHead],
    { cwd: root, encoding: 'utf8', input: `Merge ${prHead} into ${base}\n` },
  ).trim();
  const changed = git(['diff', '--name-only', base, mergeCommit]).split('\n').filter(Boolean);
  const result = classifyChangedFiles(changed);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['documentation']);
});

test('real-git: master-push repository-sync HEAD -- git diff --name-only against github.event.before still classifies correctly', () => {
  const { root, git, base: oldMaster } = realGitFixture();
  mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  writeFileSync(path.join(root, '.github', 'workflows', 'quality-gates.yml'), 'name: x\n');
  git(['add', '.']);
  git(['commit', '-qm', 'chore: reconcile post-release repository state']);
  const newMaster = git(['rev-parse', 'HEAD']);
  const changed = git(['diff', '--name-only', oldMaster, newMaster]).split('\n').filter(Boolean);
  const result = classifyChangedFiles(changed);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['release-control-plane']);
  assert.ok(!result.scripts.includes('verify:xrechnung:kosit'));
});

test('documentation-only change selects only documentation truth validation, not KoSIT/browser/provider/full gate', () => {
  const result = classifyChangedFiles(['README.md']);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['documentation']);
  assert.deepEqual(new Set(result.scripts), new Set(['verify:governance', 'verify:repo-truth']));
  assert.ok(!result.scripts.includes('verify:xrechnung:kosit'));
  assert.ok(!result.scripts.includes('verify:xrechnung:kosit:tooling'));
  assert.ok(!result.scripts.includes('verify:ai-provider-contracts'));
  assert.ok(!result.scripts.includes('build'));
});

test('governance-only change (AGENTS.md) selects governance/repo-truth, not unrelated product qualification', () => {
  const result = classifyChangedFiles(['AGENTS.md']);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['repository-governance']);
  assert.deepEqual(new Set(result.scripts), new Set(['verify:governance', 'verify:repo-truth']));
});

test('release-control-plane change selects workflow/release-policy/diff-hygiene, not KoSIT (unless XRechnung is also affected)', () => {
  const result = classifyChangedFiles(['.github/workflows/quality-gates.yml', 'scripts/release/diff-hygiene.mjs']);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['release-control-plane']);
  const scripts = new Set(result.scripts);
  assert.ok(scripts.has('verify:workflows'));
  assert.ok(scripts.has('verify:release-policy'));
  assert.ok(scripts.has('verify:release-diff-hygiene'));
  assert.ok(scripts.has('verify:governance'));
  assert.ok(scripts.has('verify:repo-truth'));
  assert.ok(!scripts.has('verify:xrechnung:kosit'), 'KoSIT must not run for a release-control-plane-only change');
  assert.ok(!scripts.has('verify:xrechnung:kosit:tooling'));
});

test('XRechnung/XML change MUST select KoSIT', () => {
  const result = classifyChangedFiles(['src/lib/xrechnung/ubl.ts']);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['xrechnung']);
  const scripts = new Set(result.scripts);
  assert.ok(scripts.has('verify:xrechnung:kosit'));
  assert.ok(scripts.has('verify:xrechnung:kosit:tooling'));
  assert.ok(scripts.has('kosit:preflight'));
  assert.ok(scripts.has('verify:xrechnung:fixtures'));
});

test('AI-provider change MUST select provider validation', () => {
  const result = classifyChangedFiles(['functions/api/chat.ts']);
  assert.equal(result.fullGate, false);
  // functions/api/chat.ts is simultaneously a Pages Function and a provider endpoint, so both
  // groups correctly match (union, not exclusive classification) -- the assertion that matters is
  // that provider validation is present, not that it is the *only* group selected.
  assert.deepEqual(new Set(result.groups), new Set(['ai-provider', 'functions']));
  const scripts = new Set(result.scripts);
  assert.ok(scripts.has('verify:ai-provider-contracts'));
  assert.ok(scripts.has('verify:ai-reliability'));
  assert.ok(!scripts.has('verify:xrechnung:kosit'));
  assert.ok(!scripts.has('build'));
});

test('runtime/UI change selects check/build and affected runtime validation', () => {
  const result = classifyChangedFiles(['src/components/ui/Card.astro']);
  assert.equal(result.fullGate, false);
  assert.deepEqual(result.groups, ['runtime-ui']);
  const scripts = new Set(result.scripts);
  assert.ok(scripts.has('check'));
  assert.ok(scripts.has('build'));
});

test('mixed README + XRechnung change unions exactly the two groups, not the full gate', () => {
  const result = classifyChangedFiles(['README.md', 'src/lib/xrechnung/ubl.ts']);
  assert.equal(result.fullGate, false);
  assert.deepEqual(new Set(result.groups), new Set(['documentation', 'xrechnung']));
  const scripts = new Set(result.scripts);
  assert.ok(scripts.has('verify:governance'));
  assert.ok(scripts.has('verify:xrechnung:kosit'));
});

test('an unclassified path fails closed to the full release-candidate gate', () => {
  const result = classifyChangedFiles(['some/entirely/unmapped/path.xyz']);
  assert.equal(result.fullGate, true);
  assert.match(result.reason, /unclassified path/);
  assert.match(result.reason, /some\/entirely\/unmapped\/path\.xyz/);
});

test('one unclassified path among otherwise-classified paths still fails the whole change closed', () => {
  const result = classifyChangedFiles(['README.md', 'some/unmapped/path.xyz']);
  assert.equal(result.fullGate, true);
  assert.match(result.reason, /some\/unmapped\/path\.xyz/);
});

test('a real production/release candidate context forces the full gate regardless of diff', () => {
  assert.equal(shouldForceFullGate({ eventName: 'push', ref: 'refs/heads/release/phase-x' }), true);
  assert.equal(shouldForceFullGate({ eventName: 'workflow_dispatch', ref: 'refs/heads/master' }), true);
});

test('ordinary pull_request and push-to-master contexts do not force the full gate', () => {
  assert.equal(shouldForceFullGate({ eventName: 'pull_request', ref: 'refs/pull/1/merge' }), false);
  assert.equal(shouldForceFullGate({ eventName: 'push', ref: 'refs/heads/master' }), false);
});

test('every rule references only npm scripts that actually exist in package.json', async () => {
  const packageJson = await import('../package.json', { with: { type: 'json' } });
  const scripts = packageJson.default.scripts;
  for (const rule of RULES) {
    for (const script of rule.scripts) {
      assert.ok(Object.prototype.hasOwnProperty.call(scripts, script), `${rule.group}: npm script "${script}" does not exist in package.json`);
    }
  }
});

test('no rule group name is duplicated', () => {
  const groups = RULES.map((rule) => rule.group);
  assert.equal(new Set(groups).size, groups.length);
});
