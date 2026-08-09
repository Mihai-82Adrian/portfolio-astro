import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('formal release toolchain is exact and consistent across repository declarations', async () => {
  const { verifyToolchain } = await import('../scripts/release/guards.mjs');
  const pkg = json('package.json');
  assert.equal(read('.node-version').trim(), '22.22.3');
  assert.equal(pkg.packageManager, 'npm@11.16.0');
  assert.deepEqual(verifyToolchain(ROOT, {
    nodeVersion: 'v22.22.3',
    npmVersion: '11.16.0',
    platform: 'linux',
    arch: 'x64',
    libc: 'glibc',
  }), {
    node: '22.22.3',
    npm: '11.16.0',
    platform: 'linux',
    arch: 'x64',
    libc: 'glibc',
  });
  assert.throws(
    () => verifyToolchain(ROOT, {
      nodeVersion: 'v22.22.2',
      npmVersion: '11.16.0',
      platform: 'linux',
      arch: 'x64',
      libc: 'glibc',
    }),
    /Node.*22\.22\.3/,
  );
});

test('advisory register separates unique advisories from npm package-path findings', async () => {
  const { verifyAdvisoryRegister } = await import('../scripts/release/guards.mjs');
  const register = json('config/dependency-advisories.json');
  assert.equal(register.lockfileSha256, sha256(read('package-lock.json')));
  assert.deepEqual(register.advisoryRecordCounts, {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    total: 0,
  });
  assert.deepEqual(register.packagePathFindingCounts, {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    total: 0,
  });
  assert.equal(register.records.length, 0);
  assert.equal(register.packagePathFindings.length, 0);
  assert.equal(verifyAdvisoryRegister(ROOT).records, 0);
});

test('machine release policy fails closed on Sample Review, CSP, lineage, toolchain, and artifact reuse', async () => {
  const { verifyReleasePolicy } = await import('../scripts/release/guards.mjs');
  const policy = json('config/release-policy.json');
  assert.deepEqual(policy, {
    schemaVersion: 1,
    productionBranch: 'master',
    deploymentOwner: 'github-actions',
    cspMode: 'report-only',
    sampleReview: 'disabled',
    requirePublicReleaseLineage: true,
    requireExactToolchain: true,
    requireArtifactReuse: true,
    remotePrerequisites: {
      deploymentOwnerVariable: 'DEPLOYMENT_OWNER',
      deploymentOwnerValue: 'github-actions',
      gitIntegrationVariable: 'CLOUDFLARE_GIT_INTEGRATION_DISABLED',
      gitIntegrationValue: 'true',
    },
  });
  assert.equal(verifyReleasePolicy(ROOT).sampleReview, 'disabled');
});

test('tracked workflow topology has one non-deploying quality owner and one manual future deploy owner', async () => {
  const { verifyWorkflows } = await import('../scripts/release/guards.mjs');
  const workflowDir = path.join(ROOT, '.github', 'workflows');
  const files = readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file)).sort();
  assert.deepEqual(files, ['quality-gates.yml', 'release.yml', 'security-audit.yml']);
  const result = verifyWorkflows(ROOT);
  assert.equal(result.externalActionPins, 11);
  assert.equal(result.deploymentOwners, 1);
  assert.deepEqual(result.workflows, files);
});

test('deployment Wrangler pin is exact and identical across package.json, package-lock.json, and release.yml', async () => {
  const { verifyWranglerPinParity } = await import('../scripts/release/guards.mjs');
  const pkgWrangler = json('package.json').devDependencies.wrangler;
  assert.match(pkgWrangler, /^\d+\.\d+\.\d+$/, 'package.json wrangler must be an exact pin');
  const lockWrangler = json('package-lock.json').packages['node_modules/wrangler'].version;
  assert.equal(lockWrangler, pkgWrangler, 'package-lock top-level wrangler must match package.json');
  const release = read('.github/workflows/release.yml');
  assert.equal(verifyWranglerPinParity(ROOT, release), pkgWrangler);
  assert.match(release, new RegExp(`wranglerVersion: '${pkgWrangler.replaceAll('.', '\\.')}'`));
});

