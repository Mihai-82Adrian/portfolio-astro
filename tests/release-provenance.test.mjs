import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  assertCleanRepository,
  createManifest,
  createReleaseIdentity,
  digestArtifactTree,
  normalizeCycloneDx,
  normalizePagefindEntry,
  sha256File,
  trackedSourceChecksum,
  validateManifest,
  validateSbom,
  verifyReleaseArtifacts,
  writeGeneratedReleaseIdentity,
} from '../scripts/release/provenance.mjs';
import { createDefaultScenarios } from '../src/lib/fin-core/runway.ts';

const SHA256 = /^[a-f0-9]{64}$/;
const REVISION = 'a'.repeat(40);
const COMMIT_TIME = '2026-07-24T12:00:00.000Z';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function tempDir(name) {
  return mkdtempSync(path.join(tmpdir(), `portfolio-${name}-`));
}

function initRepository() {
  const root = tempDir('release-git');
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Release Test'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'release@example.invalid'], { cwd: root });
  writeFileSync(path.join(root, 'tracked.txt'), 'clean\n');
  execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

test('release identity is versioned, deterministic, and contains no machine identity', () => {
  const input = {
    sourceRevision: REVISION,
    sourceTreeClean: true,
    sourceCommitTime: COMMIT_TIME,
  };
  const first = createReleaseIdentity(input);
  const second = createReleaseIdentity(input);

  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first), [
    'schemaVersion',
    'releaseId',
    'sourceRevision',
    'sourceTreeClean',
    'sourceCommitTime',
  ]);
  assert.equal(first.schemaVersion, 1);
  assert.match(first.releaseId, /^git-[a-f0-9]{16}$/);
  assert.equal(first.sourceRevision, REVISION);
  assert.equal(first.sourceTreeClean, true);
  assert.equal(first.sourceCommitTime, COMMIT_TIME);
  assert.doesNotMatch(JSON.stringify(first), /\/home\/|hostname|username|branch|secret|projectId/i);
});

test('generated Function identity module contains only the deterministic constant', () => {
  const root = tempDir('generated-identity');
  const output = path.join(root, 'release-identity.ts');
  const identity = createReleaseIdentity({
    sourceRevision: REVISION,
    sourceTreeClean: true,
    sourceCommitTime: COMMIT_TIME,
  });
  writeGeneratedReleaseIdentity(output, identity);
  const source = readFileSync(output, 'utf8');

  assert.match(source, /export const RELEASE_IDENTITY =/);
  assert.match(source, new RegExp(identity.releaseId));
  assert.match(source, new RegExp(REVISION));
  assert.doesNotMatch(source, /\/home\/|hostname|username|branch|secret|process\.env/i);
});

test('artifact tree digest is independent of path creation order and mtimes', async () => {
  const first = tempDir('tree-a');
  const second = tempDir('tree-b');
  mkdirSync(path.join(first, 'nested'));
  mkdirSync(path.join(second, 'nested'));
  writeFileSync(path.join(first, 'z.txt'), 'z');
  writeFileSync(path.join(first, 'nested', 'a.txt'), 'a');
  writeFileSync(path.join(second, 'nested', 'a.txt'), 'a');
  writeFileSync(path.join(second, 'z.txt'), 'z');
  utimesSync(path.join(first, 'z.txt'), new Date(0), new Date(0));
  utimesSync(path.join(second, 'z.txt'), new Date('2030-01-01'), new Date('2030-01-01'));

  const a = await digestArtifactTree(first);
  const b = await digestArtifactTree(second);
  assert.match(a.digest, SHA256);
  assert.equal(a.digest, b.digest);
  assert.deepEqual(a.files, ['nested/a.txt', 'z.txt']);
  assert.deepEqual(a.files, b.files);
});

test('artifact digest excludes self-referential evidence files', async () => {
  const root = tempDir('tree-self-reference');
  writeFileSync(path.join(root, 'index.html'), 'candidate');
  writeFileSync(path.join(root, 'release-manifest.json'), 'first');
  writeFileSync(path.join(root, 'artifact-tree.sha256'), 'first');
  const first = await digestArtifactTree(root);
  writeFileSync(path.join(root, 'release-manifest.json'), 'changed');
  writeFileSync(path.join(root, 'artifact-tree.sha256'), 'changed');
  const second = await digestArtifactTree(root);

  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.files, ['index.html']);
});

test('artifact digest rejects symlinks instead of following paths outside the tree', async () => {
  const root = tempDir('tree-symlink');
  writeFileSync(path.join(root, 'target.txt'), 'target');
  symlinkSync('target.txt', path.join(root, 'link.txt'));
  await assert.rejects(() => digestArtifactTree(root), /symlink/i);
});

