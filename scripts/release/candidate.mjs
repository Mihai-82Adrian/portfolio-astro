#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runLocalSmoke } from './local-smoke.mjs';
import { proveDryRun, resolveSyntheticPublicParent } from './public-lineage.mjs';
import { verifyReproducibility } from './reproducibility.mjs';
import { assertCleanRepository } from './provenance.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUTPUT = path.join(ROOT, '.artifacts/release-candidate');
const JSON_SUMMARY = path.join(OUTPUT, 'summary.json');
const MARKDOWN_SUMMARY = path.join(OUTPUT, 'summary.md');

function readAdvisoryFreshness() {
  const register = JSON.parse(readFileSync(path.join(ROOT, 'config/dependency-advisories.json'), 'utf8'));
  return `Observed ${register.observedDate} (${register.advisoryRecordCounts.total} open advisory record(s)). ${register.freshnessBoundary}`;
}

export const phases = [
  ['Governance and living documentation', ['verify:governance', 'verify:repo-truth']],
  ['Toolchain and dependency evidence', ['verify:toolchain', 'verify:dependency-tree', 'verify:advisory-register', 'verify:advisory-scanner']],
  ['Workflow and release policy', ['verify:workflows', 'verify:release-policy', 'verify:public-release-lineage']],
  ['Release and operational foundations', ['verify:release-provenance', 'verify:operational-controls']],
  ['CSP and privacy boundaries', ['verify:csp', 'verify:privacy']],
  ['Function, provider, and security contracts', ['verify:function-contracts', 'verify:ai-provider-contracts', 'verify:ai-reliability', 'verify:release-orchestrator', 'verify:reportview-security']],
  ['Financial and XML contracts', ['verify:finance', 'verify:fintools-persistence', 'verify:pap', 'verify:xrechnung:fixtures', 'verify:xrechnung:kosit:tooling']],
  ['Product quality', ['lint:chat', 'verify:content:strict', 'lint:design-system:strict', 'check', 'build', 'verify:wave1-launch-truth:built', 'verify:pagefind-a11y', 'verify:final-product-acceptance', 'verify:markdown-processor:built', 'verify:katex-assets:built', 'verify:pdf-exports', 'lint:a11y:strict', 'check:contrast', 'check:corpus:strict']],
  ['Full KoSIT validation', ['kosit:preflight', 'verify:xrechnung:kosit']],
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function runScript(name) {
  console.log(`\n  → npm run ${name}`);
  execFileSync('npm', ['run', name], { cwd: ROOT, stdio: 'inherit', env: process.env });
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function writeSummary(summary) {
  mkdirSync(OUTPUT, { recursive: true });
  writeFileSync(JSON_SUMMARY, `${JSON.stringify(summary, null, 2)}\n`);
  const rows = summary.phases.map((phase) => `| ${phase.name} | ${phase.result} |`).join('\n');
  writeFileSync(MARKDOWN_SUMMARY, [
    '# Local release-candidate summary',
    '',
    `- Result: **${summary.result}**`,
    `- Source revision: \`${summary.sourceRevision}\``,
    `- Release ID: \`${summary.releaseId ?? 'unavailable'}\``,
    `- Artifact digest: \`${summary.artifactDigest ?? 'unavailable'}\``,
    `- Build dependency SBOM digest: \`${summary.sbomDigest ?? 'unavailable'}\``,
    `- Advisory boundary: ${summary.advisoryFreshness}`,
    '',
    '| Phase | Result |',
    '| --- | --- |',
    rows,
    '',
  ].join('\n'));
}

async function main() {
  const startedAt = new Date().toISOString();
  const summary = {
    schemaVersion: 1,
    result: 'FAIL',
    startedAt,
    endedAt: null,
    sourceRevision: git(['rev-parse', 'HEAD']),
    releaseId: null,
    toolchain: { node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim() },
    artifactDigest: null,
    sbomDigest: null,
    cspPolicyDigest: sha256(readFileSync(path.join(ROOT, 'public/_headers'), 'utf8').match(/Content-Security-Policy-Report-Only: (.+)/)?.[1] ?? ''),
    workflowPins: 'PENDING',
    releasePolicy: 'PENDING',
    dependencies: 'PENDING',
    operations: 'PENDING',
    domains: 'PENDING',
    kosit: 'PENDING',
    firefox: 'PENDING',
    localWrangler: 'PENDING',
    reproducibility: 'PENDING',
    advisoryFreshness: readAdvisoryFreshness(),
    phases: [],
  };
  try {
    assertCleanRepository(ROOT);
    if (!process.env.FIREFOX_BINARY || !existsSync(process.env.FIREFOX_BINARY)) {
      throw new Error('FIREFOX_BINARY must identify the checksum-pinned release runtime.');
    }
    for (const [name, scripts] of phases) {
      console.log(`\n=== ${name} ===`);
      for (const script of scripts) runScript(script);
      summary.phases.push({ name, result: 'PASS' });
    }
    summary.workflowPins = 'PASS';
    summary.releasePolicy = 'PASS';
    summary.dependencies = 'PASS';
    summary.operations = 'PASS';
    summary.domains = 'PASS';
    summary.kosit = 'PASS';

    console.log('\n=== Cross-environment reproducibility ===');
    const reproducibility = await verifyReproducibility();
    summary.phases.push({ name: 'Cross-environment reproducibility', result: 'PASS' });
    summary.reproducibility = reproducibility.result;

    console.log('\n=== Public release synthetic dry-run ===');
    // This is a synthetic, disposable proof of the release-commit mechanism, not a real release
    // action (see docs/operations/public-release-lineage-strategy.md). A fresh CI checkout has no
    // local refs/heads/master at all, so the parent cannot be hardcoded to either ref name; resolve
    // dynamically instead of relying on public-lineage.mjs's auto-resolution, which now fails closed
    // whenever local refs/heads/master and refs/remotes/origin/master disagree (a real case in this
    // repository's own multi-worktree dev topology).
    const syntheticPublicParent = resolveSyntheticPublicParent(ROOT);
    const lineage = await proveDryRun(ROOT, path.join(ROOT, '.artifacts/release'), { publicParent: syntheticPublicParent });
    summary.phases.push({ name: 'Public release synthetic dry-run', result: 'PASS' });

    console.log('\n=== Local Wrangler, postdeploy, and Firefox release matrix ===');
    const local = await runLocalSmoke();
    summary.phases.push({ name: 'Local Wrangler, postdeploy, and Firefox release matrix', result: 'PASS' });
    summary.localWrangler = local.result;
    summary.firefox = local.firefox.result;

    const manifest = JSON.parse(readFileSync(path.join(ROOT, '.artifacts/release/release-manifest.json'), 'utf8'));
    summary.releaseId = manifest.releaseIdentity.releaseId;
    summary.artifactDigest = manifest.checksums.artifactTree;
    summary.sbomDigest = manifest.checksums.sbom;
    summary.publicLineage = {
      canonicalTree: lineage.canonicalTree,
      publicParent: lineage.publicParent,
      syntheticReleaseCommit: lineage.releaseCommit,
    };
    summary.result = 'PASS';
  } catch (error) {
    summary.failure = error.message;
    throw error;
  } finally {
    summary.endedAt = new Date().toISOString();
    writeSummary(summary);
    console.log(`\nRelease-candidate summary: ${path.relative(ROOT, JSON_SUMMARY)}`);
    console.log(`FINAL RESULT: ${summary.result}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
