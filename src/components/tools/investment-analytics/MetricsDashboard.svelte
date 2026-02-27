<script lang="ts">
  import type { ReturnMetrics, RiskMetrics } from '@/lib/investment/types';

  let {
    returnMetrics,
    riskMetrics,
  }: {
    returnMetrics: ReturnMetrics;
    riskMetrics:   RiskMetrics;
  } = $props();

  function fmt(v: number, decimals = 1): string {
    return v.toFixed(decimals).replace('.', ',');
  }

  function eur(v: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  function pct(v: number, decimals = 1): string {
    return `${fmt(v, decimals)} %`;
  }

  const metricClass = 'rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10';
  const labelClass  = 'text-xs text-text-muted-light dark:text-text-muted-dark mb-1';
  const posClass    = 'text-xl font-bold text-eucalyptus-700 dark:text-eucalyptus-400';
  const negClass    = 'text-xl font-bold text-red-600 dark:text-red-400';
  const neutClass   = 'text-xl font-bold text-text-primary-light dark:text-text-primary-dark';

  function colorVal(v: number): string {
    if (v > 0) return posClass;
    if (v < 0) return negClass;
    return neutClass;
  }
</script>

<div class="space-y-5">
  <!-- Return Metrics -->
  <div>
    <h3 class="mb-3 text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">
      Rendite-Kennzahlen
    </h3>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class={metricClass}>
        <p class={labelClass}>ROI</p>
        <p class={colorVal(returnMetrics.roi)}>{pct(returnMetrics.roi)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Gesamtrendite</p>
      </div>

      <div class={metricClass}>
        <p class={labelClass}>CAGR</p>
        <p class={colorVal(returnMetrics.cagr)}>{pct(returnMetrics.cagr)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">p.a. annualisiert</p>
      </div>

      <div class={metricClass}>
        <p class={labelClass}>IRR</p>
        {#if returnMetrics.irr !== null}
          <p class={colorVal(returnMetrics.irr)}>{pct(returnMetrics.irr)}</p>
        {:else}
          <p class="text-xl font-bold text-text-muted-light dark:text-text-muted-dark">—</p>
        {/if}
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Interner Zinsfuß</p>
      </div>

      <div class={metricClass}>
        <p class={labelClass}>NPV</p>
        <p class={colorVal(returnMetrics.npv)}>{eur(returnMetrics.npv)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Kapitalwert</p>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div class={metricClass}>
        <p class={labelClass}>Amortisation</p>
        {#if returnMetrics.paybackYear !== null}
          <p class="text-xl font-bold text-eucalyptus-700 dark:text-eucalyptus-400">
            Jahr {returnMetrics.paybackYear}
          </p>
        {:else}
          <p class="text-xl font-bold text-red-600 dark:text-red-400">Nicht erreicht</p>
        {/if}
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Break-Even-Jahr</p>
      </div>
    </div>
  </div>

  <!-- Risk Metrics -->
  <div>
    <h3 class="mb-3 text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">
      Risiko-Kennzahlen
    </h3>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class={metricClass}>
        <p class={labelClass}>Sharpe Ratio</p>
        <p class={colorVal(riskMetrics.sharpeRatio)}>{fmt(riskMetrics.sharpeRatio, 2)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
          {riskMetrics.sharpeRatio >= 1 ? 'Gut' : riskMetrics.sharpeRatio >= 0.5 ? 'Akzeptabel' : 'Niedrig'}
        </p>
      </div>

      <div class={metricClass}>
        <p class={labelClass}>Sortino Ratio</p>
        <p class={colorVal(riskMetrics.sortinoRatio)}>{fmt(riskMetrics.sortinoRatio, 2)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Abwärtsrisiko</p>
      </div>

      <div class={metricClass}>
        <p class={labelClass}>Max. Drawdown</p>
        <p class={negClass}>{pct(riskMetrics.maxDrawdown)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Größter Verlust</p>
      </div>

      <div class={metricClass}>
        <p class={labelClass}>Volatilität p.a.</p>
        <p class={neutClass}>{pct(riskMetrics.annualizedVolatility)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Standardabweichung</p>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-3">
      <div class={metricClass}>
        <p class={labelClass}>VaR 95 %</p>
        <p class={negClass}>{eur(riskMetrics.var95)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Max. Verlust (95 % Konf.)</p>
      </div>

      <div class={metricClass}>
        <p class={labelClass}>VaR 99 %</p>
        <p class={negClass}>{eur(riskMetrics.var99)}</p>
        <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">Max. Verlust (99 % Konf.)</p>
      </div>
    </div>
  </div>
</div>
