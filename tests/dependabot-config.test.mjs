// Phase 3-B2 (Workstream C §6.1): repository security baseline — Dependabot configuration.
// Phase 3-C Step 1B froze routine version-update PRs at open-pull-requests-limit: 0 for the
// duration of Phase 3-C/Phase 4; Phase 5-D2-B lifted that freeze once Phase 4's controlled
// production release completed, restoring the pre-freeze limits (see
// docs/operations/dependency-hygiene.md). The routine-update limit is therefore a legitimate,
// intentionally variable policy value (frozen vs. thawed) — this file asserts the structural
// shape of the config instead of hard-coding either state as permanent. The redundant
// target-branch: master key (the repository's actual default branch) stays removed regardless of
// freeze state. Dependabot vulnerability alerts and security-update PRs are a separate,
// repository-level GitHub feature, not configured by this file, and are intentionally not
// asserted here.
// Checked with plain string/regex assertions against the YAML source, matching the convention
// scripts/release/guards.mjs already uses for workflow YAML — no new YAML-parsing dependency.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const source = readFileSync(path.join(ROOT, '.github/dependabot.yml'), 'utf8');

test('dependabot.yml declares version 2 with exactly one npm and one github-actions ecosystem entry', () => {
  assert.match(source, /^version: 2$/m);
  const npmMatches = source.match(/package-ecosystem: npm/g) ?? [];
  const actionsMatches = source.match(/package-ecosystem: github-actions/g) ?? [];
  assert.equal(npmMatches.length, 1, 'expected exactly one npm ecosystem entry');
  assert.equal(actionsMatches.length, 1, 'expected exactly one github-actions ecosystem entry');
});

test('every update entry is weekly, roots at /, and declares a well-formed non-negative routine-PR limit', () => {
  const entries = source.split(/^  - package-ecosystem:/m).slice(1);
  assert.equal(entries.length, 2, 'expected exactly two update entries (npm, github-actions)');
  for (const entry of entries) {
    assert.match(entry, /^\s*directory: \/$/m, 'must root at the repository root');
    assert.match(entry, /interval: weekly/, 'schedule must be weekly');
    assert.doesNotMatch(entry, /target-branch:/, 'target-branch is redundant while master is the actual default branch and must stay removed regardless of freeze state');
    // The routine-update limit is a legitimate, intentionally variable policy value (frozen at 0
    // during Phase 3-C/Phase 4, restored to its pre-freeze value once Phase 4 completed) — assert
    // it is present exactly once as a well-formed non-negative integer, not a specific number.
    const limitMatches = entry.match(/^\s*open-pull-requests-limit: (\d+)\s*$/m);
    assert.ok(limitMatches, 'open-pull-requests-limit must be present as a plain non-negative integer');
    assert.ok(Number(limitMatches[1]) >= 0, 'open-pull-requests-limit must not be negative');
    assert.match(entry, /- dependencies/);
    assert.match(entry, /- security/);
    assert.doesNotMatch(entry, /^\s*ignore:/m, 'no ignore rule may be introduced regardless of freeze state');
  }
});

test('no auto-merge mechanism is configured anywhere in dependabot.yml', () => {
  assert.doesNotMatch(source, /auto-merge/i);
});

test('npm groups keep framework/runtime and security-sensitive packages in separate, non-empty groups', () => {
  const npmSection = source.slice(source.indexOf('package-ecosystem: npm'), source.indexOf('package-ecosystem: github-actions'));
  assert.match(npmSection, /framework-runtime:/);
  assert.match(npmSection, /security-sensitive:/);
  const frameworkPatterns = npmSection.slice(npmSection.indexOf('framework-runtime:'), npmSection.indexOf('security-sensitive:'));
  const securityPatterns = npmSection.slice(npmSection.indexOf('security-sensitive:'));
  for (const pkg of ['wrangler', 'dompurify', 'marked']) {
    assert.doesNotMatch(frameworkPatterns, new RegExp(`- ${pkg}\\b`), `${pkg} must not be duplicated into framework-runtime`);
    assert.match(securityPatterns, new RegExp(`- ${pkg}\\b`), `${pkg} must be tracked in security-sensitive`);
  }
});
