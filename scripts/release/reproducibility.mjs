#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { verifyToolchain } from './guards.mjs';
import { assertCleanRepository, verifyReleaseArtifacts } from './provenance.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const IMAGE = 'portfolio-astro-repro:node-22.22.3';
const IMAGE_REPOSITORY = 'node';
const IMAGE_DIGEST = 'sha256:16d364eebf6b62da439dc993d9b80940c78b0ca38438452f011ab9a25c752644';
const SUMMARY = path.join(ROOT, '.artifacts/release-candidate/reproducibility.json');

function run(executable, args, options = {}) {
  return execFileSync(executable, args, { encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit', ...options });
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

async function snapshot(output) {
  const { manifest, artifact } = await verifyReleaseArtifacts(ROOT, output);
  return {
    releaseId: manifest.releaseIdentity.releaseId,
    sourceRevision: manifest.sourceRevision,
    trackedSource: manifest.checksums.trackedSource,
    packageJson: manifest.checksums.packageJson,
    packageLock: manifest.checksums.packageLock,
    config: manifest.checksums.config,
    artifactDigest: manifest.checksums.artifactTree,
    manifest: readFileSync(path.join(output, 'release-manifest.json'), 'utf8'),
    sbom: readFileSync(path.join(output, 'sbom.cdx.json'), 'utf8'),
    sbomDigest: manifest.checksums.sbom,
    files: artifact.files,
  };
}

function same(expected, actual, label) {
  for (const field of ['releaseId', 'sourceRevision', 'trackedSource', 'packageJson', 'packageLock', 'config', 'artifactDigest', 'manifest', 'sbom', 'sbomDigest']) {
    if (expected[field] !== actual[field]) throw new Error(`${label}: ${field} differs.`);
  }
  if (JSON.stringify(expected.files) !== JSON.stringify(actual.files)) {
    throw new Error(`${label}: deployable file list differs.`);
  }
}

function containerBuild(source, output, sourceDateEpoch) {
  const uid = process.getuid();
  const gid = process.getgid();
  mkdirSync(output, { recursive: true });
  run('docker', [
    'run', '--rm', '--network', 'none',
    '--user', `${uid}:${gid}`,
    '--read-only',
    '--tmpfs', `/tmp:rw,noexec,nosuid,nodev,size=256m,mode=1777,uid=${uid},gid=${gid}`,
    '--tmpfs', `/workspace/repository:rw,exec,nosuid,nodev,size=2g,mode=0755,uid=${uid},gid=${gid}`,
    '--mount', `type=bind,src=${source},dst=/source,readonly`,
    '--mount', `type=bind,src=${output},dst=/output`,
    '--env', 'TZ=UTC',
    '--env', 'LANG=C.UTF-8',
    '--env', 'LC_ALL=C.UTF-8',
    '--env', 'XDG_CONFIG_HOME=/tmp/xdg',
    '--env', 'WRANGLER_LOG_PATH=/tmp/wrangler/wrangler.log',
    '--env', 'ASTRO_TELEMETRY_DISABLED=1',
    '--env', 'GIT_CONFIG_COUNT=1',
    '--env', 'GIT_CONFIG_KEY_0=safe.directory',
    '--env', 'GIT_CONFIG_VALUE_0=/workspace/repository',
    '--env', `SOURCE_DATE_EPOCH=${sourceDateEpoch}`,
    IMAGE,
    'sh', '-ceu',
    'cp -a /source/. /workspace/repository/; cp -R /workspace/node_modules /workspace/repository/node_modules; cd /workspace/repository; npm run build:release-artifacts -- --output /output/release',
  ]);
}

export async function verifyReproducibility({ containerOnly = false } = {}) {
  verifyToolchain(ROOT);
  assertCleanRepository(ROOT);
  const temporary = mkdtempSync(path.join(tmpdir(), 'portfolio-repro-'));
  try {
    const source = path.join(temporary, 'source');
    run('git', ['clone', '--quiet', '--no-hardlinks', '--local', ROOT, source]);
    run('git', ['checkout', '--quiet', '--detach', git(['rev-parse', 'HEAD'])], { cwd: source });
    const sourceDateEpoch = git(['show', '-s', '--format=%ct', 'HEAD']);
    const hostOutput = path.join(ROOT, '.artifacts/release');
    if (!containerOnly) {
      run('npm', ['run', 'build:release-artifacts'], { cwd: ROOT });
    }
    const host = await snapshot(hostOutput);

    run('docker', ['build', '--pull', '--file', 'release/Dockerfile.reproducibility', '--tag', IMAGE, '.'], { cwd: ROOT });
    const firstOutput = path.join(temporary, 'first');
    const secondOutput = path.join(temporary, 'second');
    containerBuild(source, firstOutput, sourceDateEpoch);
    containerBuild(source, secondOutput, sourceDateEpoch);
    const first = await snapshot(path.join(firstOutput, 'release'));
    const second = await snapshot(path.join(secondOutput, 'release'));
    same(first, second, 'isolated build comparison');
    same(host, first, 'host/isolated build comparison');

    const [os, architecture] = run('docker', ['image', 'inspect', IMAGE, '--format', '{{.Os}}/{{.Architecture}}'], { capture: true }).trim().split('/');
    if (os !== 'linux' || architecture !== 'amd64') throw new Error('Reproducibility image platform drift.');
    const summary = {
      schemaVersion: 1,
      result: 'PASS',
      image: `${IMAGE_REPOSITORY}@${IMAGE_DIGEST}`,
      node: '22.22.3',
      npm: '11.16.0',
      osFamily: 'Debian GNU/Linux 12',
      architecture,
      libc: 'glibc',
      timezone: 'UTC',
      locale: 'C.UTF-8',
      networkDuringBuild: 'none',
      isolatedBuilds: 2,
      hostArtifactDigest: host.artifactDigest,
      isolatedArtifactDigest: first.artifactDigest,
      manifestDigest: host.manifest === first.manifest ? 'identical' : 'different',
      sbomDigest: host.sbomDigest,
      fileCount: host.files.length,
    };
    mkdirSync(path.dirname(SUMMARY), { recursive: true });
    writeFileSync(SUMMARY, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await verifyReproducibility({ containerOnly: process.argv.includes('--container-only') });
}
