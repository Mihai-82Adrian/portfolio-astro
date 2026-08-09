// Phase 2D-C Wave 5 (Content, SEO, Localization and Proof): locks the bounded remediations
// recorded in PHASE_2D_C_WAVE5_CONTENT_PROOF_REGISTER.md so they cannot silently regress.
// Requires a prior `npm run build` (see verify:route-integrity / verify:route-integrity:built).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { certifications } from '../src/data/certifications.ts';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const AI_CERT_IDS = [
  'anthropic-ai-fluency-foundations',
  'anthropic-ai-fluency-builders',
  'anthropic-ai-fluency-small-business',
];

const ACCREDITATION_CLAIM_PATTERNS = [
  /Anthropic-certified specialist/i,
  /accredited AI engineer/i,
  /professional license/i,
  /formal occupational qualification/i,
  /university degree/i,
];

function collectJsonLdTypes(node, acc = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdTypes(item, acc);
    return acc;
  }
  if (node && typeof node === 'object') {
    if (typeof node['@type'] === 'string') acc.push(node['@type']);
    else if (Array.isArray(node['@type'])) acc.push(...node['@type']);
    for (const value of Object.values(node)) collectJsonLdTypes(value, acc);
  }
  return acc;
}

function parseJsonLdBlocks(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  return blocks.map(([, json]) => JSON.parse(json));
}

test('dist/ has been built before running this suite', () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'run `npm run build` before this test');
});

test('WebSite JSON-LD no longer claims a non-functional blog SearchAction', () => {
  for (const relPath of ['index.html', 'en/index.html', 'ro/index.html']) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    assert.doesNotMatch(html, /SearchAction/, `${relPath} must not claim a SearchAction the blog does not implement`);
  }
});

test('/404 is excluded from the sitemap (matches its own noindex directive)', () => {
  const sitemap = readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8');
  assert.doesNotMatch(sitemap, /\/404\/</, 'noindexed 404 page must not be listed in the sitemap');
});

test('RSS feeds no longer reference the nonexistent /rss-styles.xsl stylesheet', () => {
  for (const relPath of ['rss.xml', 'rss/finance.xml', 'rss/ai-ml.xml']) {
    const xml = readFileSync(path.join(DIST, relPath), 'utf8');
    assert.doesNotMatch(xml, /rss-styles\.xsl/, `${relPath} must not reference a stylesheet file that does not exist`);
  }
});

test('project pages use a raster (non-SVG) og:image for reliable social-share previews', () => {
  for (const slug of ['gds', 'genesis', 'profitminds', 'mindhafen']) {
    const html = readFileSync(path.join(DIST, 'projects', slug, 'index.html'), 'utf8');
    const match = html.match(/property="og:image" content="([^"]+)"/);
    assert.ok(match, `${slug} project page must set og:image`);
    assert.doesNotMatch(match[1], /\.svg$/i, `${slug} og:image must not be an SVG (weak/no social-platform support)`);
  }
});

test('Fin-Tools deep-dive tool pages link back to their explanatory blog posts', () => {
  const xrechnung = readFileSync(path.join(DIST, 'tools/xrechnung/index.html'), 'utf8');
  assert.match(xrechnung, /href="\/blog\/xrechnung-generator-local-first-en16931"/);

  const founderCompass = readFileSync(path.join(DIST, 'tools/founder-compass/index.html'), 'utf8');
  assert.match(founderCompass, /href="\/blog\/founder-compass-svelte5-cloudflare-workers"/);
});

test('EN/RO certifications pages use translated field labels, not hardcoded German', () => {
  for (const relPath of ['en/certifications/index.html', 'ro/certifications/index.html']) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    assert.doesNotMatch(html, />Aussteller:</, `${relPath} must not hardcode the German label "Aussteller"`);
    assert.doesNotMatch(html, />Erhalten:</, `${relPath} must not hardcode the German label "Erhalten"`);
    assert.doesNotMatch(html, />Von:</, `${relPath} must not hardcode the German label "Von"`);
  }
});

test('EN/RO experience pages carry the same TimelineFilters/GrowthChart sections as DE (locale parity)', () => {
  for (const relPath of ['experience/index.html', 'en/experience/index.html', 'ro/experience/index.html']) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    assert.match(html, /growth-chart/, `${relPath} must render the career-growth visualization`);
    assert.match(html, /timeline-filter/, `${relPath} must render the timeline filters`);
  }
});

