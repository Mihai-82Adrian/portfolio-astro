<script lang="ts">
  import type { TaxResult, InvestmentInput } from '@/lib/investment/types';
  import { TAX_RATE, VORABPAUSCHALE_RATE_2026 } from '@/lib/investment/types';

  let {
    taxResult,
    input,
  }: {
    taxResult: TaxResult;
    input:     InvestmentInput;
  } = $props();

  function eur(v: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  function pct(v: number): string {
    return `${v.toFixed(2).replace('.', ',')} %`;
  }
</script>

<div class="space-y-5">
  <!-- Tax breakdown -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
    <h3 class="mb-4 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      Abgeltungsteuer-Berechnung
    </h3>

    <div class="space-y-3">
      <!-- Gross gain -->
      <div class="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
        <span class="text-sm text-text-secondary-light dark:text-text-secondary-dark">Bruttogewinn</span>
        <span class="font-semibold {taxResult.grossGain >= 0 ? 'text-eucalyptus-700 dark:text-eucalyptus-400' : 'text-red-600 dark:text-red-400'}">
          {eur(taxResult.grossGain)}
        </span>
      </div>

      <!-- Freistellungsauftrag -->
      <div class="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
        <div>
          <span class="text-sm text-text-secondary-light dark:text-text-secondary-dark">Freistellungsauftrag</span>
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark">§ 20 Abs. 9 EStG</p>
        </div>
        <span class="font-semibold text-eucalyptus-700 dark:text-eucalyptus-400">
          − {eur(Math.min(input.personalFreibetrag, Math.max(0, taxResult.grossGain)))}
        </span>
      </div>

      <!-- Taxable gain -->
      <div class="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
        <span class="text-sm text-text-secondary-light dark:text-text-secondary-dark">Zu versteuernder Gewinn</span>
        <span class="font-semibold text-text-primary-light dark:text-text-primary-dark">
          {eur(taxResult.taxableGain)}
        </span>
      </div>

      <!-- Tax rate -->
      <div class="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
        <div>
          <span class="text-sm text-text-secondary-light dark:text-text-secondary-dark">Steuersatz</span>
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark">Abgeltungsteuer 25 % + 1,375 % Soli</p>
        </div>
        <span class="font-semibold text-text-primary-light dark:text-text-primary-dark">
          {pct(TAX_RATE * 100)}
        </span>
      </div>

      <!-- Tax amount -->
      <div class="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
        <span class="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Steuerbetrag</span>
        <span class="font-bold text-red-600 dark:text-red-400">
          − {eur(taxResult.taxAmount)}
        </span>
      </div>

      <!-- Net gain -->
      <div class="flex items-center justify-between pt-1">
        <span class="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">Nettogewinn nach Steuern</span>
        <span class="text-xl font-bold {taxResult.netGain >= 0 ? 'text-eucalyptus-700 dark:text-eucalyptus-400' : 'text-red-600 dark:text-red-400'}">
          {eur(taxResult.netGain)}
        </span>
      </div>
    </div>

    <!-- Effective rate badge -->
    {#if taxResult.grossGain > 0}
      <div class="mt-4 rounded-xl border border-eucalyptus-500/20 bg-eucalyptus-50 p-3 dark:bg-eucalyptus-500/10">
        <p class="text-xs text-eucalyptus-700 dark:text-eucalyptus-300">
          Effektiver Steuersatz: <strong>{pct(taxResult.effectiveTaxRate)}</strong> auf den Bruttogewinn
          {#if input.personalFreibetrag > 0}
            (Freistellungsauftrag von {eur(input.personalFreibetrag)} berücksichtigt)
          {/if}
        </p>
      </div>
    {:else if taxResult.grossGain < 0}
      <div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/30 dark:bg-red-900/10">
        <p class="text-xs text-red-700 dark:text-red-400">
          Kein steuerpflichtiger Gewinn — Investition im Verlust. Verlustvorträge können ggf. mit anderen Kapitalerträgen verrechnet werden.
        </p>
      </div>
    {/if}
  </div>

  <!-- Vorabpauschale -->
  {#if input.isFund && input.isAccumulating && taxResult.vorabpauschale !== undefined}
    <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
      <h3 class="mb-3 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
        Vorabpauschale (Thesaurierer)
      </h3>
      <p class="mb-3 text-xs text-text-muted-light dark:text-text-muted-dark">
        Jährliche fiktive Ausschüttung nach § 18 InvStG. Basiert auf dem Basiszins 2026
        ({pct(VORABPAUSCHALE_RATE_2026 * 100)} × TER-Korrektur).
      </p>

      <div class="flex items-center justify-between rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
        <div>
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark">Vorabpauschale p.a.</p>
          <p class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
            {eur(taxResult.vorabpauschale)}
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark">Steuer darauf</p>
          <p class="text-lg font-bold text-red-600 dark:text-red-400">
            {eur(taxResult.vorabpauschale * TAX_RATE)}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Legal disclaimer -->
  <div class="rounded-xl border border-black/5 bg-[var(--bg-elevated)] p-4 dark:border-white/5">
    <p class="text-xs text-text-muted-light dark:text-text-muted-dark leading-relaxed">
      <strong>Hinweis:</strong> Diese Berechnung ist eine vereinfachte Schätzung und ersetzt keine steuerliche Beratung.
      Die tatsächliche Steuerlast kann je nach persönlicher Situation, Kirchensteuerpflicht und
      weiteren Kapitalerträgen abweichen. Bitte konsultieren Sie einen Steuerberater für verbindliche Auskünfte.
    </p>
  </div>
</div>
