import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('scripts/sync-katex-assets.mjs regenerates public/katex/ from the installed katex package only', () => {
  execFileSync('node', [path.join(ROOT, 'scripts/sync-katex-assets.mjs')], { cwd: ROOT });

  const generatedCss = readFileSync(path.join(ROOT, 'public/katex/katex.min.css'));
  const sourceCss = readFileSync(path.join(ROOT, 'node_modules/katex/dist/katex.min.css'));
  assert.deepEqual(generatedCss, sourceCss);

  const generatedFonts = readdirSync(path.join(ROOT, 'public/katex/fonts')).sort();
  const sourceFonts = readdirSync(path.join(ROOT, 'node_modules/katex/dist/fonts')).sort();
  assert.deepEqual(generatedFonts, sourceFonts);

  // The unused client-side JS bundles (and their non-global .replace() sanitization
  // findings) must never be regenerated into tracked/served source.
  for (const unused of ['katex.js', 'katex.mjs', 'katex.min.js', 'contrib']) {
    assert.equal(existsSync(path.join(ROOT, 'public/katex', unused)), false, unused);
  }
});
