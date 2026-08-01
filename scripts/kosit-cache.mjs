#!/usr/bin/env node
// Shared library for the offline KoSIT cache: manifest loading, path resolution,
// checksum/symlink guards, Java version checks, and locked offline extraction.
// No network-capable code lives in this file.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '..');
export const defaultManifestPath = path.join(repoRoot, 'tools', 'kosit', 'kosit-artifacts.json');

export class KositCacheError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'KositCacheError';
    this.code = code;
  }
}

export function loadManifest(manifestPath = defaultManifestPath) {
  if (!existsSync(manifestPath)) {
    throw new KositCacheError('MANIFEST_MISSING', `Manifest not found: ${manifestPath}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    throw new KositCacheError('MANIFEST_INVALID', `Manifest is not valid JSON: ${error.message}`);
  }
  for (const key of ['schemaVersion', 'cacheLayoutVersion', 'minJavaVersion', 'validator', 'configuration']) {
    if (manifest[key] === undefined) {
      throw new KositCacheError('MANIFEST_INVALID', `Manifest missing required key: ${key}`);
    }
  }
  for (const kind of ['validator', 'configuration']) {
    for (const field of ['version', 'archiveFilename', 'sha256', 'entrypoint']) {
      if (!manifest[kind]?.[field]) {
        throw new KositCacheError('MANIFEST_INVALID', `Manifest.${kind} missing field: ${field}`);
      }
    }
    if (!/^[0-9a-f]{64}$/i.test(manifest[kind].sha256)) {
      throw new KositCacheError('MANIFEST_INVALID', `Manifest.${kind}.sha256 is not a 64-char hex SHA-256`);
    }
  }
  return manifest;
}

export function resolveCacheRoot(env = process.env) {
  const home = env.HOME || os.homedir();
  const raw = env.KOSIT_CACHE_DIR || path.join(env.XDG_CACHE_HOME || path.join(home, '.cache'), 'portfolio-astro-validation', 'kosit');
  const resolved = path.resolve(raw);
  const repoReal = realpathSync(repoRoot);
  const resolvedReal = existsSync(resolved) ? realpathSync(resolved) : resolved;
  if (resolvedReal === repoReal || resolvedReal.startsWith(repoReal + path.sep)) {
    throw new KositCacheError('CACHE_ROOT_INVALID', `Cache root resolves inside the repository worktree: ${resolvedReal}`);
  }
  return resolvedReal;
}

export function archivePath(cacheRoot, kind, version, filename) {
  return path.join(cacheRoot, 'archives', kind, version, filename);
}

export function runtimePath(cacheRoot, kind, version) {
  return path.join(cacheRoot, 'runtime', kind, version);
}

export function stateDir(cacheRoot) {
  return path.join(cacheRoot, 'state');
}

export function provenanceDir(cacheRoot) {
  return path.join(cacheRoot, 'provenance');
}

function assertNotSymlink(filePath, code) {
  const st = lstatSync(filePath);
  if (st.isSymbolicLink()) {
    throw new KositCacheError(code, `Refusing symlinked artifact: ${filePath}`);
  }
}

export function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

export function checkJava(minMajorVersion) {
  const result = spawnSync('java', ['-version'], { encoding: 'utf-8' });
  if (result.error || result.status !== 0) {
    throw new KositCacheError('JAVA_MISSING', 'java executable not found or not runnable');
  }
  const text = `${result.stdout}\n${result.stderr}`;
  const match = text.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) {
    throw new KositCacheError('JAVA_VERSION_UNSUPPORTED', `Could not parse java -version output: ${text.trim()}`);
  }
  let major = Number.parseInt(match[1], 10);
  if (major === 1 && match[2]) {
    major = Number.parseInt(match[2], 10); // legacy "1.8.0_xxx" => Java 8
  }
  if (major < minMajorVersion) {
    throw new KositCacheError('JAVA_VERSION_UNSUPPORTED', `java major version ${major} is below required ${minMajorVersion}`);
  }
  return major;
}

function sleepSync(ms) {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

function isLockStale(lockPath, staleMs) {
  try {
    const st = statSync(lockPath);
    if (Date.now() - st.mtimeMs > staleMs) {
      return true;
    }
    const info = JSON.parse(readFileSync(lockPath, 'utf-8'));
    if (info.pid) {
      try {
        process.kill(info.pid, 0);
        return false;
      } catch {
        return true; // pid no longer exists
      }
    }
    return false;
  } catch {
    return true; // unreadable lock file, treat as stale
  }
}

export function withLock(cacheRoot, key, fn, { staleMs = 5 * 60 * 1000, retries = 50, retryDelayMs = 100 } = {}) {
  const dir = stateDir(cacheRoot);
  mkdirSync(dir, { recursive: true });
  const lockPath = path.join(dir, `${key}.lock`);
  let fd;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      fd = openSync(lockPath, 'wx');
      writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      if (isLockStale(lockPath, staleMs)) {
        try {
          unlinkSync(lockPath);
        } catch {
          // another process cleaned it up first; retry the loop
        }
        continue;
      }
      if (attempt === retries - 1) {
        throw new KositCacheError('LOCK_TIMEOUT', `Timed out waiting for lock: ${lockPath}`);
      }
      sleepSync(retryDelayMs);
    }
  }
  try {
    return fn();
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // already closed
      }
    }
    try {
      unlinkSync(lockPath);
    } catch {
      // already removed
    }
  }
}

// Materializes the offline runtime for `kind` ('validator' | 'configuration') from the
// checksum-verified archive already present in the cache. Extraction is staged in a
// temp directory and installed via atomic rename; a valid existing runtime is reused
// without re-extraction.
export function ensureRuntime(cacheRoot, manifest, kind) {
  const { version, archiveFilename, sha256, entrypoint } = manifest[kind];
  const archive = archivePath(cacheRoot, kind, version, archiveFilename);
  const missingCode = kind === 'validator' ? 'VALIDATOR_ARCHIVE_MISSING' : 'CONFIGURATION_ARCHIVE_MISSING';
  const checksumCode = kind === 'validator' ? 'VALIDATOR_CHECKSUM_MISMATCH' : 'CONFIGURATION_CHECKSUM_MISMATCH';

  if (!existsSync(archive)) {
    throw new KositCacheError(missingCode, `Archive not found: ${archive}`);
  }
  assertNotSymlink(archive, 'ARCHIVE_SYMLINK_REJECTED');

  const actualHash = sha256File(archive);
  if (actualHash !== sha256) {
    throw new KositCacheError(checksumCode, `${kind} archive checksum mismatch: expected ${sha256}, got ${actualHash}`);
  }

  const finalDir = runtimePath(cacheRoot, kind, version);
  const marker = path.join(finalDir, entrypoint);
  if (existsSync(marker)) {
    return finalDir;
  }

  return withLock(cacheRoot, `runtime-${kind}-${version}`, () => {
    if (existsSync(marker)) {
      return finalDir; // materialized by another process while we waited for the lock
    }

    const runtimeKindDir = path.join(cacheRoot, 'runtime', kind);
    mkdirSync(runtimeKindDir, { recursive: true });

    const stagingPrefix = `.staging-${version}-`;
    for (const entry of readdirSync(runtimeKindDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(stagingPrefix)) {
        rmSync(path.join(runtimeKindDir, entry.name), { recursive: true, force: true });
      }
    }

    const staging = mkdtempSync(path.join(runtimeKindDir, stagingPrefix));
    try {
      execFileSync('unzip', ['-o', archive, '-d', staging], { stdio: 'ignore' });
      const stagedMarker = path.join(staging, entrypoint);
      if (!existsSync(stagedMarker)) {
        throw new KositCacheError('RUNTIME_MARKER_INVALID', `Expected entrypoint missing after extraction: ${stagedMarker}`);
      }
      if (existsSync(finalDir)) {
        return finalDir; // another process won the race despite the lock (defense in depth)
      }
      renameSync(staging, finalDir);
      return finalDir;
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  });
}