test('the Wrangler parity guard fails closed on a synthetic package/lockfile/workflow mismatch', async () => {
  const { verifyWranglerPinParity } = await import('../scripts/release/guards.mjs');
  const dir = mkdtempSync(path.join(tmpdir(), 'portfolio-wrangler-parity-'));
  try {
    const write = (pkgWrangler, lockWrangler) => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { wrangler: pkgWrangler } }));
      writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/wrangler': { version: lockWrangler } } }));
    };

    // Baseline: all three agree.
    write('4.120.0', '4.120.0');
    assert.equal(verifyWranglerPinParity(dir, "wranglerVersion: '4.120.0'"), '4.120.0');

    // package-lock resolved version differs from package.json.
    write('4.120.0', '4.114.0');
    assert.throws(() => verifyWranglerPinParity(dir, "wranglerVersion: '4.120.0'"), /package-lock top-level wrangler/);

    // release.yml pin differs from package.json/package-lock.
    write('4.120.0', '4.120.0');
    assert.throws(() => verifyWranglerPinParity(dir, "wranglerVersion: '4.114.0'"), /release\.yml wranglerVersion/);

    // release.yml pin is absent.
    assert.throws(() => verifyWranglerPinParity(dir, 'command: pages deploy'), /must be an exact, non-floating pin/);

    // release.yml pin is floating (not an exact patch version).
    assert.throws(() => verifyWranglerPinParity(dir, "wranglerVersion: '4'"), /must be an exact, non-floating pin/);

    // package.json version itself is not an exact pin.
    write('^4.120.0', '4.120.0');
    assert.throws(() => verifyWranglerPinParity(dir, "wranglerVersion: '4.120.0'"), /package\.json wrangler devDependency must be an exact pin/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('canonical quality workflow explicitly emits the required branch-protection check name', () => {
  const workflowDir = path.join(ROOT, '.github', 'workflows');
  const files = readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file)).sort();
  assert.equal(existsSync(path.join(workflowDir, 'deploy.yml')), false, 'retired deploy.yml must stay absent');
  assert.equal(existsSync(path.join(workflowDir, 'quality.yml')), false, 'retired quality.yml must stay absent');

  const blockingCheckNames = files
    .map((file) => read(`.github/workflows/${file}`))
    .flatMap((source) => source.match(/^ {4}name: Quality Checks$/gm) ?? []);
  assert.equal(blockingCheckNames.length, 1, 'exactly one canonical job must be named "Quality Checks"');

  const quality = read('.github/workflows/quality-gates.yml');
  assert.match(quality, /^ {2}pull_request:$/m, 'quality-gates.yml must trigger on pull_request');
  assert.match(quality, /^ {2}push:\n {4}branches:\n(?:.*\n)*? {6}- master\n/m, 'quality-gates.yml must trigger on push to master');
  assert.doesNotMatch(quality, /pages deploy|wrangler deploy/, 'quality-gates.yml must never deploy');

  const release = read('.github/workflows/release.yml');
  assert.doesNotMatch(release, /^\s+(push|pull_request):/m, 'release.yml must remain workflow_dispatch-only');
});

