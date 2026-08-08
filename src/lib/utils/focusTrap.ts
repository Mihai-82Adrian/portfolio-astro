/**
 * Svelte action: traps Tab focus inside `node` and restores focus to whatever was focused before
 * the node mounted, when the node unmounts. Pair with an `{#if open}` block around the dialog
 * element — Svelte's own mount/destroy lifecycle then does the open/close bookkeeping for free.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el: HTMLElement): boolean {
  return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
}

function focusables(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

export function focusTrap(node: HTMLElement) {
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const first = focusables(node)[0];
  (first ?? node).focus();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const els = focusables(node);
    if (els.length === 0) {
      event.preventDefault();
      return;
    }
    const firstEl = els[0];
    const lastEl = els[els.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === firstEl || !node.contains(active)) {
        event.preventDefault();
        lastEl.focus();
      }
    } else if (active === lastEl || !node.contains(active)) {
      event.preventDefault();
      firstEl.focus();
    }
  }

  node.addEventListener('keydown', handleKeydown);

  return {
    destroy() {
      node.removeEventListener('keydown', handleKeydown);
      previouslyFocused?.focus();
    },
  };
}
