<script lang="ts">
  import { onMount } from 'svelte';
  import ScenarioTabs from './ScenarioTabs.svelte';
  import ScenarioEditor from './ScenarioEditor.svelte';
  import RunwayChart from './RunwayChart.svelte';
  import MetricsSummary from './MetricsSummary.svelte';
  import MethodologyModal from './MethodologyModal.svelte';
  import { AlertTriangle, BookOpen } from 'lucide-svelte';
  import {
    projectRunway,
    createDefaultScenarios,
    type RunwayScenario,
    type RunwayProjection,
  } from '@/lib/fin-core/runway';

  const STORAGE_KEY = 'tools.runway.scenarios.v1';

  let scenarios: RunwayScenario[] = createDefaultScenarios();
  let activeTab = 1; // Default: Realistisch
  let showGuide = false;

  // Restore from localStorage on mount
  onMount(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Re-hydrate Date objects
        scenarios = parsed.map((s: RunwayScenario) => ({
          ...s,
          startDate: new Date(s.startDate),
        }));
      }
    } catch {
      // Ignore parse errors — use defaults
    }
  });

  // Persist on every change
  $: {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    } catch {
      // Storage full or unavailable — ignore
    }
  }

  $: projections = scenarios.map(s => projectRunway(s, 36)) as RunwayProjection[];
  $: activeProjection = projections[activeTab];

  function handleTabChange(e: CustomEvent<number>) {
    activeTab = e.detail;
  }

  function handleScenarioUpdate(e: CustomEvent<RunwayScenario>) {
    scenarios = scenarios.map((s, i) =>
      i === activeTab ? e.detail : s
    );
  }

  function resetAll() {
    if (confirm('Alle Szenarien zurücksetzen? Die aktuellen Daten gehen verloren.')) {
      scenarios = createDefaultScenarios();
      localStorage.removeItem(STORAGE_KEY);
    }
  }
</script>

<div class="space-y-4">
  <!-- Header + Reset -->
  <div class="flex items-center justify-between">
    <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
      Daten werden lokal gespeichert — keine Serverübertragung.
    </p>
    <div class="flex items-center gap-3">
      <button
        type="button"
        on:click={() => (showGuide = true)}
        class="inline-flex items-center gap-1.5 text-xs text-text-muted-light dark:text-text-muted-dark transition-colors hover:text-eucalyptus-600 dark:hover:text-eucalyptus-400"
      >
        <BookOpen size={13} aria-hidden="true" />
        Methodik & Guide
      </button>
      <span class="text-white/15" aria-hidden="true">|</span>
      <button
        type="button"
        on:click={resetAll}
        class="text-xs text-text-muted-light underline-offset-2 hover:text-red-500 hover:underline dark:text-text-muted-dark transition-colors"
      >
        Zurücksetzen
      </button>
    </div>
  </div>

  <!-- Scenario Tabs -->
  <ScenarioTabs
    {scenarios}
    {projections}
    {activeTab}
    on:change={handleTabChange}
  />

  <!-- Bento Grid: Editor (left) + Chart + Metrics (right sticky) -->
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">

    <!-- Left: Scenario Editor -->
    <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
      <ScenarioEditor
        scenario={scenarios[activeTab]}
        on:update={handleScenarioUpdate}
      />
    </div>

    <!-- Right: Chart + Metrics (sticky) -->
    <div class="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">

      <!-- Death Valley Chart -->
      <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
          <span>Runway-Projektion</span>
          {#if activeProjection?.deathValleyMonth !== null}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
              <AlertTriangle size={11} aria-hidden="true" />
              Death Valley
            </span>
          {/if}
        </h2>
        {#if activeProjection}
          <RunwayChart projection={activeProjection} />
        {/if}
      </div>

      <!-- KPI Cards -->
      <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
        <h2 class="mb-3 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
          Kennzahlen
        </h2>
        {#if activeProjection}
          <MetricsSummary projection={activeProjection} />
        {/if}
      </div>

    </div>
  </div>
</div>

<MethodologyModal bind:open={showGuide} />
