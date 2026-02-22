<script lang="ts">
  import { onMount } from 'svelte';
  import { calculateBruttoNetto, type KvProviderId } from '@/lib/fin-core/salary-tax';
  import TaxInputForm from './TaxInputForm.svelte';
  import TaxWaterfallChart from './TaxWaterfallChart.svelte';
  import TaxBreakdownCards from './TaxBreakdownCards.svelte';

  const STORAGE_KEY = 'tools.salary-tax.inputs.v1';

  // ── State ──────────────────────────────────────────────────────────────────
  let grossMonthly         = $state(4329); // Durchschnittsentgelt 2026
  let taxClass             = $state<1|2|3|4|5|6>(1);
  let churchMember         = $state(false);
  let healthInsurance      = $state<'gkv'|'pkv'>('gkv');
  let kvProvider           = $state<KvProviderId>('orientierungswert');
  let inSachsen            = $state(false);
  let kinderlosZuschlag    = $state(false);
  let pvChildrenRebates    = $state<0|1|2|3|4>(0);
  let kinderfreibetraege   = $state(0);
  let jahresfreibetragEuro = $state(0);

  // ── Lifecycle: restore once from localStorage ─────────────────────────────
  let restored = $state(false);

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.grossMonthly)         grossMonthly         = p.grossMonthly;
        if (p.taxClass)             taxClass             = p.taxClass;
        if (p.churchMember != null) churchMember         = p.churchMember;
        if (p.healthInsurance)      healthInsurance      = p.healthInsurance;
        if (p.kvProvider)           kvProvider           = p.kvProvider;
        if (p.inSachsen != null)    inSachsen            = p.inSachsen;
        if (p.kinderlosZuschlag != null) kinderlosZuschlag = p.kinderlosZuschlag;
        if (p.pvChildrenRebates != null) pvChildrenRebates = p.pvChildrenRebates;
        if (p.kinderfreibetraege != null) kinderfreibetraege = p.kinderfreibetraege;
        if (p.jahresfreibetragEuro != null) jahresfreibetragEuro = p.jahresfreibetragEuro;
      }
    } catch { /* ignore */ }
    restored = true;
  });

  // ── Persist on every change (only after initial restore) ─────────────────
  $effect(() => {
    if (!restored) return;
    const snapshot = {
      grossMonthly, taxClass, churchMember, healthInsurance,
      kvProvider, inSachsen, kinderlosZuschlag, pvChildrenRebates,
      kinderfreibetraege, jahresfreibetragEuro,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* ignore */ }
  });

  // ── Derived result — recalculates instantly on every input change ─────────
  const result = $derived(calculateBruttoNetto({
    grossMonthly:    Math.max(0, grossMonthly),
    taxClass,
    churchMember,
    healthInsurance,
    kvProvider:      healthInsurance === 'gkv' ? kvProvider : undefined,
    inSachsen,
    kinderlosZuschlag,
    pvChildrenRebates,
    kinderfreibetraege,
    jahresfreibetragEuro,
  }));

  function reset() {
    if (!confirm('Alle Eingaben zurücksetzen?')) return;
    grossMonthly         = 4329;
    taxClass             = 1;
    churchMember         = false;
    healthInsurance      = 'gkv';
    kvProvider           = 'orientierungswert';
    inSachsen            = false;
    kinderlosZuschlag    = false;
    pvChildrenRebates    = 0;
    kinderfreibetraege   = 0;
    jahresfreibetragEuro = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
</script>

<div class="space-y-4">

  <!-- Header bar -->
  <div class="flex items-center justify-between">
    <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
      Daten werden lokal gespeichert — keine Serverübertragung.
    </p>
    <button
      type="button"
      onclick={reset}
      class="text-xs text-text-muted-light underline-offset-2 hover:text-red-500 hover:underline dark:text-text-muted-dark transition-colors"
    >
      Zurücksetzen
    </button>
  </div>

  <!-- Bento Grid: Form left | Chart + Cards right -->
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">

    <!-- Left: Input Form -->
    <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
      <TaxInputForm
        bind:grossMonthly
        bind:taxClass
        bind:churchMember
        bind:healthInsurance
        bind:kvProvider
        bind:inSachsen
        bind:kinderlosZuschlag
        bind:pvChildrenRebates
        bind:kinderfreibetraege
        bind:jahresfreibetragEuro
      />
    </div>

    <!-- Right: Chart + Breakdown cards (sticky) -->
    <div class="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">

      <!-- Waterfall Chart -->
      <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
            Brutto-Netto-Steuerkeil
          </h2>
          <span class="rounded-full border border-white/10 px-2 py-0.5 text-xs text-gray-500">
            Stand: 2026 · BMF PAP
          </span>
        </div>
        <TaxWaterfallChart {result} />
      </div>

      <!-- Breakdown Cards -->
      <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
        <h2 class="mb-3 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
          Kennzahlen
        </h2>
        <TaxBreakdownCards {result} />
      </div>

    </div>
  </div>

  <!-- Legal disclaimer -->
  <p class="text-center text-xs text-gray-600">
    Dieses Tool verwendet den offiziellen
    <strong class="text-gray-500">BMF Programmablaufplan (PAP) 2026</strong>.
    Es dient der schnellen Simulation und ersetzt keine professionelle Gehaltsabrechnung.
  </p>

</div>
