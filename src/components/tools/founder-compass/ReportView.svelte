<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let {
    report = '' as string,
    status = 'streaming' as 'submitting' | 'streaming' | 'complete' | 'error',
    errorMessage = null as string | null,
    onRestart = () => {},
  } = $props();

  let reportEl: HTMLElement | undefined = $state(undefined);

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

    <!-- Report content -->
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
          class="prose prose-sm max-h-[60vh] overflow-y-auto text-text-primary-light dark:text-text-primary-dark"
        >
          <pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed">{report}</pre>
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
