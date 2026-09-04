import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const HELPER = path.join(ROOT, 'scripts/project-local-executable.mjs');

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'portfolio-local-bin-'));
  const packageRoot = path.join(root, 'node_modules', 'fixture-cli');
  const workingDirectory = path.join(root, 'working-directory');
  mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
  mkdirSync(workingDirectory);
  writeFileSync(path.join(root, 'package.json'), '{"name":"fixture-project","private":true}\n');
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    '{"name":"fixture-cli","version":"1.2.3","type":"module","bin":{"fixture":"bin/cli.mjs"}}\n',
  );
  writeFileSync(
    path.join(packageRoot, 'bin', 'cli.mjs'),
    [
      "import { fileURLToPath } from 'node:url';",
      "if (process.argv[2] === '--fail') process.exit(Number(process.argv[3]));",
      'process.stdout.write(JSON.stringify({',
      '  argv: process.argv.slice(2),',
      '  cwd: process.cwd(),',
      '  executable: fileURLToPath(import.meta.url),',
      '  token: process.env.LOCAL_BIN_TEST_TOKEN,',
      '}));',
      '',
    ].join('\n'),
  );
  return { root, packageRoot, workingDirectory };
}

test('project-local executable preserves ownership, arguments, cwd, environment, and child failure', () => {
  assert.equal(existsSync(HELPER), true, 'the fail-closed project-local executable helper must exist');
  return import(`${pathToFileURL(HELPER)}?test=${Date.now()}`).then(({ execProjectLocalBin }) => {
    const { root, packageRoot, workingDirectory } = fixture();
    try {
      const output = execProjectLocalBin(root, 'fixture-cli', 'fixture', ['value with spaces', '--literal=$HOME'], {
        cwd: workingDirectory,
        env: { ...process.env, LOCAL_BIN_TEST_TOKEN: 'preserved' },
        encoding: 'utf8',
      });
      const result = JSON.parse(output);
      assert.deepEqual(result.argv, ['value with spaces', '--literal=$HOME']);
      assert.equal(result.cwd, workingDirectory);
      assert.equal(result.token, 'preserved');
      assert.equal(result.executable, path.join(packageRoot, 'bin', 'cli.mjs'));

      assert.throws(
        () => execProjectLocalBin(root, 'fixture-cli', 'fixture', ['--fail', '23'], { stdio: 'pipe' }),
        (error) => error?.status === 23,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

test('missing or corrupt local packages fail without PATH, global, or npm-cache fallback', () => {
  assert.equal(existsSync(HELPER), true, 'the fail-closed project-local executable helper must exist');
  return import(`${pathToFileURL(HELPER)}?missing=${Date.now()}`).then(({ execProjectLocalBin }) => {
    const { root, packageRoot } = fixture();
    const fallbackRoot = path.join(root, 'fallbacks');
    const globalBin = path.join(fallbackRoot, 'global-bin');
    const cacheBin = path.join(fallbackRoot, 'npm-cache', '_npx', 'fixture', 'node_modules', 'fixture-cli', 'bin');
    const marker = path.join(root, 'fallback-ran');
    mkdirSync(globalBin, { recursive: true });
    mkdirSync(cacheBin, { recursive: true });
    const fallback = `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran');\n`;
    writeFileSync(path.join(globalBin, 'fixture'), fallback);
    writeFileSync(path.join(cacheBin, 'cli.mjs'), fallback);
    chmodSync(path.join(globalBin, 'fixture'), 0o755);

    const isolatedEnvironment = {
      ...process.env,
      PATH: globalBin,
      npm_config_cache: path.join(fallbackRoot, 'npm-cache'),
      npm_config_registry: 'http://127.0.0.1:9/',
    };
    try {
      rmSync(packageRoot, { recursive: true, force: true });
      assert.throws(
        () => execProjectLocalBin(root, 'fixture-cli', 'fixture', [], { env: isolatedEnvironment }),
        /project-local package.*fixture-cli/i,
      );
      assert.equal(existsSync(marker), false, 'a PATH/global/cache fallback must never execute');

      mkdirSync(packageRoot, { recursive: true });
      writeFileSync(
        path.join(packageRoot, 'package.json'),
        '{"name":"fixture-cli","version":"1.2.3","bin":{"fixture":"bin/missing.mjs"}}\n',
      );
      assert.throws(
        () => execProjectLocalBin(root, 'fixture-cli', 'fixture', [], { env: isolatedEnvironment }),
        /project-local executable.*fixture/i,
      );
      assert.equal(existsSync(marker), false, 'a corrupt local package must not trigger fallback acquisition');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

test('all audited release boundaries use the behavioral project-local executable contract', () => {
  for (const relative of [
    'scripts/verify-xrechnung-fixtures.mjs',
    'tests/pdf-exports.test.mjs',
    'tests/release-cross-date-reproducibility.test.mjs',
  ]) {
    const source = readFileSync(path.join(ROOT, relative), 'utf8');
    assert.match(source, /execProjectLocalBin/, `${relative} must use the guarded local executable`);
    assert.doesNotMatch(source, /execFileSync\(\s*['"]npx['"]/, `${relative} must not retain npm fallback`);
  }
});