// Phase 5-D2-B PR-CI and master-push closure: GitHub's pull_request checkout is a synthetic
// two-parent `refs/pull/N/merge` commit, and a repository-sync commit that becomes the new master
// HEAD via a normal push carries no Canonical-Artifact/Release-Manifest — both shapes are rejected by
// scripts/release/diff-hygiene.mjs's auto-resolution (see tests/release-diff-hygiene.test.mjs).
// RELEASE_DIFF_BASE is the CI-supplied override that resolves both, from two distinct GitHub-reported
// values only — never a hardcoded literal — and stays absent (empty) for push to release/** and for
// workflow_dispatch, preserving their existing auto-resolution behavior exactly.
test('quality-gates.yml supplies RELEASE_DIFF_BASE from PR base SHA or master push.before only, never a hardcoded value', () => {
  const quality = read('.github/workflows/quality-gates.yml');
  const expression = /RELEASE_DIFF_BASE:\s*\$\{\{\s*\(github\.event_name == 'pull_request' && github\.event\.pull_request\.base\.sha\)\s*\|\|\s*\(github\.event_name == 'push' && github\.ref == 'refs\/heads\/master' && github\.event\.before\)\s*\|\|\s*''\s*\}\}/;
  assert.match(
    quality,
    expression,
    "quality-gates.yml must set RELEASE_DIFF_BASE from github.event.pull_request.base.sha for pull_request, github.event.before for push to refs/heads/master, and '' otherwise",
  );
  // The three-branch ternary above already proves the master-specific override is gated to
  // refs/heads/master specifically (not any push, so a release/** push falls through to the final
  // '' branch) and that workflow_dispatch (matching neither the pull_request nor push+master.ref
  // condition) also falls through to ''. Assert those two exclusions explicitly too, so a future
  // edit that widens the condition (e.g. dropping the `github.ref ==` clause) fails loudly here
  // rather than only being caught by the semantic English description above.
  assert.doesNotMatch(
    quality,
    /RELEASE_DIFF_BASE:[^\n]*github\.event_name == 'workflow_dispatch'/,
    'workflow_dispatch must never receive an explicit RELEASE_DIFF_BASE override',
  );
  const releaseDiffBaseLine = quality.split('\n').find((line) => line.includes('RELEASE_DIFF_BASE:'));
  assert.ok(releaseDiffBaseLine.includes("github.ref == 'refs/heads/master'"), 'the push-context override must be scoped to refs/heads/master, excluding release/** pushes');
  assert.doesNotMatch(
    quality,
    /RELEASE_DIFF_BASE:\s*['"]?[a-f0-9]{40}['"]?\s*$/m,
    'RELEASE_DIFF_BASE must never be a hardcoded literal SHA',
  );
  // fetch-depth: 0 (already asserted structurally elsewhere by requiring the checkout action) keeps
  // the full history verify:release-diff-hygiene needs to diff against the supplied base — this
  // assertion protects that precondition from silently narrowing.
  assert.match(quality, /fetch-depth:\s*0/, 'checkout must keep fetch-depth: 0 for the diff-hygiene base to be resolvable');
});

// Phase 5-D2-B proportional-validation closure: Quality Checks previously always ran the complete
// production-oriented verify:release-candidate, so an unrelated release-control-plane fix could be
// blocked by an unrelated KoSIT-tooling flake (see tests/change-impact.test.mjs for the classifier
// itself). Quality Checks now dispatches through the deterministic change-impact classifier, which
// always falls back to the full gate for an actual release/production context or an unclassified
// path — never a bypass, only a proportional selection.
test('quality-gates.yml dispatches through the proportional change-impact classifier, which always falls back to the full gate for release/unknown contexts', () => {
  const quality = read('.github/workflows/quality-gates.yml');
  assert.match(quality, /run: npm run ci:quality-gate/, 'Quality Checks must run through the proportional classifier, not invoke verify:release-candidate directly');
  assert.doesNotMatch(quality, /run: npm run verify:release-candidate/, 'the unified gate must be reached via the classifier fallback, not a second direct invocation');
  // RELEASE_DIFF_BASE wiring must be unchanged by this refactor -- the classifier reuses the same
  // env var both to compute the changed-file diff and to pass through to verify:release-diff-hygiene.
  assert.match(
    quality,
    /RELEASE_DIFF_BASE:\s*\$\{\{\s*\(github\.event_name == 'pull_request' && github\.event\.pull_request\.base\.sha\)\s*\|\|\s*\(github\.event_name == 'push' && github\.ref == 'refs\/heads\/master' && github\.event\.before\)\s*\|\|\s*''\s*\}\}/,
    'RELEASE_DIFF_BASE must remain wired from the PR base SHA or master push.before, never a hardcoded value',
  );

  const classifier = read('scripts/ci/change-impact.mjs');
  assert.match(classifier, /shouldForceFullGate/, 'the classifier must expose a testable force-full-gate decision');
  assert.match(
    classifier,
    /eventName === 'workflow_dispatch'.*return true/s,
    'a manual workflow_dispatch must always force the full gate',
  );
  assert.match(
    classifier,
    /ref\.startsWith\('refs\/heads\/release\/'\)/,
    'a push to a release/** branch must always force the full gate',
  );
  assert.match(classifier, /verify:release-candidate/, 'the classifier must fall back to the unified gate for release/unknown contexts');
  assert.match(classifier, /unclassified path/, 'an unrecognized changed path must fail closed to the unified gate');
});

test('security-audit workflow is a read-only, scheduled, non-deploying, minimal-permission audit', () => {
  const workflow = read('.github/workflows/security-audit.yml');
  assert.match(workflow, /^\s*schedule:$/m, 'must run on a schedule');
  assert.ok(workflow.includes('workflow_dispatch'), 'must be manually dispatchable');
  assert.match(workflow, /^permissions:\n  contents: read$/m, 'must use only default GITHUB_TOKEN with contents: read');
  assert.doesNotMatch(workflow, /secrets\./, 'must not receive repository secrets');
  assert.doesNotMatch(workflow, /pages deploy|wrangler deploy/, 'must never deploy');
  assert.doesNotMatch(workflow, /npm audit fix|gh (pr|issue) create/, 'must not modify dependencies or open a PR/issue automatically');
  assert.ok(workflow.includes('npm audit'), 'must run a fresh, registry-backed npm audit');
  assert.ok(workflow.includes('verify:advisory-scanner'), 'must run the permanent GitHub Advisory Database scanner');
});

test('all workflow actions and the release container are immutable and human-readable', () => {
  const expectedPins = new Map([
    ['actions/checkout', ['3d3c42e5aac5ba805825da76410c181273ba90b1', 'v7.0.1']],
    ['actions/setup-node', ['820762786026740c76f36085b0efc47a31fe5020', 'v7.0.0']],
    ['actions/upload-artifact', ['043fb46d1a93c77aae656e7c1c64a875d1fc6a0a', 'v7.0.1']],
    ['actions/download-artifact', ['3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c', 'v8.0.1']],
    ['cloudflare/wrangler-action', ['ebbaa1584979971c8614a24965b4405ff95890e0', 'v4.0.0']],
  ]);
  for (const file of ['.github/workflows/quality-gates.yml', '.github/workflows/release.yml', '.github/workflows/security-audit.yml']) {
    for (const line of read(file).split('\n').filter((value) => value.includes('uses:'))) {
      if (line.includes('uses: ./')) continue;
      const match = line.match(/uses:\s+([^@\s]+)@([a-f0-9]{40})\s+#\s+(\S+)/);
      assert.ok(match, `${file}: ${line}`);
      assert.deepEqual([match[2], match[3]], expectedPins.get(match[1]), `${file}: ${match[1]}`);
    }
  }
  const container = read('release/Dockerfile.reproducibility');
  assert.match(
    container,
    /^FROM node:22\.22\.3-bookworm-slim@sha256:16d364eebf6b62da439dc993d9b80940c78b0ca38438452f011ab9a25c752644$/m,
  );
  assert.match(container, /apt-get install --yes --no-install-recommends git/);
  for (const line of container.split('\n').filter((value) => value.startsWith('FROM '))) {
    assert.match(line, /@sha256:[a-f0-9]{64}$/);
  }
});

test('release scripts expose every Phase 2C verifier and keep generated evidence ignored', () => {
  const scripts = json('package.json').scripts;
  for (const command of [
    'verify:csp',
    'verify:toolchain',
    'verify:advisory-register',
    'verify:workflows',
    'verify:release-policy',
    'verify:public-release-lineage',
    'prepare:public-release',
    'verify:reproducibility',
    'verify:reproducibility:container',
    'verify:postdeploy',
    'plan:rollback',
    'verify:firefox-release',
    'verify:release-candidate',
  ]) assert.ok(scripts[command], command);
  const ignore = read('.gitignore');
  assert.match(ignore, /\.artifacts\/release-candidate\//);
  assert.equal(existsSync(path.join(ROOT, '.artifacts', 'release-candidate', 'summary.json')), false);
});

test('isolated builds use mapped ownership, bounded temporary state, and no network', () => {
  const source = read('scripts/release/reproducibility.mjs');
  assert.match(source, /'--network', 'none'/);
  assert.match(source, /process\.getuid\(\)/);
  assert.match(source, /process\.getgid\(\)/);
  assert.match(source, /'--user'/);
  assert.match(source, /mode=1777,uid=\$\{uid\},gid=\$\{gid\}/);
  assert.match(source, /WRANGLER_LOG_PATH=\/tmp\/wrangler\/wrangler\.log/);
  assert.match(source, /XDG_CONFIG_HOME=\/tmp\/xdg/);
  assert.match(source, /'ASTRO_TELEMETRY_DISABLED=1'/);
  assert.match(source, /'GIT_CONFIG_KEY_0=safe\.directory'/);
  assert.match(source, /'GIT_CONFIG_VALUE_0=\/workspace\/repository'/);
  assert.doesNotMatch(source, /safe\.directory[^\\n]*\*/);
  assert.doesNotMatch(source, /\b(?:chmod|chown|sudo)\b/);

  const provenance = read('scripts/release/provenance.mjs');
  assert.match(provenance, /WRANGLER_LOG_PATH/);
  assert.match(provenance, /XDG_CONFIG_HOME/);
  assert.match(provenance, /portfolio-wrangler-/);
});

test('Marionette sync and async script execution unwrap exactly one protocol layer', async () => {
  const { execute, executeAsync } = await import('../scripts/release/firefox-release.mjs');

  function fakeClient(canned, expectedCommand) {
    return {
      command: async (name, parameters) => {
        if (expectedCommand) assert.equal(name, expectedCommand);
        assert.equal(parameters.script, 'return 1;');
        assert.deepEqual(parameters.args, []);
        assert.equal(parameters.newSandbox, true);
        return canned;
      },
    };
  }

  const consentValue = { lang: 'de', banner: true, optional: 0 };
  assert.deepEqual(
    await execute(fakeClient({ value: consentValue }, 'WebDriver:ExecuteScript'), 'return 1;'),
    consentValue,
  );
  assert.deepEqual(
    await executeAsync(fakeClient({ value: consentValue }, 'WebDriver:ExecuteAsyncScript'), 'return 1;'),
    consentValue,
  );

  assert.equal(await execute(fakeClient({ value: null }), 'return 1;'), null);
  assert.equal(await execute(fakeClient({ value: 'application-data' }), 'return 1;'), 'application-data');
  assert.equal(await execute(fakeClient({ value: true }), 'return 1;'), true);
  assert.equal(await execute(fakeClient({ value: false }), 'return 1;'), false);
  assert.equal(await execute(fakeClient({ value: 0 }), 'return 1;'), 0);
  assert.deepEqual(await execute(fakeClient({ value: [1, 2, 3] }), 'return 1;'), [1, 2, 3]);

  // Exactly one protocol layer is removed; an evaluated value that itself has a `value`
  // property must not be recursively unwrapped.
  assert.deepEqual(
    await execute(fakeClient({ value: { value: 'application-data' } }), 'return 1;'),
    { value: 'application-data' },
  );

  for (const malformed of [undefined, null, 'not-an-object', 42, [], {}, { lang: 'de' }]) {
    await assert.rejects(() => execute(fakeClient(malformed), 'return 1;'), /Marionette/);
  }

  try {
    await execute(fakeClient({ secretField: 'should-not-leak' }), 'return 1;');
    assert.fail('expected malformed protocol response to reject');
  } catch (error) {
    assert.doesNotMatch(error.message, /secretField|should-not-leak/);
  }

  await assert.rejects(
    () => execute({ command: async () => { throw new Error('Marionette command failed.'); } }, 'return 1;'),
    /Marionette command failed\./,
  );
});

test('release Firefox launch grants scoped system access for chrome-context viewport control only', () => {
  const source = read('scripts/release/firefox-release.mjs');
  assert.match(source, /spawn\(firefoxBinary, \[[^\]]*'-remote-allow-system-access'[^\]]*\]/s);
  assert.doesNotMatch(read('scripts/release/local-smoke.mjs'), /-remote-allow-system-access/);
  assert.doesNotMatch(read('scripts/release/setup-firefox.mjs'), /-remote-allow-system-access/);
});

test('the actual content viewport is established before the representative route is navigated', () => {
  const source = read('scripts/release/firefox-release.mjs');
  const resizeCallIndex = source.indexOf('setActualContentViewportWidth(client');
  const firstNavigateIndex = source.indexOf('WebDriver:Navigate');
  assert.ok(resizeCallIndex > -1, 'setActualContentViewportWidth must be invoked in the harness.');
  assert.ok(firstNavigateIndex > -1, 'WebDriver:Navigate must be present.');
  assert.ok(resizeCallIndex < firstNavigateIndex, 'The content viewport must be established before the first navigation.');
});

test('the 200% text-scale overflow check compares against the actual granted viewport, not a literal 320', () => {
  const source = read('scripts/release/firefox-release.mjs');
  assert.doesNotMatch(source, /scrollWidth <= 320/);
  assert.match(source, /scrollWidth <= document\.documentElement\.clientWidth/);
});

test('setActualContentViewportWidth switches to chrome context, resizes, and always restores content context', async () => {
  const { setActualContentViewportWidth } = await import('../scripts/release/firefox-release.mjs');

  function fakeClient(scriptOutcome) {
    const calls = [];
    return {
      calls,
      command: async (name, parameters) => {
        calls.push([name, parameters?.value]);
        if (name === 'Marionette:SetContext') return { value: null };
        if (name === 'WebDriver:ExecuteScript') {
          if (scriptOutcome instanceof Error) throw scriptOutcome;
          return scriptOutcome;
        }
        throw new Error(`Unexpected command: ${name}`);
      },
    };
  }

  function assertRestored(client) {
    assert.deepEqual(client.calls.map(([name]) => name), [
      'Marionette:SetContext',
      'WebDriver:ExecuteScript',
      'Marionette:SetContext',
    ]);
    assert.equal(client.calls[0][1], 'chrome');
    assert.equal(client.calls.at(-1)[1], 'content');
  }

  // Successful resize.
  {
    const client = fakeClient({ value: { ok: true, actualWidth: 320 } });
    await setActualContentViewportWidth(client, 320);
    assertRestored(client);
  }

  // gBrowser/selectedBrowser unavailable in chrome context.
  {
    const client = fakeClient({ value: { ok: false, reason: 'browser-unavailable' } });
    await assert.rejects(() => setActualContentViewportWidth(client, 320), /browser-unavailable/);
    assertRestored(client);
  }

  // Chrome-context script rejected (e.g. missing -remote-allow-system-access).
  {
    const client = fakeClient(new Error('System access is required.'));
    await assert.rejects(() => setActualContentViewportWidth(client, 320), /System access is required\./);
    assertRestored(client);
  }

  // Malformed Marionette protocol response for the resize script.
  {
    const client = fakeClient({ notValue: true });
    await assert.rejects(() => setActualContentViewportWidth(client, 320), /Marionette/);
    assertRestored(client);
  }

  // Chrome constraint prevented the exact requested width.
  {
    const client = fakeClient({ value: { ok: false, reason: 'width-mismatch', actualWidth: 500 } });
    await assert.rejects(() => setActualContentViewportWidth(client, 320), /width-mismatch/);
    assertRestored(client);
  }

  // Non-finite/invalid target widths are rejected before contacting Firefox at all.
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -320]) {
    const client = { command: async () => { throw new Error('must not be called for an invalid target width'); } };
    await assert.rejects(() => setActualContentViewportWidth(client, bad));
  }
});

