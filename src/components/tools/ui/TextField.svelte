<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FieldError from "@/components/tools/ui/FieldError.svelte";
  import InfoTooltip from "@/components/tools/ui/InfoTooltip.svelte";

  const dispatch = createEventDispatcher<{ input: string; change: string }>();

  export let id: string;
  export let label: string;
  export let value = "";
  export let placeholder = "";
  export let type: "text" | "email" | "date" = "text";
  export let required = false;
  export let autocomplete: import("svelte/elements").HTMLInputAttributes["autocomplete"] =
    "off";
  export let error: string | undefined;
  export let helpText: string | undefined;
  export let tooltip: string | undefined = undefined;
  export let valid = false;

  $: inputClass = [
    "w-full rounded-lg border bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-text-primary-light transition-colors duration-200 placeholder:text-text-tertiary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500/40 dark:text-text-primary-dark dark:placeholder:text-text-secondary-dark",
    error
      ? "border-red-500/60 focus:border-red-500"
      : valid
        ? "border-eucalyptus-500/60 focus:border-eucalyptus-500 dark:border-eucalyptus-400/70 dark:focus:border-eucalyptus-300"
        : "border-black/10 focus:border-eucalyptus-500 dark:border-white/10 dark:focus:border-eucalyptus-300",
  ].join(" ");
</script>

<div class="space-y-1.5">
  <label
    for={id}
    class="flex items-center text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark"
  >
    {label}
    {#if required}
      <span class="ml-1 text-eucalyptus-500 dark:text-eucalyptus-300">*</span>
    {/if}
    {#if tooltip}
      <InfoTooltip>{@html tooltip}</InfoTooltip>
    {/if}
  </label>
  <input
    {id}
    name={id}
    {type}
    bind:value
    {placeholder}
    {autocomplete}
    aria-invalid={error ? "true" : "false"}
    aria-describedby={error
      ? `${id}-error`
      : helpText
        ? `${id}-help`
        : undefined}
    on:input={() => dispatch("input", value)}
    on:change={() => dispatch("change", value)}
    class={inputClass}
  />
  {#if helpText}
    <p
      id={`${id}-help`}
      class="text-xs text-text-muted-light dark:text-text-muted-dark"
    >
      {helpText}
    </p>
  {/if}
  <FieldError id={`${id}-error`} message={error} />
</div>
