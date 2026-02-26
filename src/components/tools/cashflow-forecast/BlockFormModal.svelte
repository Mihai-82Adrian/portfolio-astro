<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { X } from 'lucide-svelte';
  import type { CashflowBlock, BlockCategory } from '@/lib/cashflow/types';
  import { SUBCATEGORIES, CATEGORY_LABELS } from '@/lib/cashflow/types';

  let {
    block,
    onSave,
    onClose,
  }: {
    block: Partial<CashflowBlock> & { id?: string };
    onSave: (b: CashflowBlock) => void;
    onClose: () => void;
  } = $props();

  // ── Local form state ─────────────────────────────────────────────────────
  let category     = $state<BlockCategory>((block.category ?? 'revenue') as BlockCategory);
  let subcategory  = $state(block.subcategory ?? SUBCATEGORIES[category][0].value);
  let label        = $state(block.label ?? '');
  let amount       = $state(block.amount ?? 0);
  let growthRate   = $state(block.growthRate ?? 0);
  let varPercent   = $state(block.variablePercent ?? 0);
  let useVarPct    = $state((block.variablePercent ?? 0) > 0);
  let oneTimeMonth = $state(block.oneTimeMonth ?? 0);

  const subcategoryOptions = $derived(SUBCATEGORIES[category]);

  // Reset subcategory when category changes
  $effect(() => {
    subcategory = SUBCATEGORIES[category][0].value;
  });

  const isValid = $derived(
    label.trim().length >= 2 &&
    (category !== 'variable_cost' || !useVarPct ? amount > 0 : varPercent > 0)
  );

  const isEdit = !!block.id;

  function handleSave() {
    if (!isValid) return;
    const saved: CashflowBlock = {
      id:          block.id ?? crypto.randomUUID(),
      category,
      subcategory,
      label:       label.trim(),
      amount:      category === 'variable_cost' && useVarPct ? 0 : amount,
      ...(category === 'revenue'       && growthRate > 0 && { growthRate }),
      ...(category === 'variable_cost' && useVarPct      && { variablePercent: varPercent }),
      ...(category === 'one_time'                         && { oneTimeMonth }),
    };
    onSave(saved);
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
  role="presentation"
  onclick={onClose}
  transition:fly={{ duration: 200 }}
></div>

<!-- Panel -->
<div
  class="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-black/10 bg-[var(--bg-elevated)] p-6 pb-10 shadow-2xl dark:border-white/10 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 sm:rounded-2xl sm:border sm:pb-6"
  role="dialog"
  aria-modal="true"
  aria-label="{isEdit ? 'Block bearbeiten' : 'Block hinzufügen'}"
  transition:fly={{ y: 30, duration: 300, easing: cubicOut }}
>
  <!-- Header -->
  <div class="mb-5 flex items-center justify-between">
    <h2 class="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
      {isEdit ? 'Block bearbeiten' : 'Block hinzufügen'}
    </h2>
    <button
      type="button"
      onclick={onClose}
      class="rounded-lg p-1.5 text-text-secondary-light hover:bg-black/5 dark:text-text-secondary-dark dark:hover:bg-white/10"
      aria-label="Schließen"
    >
      <X size={16} />
    </button>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
    <!-- Category -->
    <div>
      <label class="mb-1.5 block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
        Kategorie
      </label>
      <select
        bind:value={category}
        class="w-full rounded-xl border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
      >
        {#each Object.entries(CATEGORY_LABELS) as [val, lbl]}
          <option value={val}>{lbl}</option>
        {/each}
      </select>
    </div>

    <!-- Subcategory -->
    <div>
      <label class="mb-1.5 block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
        Typ
      </label>
      <select
        bind:value={subcategory}
        class="w-full rounded-xl border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
      >
        {#each subcategoryOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <!-- Label -->
    <div>
      <label class="mb-1.5 block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
        Bezeichnung
      </label>
      <input
        type="text"
        bind:value={label}
        placeholder="z.B. SaaS Subscription, Miete Büro…"
        maxlength={60}
        class="w-full rounded-xl border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light placeholder:text-text-muted-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark dark:placeholder:text-text-muted-dark"
      />
    </div>

    <!-- Amount (hidden for variable_cost with % mode) -->
    {#if !(category === 'variable_cost' && useVarPct)}
      <div>
        <label class="mb-1.5 block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
          {category === 'one_time' ? 'Betrag (€)' : 'Betrag pro Monat (€)'}
        </label>
        <input
          type="number"
          bind:value={amount}
          min="0"
          step="50"
          class="w-full rounded-xl border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
        />
      </div>
    {/if}

    <!-- Revenue: growth rate -->
    {#if category === 'revenue'}
      <div>
        <label class="mb-1.5 block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Monatliches Wachstum (%) — optional
        </label>
        <input
          type="number"
          bind:value={growthRate}
          min="0"
          max="100"
          step="0.5"
          placeholder="0"
          class="w-full rounded-xl border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
        />
      </div>
    {/if}

    <!-- Variable cost: % of revenue toggle -->
    {#if category === 'variable_cost'}
      <div class="flex items-center gap-2">
        <input
          id="use-var-pct"
          type="checkbox"
          bind:checked={useVarPct}
          class="h-4 w-4 rounded border-black/20 accent-eucalyptus-600"
        />
        <label for="use-var-pct" class="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          Als % der monatlichen Einnahmen definieren
        </label>
      </div>
      {#if useVarPct}
        <div>
          <label class="mb-1.5 block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Prozentsatz (% des Umsatzes)
          </label>
          <input
            type="number"
            bind:value={varPercent}
            min="0.1"
            max="100"
            step="0.5"
            class="w-full rounded-xl border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
          />
        </div>
      {/if}
    {/if}

    <!-- One-time: month selector -->
    {#if category === 'one_time'}
      <div>
        <label class="mb-1.5 block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Fälligkeitsmonat
        </label>
        <select
          bind:value={oneTimeMonth}
          class="w-full rounded-xl border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
        >
          {#each Array.from({ length: 12 }, (_, i) => i) as m}
            <option value={m}>Monat {m + 1}</option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex gap-2 pt-1">
      <button
        type="button"
        onclick={onClose}
        class="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-text-secondary-light transition-colors hover:bg-black/5 dark:border-white/10 dark:text-text-secondary-dark dark:hover:bg-white/5"
      >
        Abbrechen
      </button>
      <button
        type="submit"
        disabled={!isValid}
        class="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all {isValid
          ? 'bg-eucalyptus-600 text-white hover:bg-eucalyptus-700 dark:bg-eucalyptus-500 dark:hover:bg-eucalyptus-400'
          : 'cursor-not-allowed bg-black/10 text-text-muted-light dark:bg-white/10 dark:text-text-muted-dark'}"
      >
        {isEdit ? 'Speichern' : 'Hinzufügen'}
      </button>
    </div>
  </form>
</div>
