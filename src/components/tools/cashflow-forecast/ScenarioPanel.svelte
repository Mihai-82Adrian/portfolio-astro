<script lang="ts">
  import { Zap, Lock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-svelte';
  import type { StressScenarioResult, MonthlyDataPoint } from '@/lib/cashflow/types';
  import { findInsolvencyMonth, additionalCapitalNeeded } from '@/lib/cashflow/types';

  let {
    scenarioResult,
    weeklyLocked,
    cooldownLabel,
    isGenerating,
    errorMessage,
    hasBlocks,
    onGenerate,
  }: {
    scenarioResult: StressScenarioResult | null;
    weeklyLocked: boolean;
    cooldownLabel: string;
    isGenerating: boolean;
    errorMessage: string | null;
    hasBlocks: boolean;
    onGenerate: () => void;
  } = $props();

  let expanded = $state<Record<string, boolean>>({});

  function toggle(type: string) {
    expanded[type] = !expanded[type];
  }

  const scenarioColors: Record<string, string> = {
    late_payment: 'text-amber-600 dark:text-amber-400',
    churn_spike:  'text-red-600 dark:text-red-400',
    cost_shock:   'text-purple-600 dark:text-purple-400',
  };

  const scenarioBorders: Record<string, string> = {
    late_payment: 'border-amber-500/30',
    churn_spike:  'border-red-500/30',
    cost_shock:   'border-purple-500/30',
  };

  const eur = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
</script>

<div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
  <div class="mb-4 flex items-center gap-2">
    <Zap size={16} class="text-eucalyptus-600 dark:text-eucalyptus-400" />
    <h3 class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      KI-Stresstest
    </h3>
  </div>

  <p class="mb-4 text-xs text-text-secondary-light dark:text-text-secondary-dark">
    Die KI analysiert Ihr Modell und simuliert drei kritische Krisenszenarien:
    Zahlungsverzug, Kundenverlust und Kostenschock.
  </p>

  <!-- CTA button -->
  {#if !scenarioResult}
    {#if weeklyLocked}
      <div class="flex items-center gap-2 rounded-xl border border-black/10 bg-black/5 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <Lock size={14} class="shrink-0 text-text-secondary-light dark:text-text-secondary-dark" />
        <p class="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Wochenlimit erreicht. Nächste Auswertung in <strong>{cooldownLabel}</strong>.
        </p>
      </div>
    {:else}
      <button
        type="button"
        onclick={onGenerate}
        disabled={isGenerating || !hasBlocks}
        class="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all {isGenerating || !hasBlocks
          ? 'cursor-not-allowed bg-black/10 text-text-muted-light dark:bg-white/10 dark:text-text-muted-dark'
          : 'bg-eucalyptus-600 text-white hover:bg-eucalyptus-700 dark:bg-eucalyptus-500 dark:hover:bg-eucalyptus-400'}"
      >
        {#if isGenerating}
          <span class="flex items-center justify-center gap-2">
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Szenarien werden berechnet…
          </span>
        {:else if !hasBlocks}
          Zuerst Positionen hinzufügen
        {:else}
          Szenario-Stresstest starten
        {/if}
      </button>
    {/if}
  {/if}

  <!-- Error -->
  {#if errorMessage}
    <p class="mt-3 flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-50 px-3 py-2.5 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
      <AlertTriangle size={13} class="shrink-0" />
      {errorMessage}
    </p>
  {/if}

  <!-- Scenario results -->
  {#if scenarioResult}
    <div class="space-y-3">
      {#each scenarioResult.scenarios as sc}
        {@const insolvencyIdx = findInsolvencyMonth(sc.monthlyData)}
        {@const extraCapital  = additionalCapitalNeeded(sc.monthlyData)}

        <div class="rounded-xl border {scenarioBorders[sc.type] ?? 'border-black/10'} bg-[var(--bg-primary)] dark:border-opacity-50">
          <!-- Scenario header -->
          <button
            type="button"
            onclick={() => toggle(sc.type)}
            class="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold {scenarioColors[sc.type] ?? 'text-text-primary-light dark:text-text-primary-dark'}">
                {sc.title}
              </p>
              <p class="mt-0.5 text-xs text-text-secondary-light dark:text-text-secondary-dark line-clamp-2">
                {sc.narrative}
              </p>
            </div>
            <svelte:component this={expanded[sc.type] ? ChevronUp : ChevronDown} size={15} class="mt-0.5 shrink-0 text-text-secondary-light dark:text-text-secondary-dark" />
          </button>

          <!-- Insolvency warning -->
          {#if insolvencyIdx >= 0}
            <div class="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-50 px-3 py-2.5 dark:bg-red-500/10">
              <AlertTriangle size={14} class="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <p class="text-xs font-medium text-red-600 dark:text-red-400">
                Achtung: In diesem Szenario droht Insolvenz in Monat {insolvencyIdx + 1}
                ({sc.monthlyData[insolvencyIdx].month}).
                Zusätzlicher Kapitalbedarf: <strong>{eur(extraCapital)}</strong>.
              </p>
            </div>
          {:else}
            <div class="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-eucalyptus-500/20 bg-eucalyptus-50 px-3 py-2 dark:bg-eucalyptus-500/10">
              <CheckCircle2 size={13} class="shrink-0 text-eucalyptus-600 dark:text-eucalyptus-400" />
              <p class="text-xs text-eucalyptus-700 dark:text-eucalyptus-300">
                Liquidität bleibt in diesem Szenario positiv.
              </p>
            </div>
          {/if}

          <!-- Expanded monthly table -->
          {#if expanded[sc.type]}
            <div class="border-t border-black/5 px-4 pb-3 pt-2 dark:border-white/5">
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="text-text-secondary-light dark:text-text-secondary-dark">
                      <th class="pb-1.5 text-left font-medium">Monat</th>
                      <th class="pb-1.5 text-right font-medium">Einnahmen</th>
                      <th class="pb-1.5 text-right font-medium">Kosten</th>
                      <th class="pb-1.5 text-right font-medium">Liquidität</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-black/5 dark:divide-white/5">
                    {#each sc.monthlyData as row}
                      <tr class="{row.cumulative < 0 ? 'bg-red-50 dark:bg-red-500/8' : ''}">
                        <td class="py-1 pr-2 text-text-primary-light dark:text-text-primary-dark">{row.month}</td>
                        <td class="py-1 pr-2 text-right text-eucalyptus-600 dark:text-eucalyptus-400">{eur(row.revenue)}</td>
                        <td class="py-1 pr-2 text-right text-red-500">{eur(row.costs)}</td>
                        <td class="py-1 text-right font-semibold {row.cumulative < 0 ? 'text-red-600 dark:text-red-400' : 'text-text-primary-light dark:text-text-primary-dark'}">{eur(row.cumulative)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>
      {/each}

      <!-- Regenerate -->
      <button
        type="button"
        onclick={onGenerate}
        disabled={isGenerating || weeklyLocked}
        class="mt-1 text-xs text-text-secondary-light underline underline-offset-2 hover:text-text-primary-light disabled:cursor-not-allowed disabled:opacity-40 dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
      >
        {weeklyLocked ? `Gesperrt noch ${cooldownLabel}` : 'Neuen Stresstest generieren'}
      </button>
    </div>
  {/if}

  <!-- Weekly limit notice -->
  {#if !scenarioResult}
    <p class="mt-3 text-[10px] text-text-muted-light dark:text-text-muted-dark">
      Limit: 1 Stresstest pro Woche. Für mehrere Szenarien steht ein
      <a href="/services" class="underline underline-offset-2 hover:text-eucalyptus-600 dark:hover:text-eucalyptus-400">1:1 Strategiegespräch</a>
      zur Verfügung.
    </p>
  {/if}
</div>
