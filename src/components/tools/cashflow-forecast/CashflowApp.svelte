<script lang="ts">
  import { onMount } from 'svelte';
  import { Download } from 'lucide-svelte';
  import type { CashflowBlock, CashflowState, StressScenarioResult } from '@/lib/cashflow/types';
  import {
    STORAGE_KEY,
    isWeeklyCooldownActive,
    cooldownRemainingLabel,
  } from '@/lib/cashflow/types';
  import { projectCashflow } from '@/lib/cashflow/projectionEngine';

  import CashflowChart   from './CashflowChart.svelte';
  import MetricsSummary  from './MetricsSummary.svelte';
  import BlockManager    from './BlockManager.svelte';
  import BlockFormModal  from './BlockFormModal.svelte';
  import ScenarioPanel   from './ScenarioPanel.svelte';

  // ── State ─────────────────────────────────────────────────────────────────
  let initialCash    = $state(10000);
  let blocks         = $state<CashflowBlock[]>([]);
  let scenarioResult = $state<StressScenarioResult | null>(null);
  let lastScenarioAt = $state<number | null>(null);

  let isGenerating   = $state(false);
  let errorMessage   = $state<string | null>(null);
  let restored       = $state(false);

  // Modal state
  let editingBlock   = $state<Partial<CashflowBlock> & { id?: string } | null>(null);

  // Import banner
  let showImportBanner  = $state(false);
  let importSuggestion  = $state<{ initialCash: number; blocks: CashflowBlock[] } | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const baseProjection = $derived(projectCashflow(initialCash, blocks));
  const weeklyLocked   = $derived(isWeeklyCooldownActive(lastScenarioAt));
  const cooldownLabel  = $derived(cooldownRemainingLabel(lastScenarioAt));
  const hasBlocks      = $derived(blocks.length > 0);

  // ── Persist ───────────────────────────────────────────────────────────────
  $effect(() => {
    if (!restored) return;
    const snapshot: CashflowState = {
      initialCash,
      blocks,
      scenarioResult,
      lastScenarioAt,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
  });

  // ── Restore ───────────────────────────────────────────────────────────────
  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<CashflowState>;
        if (typeof p.initialCash === 'number') initialCash = p.initialCash;
        if (Array.isArray(p.blocks))           blocks      = p.blocks;
        if (p.scenarioResult)                  scenarioResult = p.scenarioResult;
        if (typeof p.lastScenarioAt === 'number') lastScenarioAt = p.lastScenarioAt;
      }
    } catch {}

    // Runway Calculator bridge
    try {
      const runwayRaw = localStorage.getItem('tools.runway.scenarios.v1');
      if (runwayRaw && blocks.length === 0) {
        const runwayScenarios = JSON.parse(runwayRaw) as any[];
        const realistisch = runwayScenarios.find((s: any) => s.id === 'realistisch');
        if (realistisch) {
          const suggested: CashflowBlock[] = [];

          if (realistisch.revenue?.initialMRR > 0) {
            suggested.push({
              id: crypto.randomUUID(),
              category: 'revenue',
              subcategory: 'mrr',
              label: 'MRR (aus Runway-Modell)',
              amount: realistisch.revenue.initialMRR,
              growthRate: realistisch.revenue.momGrowthRate ?? 0,
            });
          }

          for (const opex of (realistisch.opex ?? []).filter((o: any) => o.type === 'recurring')) {
            suggested.push({
              id: crypto.randomUUID(),
              category: 'fixed_cost',
              subcategory: 'other_fixed',
              label: opex.label ?? 'Betriebskosten',
              amount: opex.amount ?? 0,
            });
          }

          for (const role of (realistisch.headcount ?? [])) {
            suggested.push({
              id: crypto.randomUUID(),
              category: 'fixed_cost',
              subcategory: 'payroll',
              label: role.title ?? 'Mitarbeiter',
              amount: role.monthlyCost ?? 0,
            });
          }

          if (suggested.length > 0) {
            importSuggestion  = { initialCash: realistisch.initialCash ?? initialCash, blocks: suggested };
            showImportBanner  = true;
          }
        }
      }
    } catch {}

    restored = true;
  });

  // ── Block CRUD ────────────────────────────────────────────────────────────
  function openAddModal() {
    editingBlock = {};
  }

  function openEditModal(id: string) {
    editingBlock = blocks.find(b => b.id === id) ?? null;
  }

  function handleSaveBlock(b: CashflowBlock) {
    const idx = blocks.findIndex(x => x.id === b.id);
    if (idx >= 0) {
      blocks = blocks.map((x, i) => i === idx ? b : x);
    } else {
      blocks = [...blocks, b];
    }
    editingBlock = null;
    // Invalidate scenario when model changes
    if (scenarioResult) { scenarioResult = null; }
  }

  function handleDeleteBlock(id: string) {
    blocks = blocks.filter(b => b.id !== id);
    if (scenarioResult) { scenarioResult = null; }
  }

  // ── Import from Runway ────────────────────────────────────────────────────
  function applyImport() {
    if (!importSuggestion) return;
    initialCash = importSuggestion.initialCash;
    blocks      = importSuggestion.blocks;
    showImportBanner = false;
  }

  // ── AI Stress Test ────────────────────────────────────────────────────────
  async function handleGenerateScenario() {
    if (isGenerating || weeklyLocked || !hasBlocks) return;
    isGenerating  = true;
    errorMessage  = null;

    try {
      const res = await fetch('/api/cashflow-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialCash,
          blocks,
          baseProjection,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        if (res.status === 429) {
          errorMessage = err.message ?? 'Wochenlimit erreicht.';
          lastScenarioAt = Date.now();
        } else {
          errorMessage = err.message ?? 'Fehler bei der Analyse. Bitte versuchen Sie es später erneut.';
        }
        return;
      }

      const data = await res.json() as { scenarios: any[] };

      scenarioResult = {
        scenarios:   data.scenarios,
        generatedAt: Date.now(),
      };
      lastScenarioAt = Date.now();
    } catch (e) {
      errorMessage = 'Netzwerkfehler. Bitte Verbindung prüfen.';
    } finally {
      isGenerating = false;
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    initialCash    = 10000;
    blocks         = [];
    scenarioResult = null;
    lastScenarioAt = null;
    errorMessage   = null;
    showImportBanner = false;
  }
</script>

<div class="space-y-6">
  <!-- Import banner -->
  {#if showImportBanner && importSuggestion}
    <div class="flex items-start justify-between gap-3 rounded-xl border border-eucalyptus-500/30 bg-eucalyptus-50 px-4 py-3 dark:bg-eucalyptus-500/10">
      <div class="min-w-0">
        <p class="text-sm font-medium text-eucalyptus-800 dark:text-eucalyptus-200">
          Runway-Modell erkannt
        </p>
        <p class="mt-0.5 text-xs text-eucalyptus-700 dark:text-eucalyptus-300">
          {importSuggestion.blocks.length} Positionen aus Ihrem Startup-Runway-Modell verfügbar.
          Startkapital: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(importSuggestion.initialCash)}.
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button
          type="button"
          onclick={applyImport}
          class="flex items-center gap-1.5 rounded-lg bg-eucalyptus-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-eucalyptus-700 dark:bg-eucalyptus-500"
        >
          <Download size={12} />
          Importieren
        </button>
        <button
          type="button"
          onclick={() => (showImportBanner = false)}
          class="rounded-lg px-3 py-1.5 text-xs font-medium text-eucalyptus-700 hover:bg-eucalyptus-100 dark:text-eucalyptus-300 dark:hover:bg-eucalyptus-500/15"
        >
          Ignorieren
        </button>
      </div>
    </div>
  {/if}

  <!-- Opening balance -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
    <label for="initial-cash" class="mb-2 block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      Anfangsbestand (Kassenbestand / Liquiditätsreserve)
    </label>
    <div class="flex items-center gap-3">
      <input
        id="initial-cash"
        type="number"
        bind:value={initialCash}
        min="0"
        step="1000"
        oninput={() => { if (scenarioResult) scenarioResult = null; }}
        class="w-48 rounded-xl border border-black/10 bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
      />
      <span class="text-sm text-text-secondary-light dark:text-text-secondary-dark">€</span>
    </div>
  </div>

  <!-- Chart -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
    <h2 class="mb-4 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
      12-Monats-Liquiditätsprognose
    </h2>
    <CashflowChart baseData={baseProjection} {scenarioResult} {initialCash} />
  </div>

  <!-- Metrics -->
  <MetricsSummary baseData={baseProjection} {initialCash} />

  <!-- Two-column layout on larger screens -->
  <div class="grid gap-6 lg:grid-cols-[1fr_340px]">
    <!-- Block manager -->
    <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
      <h2 class="mb-4 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
        Finanzpositionen
      </h2>
      <BlockManager
        {blocks}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDeleteBlock}
      />
    </div>

    <!-- Scenario panel -->
    <ScenarioPanel
      {scenarioResult}
      {weeklyLocked}
      {cooldownLabel}
      {isGenerating}
      {errorMessage}
      {hasBlocks}
      onGenerate={handleGenerateScenario}
    />
  </div>

  <!-- Reset -->
  <div class="flex justify-end">
    <button
      type="button"
      onclick={handleReset}
      class="text-xs text-text-secondary-light underline underline-offset-2 hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
    >
      Modell zurücksetzen
    </button>
  </div>
</div>

<!-- Block form modal -->
{#if editingBlock !== null}
  <BlockFormModal
    block={editingBlock}
    onSave={handleSaveBlock}
    onClose={() => (editingBlock = null)}
  />
{/if}
