#!/usr/bin/env node
// Deterministic change-impact classifier for Quality Checks (Phase 5-D2-B proportional-validation
// closure). AGENTS.md's proportional validation matrix already distinguishes documentation, local
// UI, function/API, provider, finance, XRechnung/XML, privacy, and release/security/infrastructure
// changes -- but every PR was routed through the full production-oriented verify:release-candidate
// regardless of blast radius, so an unrelated release-control-plane fix could be blocked by an
// unrelated KoSIT-tooling flake. This module maps changed tracked paths to exactly the AGENTS.md
// matrix rows, reusing existing npm scripts only -- no new validation logic is introduced. Any path
// that matches no rule fails closed to the full gate: unknown must never mean skip.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

// One rule per AGENTS.md proportional-validation-matrix row. `scripts` are exact package.json
// script names, run via `npm run <script>` -- reused verbatim, nothing new.
export const RULES = [
  {
    group: 'documentation',
    description: 'README/docs prose',
    test: (f) => /^(README\.md|docs\/.+\.md)$/.test(f),
    scripts: ['verify:governance', 'verify:repo-truth'],
  },
  {
    group: 'repository-governance',
    description: 'governance constitution and non-runtime repository policy',
    test: (f) => /^(AGENTS\.md|CLAUDE\.md|\.github\/dependabot\.yml|config\/release-policy\.json)$/.test(f),
    scripts: ['verify:governance', 'verify:repo-truth'],
  },
  {
    group: 'release-control-plane',
    description: 'CI/release tooling, workflows, and their permanent tests',
    test: (f) => /^(\.github\/workflows\/.+\.ya?ml|scripts\/release\/.+|scripts\/ci\/.+|tests\/release-.+\.test\.mjs|tests\/change-impact\.test\.mjs|tests\/governance\.test\.mjs|tests\/repo-truth\.test\.mjs)$/.test(f),
    scripts: ['verify:workflows', 'verify:release-policy', 'verify:public-release-lineage', 'verify:release-diff-hygiene', 'verify:governance', 'verify:repo-truth', 'check'],
  },
  {
    group: 'dependency-security',
    description: 'dependency graph and lockfile',
    test: (f) => /^package(-lock)?\.json$/.test(f),
    scripts: ['verify:toolchain', 'verify:dependency-tree', 'verify:advisory-register', 'verify:advisory-scanner', 'verify:live-advisories'],
  },
  {
    group: 'finance',
    description: 'deterministic finance engines',
    test: (f) => /^(src\/lib\/(fin-core|cashflow|investment)\/|tests\/financial\/)/.test(f),
    scripts: ['verify:finance', 'verify:fintools-persistence', 'verify:pap'],
  },
  {
    group: 'xrechnung',
    description: 'XRechnung/XML implementation and KoSIT tooling',
    test: (f) => /^(src\/lib\/xrechnung\/|src\/components\/tools\/xrechnung\/|functions\/api\/xrechnung|scripts\/(verify-xrechnung|kosit-)|tests\/(xrechnung|kosit)[-.].+\.test\.mjs)/.test(f),
    scripts: ['verify:xrechnung:fixtures', 'verify:xrechnung:kosit:tooling', 'kosit:preflight', 'verify:xrechnung:kosit'],
  },
  {
    group: 'ai-provider',
    description: 'OpenAI-backed Function endpoints and provider transport',
    test: (f) => /^functions\/(api\/(chat|compass|cashflow-scenario|investment-analysis)\.ts|_lib\/.*(responses|provider|openai).*)/.test(f),
    scripts: ['verify:ai-provider-contracts', 'verify:ai-reliability', 'verify:function-contracts'],
  },
  {
    group: 'functions',
    description: 'other Pages Functions',
    test: (f) => /^functions\//.test(f),
    scripts: ['verify:function-contracts', 'verify:release-orchestrator', 'verify:reportview-security'],
  },
  {
    group: 'privacy',
    description: 'consent boundary and CSP',
    test: (f) => /^src\/lib\/consent\// .test(f) || f === 'public/_headers',
    scripts: ['verify:csp', 'verify:privacy'],
  },
  {
    group: 'runtime-ui',
    description: 'pages, components, content, styles, and other product source',
    test: (f) => /^(src\/pages\/|src\/components\/|src\/data\/|src\/content\/|src\/styles\/|src\/lib\/(?!fin-core\/|cashflow\/|investment\/|xrechnung\/|consent\/))/.test(f),
    scripts: ['check', 'build', 'verify:wave1-launch-truth:built', 'verify:pagefind-a11y', 'verify:final-product-acceptance', 'verify:markdown-processor:built', 'verify:katex-assets:built', 'verify:pdf-exports', 'verify:reportview-security', 'lint:a11y:strict', 'check:contrast', 'verify:compiled-runtime-vars', 'verify:focus-visible-regression', 'lint:design-system:strict', 'verify:content:strict', 'lint:chat'],
  },
];

