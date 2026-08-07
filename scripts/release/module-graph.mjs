#!/usr/bin/env node
// Verifies that every same-origin JavaScript module reachable from a deployed
// page's <script type="module"> entry points, followed recursively through
// static import/import() specifiers, actually returns a real JS module
// response — not an HTML fallback or error page cached under a hashed
// module URL (see docs/operations/pages-functions-contracts.md's transport
// contracts and public/_headers' /_astro/* caching note for the underlying
// incident this guards against).
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const JS_MIME = /^(text|application)\/javascript/i;
// Matches both spaced and minified static import/re-export specifiers
// (`import x from"./a.js"`, `export{y}from"./a.js"`) and dynamic imports
// (`import("./a.js")`, `import ("./a.js")`).
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.[^"']+)["']/g;

function extractModuleScriptSrcs(html) {
  return [...html.matchAll(/<script\b[^>]*\btype\s*=\s*["']module["'][^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1]);
}

function extractStaticImportSpecifiers(source) {
  return [...source.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]);
}

export async function verifyModuleGraph({ baseUrl, fetchImpl = fetch, entryPaths = ['/'] }) {
  const base = new URL(baseUrl);
  const visited = new Set();
  const checked = [];
  const queue = [];

  for (const entryPath of entryPaths) {
    const entryUrl = new URL(entryPath, base);
    const response = await fetchImpl(entryUrl, { redirect: 'manual' });
    invariant(response.status === 200, `Entry page ${entryPath} returned ${response.status}, expected 200.`);
    const html = await response.text();
    for (const src of extractModuleScriptSrcs(html)) {
      const moduleUrl = new URL(src, entryUrl);
      if (moduleUrl.origin === base.origin) queue.push(moduleUrl.href);
    }
  }

  while (queue.length > 0) {
    const moduleHref = queue.shift();
    if (visited.has(moduleHref)) continue;
    visited.add(moduleHref);

    const response = await fetchImpl(moduleHref, { redirect: 'manual' });
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    const looksLikeHtml = /^\s*<(!doctype|html)/i.test(body);

    invariant(
      response.status === 200,
      `Module ${moduleHref} returned ${response.status}, expected 200.`,
    );
    invariant(
      JS_MIME.test(contentType),
      `Module ${moduleHref} returned content-type "${contentType}", expected a JavaScript MIME type.`,
    );
    invariant(
      !looksLikeHtml,
      `Module ${moduleHref} returned HTML content under a JavaScript module URL.`,
    );

    checked.push({ url: moduleHref, contentType, bytes: body.length });

    for (const specifier of extractStaticImportSpecifiers(body)) {
      const resolved = new URL(specifier, moduleHref);
      if (resolved.origin === base.origin && !visited.has(resolved.href)) queue.push(resolved.href);
    }
  }

  const privacyConsentModuleChecked = checked.some((entry) => /\/privacy-consent\.[^/]+\.js$/.test(new URL(entry.url).pathname));
  invariant(
    privacyConsentModuleChecked,
    'Module graph traversal never reached the privacy-consent chunk — the regression fixture requires it to be covered.',
  );

  return {
    result: 'PASS',
    moduleCount: checked.length,
    modules: checked.map((entry) => new URL(entry.url).pathname),
    privacyConsentModuleChecked: true,
  };
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const summary = await verifyModuleGraph({ baseUrl: option('--base-url') });
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
