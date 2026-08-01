// Phase 3-B2 (Workstream C §6.1): repository security baseline — Dependabot configuration.
// Checked with plain string/regex assertions against the YAML source, matching the convention
// scripts/release/guards.mjs already uses for workflow YAML — no new YAML-parsing dependency.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const source = readFileSync(path.join(ROOT, '.github/dependabot.yml'), 'utf8');

test('dependabot.yml declares version 2 with npm and github-actions ecosystems', () => {
  assert.match(source, /^version: 2$/m);
  assert.match(source, /package-ecosystem: npm/);
  assert.match(source, /package-ecosystem: github-actions/);
});

test('every update entry is weekly, targets master, and stays bounded', () => {
  const entries = source.split(/^  - package-ecosystem:/m).slice(1);
  assert.ok(entries.length >= 2, 'expected at least the npm and github-actions entries');
  for (const entry of entries) {
    assert.match(entry, /interval: weekly/, 'schedule must be weekly');
    assert.match(entry, /target-branch: master/, 'must target master');
    assert.match(entry, /open-pull-requests-limit: \d+/, 'must set a bounded open-PR limit');
    const limit = Number(entry.match(/open-pull-requests-limit: (\d+)/)[1]);
    assert.ok(limit > 0 && limit <= 20, 'open-pull-requests-limit must be a small bounded number');
    assert.match(entry, /- dependencies/);
    assert.match(entry, /- security/);
  }
});

test('no auto-merge is configured anywhere in dependabot.yml', () => {
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
