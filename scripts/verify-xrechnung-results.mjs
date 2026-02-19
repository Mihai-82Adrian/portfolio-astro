#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Default folder for manually generated XML exports.
const target = process.argv[2] || 'tests/xrechnung/results';

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
}

run('node', ['scripts/kosit-setup.mjs']);
run('node', ['scripts/kosit-validate.mjs', target]);

