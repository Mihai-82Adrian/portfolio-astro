#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  cpSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const toolsDir = path.join(root, 'tools', 'kosit');
const cacheDir = path.join(toolsDir, '_cache');
const runtimeDir = path.join(toolsDir, 'runtime');
const versionsPath = path.join(toolsDir, 'versions.json');

const versions = JSON.parse(readFileSync(versionsPath, 'utf-8'));

const validatorArchive = path.join(cacheDir, versions.validator.archive);
const configArchive = path.join(cacheDir, versions.xrechnungConfig.archive);

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function tryDownload(url, target) {
  try {
    execFileSync('curl', ['-fL', url, '-o', target], { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function unzipArchive(zipPath, destination) {
  ensureDir(destination);
  execFileSync('unzip', ['-o', zipPath, '-d', destination], { stdio: 'inherit' });
}

function findFirstMatch(baseDir, test) {
  const stack = [baseDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (test(entry.name, fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}

ensureDir(cacheDir);
ensureDir(runtimeDir);

if (!existsSync(validatorArchive)) {
  console.log(`Validator archive not in cache: ${validatorArchive}`);
  const ok = tryDownload(process.env.KOSIT_VALIDATOR_URL || versions.validator.url, validatorArchive);
  if (!ok) {
    throw new Error(
      [
        'Failed to download KoSIT validator archive.',
        `Place archive manually at: ${validatorArchive}`,
        `Suggested source: ${versions.validator.url}`,
      ].join('\n')
    );
  }
}

if (!existsSync(configArchive)) {
  console.log(`XRechnung config archive not in cache: ${configArchive}`);
  const ok = tryDownload(
    process.env.KOSIT_XRECHNUNG_CONFIG_URL || versions.xrechnungConfig.url,
    configArchive
  );
  if (!ok) {
    throw new Error(
      [
        'Failed to download XRechnung validator config archive.',
        `Place archive manually at: ${configArchive}`,
        `Suggested source: ${versions.xrechnungConfig.url}`,
      ].join('\n')
    );
  }
}

const unpackRoot = path.join(runtimeDir, '_unpacked');
rmSync(unpackRoot, { recursive: true, force: true });
ensureDir(unpackRoot);

const validatorUnpack = path.join(unpackRoot, 'validator');
const configUnpack = path.join(unpackRoot, 'xrechnung-config');
unzipArchive(validatorArchive, validatorUnpack);
unzipArchive(configArchive, configUnpack);

const jarPath =
  findFirstMatch(validatorUnpack, (name) => name.endsWith('.jar') && name.includes('standalone')) ??
  findFirstMatch(validatorUnpack, (name) => name.endsWith('.jar'));
const scenariosPath =
  findFirstMatch(configUnpack, (name) => name === 'scenarios.xml') ??
  findFirstMatch(configUnpack, (name) => name.endsWith('.xml') && name.includes('scenarios'));

if (!jarPath || !scenariosPath) {
  throw new Error(
    `Could not locate validator jar or scenarios.xml.\njar=${jarPath}\nscenarios=${scenariosPath}`
  );
}

const stableRuntime = path.join(runtimeDir, 'current');
rmSync(stableRuntime, { recursive: true, force: true });
ensureDir(stableRuntime);

cpSync(path.dirname(jarPath), path.join(stableRuntime, 'validator'), { recursive: true });
cpSync(path.dirname(scenariosPath), path.join(stableRuntime, 'config'), { recursive: true });

const finalJar =
  findFirstMatch(path.join(stableRuntime, 'validator'), (name) => name.endsWith('.jar') && name.includes('standalone')) ??
  findFirstMatch(path.join(stableRuntime, 'validator'), (name) => name.endsWith('.jar'));
const finalScenarios =
  findFirstMatch(path.join(stableRuntime, 'config'), (name) => name === 'scenarios.xml') ??
  findFirstMatch(path.join(stableRuntime, 'config'), (name) => name.endsWith('.xml') && name.includes('scenarios'));

if (!finalJar || !finalScenarios) {
  throw new Error('Runtime assembly failed: missing jar or scenarios.xml in runtime/current');
}

const metadata = {
  validator: {
    version: versions.validator.version,
    jarPath: path.relative(root, finalJar),
  },
  xrechnungConfig: {
    version: versions.xrechnungConfig.version,
    scenariosPath: path.relative(root, finalScenarios),
  },
  generatedAt: new Date().toISOString(),
};

writeFileSync(path.join(runtimeDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
console.log('KoSIT runtime ready:');
console.log(JSON.stringify(metadata, null, 2));