test('clean-source check rejects tracked changes and unexpected untracked input', () => {
  const root = initRepository();
  assert.doesNotThrow(() => assertCleanRepository(root));
  writeFileSync(path.join(root, 'tracked.txt'), 'dirty\n');
  assert.throws(() => assertCleanRepository(root), /clean source tree/i);
  execFileSync('git', ['restore', 'tracked.txt'], { cwd: root });
  writeFileSync(path.join(root, 'untracked.txt'), 'unexpected\n');
  assert.throws(() => assertCleanRepository(root), /clean source tree/i);
});

test('CycloneDX normalization removes invocation drift and sorts graph records', () => {
  const raw = {
    $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: 'urn:uuid:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    version: 1,
    metadata: {
      timestamp: '2026-07-24T13:00:00.000Z',
      component: { type: 'application', name: 'machine-worktree-name', version: '0.0.1' },
    },
    components: [
      { 'bom-ref': 'z@1', type: 'library', name: 'z', version: '1' },
      { 'bom-ref': 'a@1', type: 'library', name: 'a', version: '1' },
    ],
    dependencies: [
      { ref: 'z@1', dependsOn: [] },
      { ref: 'a@1', dependsOn: ['z@1'] },
    ],
  };
  const normalized = normalizeCycloneDx(raw, { name: 'portfolio-astro', version: '0.0.1' });

  assert.equal(normalized.serialNumber, undefined);
  assert.equal(normalized.metadata.timestamp, undefined);
  assert.equal(normalized.metadata.component.name, 'portfolio-astro');
  assert.deepEqual(normalized.components.map((item) => item['bom-ref']), ['a@1', 'z@1']);
  assert.deepEqual(normalized.dependencies.map((item) => item.ref), ['a@1', 'z@1']);
  assert.doesNotMatch(JSON.stringify(normalized), /machine-worktree-name|\/home\//);
  assert.doesNotThrow(() => validateSbom(normalized));
});

test('manifest validation requires identity and linked SHA-256 checksums', () => {
  const manifest = {
    schemaVersion: 1,
    sourceRevision: REVISION,
    sourceTreeClean: true,
    sourceCommitTime: COMMIT_TIME,
    package: { name: 'portfolio-astro', version: '0.0.1' },
    sbom: { scope: 'build-dependency', format: 'CycloneDX' },
    toolchain: {
      node: 'v22.22.3',
      npm: '11.16.0',
      platform: 'linux',
      arch: 'x64',
      libc: 'glibc',
      packageManager: 'npm',
      buildCommand: 'npm run build',
    },
    checksums: {
      trackedSource: '0'.repeat(64),
      packageJson: '1'.repeat(64),
      packageLock: '2'.repeat(64),
      config: '6'.repeat(64),
      wranglerConfig: '3'.repeat(64),
      artifactTree: '4'.repeat(64),
      sbom: '5'.repeat(64),
    },
    releaseIdentity: createReleaseIdentity({
      sourceRevision: REVISION,
      sourceTreeClean: true,
      sourceCommitTime: COMMIT_TIME,
    }),
    toolVersion: 1,
  };

  assert.doesNotThrow(() => validateManifest(manifest));
  assert.match(manifest.checksums.artifactTree, SHA256);
  assert.doesNotMatch(JSON.stringify(manifest), /\/home\/|hostname|username|remoteUrl|environment/i);
  assert.throws(
    () => validateManifest({ ...manifest, checksums: { ...manifest.checksums, sbom: 'invalid' } }),
    /manifest/i,
  );
});

test('release artifact verification links manifest, SBOM, config, and deploy tree checksums', async () => {
  const root = tempDir('release-output');
  const repository = path.join(root, 'repository');
  const output = path.join(root, 'output');
  const deploy = path.join(output, 'deploy');
  mkdirSync(repository);
  mkdirSync(path.join(repository, 'config'));
  mkdirSync(path.join(repository, 'functions', 'api'), { recursive: true });
  mkdirSync(output);
  mkdirSync(deploy);
  writeFileSync(path.join(repository, 'package.json'), '{"name":"portfolio-astro"}\n');
  writeFileSync(path.join(repository, 'package-lock.json'), '{"lockfileVersion":3}\n');
  writeFileSync(path.join(repository, 'wrangler.jsonc'), '{}\n');
  writeFileSync(path.join(repository, 'config', 'release-policy.json'), '{}\n');
  writeFileSync(path.join(repository, 'functions', 'api', 'health.ts'), 'export const onRequest = () => new Response();\n');
  writeFileSync(path.join(repository, 'functions', 'api', 'chat.ts'), 'export const onRequest = () => new Response();\n');
  execFileSync('git', ['init', '-q'], { cwd: repository });
  execFileSync('git', ['config', 'user.name', 'Release Test'], { cwd: repository });
  execFileSync('git', ['config', 'user.email', 'release@example.invalid'], { cwd: repository });
  execFileSync('git', ['add', '.'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: repository });
  writeFileSync(path.join(deploy, 'index.html'), '<h1>candidate</h1>\n');
  writeFileSync(path.join(deploy, '_worker.js'), 'export default { fetch() { return new Response("ok"); } };\n');
  const safeRoutes = {
    version: 1,
    description: 'fixture',
    include: ['/api/health', '/api/chat'],
    exclude: [],
  };
  writeFileSync(path.join(deploy, '_routes.json'), `${JSON.stringify(safeRoutes)}\n`);
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

  await assert.doesNotReject(() => verifyReleaseArtifacts(repository, output));

  writeFileSync(
    path.join(deploy, '_routes.json'),
    `${JSON.stringify({ ...safeRoutes, include: ['/*'] })}\n`,
  );
  const broadArtifact = await digestArtifactTree(deploy);
  writeFileSync(
    path.join(output, 'release-manifest.json'),
    `${JSON.stringify({
      ...manifest,
      checksums: { ...manifest.checksums, artifactTree: broadArtifact.digest },
    }, null, 2)}\n`,
  );
  await assert.rejects(
    () => verifyReleaseArtifacts(repository, output),
    /Pages Functions route scope/i,
  );

  writeFileSync(path.join(deploy, '_routes.json'), `${JSON.stringify(safeRoutes)}\n`);
  writeFileSync(path.join(output, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    path.join(output, 'sbom.cdx.json'),
    `${JSON.stringify({
      ...sbom,
      metadata: { component: { ...sbom.metadata.component, name: 'tampered' } },
    })}\n`,
  );
  await assert.rejects(() => verifyReleaseArtifacts(repository, output), /SBOM checksum/i);
});

test('release artifact verification fails closed when the deploy tree is missing the Cloudflare Pages _worker.js Functions entry point', async () => {
  // Cloudflare Pages Advanced Mode (and wrangler pages dev) only recognizes a compiled Functions
  // Worker at the exact path deploy/_worker.js. wrangler pages functions build --outdir writes it
  // as index.js; without a rename step the deploy tree is never actually deployable as a Worker,
  // and local Wrangler dev/postdeploy checks silently fall back to live source instead of the
  // frozen artifact. verifyReleaseArtifacts must reject a tree missing that entry point.
  const root = tempDir('release-output-missing-worker');
  const repository = path.join(root, 'repository');
  const output = path.join(root, 'output');
  const deploy = path.join(output, 'deploy');
  mkdirSync(repository);
  mkdirSync(path.join(repository, 'config'));
  mkdirSync(output);
  mkdirSync(deploy);
  writeFileSync(path.join(repository, 'package.json'), '{"name":"portfolio-astro"}\n');
  writeFileSync(path.join(repository, 'package-lock.json'), '{"lockfileVersion":3}\n');
  writeFileSync(path.join(repository, 'wrangler.jsonc'), '{}\n');
  writeFileSync(path.join(repository, 'config', 'release-policy.json'), '{}\n');
  execFileSync('git', ['init', '-q'], { cwd: repository });
  execFileSync('git', ['config', 'user.name', 'Release Test'], { cwd: repository });
  execFileSync('git', ['config', 'user.email', 'release@example.invalid'], { cwd: repository });
  execFileSync('git', ['add', '.'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: repository });
  // Deliberately omit _worker.js — this reproduces the exact defective tree shape that
  // `wrangler pages functions build --outdir` produces before the rename fix is applied.
  writeFileSync(path.join(deploy, 'index.html'), '<h1>candidate</h1>\n');
  writeFileSync(path.join(deploy, 'index.js'), 'export default { fetch() { return new Response("ok"); } };\n');
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

  await assert.rejects(() => verifyReleaseArtifacts(repository, output), /_worker\.js/);
});

test('tracked source checksum accepts repositories larger than the subprocess default buffer', () => {
  const repository = initRepository();
  writeFileSync(path.join(repository, 'large.bin'), Buffer.alloc(2 * 1024 * 1024, 1));
  execFileSync('git', ['add', 'large.bin'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'large fixture'], { cwd: repository });

  assert.match(trackedSourceChecksum(repository), SHA256);
});

test('release build inputs exclude invocation-time and random artifact drift', () => {
  const sourceDate = new Date('2026-07-24T13:00:00.000Z');
  assert.deepEqual(createDefaultScenarios(sourceDate), createDefaultScenarios(sourceDate));

  const provenance = readFileSync(path.join(ROOT, 'scripts/release/provenance.mjs'), 'utf8');
  const pagefind = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    .devDependencies.pagefind.split('.').map(Number);
  assert.ok(pagefind[0] > 1 || (pagefind[0] === 1 && (pagefind[1] > 5 || (pagefind[1] === 5 && pagefind[2] >= 2))));
  assert.match(provenance, /PUBLIC_SOURCE_DATE_EPOCH/);
  assert.match(provenance, /'--minify'/);
  for (const file of ['src/pages/rss.xml.ts', 'src/pages/rss/ai-ml.xml.ts', 'src/pages/rss/finance.xml.ts']) {
    assert.doesNotMatch(readFileSync(path.join(ROOT, file), 'utf8'), /new Date\(\)\.toUTCString\(\)/);
  }
});

test('Pagefind entry normalization sorts multilingual metadata', () => {
  const entry = {
    version: '1.5.2',
    languages: {
      ro: { hash: 'ro-hash' },
      de: { hash: 'de-hash' },
      en: { hash: 'en-hash' },
    },
  };

  assert.equal(
    normalizePagefindEntry(JSON.stringify(entry)),
    '{"version":"1.5.2","languages":{"de":{"hash":"de-hash"},"en":{"hash":"en-hash"},"ro":{"hash":"ro-hash"}}}',
  );
});

test('Pagefind build is byte-identical across opposite input creation orders', async () => {
  const script = path.join(ROOT, 'scripts/release/pagefind.mjs');
  assert.equal(existsSync(script), true, 'deterministic Pagefind builder must exist');
  const { buildPagefind } = await import(`${pathToFileURL(script)}?test=${Date.now()}`);
  const first = tempDir('pagefind-first');
  const second = tempDir('pagefind-second');
  const pages = [
    ['de/index.html', '<html lang="de"><body data-pagefind-body>Finanzen</body></html>'],
    ['de/about/index.html', '<html lang="de"><body data-pagefind-body>Über mich</body></html>'],
    ['en/index.html', '<html lang="en"><body data-pagefind-body>Finance</body></html>'],
    ['en/about/index.html', '<html lang="en"><body data-pagefind-body>About me</body></html>'],
    ['ro/index.html', '<html lang="ro"><body data-pagefind-body>Finanțe</body></html>'],
    ['ro/about/index.html', '<html lang="ro"><body data-pagefind-body>Despre mine</body></html>'],
  ];
  for (const [relative, content] of pages) {
    mkdirSync(path.dirname(path.join(first, relative)), { recursive: true });
    writeFileSync(path.join(first, relative), content);
  }
  for (const [relative, content] of pages.toReversed()) {
    mkdirSync(path.dirname(path.join(second, relative)), { recursive: true });
    writeFileSync(path.join(second, relative), content);
  }

  await buildPagefind(first);
  await buildPagefind(second);
  assert.deepEqual(await digestArtifactTree(first), await digestArtifactTree(second));
});

test('Wrangler resolves the repository Functions directory outside the repository cwd', async () => {
  const source = readFileSync(path.join(ROOT, 'scripts/release/provenance.mjs'), 'utf8');
  assert.doesNotMatch(
    source,
    /node_modules\/\.bin\/wrangler'?\), \[\s*'pages',\s*'functions',\s*'build',\s*'functions'/,
    'Wrangler Functions path must not be relative',
  );
  const { resolveFunctionsDirectory } = await import(
    `${pathToFileURL(path.join(ROOT, 'scripts/release/provenance.mjs'))}?cwd=${Date.now()}`
  );
  const outside = tempDir('wrangler-cwd');
  const previous = process.cwd();
  process.chdir(outside);
  try {
    const resolved = resolveFunctionsDirectory(ROOT);
    assert.equal(path.isAbsolute(resolved), true);
    assert.equal(lstatSync(resolved).isDirectory(), true);
    assert.equal(path.relative(ROOT, resolved), 'functions');
  } finally {
    process.chdir(previous);
  }
});

test('the compiled Functions Worker is renamed to the Cloudflare Pages _worker.js entry point after every build', () => {
  const source = readFileSync(path.join(ROOT, 'scripts/release/provenance.mjs'), 'utf8');
  const buildIndex = source.indexOf('async function buildReleaseArtifacts');
  const wranglerCallIndex = source.indexOf("'functions',\n      'build',", buildIndex);
  const renameIndex = source.indexOf("renameSync", buildIndex);
  assert.ok(buildIndex > -1 && wranglerCallIndex > -1 && renameIndex > -1, 'expected build/rename markers not found');
  assert.ok(wranglerCallIndex < renameIndex, 'the Worker rename must happen after the wrangler functions build call');
  assert.match(source, /renameSync\([^)]*'_worker\.js'[^)]*\)/s);
  assert.match(source, /path\.join\(deploy, 'index\.js'\)/);
});
