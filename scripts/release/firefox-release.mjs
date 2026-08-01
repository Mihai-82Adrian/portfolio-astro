#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const invariant = (condition, message) => {
  if (!condition) throw new Error(message);
};

// Firefox headless clamps WebDriver:SetWindowRect (and MOZ_HEADLESS_WIDTH/HEIGHT has no effect on
// the Marionette-controlled session) to a platform outer-window floor above this value, so the
// formal mobile viewport contract is enforced by resizing the content browser element directly
// (see setActualContentViewportWidth) rather than by trusting the requested outer window size.
const TARGET_VIEWPORT_WIDTH = 320;

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

class Marionette {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.pending = new Map();
    this.nextId = 1;
    socket.on('data', (chunk) => this.receive(chunk));
  }

  receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const colon = this.buffer.indexOf(58);
      if (colon < 0) return;
      const length = Number(this.buffer.subarray(0, colon).toString());
      if (this.buffer.length < colon + 1 + length) return;
      const packet = JSON.parse(this.buffer.subarray(colon + 1, colon + 1 + length).toString());
      this.buffer = this.buffer.subarray(colon + 1 + length);
      if (Array.isArray(packet) && packet[0] === 1) {
        const pending = this.pending.get(packet[1]);
        this.pending.delete(packet[1]);
        if (packet[2]) pending.reject(new Error(packet[2].message ?? 'Marionette command failed.'));
        else pending.resolve(packet[3]);
      }
    }
  }

  command(name, parameters = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify([0, id, name, parameters]);
    this.socket.write(`${Buffer.byteLength(payload)}:${payload}`);
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

async function connect(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const socket = await new Promise((resolve, reject) => {
        const candidate = net.createConnection({ host: '127.0.0.1', port }, () => resolve(candidate));
        candidate.once('error', reject);
      });
      return new Marionette(socket);
    } catch {
      await sleep(100);
    }
  }
  throw new Error('Firefox Marionette did not start.');
}

export function unwrapMarionetteResult(response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response) || !('value' in response)) {
    throw new Error('Marionette script result did not match the expected { value } envelope.');
  }
  return response.value;
}

export const execute = async (client, script, args = []) => unwrapMarionetteResult(await client.command('WebDriver:ExecuteScript', {
  script,
  args,
  newSandbox: true,
}));

export const executeAsync = async (client, script, args = []) => unwrapMarionetteResult(await client.command('WebDriver:ExecuteAsyncScript', {
  script,
  args,
  newSandbox: true,
}));

// WebDriver:SetWindowRect controls the outer OS window, which Firefox headless silently clamps to
// a platform-chrome minimum on this toolchain. The formal 320px mobile contract instead forces the
// content <browser> element's own box to the exact target width from the privileged chrome context,
// independent of that outer-window floor.
export async function setActualContentViewportWidth(client, targetWidth) {
  invariant(Number.isFinite(targetWidth) && targetWidth > 0, 'setActualContentViewportWidth requires a positive finite target width.');
  await client.command('Marionette:SetContext', { value: 'chrome' });
  try {
    const response = await client.command('WebDriver:ExecuteScript', {
      script: `
        const browser = typeof gBrowser !== 'undefined' ? gBrowser.selectedBrowser : undefined;
        if (!browser) return { ok: false, reason: 'browser-unavailable' };
        const previousCssText = browser.style.cssText;
        browser.style.setProperty('width', '${targetWidth}px', 'important');
        browser.style.setProperty('min-width', '${targetWidth}px', 'important');
        browser.style.setProperty('max-width', '${targetWidth}px', 'important');
        const actualWidth = browser.clientWidth;
        const ok = actualWidth === ${targetWidth};
        if (!ok) browser.style.cssText = previousCssText;
        return { ok, actualWidth, reason: ok ? undefined : 'width-mismatch' };
      `,
      args: [],
      newSandbox: true,
    });
    const result = unwrapMarionetteResult(response);
    if (!result || typeof result !== 'object' || result.ok !== true) {
      const reason = result && typeof result === 'object' ? result.reason : 'malformed-result';
      throw new Error(`Firefox chrome-context viewport resize to ${targetWidth}px failed: ${reason}.`);
    }
  } finally {
    await client.command('Marionette:SetContext', { value: 'content' });
  }
}

