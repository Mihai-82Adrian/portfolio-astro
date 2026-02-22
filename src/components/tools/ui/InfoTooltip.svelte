<script lang="ts">
  import { Info } from 'lucide-svelte';

  let open = false;
  let buttonEl: HTMLButtonElement;
  let tipStyle = '';

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    if (!open) position();
    open = !open;
  }

  function position() {
    if (!buttonEl) return;
    const r = buttonEl.getBoundingClientRect();
    const tipW = 280;
    // Center on button, clamp to viewport with 8px margin
    let left = r.left + r.width / 2 - tipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
    const bottomGap = window.innerHeight - r.top + 6;
    tipStyle = `position:fixed;bottom:${bottomGap}px;left:${left}px;width:${tipW}px;z-index:9999;`;
  }

  function close() { open = false; }
</script>

<svelte:window on:keydown={e => e.key === 'Escape' && close()} on:scroll={close} />

<span class="relative inline-flex items-center ml-1.5">
  <button
    type="button"
    bind:this={buttonEl}
    on:click={toggle}
    aria-expanded={open}
    aria-label="Erklärung anzeigen"
    class="inline-flex items-center justify-center rounded-full p-0.5 text-text-muted-light transition-colors hover:text-eucalyptus-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500/60 dark:text-text-muted-dark dark:hover:text-eucalyptus-400"
  >
    <Info size={14} aria-hidden="true" />
  </button>
</span>

{#if open}
  <!-- Backdrop -->
  <div class="fixed inset-0" style="z-index:9998;" on:click={close} aria-hidden="true"></div>

  <!-- Tooltip — rendered outside scroll containers via fixed positioning -->
  <div
    role="tooltip"
    style={tipStyle}
    class="rounded-xl border border-white/10 bg-gray-900 px-4 py-3 shadow-2xl ring-1 ring-black/20"
  >
    <!-- Caret (decorative) -->
    <div class="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-gray-900"></div>
    <div class="text-xs leading-relaxed text-gray-200">
      <slot />
    </div>
  </div>
{/if}
