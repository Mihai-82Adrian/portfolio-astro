// Phase 2D-C Wave 6: RunwayApp.svelte's localStorage persistence effect ran on component
// init (before onMount's restore), silently clobbering a prior session's saved scenarios with
// the pre-restore default values on every page load (Wave 2 register SIXTOOL-01, "unverified
// persistence gap"). Root cause: an unguarded reactive `$:` write races onMount. Locks the
// fix, which mirrors the restored-gated idiom the other Fin-Tools already use (e.g.
// InvestmentApp.svelte's `if (!restored) return;`).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const source = readFileSync(path.join(ROOT, 'src/components/tools/runway/RunwayApp.svelte'), 'utf8');

test('RunwayApp.svelte declares a restored flag, set only after onMount finishes restoring', () => {
  assert.match(source, /let\s+restored\s*=\s*false/);
  const onMountIdx = source.indexOf('onMount(');
  const restoredTrueIdx = source.indexOf('restored = true');
  assert.ok(onMountIdx > -1 && restoredTrueIdx > -1, 'both must be present');
  assert.ok(restoredTrueIdx > onMountIdx, '`restored` must be set true inside onMount, after the restore attempt');
});

test('RunwayApp.svelte never writes to localStorage before the initial restore completes', () => {
  // The exact bug: `$: { localStorage.setItem(...) }` with no guard fires during Svelte's
  // initial synchronous render pass (before onMount), overwriting any stored prior session
  // with the just-created default scenarios.
  assert.doesNotMatch(
    source,
    /\$:\s*\{\s*try\s*\{\s*localStorage\.setItem\(STORAGE_KEY/,
    'the persistence reactive block must not be unconditional — it must check `restored` first',
  );
  assert.match(
    source,
    /\$:\s*if\s*\(restored\)\s*\{[\s\S]*?localStorage\.setItem\(STORAGE_KEY/,
    'the persistence reactive block must be gated on `restored`',
  );
});