// The actual-viewport contract: the content browser must have been genuinely resized to the exact
// target width (not merely a narrower document within a wider, unresized viewport), and the
// representative route must not overflow that actual viewport. Overflow is always checked against
// the actual granted clientWidth, never against the raw outer OS window size or the literal target
// once the scrollbar has reduced the real layout viewport below it.
export function assertActualViewport(measurements, targetWidth) {
  for (const field of ['innerWidth', 'clientWidth', 'scrollWidth', 'bodyClientWidth', 'bodyScrollWidth']) {
    if (!Number.isFinite(measurements?.[field])) {
      throw new Error(`Firefox viewport measurement "${field}" was malformed or non-finite.`);
    }
  }
  if (typeof measurements.canScrollHorizontally !== 'boolean') {
    throw new Error('Firefox viewport measurement "canScrollHorizontally" was malformed.');
  }
  const {
    innerWidth, clientWidth, scrollWidth, bodyClientWidth, bodyScrollWidth,
    canScrollHorizontally, visualViewportWidth,
  } = measurements;
  if (innerWidth !== targetWidth) {
    throw new Error(`Actual Firefox content viewport width ${innerWidth}px does not match the required ${targetWidth}px mobile contract.`);
  }
  if (!(clientWidth > 0 && clientWidth <= targetWidth)) {
    throw new Error(`Firefox document clientWidth ${clientWidth}px is outside the required (0, ${targetWidth}] range.`);
  }
  if (scrollWidth > clientWidth || bodyScrollWidth > bodyClientWidth || canScrollHorizontally) {
    throw new Error(`Representative route overflows at the ${targetWidth}px content viewport (scrollWidth ${scrollWidth}px, clientWidth ${clientWidth}px).`);
  }
  if (visualViewportWidth !== null && visualViewportWidth !== undefined) {
    if (!Number.isFinite(visualViewportWidth) || Math.abs(visualViewportWidth - clientWidth) > 1) {
      throw new Error(`Firefox visualViewport width ${visualViewportWidth}px is inconsistent with the content viewport ${clientWidth}px.`);
    }
  }
}