test('RO experience page "back to home" link targets /ro/, not the DE homepage', () => {
  const html = readFileSync(path.join(DIST, 'ro/experience/index.html'), 'utf8');
  assert.match(html, /href="\/ro\/"[^>]*>\s*<span/s, 'RO back-to-home link must point at /ro/');
});

test('/now no longer carries the stale #Astro5 tag for the current Astro 7 toolchain', () => {
  const html = readFileSync(path.join(DIST, 'now/index.html'), 'utf8');
  assert.doesNotMatch(html, />#Astro5</);
  assert.match(html, />#Astro7</);
});

test('the 3 Anthropic AI Fluency certificates are integrated with issuer, date, and a downloadable PDF, in all locales', () => {
  for (const relPath of ['certifications/index.html', 'en/certifications/index.html', 'ro/certifications/index.html']) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    assert.match(html, /AI Fluency for Builders/, `${relPath} must list AI Fluency for Builders`);
    assert.match(html, /AI Fluency: Framework/, `${relPath} must list AI Fluency: Framework & Foundations`);
    assert.match(html, /AI Fluency for Small Businesses/, `${relPath} must list AI Fluency for Small Businesses`);
    assert.match(html, /Anthropic/, `${relPath} must name Anthropic as issuer`);
  }
  for (const pdf of [
    'Anthropic - AI Fluency for Builders.pdf',
    'Anthropic - AI Fluency Framework and Foundations.pdf',
    'Anthropic - AI Fluency for Small Businesses.pdf',
  ]) {
    assert.ok(existsSync(path.join(ROOT, 'public/images', pdf)), `source PDF must exist: ${pdf}`);
  }
});

test('README roadmap summary reflects Phase 2 done / Phase 3 done / Phase 4 complete', () => {
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.doesNotMatch(readme, /Phase 2D-B Product Scope Audit and Launch Lock is next/);
  assert.doesNotMatch(readme, /Wave 6 next/);
  assert.doesNotMatch(readme, /Phase 2D-D\s+security\/dependency acceptance is next/);
  assert.match(readme, /Phase 2[\s\S]{0,400}is done/);

  // OWNER-AUTHORIZED GOVERNANCE TEST SYNCHRONIZATION (Phase 5-D2-B): Phase 3 stayed an "active"
  // umbrella only pending Phase 4's separate production-release authorization (Step 3E-R); that
  // authorization was granted and Phase 4 completed, so Phase 3 closed to "done" — this
  // synchronizes the snapshot assertion with that legitimate, evidence-backed status change
  // (Phase 5-D2A baseline, 2026-08-09), the same durable-contract family already fixed once in
  // tests/repo-truth.test.mjs and tests/governance.test.mjs.
  const phase3Top = readme.match(/Phase 3 Human and Remote Readiness\s+(?:is|stays)\s+(\w+)/);
  assert.ok(phase3Top, 'README must state Phase 3\'s top-level status inline');
  assert.equal(
    phase3Top[1].toLowerCase(),
    'done',
    `Phase 3 (top-level umbrella) must be stated as done, found "${phase3Top[1]}"`
  );
  assert.match(readme, /Phase 3-A[\s\S]{0,80}done/i);

  // Phase 3-B and Phase 3-C are both closed — anchored on the exact status word following each
  // phase's own parenthetical, not a windowed substring search, so this fails loudly the moment
  // either phase's stated status actually changes (including a regression back to next/active)
  // instead of only when unrelated nearby prose happens to shift.
  const phase3B = readme.match(/Phase 3-B \([^)]*\)\s+is\s+(\w+)/);
  assert.ok(phase3B, 'README must state Phase 3-B\'s status inline as "Phase 3-B (...) is <status>"');
  assert.equal(
    phase3B[1].toLowerCase(),
    'done',
    `Phase 3-B must be stated as done, found "${phase3B[1]}" — Phase 3-B must never regress to next/active in the README`
  );

  const phase3C = readme.match(/Phase 3-C \([^)]*\)\s+is\s+(?:now\s+)?(\w+)/);
  assert.ok(phase3C, 'README must state Phase 3-C\'s status inline as "Phase 3-C (...) is [now] <status>"');
  assert.equal(
    phase3C[1].toLowerCase(),
    'done',
    `Phase 3-C must be stated as done, found "${phase3C[1]}"`
  );

  // Phase 4's controlled production release is complete (verified independently via the
  // Cloudflare API and a live /api/health fetch in the Phase 5-D2A baseline, not inferred from a
  // local build) — README must state this accurately, the same anchored-status-word discipline
  // used for Phase 3-B/3-C above, rather than either forbidding or merely tolerating the fact.
  assert.match(
    readme,
    /Phase 4[^.\n]{0,120}(?:complete|closed|is done)/i,
    'README must state Phase 4 as complete/closed, matching the verified production release'
  );
  assert.match(
    readme,
    /independently confirmed[\s\S]{0,80}Cloudflare API[\s\S]{0,80}\/api\/health/i,
    'README must state that production identity was independently confirmed via the Cloudflare API and /api/health, not merely inferred from a local build'
  );

  // Repository/public-master state and deployed-production state remain separate operational
  // concepts (a git commit vs. a live deployment) whether or not they are currently aligned — the
  // same durable invariant tests/repo-truth.test.mjs enforces, checked here too since this test
  // owns README's Roadmap-section content-proof responsibility specifically.
  assert.match(
    readme,
    /(?:master|repository|canonical)[^.\n]{0,200}separate state/i,
    'README must distinguish public master/repository state from deployed production as separate operational concepts'
  );
});

