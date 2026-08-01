#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { verifyReleaseArtifacts } from './provenance.mjs';
import { verifyReleasePolicy, verifyToolchain } from './guards.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const RELEASE = path.join(ROOT, '.artifacts/release');
const TRANSFER = path.join(ROOT, '.artifacts/release-candidate/transfer');

const sha256File = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function prepare(expectedReleaseId) {
  invariant(/^git-[a-f0-9]{16}$/.test(expectedReleaseId ?? ''), 'Expected release ID is invalid.');
  verifyToolchain(ROOT);
  verifyReleasePolicy(ROOT);
  const { manifest } = await verifyReleaseArtifacts(ROOT, RELEASE);
  invariant(manifest.releaseIdentity.releaseId === expectedReleaseId, 'Expected release ID mismatch.');
  rmSync(TRANSFER, { recursive: true, force: true });
  mkdirSync(TRANSFER, { recursive: true });
  for (const name of ['deploy', 'release-manifest.json', 'sbom.cdx.json', 'artifact-tree.sha256']) {
    cpSync(path.join(RELEASE, name), path.join(TRANSFER, name), { recursive: true });
  }
  const transfer = {
    schemaVersion: 1,
    releaseId: expectedReleaseId,
    sourceRevision: manifest.sourceRevision,
    artifactDigest: manifest.checksums.artifactTree,
    manifestDigest: sha256File(path.join(TRANSFER, 'release-manifest.json')),
  };
  writeFileSync(path.join(TRANSFER, 'transfer.json'), `${JSON.stringify(transfer, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, [
      `source_revision=${transfer.sourceRevision}`,
      `release_id=${transfer.releaseId}`,
      `artifact_digest=${transfer.artifactDigest}`,
      '',
    ].join('\n'));
  }
  console.log(JSON.stringify(transfer));
}

async function consume() {
  const policy = verifyReleasePolicy(ROOT);
  verifyToolchain(ROOT);
  invariant(process.env.DEPLOYMENT_OWNER === policy.remotePrerequisites.deploymentOwnerValue, 'Deployment owner prerequisite is unconfirmed.');
  invariant(process.env.CLOUDFLARE_GIT_INTEGRATION_DISABLED === policy.remotePrerequisites.gitIntegrationValue, 'Cloudflare Git integration disablement is unconfirmed.');
  invariant(Boolean(process.env.CLOUDFLARE_API_TOKEN), 'Required Cloudflare API token is unavailable.');
  invariant(Boolean(process.env.CLOUDFLARE_ACCOUNT_ID), 'Required Cloudflare account ID is unavailable.');
  const allowed = ['artifact-tree.sha256', 'deploy', 'release-manifest.json', 'sbom.cdx.json', 'transfer.json'];
  invariant(JSON.stringify(readdirSync(TRANSFER).sort()) === JSON.stringify(allowed), 'Transferred artifact contains unexpected files.');
  const transfer = JSON.parse(readFileSync(path.join(TRANSFER, 'transfer.json'), 'utf8'));
  const { manifest } = await verifyReleaseArtifacts(ROOT, TRANSFER);
  invariant(transfer.manifestDigest === sha256File(path.join(TRANSFER, 'release-manifest.json')), 'Transferred manifest digest mismatch.');
  invariant(transfer.releaseId === process.env.EXPECTED_RELEASE_ID, 'Transferred release ID mismatch.');
  invariant(transfer.sourceRevision === process.env.EXPECTED_SOURCE_REVISION, 'Transferred source revision mismatch.');
  invariant(transfer.artifactDigest === process.env.EXPECTED_ARTIFACT_DIGEST, 'Transferred artifact digest mismatch.');
  invariant(manifest.releaseIdentity.releaseId === transfer.releaseId, 'Manifest release ID mismatch.');
  console.log('Verified artifact and remote ownership prerequisites accepted.');
}

const command = process.argv[2];
if (command === 'prepare') await prepare(process.argv[3]);
else if (command === 'consume') await consume();
else throw new Error('Usage: workflow-artifact.mjs prepare <release-id> | consume');
