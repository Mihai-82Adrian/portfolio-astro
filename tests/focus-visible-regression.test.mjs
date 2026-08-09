import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Phase 5-D1E-R1 (Workstream C): FOCUS-VISIBLE-RING-INVALID-PROPERTY. Real-browser evidence (Tab
// navigation against the accepted D1E preview) proved that Footer/Card/Link/PostCard/PostMeta's
// invalid `ring`/`ring-color`/`ring-offset` declarations were harmless dead CSS — global.css's
// `a:focus-visible`/`button:focus-visible` rule already supplies a real, visible box-shadow ring
// regardless of that local block. This is a mechanism-agnostic behavioral regression: it asserts the
// actual visible-focus mechanism (global.css's rule) is present and that no compiled chunk still
// carries the invalid, inert `ring:`/`ring-offset:` properties — not a specific box-shadow value, so
// a future legitimate redesign of the ring's appearance does not spuriously break this test.

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST_ASTRO = path.join(ROOT, 'dist/_astro');

function findCssFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findCssFiles(full));
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

test('global.css supplies a real, visible focus-visible mechanism for links, buttons, and form controls', () => {
  const source = readFileSync(path.join(ROOT, 'src/styles/global.css'), 'utf8');
  assert.match(
    source,
    /a:focus-visible,\s*\n\s*button:focus-visible,\s*\n\s*input:focus-visible,\s*\n\s*textarea:focus-visible,\s*\n\s*select:focus-visible\s*\{\s*\n\s*@apply outline-none ring-2 ring-eucalyptus-500 ring-offset-2/,
    'global.css must keep an element-level focus-visible rule providing a real ring (box-shadow), independent of any per-component scoped rule.',
  );
});

test('no compiled chunk carries the invalid, inert ring/ring-offset focus-visible declarations', () => {
  const files = findCssFiles(DIST_ASTRO);
  assert.ok(files.length > 0, 'dist/_astro must contain compiled CSS (run `npm run build` first).');
  const offenders = files.filter((file) => /ring:\s*2px solid|ring-offset:\s*2px/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(offenders.map((file) => path.relative(ROOT, file)), []);
});

test('the five repaired components no longer declare the invalid ring properties at the source', () => {
  for (const file of [
    'src/components/layout/Footer.astro',
    'src/components/ui/Card.astro',
    'src/components/ui/Link.astro',
    'src/components/blog/PostCard.astro',
    'src/components/blog/PostMeta.astro',
  ]) {
    const source = readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(source, /\bring:\s*2px solid\b/, `${file} must not declare the invalid ring property.`);
  }
});
