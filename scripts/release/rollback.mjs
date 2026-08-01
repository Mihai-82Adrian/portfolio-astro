#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { validateManifest } from './provenance.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadManifest(file) {
  if (!file) throw new Error('Both --current-manifest and --target-manifest are required.');
  const resolved = path.resolve(file);
  const manifest = JSON.parse(readFileSync(resolved, 'utf8'));
  validateManifest(manifest);
  return { manifest, directory: path.dirname(resolved) };
}

export function planRollback(currentFile, targetFile) {
  const current = loadManifest(currentFile);
  const target = loadManifest(targetFile);
  if (current.manifest.releaseIdentity.releaseId === target.manifest.releaseIdentity.releaseId) {
    throw new Error('Rollback target must be a different release.');
  }
  for (const file of ['artifact-tree.sha256', 'deploy']) {
    if (!existsSync(path.join(target.directory, file))) throw new Error(`Target artifact evidence is missing: ${file}`);
  }
  return {
    schemaVersion: 1,
    action: 'PLAN_ONLY',
    current: {
      releaseId: current.manifest.releaseIdentity.releaseId,
      sourceRevision: current.manifest.sourceRevision,
      artifactDigest: current.manifest.checksums.artifactTree,
    },
    target: {
      releaseId: target.manifest.releaseIdentity.releaseId,
      sourceRevision: target.manifest.sourceRevision,
      publicReleaseCommit: target.manifest.sourceRevision,
      artifactDigest: target.manifest.checksums.artifactTree,
    },
    checklist: [
      'Confirm incident severity and choose endpoint disablement, deployment abort, rollback, or observation.',
      'Obtain owner authorization for the exact retained target artifact.',
      'Reverify the target manifest, build dependency SBOM, artifact digest, and public release lineage.',
      'Deploy the retained target artifact without rebuilding it.',
      'Run verify:postdeploy with the target release identity.',
      'Record the decision and retain the superseded artifact for investigation.',
    ],
    abortConditions: [
      'target evidence missing or digest mismatch',
      'target public release commit not approved',
      'deployment ownership or Cloudflare Git integration parity unconfirmed',
      'postdeploy verification cannot run safely',
    ],
    execution: 'No Git, Cloudflare, provider, or deployment command was executed.',
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(planRollback(option('--current-manifest'), option('--target-manifest')), null, 2));
}
