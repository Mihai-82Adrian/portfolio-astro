#!/usr/bin/env node
// Distinct from `verify:advisory-scanner` (tests/github-advisory-scan.test.mjs), which proves the
// scanner's batching/pagination/fail-closed *logic* against mocked fetches and never touches the
// network. This script performs the actual fresh, online, exact-lockfile GitHub Advisory Database
// query the formal release gate requires (Section 7.4/16) — a live HTTP failure here is a gate
// failure, not a fallback to the committed config/dependency-advisories.json snapshot.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildInventory, sha256 } from '../security/lockfile-inventory.mjs';
import { ADVISORY_TYPES, AdvisoryScanError, scanAdvisories, writeRawEvidence } from '../security/github-advisory-scan.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUTPUT = path.join(ROOT, '.artifacts/release-candidate/live-advisories');

export async function runLiveAdvisoryGate({ root = ROOT, outputDir = OUTPUT, approvedRisk = [], fetchImpl = fetch } = {}) {
  const lockfileContent = readFileSync(path.join(root, 'package-lock.json'), 'utf8');
  const inventory = buildInventory(lockfileContent);

  let scan;
  try {
    scan = await scanAdvisories({ entries: inventory.entries, types: ADVISORY_TYPES, fetchImpl });
  } catch (error) {
    if (error instanceof AdvisoryScanError) {
      throw new Error(`Live advisory gate failed closed: ${error.code} — ${error.message}`);
    }
    throw error;
  }
  scan.lockfileSha256 = inventory.lockfileSha256;

  const approvedIds = new Set(approvedRisk.map((entry) => entry.advisoryId));
  const unresolved = scan.aggregate.ghsaIds.filter((id) => !approvedIds.has(id));

  mkdirSync(outputDir, { recursive: true });
  writeRawEvidence(outputDir, scan.results);
  const summary = {
    schemaVersion: 1,
    observedAt: scan.observedAt,
    lockfileSha256: scan.lockfileSha256,
    packageVersionCount: inventory.entries.length,
    perType: Object.fromEntries(ADVISORY_TYPES.map((type) => [type, scan.results[type].totalResultCount])),
    applicableGhsaIds: scan.aggregate.ghsaIds,
    approvedRiskGhsaIds: [...approvedIds],
    unresolvedGhsaIds: unresolved,
    result: unresolved.length === 0 ? 'PASS' : 'FAIL',
  };
  writeFileSync(path.join(outputDir, 'live-advisory-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  if (unresolved.length > 0) {
    throw new Error(
      `Live advisory gate failed: ${unresolved.length} unresolved applicable GHSA record(s) against the current lockfile: ${unresolved.join(', ')}. ` +
        'Remediate or record an explicit owner risk decision before the formal gate.',
    );
  }
  console.log(
    `Live advisory gate PASS: 0 unresolved applicable advisories across ${ADVISORY_TYPES.join(', ')} for lockfile ${scan.lockfileSha256} (${inventory.entries.length} packages, observed ${scan.observedAt}).`,
  );
  return summary;
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  runLiveAdvisoryGate().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
