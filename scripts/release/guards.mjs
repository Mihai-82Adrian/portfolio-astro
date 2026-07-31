#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical'];
const DISPOSITIONS = new Set(['DEFERRED_WITH_TRIGGER', 'NOT_APPLICABLE', 'TRANSITIVE_BLOCKED']);
const APPROVED_ACTION_OWNERS = new Set(['actions', 'cloudflare']);
const EXPECTED_ACTIONS = new Map([
    ['actions/checkout', ['3d3c42e5aac5ba805825da76410c181273ba90b1', 'v7.0.1']],
    ['actions/setup-node', ['820762786026740c76f36085b0efc47a31fe5020', 'v7.0.0']],
    ['actions/upload-artifact', ['043fb46d1a93c77aae656e7c1c64a875d1fc6a0a', 'v7.0.1']],
    ['actions/download-artifact', ['3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c', 'v8.0.1']],
    ['cloudflare/wrangler-action', ['ebbaa1584979971c8614a24965b4405ff95890e0', 'v4.0.0']],
]);

const read = (root, file) => readFileSync(path.join(root, file), 'utf8');
const readJson = (root, file) => JSON.parse(read(root, file));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function invariant(condition, message) {
    if (!condition) throw new Error(message);
}

function exactVersions(root) {
    const node = read(root, '.node-version').trim();
    const packageManager = readJson(root, 'package.json').packageManager;
    const npm = /^npm@(\d+\.\d+\.\d+)$/.exec(packageManager ?? '')?.[1];
    invariant(/^\d+\.\d+\.\d+$/.test(node), '.node-version must contain one exact Node patch version.');
    invariant(npm, 'packageManager must contain one exact npm version.');
    return { node, npm };
}

export function verifyToolchain(root = ROOT, context) {
    const expected = exactVersions(root);
    const dependencyContract = readJson(root, 'config/dependency-tree-exceptions.json');
    invariant(dependencyContract.toolchain.node === expected.node, 'Dependency-tree Node toolchain drift.');
    invariant(dependencyContract.toolchain.npm === expected.npm, 'Dependency-tree npm toolchain drift.');

    const workflowText = readdirSync(path.join(root, '.github', 'workflows'))
        .filter((file) => /\.ya?ml$/.test(file))
        .map((file) => read(root, `.github/workflows/${file}`))
        .join('\n');
    invariant(workflowText.includes('node-version-file: .node-version'), 'Workflow Node setup must use .node-version.');
    invariant(workflowText.includes(`npm install --global npm@${expected.npm}`), 'Workflow npm version drift.');

    const dockerfile = read(root, 'release/Dockerfile.reproducibility');
    invariant(dockerfile.includes(`node:${expected.node}-bookworm-slim@sha256:`), 'Container Node version drift.');
    invariant(dockerfile.includes(`npm@${expected.npm}`), 'Container npm version drift.');
    const wrangler = read(root, 'wrangler.jsonc');
    invariant((wrangler.match(new RegExp(`"NODE_VERSION": "${expected.node.replaceAll('.', '\\.')}"`, 'g')) ?? []).length === 3, 'Wrangler Node version drift.');

    const actual = context ?? runtimeContext();
    const actualNode = String(actual.nodeVersion).replace(/^v/, '');
    invariant(actualNode === expected.node, `Node must be ${expected.node}; received ${actualNode}.`);
    invariant(actual.npmVersion === expected.npm, `npm must be ${expected.npm}; received ${actual.npmVersion}.`);
    invariant(actual.platform === 'linux', `Formal release platform must be linux; received ${actual.platform}.`);
    invariant(actual.arch === 'x64', `Formal release architecture must be x64; received ${actual.arch}.`);
    invariant(actual.libc === 'glibc', `Formal release libc must be glibc; received ${actual.libc}.`);

    const manifestPath = path.join(root, '.artifacts', 'release', 'release-manifest.json');
    if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        invariant(manifest.toolchain?.node === `v${expected.node}`, 'Release manifest Node version drift.');
        invariant(manifest.toolchain?.npm === expected.npm, 'Release manifest npm version drift.');
        invariant(manifest.toolchain?.platform === 'linux', 'Release manifest platform drift.');
        invariant(manifest.toolchain?.arch === 'x64', 'Release manifest architecture drift.');
    }
    return { ...expected, platform: 'linux', arch: 'x64', libc: 'glibc' };
}

function runtimeContext() {
    const npm = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], { encoding: 'utf8' });
    const report = process.report?.getReport?.();
    return {
        nodeVersion: process.version,
        npmVersion: npm.stdout.trim(),
        platform: process.platform,
        arch: process.arch,
        libc: report?.header?.glibcVersionRuntime ? 'glibc' : 'unknown',
    };
}

function derivedCounts(items) {
    const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0]));
    for (const item of items) {
        invariant(SEVERITIES.includes(item.severity), `Invalid advisory severity: ${item.severity}`);
        counts[item.severity] += 1;
    }
    counts.total = items.length;
    return counts;
}

