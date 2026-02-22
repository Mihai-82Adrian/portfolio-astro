<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import InfoTooltip from '@/components/tools/ui/InfoTooltip.svelte';
  import type { RevenueModel, CapitalInjection } from '@/lib/fin-core/runway';

  export let revenue: RevenueModel;
  export let injections: CapitalInjection[];

  const dispatch = createEventDispatcher<{
    updateRevenue: RevenueModel;
    updateInjections: CapitalInjection[];
  }>();

  function uid(): string {
    return Math.random().toString(36).slice(2, 9);
  }

  function setRevenue(field: keyof RevenueModel, value: number) {
    dispatch('updateRevenue', { ...revenue, [field]: value });
  }

  function addInjection() {
    dispatch('updateInjections', [
      ...injections,
      { id: uid(), label: '', amount: 0, month: 6 },
    ]);
  }

  function removeInjection(id: string) {
    dispatch('updateInjections', injections.filter(i => i.id !== id));
  }

  function updateInjection(id: string, field: keyof CapitalInjection, value: string | number) {
    dispatch('updateInjections', injections.map(i =>
      i.id === id ? { ...i, [field]: value } : i
    ));
  }
</script>

<div class="space-y-4">
  <!-- MRR & Growth -->
  <div>
    <h3 class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      Umsatz (MRR)
    </h3>
    <div class="mt-2 grid grid-cols-2 gap-3">
      <!-- Initial MRR -->
      <div class="space-y-1">
        <label class="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Initial MRR
        </label>
        <div class="relative">
          <input
            type="number"
            value={revenue.initialMRR}
            min="0"
            step="100"
            oninput={e => setRevenue('initialMRR', Number((e.target as HTMLInputElement).value))}
            class="w-full rounded-lg border border-black/10 bg-[var(--bg-primary)] py-2 pl-3 pr-8 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
            aria-label="Initial MRR in EUR"
          />
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">€</span>
        </div>
      </div>

      <!-- MoM Growth -->
      <div class="space-y-1">
        <div class="flex items-center">
          <label class="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
            MoM Wachstum
          </label>
          <InfoTooltip>
            <p class="font-semibold text-white mb-1">Month-over-Month Growth</p>
            Ein exponentieller Zinseszins-Effekt. Selbst kleine Raten wie 10 % führen langfristig zu einem massiven Anstieg des monatlichen Umsatzes. Bei 20 % MoM verdoppelt sich der MRR alle ~3,8 Monate.
          </InfoTooltip>
        </div>
        <div class="relative">
          <input
            type="number"
            value={revenue.momGrowthRate}
            min="0"
            max="200"
            step="1"
            oninput={e => setRevenue('momGrowthRate', Number((e.target as HTMLInputElement).value))}
            class="w-full rounded-lg border border-black/10 bg-[var(--bg-primary)] py-2 pl-3 pr-8 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
            aria-label="MoM Wachstum in Prozent"
          />
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">%</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Capital Injections -->
  <div>
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
        Kapitalzuflüsse
      </h3>
      <button
        type="button"
        onclick={addInjection}
        class="inline-flex items-center gap-1 rounded-lg border border-eucalyptus-500/40 px-2.5 py-1 text-xs font-medium text-eucalyptus-700 hover:bg-eucalyptus-500/10 dark:text-eucalyptus-300 transition-colors"
      >
        + Injektion
      </button>
    </div>

    {#if injections.length === 0}
      <p class="mt-2 text-xs text-text-muted-light dark:text-text-muted-dark italic">
        Keine Kapitalzuflüsse geplant.
      </p>
    {/if}

    <div class="mt-2 space-y-2">
      {#each injections as inj (inj.id)}
        <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-black/10 bg-[var(--bg-primary)] p-2.5 dark:border-white/10">
          <input
            type="text"
            value={inj.label}
            placeholder="z. B. Seed Round"
            oninput={e => updateInjection(inj.id, 'label', (e.target as HTMLInputElement).value)}
            class="min-w-0 rounded border border-black/10 bg-transparent px-2 py-1 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
            aria-label="Bezeichnung"
          />
          <div class="relative">
            <input
              type="number"
              value={inj.amount}
              min="0"
              step="1000"
              oninput={e => updateInjection(inj.id, 'amount', Number((e.target as HTMLInputElement).value))}
              class="w-28 rounded border border-black/10 bg-transparent py-1 pl-2 pr-7 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
              aria-label="Betrag in EUR"
            />
            <span class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">€</span>
          </div>
          <div class="relative">
            <input
              type="number"
              value={inj.month}
              min="0"
              max="35"
              oninput={e => updateInjection(inj.id, 'month', Number((e.target as HTMLInputElement).value))}
              class="w-14 rounded border border-black/10 bg-transparent py-1 pl-2 pr-6 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
              aria-label="In Monat"
              title="In Monat (0 = Monat 1)"
            />
            <span class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">M</span>
          </div>
          <button
            type="button"
            onclick={() => removeInjection(inj.id)}
            aria-label="Injektion entfernen"
            class="rounded p-1 text-text-muted-light hover:text-red-500 dark:text-text-muted-dark transition-colors"
          >✕</button>
        </div>
      {/each}
    </div>
  </div>
</div>
