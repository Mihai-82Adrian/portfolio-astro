// Wave 3 closure: proves `verify:ai-reliability` is permanently wired into the single
// `verify:release-candidate` orchestration — in the "Function, provider, and security
// contracts" phase, after `verify:function-contracts` and `verify:ai-provider-contracts` — so a
// future edit that drops or reorders it fails this test rather than silently shrinking gate
// coverage. No second release pipeline and no duplicate Astro build are introduced.
import assert from 'node:assert/strict';
import test from 'node:test';

const { phases } = await import('../scripts/release/candidate.mjs');

test('release candidate: "Function, provider, and security contracts" phase exists exactly once', () => {
    const matches = phases.filter(([name]) => name === 'Function, provider, and security contracts');
    assert.equal(matches.length, 1, 'exactly one phase must own the Function/provider/security contracts');
});

test('release candidate: verify:ai-reliability is present in the Function/provider/security phase', () => {
    const [, scripts] = phases.find(([name]) => name === 'Function, provider, and security contracts');
    assert.ok(scripts.includes('verify:ai-reliability'), 'verify:ai-reliability must run as part of the unified gate');
});

test('release candidate: verify:ai-reliability runs after both verify:function-contracts and verify:ai-provider-contracts', () => {
    const [, scripts] = phases.find(([name]) => name === 'Function, provider, and security contracts');
    const idxFunction = scripts.indexOf('verify:function-contracts');
    const idxProvider = scripts.indexOf('verify:ai-provider-contracts');
    const idxReliability = scripts.indexOf('verify:ai-reliability');
    assert.ok(idxFunction !== -1 && idxProvider !== -1 && idxReliability !== -1);
    assert.ok(idxReliability > idxFunction, 'verify:ai-reliability must run after verify:function-contracts');
    assert.ok(idxReliability > idxProvider, 'verify:ai-reliability must run after verify:ai-provider-contracts');
});

test('release candidate: the Function/provider/security phase runs before Product quality, and before Full KoSIT validation', () => {
    const names = phases.map(([name]) => name);
    const idxContracts = names.indexOf('Function, provider, and security contracts');
    const idxProduct = names.indexOf('Product quality');
    const idxKosit = names.indexOf('Full KoSIT validation');
    assert.ok(idxContracts !== -1 && idxProduct !== -1 && idxKosit !== -1);
    assert.ok(idxContracts < idxProduct, 'contracts phase must run before the more expensive Product quality phase');
    assert.ok(idxContracts < idxKosit, 'contracts phase must run before the more expensive KoSIT phase');
});

test('release candidate: no second, duplicate release pipeline is introduced (single phases export, no redundant build)', () => {
    const productQuality = phases.find(([name]) => name === 'Product quality');
    assert.ok(productQuality, 'Product quality phase must still own the single Astro `build` step');
    const [, productScripts] = productQuality;
    assert.equal(productScripts.filter((s) => s === 'build').length, 1, 'exactly one `build` invocation across the gate');
    const totalBuildInvocations = phases.flatMap(([, scripts]) => scripts).filter((s) => s === 'build').length;
    assert.equal(totalBuildInvocations, 1, 'no phase outside Product quality may run its own build');
});

// Phase 2D-D closure: the offline GitHub Advisory Database scanner contract tests
// (reviewed/unreviewed/malware query composition, batching, pagination, failure handling)
// must stay composed into the unified gate's dependency-evidence phase, right after the
// committed advisory-register guard, so a future edit cannot silently drop this coverage.
test('release candidate: verify:advisory-scanner is composed into "Toolchain and dependency evidence" after verify:advisory-register', () => {
    const [, scripts] = phases.find(([name]) => name === 'Toolchain and dependency evidence');
    assert.ok(scripts, '"Toolchain and dependency evidence" phase must exist');
    const idxRegister = scripts.indexOf('verify:advisory-register');
    const idxScanner = scripts.indexOf('verify:advisory-scanner');
    assert.ok(idxRegister !== -1, 'verify:advisory-register must remain in the dependency-evidence phase');
    assert.ok(idxScanner !== -1, 'verify:advisory-scanner must run as part of the unified gate');
    assert.ok(idxScanner > idxRegister, 'the advisory-scanner contract tests must run after the advisory-register guard');
});

test('release candidate: the live GitHub advisory scan itself is not wired into the offline gate', () => {
    const allScripts = phases.flatMap(([, scripts]) => scripts);
    assert.ok(
        allScripts.every((script) => script === 'verify:advisory-scanner' || !script.includes('advisory-scan')),
        'only the offline, mocked-fetch advisory-scanner contract tests may run in the ordinary release gate — never a live network scan',
    );
});
