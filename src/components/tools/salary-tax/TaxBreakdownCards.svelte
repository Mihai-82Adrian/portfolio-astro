<script lang="ts">
  import { AlertCircle, ChevronDown } from 'lucide-svelte';
  import type { BruttoNettoResult } from '@/lib/fin-core/salary-tax';

  let showSozialDetails = $state(false);

  let { result }: { result: BruttoNettoResult } = $props();

  const eur = (v: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(v);

  const pct = (v: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(v / 100);

  const totalAnSocial = $derived(
    result.kvAN + result.rvAN + result.pvAN + result.avAN,
  );
  const totalAgSocial = $derived(
    result.kvAG + result.rvAG + result.pvAG + result.avAG,
  );
  const totalSocial = $derived(totalAnSocial + totalAgSocial);
  const totalTaxes  = $derived(
    result.lohnsteuer + result.solidaritaetszuschlag + result.kirchensteuer,
  );
</script>

<!-- 2×2 bento grid -->
<div class="grid grid-cols-2 gap-3">

  <!-- Netto-Auszahlung (primary card, spanning full row) -->
  <div class="col-span-2 rounded-xl border border-eucalyptus-500/25 bg-eucalyptus-500/8 p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-eucalyptus-400">
      Netto-Auszahlung
    </p>
    <p class="mt-1 text-3xl font-bold text-eucalyptus-300">
      {eur(result.netMonthly)}
    </p>
    <p class="mt-1 text-xs text-eucalyptus-500/70">
      / Monat nach allen Abzügen
    </p>
  </div>

  <!-- AG Gesamtkosten -->
  <div class="rounded-xl border border-white/8 bg-white/4 p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-blue-400">
      AG-Gesamtkosten
    </p>
    <p class="mt-1 text-xl font-bold text-white">
      {eur(result.employerTotalCost)}
    </p>
    <p class="mt-1 text-xs text-gray-500">
      Brutto + AG-Sozialabg.
    </p>
  </div>

  <!-- Tax Wedge -->
  <div class="rounded-xl border border-white/8 bg-white/4 p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-amber-400">
      Steuerkeil
    </p>
    <p class="mt-1 text-xl font-bold text-white">
      {pct(result.taxWedgePercent)}
    </p>
    <p class="mt-1 text-xs text-gray-500">
      Tax Wedge (OECD)
    </p>
  </div>

  <!-- Steuerlast -->
  <div class="rounded-xl border border-white/8 bg-white/4 p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-red-400">
      Steuerlast
    </p>
    <p class="mt-1 text-xl font-bold text-white">
      {eur(totalTaxes)}
    </p>
    <div class="mt-2 space-y-0.5 text-xs text-gray-500">
      <div class="flex justify-between">
        <span>Lohnsteuer</span>
        <span>{eur(result.lohnsteuer)}</span>
      </div>
      <div class="flex justify-between">
        <span>SolZ</span>
        <span>{eur(result.solidaritaetszuschlag)}</span>
      </div>
      {#if result.kirchensteuer > 0}
        <div class="flex justify-between">
          <span>KiSt</span>
          <span>{eur(result.kirchensteuer)}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Sozialabgaben -->
  <div class="rounded-xl border border-white/8 bg-white/4 p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-orange-400">
      Sozialabgaben
    </p>
    <p class="mt-1 text-xl font-bold text-white">
      {eur(totalSocial)}
    </p>
    <div class="mt-2 space-y-0.5 text-xs text-gray-500">
      <div class="flex justify-between">
        <span>AN-Anteil</span>
        <span>{eur(totalAnSocial)}</span>
      </div>
      <div class="flex justify-between">
        <span>AG-Anteil</span>
        <span>{eur(totalAgSocial)}</span>
      </div>
    </div>

    <!-- Details toggle -->
    <button
      type="button"
      onclick={() => { showSozialDetails = !showSozialDetails; }}
      class="mt-2.5 flex items-center gap-1 text-xs text-gray-600 transition-colors hover:text-gray-300"
      aria-expanded={showSozialDetails}
    >
      <ChevronDown
        size={12}
        aria-hidden="true"
        class="transition-transform duration-200 {showSozialDetails ? 'rotate-180' : ''}"
      />
      Details
    </button>

    {#if showSozialDetails}
      <div class="mt-2 rounded-lg border border-white/6 bg-white/3 p-2.5">
        <!-- Header row -->
        <div class="mb-1.5 grid grid-cols-3 gap-1 text-xs font-semibold text-gray-500">
          <span></span>
          <span class="text-right">AN</span>
          <span class="text-right">AG</span>
        </div>
        <!-- KV -->
        <div class="grid grid-cols-3 gap-1 text-xs text-gray-400">
          <span class="text-gray-500">KV</span>
          <span class="text-right">{eur(result.kvAN)}</span>
          <span class="text-right">{eur(result.kvAG)}</span>
        </div>
        <!-- RV -->
        <div class="mt-1 grid grid-cols-3 gap-1 text-xs text-gray-400">
          <span class="text-gray-500">RV</span>
          <span class="text-right">{eur(result.rvAN)}</span>
          <span class="text-right">{eur(result.rvAG)}</span>
        </div>
        <!-- PV -->
        <div class="mt-1 grid grid-cols-3 gap-1 text-xs text-gray-400">
          <span class="text-gray-500">PV</span>
          <span class="text-right">{eur(result.pvAN)}</span>
          <span class="text-right">{eur(result.pvAG)}</span>
        </div>
        <!-- AV -->
        <div class="mt-1 grid grid-cols-3 gap-1 text-xs text-gray-400">
          <span class="text-gray-500">AV</span>
          <span class="text-right">{eur(result.avAN)}</span>
          <span class="text-right">{eur(result.avAG)}</span>
        </div>
      </div>
    {/if}
  </div>

</div>

<!-- Eff. Steuerquote + KV-Rate Info -->
<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
  <span>Eff. Steuerquote: <strong class="text-gray-300">{pct(result.effectiveTaxRatePercent)}</strong></span>
  <span>KV-Zusatz: <strong class="text-gray-300">{result.effectiveKvZusatzbeitragPercent.toFixed(2).replace('.', ',')} %</strong></span>
</div>

<!-- PKV-Schwelle Warning -->
{#if result.exceedsVersicherungspflichtgrenze}
  <div class="mt-3 flex items-start gap-2 rounded-lg border border-blue-500/25 bg-blue-500/8 px-3 py-2.5 text-xs text-blue-300">
    <AlertCircle size={13} class="mt-0.5 shrink-0 text-blue-400" aria-hidden="true" />
    <span>
      Gehalt überschreitet die Versicherungspflichtgrenze
      ({new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(result.versicherungspflichtgrenzeMonthly)}/Monat) —
      PKV-Wechsel möglich (§ 6 SGB V).
    </span>
  </div>
{/if}
