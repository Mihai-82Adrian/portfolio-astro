// Guards README.md against drift from the actual source it describes.
// Deliberately checks stable facts (links resolve, commands exist, model
// mapping matches source constants) rather than brittle prose formatting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startsWithOrigin } from './helpers/url-assertions.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const README = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const PACKAGE_JSON = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function slugify(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

const headingSlugs = new Set(
  [...README.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slugify(m[1]))
);

const routeCategories = new Set(
  readdirSync(path.join(ROOT, 'src/pages'), { withFileTypes: true })
    .map((entry) => entry.name.replace(/\.(astro|ts)$/, ''))
);

test('every `npm run ...` command shown in README exists in package.json', () => {
  const commands = [...README.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]);
  assert.ok(commands.length > 0, 'expected README to document at least one npm command');
  for (const cmd of commands) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(PACKAGE_JSON.scripts, cmd),
      `README references "npm run ${cmd}" but package.json has no such script`
    );
  }
});

test('every local Markdown link in README resolves to a tracked file, an anchor, or a known site route', () => {
  const links = [...README.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(links.length > 0, 'expected README to contain at least one link');

  for (const raw of links) {
    if (startsWithOrigin(raw, 'https://me-mateescu.de')) {
      const routePath = raw.slice('https://me-mateescu.de'.length) || '/';
      const segment = routePath.split('/').filter(Boolean)[0];
      if (segment) {
        assert.ok(
          routeCategories.has(segment),
          `README links to site route "${routePath}" but "src/pages/${segment}" has no matching page/directory`
        );
      }
      continue;
    }
    if (/^https?:\/\//.test(raw)) continue; // genuinely external link, not ours to validate
    if (raw.startsWith('#')) {
      assert.ok(
        headingSlugs.has(raw.slice(1)),
        `README anchor link "${raw}" does not match any heading slug`
      );
      continue;
    }
    const cleanPath = raw.startsWith('./') ? raw.slice(2) : raw;
    assert.ok(
      existsSync(path.join(ROOT, cleanPath)),
      `README links to local file "${raw}" which does not exist at ${path.join(ROOT, cleanPath)}`
    );
  }
});

test('README does not reference obsolete or incorrect AI architecture terms', () => {
  const banned = [
    'Cloudflare Workers AI',
    'Workers AI',
    'Llama',
    'Chat Completions',
    '/v1/chat/completions',
    'gpt-4.1-mini',
    'o4-mini',
    'zero retention',
    'zero-retention',
    'zero hallucination',
  ];
  for (const term of banned) {
    assert.ok(
      !README.includes(term),
      `README contains obsolete/incorrect term "${term}" — the current architecture is OpenAI Responses API only`
    );
  }
  assert.doesNotMatch(README, /weekly per-hashed-IP quota/i);
  assert.doesNotMatch(README, /six deterministic (?:financial )?tools/i);
  assert.doesNotMatch(README, /Zero Data Retention/i);
});

test('README does not claim sample-review/Resend is active without qualification', () => {
  const sampleReviewSource = readFileSync(path.join(ROOT, 'functions/api/sample-review.ts'), 'utf8');
  const isCurrentlyGated = sampleReviewSource.includes('RESEND_API_KEY');
  assert.ok(isCurrentlyGated, 'expected sample-review.ts to still gate on RESEND_API_KEY presence');
  assert.ok(
    README.includes('not currently active in production') || README.includes('not currently configured'),
    'README must state that the sample-review/Resend flow is not currently active, matching functions/api/sample-review.ts gating on an unset RESEND_API_KEY'
  );
});

test("README's AI endpoint/model mapping matches the exported constants in functions/api/*.ts", () => {
  const tableRows = [...README.matchAll(/\|\s*`([a-z-]+\.ts)`\s*\|\s*`(gpt-[a-z0-9.-]+)`\s*\|/g)];
  assert.ok(tableRows.length >= 4, 'expected README to document all four AI endpoint/model pairs');

  for (const [, file, readmeModel] of tableRows) {
    const source = readFileSync(path.join(ROOT, 'functions/api', file), 'utf8');
    const match = source.match(/_MODEL\s*=\s*'([^']+)'/);
    assert.ok(match, `functions/api/${file} has no exported *_MODEL constant to compare against`);
    assert.equal(
      match[1],
      readmeModel,
      `README says functions/api/${file} uses "${readmeModel}" but the source constant is "${match[1]}"`
    );
  }
});

test('every docs/operations file linked from README actually exists', () => {
  const docLinks = [...README.matchAll(/\(docs\/operations\/([a-zA-Z0-9_-]+\.md)\)/g)].map((m) => m[1]);
  assert.ok(docLinks.length > 0, 'expected README to link at least one docs/operations file');
  for (const file of docLinks) {
    assert.ok(
      existsSync(path.join(ROOT, 'docs/operations', file)),
      `README links to docs/operations/${file} which does not exist`
    );
  }
});

test('README distinguishes repository state from deployed production state', () => {
  assert.ok(
    headingSlugs.has('current-development-and-release-state'),
    'README must keep a section distinguishing repository/integration state from what is actually deployed to production'
  );
});

test('README framework major matches package.json and release language remains qualified', () => {
  const frameworkMajor = Number(PACKAGE_JSON.dependencies.astro.match(/(\d+)/)[1]);
  assert.match(README, new RegExp(`Astro ${frameworkMajor}\\b`));
  assert.doesNotMatch(README, /qualified (?:legal|privacy-policy) review (?:has|was|is) (?:completed|received|done)/i);
  assert.doesNotMatch(README, /currently reviewed statement of legal bases/i);
  assert.match(README, /qualified (?:privacy-policy|legal) review[\s\S]{0,100}(?:open|required|remaining)/i);
});

test('README keeps XRechnung support separate from KoSIT validation', () => {
  assert.match(README, /XRechnung/);
  assert.match(README, /KoSIT/);
  assert.doesNotMatch(README, /KoSIT[^.\n]{0,30}(?:compliant|conformant)/i);
});

test('README links the privacy operations boundary and states inactive email delivery', () => {
  assert.match(README, /\(docs\/operations\/privacy-consent-external-services\.md\)/);
  assert.match(README, /Sample Review[\s\S]{0,160}inactive/i);
  assert.match(README, /Resend[\s\S]{0,160}(?:inactive|not configured)/i);
});

test('README and Architecture agree on the local release identity without claiming deployment', () => {
  const architecture = readFileSync(path.join(ROOT, 'docs/ARCHITECTURE.md'), 'utf8');
  const health = readFileSync(path.join(ROOT, 'functions/api/health.ts'), 'utf8');
  const contracts = readFileSync(path.join(ROOT, 'functions/_lib/contracts.ts'), 'utf8');

  for (const document of [README, architecture]) {
    assert.match(document, /schemaVersion[\s\S]{0,160}releaseId[\s\S]{0,160}sourceRevision/);
    assert.match(document, /\/api\/health/);
  }
  assert.match(contracts, /'Cache-Control': 'no-store'/);
  assert.match(health, /jsonSuccess/);
  assert.doesNotMatch(README, /(?:deployed|production)[^.\n]{0,100}(?:now |currently )?(?:serves|exposes|includes)[^.\n]*\/api\/health/i);
  assert.doesNotMatch(README, /Phase 2A[^.\n]{0,80}deployed/i);
});
