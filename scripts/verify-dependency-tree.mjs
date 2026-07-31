import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CONTRACT = JSON.parse(readFileSync(path.join(ROOT, 'config/dependency-tree-exceptions.json'), 'utf8'));

function collectInvalidNodes(node, names = [], found = []) {
  for (const [name, dependency] of Object.entries(node?.dependencies ?? {})) {
    const dependencyPath = [...names, name];
    if (dependency?.invalid) {
      found.push({
        package: name,
        version: dependency.version,
        requiredVersion: String(dependency.invalid).match(/"([^"]+)"/)?.[1],
        path: dependencyPath.join(' > '),
      });
    }
    collectInvalidNodes(dependency, dependencyPath, found);
  }
  return found;
}
function parseProblem(problem, root) {
  const normalized = String(problem).replaceAll(root, '<root>').replaceAll('\\', '/');
  const match = normalized.match(/^invalid: (.+)@([^@\s]+) <root>\/node_modules\/(.+)$/);
  return match
    ? { raw: normalized, type: 'invalid', package: match[1], version: match[2] }
    : { raw: normalized, type: normalized.split(':', 1)[0] };
}

export function verifyDependencyTree(tree, context, root) {
  const invalidNodes = collectInvalidNodes(tree);
  const problems = (tree.problems ?? []).map((problem) => parseProblem(problem, root)).sort((a, b) => a.raw.localeCompare(b.raw));
  const accepted = [];
  const unexpected = [];

  const nodeVersion = String(context.nodeVersion).replace(/^v/, '');
  const libc = context.libc ?? 'glibc';
  if (
    nodeVersion !== CONTRACT.toolchain.node
    || context.npmVersion !== CONTRACT.toolchain.npm
    || context.platform !== CONTRACT.platform.os
    || context.arch !== CONTRACT.platform.arch
    || libc !== CONTRACT.platform.libc
  ) {
    unexpected.push({
      diagnosticClass: 'TOOLCHAIN_OR_PLATFORM_REVIEW_REQUIRED',
      context: { ...context, libc },
    });
  }

  for (const problem of problems) {
    const exception = CONTRACT.exceptions.find((candidate) =>
      problem.type === 'invalid'
      && problem.package === candidate.package
      && problem.version === candidate.installedVersion
    );
    const invalidNode = exception && invalidNodes.find((candidate) =>
      candidate.package === exception.package
      && candidate.version === exception.installedVersion
      && candidate.requiredVersion === exception.requiredVersion
      && candidate.path === exception.dependencyPath.join(' > ')
    );
    if (exception && invalidNode) accepted.push({ ...exception, path: invalidNode.path });
    else unexpected.push(problem);
  }

  const stale = CONTRACT.exceptions.filter((exception) =>
    !accepted.some((item) => item.package === exception.package)
  );
  return { accepted, unexpected, stale };
}

function runtimeContext() {
  const report = process.report?.getReport?.();
  return {
    platform: process.platform,
    arch: process.arch,
    libc: report?.header?.glibcVersionRuntime ? 'glibc' : 'unknown',
    nodeVersion: process.version,
    npmVersion: spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], {
      encoding: 'utf8',
    }).stdout.trim(),
  };
}

function main() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['ls', '--all', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  let tree;
  try {
    tree = JSON.parse(result.stdout);
  } catch {
    throw new Error('npm ls did not produce parseable JSON.');
  }
  const verification = verifyDependencyTree(tree, runtimeContext(), ROOT);
  if (verification.unexpected.length > 0) {
    throw new Error(`Unexpected dependency-tree diagnostics: ${JSON.stringify(verification.unexpected)}`);
  }
  if (verification.stale.length > 0) {
    throw new Error(`Dependency-tree exception is stale and may be removed: ${verification.stale.map((item) => item.package).join(', ')}`);
  }
  if (result.status === 0 && verification.accepted.length > 0) {
    throw new Error('npm ls no longer reports the documented exceptions; remove the stale allowlist.');
  }
  console.log(`Dependency tree verified: ${verification.accepted.length} exact optional Sharp/musl exceptions accepted.`);
  console.log(`Context: Node ${process.version}, npm ${runtimeContext().npmVersion}, ${process.platform}/${process.arch}/glibc.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
