#!/usr/bin/env node
// Explicit, double-gated bootstrap that downloads pinned KoSIT/XRechnung archives
// into the shared cache. Never invoked by any verification command. Requires both
// KOSIT_ALLOW_DOWNLOAD=1 and --confirm-download before resolving anything, including
// the manifest or cache root, let alone contacting a remote host.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { archivePath, loadManifest, resolveCacheRoot, sha256File } from './kosit-cache.mjs';

function refuse() {
  console.error('KOSIT DOWNLOAD: REFUSED');
  console.error('Set KOSIT_ALLOW_DOWNLOAD=1 and pass --confirm-download explicitly.');
  process.exit(1);
}

const envGate = process.env.KOSIT_ALLOW_DOWNLOAD === '1';
const flagGate = process.argv.includes('--confirm-download');

if (!envGate || !flagGate) {
  refuse();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function tryDownload(url, target) {
  try {
    execFileSync('curl', ['-fL', url, '-o', target], { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function tryResolveGitHubReleaseAsset(downloadUrl) {
  const match = downloadUrl.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/
  );
  if (!match) {
    return null;
  }
  const [, owner, repo, tag, expectedAsset] = match;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
  try {
    const response = execFileSync('curl', ['-fsSL', apiUrl], { encoding: 'utf-8' });
    const release = JSON.parse(response);
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const isZip = (name) => name.toLowerCase().endsWith('.zip');
    const expectedLower = expectedAsset.toLowerCase();
    const preferred =
      assets.find((a) => a.name?.toLowerCase() === expectedLower && isZip(a.name)) ??
      assets.find((a) => isZip(a.name));
    return preferred?.browser_download_url ?? null;
  } catch {
    return null;
  }
}

function downloadWithFallback(primaryUrl, target) {
  if (tryDownload(primaryUrl, target)) {
    return true;
  }
  const resolved = tryResolveGitHubReleaseAsset(primaryUrl);
  if (!resolved) {
    return false;
  }
  console.log(`Resolved fallback asset: ${resolved}`);
  return tryDownload(resolved, target);
}

function installArtifact(kind, sourceUrlEntry, manifestEntry, cacheRoot) {
  const finalPath = archivePath(cacheRoot, kind, manifestEntry.version, manifestEntry.archiveFilename);
  if (existsSync(finalPath) && sha256File(finalPath) === manifestEntry.sha256) {
    console.log(`${kind}: already present and verified, skipping download.`);
    return;
  }

  const stagingDir = mkdtempSync(path.join(os.tmpdir(), `kosit-download-${kind}-`));
  const stagingFile = path.join(stagingDir, manifestEntry.archiveFilename);
  try {
    const envUrlKey = `KOSIT_${kind.toUpperCase()}_URL`;
    const url = process.env[envUrlKey] || sourceUrlEntry.url;
    if (!downloadWithFallback(url, stagingFile)) {
      throw new Error(`Failed to download ${kind} archive from ${url}`);
    }
    const actualHash = sha256File(stagingFile);
    if (actualHash !== manifestEntry.sha256) {
      throw new Error(`${kind} download checksum mismatch: expected ${manifestEntry.sha256}, got ${actualHash}`);
    }
    mkdirSync(path.dirname(finalPath), { recursive: true });
    renameSync(stagingFile, finalPath);
    console.log(`${kind}: installed ${finalPath}`);
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

const versionsPath = path.join(root, 'tools', 'kosit', 'versions.json');
const versions = JSON.parse(readFileSync(versionsPath, 'utf-8'));
const manifest = loadManifest();
const cacheRoot = resolveCacheRoot();

installArtifact('validator', versions.validator, manifest.validator, cacheRoot);
installArtifact('configuration', versions.xrechnungConfig, manifest.configuration, cacheRoot);
console.log('KoSIT bootstrap download complete.');
