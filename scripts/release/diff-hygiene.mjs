#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { resolvePublicCanonicalSource } from './public-lineage.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

function objectExists(root, revision) {
  try {
    execFileSync('git', ['rev-parse', '--verify', `${revision}^{commit}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

// Narrow, read-only, single-purpose shape check — NOT a re-implementation of
// public-lineage.mjs's verifyReleaseCommit() (which also resolves/cross-checks the current public
// master and rejects forbidden tracked files; concerns already owned by the separate
// verify:public-release-lineage gate phase). This only needs to know: does `revision` look enough
// like a real public-safe release commit that ITS OWN real git parent is a safe, always-fetchable
// diff base? Returns that parent SHA, or null if `revision` does not have that shape.
function publicSafeReleaseParent(root, revision) {
  let parents;
  try {
    parents = git(root, ['rev-list', '--parents', '-n', '1', revision]).trim().split(' ');
  } catch {
    return null;
  }
  if (parents.length !== 2) return null;
  const message = git(root, ['show', '-s', '--format=%B', revision]);
  const matches = [...message.matchAll(/^(Canonical-Source|Canonical-Tree|Canonical-Artifact|Release-Manifest): ([a-f0-9]+)$/gm)];
  const values = Object.fromEntries(matches.map((match) => [match[1], match[2]]));
  if (!SHA.test(values['Canonical-Source'] ?? '')) return null;
  if (!SHA.test(values['Canonical-Tree'] ?? '')) return null;
  if (!DIGEST.test(values['Canonical-Artifact'] ?? '')) return null;
  if (!DIGEST.test(values['Release-Manifest'] ?? '')) return null;
  if (git(root, ['rev-parse', `${revision}^{tree}`]).trim() !== values['Canonical-Tree']) return null;
  return parents[1];
}

// Applies `git diff --check` to the complete release delta, resolving the correct base for either of
// two distinct contexts this same guard runs in:
//
// - INTERNAL context (the implementation worktree, before a public-safe candidate exists): HEAD is a
//   normal implementation commit. The complete delta is measured from the last publicly released
//   internal source (the current public master's own Canonical-Source trailer) — that object only
//   exists in local/internal history, which is fine here because this worktree has it.
// - PUBLIC-SAFE CI context (a pushed release branch, checked out fresh in CI): HEAD is itself a
//   public-safe release commit built by `git commit-tree`. Its Canonical-Source trailer names an
//   internal commit that was NEVER pushed to the public remote and will never exist in that checkout
//   even with full history fetched — attempting to diff against it always fails with "bad object".
//   The correct, always-available base there is HEAD's own real git parent (the public master it was
//   built on), which proves the identical complete candidate delta because HEAD's tree equals the
//   internal canonical tree by construction.
//
// Ambiguous/malformed input (e.g. a release-shaped commit with two parents, or a normal commit whose
// public master points at an unavailable Canonical-Source) fails closed with an explicit diagnostic —
// it never silently substitutes HEAD^ for an arbitrary non-release commit.
export function verifyReleaseDiffHygiene(root = ROOT, { base, head = 'HEAD' } = {}) {
  const resolvedHead = git(root, ['rev-parse', head]).trim();
  let resolvedBase = base;
  if (!resolvedBase) {
    const releaseParent = publicSafeReleaseParent(root, resolvedHead);
    if (releaseParent) {
      resolvedBase = releaseParent;
    } else {
      const canonicalSource = resolvePublicCanonicalSource(root);
      if (!objectExists(root, canonicalSource)) {
        throw new Error(
          `Release-delta diff hygiene: cannot resolve a base. ${resolvedHead} is not itself a valid ` +
          `public-safe release commit (single parent with matching release trailers), and the current ` +
          `public master's Canonical-Source (${canonicalSource}) does not exist in this checkout's ` +
          'object database. Pass an explicit { base } if this checkout intentionally lacks that history.',
        );
      }
      resolvedBase = canonicalSource;
    }
  }
  try {
    execFileSync('git', ['diff', '--check', resolvedBase, resolvedHead], { cwd: root, encoding: 'utf8' });
  } catch (error) {
    if (typeof error.status !== 'number') throw error;
    const findings = (error.stdout ?? '').trim();
    throw new Error(`Release-delta diff hygiene failed (${resolvedBase}..${resolvedHead}):\n${findings}`);
  }
  return { base: resolvedBase, head: resolvedHead };
}

function main() {
  const result = verifyReleaseDiffHygiene(ROOT);
  console.log('release-diff-hygiene: PASS');
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
