#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { resolvePublicCanonicalSource } from './public-lineage.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

// Applies `git diff --check` to the complete release delta (last published public source -> the
// current candidate HEAD), not merely the working tree or the latest commit — so a whitespace defect
// introduced by any commit since the last release is caught before it reaches a formal gate PASS,
// closing the gap that let D1E push with 4 unrepaired mixed-line-ending lines.
export function verifyReleaseDiffHygiene(root = ROOT, { base, head = 'HEAD' } = {}) {
  const resolvedBase = base ?? resolvePublicCanonicalSource(root);
  const resolvedHead = git(root, ['rev-parse', head]).trim();
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
