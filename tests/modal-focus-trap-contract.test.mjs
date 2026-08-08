// Phase 5-D1D: permanent regression guard for MODAL-FOCUS-TRAP-P1 and BLOCKFORM-SCROLL-P1
// (Phase 5-C VISUAL_FINDINGS.tsv). Source-level contract, mirroring this repo's existing pattern
// of asserting the fix mechanism is present rather than re-driving a full browser session in the
// permanent suite (real keyboard/scroll behavior was independently verified live via Chrome
// DevTools MCP against the built preview, see BROWSER logs in the evidence package).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

const FOCUS_TRAP = read('src/lib/utils/focusTrap.ts');

test('focusTrap.ts moves focus into the node, traps Tab in both directions, and restores focus on destroy', () => {
  assert.match(FOCUS_TRAP, /previouslyFocused\s*=\s*document\.activeElement/, 'must capture the pre-open activeElement to restore later');
  assert.match(FOCUS_TRAP, /\(first\s*\?\?\s*node\)\.focus\(\)/, 'must move focus into the trapped node on mount');
  assert.match(FOCUS_TRAP, /event\.key !== 'Tab'/, 'must handle Tab specifically');
  assert.match(FOCUS_TRAP, /event\.shiftKey/, 'must handle the Shift+Tab (backwards) direction separately from Tab');
  assert.match(FOCUS_TRAP, /destroy\(\)\s*\{[\s\S]*previouslyFocused\?\.focus\(\)/, 'destroy() must restore focus to the pre-open element');
});

for (const [label, relPath] of [
  ['investment-analytics MethodologyModal', 'src/components/tools/investment-analytics/MethodologyModal.svelte'],
  ['runway MethodologyModal', 'src/components/tools/runway/MethodologyModal.svelte'],
  ['cashflow-forecast BlockFormModal', 'src/components/tools/cashflow-forecast/BlockFormModal.svelte'],
]) {
  test(`${label}: imports and applies the shared focusTrap action on its role="dialog" element`, () => {
    const source = read(relPath);
    assert.match(source, /import\s*\{\s*focusTrap\s*\}\s*from\s*['"]@\/lib\/utils\/focusTrap['"]/, `${relPath} must import focusTrap`);
    const dialogBlock = source.slice(source.search(/role="dialog"/) - 400, source.search(/role="dialog"/) + 300);
    assert.match(dialogBlock, /use:focusTrap/, `${relPath}'s role="dialog" element must carry use:focusTrap`);
  });
}

const MODAL_ASTRO = read('src/components/ui/Modal.astro');

test('Modal.astro (Timeline/experience) ModalController traps Tab and restores focus to the trigger on close', () => {
  assert.match(MODAL_ASTRO, /private lastFocused: HTMLElement \| null = null/, 'must track the trigger element');
  assert.match(MODAL_ASTRO, /this\.lastFocused = document\.activeElement/, 'open() must capture the trigger');
  assert.match(MODAL_ASTRO, /e\.key !== 'Tab'/, 'keydown handler must branch on Tab');
  assert.match(MODAL_ASTRO, /e\.shiftKey/, 'must handle Shift+Tab separately');
  assert.match(MODAL_ASTRO, /this\.lastFocused\?\.focus\(\)/, 'close() must restore focus to the trigger');
});

const BLOCK_FORM_MODAL = read('src/components/tools/cashflow-forecast/BlockFormModal.svelte');

test('BlockFormModal panel has a bounded max-height and its own internal scroll owner', () => {
  const panelClassMatch = BLOCK_FORM_MODAL.match(/<div\s+class="([^"]*fixed bottom-0[^"]*)"/);
  assert.ok(panelClassMatch, 'expected the fixed bottom-0 panel div');
  assert.match(panelClassMatch[1], /max-h-\[85vh\]/, 'panel must cap its own height so it cannot grow off-screen (regression: BLOCKFORM-SCROLL-P1)');
  assert.match(panelClassMatch[1], /overflow-y-auto/, 'panel must own its internal scroll so Tab-focused fields auto-scroll into view');
});

test('BlockFormModal does not invent new Escape-close semantics (no prior Escape handler existed for this dialog)', () => {
  assert.doesNotMatch(BLOCK_FORM_MODAL, /svelte:window[^>]*onkeydown/, 'documented exception (see MODAL_FOCUS_SCOPE.md): this dialog never had Escape-close; only Tab-trap/scroll were in scope for this fix');
});
