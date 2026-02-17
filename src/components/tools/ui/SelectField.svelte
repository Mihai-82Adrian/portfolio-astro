<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FieldError from '@/components/tools/ui/FieldError.svelte';

  const dispatch = createEventDispatcher<{ change: string }>();

  export type SelectOption = {
    value: string;
    label: string;
  };

  export let id: string;
  export let label: string;
  export let value = '';
  export let options: SelectOption[] = [];
  export let error: string | undefined;
</script>

<div class="space-y-1.5">
  <label for={id} class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
    {label}
  </label>
  <select
    id={id}
    name={id}
    bind:value
    aria-invalid={error ? 'true' : 'false'}
    aria-describedby={error ? `${id}-error` : undefined}
    on:change={() => dispatch('change', value)}
    class="w-full rounded-lg border border-black/10 bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-text-primary-light transition-colors duration-200 focus:border-eucalyptus-500 dark:border-white/10 dark:text-text-primary-dark dark:focus:border-eucalyptus-300"
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  <FieldError id={`${id}-error`} message={error} />
</div>
