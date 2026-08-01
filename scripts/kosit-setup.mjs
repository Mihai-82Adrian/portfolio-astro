#!/usr/bin/env node
// Prepares the worktree-local pointer to the offline KoSIT runtime. Contains no
// network-capable code: the runtime itself lives only in the shared cache
// (see docs/operations/kosit-offline-validation.md); this only records where it is.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reportPreflight } from './kosit-preflight.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let result;
try {
  result = reportPreflight();
} catch {
  process.exit(1);
}

const runtimeDir = path.join(root, 'tools', 'kosit', 'runtime');
mkdirSync(runtimeDir, { recursive: true });

const metadata = {
  validator: {
    version: result.validator.version,
    jarPath: result.validator.jarPath,
  },
  xrechnungConfig: {
    version: result.configuration.version,
    scenariosPath: result.configuration.scenariosPath,
  },
  generatedAt: new Date().toISOString(),
};

writeFileSync(path.join(runtimeDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
console.log('KoSIT runtime ready (offline):');
console.log(JSON.stringify(metadata, null, 2));
