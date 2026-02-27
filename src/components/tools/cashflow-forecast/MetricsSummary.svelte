<script lang="ts">
  import type { MonthlyDataPoint } from '@/lib/cashflow/types';
  import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-svelte';

  let { baseData, initialCash }: { baseData: MonthlyDataPoint[]; initialCash: number } = $props();

  const eur = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const endBalance      = $derived(baseData.at(-1)?.cumulative ?? initialCash);
  const minBalance      = $derived(baseData.length ? Math.min(...baseData.map(d => d.cumulative)) : initialCash);
  const minBalanceMonth = $derived(baseData.find(d => d.cumulative === minBalance)?.month ?? '—');
  const totalRevenue    = $derived(baseData.reduce((s, d) => s + d.revenue, 0));
  const totalCosts      = $derived(baseData.reduce((s, d) => s + d.costs, 0));

  // Break-even: first month where cumulative exceeds initial cash (positive momentum)
  const breakEvenMonth  = $derived(
    baseData.find((d, i) => i > 0 && d.net > 0)?.month ?? null
  );

  const endPositive = $derived(endBalance >= initialCash);
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
  <!-- End Balance -->
  <div class="rounded-xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10">
    <div class="mb-1 flex items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      {#if endPositive}
        <TrendingUp size={13} class="text-eucalyptus-500" />
      {:else}
        <TrendingDown size={13} class="text-red-500" />
      {/if}
      Endbestand (M12)
    </div>
    <p class="text-lg font-bold {endPositive ? 'text-eucalyptus-600 dark:text-eucalyptus-400' : 'text-red-500'}">
      {eur(endBalance)}
    </p>
  </div>

  <!-- Minimum balance -->
  <div class="rounded-xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10">
    <div class="mb-1 flex items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      <AlertTriangle size={13} class="{minBalance < 0 ? 'text-red-500' : 'text-warning-DEFAULT'}" />
      Tiefpunkt
    </div>
    <p class="text-lg font-bold {minBalance < 0 ? 'text-red-500' : 'text-text-primary-light dark:text-text-primary-dark'}">
      {eur(minBalance)}
    </p>
    <p class="mt-0.5 text-[10px] text-text-secondary-light dark:text-text-secondary-dark">{minBalanceMonth}</p>
  </div>

  <!-- Total revenue -->
  <div class="rounded-xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10">
    <div class="mb-1 flex items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      <TrendingUp size={13} class="text-eucalyptus-500" />
      Einnahmen (12M)
    </div>
    <p class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
      {eur(totalRevenue)}
    </p>
  </div>

  <!-- First profitable month -->
  <div class="rounded-xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10">
    <div class="mb-1 flex items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      <Target size={13} class="text-eucalyptus-500" />
      Erster Gewinnmonat
    </div>
    <p class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
      {breakEvenMonth ?? '—'}
    </p>
    {#if !breakEvenMonth && baseData.length}
      <p class="mt-0.5 text-[10px] text-red-500">Kein profitabler Monat in 12M</p>
    {/if}
  </div>
</div>
