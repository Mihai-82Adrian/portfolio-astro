// Phase 4-R1: GitHub Actions run 31032716165 failed to deploy because actions/upload-artifact
// excludes hidden files by default and release.yml did not set include-hidden-files: true. The
// verified pre-upload deploy tree had 468 checksum-participating files; the downloaded artifact
// had 467 — missing exactly deploy/.htaccess (source: public/.htaccess, 692 bytes). Restoring that
// file reproduces the expected artifact-tree digest
// 33b4e49a92abcccf16df2f06063f03affdfd6d592e636b4f3dff80ca30ea963f exactly. These tests prove the
// workflow fix, the positive transport contract, the exact incident regression, and a fail-closed
// hidden-path allowlist that a regenerated/self-consistent checksum cannot bypass.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createManifest,
  createReleaseIdentity,
  digestArtifactTree,
  sha256File,
  trackedSourceChecksum,
  verifyReleaseArtifacts,
} from '../scripts/release/provenance.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');
const REVISION = 'a'.repeat(40);
const COMMIT_TIME = '2026-07-24T12:00:00.000Z';

function tempDir(name) {
  return mkdtempSync(path.join(tmpdir(), `portfolio-${name}-`));
}

function buildFixture() {
  const root = tempDir('artifact-transport');
  const repository = path.join(root, 'repository');
  const output = path.join(root, 'output');
  const deploy = path.join(output, 'deploy');
  mkdirSync(path.join(repository, 'config'), { recursive: true });
  mkdirSync(path.join(repository, 'functions', 'api'), { recursive: true });
  mkdirSync(deploy, { recursive: true });
  writeFileSync(path.join(repository, 'package.json'), '{"name":"portfolio-astro"}\n');
  writeFileSync(path.join(repository, 'package-lock.json'), '{"lockfileVersion":3}\n');
  writeFileSync(path.join(repository, 'wrangler.jsonc'), '{}\n');
  writeFileSync(path.join(repository, 'config', 'release-policy.json'), '{}\n');
  writeFileSync(path.join(repository, 'functions', 'api', 'health.ts'), 'export const onRequest = () => new Response();\n');
  execFileSync('git', ['init', '-q'], { cwd: repository });
  execFileSync('git', ['config', 'user.name', 'Release Test'], { cwd: repository });
  execFileSync('git', ['config', 'user.email', 'release@example.invalid'], { cwd: repository });
  execFileSync('git', ['add', '.'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: repository });
  writeFileSync(path.join(deploy, 'index.html'), '<h1>candidate</h1>\n');
  writeFileSync(path.join(deploy, '_worker.js'), 'export default { fetch() { return new Response("ok"); } };\n');
  writeFileSync(path.join(deploy, '_routes.json'), '{"version":1,"include":["/api/health"],"exclude":[]}\n');
  writeFileSync(path.join(deploy, '.htaccess'), 'Options -Indexes\n');
  return { root, repository, output, deploy };
}

