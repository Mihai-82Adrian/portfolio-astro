import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  KositCacheError,
  archivePath,
  checkJava,
  ensureRuntime,
  loadManifest,
  resolveCacheRoot,
  runtimePath,
} from '../scripts/kosit-cache.mjs';
import { runPreflight } from '../scripts/kosit-preflight.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const preflightScript = path.join(root, 'scripts', 'kosit-preflight.mjs');
const downloadScript = path.join(root, 'scripts', 'kosit-download.mjs');

const manifest = loadManifest();

// The real shared cache (already populated on this machine) supplies byte-identical
// archives to seed isolated temp caches. Tests never write into it directly.
const prodCacheRoot = resolveCacheRoot();
const realValidatorArchive = archivePath(
  prodCacheRoot,
  'validator',
  manifest.validator.version,
  manifest.validator.archiveFilename
);
const realConfigArchive = archivePath(
  prodCacheRoot,
  'configuration',
  manifest.configuration.version,
  manifest.configuration.archiveFilename
);
const hasRealArchives = existsSync(realValidatorArchive) && existsSync(realConfigArchive);

function makeTempCache(prefix) {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

function seedArchives(cacheRoot) {
  for (const [kind, src] of [
    ['validator', realValidatorArchive],
    ['configuration', realConfigArchive],
  ]) {
    const dest = archivePath(cacheRoot, kind, manifest[kind].version, manifest[kind].archiveFilename);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(src));
  }
}

function runNode(scriptPath, args, env = {}) {
  const merged = { ...process.env, ...env };
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) {
      delete merged[key];
    }
  }
  return spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf-8', env: merged });
}

test('manifest: loads and matches the locked KoSIT versions', () => {
  assert.equal(manifest.validator.version, '1.6.2');
  assert.equal(manifest.configuration.version, '2026-01-31');
  assert.match(manifest.validator.sha256, /^[0-9a-f]{64}$/);
  assert.match(manifest.configuration.sha256, /^[0-9a-f]{64}$/);
});

test('resolveCacheRoot: default XDG/HOME resolution', () => {
  const resolved = resolveCacheRoot({ HOME: '/home/nobody', XDG_CACHE_HOME: undefined });
  assert.equal(resolved, path.resolve('/home/nobody/.cache/portfolio-astro-validation/kosit'));
});

test('resolveCacheRoot: explicit KOSIT_CACHE_DIR override', () => {
  const override = makeTempCache('kosit-test-override-');
  try {
    assert.equal(resolveCacheRoot({ KOSIT_CACHE_DIR: override }), override);
  } finally {
    rmSync(override, { recursive: true, force: true });
  }
});

test('resolveCacheRoot: rejects a cache root resolving inside the repository', () => {
  assert.throws(
    () => resolveCacheRoot({ KOSIT_CACHE_DIR: path.join(root, 'tools', 'kosit', '_cache') }),
    (error) => error instanceof KositCacheError && error.code === 'CACHE_ROOT_INVALID'
  );
});

test('checkJava: accepts the installed JDK against the manifest minimum', () => {
  const major = checkJava(manifest.minJavaVersion);
  assert.ok(major >= manifest.minJavaVersion);
});

test('checkJava: rejects an unsatisfiable minimum version', () => {
  assert.throws(
    () => checkJava(9999),
    (error) => error instanceof KositCacheError && error.code === 'JAVA_VERSION_UNSUPPORTED'
  );
});

test('missing cache: fails immediately with the exact missing-artifact error, no partial runtime', () => {
  const cacheRoot = makeTempCache('kosit-test-missing-');
  try {
    assert.throws(
      () => ensureRuntime(cacheRoot, manifest, 'validator'),
      (error) => error instanceof KositCacheError && error.code === 'VALIDATOR_ARCHIVE_MISSING'
    );
    assert.equal(existsSync(path.join(cacheRoot, 'runtime')), false);
  } finally {
    rmSync(cacheRoot, { recursive: true, force: true });
  }
});

test('missing cache via CLI: preflight FAIL, no download invoked, no partial runtime', () => {
  const cacheRoot = makeTempCache('kosit-test-missing-cli-');
  try {
    const result = runNode(preflightScript, [], { KOSIT_CACHE_DIR: cacheRoot });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^KOSIT PREFLIGHT: FAIL$/m);
    assert.match(result.stderr, /^KOSIT MODE: OFFLINE$/m);
    assert.match(result.stderr, /^KOSIT NETWORK DOWNLOAD: DISABLED$/m);
    assert.match(result.stderr, /^KOSIT ERROR: (VALIDATOR|CONFIGURATION)_ARCHIVE_MISSING:/m);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /curl|wget/i);
    assert.equal(existsSync(path.join(cacheRoot, 'runtime')), false);
  } finally {
    rmSync(cacheRoot, { recursive: true, force: true });
  }
});

