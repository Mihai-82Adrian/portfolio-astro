#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const invariant = (condition, message) => {
  if (!condition) throw new Error(message);
};

// Read-only, never logged: the current manual-install Cloudflare beacon token, so the browser
// matrix can confirm the DOM-inserted script actually carries it — without ever printing the
// value itself in an assertion message (see Phase 3-C Step 2C-2).
function readCurrentCfBeaconToken() {
  const source = readFileSync(
    path.join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'src', 'layouts', 'BaseLayout.astro'),
    'utf8'
  );
  const match = source.match(/CF_BEACON_TOKEN = '([a-f0-9]{32})'/);
  invariant(match, 'CF_BEACON_TOKEN constant not found in BaseLayout.astro');
  return match[1];
}

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
          .filter((node) => /ahrefs|cloudflareinsights|giscus|youtube|spotify/.test(node.src)).length,
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

    // Phase 4.1-A mobile consent geometry matrix: the reported defect was a transparent,
    // content-bleeding banner with colliding actions at 421x869. Verify both the reported
    // viewport and a second representative small-phone size (360x800), in light and dark mode,
    // from a fresh undecided visitor.
    for (const { width, height } of [{ width: 360, height: 800 }, { width: 421, height: 869 }]) {
      for (const mode of ['light', 'dark']) {
        await execute(client, `localStorage.clear(); return true;`);
        await client.command('WebDriver:SetWindowRect', { width, height, x: 0, y: 0 });
        await setActualContentViewportWidth(client, width);
        await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
        await sleep(1300);
        if (mode === 'dark') await execute(client, `document.documentElement.classList.add('dark'); return true;`);
        const geometry = await execute(client, `
          const rectOf = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
          const banner = document.getElementById('cookie-consent-banner');
          const buttons = ['#reject-analytics', '#open-privacy-settings', '#accept-analytics'].map((sel) => rectOf(document.querySelector(sel)));
          return {
            bannerHidden: banner.hidden,
            bannerRect: rectOf(banner),
            backgroundColor: getComputedStyle(banner).backgroundColor,
            buttons,
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            canScrollHorizontally: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        `);
        const label = `${width}x${height} ${mode}`;
        invariant(!geometry.bannerHidden, `${label}: consent banner must be visible for a fresh visitor.`);
        invariant(!geometry.canScrollHorizontally && geometry.scrollWidth <= geometry.clientWidth, `${label}: page must not overflow horizontally.`);
        invariant(geometry.bannerRect.left >= 0 && geometry.bannerRect.right <= geometry.clientWidth, `${label}: banner must stay within the viewport horizontally.`);
        const alphaMatch = geometry.backgroundColor.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+)\s*)?\)/);
        const alpha = alphaMatch && alphaMatch[1] !== undefined ? Number(alphaMatch[1]) : 1;
        // Exactly 1, not merely "near-opaque": Phase 4.1-A-R found that a non-functional
        // backdrop-filter (computed "none" in this deployment) left a faint but real hint of page
        // content through a 0.92-alpha background. A regression back to any alpha < 1 must fail.
        invariant(alpha === 1, `${label}: banner background must be fully opaque, alpha exactly 1 (got ${alpha}, computed "${geometry.backgroundColor}").`);
        for (const [index, rect] of geometry.buttons.entries()) {
          invariant(rect.width >= 44 && rect.height >= 44, `${label}: action button ${index} is smaller than the 44x44 touch-target minimum (${rect.width}x${rect.height}).`);
          invariant(rect.left >= 0 && rect.right <= geometry.clientWidth, `${label}: action button ${index} overflows the viewport horizontally.`);
        }
        for (let i = 0; i < geometry.buttons.length; i += 1) {
          for (let j = i + 1; j < geometry.buttons.length; j += 1) {
            const a = geometry.buttons[i];
            const b = geometry.buttons[j];
            const overlaps = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
            invariant(!overlaps, `${label}: action buttons ${i} and ${j} collide.`);
          }
        }
      }
    }
    await client.command('WebDriver:SetWindowRect', { width: TARGET_VIEWPORT_WIDTH, height: 800, x: 0, y: 0 });
    await setActualContentViewportWidth(client, TARGET_VIEWPORT_WIDTH);
    await execute(client, `localStorage.clear(); return true;`);
    await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
    await sleep(1300);

    // Performance-analytics-only and acquisition-analytics-only (Phase 3-C Step 2C-2): each
    // selected independently via the settings panel from a fresh undecided visitor, confirming
    // the two optional channels never couple to each other and that the Cloudflare beacon carries
    // the current manual-install site token. localStorage is cleared and the page reloaded between
    // scenarios so each starts from a true fresh-visitor state.
    const currentCfBeaconToken = readCurrentCfBeaconToken();
    async function selectOnlyViaSettings(performanceOn, acquisitionOn) {
      await execute(client, `localStorage.clear(); return true;`);
      await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
      await sleep(500);
      await execute(client, `document.querySelector('#open-privacy-settings')?.click(); return true;`);
      await sleep(200);
      await execute(
        client,
        `
        document.querySelector('#toggle-performance-analytics').checked = arguments[0];
        document.querySelector('#toggle-acquisition-analytics').checked = arguments[1];
        document.querySelector('#save-privacy-settings')?.click();
        return true;
      `,
        [performanceOn, acquisitionOn]
      );
      await sleep(300);
    }

    await selectOnlyViaSettings(true, false);
    invariant(
      await execute(client, `return document.querySelectorAll('#cloudflare-rum-beacon').length;`) === 1,
      'Performance-analytics-only must load exactly the Cloudflare beacon.'
    );
    invariant(
      await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`) === 0,
      'Performance-analytics-only must not also load Ahrefs.'
    );
    const wiredToken = await execute(client, `
      const el = document.getElementById('cloudflare-rum-beacon');
      return el ? JSON.parse(el.dataset.cfBeacon).token : null;
    `);
    invariant(wiredToken === currentCfBeaconToken, 'Cloudflare beacon did not carry the current manual-install site token.');

    await selectOnlyViaSettings(false, true);
    invariant(
      await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`) === 1,
      'Acquisition-analytics-only must load exactly Ahrefs.'
    );
    invariant(
      await execute(client, `return document.querySelectorAll('#cloudflare-rum-beacon').length;`) === 0,
      'Acquisition-analytics-only must not also load the Cloudflare beacon.'
    );

    await execute(client, `localStorage.clear(); return true;`);
    await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
    await sleep(500);

    await execute(client, `document.querySelector('#reject-analytics')?.click(); return true;`);
    const rejected = await execute(client, `return JSON.parse(localStorage.getItem('privacy-preferences'));`);
    invariant(
      rejected.decided === true
        && rejected.performanceAnalytics.cloudflareRum === false
        && rejected.acquisitionAnalytics.ahrefs === false,
      'Essential-only consent did not persist.'
    );

    // Accept both from the first-layer banner (still reachable, and visible again after a
    // decided rejection via the footer trigger) and confirm both loaders fire exactly once.
    await execute(client, `document.querySelector('#accept-analytics')?.click(); return true;`);
    await sleep(200);
    invariant(
      await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`) === 1,
      'Accept-all must insert Ahrefs exactly once.'
    );
    invariant(
      await execute(client, `return document.querySelectorAll('#cloudflare-rum-beacon').length;`) === 1,
      'Accept-all must insert the Cloudflare RUM beacon exactly once.'
    );
    await execute(client, `document.querySelector('#accept-analytics')?.click(); return true;`);
    await sleep(200);
    invariant(
      await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`) === 1
        && await execute(client, `return document.querySelectorAll('#cloudflare-rum-beacon').length;`) === 1,
      'Re-accepting the same selection must not duplicate either loader.'
    );

    // Second layer: withdraw only performance analytics via the independent toggle. This is an
    // ON->OFF transition, so it must trigger a full reload; acquisition (Ahrefs) must survive it.
    await execute(client, `document.querySelector('[data-privacy-settings-trigger]')?.click(); return true;`);
    await sleep(200);
    await execute(client, `
      document.querySelector('#toggle-performance-analytics').checked = false;
      document.querySelector('#save-privacy-settings')?.click();
      return true;
    `);
    await sleep(800);
    invariant(
      await execute(client, `return document.querySelectorAll('#cloudflare-rum-beacon').length;`) === 0,
      'Withdrawing performance analytics did not prevent future Cloudflare RUM loading.'
    );
    invariant(
      await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`) === 1,
      'Withdrawing performance analytics must not also disable the still-approved acquisition channel.'
    );

    // Now withdraw the remaining acquisition channel and confirm both are gone after reload.
    await execute(client, `document.querySelector('[data-privacy-settings-trigger]')?.click(); return true;`);
    await sleep(200);
    await execute(client, `
      document.querySelector('#toggle-acquisition-analytics').checked = false;
      document.querySelector('#save-privacy-settings')?.click();
      return true;
    `);
    await sleep(800);
    invariant(
      await execute(client, `return document.querySelectorAll('#ahrefs-analytics').length;`) === 0,
      'Withdrawal did not prevent future Ahrefs loading.'
    );
    await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
    await execute(client, `document.querySelector('a[href="/en/"]')?.click(); return true;`);
    await sleep(500);
    invariant(await execute(client, `return location.pathname === '/en/' && document.documentElement.lang === 'en';`), 'ClientRouter locale navigation failed.');

    // The consent banner is re-rendered fresh on every ClientRouter (SPA-like) navigation, and a
    // bundled module <script> only executes once per session — so this proves the footer trigger
    // and settings toggles were re-bound via `astro:page-load` on the page we just SPA-navigated
    // to, not left pointing at listeners on the previous (now-removed) page's DOM nodes.
    await execute(client, `document.querySelector('[data-privacy-settings-trigger]')?.click(); return true;`);
    await sleep(200);
    invariant(
      await execute(client, `return document.querySelector('#cookie-consent-banner [data-layer="2"]')?.hidden === false;`),
      'Privacy settings did not reopen after a client-side (ClientRouter) navigation.'
    );
    invariant(
      await execute(client, `return document.getElementById('toggle-performance-analytics') instanceof HTMLInputElement;`),
      'Settings toggles are not reachable after a client-side navigation.'
    );

    for (const [route, lang, copy] of [['/en/', 'en', 'Accept optional analytics'], ['/ro/', 'ro', 'Acceptă analizele opționale'], ['/', 'de', 'Optionale Analysen akzeptieren']]) {
      await client.command('WebDriver:Navigate', { url: new URL(route, base).href });
      const locale = await execute(client, `return {lang: document.documentElement.lang, text: document.querySelector('#accept-analytics')?.textContent.trim()};`);
      invariant(locale.lang === lang && locale.text.includes(copy), `${lang} consent copy smoke failed.`);
    }

    await client.command('WebDriver:Navigate', { url: new URL('/projects/mindhafen/', base).href });
    const beforeMedia = await execute(client, `return document.querySelectorAll('iframe[src*="youtube"],iframe[src*="spotify"]').length;`);
    invariant(beforeMedia === 0, 'Media iframe loaded before activation.');
    await execute(client, `document.querySelector('[data-embed-src]')?.click(); return true;`);
    invariant(await execute(client, `return document.querySelectorAll('iframe[src*="youtube"],iframe[src*="spotify"]').length;`) === 1, 'Media click-to-load failed.');
    invariant(
      await execute(client, `return document.querySelectorAll('iframe[src*="www.youtube.com"]').length;`) === 0,
      'YouTube embed must use exclusively the privacy-enhanced youtube-nocookie.com domain, never www.youtube.com.',
    );

    await client.command('WebDriver:Navigate', { url: new URL('/blog/job-fit-ai-architecture/', base).href });
    invariant(await execute(client, `return document.querySelectorAll('script[src*="giscus.app"],iframe[src*="giscus.app"]').length;`) === 0, 'Giscus loaded before activation.');
    await execute(client, `document.querySelector('[data-giscus-load]')?.click(); return true;`);
    invariant(await execute(client, `return document.querySelectorAll('script[src*="giscus.app"]').length;`) === 1, 'Giscus click-to-load failed.');

    // ── Phase 3-C Step 2B-2R: interactive AI contextual-consent matrix ─────────
    // Every AI Function is unreachable here anyway (no OPENAI_API_KEY in this local Wrangler
    // session, so a consented request fails closed with 503 before ever calling OpenAI — see
    // local-smoke.mjs's "AI missing-key check"). window.fetch is patched per-page to additionally
    // record the exact request URL/body for the four AI routes, proving request count and body
    // fields without depending on a live provider or a second capture mechanism.
    const aiRequestLog = [];
    const patchAiFetch = `
      window.__aiLog = [];
      window.fetch = (function (original) {
        return function (input, init) {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          if (/\\/api\\/(chat|compass|cashflow-scenario|investment-analysis)/.test(url)) {
            let body = null;
            try { body = init && init.body ? JSON.parse(init.body) : null; } catch (e) {}
            window.__aiLog.push({ url, method: (init && init.method) || 'GET', body });
          }
          return original(input, init);
        };
      })(window.fetch.bind(window));
      return true;
    `;
    async function recordAiRequests(sectionLabel) {
      const log = await execute(client, `return window.__aiLog || [];`);
      aiRequestLog.push({ section: sectionLabel, requests: log });
      return log;
    }

    // 7.1 Ask Mihai — free-text chat
    await client.command('WebDriver:Navigate', { url: new URL('/ai/', base).href });
    await sleep(500);
    await execute(client, patchAiFetch);
    invariant(
      await execute(client, `return document.querySelector('.chat-consent-checkbox')?.checked === false;`),
      '7.1: chat consent checkbox must start unchecked.',
    );
    await execute(client, `
      const ta = document.querySelector('.chat-input');
      ta.value = 'Firefox interaction matrix free-text question';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('.chat-form').requestSubmit();
      return true;
    `);
    await sleep(200);
    invariant((await recordAiRequests('7.1-no-consent')).length === 0, '7.1: chat must not call /api/chat before consent.');
    invariant(
      await execute(client, `return !document.querySelector('.chat-consent-error')?.classList.contains('hidden');`),
      '7.1: chat consent error must become visible after a no-consent submit.',
    );
    invariant(
      await execute(client, `return document.activeElement === document.querySelector('.chat-consent-checkbox');`),
      '7.1: chat consent checkbox must receive focus after a failed submit.',
    );
    await execute(client, `
      const box = document.querySelector('.chat-consent-checkbox');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('.chat-form').requestSubmit();
      return true;
    `);
    await sleep(400);
    const chat71 = await recordAiRequests('7.1-consented');
    invariant(chat71.length === 1, `7.1: expected exactly one /api/chat request after consent, got ${chat71.length}.`);
    invariant(
      chat71[0].body?.privacyConsent === true && chat71[0].body?.privacyNoticeVersion === 'ai-openai-v2',
      '7.1: consented request body must carry the exact consent pair.',
    );
    await client.command('WebDriver:Navigate', { url: new URL('/ai/', base).href });
    await sleep(500);
    invariant(
      await execute(client, `return document.querySelector('.chat-consent-checkbox')?.checked === false;`),
      '7.1: chat consent checkbox must reset to unchecked after reload.',
    );

    // 7.2 JD analysis
    await execute(client, patchAiFetch);
    await execute(client, `
      document.querySelector('.chat-tab[data-tab="jd"]').click();
      const jd = document.querySelector('.jd-input');
      jd.value = 'Firefox interaction matrix synthetic job description text, long enough to pass the fifty character minimum.';
      jd.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('.jd-analyze-btn').click();
      return true;
    `);
    await sleep(200);
    invariant((await recordAiRequests('7.2-no-consent')).length === 0, '7.2: JD analysis must not call /api/chat before consent.');
    invariant(
      await execute(client, `return !document.querySelector('.jd-consent-error')?.classList.contains('hidden');`),
      '7.2: JD consent error must become visible after a no-consent submit.',
    );
    invariant(
      await execute(client, `return document.activeElement === document.querySelector('.jd-consent-checkbox');`),
      '7.2: JD consent checkbox must receive focus after a failed submit.',
    );
    await execute(client, `
      const box = document.querySelector('.jd-consent-checkbox');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('.jd-analyze-btn').click();
      return true;
    `);
    await sleep(400);
    const jd72 = await recordAiRequests('7.2-consented');
    invariant(jd72.length === 1, `7.2: expected exactly one /api/chat request after consent, got ${jd72.length}.`);
    invariant(
      jd72[0].body?.privacyConsent === true && jd72[0].body?.privacyNoticeVersion === 'ai-openai-v2' && jd72[0].body?.tab === 'jd',
      '7.2: consented JD request body must carry the exact consent pair and tab: "jd".',
    );

    // 7.3 Fact chips — deterministic, consent-exempt
    await client.command('WebDriver:Navigate', { url: new URL('/ai/', base).href });
    await sleep(500);
    await execute(client, patchAiFetch);
    await execute(client, `document.querySelector('.chip-btn[data-chip="contact"]')?.click(); return true;`);
    await sleep(300);
    const chips73 = await recordAiRequests('7.3-fact-chip');
    invariant(chips73.length === 1, `7.3: fact chip must still call /api/chat exactly once (deterministic path), got ${chips73.length}.`);
    invariant(!chips73[0].body?.privacyConsent, '7.3: a deterministic fact-chip request must not carry a consent pair.');
    invariant(
      await execute(client, `return document.querySelector('.chat-consent-checkbox')?.checked === false;`),
      '7.3: a fact-chip click must not check or persist AI consent.',
    );

    // 7.4 Founder Compass — synthetic completed-quiz fixture (no live click-through of 12 questions)
    await client.command('WebDriver:Navigate', { url: new URL('/tools/founder-compass/', base).href });
    await sleep(400);
    await execute(client, `
      localStorage.setItem('tools.founder-compass.state.v1', JSON.stringify({
        currentStep: 12,
        answers: Array.from({ length: 12 }, (_, i) => ({ questionId: 'synthetic-' + i, selectedKey: 'A', selectedLabel: 'Synthetic', customText: '' })),
        status: 'idle',
        report: null,
        errorMessage: null,
        lastGeneratedAt: null,
      }));
      return true;
    `);
    await client.command('WebDriver:Navigate', { url: new URL('/tools/founder-compass/', base).href });
    await sleep(500);
    await execute(client, patchAiFetch);
    invariant(
      await execute(client, `return document.querySelector('[data-testid="compass-submit"]') !== null;`),
      '7.4: synthetic completed-quiz fixture did not reach the consent step.',
    );
    invariant(
      await execute(client, `return document.querySelector('input[data-ai-privacy-notice-version]')?.checked === false;`),
      '7.4: Founder Compass consent checkbox must start unchecked.',
    );
    await execute(client, `document.querySelector('[data-testid="compass-submit"]')?.click(); return true;`);
    await sleep(200);
    invariant((await recordAiRequests('7.4-no-consent')).length === 0, '7.4: Founder Compass must not call /api/compass before consent.');
    invariant(
      await execute(client, `return document.activeElement === document.querySelector('input[data-ai-privacy-notice-version]');`),
      '7.4: Founder Compass consent checkbox must receive focus after a failed submit.',
    );
    await execute(client, `
      const box = document.querySelector('input[data-ai-privacy-notice-version]');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-testid="compass-submit"]')?.click();
      return true;
    `);
    await sleep(400);
    const compass74 = await recordAiRequests('7.4-consented');
    invariant(compass74.length === 1, `7.4: expected exactly one /api/compass request after consent, got ${compass74.length}.`);
    invariant(
      compass74[0].body?.privacyConsent === true && compass74[0].body?.privacyNoticeVersion === 'ai-openai-v2',
      '7.4: consented Founder Compass request body must carry the exact consent pair.',
    );

    // 7.5 Cashflow — first generation (synthetic single revenue block, no prior scenario)
    await client.command('WebDriver:Navigate', { url: new URL('/tools/cashflow-forecast/', base).href });
    await sleep(400);
    await execute(client, `
      localStorage.setItem('tools.cashflow-forecast.state.v1', JSON.stringify({
        initialCash: 10000,
        blocks: [{ id: 'synthetic-1', category: 'revenue', subcategory: 'mrr', label: 'Synthetic MRR', amount: 5000 }],
        scenarioResult: null,
        lastScenarioAt: null,
      }));
      return true;
    `);
    await client.command('WebDriver:Navigate', { url: new URL('/tools/cashflow-forecast/', base).href });
    await sleep(500);
    await execute(client, patchAiFetch);
    invariant(
      await execute(client, `return document.querySelector('[data-testid="cashflow-generate"]') !== null;`),
      '7.5: synthetic single-block fixture did not reach the first-generation CTA.',
    );
    invariant(
      await execute(client, `return document.querySelector('input[data-ai-privacy-notice-version]')?.checked === false;`),
      '7.5: Cashflow first-generation consent checkbox must start unchecked.',
    );
    await execute(client, `document.querySelector('[data-testid="cashflow-generate"]')?.click(); return true;`);
    await sleep(200);
    invariant((await recordAiRequests('7.5-no-consent')).length === 0, '7.5: Cashflow must not call /api/cashflow-scenario before consent.');
    invariant(
      await execute(client, `return document.activeElement === document.querySelector('input[data-ai-privacy-notice-version]');`),
      '7.5: Cashflow first-generation consent checkbox must receive focus after a failed submit.',
    );
    await execute(client, `
      const box = document.querySelector('input[data-ai-privacy-notice-version]');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-testid="cashflow-generate"]')?.click();
      return true;
    `);
    await sleep(400);
    const cashflow75 = await recordAiRequests('7.5-consented');
    invariant(cashflow75.length === 1, `7.5: expected exactly one /api/cashflow-scenario request after consent, got ${cashflow75.length}.`);
    invariant(
      cashflow75[0].body?.privacyConsent === true && cashflow75[0].body?.privacyNoticeVersion === 'ai-openai-v2',
      '7.5: consented Cashflow request body must carry the exact consent pair.',
    );

    // 7.6 Cashflow — restored/regenerate (returning session, cooldown already expired)
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const syntheticMonthlyData = JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, revenue: 1000, costs: 500, net: 500, cumulative: 5000 + i * 500 })));
    await client.command('WebDriver:Navigate', { url: new URL('/tools/cashflow-forecast/', base).href });
    await sleep(400);
    await execute(client, `
      localStorage.setItem('tools.cashflow-forecast.state.v1', JSON.stringify({
        initialCash: 10000,
        blocks: [{ id: 'synthetic-1', category: 'revenue', subcategory: 'mrr', label: 'Synthetic MRR', amount: 5000 }],
        scenarioResult: {
          scenarios: [
            { type: 'late_payment', title: 'Synthetic', parameters: { percentAffected: 30, delayDays: 60, costIncreasePercent: 0, additionalOneTimeCost: 0 }, narrative: 'synthetic', monthlyData: ${syntheticMonthlyData} },
            { type: 'churn_spike', title: 'Synthetic', parameters: { percentAffected: 25, delayDays: 0, costIncreasePercent: 0, additionalOneTimeCost: 0 }, narrative: 'synthetic', monthlyData: ${syntheticMonthlyData} },
            { type: 'cost_shock', title: 'Synthetic', parameters: { percentAffected: 0, delayDays: 0, costIncreasePercent: 20, additionalOneTimeCost: 5000 }, narrative: 'synthetic', monthlyData: ${syntheticMonthlyData} }
          ],
          generatedAt: ${eightDaysAgo}
        },
        lastScenarioAt: ${eightDaysAgo}
      }));
      return true;
    `);
    await client.command('WebDriver:Navigate', { url: new URL('/tools/cashflow-forecast/', base).href });
    await sleep(500);
    await execute(client, patchAiFetch);
    invariant(
      await execute(client, `return document.querySelector('[data-testid="cashflow-regenerate"]') !== null;`),
      '7.6: synthetic restored-scenario fixture did not reach the regenerate CTA.',
    );
    invariant(
      await execute(client, `return document.querySelector('input[data-ai-privacy-notice-version]')?.checked === false;`),
      '7.6: a returning session must not have AI consent restored — the checkbox must start unchecked.',
    );
    await execute(client, `document.querySelector('[data-testid="cashflow-regenerate"]')?.click(); return true;`);
    await sleep(200);
    invariant((await recordAiRequests('7.6-no-consent')).length === 0, '7.6: regenerate must not call /api/cashflow-scenario before consent.');
    invariant(
      await execute(client, `return document.activeElement === document.querySelector('input[data-ai-privacy-notice-version]');`),
      '7.6: regenerate consent checkbox must receive focus after a failed click.',
    );
    await execute(client, `
      const box = document.querySelector('input[data-ai-privacy-notice-version]');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-testid="cashflow-regenerate"]')?.click();
      return true;
    `);
    await sleep(400);
    const cashflow76 = await recordAiRequests('7.6-consented');
    invariant(cashflow76.length === 1, `7.6: expected exactly one /api/cashflow-scenario request after consent, got ${cashflow76.length}.`);
    invariant(
      cashflow76[0].body?.privacyConsent === true && cashflow76[0].body?.privacyNoticeVersion === 'ai-openai-v2',
      '7.6: consented regenerate request body must carry the exact consent pair.',
    );

    // 7.7 Investment Analytics
    await client.command('WebDriver:Navigate', { url: new URL('/tools/investment-analytics/', base).href });
    await sleep(500);
    await execute(client, patchAiFetch);
    invariant(
      await execute(client, `return document.querySelector('[data-testid="investment-analyze"]') !== null;`),
      '7.7: Investment Analytics AI-analysis button not found.',
    );
    invariant(
      await execute(client, `return document.querySelector('input[data-ai-privacy-notice-version]')?.checked === false;`),
      '7.7: Investment consent checkbox must start unchecked.',
    );
    await execute(client, `document.querySelector('[data-testid="investment-analyze"]')?.click(); return true;`);
    await sleep(200);
    invariant((await recordAiRequests('7.7-no-consent')).length === 0, '7.7: Investment must not call /api/investment-analysis before consent.');
    invariant(
      await execute(client, `return document.activeElement === document.querySelector('input[data-ai-privacy-notice-version]');`),
      '7.7: Investment consent checkbox must receive focus after a failed click.',
    );
    await execute(client, `
      const box = document.querySelector('input[data-ai-privacy-notice-version]');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-testid="investment-analyze"]')?.click();
      return true;
    `);
    await sleep(400);
    const investment77 = await recordAiRequests('7.7-consented');
    invariant(investment77.length === 1, `7.7: expected exactly one /api/investment-analysis request after consent, got ${investment77.length}.`);
    invariant(
      investment77[0].body?.privacyConsent === true && investment77[0].body?.privacyNoticeVersion === 'ai-openai-v2',
      '7.7: consented Investment request body must carry the exact consent pair.',
    );

    // 7.7b Regression guard: a returning session that already has a completed narrative and whose
    // weekly cooldown has since expired must still be able to re-analyze. The disclosure note must
    // not stay unmounted once `aiNarrative` is set — otherwise `disclosureRef` goes stale and the
    // analyze button silently no-ops forever once the cooldown clears.
    await execute(client, `
      localStorage.setItem('tools.investment-analytics.state.v1', JSON.stringify({
        input: { initialInvestment: 10000, cashFlows: [{ year: 1, amount: 2500 }], discountRate: 8,
          isFund: false, isAccumulating: false, ter: 0, personalFreibetrag: 1000,
          teilfreistellung: false, kirchensteuer: 0 },
        aiNarrative: '{"summary":"synthetic prior result"}',
        lastAiAt: ${eightDaysAgo}
      }));
      return true;
    `);
    await client.command('WebDriver:Navigate', { url: new URL('/tools/investment-analytics/', base).href });
    await sleep(500);
    await execute(client, patchAiFetch);
    invariant(
      await execute(client, `return document.querySelector('[data-testid="investment-analyze"]')?.disabled === false;`),
      '7.7b: analyze button must be enabled once a prior narrative exists and the cooldown has expired.',
    );
    invariant(
      await execute(client, `return document.querySelector('input[data-ai-privacy-notice-version]') !== null;`),
      '7.7b: the disclosure note must stay mounted for a returning session with a completed narrative — a stale disclosureRef would silently no-op every re-analyze click.',
    );
    invariant(
      await execute(client, `return document.querySelector('input[data-ai-privacy-notice-version]')?.checked === false;`),
      '7.7b: consent must not be restored across a reload even with a prior narrative present.',
    );
    await execute(client, `document.querySelector('[data-testid="investment-analyze"]')?.click(); return true;`);
    await sleep(200);
    invariant((await recordAiRequests('7.7b-no-consent')).length === 0, '7.7b: re-analyze must not call /api/investment-analysis before consent.');
    invariant(
      await execute(client, `return document.activeElement === document.querySelector('input[data-ai-privacy-notice-version]');`),
      '7.7b: consent checkbox must receive focus after a failed re-analyze click.',
    );
    await execute(client, `
      const box = document.querySelector('input[data-ai-privacy-notice-version]');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-testid="investment-analyze"]')?.click();
      return true;
    `);
    await sleep(400);
    const investment77b = await recordAiRequests('7.7b-consented');
    invariant(investment77b.length === 1, `7.7b: expected exactly one /api/investment-analysis request after re-consent, got ${investment77b.length}.`);
    invariant(
      investment77b[0].body?.privacyConsent === true && investment77b[0].body?.privacyNoticeVersion === 'ai-openai-v2',
      '7.7b: consented re-analyze request body must carry the exact consent pair.',
    );

    // 7.8 Astro (ClientRouter) navigation — the site-wide ChatDrawer must re-init correctly, with
    // no stale references and no duplicate request, after a client-side route transition.
    await client.command('WebDriver:Navigate', { url: new URL('/', base).href });
    await sleep(500);
    await execute(client, `document.querySelector('a[href="/en/"]')?.click(); return true;`);
    await sleep(500);
    await execute(client, `document.querySelector('a[href="/"]')?.click(); return true;`);
    await sleep(500);
    await execute(client, patchAiFetch);
    invariant(
      await execute(client, `return document.querySelector('.chat-consent-checkbox')?.checked === false;`),
      '7.8: chat consent checkbox must be unchecked after a ClientRouter round-trip navigation.',
    );
    await execute(client, `
      const box = document.querySelector('.chat-consent-checkbox');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      const ta = document.querySelector('.chat-input');
      ta.value = 'post-navigation duplicate-listener check';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('.chat-form').requestSubmit();
      return true;
    `);
    await sleep(400);
    const nav78 = await recordAiRequests('7.8-post-navigation');
    invariant(nav78.length === 1, `7.8: exactly one request expected after a ClientRouter round-trip (no duplicate listeners), got ${nav78.length}.`);

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
      optionalResources: ['cloudflare-rum', 'ahrefs', 'giscus', 'youtube-or-spotify'],
      sampleReview: 'disabled',
      aiConsentInteractionMatrix: aiRequestLog,
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