async function writeManifest({ repository, output, deploy }) {
  const sbom = {
    $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: { component: { type: 'application', name: 'portfolio-astro' } },
    components: [],
    dependencies: [],
  };
  writeFileSync(path.join(output, 'sbom.cdx.json'), `${JSON.stringify(sbom, null, 2)}\n`);
  const artifact = await digestArtifactTree(deploy);
  const identity = createReleaseIdentity({
    sourceRevision: REVISION,
    sourceTreeClean: true,
    sourceCommitTime: COMMIT_TIME,
  });
  const manifest = createManifest({
    source: identity,
    packageName: 'portfolio-astro',
    nodeVersion: 'v22.22.3',
    npmVersion: '11.16.0',
    checksums: {
      trackedSource: trackedSourceChecksum(repository),
      packageJson: sha256File(path.join(repository, 'package.json')),
      packageLock: sha256File(path.join(repository, 'package-lock.json')),
      config: (await digestArtifactTree(path.join(repository, 'config'))).digest,
      wranglerConfig: sha256File(path.join(repository, 'wrangler.jsonc')),
      artifactTree: artifact.digest,
      sbom: sha256File(path.join(output, 'sbom.cdx.json')),
    },
  });
  writeFileSync(path.join(output, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, artifact };
}

// A. Workflow contract: the pinned upload-artifact step must preserve hidden files.
test('release.yml uploads the transfer directory with include-hidden-files enabled', () => {
  const workflow = read('.github/workflows/release.yml');
  const uploadStep = workflow.slice(
    workflow.indexOf('actions/upload-artifact'),
    workflow.indexOf('deploy:'),
  );
  assert.match(uploadStep, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7\.0\.1/);
  assert.match(uploadStep, /path:\s+\.artifacts\/release-candidate\/transfer/);
  assert.match(uploadStep, /include-hidden-files:\s*true/, 'upload-artifact must set include-hidden-files: true');
});

// B. Positive artifact contract: a valid deploy tree containing .htaccess passes generation,
// a prepare/copy/consume round-trip retains it unchanged, and digest/size/path stay identical.
test('a deploy tree containing .htaccess passes provenance generation and a faithful transfer round-trip', async () => {
  const fixture = buildFixture();
  const { manifest, artifact } = await writeManifest(fixture);
  assert.ok(artifact.files.includes('.htaccess'));

  await assert.doesNotReject(() => verifyReleaseArtifacts(fixture.repository, fixture.output));

  // Simulate the workflow's prepare -> upload -> download -> consume transfer.
  const transfer = path.join(fixture.root, 'transfer');
  mkdirSync(transfer, { recursive: true });
  for (const name of ['deploy', 'release-manifest.json', 'sbom.cdx.json']) {
    cpSync(path.join(fixture.output, name), path.join(transfer, name), { recursive: true });
  }
  const originalHtaccess = readFileSync(path.join(fixture.deploy, '.htaccess'));
  const transferredHtaccess = readFileSync(path.join(transfer, 'deploy', '.htaccess'));
  assert.deepEqual(transferredHtaccess, originalHtaccess);
  assert.equal(transferredHtaccess.length, originalHtaccess.length);

  const { manifest: consumedManifest, artifact: consumedArtifact } = await verifyReleaseArtifacts(
    fixture.repository,
    transfer,
  );
  assert.equal(consumedArtifact.digest, artifact.digest);
  assert.equal(consumedManifest.checksums.artifactTree, manifest.checksums.artifactTree);
});

// C. Proven incident regression: removing .htaccess after prepare reproduces GitHub's hidden-file
// omission and must fail the artifact-tree checksum comparison; restoring it must pass again.
test('omitting .htaccess after prepare reproduces the incident and fails closed; restoring it recovers', async () => {
  const fixture = buildFixture();
  await writeManifest(fixture);

  const transfer = path.join(fixture.root, 'transfer-incident');
  mkdirSync(transfer, { recursive: true });
  for (const name of ['deploy', 'release-manifest.json', 'sbom.cdx.json']) {
    cpSync(path.join(fixture.output, name), path.join(transfer, name), { recursive: true });
  }

  // Simulate actions/upload-artifact's default hidden-file exclusion.
  rmSync(path.join(transfer, 'deploy', '.htaccess'));
  await assert.rejects(
    () => verifyReleaseArtifacts(fixture.repository, transfer),
    /Artifact tree checksum does not match the release manifest/,
  );

  // Restoring exactly the missing file must restore successful verification.
  cpSync(path.join(fixture.deploy, '.htaccess'), path.join(transfer, 'deploy', '.htaccess'));
  await assert.doesNotReject(() => verifyReleaseArtifacts(fixture.repository, transfer));
});

// D. Hidden-file safety: an unapproved hidden path must fail closed, and a self-consistent
// checksum (a manifest regenerated to match the tampered tree) cannot bypass the policy, because
// the digest computation itself refuses to traverse the disallowed path before any comparison.
for (const [label, make] of [
  ['.env', (deploy) => writeFileSync(path.join(deploy, '.env'), 'SECRET=1\n')],
  ['.env.production', (deploy) => writeFileSync(path.join(deploy, '.env.production'), 'SECRET=1\n')],
  ['.npmrc', (deploy) => writeFileSync(path.join(deploy, '.npmrc'), '//registry\n')],
  ['.git directory', (deploy) => {
    mkdirSync(path.join(deploy, '.git'));
    writeFileSync(path.join(deploy, '.git', 'HEAD'), 'ref: refs/heads/master\n');
  }],
  ['.wrangler directory', (deploy) => {
    mkdirSync(path.join(deploy, '.wrangler'));
    writeFileSync(path.join(deploy, '.wrangler', 'state.json'), '{}\n');
  }],
  ['nested .htaccess outside deploy root', (deploy) => {
    mkdirSync(path.join(deploy, 'assets'));
    writeFileSync(path.join(deploy, 'assets', '.htaccess'), 'Options -Indexes\n');
  }],
]) {
  test(`digestArtifactTree rejects an unapproved hidden path: ${label}`, async () => {
    const fixture = buildFixture();
    make(fixture.deploy);
    await assert.rejects(() => digestArtifactTree(fixture.deploy), /unapproved hidden path/i);
  });

  test(`a regenerated matching checksum cannot bypass the hidden-path policy: ${label}`, async () => {
    const fixture = buildFixture();
    make(fixture.deploy);
    // Attempt to build a manifest "fresh" against the tampered tree, as an attacker who can
    // recompute checksums would. digestArtifactTree must refuse before any checksum comparison.
    await assert.rejects(() => writeManifest(fixture), /unapproved hidden path/i);
    // Even with an arbitrary/self-consistent-looking checksum already on disk, verification must
    // still refuse — the policy triggers while re-walking the deploy tree, not by comparing digests.
    const identity = createReleaseIdentity({
      sourceRevision: REVISION,
      sourceTreeClean: true,
      sourceCommitTime: COMMIT_TIME,
    });
    const sbom = {
      $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: { component: { type: 'application', name: 'portfolio-astro' } },
      components: [],
      dependencies: [],
    };
    const sbomPath = path.join(fixture.output, 'sbom.cdx.json');
    writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`);
    const fakeManifest = createManifest({
      source: identity,
      packageName: 'portfolio-astro',
      nodeVersion: 'v22.22.3',
      npmVersion: '11.16.0',
      checksums: {
        trackedSource: trackedSourceChecksum(fixture.repository),
        packageJson: sha256File(path.join(fixture.repository, 'package.json')),
        packageLock: sha256File(path.join(fixture.repository, 'package-lock.json')),
        config: (await digestArtifactTree(path.join(fixture.repository, 'config'))).digest,
        wranglerConfig: sha256File(path.join(fixture.repository, 'wrangler.jsonc')),
        // A self-consistent-looking digest an attacker could only obtain by hashing the tampered
        // tree themselves — the policy must still refuse before this value is ever compared.
        artifactTree: '0'.repeat(64),
        sbom: sha256File(sbomPath),
      },
    });
    writeFileSync(path.join(fixture.output, 'release-manifest.json'), `${JSON.stringify(fakeManifest, null, 2)}\n`);
    await assert.rejects(() => verifyReleaseArtifacts(fixture.repository, fixture.output), /unapproved hidden path/i);
  });
}
