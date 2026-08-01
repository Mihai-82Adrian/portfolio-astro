#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const contract = JSON.parse(readFileSync(path.join(ROOT, 'release/firefox-runtime.json'), 'utf8'));
const runtime = path.join(ROOT, '.artifacts/firefox', contract.version);
const binary = path.join(runtime, 'firefox/firefox');

if (!existsSync(binary)) {
  mkdirSync(runtime, { recursive: true });
  const archive = path.join(runtime, `firefox-${contract.version}.tar.xz`);
  const response = await fetch(contract.archiveUrl, { redirect: 'error' });
  if (!response.ok || !response.body) throw new Error(`Firefox download failed: HTTP ${response.status}`);
  await finished(Readable.fromWeb(response.body).pipe(createWriteStream(archive, { flags: 'wx' })));
  const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
  if (digest !== contract.sha256) {
    rmSync(archive);
    throw new Error('Firefox archive checksum mismatch.');
  }
  execFileSync('tar', ['-xJf', archive, '-C', runtime]);
  rmSync(archive);
}

if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `FIREFOX_BINARY=${binary}\n`);
console.log(binary);