// --- Wave 5 closure: dedicated AI & Professional Development certificate category ---

test('the 3 AI Fluency certificates form a dedicated category, not the generic "other" bucket', () => {
  const aiCerts = certifications.filter(c => c.category === 'ai-professional-development');
  assert.equal(aiCerts.length, 3, 'exactly 3 certificates must carry the dedicated category');
  assert.deepEqual(aiCerts.map(c => c.id), AI_CERT_IDS, 'certificates must appear in the intended learning-path order');

  const otherCerts = certifications.filter(c => c.category === 'other');
  for (const id of AI_CERT_IDS) {
    assert.ok(!otherCerts.some(c => c.id === id), `${id} must not remain in the generic "other" category`);
  }
  assert.ok(otherCerts.some(c => c.id === 'lebenslauf'), 'the CV must remain in the generic "other" category');
});

test('each AI Fluency certificate is identified as a completion certificate with a description and attribution, never as accreditation', () => {
  for (const id of AI_CERT_IDS) {
    const cert = certifications.find(c => c.id === id);
    assert.ok(cert, `${id} must exist`);
    for (const lang of ['de', 'en', 'ro']) {
      assert.ok(cert.credentialType?.[lang], `${id} must have a localized credential-type label (${lang})`);
      assert.ok(cert.description?.[lang], `${id} must have a localized description (${lang})`);
      assert.ok(cert.attribution?.[lang], `${id} must have a localized attribution/partnership sentence (${lang})`);
      for (const field of [cert.credentialType[lang], cert.description[lang], cert.attribution[lang]]) {
        for (const pattern of ACCREDITATION_CLAIM_PATTERNS) {
          assert.doesNotMatch(field, pattern, `${id}.${lang} must not overstate accreditation`);
        }
      }
    }
    assert.ok(existsSync(path.join(ROOT, 'public', cert.image)), `${id} thumbnail must exist: ${cert.image}`);
    assert.ok(existsSync(path.join(ROOT, 'public', cert.pdfUrl)), `${id} PDF must exist: ${cert.pdfUrl}`);
  }
});

test('AI Fluency: Framework & Foundations attribution names academic partners distinctly from support-body attribution', () => {
  const cert = certifications.find(c => c.id === 'anthropic-ai-fluency-foundations');
  assert.match(cert.attribution.en, /University College Cork/);
  assert.match(cert.attribution.en, /Ringling College/);
  assert.match(cert.attribution.en, /Higher Education Authority/);
  assert.match(cert.attribution.en, /National Forum/);
});

test('AI Fluency for Builders attribution names the CodePath.org partnership', () => {
  const cert = certifications.find(c => c.id === 'anthropic-ai-fluency-builders');
  assert.match(cert.attribution.en, /CodePath\.org/);
});

test('AI Fluency for Small Businesses attribution names the PayPal partnership', () => {
  const cert = certifications.find(c => c.id === 'anthropic-ai-fluency-small-business');
  assert.match(cert.attribution.en, /PayPal/);
});