export function verifyAdvisoryRegister(root = ROOT) {
    const register = readJson(root, 'config/dependency-advisories.json');
    invariant(register.schemaVersion === 1, 'Unsupported advisory-register schema.');
    const lockfileSha256 = sha256(read(root, 'package-lock.json'));
    invariant(register.lockfileSha256 === lockfileSha256, 'Advisory register is stale after lockfile change.');
    invariant(register.freshnessBoundary.includes('Phase 3'), 'Advisory freshness boundary is missing.');

    const ids = new Set();
    for (const record of register.records ?? []) {
        invariant(/^GHSA-[a-z0-9-]+$/.test(record.advisoryId), `Invalid advisory ID: ${record.advisoryId}`);
        invariant(!ids.has(record.advisoryId), `Duplicate advisory ID: ${record.advisoryId}`);
        ids.add(record.advisoryId);
        invariant(Array.isArray(record.cves) && record.cves.every((cve) => /^CVE-\d{4}-\d+$/.test(cve)), `${record.advisoryId}: invalid CVE list.`);
        for (const field of ['title', 'package', 'affectedRange', 'patchedRange', 'observedDate', 'reevaluationTrigger']) {
            invariant(typeof record[field] === 'string' && record[field].trim(), `${record.advisoryId}: missing ${field}.`);
        }
        invariant(Array.isArray(record.installedDependencyPaths) && record.installedDependencyPaths.length > 0, `${record.advisoryId}: missing paths.`);
        invariant(record.installedDependencyPaths.every((item) => item.startsWith('node_modules/')), `${record.advisoryId}: invalid path.`);
        invariant(DISPOSITIONS.has(record.disposition), `${record.advisoryId}: invalid disposition.`);
        invariant(record.disposition !== 'FIXED', `${record.advisoryId}: affected installed path cannot be marked fixed.`);
        invariant(record.lockfileSha256 === lockfileSha256, `${record.advisoryId}: lockfile checksum drift.`);
    }
    invariant(JSON.stringify(derivedCounts(register.records)) === JSON.stringify(register.advisoryRecordCounts), 'Advisory record counts disagree with records.');

    for (const finding of register.packagePathFindings ?? []) {
        invariant(finding.installedDependencyPath.startsWith('node_modules/'), `${finding.package}: invalid package path.`);
        invariant(finding.advisoryIds.length > 0 && finding.advisoryIds.every((id) => ids.has(id)), `${finding.package}: unknown advisory relationship.`);
    }
    invariant(
        JSON.stringify(derivedCounts(register.packagePathFindings)) === JSON.stringify(register.packagePathFindingCounts),
        'Package-path finding counts disagree with findings.',
    );

    const hygiene = read(root, 'docs/operations/dependency-hygiene.md');
    invariant(hygiene.includes('advisoryRecordCounts'), 'Dependency hygiene must name advisoryRecordCounts.');
    invariant(hygiene.includes('packagePathFindingCounts'), 'Dependency hygiene must name packagePathFindingCounts.');
    for (const id of ids) invariant(hygiene.includes(id), `Dependency hygiene omits ${id}.`);
    return { records: register.records.length, packagePathFindings: register.packagePathFindings.length };
}

export function verifyReleasePolicy(root = ROOT) {
    const policy = readJson(root, 'config/release-policy.json');
    invariant(policy.schemaVersion === 1, 'Unsupported release-policy schema.');
    invariant(policy.productionBranch === 'master', 'Production branch must be master.');
    invariant(policy.deploymentOwner === 'github-actions', 'Deployment owner must be GitHub Actions.');
    invariant(policy.cspMode === 'report-only', 'CSP must remain Report-Only.');
    invariant(policy.sampleReview === 'disabled', 'Sample Review must remain disabled.');
    for (const key of ['requirePublicReleaseLineage', 'requireExactToolchain', 'requireArtifactReuse']) {
        invariant(policy[key] === true, `${key} must be true.`);
    }
    invariant(policy.remotePrerequisites?.deploymentOwnerVariable === 'DEPLOYMENT_OWNER', 'Deployment-owner variable drift.');
    invariant(policy.remotePrerequisites?.deploymentOwnerValue === 'github-actions', 'Deployment-owner value drift.');
    invariant(policy.remotePrerequisites?.gitIntegrationVariable === 'CLOUDFLARE_GIT_INTEGRATION_DISABLED', 'Git-integration variable drift.');
    invariant(policy.remotePrerequisites?.gitIntegrationValue === 'true', 'Git-integration value drift.');
    const features = read(root, 'functions/_lib/feature-controls.ts');
    invariant(/SAMPLE_REVIEW_ENABLED:\s*false/.test(features), 'Sample Review source default is not disabled.');
    const headers = read(root, 'public/_headers');
    invariant(headers.includes('Content-Security-Policy-Report-Only:'), 'Report-Only CSP header is missing.');
    invariant(!/^\s*Content-Security-Policy:/m.test(headers), 'CSP enforcement is not approved.');
    const workflow = read(root, '.github/workflows/release.yml');
    for (const value of [
        policy.remotePrerequisites.deploymentOwnerVariable,
        policy.remotePrerequisites.gitIntegrationVariable,
        'verify:public-release-lineage',
        'verify:release-candidate',
    ]) invariant(workflow.includes(value), `Release workflow omits ${value}.`);
    return policy;
}

