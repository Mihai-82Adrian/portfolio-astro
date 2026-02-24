<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { Marked } from 'marked';

  let {
    report = '' as string,
    status = 'streaming' as 'submitting' | 'streaming' | 'complete' | 'error',
    errorMessage = null as string | null,
    onRestart = () => {},
  } = $props();

  let reportEl: HTMLElement | undefined = $state(undefined);

  // Configure marked with safe defaults (no raw HTML passthrough)
  const marked = new Marked({
    breaks: true,
    gfm: true,
  });

  // Sanitize HTML output — strip any raw HTML tags the LLM might produce
  function sanitizeHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  let renderedHtml = $derived(() => {
    if (!report) return '';
    const raw = marked.parse(report);
    if (typeof raw !== 'string') return '';
    return sanitizeHtml(raw);
  });

  // Auto-scroll as content streams in
  $effect(() => {
    if (report && reportEl && status === 'streaming') {
      reportEl.scrollTop = reportEl.scrollHeight;
    }
  });
</script>

<div
  class="mx-auto w-full max-w-2xl"
  in:fly={{ x: 60, duration: 320, easing: cubicOut }}
>
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-6 dark:border-white/10">

    <!-- Loading state -->
    {#if status === 'submitting'}
      <div class="flex flex-col items-center gap-4 py-12" in:fade={{ duration: 200 }}>
        <div class="flex gap-1.5">
          <span class="h-2.5 w-2.5 animate-bounce rounded-full bg-eucalyptus-500"></span>
          <span class="h-2.5 w-2.5 animate-bounce rounded-full bg-eucalyptus-500" style="animation-delay: 75ms"></span>
          <span class="h-2.5 w-2.5 animate-bounce rounded-full bg-eucalyptus-500" style="animation-delay: 150ms"></span>
        </div>
        <p class="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark animate-pulse">
          Analysiere Ihr Gründerprofil ...
        </p>
        <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
          Dies kann bis zu 30 Sekunden dauern.
        </p>
      </div>
    {/if}

    <!-- Report content (rendered Markdown) -->
    {#if status === 'streaming' || status === 'complete'}
      <div>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
            Ihr Gründerprofil
          </h2>
          {#if status === 'streaming'}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-eucalyptus-500/15 px-2.5 py-1 text-xs font-medium text-eucalyptus-700 dark:text-eucalyptus-300">
              <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-eucalyptus-500"></span>
              Wird generiert ...
            </span>
          {/if}
        </div>

        <div
          bind:this={reportEl}
          class="compass-report max-h-[65vh] overflow-y-auto"
        >
          {@html renderedHtml()}
        </div>

        {#if status === 'complete'}
          <div class="mt-6 flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/10" in:fade={{ duration: 300 }}>
            <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
              Ergebnis lokal gespeichert.
            </p>
            <button
              type="button"
              onclick={onRestart}
              class="rounded-xl px-4 py-2 text-sm font-medium text-eucalyptus-700 transition-colors hover:bg-eucalyptus-500/10 dark:text-eucalyptus-300 dark:hover:bg-eucalyptus-500/15"
            >
              Neues Profil erstellen
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Error state -->
    {#if status === 'error'}
      <div class="flex flex-col items-center gap-4 py-12" in:fade={{ duration: 200 }}>
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
          <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
          Auswertung fehlgeschlagen
        </p>
        <p class="max-w-sm text-center text-xs text-text-muted-light dark:text-text-muted-dark">
          {errorMessage || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}
        </p>
        <button
          type="button"
          onclick={onRestart}
          class="rounded-xl bg-eucalyptus-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-eucalyptus-700 dark:bg-eucalyptus-500 dark:hover:bg-eucalyptus-400"
        >
          Erneut versuchen
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Scoped typography for rendered Markdown report */
  .compass-report :global(h2) {
    font-size: 1.125rem;
    font-weight: 700;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
    border-bottom: 1px solid color-mix(in srgb, var(--color-eucalyptus-500) 25%, transparent);
    padding-bottom: 0.375rem;
  }

  .compass-report :global(h2:first-child) {
    margin-top: 0;
  }

  .compass-report :global(h3) {
    font-size: 1rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.375rem;
    color: var(--color-text-primary);
  }

  .compass-report :global(p) {
    font-size: 0.875rem;
    line-height: 1.625;
    margin-bottom: 0.75rem;
    color: var(--color-text-secondary);
  }

  .compass-report :global(strong) {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .compass-report :global(ul),
  .compass-report :global(ol) {
    font-size: 0.875rem;
    line-height: 1.625;
    margin-bottom: 0.75rem;
    padding-left: 1.25rem;
    color: var(--color-text-secondary);
  }

  .compass-report :global(ul) {
    list-style-type: disc;
  }

  .compass-report :global(ol) {
    list-style-type: decimal;
  }

  .compass-report :global(li) {
    margin-bottom: 0.375rem;
  }

  .compass-report :global(a) {
    color: var(--color-eucalyptus-700);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  :global(.dark) .compass-report :global(a) {
    color: var(--color-eucalyptus-300);
  }
</style>
