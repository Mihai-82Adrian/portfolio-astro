import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

const REQUIRED_HEADINGS = [
  'Mission',
  'Product identity',
  'Instruction precedence',
  'Authoritative sources',
  'Architecture invariants',
  'Truth and claims policy',
  'Financial correctness policy',
  'AI and provider policy',
  'Privacy and external-service policy',
  'Security and abuse-control policy',
  'Git, worktree, and branch discipline',
  'Remote and production mutation policy',
  'Implementation workflow',
  'Proportional validation matrix',
  'Documentation synchronization',
  'Living documentation evolution',
  'Definition of done',
  'Prohibited shortcuts',
  'Living-document index',
];

const PHASE_2A_OPERATIONS = [
  'docs/operations/living-documentation-lifecycle.md',
  'docs/operations/dependency-hygiene.md',
  'docs/operations/public-release-lineage-strategy.md',
  'docs/operations/release-identity-provenance.md',
  'docs/operations/secret-rotation-runbook.md',
];
const OPERATIONAL_CONTROLS = 'docs/operations/operational-controls-observability.md';
const PHASE_2C_OPERATIONS = [
  'docs/operations/csp-reporting.md',
  'docs/operations/release-pipeline.md',
  'docs/operations/rollback-postdeploy.md',
];

function markdownLinks(markdown) {
  return [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
}

function assertLocalLinksResolve(file, markdown) {
  for (const link of markdownLinks(markdown)) {
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    const target = link.split('#')[0];
    assert.ok(
      existsSync(path.resolve(ROOT, path.dirname(file), target)),
      `${file} contains an unresolved local link: ${link}`,
    );
  }
}

test('AGENTS.md is a provider-neutral constitution with stable governance contracts', () => {
  assert.ok(existsSync(path.join(ROOT, 'AGENTS.md')), 'root AGENTS.md must exist');
  const agents = read('AGENTS.md');

  for (const heading of REQUIRED_HEADINGS) {
    assert.match(agents, new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  }
  assertLocalLinksResolve('AGENTS.md', agents);
  assert.doesNotMatch(agents, /\/home\//);
  assert.doesNotMatch(agents, /\bsession[-_ ]?(id|[0-9a-f]{8,})\b/i);
  assert.doesNotMatch(agents, /\b(?:sk|re)_[A-Za-z0-9_-]{12,}\b/);
  assert.match(agents, /without (?:precise|explicit) user authorization[\s\S]{0,500}\bpush\b/i);
  assert.match(agents, /repository state[\s\S]{0,200}preview state[\s\S]{0,200}production state/i);
  assert.match(agents, /deterministic[\s\S]{0,200}AI-(?:generated|assisted)/i);
  assert.match(agents, /primary official sources/i);
  assert.match(agents, /\|\s*Change type\s*\|\s*Minimum validation\s*\|/);
});

test('CLAUDE.md is exactly the minimal compatibility shim', () => {
  assert.equal(
    read('CLAUDE.md'),
    '@AGENTS.md\n\nRead and follow `AGENTS.md` as the authoritative project governance for all work in this repository.\n',
  );
});

test('Phase 2A operations records and living-documentation controls are permanent', () => {
  for (const file of PHASE_2A_OPERATIONS) {
    assert.ok(existsSync(path.join(ROOT, file)), `${file} must exist`);
    assertLocalLinksResolve(file, read(file));
  }

  const agents = read('AGENTS.md');
  const lifecycle = read('docs/operations/living-documentation-lifecycle.md');
  assert.match(agents, /\[[^\]]*living-documentation[^\]]*\]\(docs\/operations\/living-documentation-lifecycle\.md\)/);
  assert.match(agents, /session-close/i);
  assert.match(agents, /(?:updated|changed)[\s\S]{0,80}no-change/i);
  assert.match(agents, /must not[\s\S]{0,180}(?:permission|authorization)/i);
  assert.match(lifecycle, /session-close protocol/i);
  assert.match(lifecycle, /constitutional stability/i);
  assert.match(lifecycle, /timestamp[\s\S]{0,120}(?:hash|commit)/i);
  assert.match(lifecycle, /changed[\s\S]{0,120}no-change/i);
});

test('ROADMAP.md uses the allowed lifecycle and preserves deferred capabilities', () => {
  const roadmap = read('docs/ROADMAP.md');
  const allowed = new Set(['DONE', 'ACTIVE', 'NEXT', 'PLANNED', 'TRIGGER-BASED', 'OPTIONAL', 'REJECTED']);
  const statuses = [...roadmap.matchAll(/^Status:\s+`([^`]+)`$/gm)].map((match) => match[1]);

  const topLevelStatuses = [...roadmap.matchAll(/^## Phase[^\n]*\n\nStatus:\s+`([^`]+)`/gm)].map((match) => match[1]);

  assert.ok(statuses.length >= 10, 'roadmap must assign statuses to phases and major decisions');
  for (const status of statuses) assert.ok(allowed.has(status), `unsupported roadmap status: ${status}`);
  assert.equal(topLevelStatuses.filter((status) => status === 'ACTIVE').length, 1, 'Phase 2 and its Phase 2D subphase are closed; exactly one top-level phase is active (its active sub-phase chain does not count against this)');
  assert.equal(statuses.filter((status) => status === 'NEXT').length, 1, 'final roadmap must have one NEXT phase');
  assert.match(roadmap, /## Phase 2 — Operational Release Candidate\s+Status: `DONE`/);
  assert.match(roadmap, /### Phase 2A — Release Identity, Provenance & Dependency Closure\s+Status: `DONE`/);
  assert.match(roadmap, /### Phase 2B — Operational Controls & Observability\s+Status: `DONE`/);
  assert.match(roadmap, /### Phase 2C — CSP, Pipeline & Unified Release Gate\s+Status: `DONE`/);
  assert.match(roadmap, /### Phase 2D — Astro 7 Foundation and Product Completion\s+Status: `DONE`/);
  assert.match(roadmap, /#### Phase 2D-A — Astro 7 Foundation Migration\s+Status: `DONE`/);
  assert.match(roadmap, /#### Phase 2D-B — Product Scope Audit and Launch Lock\s+Status: `DONE`/);
  assert.match(roadmap, /#### Phase 2D-C — Product Completion\s+Status: `DONE`/);
  assert.match(roadmap, /##### Wave 1 — Public Truth, Route Integrity and Launch Safety\s+Status: `DONE`/);
  assert.match(roadmap, /##### Wave 2 — Fin-Tools Professional Completion\s+Status: `DONE`/);
  assert.match(roadmap, /##### Wave 3 — AI Reliability and Recruiter Experience\s+Status: `DONE`/);
  assert.match(roadmap, /##### Wave 4 — Homepage, Positioning and Service Funnel\s+Status: `DONE`/);
  assert.match(roadmap, /##### Wave 5 — Content, SEO, Localization and Proof\s+Status: `DONE`/);
  assert.match(roadmap, /##### Wave 6 — Product Acceptance and Security Handoff\s+Status: `DONE`/);
  assert.match(roadmap, /#### Phase 2D-D — Product and Dependency Security Acceptance\s+Status: `DONE`/);
  assert.match(roadmap, /## Phase 3 — Human and Remote Readiness\s+Status: `ACTIVE`/);
  assert.match(roadmap, /### Phase 3-A — Remote Inventory\s+Status: `DONE`/);
  assert.match(roadmap, /### Phase 3-B — Remote Controls and Preview Readiness\s+Status: `DONE`/);
  assert.match(roadmap, /#### Phase 3-B1 — Public-Safe Preview and Deployment Control\s+Status: `DONE`/);
  assert.match(roadmap, /#### Phase 3-B2 — Repository Security Baseline\s+Status: `DONE`/);
  assert.match(roadmap, /#### Phase 3-B3 — Security Findings Closure and Operational Monitoring\s+Status: `DONE`/);
  // OWNER-AUTHORIZED GOVERNANCE TEST SYNCHRONIZATION (Phase 3-C Step 3E-A): Phase 3-C's remaining
  // human/provider/security gates closed read-only (STEP3E-PREFLIGHT-GO); this synchronizes the
  // snapshot assertion with that legitimate, owner-authorized roadmap status change.
  assert.match(roadmap, /### Phase 3-C — Human and Provider Release Readiness\s+Status: `DONE`/);
  assert.match(roadmap, /REMOTE-READINESS-CONDITIONAL/);
  assert.match(roadmap, /Cloudflare[\s\S]{0,120}Git integration[\s\S]{0,200}automatically/i);
  assert.match(roadmap, /Phase 2B[\s\S]*structured logs[\s\S]*strict log allowlist[\s\S]*kill switches[\s\S]*SLOs[\s\S]*failure taxonomy/i);
  assert.match(roadmap, /Phase 2C[\s\S]*CSP Report-Only[\s\S]*minimized report[\s\S]*SHA-pinned[\s\S]*concurrency[\s\S]*single deploy owner[\s\S]*rollback[\s\S]*cross-environment reproducibility[\s\S]*verify:release-candidate/i);

  for (const capability of [
    'Turnstile',
    'signed upload',
    'malware',
    'HMAC-peppered',
    'distributed quotas',
    '/api/v1',
    'admin portal',
    'client portal',
    'provider abstraction',
    'Astro 7',
    'Workers Static Assets',
  ]) {
    assert.match(roadmap, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(roadmap, /Phase 6[\s\S]{0,200}Status:\s+`TRIGGER-BASED`/);
  assert.match(roadmap, /Astro 7\.1\.3[\s\S]{0,300}(?:migrat)/i);
  assert.match(roadmap, /Workers Static Assets[\s\S]{0,100}proof of concept/i);
  assert.match(roadmap, /remote mutation required:\*{0,2}\s+\*{0,2}yes/i);
  assert.doesNotMatch(roadmap, /Sample Review.{0,80}\b(?:active|implemented)\b/i);
});

test('Phase 2C living documents preserve local-only CSP and release truth', () => {
  for (const file of PHASE_2C_OPERATIONS) {
    assert.ok(existsSync(path.join(ROOT, file)), `${file} must exist`);
    assertLocalLinksResolve(file, read(file));
  }
  const csp = read(PHASE_2C_OPERATIONS[0]);
  const pipeline = read(PHASE_2C_OPERATIONS[1]);
  const rollback = read(PHASE_2C_OPERATIONS[2]);
  assert.match(csp, /Content-Security-Policy-Report-Only/);
  assert.match(csp, /does not enforce CSP/i);
  assert.doesNotMatch(csp, /https:\/\/example\.com\/.*(?:query|token)/i);
  assert.match(pipeline, /Node `22\.22\.3`[\s\S]{0,80}npm `11\.16\.0`/);
  assert.match(pipeline, /does not prove or change[\s\S]{0,100}remote state/i);
  assert.match(pipeline, /build dependency SBOM/i);
  assert.match(rollback, /GET and HEAD/);
  assert.match(rollback, /never runs Git[\s\S]{0,100}Cloudflare/i);
  assert.match(read('config/release-policy.json'), /"sampleReview": "disabled"/);
  assert.doesNotMatch(read('README.md'), /CSP enforcement (?:is|has been) (?:active|enabled)/i);
  assert.doesNotMatch(read('docs/ARCHITECTURE.md'), /remote log retention (?:is|has been) verified/i);
});

test('ARCHITECTURE.md matches provider constants and states trust limitations', () => {
  const architecture = read('docs/ARCHITECTURE.md');
  const mappings = [
    ['chat.ts', 'functions/api/chat.ts'],
    ['compass.ts', 'functions/api/compass.ts'],
    ['cashflow-scenario.ts', 'functions/api/cashflow-scenario.ts'],
    ['investment-analysis.ts', 'functions/api/investment-analysis.ts'],
  ];

  for (const [label, sourceFile] of mappings) {
    const model = read(sourceFile).match(/_MODEL\s*=\s*'([^']+)'/)[1];
    assert.match(architecture, new RegExp(`\\|\\s*\\\`${label}\\\`\\s*\\|\\s*\\\`${model.replace('.', '\\.')}\\\``));
  }
  assert.match(architecture, /Responses API/);
  assert.doesNotMatch(architecture, /Chat Completions/);
  assert.match(architecture, /deterministic[\s\S]{0,240}AI-(?:generated|assisted)/i);
  assert.match(architecture, /Resend[\s\S]{0,120}inactive/i);
  assert.match(architecture, /Cache API[\s\S]{0,180}(?:colo|globally exact)/i);
  assertLocalLinksResolve('docs/ARCHITECTURE.md', architecture);
});

test('Phase 2B living documents preserve local-only observability, privacy, and build-SBOM truth', () => {
  assert.ok(existsSync(path.join(ROOT, OPERATIONAL_CONTROLS)));
  const operational = read(OPERATIONAL_CONTROLS);
  const readme = read('README.md');
  const architecture = read('docs/ARCHITECTURE.md');
  const functions = read('docs/operations/pages-functions-contracts.md');
  const provenance = read('docs/operations/release-identity-provenance.md');
  const dependencies = read('docs/operations/dependency-hygiene.md');

  for (const document of [readme, architecture]) {
    assert.match(document, /operational-controls-observability\.md/);
  }
  assert.match(operational, /does not activate remote logging/i);
  assert.match(operational, /do not imply preview or production values exist/i);
  assert.match(operational, /not production baselines/i);
  assert.doesNotMatch(operational, /measured production SLO/i);
  assert.match(operational, /User content is not “sanitized for logs”; it is not logged\./);
  for (const prohibited of ['prompts', 'email addresses', 'IP addresses', 'authorization', 'provider response IDs', 'stack traces']) {
    assert.match(operational, new RegExp(prohibited, 'i'));
  }
  assert.match(functions, /not added\s+to public envelopes/i);
  assert.doesNotMatch(functions, /public envelopes?[^.\n]*(?:providerOutcome|quota subject|feature state)/i);
  assert.match(provenance, /build dependency SBOM/i);
  assert.match(provenance, /not a precise\s+deployed-runtime SBOM/i);

  const advisories = [...dependencies.matchAll(/GHSA-[a-z0-9-]+/g)].map((match) => match[0]);
  assert.ok(new Set(advisories).size >= 5);
  assert.match(dependencies, /no CVE assigned/i);
  assert.match(dependencies, /CVE-2026-59729/);
  assert.match(dependencies, /CVE-2026-59727/);
});

test('raw Fable-5 audits are absent and only the sanitized public summary remains', () => {
  const auditDir = path.join(ROOT, 'docs/audits');
  const files = existsSync(auditDir) ? readdirSync(auditDir, { recursive: true, withFileTypes: true }) : [];
  const markdown = files
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.relative(auditDir, path.join(entry.parentPath, entry.name)));
  assert.deepEqual(markdown, ['portfolio-hardening-summary-2026.md']);
});

test('canonical public documents contain no volatile or absolute internal claims', () => {
  const docs = readdirSync(path.join(ROOT, 'docs'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.relative(ROOT, path.join(entry.parentPath, entry.name)));
  for (const file of ['AGENTS.md', 'README.md', ...docs]) {
    const markdown = read(file);
    assert.doesNotMatch(markdown, /\/home\//, `${file} must not contain a machine path`);
    assert.doesNotMatch(
      markdown,
      /fully secure|fully compliant|production ready|zero hallucination|zero retention/i,
      `${file} contains an unsupported absolute claim`,
    );
  }
  for (const file of ['AGENTS.md', 'README.md', 'docs/ARCHITECTURE.md', 'docs/ROADMAP.md']) {
    assert.doesNotMatch(read(file), /\b[0-9a-f]{40}\b/i, `${file} must not contain a commit hash`);
  }
});

test('generated release evidence is ignored and never tracked', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
  assert.ok(!tracked.some((file) => file.startsWith('.artifacts/')));
  assert.ok(!tracked.some((file) => /(?:release-manifest|sbom\.cdx|artifact-tree\.sha256)$/.test(file)));
  assert.ok(!tracked.some((file) => /\.log$/i.test(file)), 'generated log files must not be tracked');
});
