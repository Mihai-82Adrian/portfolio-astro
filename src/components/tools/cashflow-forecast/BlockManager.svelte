<script lang="ts">
  import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Repeat, Zap } from 'lucide-svelte';
  import type { CashflowBlock, BlockCategory } from '@/lib/cashflow/types';
  import { CATEGORY_LABELS } from '@/lib/cashflow/types';

  let {
    blocks,
    onAdd,
    onEdit,
    onDelete,
  }: {
    blocks: CashflowBlock[];
    onAdd: () => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  } = $props();

  const eur = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const categoryOrder: BlockCategory[] = ['revenue', 'fixed_cost', 'variable_cost', 'one_time'];

  const grouped = $derived(
    categoryOrder
      .map(cat => ({ cat, items: blocks.filter(b => b.category === cat) }))
      .filter(g => g.items.length > 0)
  );

  function categoryIcon(cat: BlockCategory) {
    return cat === 'revenue' ? TrendingUp
         : cat === 'fixed_cost' ? Repeat
         : cat === 'variable_cost' ? TrendingDown
         : Zap;
  }

  function categoryColor(cat: BlockCategory): string {
    return cat === 'revenue'       ? 'text-eucalyptus-600 dark:text-eucalyptus-400'
         : cat === 'fixed_cost'    ? 'text-blue-500'
         : cat === 'variable_cost' ? 'text-amber-500'
         : 'text-purple-500';
  }

  function blockSuffix(b: CashflowBlock): string {
    if (b.category === 'variable_cost' && b.variablePercent) return `${b.variablePercent}% Umsatz`;
    if (b.category === 'one_time') return `Monat ${(b.oneTimeMonth ?? 0) + 1}`;
    if (b.growthRate) return `${eur(b.amount)}/M +${b.growthRate}%`;
    return `${eur(b.amount)}/Monat`;
  }
</script>

<div class="space-y-4">
  <!-- Grouped block list -->
  {#if blocks.length === 0}
    <div class="rounded-xl border border-dashed border-black/15 p-6 text-center dark:border-white/15">
      <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Noch keine Positionen hinzugefügt.
      </p>
      <p class="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
        Starten Sie mit einer Einnahmenquelle oder einem Fixkostenblock.
      </p>
    </div>
  {:else}
    {#each grouped as { cat, items }}
      <div>
        <div class="mb-2 flex items-center gap-1.5">
          <svelte:component this={categoryIcon(cat)} size={13} class={categoryColor(cat)} />
          <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary-light dark:text-text-secondary-dark">
            {CATEGORY_LABELS[cat]}
          </span>
        </div>
        <div class="space-y-1.5">
          {#each items as block (block.id)}
            <div class="flex items-center justify-between rounded-xl border border-black/8 bg-[var(--bg-elevated)] px-4 py-2.5 dark:border-white/8">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                  {block.label}
                </p>
                <p class="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  {blockSuffix(block)}
                </p>
              </div>
              <div class="ml-3 flex shrink-0 gap-1">
                <button
                  type="button"
                  onclick={() => onEdit(block.id)}
                  class="rounded-lg p-1.5 text-text-secondary-light hover:bg-black/5 hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:bg-white/10 dark:hover:text-text-primary-dark"
                  aria-label="Block bearbeiten"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onclick={() => onDelete(block.id)}
                  class="rounded-lg p-1.5 text-text-secondary-light hover:bg-red-50 hover:text-red-500 dark:text-text-secondary-dark dark:hover:bg-red-500/10"
                  aria-label="Block löschen"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}

  <!-- Add button -->
  <button
    type="button"
    onclick={onAdd}
    class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-eucalyptus-500/40 px-4 py-2.5 text-sm font-medium text-eucalyptus-700 transition-colors hover:border-eucalyptus-500/70 hover:bg-eucalyptus-500/5 dark:border-eucalyptus-400/30 dark:text-eucalyptus-300 dark:hover:bg-eucalyptus-500/8"
  >
    <Plus size={15} />
    Position hinzufügen
  </button>
</div>