// Pure, deterministic, unit-testable: no filesystem/git access. `files` is a flat list of
// repository-relative tracked paths (typically from `git diff --name-only`).
export function classifyChangedFiles(files) {
  const matchedGroups = new Set();
  const unclassified = [];
  for (const file of files) {
    const matches = RULES.filter((rule) => rule.test(file));
    if (matches.length === 0) {
      unclassified.push(file);
    } else {
      for (const rule of matches) matchedGroups.add(rule.group);
    }
  }
  if (unclassified.length > 0) {
    return {
      fullGate: true,
      reason: `unclassified path(s), fail-closed: ${unclassified.join(', ')}`,
      groups: [...matchedGroups],
      scripts: [],
      skippedGroups: [],
    };
  }
  const scripts = [...new Set(
    [...matchedGroups].flatMap((group) => RULES.find((rule) => rule.group === group).scripts),
  )];
  const skippedGroups = RULES.map((rule) => rule.group).filter((group) => !matchedGroups.has(group));
  return { fullGate: false, reason: null, groups: [...matchedGroups], scripts, skippedGroups };
}

// A real production/release candidate must always receive complete qualification regardless of a
// superficially small diff (AGENTS.md's release/security/infrastructure row, and the repository's
// own "production still requires the full gate" invariant) -- this is a workflow-trigger decision,
// not a file-content decision, so it is evaluated independently of classifyChangedFiles().
export function shouldForceFullGate({ eventName, ref }) {
  if (eventName === 'workflow_dispatch') return true;
  if (eventName === 'push' && typeof ref === 'string' && ref.startsWith('refs/heads/release/')) return true;
  return false;
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function runNpmScript(script) {
  console.log(`\n  -> npm run ${script}`);
  execFileSync('npm', ['run', script], { cwd: ROOT, stdio: 'inherit' });
}

function main() {
  const forceFull = shouldForceFullGate({
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
  });
  if (forceFull) {
    console.log(`Quality gate mode: FULL (release/production context or manual dispatch: event=${process.env.GITHUB_EVENT_NAME ?? 'local'}, ref=${process.env.GITHUB_REF ?? 'n/a'}).`);
    execFileSync('npm', ['run', 'verify:release-candidate'], { cwd: ROOT, stdio: 'inherit' });
    return;
  }

  const base = process.env.RELEASE_DIFF_BASE?.trim();
  if (!base) {
    throw new Error(
      'RELEASE_DIFF_BASE must be set for a proportional (non-release-context) Quality Checks run. ' +
      'See .github/workflows/quality-gates.yml.',
    );
  }
  const files = git(['diff', '--name-only', base, 'HEAD']).split('\n').filter(Boolean);
  console.log(`Changed files (${files.length}), base ${base}:`);
  for (const file of files) console.log(`  - ${file}`);

  const result = classifyChangedFiles(files);
  if (result.fullGate) {
    console.log(`\nQuality gate mode: FULL (fail-closed) -- ${result.reason}`);
    execFileSync('npm', ['run', 'verify:release-candidate'], { cwd: ROOT, stdio: 'inherit' });
    return;
  }

  console.log(`\nChanged surfaces: ${result.groups.join(', ') || '(none)'}`);
  console.log(`Required validation: ${result.scripts.join(', ') || '(none)'}`);
  console.log(`Not applicable: ${result.skippedGroups.join(', ') || '(none)'}`);
  for (const script of result.scripts) runNpmScript(script);
  console.log('\nProportional Quality Checks: PASS');
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