test('rendered certification pages (DE/EN/RO) show the dedicated category heading, correct order, and visible descriptions', () => {
  const expectations = [
    ['certifications/index.html', 'KI & Weiterbildung'],
    ['en/certifications/index.html', 'AI & Professional Development'],
    ['ro/certifications/index.html', 'AI și dezvoltare profesională'],
  ];
  for (const [relPath, heading] of expectations) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    const headingPattern = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '(?:&|&amp;)');
    assert.match(html, new RegExp(headingPattern), `${relPath} must show the dedicated category heading`);

    const foundationsIdx = html.indexOf('AI Fluency: Framework');
    const buildersIdx = html.indexOf('AI Fluency for Builders');
    const smallBizIdx = html.indexOf('AI Fluency for Small Businesses');
    assert.ok(foundationsIdx > -1 && buildersIdx > -1 && smallBizIdx > -1, `${relPath} must list all 3 certificates`);
    assert.ok(foundationsIdx < buildersIdx && buildersIdx < smallBizIdx, `${relPath} must preserve the intended learning-path order`);

    assert.match(html, /4D/, `${relPath} must render a visible description mentioning the 4D framework`);
    assert.match(html, /Certificate of Completion|Abschlusszertifikat|Certificat de finalizare/, `${relPath} must show the credential-type wording`);

    for (const pattern of ACCREDITATION_CLAIM_PATTERNS) {
      assert.doesNotMatch(html, pattern, `${relPath} must not overstate accreditation`);
    }
  }
});

// --- Wave 5 closure: invalid WorkExperience JSON-LD replaced with a valid, nested representation ---

test('no route emits the invalid Schema.org type "WorkExperience"', () => {
  for (const relPath of ['experience/index.html', 'en/experience/index.html', 'ro/experience/index.html', 'index.html']) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    assert.doesNotMatch(html, /WorkExperience/, `${relPath} must not emit the invalid "WorkExperience" type`);
  }
});

test('experience pages emit valid, well-formed JSON-LD with OrganizationRole nested under a single Person', () => {
  for (const relPath of ['experience/index.html', 'en/experience/index.html', 'ro/experience/index.html']) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    const blocks = parseJsonLdBlocks(html);
    assert.ok(blocks.length > 0, `${relPath} must emit at least one JSON-LD block`);

    const allTypes = blocks.flatMap(block => collectJsonLdTypes(block));
    const personCount = allTypes.filter(t => t === 'Person').length;
    assert.equal(personCount, 1, `${relPath} must expose exactly one Person identity, not a duplicate/contradictory one`);
    assert.ok(allTypes.includes('OrganizationRole'), `${relPath} must expose the valid OrganizationRole type`);

    const personBlock = blocks.flatMap(b => Array.isArray(b) ? b : [b]).find(n => n && n['@type'] === 'Person');
    assert.ok(Array.isArray(personBlock.worksFor) && personBlock.worksFor.length > 0, `${relPath} Person.worksFor must carry the role history`);
    for (const role of personBlock.worksFor) {
      assert.equal(role['@type'], 'OrganizationRole');
      assert.ok(role.roleName, 'each role must carry roleName');
      assert.ok(role.startDate, 'each role must carry startDate');
      assert.equal(role.worksFor?.['@type'], 'Organization');
      assert.ok(role.worksFor.name, 'each role must name its employer');
    }
  }
});

test('every JSON-LD @type used site-wide belongs to the approved Schema.org allowlist', () => {
  const ALLOWLIST = new Set([
    'Person', 'WebSite', 'BreadcrumbList', 'ListItem', 'BlogPosting',
    'Organization', 'OrganizationRole', 'PostalAddress',
    'EducationalOrganization', 'EducationalOccupationalCredential', 'ImageObject',
  ]);
  for (const relPath of [
    'index.html', 'en/index.html', 'ro/index.html',
    'experience/index.html', 'en/experience/index.html', 'ro/experience/index.html',
    'certifications/index.html', 'en/certifications/index.html', 'ro/certifications/index.html',
  ]) {
    const html = readFileSync(path.join(DIST, relPath), 'utf8');
    const blocks = parseJsonLdBlocks(html);
    const types = blocks.flatMap(block => collectJsonLdTypes(block));
    for (const type of types) {
      assert.ok(ALLOWLIST.has(type), `${relPath} uses an unapproved JSON-LD @type: ${type}`);
    }
  }
});
