// Guards README.md against drift from the actual source it describes.
// Deliberately checks stable facts (links resolve, commands exist, model
// mapping matches source constants) rather than brittle prose formatting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startsWithOrigin, textMentionsHost } from './helpers/url-assertions.mjs';

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
  // Never claim qualified external legal review itself is finished, or that legal bases were
  // already reviewed — that would overclaim beyond the owner's documented risk-acceptance decision.
  assert.doesNotMatch(README, /qualified (?:legal|privacy-policy) review (?:has|was|is) (?:completed|received|done)/i);
  assert.doesNotMatch(README, /currently reviewed statement of legal bases/i);
  // Phase 5-D2-B: the "Privacy and external services" section once said qualified policy review
  // "remains a release gate" (a generic, undated claim) — stale the moment the owner recorded the
  // trigger-based decision below, since a release had already shipped without it being a blocker.
  // Fails closed against that phrasing returning while the current owner decision stays in force.
  assert.doesNotMatch(README, /qualified (?:policy|legal) review remains an? (?:open )?release gate/i);
  // OWNER-AUTHORIZED GOVERNANCE TEST SYNCHRONIZATION (Phase 3-C Step 3E-A): the prior assertion here
  // required README to state qualified privacy-policy review "remains open" in the general sense.
  // That framing is now stale — the owner recorded an explicit, durable release decision distinguishing
  // completed technical/privacy review + owner risk acceptance from still-open, trigger-based *external
  // qualified* review. These five replacement assertions verify the new decision is stated precisely,
  // without ever claiming qualified external review or absolute legal compliance is complete.
  assert.match(README, /technical\/privacy review is complete/i);
  assert.match(README, /owner has recorded an explicit risk-acceptance decision/i);
  assert.match(README, /qualified external legal review is trigger-based, not completed/i);
  assert.match(README, /external review\s+becomes required again under the explicit trigger conditions/i);
  assert.match(README, /not a claim of absolute legal compliance/i);
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

test('README and Architecture agree on the local release identity and the /api/health mechanism', () => {
  const architecture = readFileSync(path.join(ROOT, 'docs/ARCHITECTURE.md'), 'utf8');
  const health = readFileSync(path.join(ROOT, 'functions/api/health.ts'), 'utf8');
  const contracts = readFileSync(path.join(ROOT, 'functions/_lib/contracts.ts'), 'utf8');

  for (const document of [README, architecture]) {
    assert.match(document, /schemaVersion[\s\S]{0,160}releaseId[\s\S]{0,160}sourceRevision/);
    assert.match(document, /\/api\/health/);
  }
  assert.match(contracts, /'Cache-Control': 'no-store'/);
  assert.match(health, /jsonSuccess/);
  // /api/health is the runtime mechanism for observing deployed release identity, so README/
  // Architecture may legitimately state that a deployment serves it (a controlled production
  // release has occurred) — it is a factual observation channel, not an overclaim to guard against.
  assert.doesNotMatch(README, /Phase 2A[^.\n]{0,80}deployed/i);
});