test('assertActualViewport enforces the actual-viewport and overflow contracts without a literal scrollWidth<=320 comparison', async () => {
  const { assertActualViewport } = await import('../scripts/release/firefox-release.mjs');

  const passing = {
    innerWidth: 320,
    clientWidth: 308,
    scrollWidth: 308,
    bodyClientWidth: 308,
    bodyScrollWidth: 308,
    canScrollHorizontally: false,
    visualViewportWidth: 308,
  };
  assertActualViewport(passing, 320);
  assertActualViewport({ ...passing, visualViewportWidth: null }, 320);
  assertActualViewport({ ...passing, visualViewportWidth: undefined }, 320);

  assert.throws(() => assertActualViewport({ ...passing, innerWidth: 500 }, 320), /500/);
  assert.throws(() => assertActualViewport({ ...passing, innerWidth: 321 }, 320), /321/);
  assert.throws(() => assertActualViewport({ ...passing, clientWidth: 0 }, 320));
  assert.throws(() => assertActualViewport({ ...passing, clientWidth: 321 }, 320));
  assert.throws(() => assertActualViewport({ ...passing, scrollWidth: 309 }, 320), /overflow/i);
  assert.throws(() => assertActualViewport({ ...passing, bodyScrollWidth: 309 }, 320), /overflow/i);
  assert.throws(() => assertActualViewport({ ...passing, canScrollHorizontally: true }, 320), /overflow/i);
  assert.throws(() => assertActualViewport({ ...passing, canScrollHorizontally: 'false' }, 320));
  assert.throws(() => assertActualViewport({ ...passing, visualViewportWidth: 320 }, 320));
  assert.throws(() => assertActualViewport({ ...passing, innerWidth: Number.NaN }, 320), /malformed|non-finite/i);
  assert.throws(() => assertActualViewport({ ...passing, scrollWidth: Number.POSITIVE_INFINITY }, 320), /malformed|non-finite/i);
  assert.throws(() => assertActualViewport(null, 320));
  assert.throws(() => assertActualViewport({}, 320));

  // The overflow contract must be self-referential (scrollWidth vs. the actual clientWidth), never
  // a comparison against the raw outer OS window size or a literal 320 once the scrollbar has
  // reduced the real layout viewport below it.
  assertActualViewport({ ...passing, clientWidth: 188, scrollWidth: 188, bodyClientWidth: 188, bodyScrollWidth: 188, visualViewportWidth: 188 }, 320);
});

