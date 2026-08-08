// Phase 5-D1D: permanent regression guard for BUTTON-DISABLED-INVISIBLE-P1 (Phase 5-C
// VISUAL_FINDINGS.tsv). Button.astro's disabled/loading opacity+cursor classes were computed once
// at Astro's SSR render time from the disabled/loading props; a caller that toggles the native
// `disabled` DOM property at runtime (SampleReviewForm.astro's in-flight submit state) got zero
// visual change — the disabled state was live but invisible. Fixed with a CSS rule keyed to the
// live `:disabled` pseudo-class / `[aria-disabled="true"]` attribute, which reflects the DOM state
// regardless of when or how it was set.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const BUTTON_SOURCE = readFileSync(path.join(ROOT, 'src/components/ui/Button.astro'), 'utf8');

test('Button.astro has a CSS rule keyed to the live :disabled / aria-disabled state, not only the SSR-computed class list', () => {
  const styleBlock = BUTTON_SOURCE.slice(BUTTON_SOURCE.indexOf('<style>'));
  assert.match(
    styleBlock,
    /\.btn:disabled[\s\S]{0,80}\.btn\[aria-disabled="true"\][\s\S]{0,40}\{[^}]*opacity-50[^}]*cursor-not-allowed/,
    'Regression: .btn:disabled / .btn[aria-disabled="true"] must apply opacity-50 + cursor-not-allowed, so a button disabled at runtime (after Astro\'s initial render) still looks disabled — this was the reproduction for BUTTON-DISABLED-INVISIBLE-P1 (SampleReviewForm.astro sets submitButton.disabled = true via JS, well after the class:list-computed markup was already sent to the browser).',
  );
});

test('the existing SSR-time disabled/loading class:list branch is unchanged (both mechanisms must coexist, not replace each other)', () => {
  assert.match(BUTTON_SOURCE, /\(disabled \|\| loading\) && 'opacity-50 cursor-not-allowed'/, 'the initial-render class:list branch must remain — it still matters for the very first paint before any runtime script runs.');
});

test('dist/ build (when present) resolves a non-default opacity for a disabled button on a real route that renders a Button (compiled-output confirmation)', () => {
  const DIST = path.join(ROOT, 'dist');
  const routeFile = path.join(DIST, 'sample-struktur-pruefen/index.html');
  if (!existsSync(routeFile)) return; // source-level tests above are authoritative when no build is present
  // Astro inlines Button.astro's scoped <style> per-page here rather than only emitting it into a
  // shared dist/_astro/*.css chunk, so the built HTML itself (not just the external chunks) is the
  // correct place to look for the compiled rule.
  const html = readFileSync(routeFile, 'utf8');
  assert.match(
    html,
    /\.btn\[data-astro-cid-\w+\]:disabled,\.btn\[data-astro-cid-\w+\]\[aria-disabled=true\]\{[^}]*opacity:\.5/,
    'Expected the built page to resolve a .btn[data-astro-cid-*]:disabled,.btn[data-astro-cid-*][aria-disabled=true] rule with opacity:.5.',
  );
});
