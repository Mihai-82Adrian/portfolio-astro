import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { verifyReleaseCommit } from '../scripts/release/public-lineage.mjs';

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