test('.github/DEPLOYMENT.md stays a compatibility index, not a second deployment manual, and never conflates git rollback with production rollback', () => {
  const DEPLOYMENT = readFileSync(path.join(ROOT, '.github/DEPLOYMENT.md'), 'utf8');

  assert.match(DEPLOYMENT, /compatibility entry point/i, 'must identify itself as a compatibility entry point, not a manual');

  for (const doc of [
    'docs/operations/release-pipeline.md',
    'docs/operations/cloudflare-pages-configuration.md',
    'docs/operations/rollback-postdeploy.md',
    'docs/operations/public-release-lineage-strategy.md',
  ]) {
    assert.ok(existsSync(path.join(ROOT, doc)), `${doc} must exist for DEPLOYMENT.md to link to it`);
    const basename = doc.split('/').pop();
    assert.ok(
      DEPLOYMENT.includes(basename),
      `.github/DEPLOYMENT.md must link to the canonical ${doc}`
    );
  }

  const bannedLiterals = [
    'git push origin main',
    '.github/workflows/deploy.yml',
    '.github/workflows/quality.yml',
  ];
  for (const literal of bannedLiterals) {
    assert.ok(
      !DEPLOYMENT.includes(literal),
      `.github/DEPLOYMENT.md must not contain the stale/unsafe literal "${literal}"`
    );
  }

  assert.doesNotMatch(
    DEPLOYMENT,
    /push[^.\n]{0,60}(?:triggers?|starts?|causes?)[^.\n]{0,40}(?:new )?(?:production )?deploy/i,
    '.github/DEPLOYMENT.md must not claim a plain push triggers a production deployment'
  );
  assert.doesNotMatch(
    DEPLOYMENT,
    /git push[^\n]*(?:--force\b|-f\b|--force-with-lease)/,
    '.github/DEPLOYMENT.md must not instruct an actual force-push command (a prose warning against force-push is fine)'
  );
  assert.doesNotMatch(
    DEPLOYMENT,
    /CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID/,
    '.github/DEPLOYMENT.md must not itself re-document Cloudflare deployment-secret setup; that lives in docs/operations/release-pipeline.md only'
  );

  assert.match(DEPLOYMENT, /git revert/i, 'must state that git rollback uses git revert');
  assert.match(DEPLOYMENT, /Cloudflare[^.\n]{0,60}rollback/i, 'must state that production rollback is a Cloudflare deployment rollback');
  assert.match(
    DEPLOYMENT,
    /separate operations/i,
    'must state that git rollback and production rollback are separate operations'
  );
});

test('README and Architecture distinguish public master from deployed production, and never claim CodeQL/Dependabot are unconfigured or that no public-safe release commit exists', () => {
  const architecture = readFileSync(path.join(ROOT, 'docs/ARCHITECTURE.md'), 'utf8');

  // Repository/public-master state and deployed-production state are always distinct
  // operational concepts (a git commit vs. a live deployment) whether or not they are
  // currently aligned — this must remain durably true regardless of release status, so it
  // is not pinned to "production lags" language that only held before Phase 4 completed.
  for (const document of [README, architecture]) {
    assert.match(
      document,
      /(?:master|repository|canonical)[^.\n]{0,200}separate state/i,
      'must explicitly distinguish public master/repository state from deployed production as separate operational concepts'
    );
  }

  const stalenessPatterns = [
    /Dependabot[^.\n]{0,80}(?:not|un)configured/i,
    /CodeQL[^.\n]{0,80}(?:not|un)configured/i,
    /no public-safe release commit/i,
    /(?:no|not).{0,20}public-safe (?:release )?commit exists/i,
  ];
  for (const document of [README, architecture]) {
    for (const pattern of stalenessPatterns) {
      assert.doesNotMatch(
        document,
        pattern,
        `must not claim CodeQL/Dependabot are unconfigured or that no public-safe release commit exists (pattern: ${pattern})`
      );
    }
  }
});

test('any browser-side fetch to api.github.com stays documented in the living privacy service matrix', () => {
  // This does not require removing or gating the egress -- only that it stays documented
  // while it exists, so this specific automatic, unconsented widget flow (found by the
  // Phase 3-C Step 2A-C independent review) can never silently drop out of the living
  // privacy record again. Scoped to api.github.com specifically, not a generic every-CSP-host
  // check, since other already-permitted origins (e.g. Ahrefs) are identified in the matrix by
  // service name rather than by literal domain string.
  const headers = readFileSync(path.join(ROOT, 'public/_headers'), 'utf8');
  const cspAllowsIt = /connect-src[^;]*\bhttps:\/\/api\.github\.com\b/.test(headers);

  const srcFiles = [];
  const walk = (dir) => {
    for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx|astro|svelte|mjs|js)$/.test(entry.name)) srcFiles.push(rel);
    }
  };
  walk('src');
  const fetchedFromSrc = srcFiles.some((file) =>
    textMentionsHost(readFileSync(path.join(ROOT, file), 'utf8'), 'api.github.com')
  );

  if (!cspAllowsIt && !fetchedFromSrc) return; // the egress no longer exists; nothing to document.

  const privacyDoc = readFileSync(
    path.join(ROOT, 'docs/operations/privacy-consent-external-services.md'),
    'utf8'
  );
  assert.ok(
    textMentionsHost(privacyDoc, 'api.github.com'),
    'api.github.com is CSP-permitted and/or fetched from src/, but is not mentioned in docs/operations/privacy-consent-external-services.md'
  );
});
