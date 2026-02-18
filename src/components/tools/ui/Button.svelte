<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ click: MouseEvent }>();

  export let type: 'button' | 'submit' = 'button';
  export let variant: 'primary' | 'secondary' = 'primary';
  export let disabled = false;
</script>

<button
  {type}
  {disabled}
  on:click={(event) => dispatch('click', event)}
  class:list={[
    'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'primary'
      ? 'border border-eucalyptus-500/40 bg-eucalyptus-500 text-black hover:bg-eucalyptus-400 dark:text-dark-bg'
      : 'border border-black/10 bg-[var(--bg-elevated)] text-text-primary-light hover:border-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark dark:hover:border-eucalyptus-300/50',
  ]}
>
  <slot />
</button>
