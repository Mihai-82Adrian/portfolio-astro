<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FieldError from '@/components/tools/ui/FieldError.svelte';

  const dispatch = createEventDispatcher<{ input: number; change: number }>();

  export let id: string;
  export let label: string;
  export let value = 0;
  export let min = 0;
  export let step = 0.01;
  export let error: string | undefined;
</script>

<div class="space-y-1.5">
  <label for={id} class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
    {label}
  </label>
  <div class="relative">
    <input
      id={id}
      name={id}
      type="number"
      bind:value
      {min}
      {step}
      inputmode="decimal"
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${id}-error` : undefined}
      on:input={() => dispatch('input', value)}
      on:change={() => dispatch('change', value)}
      class="w-full rounded-lg border border-black/10 bg-[var(--bg-elevated)] px-3 py-2.5 pr-10 text-sm text-text-primary-light transition-colors duration-200 focus:border-eucalyptus-500 dark:border-white/10 dark:text-text-primary-dark dark:focus:border-eucalyptus-300"
    />
    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted-light dark:text-text-muted-dark">
      EUR
    </span>
  </div>
  <FieldError id={`${id}-error`} message={error} />
</div>