export function verifyWorkflows(root = ROOT) {
    const directory = path.join(root, '.github', 'workflows');
    const workflows = readdirSync(directory).filter((file) => /\.ya?ml$/.test(file)).sort();
    invariant(JSON.stringify(workflows) === JSON.stringify(['quality-gates.yml', 'release.yml']), 'Unexpected workflow topology.');
    let externalActionPins = 0;
    let deploymentOwners = 0;
    for (const file of workflows) {
        const source = readFileSync(path.join(directory, file), 'utf8');
        invariant(!source.includes('pull_request_target'), `${file}: pull_request_target is forbidden.`);
        invariant(/^permissions:\n  contents: read$/m.test(source), `${file}: root permissions must be contents: read.`);
        invariant(!/permissions:[\s\S]{0,100}\bwrite\b/.test(source), `${file}: root write permission is forbidden.`);
        invariant(!/container:\s*[^\n]+:(?!.*@sha256:)/.test(source), `${file}: mutable container image.`);
        for (const line of source.split('\n').filter((value) => value.includes('uses:'))) {
            if (/uses:\s+\.\//.test(line)) continue;
            const match = line.match(/uses:\s+([^@\s]+)@([a-f0-9]{40})\s+#\s+(\S+)/);
            invariant(match, `${file}: mutable or undocumented Action reference: ${line.trim()}`);
            const expected = EXPECTED_ACTIONS.get(match[1]);
            invariant(expected, `${file}: unapproved Action: ${match[1]}`);
            invariant(APPROVED_ACTION_OWNERS.has(match[1].split('/')[0]), `${file}: unapproved Action owner.`);
            invariant(match[2] === expected[0] && match[3] === expected[1], `${file}: unverified Action pin for ${match[1]}.`);
            externalActionPins += 1;
        }
        deploymentOwners += (source.match(/wrangler-action@/g) ?? []).length;
    }
    const quality = read(root, '.github/workflows/quality-gates.yml');
    invariant(!quality.includes('secrets.'), 'Quality workflow must not receive secrets.');
    invariant(!/pages deploy|wrangler deploy/.test(quality), 'Quality workflow must not deploy.');
    invariant(quality.includes('verify:release-candidate'), 'Quality workflow omits unified gate.');
    invariant(quality.includes('node-version-file: .node-version') && quality.includes('npm@11.16.0'), 'Quality toolchain drift.');
    invariant(/^ {2}pull_request:$/m.test(quality), 'Quality workflow must trigger on pull_request.');
    invariant(/^ {2}push:\n {4}branches:\n(?:.*\n)*? {6}- master\n/m.test(quality), 'Quality workflow must trigger on push to master.');
    const blockingCheckNames = workflows
        .map((file) => readFileSync(path.join(directory, file), 'utf8'))
        .flatMap((source) => source.match(/^ {4}name: Quality Checks$/gm) ?? []);
    invariant(blockingCheckNames.length === 1, 'Exactly one job across tracked workflows must emit the required "Quality Checks" status-check context.');

    const release = read(root, '.github/workflows/release.yml');
    invariant(!/^\s+(push|pull_request):/m.test(release), 'Release workflow must remain manual.');
    invariant(/deploy:\n\s+needs: quality/.test(release), 'Deploy job must depend on quality.');
    invariant(release.includes('actions/upload-artifact') && release.includes('actions/download-artifact'), 'Verified artifact transfer is missing.');
    invariant((release.match(/name: verified-release/g) ?? []).length === 2, 'Build/deploy artifact identity drift.');
    const deploySection = release.slice(release.indexOf('\n  deploy:'));
    invariant(!/npm run (?:build|verify:release-candidate)/.test(deploySection), 'Deploy job must not rebuild.');
    for (const value of [
        'SOURCE_BRANCH" != master',
        'integration/portfolio-hardening-2026-07',
        'DEPLOYMENT_OWNER',
        'CLOUDFLARE_GIT_INTEGRATION_DISABLED',
        'environment: ${{ inputs.target }}',
        "cancel-in-progress: ${{ inputs.target == 'preview' }}",
    ]) invariant(release.includes(value), `Release workflow omits ${value}.`);
    invariant(!release.slice(0, release.indexOf('\n  deploy:')).includes('secrets.'), 'Quality job must not receive deploy secrets.');
    invariant(deploymentOwners === 1, 'Exactly one tracked deployment owner is required.');
    verifyReleasePolicy(root);
    return { workflows, externalActionPins, deploymentOwners };
}

function main() {
    const command = process.argv[2];
    const results = {
        toolchain: () => verifyToolchain(ROOT),
        advisories: () => verifyAdvisoryRegister(ROOT),
        workflows: () => verifyWorkflows(ROOT),
        policy: () => verifyReleasePolicy(ROOT),
    };
    invariant(results[command], `Usage: node scripts/release/guards.mjs ${Object.keys(results).join('|')}`);
    const result = results[command]();
    console.log(`${command}: PASS`);
    console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
