<script lang="ts">
  export let id: string;
  export let message: string | undefined;
</script>

{#if message}
  <p id={id} class="mt-1 text-xs text-error" role="status" aria-live="polite">{message}</p>
{/if}
