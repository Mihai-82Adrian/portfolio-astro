<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FieldError from '@/components/tools/ui/FieldError.svelte';

  const dispatch = createEventDispatcher<{ input: string; change: string }>();

  export let id: string;
  export let label: string;
  export let value = '';
  export let placeholder = '';
  export let type: 'text' | 'email' | 'date' = 'text';
  export let required = false;
  export let autocomplete = 'off';
  export let error: string | undefined;
  export let helpText: string | undefined;
</script>

<div class="space-y-1.5">
  <label for={id} class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
    {label}
    {#if required}
      <span class="ml-1 text-eucalyptus-500 dark:text-eucalyptus-300">*</span>
    {/if}
  </label>
  <input
    id={id}
    name={id}
    {type}
    bind:value
    {placeholder}
    {autocomplete}
    aria-invalid={error ? 'true' : 'false'}
    aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
    on:input={() => dispatch('input', value)}
    on:change={() => dispatch('change', value)}
    class="w-full rounded-lg border border-black/10 bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-text-primary-light transition-colors duration-200 placeholder:text-text-tertiary-light focus:border-eucalyptus-500 dark:border-white/10 dark:text-text-primary-dark dark:placeholder:text-text-secondary-dark dark:focus:border-eucalyptus-300"
  />
  {#if helpText}
    <p id={`${id}-help`} class="text-xs text-text-muted-light dark:text-text-muted-dark">{helpText}</p>
  {/if}
  <FieldError id={`${id}-error`} message={error} />
</div>
