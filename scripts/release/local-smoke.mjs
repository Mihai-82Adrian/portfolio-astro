#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runFirefoxRelease } from './firefox-release.mjs';
import { verifyPostdeploy } from './postdeploy.mjs';
import { verifyReleaseArtifacts } from './provenance.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Wrangler exited before readiness: ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('Wrangler did not become ready.');
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(5000).then(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
    }),
  ]);
}

export async function runLocalSmoke() {
  const output = path.join(ROOT, '.artifacts/release');
  const { manifest } = await verifyReleaseArtifacts(ROOT, output);
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const wrangler = spawn(path.join(ROOT, 'node_modules/.bin/wrangler'), [
    'pages', 'dev', path.join(output, 'deploy'),
    '--ip', '127.0.0.1',
    '--port', String(port),
    '--compatibility-date', '2025-11-14',
  ], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      WRANGLER_SEND_METRICS: 'false',
      NO_UPDATE_NOTIFIER: '1',
      SAMPLE_REVIEW_ENABLED: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let outputLog = '';
  for (const stream of [wrangler.stdout, wrangler.stderr]) {
    stream.on('data', (chunk) => {
      if (outputLog.length < 32000) outputLog += chunk;
    });
  }
  const profile = mkdtempSync(path.join(tmpdir(), 'portfolio-firefox-release-'));
  try {
    await waitFor(`${baseUrl}api/health`, wrangler);
    const request = (pathname, init) => fetch(new URL(pathname, baseUrl), { redirect: 'manual', ...init });
    const accepted = await request('/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report' },
      body: JSON.stringify({ 'csp-report': { 'effective-directive': 'img-src', 'blocked-uri': 'data' } }),
    });
    if (accepted.status !== 204 || await accepted.text() !== '') throw new Error('Local CSP collector acceptance failed.');
    for (const [label, init, expected] of [
      ['malformed', { method: 'POST', headers: { 'Content-Type': 'application/csp-report' }, body: '{' }, 400],
      ['oversized', { method: 'POST', headers: { 'Content-Type': 'application/csp-report' }, body: 'x'.repeat(5000) }, 413],
      ['media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, 415],
      ['method', { method: 'GET' }, 405],
    ]) {
      const response = await request('/api/csp-report', init);
      if (response.status !== expected) throw new Error(`Local CSP ${label} check failed.`);
    }
    const chat = await request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: new URL(baseUrl).origin },
      body: JSON.stringify({ message: 'local no-egress configuration check' }),
    });
    if (chat.status !== 503) throw new Error(`AI missing-key check received ${chat.status}.`);

    const postdeploy = await verifyPostdeploy({
      baseUrl,
      expectedReleaseId: manifest.releaseIdentity.releaseId,
      expectedSourceRevision: manifest.sourceRevision,
    });
    const firefox = await runFirefoxRelease({
      firefoxBinary: process.env.FIREFOX_BINARY,
      baseUrl,
      profile,
      expectedReleaseId: manifest.releaseIdentity.releaseId,
      deadProxy: true,
    });
    return {
      result: 'PASS',
      runtime: 'Wrangler Pages local',
      cspCollector: 'PASS',
      aiMissingKey: 'PASS_NO_EGRESS',
      postdeploy,
      firefox,
    };
  } catch (error) {
    error.message += `\nWrangler output (bounded):\n${outputLog.trim()}`;
    throw error;
  } finally {
    await stop(wrangler);
    rmSync(profile, { recursive: true, force: true });
    const probe = net.createServer();
    await new Promise((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(port, '127.0.0.1', resolve);
    });
    await new Promise((resolve) => probe.close(resolve));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runLocalSmoke(), null, 2));
}
