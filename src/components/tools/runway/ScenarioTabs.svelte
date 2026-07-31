<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RunwayScenario, RunwayProjection } from '@/lib/fin-core/runway';

  export let scenarios: RunwayScenario[];
  export let projections: RunwayProjection[];
  export let activeTab: number;

  const dispatch = createEventDispatcher<{ change: number }>();

  function handleKeydown(event: KeyboardEvent, index: number) {
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % scenarios.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + scenarios.length) % scenarios.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = scenarios.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const tabs = (event.currentTarget as HTMLElement)
      .closest('[role="tablist"]')
      ?.querySelectorAll<HTMLElement>('[role="tab"]');
    dispatch('change', nextIndex);
    tabs?.[nextIndex]?.focus();
  }

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
  class="grid min-w-0 grid-cols-1 gap-1 rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-1 dark:border-white/10 sm:grid-cols-3"
  role="tablist"
  aria-label="Szenarien"
>
  {#each scenarios as scenario, i (scenario.id)}
    {@const proj = projections[i]}
    {@const isActive = i === activeTab}
    <button
      type="button"
      role="tab"
      id={`runway-tab-${scenario.id}`}
      aria-controls={`runway-panel-${scenario.id}`}
      aria-selected={isActive}
      tabindex={isActive ? 0 : -1}
      onclick={() => dispatch('change', i)}
      onkeydown={(event) => handleKeydown(event, i)}
      class="flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 text-center transition-all duration-200 [overflow-wrap:anywhere] {isActive
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