export async function runFirefoxRelease({
  firefoxBinary,
  baseUrl,
  profile,
  expectedReleaseId,
  deadProxy = false,
}) {
  invariant(path.isAbsolute(firefoxBinary ?? ''), '--firefox-binary must be an absolute path.');
  invariant(path.isAbsolute(profile ?? ''), '--profile must be an absolute path.');
  invariant(/^git-[a-f0-9]{16}$/.test(expectedReleaseId ?? ''), '--expected-release-id is invalid.');
  const base = new URL(baseUrl);
  invariant(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Release Firefox harness is local-only in Phase 2C.');
  mkdirSync(profile, { recursive: true });
  const port = await freePort();
  writeFileSync(path.join(profile, 'user.js'), [
    `user_pref("marionette.port", ${port});`,
    'user_pref("browser.shell.checkDefaultBrowser", false);',
    'user_pref("browser.startup.homepage_override.mstone", "ignore");',
    'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
    'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);',
    'user_pref("browser.zoom.full", false);',
    ...(deadProxy ? [
      'user_pref("network.proxy.type", 1);',
      'user_pref("network.proxy.http", "127.0.0.1");',
      'user_pref("network.proxy.http_port", 9);',
      'user_pref("network.proxy.ssl", "127.0.0.1");',
      'user_pref("network.proxy.ssl_port", 9);',
      'user_pref("network.proxy.no_proxies_on", "localhost, 127.0.0.1, ::1");',
    ] : []),
    '',
  ].join('\n'));
  const firefox = spawn(firefoxBinary, ['--headless', '--marionette', '--no-remote', '-remote-allow-system-access', '--profile', profile, 'about:blank'], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  firefox.stderr.on('data', (chunk) => {
    if (stderr.length < 4000) stderr += chunk;
  });
  let client;
  try {
    client = await connect(port);
    await client.command('WebDriver:NewSession', { capabilities: { alwaysMatch: { acceptInsecureCerts: true } } });
    await client.command('WebDriver:SetWindowRect', { width: TARGET_VIEWPORT_WIDTH, height: 800, x: 0, y: 0 });
    await setActualContentViewportWidth(client, TARGET_VIEWPORT_WIDTH);
    await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
    await sleep(1300);
    const initial = await execute(client, `
      return {
        lang: document.documentElement.lang,
        banner: !document.querySelector('#cookie-consent-banner')?.hidden,
        optional: [...document.querySelectorAll('script[src],iframe[src]')]
          .filter((node) => /ahrefs|giscus|youtube|spotify/.test(node.src)).length,
        innerWidth: window.innerWidth,
        visualViewportWidth: window.visualViewport ? window.visualViewport.width : null,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        canScrollHorizontally: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    `);
    invariant(initial.lang === 'de' && initial.banner && initial.optional === 0, 'Fresh undecided consent boundary failed.');
    assertActualViewport(initial, TARGET_VIEWPORT_WIDTH);

    await execute(client, `document.querySelector('#reject-analytics')?.click(); return localStorage.getItem('privacy-preferences');`);
    const essential = await execute(client, `return JSON.parse(localStorage.getItem('privacy-preferences')).analytics;`);
    invariant(essential === false, 'Essential-only consent did not persist.');
    await execute(client, `document.querySelector('[data-privacy-settings-trigger]')?.click(); document.querySelector('#accept-analytics')?.click();`);
    await sleep(200);
    const analyticsCount = await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`);
    invariant(analyticsCount === 1, 'Analytics opt-in must insert Ahrefs exactly once.');
    await execute(client, `document.querySelector('#accept-analytics')?.click(); return true;`);
    invariant(await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`) === 1, 'Ahrefs insertion is not idempotent.');

    await execute(client, `document.querySelector('[data-privacy-settings-trigger]')?.click(); document.querySelector('#reject-analytics')?.click(); document.querySelector('#ahrefs-analytics')?.remove();`);
    await client.command('WebDriver:Navigate', { url: new URL('/en/', base).href });
    await sleep(300);
    invariant(await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`) === 0, 'Withdrawal did not prevent future Ahrefs loading.');
    await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
    await execute(client, `document.querySelector('a[href="/en/"]')?.click(); return true;`);
    await sleep(500);
    invariant(await execute(client, `return location.pathname === '/en/' && document.documentElement.lang === 'en';`), 'ClientRouter locale navigation failed.');
    for (const [route, lang, copy] of [['/en/', 'en', 'Allow analytics'], ['/ro/', 'ro', 'Permite analiza'], ['/', 'de', 'Analyse zulassen']]) {
      await client.command('WebDriver:Navigate', { url: new URL(route, base).href });
      const locale = await execute(client, `return {lang: document.documentElement.lang, text: document.querySelector('#accept-analytics')?.textContent.trim()};`);
      invariant(locale.lang === lang && locale.text.includes(copy), `${lang} consent copy smoke failed.`);
    }

    await client.command('WebDriver:Navigate', { url: new URL('/projects/mindhafen/', base).href });
    const beforeMedia = await execute(client, `return document.querySelectorAll('iframe[src*="youtube"],iframe[src*="spotify"]').length;`);
    invariant(beforeMedia === 0, 'Media iframe loaded before activation.');
    await execute(client, `document.querySelector('[data-embed-src]')?.click(); return true;`);
    invariant(await execute(client, `return document.querySelectorAll('iframe[src*="youtube"],iframe[src*="spotify"]').length;`) === 1, 'Media click-to-load failed.');

    await client.command('WebDriver:Navigate', { url: new URL('/blog/job-fit-ai-architecture/', base).href });
    invariant(await execute(client, `return document.querySelectorAll('script[src*="giscus.app"],iframe[src*="giscus.app"]').length;`) === 0, 'Giscus loaded before activation.');
    await execute(client, `document.querySelector('[data-giscus-load]')?.click(); return true;`);
    invariant(await execute(client, `return document.querySelectorAll('script[src*="giscus.app"]').length;`) === 1, 'Giscus click-to-load failed.');

    await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
    const zoomActions = [{ type: 'keyDown', value: '\uE009' }];
    for (let step = 0; step < 6; step += 1) {
      zoomActions.push({ type: 'keyDown', value: '+' }, { type: 'keyUp', value: '+' });
    }
    zoomActions.push({ type: 'keyUp', value: '\uE009' });
    await client.command('WebDriver:PerformActions', {
      actions: [{ type: 'key', id: 'text-zoom', actions: zoomActions }],
    });
    invariant(await execute(client, `return document.documentElement.scrollWidth <= document.documentElement.clientWidth;`), 'Representative route overflows at 200% text scale.');
    const health = await executeAsync(client, `
      const done = arguments[arguments.length - 1];
      fetch('/api/health').then((response) => response.json()).then((value) => done(value.data.release.releaseId)).catch(() => done('ERROR'));
    `);
    invariant(health === expectedReleaseId, 'Firefox health release ID mismatch.');
    invariant(await executeAsync(client, `
      const done = arguments[arguments.length - 1];
      fetch('/').then((response) => done({
        reportOnly: response.headers.has('content-security-policy-report-only'),
        enforcement: response.headers.has('content-security-policy'),
      })).catch(() => done({}));
    `).then((value) => value.reportOnly && !value.enforcement), 'Firefox CSP Report-Only boundary failed.');
    invariant(await executeAsync(client, `
      const done = arguments[arguments.length - 1];
      fetch('/api/sample-review', {method: 'HEAD'}).then((response) => done(response.status)).catch(() => done(0));
    `) === 204, 'Firefox observed Sample Review activation.');

    return {
      result: 'PASS',
      browser: 'Firefox',
      deadProxy,
      viewport: '320x800',
      textScale: '200%',
      locales: ['de', 'en', 'ro'],
      optionalResources: ['ahrefs', 'giscus', 'youtube-or-spotify'],
      sampleReview: 'disabled',
    };
  } catch (error) {
    if (firefox.exitCode !== null) error.message += ` Firefox exited ${firefox.exitCode}: ${stderr.trim()}`;
    throw error;
  } finally {
    try {
      await client?.command('WebDriver:DeleteSession');
    } catch {}
    client?.socket.destroy();
    if (firefox.exitCode === null) firefox.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => firefox.once('exit', resolve)),
      sleep(5000).then(() => {
        if (firefox.exitCode === null) firefox.kill('SIGKILL');
      }),
    ]);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runFirefoxRelease({
    firefoxBinary: option('--firefox-binary'),
    baseUrl: option('--base-url'),
    profile: option('--profile'),
    expectedReleaseId: option('--expected-release-id'),
    deadProxy: process.argv.includes('--dead-proxy'),
  }), null, 2));
}