function extractConsentCopy(componentSource) {
  const result = {};
  for (const locale of ['de', 'en', 'ro']) {
    const block = componentSource.match(new RegExp(`\\b${locale}:\\s*\\{([\\s\\S]*?)\\n  \\},`));
    assert.ok(block, `Could not locate the ${locale} consent-copy block in CookieConsent.astro.`);
    const accept = block[1].match(/accept:\s*'([^']+)'/);
    assert.ok(accept, `Could not locate the ${locale} accept label in CookieConsent.astro.`);
    result[locale] = accept[1];
  }
  return result;
}

test('the Firefox locale consent-copy matrix matches the canonical CookieConsent.astro accept label for every supported locale', () => {
  const canonical = extractConsentCopy(read('src/components/common/CookieConsent.astro'));
  assert.deepEqual(Object.keys(canonical).sort(), ['de', 'en', 'ro']);

  const harnessSource = read('scripts/release/firefox-release.mjs');
  const matrixSection = harnessSource.match(/for \(const \[route, lang, copy\] of \[([\s\S]*?)\]\) \{/);
  assert.ok(matrixSection, 'Firefox harness locale-copy matrix not found.');
  const tuples = [...matrixSection[1].matchAll(/\['([^']+)',\s*'([^']+)',\s*'([^']+)'\]/g)]
    .map(([, route, lang, copy]) => ({ route, lang, copy }));
  assert.equal(tuples.length, 3);
  assert.deepEqual(tuples.map((tuple) => tuple.lang).sort(), ['de', 'en', 'ro']);

  for (const { lang, copy } of tuples) {
    assert.equal(
      copy,
      canonical[lang],
      `Harness expects "${copy}" for ${lang}, but CookieConsent.astro currently renders "${canonical[lang]}".`,
    );
  }
});

test('the Unified Markdown processor guard is actually composed into the unified release-candidate gate', async () => {
  const { phases } = await import('../scripts/release/candidate.mjs');
  const productQuality = phases.find(([name]) => name === 'Product quality');
  assert.ok(productQuality, 'Product quality phase must exist in the unified gate.');
  const [, scripts] = productQuality;

  const buildIndex = scripts.indexOf('build');
  const markdownIndex = scripts.indexOf('verify:markdown-processor:built');
  assert.ok(buildIndex > -1, 'the Product quality phase must run a build.');
  assert.ok(
    markdownIndex > -1,
    'tests/markdown-processor.test.mjs must be wired into the unified gate, not merely defined as a standalone npm script.',
  );
  assert.ok(
    markdownIndex > buildIndex,
    'the Markdown processor guard must run after a fresh build so it observes the current dist output.',
  );

  const pkg = json('package.json');
  assert.match(
    pkg.scripts['verify:markdown-processor:built'],
    /node --test tests\/markdown-processor\.test\.mjs/,
    'the wired script must execute the permanent Markdown processor test file.',
  );
});

test('the Pagefind runtime accessibility contract is actually composed into the unified release-candidate gate', async () => {
  const { phases } = await import('../scripts/release/candidate.mjs');
  const productQuality = phases.find(([name]) => name === 'Product quality');
  assert.ok(productQuality, 'Product quality phase must exist in the unified gate.');
  const [, scripts] = productQuality;

  const buildIndex = scripts.indexOf('build');
  const pagefindIndex = scripts.indexOf('verify:pagefind-a11y');
  assert.ok(buildIndex > -1, 'the Product quality phase must run a build.');
  assert.ok(
    pagefindIndex > -1,
    'verify:pagefind-a11y must be wired into the unified gate, not merely defined as a standalone npm script. ' +
      'A future removal of this command must make this contract fail.',
  );
  assert.ok(
    pagefindIndex > buildIndex,
    'the Pagefind accessibility contract must run after a fresh build so it observes the current dist output.',
  );

  const pkg = json('package.json');
  assert.match(
    pkg.scripts['verify:pagefind-a11y'],
    /node --test tests\/pagefind-accessibility\.test\.mjs/,
    'the wired script must execute the permanent Pagefind accessibility test file.',
  );
});

test('the Fin-Tools localStorage persistence contract is actually composed into the unified release-candidate gate', async () => {
  const { phases } = await import('../scripts/release/candidate.mjs');
  const financial = phases.find(([name]) => name === 'Financial and XML contracts');
  assert.ok(financial, 'Financial and XML contracts phase must exist in the unified gate.');
  const [, scripts] = financial;
  assert.ok(
    scripts.includes('verify:fintools-persistence'),
    'tests/fintools-persistence-contract.test.mjs must be wired into the unified gate, not merely defined as a standalone npm script.',
  );

  const pkg = json('package.json');
  assert.match(
    pkg.scripts['verify:fintools-persistence'],
    /node --test tests\/fintools-persistence-contract\.test\.mjs/,
    'the wired script must execute the permanent Fin-Tools persistence test file.',
  );
});

test('the final product-acceptance route/hub contracts are actually composed into the unified release-candidate gate', async () => {
  const { phases } = await import('../scripts/release/candidate.mjs');
  const productQuality = phases.find(([name]) => name === 'Product quality');
  assert.ok(productQuality, 'Product quality phase must exist in the unified gate.');
  const [, scripts] = productQuality;

  const buildIndex = scripts.indexOf('build');
  const finalIndex = scripts.indexOf('verify:final-product-acceptance');
  assert.ok(buildIndex > -1, 'the Product quality phase must run a build.');
  assert.ok(
    finalIndex > -1,
    'verify:final-product-acceptance must be wired into the unified gate, not merely defined as a standalone npm script.',
  );
  assert.ok(finalIndex > buildIndex, 'the final acceptance contract must run after a fresh build.');

  const pkg = json('package.json');
  assert.match(
    pkg.scripts['verify:final-product-acceptance'],
    /node --test tests\/final-product-acceptance\.test\.mjs/,
    'the wired script must execute the permanent final-acceptance test file.',
  );
});

test('the PDF export structural regressions are actually composed into the unified release-candidate gate', async () => {
  const { phases } = await import('../scripts/release/candidate.mjs');
  const [, scripts] = phases.find(([name]) => name === 'Product quality');
  assert.ok(
    scripts.includes('verify:pdf-exports'),
    'tests/pdf-exports.test.mjs must be wired into the unified gate, not merely defined as a standalone npm script.',
  );
  const pkg = json('package.json');
  assert.match(
    pkg.scripts['verify:pdf-exports'],
    /node --test tests\/pdf-exports\.test\.mjs/,
    'the wired script must execute the permanent PDF export test file.',
  );
});

test('the Phase 2D-C Wave 1 launch-truth contracts are actually composed into the unified release-candidate gate', async () => {
  const { phases } = await import('../scripts/release/candidate.mjs');
  const productQuality = phases.find(([name]) => name === 'Product quality');
  assert.ok(productQuality, 'Product quality phase must exist in the unified gate.');
  const [, scripts] = productQuality;

  const buildIndex = scripts.indexOf('build');
  const wave1Index = scripts.indexOf('verify:wave1-launch-truth:built');
  assert.ok(buildIndex > -1, 'the Product quality phase must run a build.');
  assert.ok(
    wave1Index > -1,
    'verify:wave1-launch-truth:built must be wired into the unified gate, not merely defined as a standalone npm script. ' +
      'A future removal of this command must make this contract fail.',
  );
  assert.ok(
    wave1Index > buildIndex,
    'the Wave 1 launch-truth contract must run after a fresh build so route-integrity/AI-discoverability/Sample-Review checks observe the current dist output.',
  );

  const kositPhaseIndex = phases.findIndex(([name]) => name === 'Full KoSIT validation');
  const productQualityIndex = phases.findIndex(([name]) => name === 'Product quality');
  assert.ok(
    productQualityIndex < kositPhaseIndex,
    'Product quality (and therefore the Wave 1 contract) must run before the expensive KoSIT/reproducibility phases.',
  );

  const pkg = json('package.json');
  const composed = pkg.scripts['verify:wave1-launch-truth:built'];
  assert.match(composed, /verify:route-language-policy/, 'must enforce route-language policy');
  assert.match(composed, /verify:no-public-qa-routes/, 'must enforce no-public-QA-route protection');
  assert.match(composed, /verify:route-integrity:built:strict/, 'must enforce complete route integrity in --strict mode');
  assert.match(composed, /verify:sample-review-disabled:built/, 'must enforce the Sample Review disabled-state contract');

  assert.match(
    pkg.scripts['verify:route-integrity:built:strict'],
    /node scripts\/verify-route-integrity\.mjs --strict.*tests\/ai-route-discoverability\.test\.mjs/,
    'the strict built route-integrity script must run the verifier in --strict mode and the /ai discoverability test',
  );
});

test('unified release gate contains every formal local boundary and no provider canary', () => {
  const candidate = read('scripts/release/candidate.mjs');
  for (const contract of [
    'verify:governance',
    'verify:toolchain',
    'verify:release-provenance',
    'verify:operational-controls',
    'verify:csp',
    'verify:privacy',
    'verify:finance',
    'verify:function-contracts',
    'verify:ai-provider-contracts',
    'verify:xrechnung:kosit',
    'runLocalSmoke',
    'verifyReproducibility',
    'proveDryRun',
  ]) assert.match(candidate, new RegExp(contract));
  assert.doesNotMatch(candidate, /allow-provider-canary|OPENAI_API_KEY|RESEND_API_KEY/);
});

test('the gate summary advisory-freshness statement is derived from config/dependency-advisories.json, not hardcoded', () => {
  const candidate = read('scripts/release/candidate.mjs');
  assert.match(
    candidate,
    /readAdvisoryFreshness[\s\S]{0,400}config\/dependency-advisories\.json/,
    'advisoryFreshness must be computed by reading the advisory register, so a future online review ' +
      'automatically flows into the gate summary instead of leaving a stale hardcoded claim behind.',
  );
  assert.doesNotMatch(
    candidate,
    /advisoryFreshness:\s*'Offline (?:committed-register|consistency evidence only)/,
    'advisoryFreshness must not regress to a hardcoded literal string.',
  );

  const register = json('config/dependency-advisories.json');
  assert.equal(register.schemaVersion, 1);
  assert.match(register.observedDate, /^\d{4}-\d{2}-\d{2}$/, 'observedDate must be a concrete review date.');
  assert.equal(
    register.lockfileSha256,
    sha256(read('package-lock.json')),
    'the advisory register must be bound to the exact current lockfile, not a stale snapshot.',
  );
  assert.match(register.freshnessBoundary, /Phase 3/, 'the freshness boundary must still name remaining Phase 3 scope.');
});
