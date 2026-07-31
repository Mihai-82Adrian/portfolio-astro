#!/usr/bin/env node
// Deterministic offline preflight for KoSIT validation. Never calls a download
// function; on any failure it exits non-zero before touching the network.
import path from 'node:path';
import {
  KositCacheError,
  checkJava,
  ensureRuntime,
  loadManifest,
  resolveCacheRoot,
} from './kosit-cache.mjs';

export function runPreflight() {
  const manifest = loadManifest();
  const cacheRoot = resolveCacheRoot();
  checkJava(manifest.minJavaVersion);
  const validatorDir = ensureRuntime(cacheRoot, manifest, 'validator');
  const configurationDir = ensureRuntime(cacheRoot, manifest, 'configuration');

  return {
    cacheRoot,
    validator: {
      version: manifest.validator.version,
      dir: validatorDir,
      jarPath: path.join(validatorDir, manifest.validator.entrypoint),
    },
    configuration: {
      version: manifest.configuration.version,
      dir: configurationDir,
      scenariosPath: path.join(configurationDir, manifest.configuration.entrypoint),
    },
  };
}

export function reportPreflight() {
  try {
    const result = runPreflight();
    console.log('KOSIT PREFLIGHT: PASS');
    console.log('KOSIT MODE: OFFLINE');
    console.log(`KOSIT CACHE: ${result.cacheRoot}`);
    console.log(`KOSIT VALIDATOR: ${result.validator.version}`);
    console.log(`KOSIT CONFIGURATION: ${result.configuration.version}`);
    return result;
  } catch (error) {
    console.error('KOSIT PREFLIGHT: FAIL');
    console.error('KOSIT MODE: OFFLINE');
    console.error('KOSIT NETWORK DOWNLOAD: DISABLED');
    const code = error instanceof KositCacheError ? error.code : 'UNEXPECTED_ERROR';
    console.error(`KOSIT ERROR: ${code}: ${error.message}`);
    throw error;
  }
}

function isMainModule() {
  return import.meta.url === `file://${process.argv[1]}`;
}

if (isMainModule()) {
  try {
    reportPreflight();
  } catch {
    process.exit(1);
  }
}