test(
  'corrupt cache: validator checksum mismatch fails, no fallback, no partial runtime',
  { skip: !hasRealArchives && 'no local trusted validator archive available on this machine' },
  () => {
    const cacheRoot = makeTempCache('kosit-test-corrupt-validator-');
    try {
      seedArchives(cacheRoot);
      const archive = archivePath(cacheRoot, 'validator', manifest.validator.version, manifest.validator.archiveFilename);
      const bytes = readFileSync(archive);
      bytes[0] ^= 0xff;
      writeFileSync(archive, bytes);
      assert.throws(
        () => ensureRuntime(cacheRoot, manifest, 'validator'),
        (error) => error instanceof KositCacheError && error.code === 'VALIDATOR_CHECKSUM_MISMATCH'
      );
      assert.equal(existsSync(runtimePath(cacheRoot, 'validator', manifest.validator.version)), false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
);

test(
  'corrupt cache: configuration checksum mismatch fails, no fallback, no partial runtime',
  { skip: !hasRealArchives && 'no local trusted configuration archive available on this machine' },
  () => {
    const cacheRoot = makeTempCache('kosit-test-corrupt-config-');
    try {
      seedArchives(cacheRoot);
      const archive = archivePath(cacheRoot, 'configuration', manifest.configuration.version, manifest.configuration.archiveFilename);
      const bytes = readFileSync(archive);
      bytes[0] ^= 0xff;
      writeFileSync(archive, bytes);
      assert.throws(
        () => ensureRuntime(cacheRoot, manifest, 'configuration'),
        (error) => error instanceof KositCacheError && error.code === 'CONFIGURATION_CHECKSUM_MISMATCH'
      );
      assert.equal(existsSync(runtimePath(cacheRoot, 'configuration', manifest.configuration.version)), false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
);

test('manifest/version mismatch is rejected even with an otherwise-valid archive', {
  skip: !hasRealArchives && 'no local trusted archive available on this machine',
}, () => {
  const cacheRoot = makeTempCache('kosit-test-version-mismatch-');
  try {
    seedArchives(cacheRoot);
    const badManifest = JSON.parse(JSON.stringify(manifest));
    badManifest.validator.sha256 = '0'.repeat(64);
    assert.throws(
      () => ensureRuntime(cacheRoot, badManifest, 'validator'),
      (error) => error instanceof KositCacheError && error.code === 'VALIDATOR_CHECKSUM_MISMATCH'
    );
  } finally {
    rmSync(cacheRoot, { recursive: true, force: true });
  }
});

test(
  'archive symlink is rejected',
  { skip: !hasRealArchives && 'no local trusted validator archive available on this machine' },
  () => {
    const cacheRoot = makeTempCache('kosit-test-symlink-');
    try {
      seedArchives(cacheRoot);
      const archive = archivePath(cacheRoot, 'validator', manifest.validator.version, manifest.validator.archiveFilename);
      const real = `${archive}.real`;
      writeFileSync(real, readFileSync(archive));
      rmSync(archive);
      symlinkSync(real, archive);
      assert.throws(
        () => ensureRuntime(cacheRoot, manifest, 'validator'),
        (error) => error instanceof KositCacheError && error.code === 'ARCHIVE_SYMLINK_REJECTED'
      );
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
);

test(
  'wrong runtime marker: a misconfigured entrypoint fails extraction and leaves no runtime',
  { skip: !hasRealArchives && 'no local trusted configuration archive available on this machine' },
  () => {
    const cacheRoot = makeTempCache('kosit-test-bad-marker-');
    try {
      seedArchives(cacheRoot);
      const badManifest = JSON.parse(JSON.stringify(manifest));
      badManifest.configuration.entrypoint = 'does-not-exist-in-archive.xml';
      assert.throws(
        () => ensureRuntime(cacheRoot, badManifest, 'configuration'),
        (error) => error instanceof KositCacheError && error.code === 'RUNTIME_MARKER_INVALID'
      );
      assert.equal(existsSync(runtimePath(cacheRoot, 'configuration', manifest.configuration.version)), false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
);

test(
  'stale lock: a lock file owned by a dead PID is reclaimed instead of blocking forever',
  { skip: !hasRealArchives && 'no local trusted configuration archive available on this machine' },
  () => {
    const cacheRoot = makeTempCache('kosit-test-stale-lock-');
    try {
      seedArchives(cacheRoot);
      const stateDirPath = path.join(cacheRoot, 'state');
      mkdirSync(stateDirPath, { recursive: true });
      const lockPath = path.join(stateDirPath, `runtime-configuration-${manifest.configuration.version}.lock`);
      const deadPid = 999999;
      writeFileSync(lockPath, JSON.stringify({ pid: deadPid, startedAt: new Date().toISOString() }));

      const dir = ensureRuntime(cacheRoot, manifest, 'configuration');
      assert.ok(existsSync(path.join(dir, manifest.configuration.entrypoint)));
      assert.equal(existsSync(lockPath), false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
);

test(
  'offline materialization: extracts runtime, exposes the marker, reused without re-extraction',
  { skip: !hasRealArchives && 'no local trusted configuration archive available on this machine' },
  () => {
    const cacheRoot = makeTempCache('kosit-test-materialize-');
    try {
      seedArchives(cacheRoot);
      const dir1 = ensureRuntime(cacheRoot, manifest, 'configuration');
      const marker = path.join(dir1, manifest.configuration.entrypoint);
      assert.ok(existsSync(marker));
      const mtimeBefore = statSync(marker).mtimeMs;

      const dir2 = ensureRuntime(cacheRoot, manifest, 'configuration');
      assert.equal(dir2, dir1);
      assert.equal(statSync(marker).mtimeMs, mtimeBefore);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
);

test(
  'offline materialization: a stale/interrupted staging directory never becomes the active runtime',
  { skip: !hasRealArchives && 'no local trusted configuration archive available on this machine' },
  () => {
    const cacheRoot = makeTempCache('kosit-test-staging-');
    try {
      seedArchives(cacheRoot);
      const runtimeKindDir = path.join(cacheRoot, 'runtime', 'configuration');
      const fakeStaging = path.join(runtimeKindDir, `.staging-${manifest.configuration.version}-broken`);
      mkdirSync(fakeStaging, { recursive: true });
      writeFileSync(path.join(fakeStaging, 'incomplete'), 'not a real extraction');

      const dir = ensureRuntime(cacheRoot, manifest, 'configuration');
      assert.ok(existsSync(path.join(dir, manifest.configuration.entrypoint)));
      assert.equal(existsSync(fakeStaging), false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
);

test(
  'offline materialization: two concurrent preparers for the same version both succeed and agree on one runtime',
  { skip: !hasRealArchives && 'no local trusted configuration archive available on this machine' },
  async () => {
    const cacheRoot = makeTempCache('kosit-test-concurrent-');
    try {
      seedArchives(cacheRoot);
      const runnerScript = path.join(root, 'tests', 'fixtures', 'kosit-ensure-runtime-runner.mjs');

      const spawnOne = () =>
        new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [runnerScript, cacheRoot, 'configuration'], {
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let stdout = '';
          child.stdout.on('data', (chunk) => {
            stdout += chunk;
          });
          child.on('error', reject);
          child.on('close', (code) => resolve({ code, stdout: stdout.trim() }));
        });

      const [first, second] = await Promise.all([spawnOne(), spawnOne()]);
      assert.equal(first.code, 0, `first preparer failed: ${first.stdout}`);
      assert.equal(second.code, 0, `second preparer failed: ${second.stdout}`);
      assert.equal(first.stdout, second.stdout, 'both preparers must agree on the same runtime dir');

      const runtimeKindDir = path.join(cacheRoot, 'runtime', 'configuration');
      const leftoverStaging = readdirSync(runtimeKindDir).filter((name) => name.startsWith('.staging-'));
      assert.deepEqual(leftoverStaging, []);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  }
);

test(
  'fresh-worktree behavior: default (unset KOSIT_CACHE_DIR) resolution finds the real shared cache and preflight passes',
  { skip: !hasRealArchives && 'no local trusted archives available on this machine' },
  () => {
    assert.equal(process.env.KOSIT_CACHE_DIR, undefined);
    const result = runPreflight();
    assert.equal(result.cacheRoot, prodCacheRoot);
    assert.ok(existsSync(result.validator.jarPath));
    assert.ok(existsSync(result.configuration.scenariosPath));
  }
);

test('preflight CLI output contract: PASS markers on a healthy cache', {
  skip: !hasRealArchives && 'no local trusted archives available on this machine',
}, () => {
  const result = runNode(preflightScript, []);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^KOSIT PREFLIGHT: PASS$/m);
  assert.match(result.stdout, /^KOSIT MODE: OFFLINE$/m);
  assert.match(result.stdout, /^KOSIT VALIDATOR: 1\.6\.2$/m);
  assert.match(result.stdout, /^KOSIT CONFIGURATION: 2026-01-31$/m);
});

test('download bootstrap: refused with neither gate set', () => {
  const env = { KOSIT_ALLOW_DOWNLOAD: undefined };
  const result = runNode(downloadScript, [], env);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^KOSIT DOWNLOAD: REFUSED$/m);
});

test('download bootstrap: refused with only the environment variable set', () => {
  const result = runNode(downloadScript, [], { KOSIT_ALLOW_DOWNLOAD: '1' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^KOSIT DOWNLOAD: REFUSED$/m);
});

test('download bootstrap: refused with only the --confirm-download flag set', () => {
  const env = { KOSIT_ALLOW_DOWNLOAD: undefined };
  const result = runNode(downloadScript, ['--confirm-download'], env);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^KOSIT DOWNLOAD: REFUSED$/m);
});
