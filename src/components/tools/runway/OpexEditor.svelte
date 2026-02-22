<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { OpexItem } from '@/lib/fin-core/runway';

  export let items: OpexItem[];

  const dispatch = createEventDispatcher<{ update: OpexItem[] }>();

  function uid(): string {
    return Math.random().toString(36).slice(2, 9);
  }

  function addItem() {
    dispatch('update', [
      ...items,
      { id: uid(), label: '', amount: 0, type: 'recurring' },
    ]);
  }

  function removeItem(id: string) {
    dispatch('update', items.filter(i => i.id !== id));
  }

  function updateItem(id: string, field: keyof OpexItem, value: string | number) {
    dispatch('update', items.map(i =>
      i.id === id ? { ...i, [field]: value } : i
    ));
  }

  $: recurringTotal = items
    .filter(i => i.type === 'recurring')
    .reduce((sum, i) => sum + i.amount, 0);
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      Betriebskosten (OpEx)
    </h3>
    <button
      type="button"
      onclick={addItem}
      class="inline-flex items-center gap-1 rounded-lg border border-eucalyptus-500/40 px-2.5 py-1 text-xs font-medium text-eucalyptus-700 hover:bg-eucalyptus-500/10 dark:text-eucalyptus-300 transition-colors"
    >
      + Kostenposition
    </button>
  </div>

  {#if items.length === 0}
    <p class="text-xs text-text-muted-light dark:text-text-muted-dark italic">
      Noch keine Kostenpositionen.
    </p>
  {/if}

  {#each items as item (item.id)}
    <div class="space-y-1.5 rounded-lg border border-black/10 bg-[var(--bg-primary)] p-2.5 dark:border-white/10">
      <div class="grid grid-cols-[1fr_auto_auto] items-center gap-2">
        <!-- Label -->
        <input
          type="text"
          value={item.label}
          placeholder="z. B. AWS / Infra"
          oninput={e => updateItem(item.id, 'label', (e.target as HTMLInputElement).value)}
          class="min-w-0 rounded border border-black/10 bg-transparent px-2 py-1 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
          aria-label="Bezeichnung"
        />
        <!-- Amount -->
        <div class="relative">
          <input
            type="number"
            value={item.amount}
            min="0"
            step="50"
            oninput={e => updateItem(item.id, 'amount', Number((e.target as HTMLInputElement).value))}
            class="w-24 rounded border border-black/10 bg-transparent py-1 pl-2 pr-7 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
            aria-label="Betrag in EUR"
          />
          <span class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">€</span>
        </div>
        <!-- Remove -->
        <button
          type="button"
          onclick={() => removeItem(item.id)}
          aria-label="Position entfernen"
          class="rounded p-1 text-text-muted-light hover:text-red-500 dark:text-text-muted-dark transition-colors"
        >✕</button>
      </div>

      <!-- Type toggle -->
      <div class="flex items-center gap-3">
        <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          <input
            type="radio"
            name="type-{item.id}"
            value="recurring"
            checked={item.type === 'recurring'}
            onchange={() => updateItem(item.id, 'type', 'recurring')}
            class="accent-eucalyptus-600"
          />
          ↻ Monatlich
        </label>
        <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark">
          <input
            type="radio"
            name="type-{item.id}"
            value="one-off"
            checked={item.type === 'one-off'}
            onchange={() => updateItem(item.id, 'type', 'one-off')}
            class="accent-eucalyptus-600"
          />
          ✦ Einmalig
        </label>
        {#if item.type === 'one-off'}
          <div class="relative ml-auto">
            <input
              type="number"
              value={item.month ?? 0}
              min="0"
              max="35"
              oninput={e => updateItem(item.id, 'month', Number((e.target as HTMLInputElement).value))}
              class="w-16 rounded border border-black/10 bg-transparent py-1 pl-2 pr-7 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
              aria-label="In Monat (0 = Monat 1)"
              title="In Monat (0 = Monat 1)"
            />
            <span class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">Mo</span>
          </div>
        {/if}
      </div>
    </div>
  {/each}

  {#if recurringTotal > 0}
    <p class="text-right text-xs text-text-muted-light dark:text-text-muted-dark">
      Lfd. OpEx: <span class="font-semibold text-text-secondary-light dark:text-text-secondary-dark">
        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(recurringTotal)}/Mo.
      </span>
    </p>
  {/if}
</div>
