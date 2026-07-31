import assert from 'node:assert/strict';
import test from 'node:test';

const loadVerifier = () => import('../scripts/verify-dependency-tree.mjs');

test('dependency-tree verification flags the historical Astro-6-era Sharp/musl diagnostics as unexpected now that the Astro 7 graph declares no exceptions', async () => {
  // The Astro 7 dependency graph no longer selects a musl-variant optional platform
  // package on this glibc host, so config/dependency-tree-exceptions.json legitimately
  // declares zero exceptions (WAVEA-002). If these diagnostics ever reappear without a
  // reviewed contract update, they must surface as unexpected, not silently accepted.
  const { verifyDependencyTree } = await loadVerifier();
  const root = '/workspace';
  const tree = {
    name: 'portfolio-astro',
    version: '0.0.1',
    problems: [
      `invalid: @img/sharp-libvips-linuxmusl-x64@1.2.4 ${root}/node_modules/@img/sharp-libvips-linuxmusl-x64`,
      `invalid: @img/sharp-linuxmusl-x64@0.34.5 ${root}/node_modules/@img/sharp-linuxmusl-x64`,
    ],
    dependencies: {
      wrangler: {
        version: '4.114.0',
        dependencies: {
          miniflare: {
            version: '4.20260722.0',
            dependencies: {
              sharp: {
                version: '0.35.2',
                dependencies: {
                  '@img/sharp-libvips-linuxmusl-x64': {
                    version: '1.2.4',
                    invalid: '"1.3.1" from node_modules/miniflare/node_modules/sharp',
                  },
                  '@img/sharp-linuxmusl-x64': {
                    version: '0.34.5',
                    invalid: '"0.35.2" from node_modules/miniflare/node_modules/sharp',
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  const result = verifyDependencyTree(tree, {
    platform: 'linux',
    arch: 'x64',
    nodeVersion: 'v22.22.3',
    npmVersion: '11.16.0',
  }, root);
  assert.deepEqual(result.accepted, []);
  assert.equal(result.unexpected.length, 2);
  assert.deepEqual(result.stale, []);
});
test('dependency-tree verification fails new, missing, peer, changed, and stale diagnostics', async () => {
  const { verifyDependencyTree } = await loadVerifier();
  const context = {
    platform: 'linux',
    arch: 'x64',
    nodeVersion: 'v22.22.3',
    npmVersion: '11.16.0',
  };
  const clean = verifyDependencyTree({ name: 'portfolio-astro', problems: [], dependencies: {} }, context, '/workspace');
  assert.equal(clean.stale.length, 0);

  for (const problem of [
    'missing: package-x@1.0.0, required by root@1.0.0',
    'invalid: peer-package@2.0.0 /workspace/node_modules/peer-package',
    'invalid: @img/sharp-linuxmusl-x64@9.9.9 /workspace/node_modules/@img/sharp-linuxmusl-x64',
  ]) {
    const result = verifyDependencyTree({
      name: 'portfolio-astro',
      problems: [problem],
      dependencies: {},
    }, context, '/workspace');
    assert.ok(result.unexpected.length > 0);
  }
});
