<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RunwayScenario, RunwayProjection } from '@/lib/fin-core/runway';

  export let scenarios: RunwayScenario[];
  export let projections: RunwayProjection[];
  export let activeTab: number;

  const dispatch = createEventDispatcher<{ change: number }>();

  const scenarioColors = [
    // pessimistisch
    'border-red-500/50 text-red-600 dark:text-red-400',
    // realistisch
    'border-eucalyptus-500/60 text-eucalyptus-700 dark:text-eucalyptus-300',
    // optimistisch
    'border-blue-500/50 text-blue-600 dark:text-blue-400',
  ];

  const scenarioBadgeColors = [
    'bg-red-500/15',
    'bg-eucalyptus-500/15',
    'bg-blue-500/15',
  ];
</script>

<div
  class="flex gap-1 rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-1 dark:border-white/10"
  role="tablist"
  aria-label="Szenarien"
>
  {#each scenarios as scenario, i (scenario.id)}
    {@const proj = projections[i]}
    {@const isActive = i === activeTab}
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onclick={() => dispatch('change', i)}
      class="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 text-center transition-all duration-200 {isActive
        ? `border ${scenarioColors[i]} ${scenarioBadgeColors[i]} font-semibold shadow-sm`
        : 'text-text-muted-light hover:text-text-secondary-light dark:text-text-muted-dark dark:hover:text-text-secondary-dark'}"
    >
      <span class="text-sm leading-tight">{scenario.name}</span>
      {#if proj}
        <span class="text-xs tabular-nums opacity-80">
          {proj.runwayMonths >= 36 ? '36+' : proj.runwayMonths} Mo.
        </span>
      {/if}
    </button>
  {/each}
</div>
