#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { verifyReleaseArtifacts } from './provenance.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;

const git = (root, args, options = {}) => execFileSync('git', args, {
  cwd: root,
  encoding: 'utf8',
  ...options,
}).trim();

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function publicMaster(root) {
  for (const ref of ['refs/heads/master', 'refs/remotes/origin/master']) {
    try {
      return git(root, ['rev-parse', '--verify', ref]);
    } catch {}
  }
  throw new Error('Current public master reference is unavailable.');
}

function assertTrackedTree(root) {
  const tracked = git(root, ['ls-files']).split('\n').filter(Boolean);
  const forbidden = tracked.filter((file) => (
    file === 'dist'
    || file.startsWith('dist/')
    || file.startsWith('.artifacts/')
    || file === 'functions/_generated/release-identity.ts'
    || /(?:^|\/)(?:raw[-_ ]?audit|audit[-_ ]?raw)(?:[./_-]|$)/i.test(file)
  ));
  invariant(forbidden.length === 0, `Forbidden public-release files: ${forbidden.join(', ')}`);
}

function trailers(root, revision = 'HEAD') {
  const message = git(root, ['show', '-s', '--format=%B', revision]);
  const matches = [...message.matchAll(/^(Canonical-Source|Canonical-Tree|Canonical-Artifact|Release-Manifest): ([a-f0-9]+)$/gm)];
  invariant(new Set(matches.map((match) => match[1])).size === matches.length, 'Release trailers must be unique.');
  return Object.fromEntries(matches.map((match) => [match[1], match[2]]));
}

export function verifyReleaseCommit(root = ROOT) {
  const values = trailers(root);
  invariant(SHA.test(values['Canonical-Source'] ?? ''), 'Missing canonical source trailer.');
  invariant(SHA.test(values['Canonical-Tree'] ?? ''), 'Missing canonical tree trailer.');
  invariant(DIGEST.test(values['Canonical-Artifact'] ?? ''), 'Missing canonical artifact trailer.');
  invariant(DIGEST.test(values['Release-Manifest'] ?? ''), 'Missing release manifest trailer.');
  invariant(git(root, ['rev-parse', 'HEAD^{tree}']) === values['Canonical-Tree'], 'Release tree does not match canonical tree trailer.');
  invariant(git(root, ['rev-list', '--parents', '-n', '1', 'HEAD']).split(' ').length === 2, 'Release commit must have one parent.');
  const branch = git(root, ['branch', '--show-current']);
  if (branch !== 'master') {
    invariant(git(root, ['rev-parse', 'HEAD^']) === publicMaster(root), 'Preview release parent must be current master.');
  }
  assertTrackedTree(root);
  return values;
}

export async function proveDryRun(root = ROOT, output = path.join(root, '.artifacts/release')) {
  const { manifest } = await verifyReleaseArtifacts(root, output);
  assertTrackedTree(root);
  const canonicalSource = git(root, ['rev-parse', 'HEAD']);
  const canonicalTree = git(root, ['rev-parse', 'HEAD^{tree}']);
  const publicParent = publicMaster(root);
  const manifestDigest = createHash('sha256')
    .update(readFileSync(path.join(output, 'release-manifest.json')))
    .digest('hex');
  const temporary = mkdtempSync(path.join(tmpdir(), 'portfolio-public-release-'));
  const clone = path.join(temporary, 'repository');
  try {
    execFileSync('git', ['clone', '--quiet', '--no-hardlinks', '--local', root, clone]);
    const message = [
      'release: publish reviewed portfolio candidate',
      '',
      `Canonical-Source: ${canonicalSource}`,
      `Canonical-Tree: ${canonicalTree}`,
      `Canonical-Artifact: ${manifest.checksums.artifactTree}`,
      `Release-Manifest: ${manifestDigest}`,
      '',
    ].join('\n');
    const releaseCommit = execFileSync(
      'git',
      ['commit-tree', canonicalTree, '-p', publicParent],
      {
        cwd: clone,
        encoding: 'utf8',
        input: message,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'Release Proof',
          GIT_AUTHOR_EMAIL: 'release-proof@example.invalid',
          GIT_COMMITTER_NAME: 'Release Proof',
          GIT_COMMITTER_EMAIL: 'release-proof@example.invalid',
          GIT_AUTHOR_DATE: manifest.sourceCommitTime,
          GIT_COMMITTER_DATE: manifest.sourceCommitTime,
        },
      },
    ).trim();
    invariant(git(clone, ['rev-parse', `${releaseCommit}^`]) === publicParent, 'Synthetic release parent drift.');
    invariant(git(clone, ['rev-parse', `${releaseCommit}^{tree}`]) === canonicalTree, 'Synthetic release tree drift.');
    invariant(trailers(clone, releaseCommit)['Canonical-Artifact'] === manifest.checksums.artifactTree, 'Synthetic artifact trailer drift.');
    return {
      canonicalSource,
      canonicalTree,
      publicParent,
      releaseCommit,
      artifactDigest: manifest.checksums.artifactTree,
      manifestDigest,
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'verify') {
    assertTrackedTree(ROOT);
    if (process.argv.includes('--require-release-commit')) {
      console.log(JSON.stringify(verifyReleaseCommit(ROOT)));
    } else {
      console.log('public-release-lineage: PASS (tracked-tree policy)');
    }
    return;
  }
  if (command === 'prepare') {
    invariant(process.argv.includes('--dry-run'), 'Public release preparation is dry-run only.');
    console.log(JSON.stringify(await proveDryRun(ROOT), null, 2));
    return;
  }
  throw new Error('Usage: public-lineage.mjs verify [--require-release-commit] | prepare --dry-run');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
