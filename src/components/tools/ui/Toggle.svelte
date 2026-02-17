<script lang="ts">
  export let id: string;
  export let label: string;
  export let checked = false;
  export let description: string | undefined;
</script>

<div class="rounded-lg border border-black/10 bg-[var(--bg-elevated)] p-3 dark:border-white/10">
  <label for={id} class="flex cursor-pointer items-start justify-between gap-3">
    <span>
      <span class="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{label}</span>
      {#if description}
        <span class="mt-1 block text-xs text-text-muted-light dark:text-text-muted-dark">{description}</span>
      {/if}
    </span>
    <span class="relative mt-0.5 inline-flex h-6 w-11 items-center">
      <input id={id} type="checkbox" bind:checked class="peer sr-only" />
      <span class="absolute inset-0 rounded-full bg-black/10 transition-colors duration-200 peer-checked:bg-eucalyptus-500/70 dark:bg-white/15 dark:peer-checked:bg-eucalyptus-400/70"></span>
      <span class="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5 dark:bg-[var(--bg-primary)]"></span>
    </span>
  </label>
</div>
