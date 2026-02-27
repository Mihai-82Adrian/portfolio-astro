<script lang="ts">
  import { Play } from 'lucide-svelte';
  import type { MonteCarloResult } from '@/lib/investment/types';
  import InvestmentChart from './InvestmentChart.svelte';

  let {
    initialInvestment,
    cumulativeValues,
    years,
    mcResult,
    isRunning,
    onRun,
    onChartReady,
  }: {
    initialInvestment: number;
    cumulativeValues:  number[];
    years:             string[];
    mcResult:          MonteCarloResult | null;
    isRunning:         boolean;
    onRun:             () => void;
    onChartReady?:     (getImage: () => string | null) => void;
  } = $props();

  function eur(v: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  function pct(v: number): string {
    return `${v.toFixed(1).replace('.', ',')} %`;
  }
</script>

<div class="space-y-5">
  <!-- Run button + explanation -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
          Monte-Carlo-Simulation (1.000 Pfade)
        </h3>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
          Simuliert 1.000 mögliche Wertentwicklungen basierend auf der historischen Volatilität
          der eingegebenen Cashflows. Ergebnis: P5 (Worst Case), P50 (Median), P95 (Best Case).
        </p>
      </div>
      <button
        type="button"
        onclick={onRun}
        disabled={isRunning || cumulativeValues.length === 0}
        class="flex shrink-0 items-center gap-2 rounded-xl bg-eucalyptus-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-eucalyptus-700 disabled:cursor-wait disabled:opacity-60 dark:bg-eucalyptus-500 dark:hover:bg-eucalyptus-400"
      >
        {#if isRunning}
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Simuliert…
        {:else}
          <Play size={14} />
          Simulation starten
        {/if}
      </button>
    </div>
  </div>

  <!-- Chart with MC overlay -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
    <h3 class="mb-4 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      Wertentwicklung mit Simulationspfaden
    </h3>
    <InvestmentChart
      {initialInvestment}
      {cumulativeValues}
      {years}
      monteCarloResult={mcResult}
      {onChartReady}
    />
    {#if !mcResult}
      <p class="mt-2 text-center text-xs text-text-muted-light dark:text-text-muted-dark">
        Starten Sie die Simulation, um das Konfidenzband anzuzeigen.
      </p>
    {/if}
  </div>

  <!-- Results -->
  {#if mcResult}
    <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
      <h3 class="mb-4 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
        Simulationsergebnisse (Schlusswert)
      </h3>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">P5 (Worst Case)</p>
          <p class="text-lg font-bold text-red-600 dark:text-red-400">
            {eur(mcResult.percentile5[mcResult.percentile5.length - 1])}
          </p>
        </div>

        <div class="rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">P50 (Median)</p>
          <p class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
            {eur(mcResult.percentile50[mcResult.percentile50.length - 1])}
          </p>
        </div>

        <div class="rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">P95 (Best Case)</p>
          <p class="text-lg font-bold text-eucalyptus-700 dark:text-eucalyptus-400">
            {eur(mcResult.percentile95[mcResult.percentile95.length - 1])}
          </p>
        </div>

        <div class="rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">Gewinnwahrscheinlichkeit</p>
          <p class="text-lg font-bold {mcResult.probPositive >= 50 ? 'text-eucalyptus-700 dark:text-eucalyptus-400' : 'text-red-600 dark:text-red-400'}">
            {pct(mcResult.probPositive)}
          </p>
        </div>
      </div>

      <div class="mt-3 rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
        <p class="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">Erwarteter Schlusswert (Ø aller Pfade)</p>
        <p class="text-xl font-bold text-eucalyptus-700 dark:text-eucalyptus-400">
          {eur(mcResult.expectedFinalValue)}
        </p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
          Entspricht {eur(mcResult.expectedFinalValue - initialInvestment)} Gewinn/Verlust gegenüber dem Einsatz
        </p>
      </div>
    </div>
  {/if}
</div>
