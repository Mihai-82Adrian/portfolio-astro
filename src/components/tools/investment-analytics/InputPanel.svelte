<script lang="ts">
  import { Plus, Trash2 } from 'lucide-svelte';
  import type { InvestmentInput, CashFlowEntry } from '@/lib/investment/types';

  let {
    input,
    onUpdate,
  }: {
    input:    InvestmentInput;
    onUpdate: (updated: InvestmentInput) => void;
  } = $props();

  function update(patch: Partial<InvestmentInput>) {
    onUpdate({ ...input, ...patch });
  }

  function updateCashFlow(index: number, patch: Partial<CashFlowEntry>) {
    const cashFlows = input.cashFlows.map((cf, i) =>
      i === index ? { ...cf, ...patch } : cf
    );
    onUpdate({ ...input, cashFlows });
  }

  function addCashFlow() {
    const maxYear = input.cashFlows.reduce((m, cf) => Math.max(m, cf.year), 0);
    onUpdate({
      ...input,
      cashFlows: [...input.cashFlows, { year: maxYear + 1, amount: 0 }],
    });
  }

  function removeCashFlow(index: number) {
    onUpdate({
      ...input,
      cashFlows: input.cashFlows.filter((_, i) => i !== index),
    });
  }

  const inputClass = 'w-full rounded-lg border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:bg-[var(--bg-primary)] dark:text-text-primary-dark';
</script>

<div class="space-y-6">
  <!-- Investment Details -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
    <h3 class="mb-4 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      Investitionsparameter
    </h3>

    <div class="grid gap-4 sm:grid-cols-2">
      <!-- Initial Investment -->
      <div class="space-y-1.5">
        <label for="initial-investment" class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Investitionsbetrag
        </label>
        <div class="relative">
          <input
            id="initial-investment"
            type="number"
            min="0"
            step="100"
            value={input.initialInvestment}
            oninput={(e) => update({ initialInvestment: Number((e.target as HTMLInputElement).value) })}
            class="{inputClass} pr-12"
          />
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted-light dark:text-text-muted-dark">EUR</span>
        </div>
      </div>

      <!-- Discount Rate -->
      <div class="space-y-1.5">
        <label for="discount-rate" class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Diskontierungsrate (für NPV)
        </label>
        <div class="relative">
          <input
            id="discount-rate"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={input.discountRate}
            oninput={(e) => update({ discountRate: Number((e.target as HTMLInputElement).value) })}
            class="{inputClass} pr-8"
          />
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted-light dark:text-text-muted-dark">%</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Cash Flow Builder -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
        Erwartete Cashflows
      </h3>
      <button
        type="button"
        onclick={addCashFlow}
        disabled={input.cashFlows.length >= 30}
        class="flex items-center gap-1.5 rounded-lg bg-eucalyptus-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-eucalyptus-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-eucalyptus-500"
      >
        <Plus size={12} />
        Jahr hinzufügen
      </button>
    </div>

    <p class="mb-3 text-xs text-text-muted-light dark:text-text-muted-dark">
      Positiv = Einnahme, Negativ = Zusatzinvestition. Maximal 30 Jahre.
    </p>

    <div class="space-y-2">
      {#if input.cashFlows.length === 0}
        <p class="py-4 text-center text-sm text-text-muted-light dark:text-text-muted-dark">
          Keine Cashflows definiert. Bitte mindestens einen Cashflow hinzufügen.
        </p>
      {/if}

      {#each input.cashFlows as cf, i}
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 rounded-lg border border-black/10 bg-[var(--bg-primary)] px-3 py-2 dark:border-white/10">
            <span class="text-xs text-text-muted-light dark:text-text-muted-dark">Jahr</span>
            <input
              type="number"
              min="1"
              max="30"
              value={cf.year}
              oninput={(e) => updateCashFlow(i, { year: Number((e.target as HTMLInputElement).value) })}
              class="w-12 bg-transparent text-sm text-text-primary-light focus:outline-none dark:text-text-primary-dark"
              aria-label="Jahr"
            />
          </div>

          <div class="relative flex-1">
            <input
              type="number"
              step="100"
              value={cf.amount}
              oninput={(e) => updateCashFlow(i, { amount: Number((e.target as HTMLInputElement).value) })}
              class="{inputClass} pr-12"
              aria-label="Cashflow Betrag"
            />
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">EUR</span>
          </div>

          <button
            type="button"
            onclick={() => removeCashFlow(i)}
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-black/10 text-text-muted-light transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label="Cashflow entfernen"
          >
            <Trash2 size={14} />
          </button>
        </div>
      {/each}
    </div>
  </div>

  <!-- Tax Settings -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
    <h3 class="mb-4 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      Steuerliche Einstellungen (DACH)
    </h3>

    <div class="space-y-4">
      <!-- Fund toggle -->
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Investmentfonds</p>
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark">Vorabpauschale berechnen</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={input.isFund}
          onclick={() => update({ isFund: !input.isFund })}
          class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 {input.isFund ? 'bg-eucalyptus-500' : 'bg-gray-300 dark:bg-gray-600'}"
        >
          <span class="pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow ring-0 transition duration-200 {input.isFund ? 'translate-x-4' : 'translate-x-0'}"></span>
        </button>
      </div>

      {#if input.isFund}
        <!-- Accumulating toggle -->
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Thesaurierend</p>
            <p class="text-xs text-text-muted-light dark:text-text-muted-dark">Keine Ausschüttungen (jährliche Vorabpauschale)</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={input.isAccumulating}
            onclick={() => update({ isAccumulating: !input.isAccumulating })}
            class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 {input.isAccumulating ? 'bg-eucalyptus-500' : 'bg-gray-300 dark:bg-gray-600'}"
          >
            <span class="pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow ring-0 transition duration-200 {input.isAccumulating ? 'translate-x-4' : 'translate-x-0'}"></span>
          </button>
        </div>

        <!-- TER -->
        <div class="space-y-1.5">
          <label for="ter" class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Total Expense Ratio (TER)
          </label>
          <div class="relative">
            <input
              id="ter"
              type="number"
              min="0"
              max="5"
              step="0.01"
              value={input.ter}
              oninput={(e) => update({ ter: Number((e.target as HTMLInputElement).value) })}
              class="{inputClass} pr-8"
            />
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted-light dark:text-text-muted-dark">%</span>
          </div>
        </div>
      {/if}

      <!-- Freistellungsauftrag -->
      <div class="space-y-1.5">
        <label for="freibetrag" class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Freistellungsauftrag
        </label>
        <p class="text-xs text-text-muted-light dark:text-text-muted-dark">1.000 € (Einzelperson) / 2.000 € (Verheiratet)</p>
        <div class="relative">
          <input
            id="freibetrag"
            type="number"
            min="0"
            max="2000"
            step="100"
            value={input.personalFreibetrag}
            oninput={(e) => update({ personalFreibetrag: Number((e.target as HTMLInputElement).value) })}
            class="{inputClass} pr-12"
          />
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted-light dark:text-text-muted-dark">EUR</span>
        </div>
      </div>
    </div>
  </div>
</div>
