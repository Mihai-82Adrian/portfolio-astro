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
  export let valid = false;

  $: inputClass = [
    'w-full rounded-lg border bg-[var(--bg-elevated)] px-3 py-2.5 pr-10 text-sm text-text-primary-light transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500/40 dark:text-text-primary-dark',
    error
      ? 'border-red-500/60 focus:border-red-500'
      : valid
        ? 'border-eucalyptus-500/60 focus:border-eucalyptus-500 dark:border-eucalyptus-400/70 dark:focus:border-eucalyptus-300'
        : 'border-black/10 focus:border-eucalyptus-500 dark:border-white/10 dark:focus:border-eucalyptus-300',
  ].join(' ');
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
      class={inputClass}
    />
    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted-light dark:text-text-muted-dark">
      EUR
    </span>
  </div>
  <FieldError id={`${id}-error`} message={error} />
</div>
