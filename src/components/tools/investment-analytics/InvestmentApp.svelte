<script lang="ts">
  import { onMount } from 'svelte';
  import { FileDown, Sparkles, BookOpen } from 'lucide-svelte';

  import type { InvestmentInput, InvestmentState, MonteCarloResult } from '@/lib/investment/types';
  import {
    STORAGE_KEY,
    DEFAULT_INPUT,
    isWeeklyCooldownActive,
    cooldownRemainingLabel,
  } from '@/lib/investment/types';
  import {
    calcReturnMetrics,
    calcRiskMetrics,
    runMonteCarlo,
    calcTax,
  } from '@/lib/investment/analytics';
  import { generateInvestmentPdf } from '@/lib/investment/pdfExport';

  import InputPanel        from './InputPanel.svelte';
  import MetricsDashboard  from './MetricsDashboard.svelte';
  import MonteCarloPanel   from './MonteCarloPanel.svelte';
  import TaxPanel          from './TaxPanel.svelte';
  import InvestmentChart   from './InvestmentChart.svelte';
  import MethodologyModal  from './MethodologyModal.svelte';

  // ── State ─────────────────────────────────────────────────────────────────
  let input        = $state<InvestmentInput>({ ...DEFAULT_INPUT });
  let aiNarrative  = $state<string | null>(null);
  let lastAiAt     = $state<number | null>(null);
  let restored     = $state(false);

  let activeTab    = $state<'eingabe' | 'kennzahlen' | 'montecarlo' | 'steuer'>('eingabe');
  let mcResult     = $state<MonteCarloResult | null>(null);
  let isRunningMC  = $state(false);

  let isAnalyzing  = $state(false);
  let aiError      = $state<string | null>(null);

  let pdfBusy      = $state(false);
  let pdfError     = $state<string | null>(null);
  let showGuide    = $state(false);

  // PDF chart capture callback
  let getChartImage = $state<(() => string | null) | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const sortedCashFlows = $derived(
    [...input.cashFlows].sort((a, b) => a.year - b.year)
  );

  const returnMetrics = $derived(
    calcReturnMetrics(input.initialInvestment, sortedCashFlows, input.discountRate)
  );

  const riskMetrics = $derived(
    calcRiskMetrics(input.initialInvestment, sortedCashFlows)
  );

  const taxResult = $derived(
    calcTax(
      input.initialInvestment,
      sortedCashFlows,
      input.isFund,
      input.isAccumulating,
      input.ter,
      input.personalFreibetrag
    )
  );

  // Build cumulative value series for chart
  const cumulativeValues = $derived(buildCumulative(input.initialInvestment, sortedCashFlows));
  const yearLabels = $derived(sortedCashFlows.map(cf => `Jahr ${cf.year}`));

  function buildCumulative(initial: number, cashFlows: typeof sortedCashFlows): number[] {
    let v = initial;
    return cashFlows.map(cf => {
      v += cf.amount;
      return v;
    });
  }

  const weeklyLocked  = $derived(isWeeklyCooldownActive(lastAiAt));
  const cooldownLabel = $derived(cooldownRemainingLabel(lastAiAt));
  const hasData       = $derived(input.cashFlows.length > 0);

  // ── Persist ───────────────────────────────────────────────────────────────
  $effect(() => {
    if (!restored) return;
    const snapshot: InvestmentState = { input, aiNarrative, lastAiAt };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
  });

  // ── Restore ───────────────────────────────────────────────────────────────
  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<InvestmentState>;
        if (p.input)                           input        = { ...DEFAULT_INPUT, ...p.input };
        if (typeof p.aiNarrative === 'string') aiNarrative  = p.aiNarrative;
        if (typeof p.lastAiAt    === 'number') lastAiAt     = p.lastAiAt;
      }
    } catch {}
    restored = true;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleInputUpdate(updated: InvestmentInput) {
    input     = updated;
    mcResult  = null; // invalidate MC when inputs change
    aiNarrative = null;
  }

  async function handleRunMC() {
    if (isRunningMC || !hasData) return;
    isRunningMC = true;
    // Run on next tick to allow spinner to render
    await new Promise(r => setTimeout(r, 16));
    try {
      mcResult = runMonteCarlo(input.initialInvestment, sortedCashFlows);
    } finally {
      isRunningMC = false;
    }
  }

  // ── AI Analysis ───────────────────────────────────────────────────────────
  async function handleAiAnalysis() {
    if (isAnalyzing || weeklyLocked || !hasData) return;
    isAnalyzing = true;
    aiError     = null;

    try {
      const payload = {
        initialInvestment: input.initialInvestment,
        returnMetrics: {
          roi:         returnMetrics.roi,
          cagr:        returnMetrics.cagr,
          irr:         returnMetrics.irr,
          npv:         returnMetrics.npv,
          paybackYear: returnMetrics.paybackYear,
        },
        riskMetrics: {
          sharpeRatio:          riskMetrics.sharpeRatio,
          sortinoRatio:         riskMetrics.sortinoRatio,
          maxDrawdown:          riskMetrics.maxDrawdown,
          annualizedVolatility: riskMetrics.annualizedVolatility,
          var95:                riskMetrics.var95,
          var99:                riskMetrics.var99,
        },
        taxResult: {
          grossGain:    taxResult.grossGain,
          taxAmount:    taxResult.taxAmount,
          netGain:      taxResult.netGain,
          effectiveTax: taxResult.effectiveTaxRate,
        },
        mcResult: mcResult ? {
          probPositive:      mcResult.probPositive,
          expectedFinalValue: mcResult.expectedFinalValue,
          p5Final:           mcResult.percentile5[mcResult.percentile5.length - 1],
          p95Final:          mcResult.percentile95[mcResult.percentile95.length - 1],
        } : null,
      };

      const res = await fetch('/api/investment-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        if (res.status === 429) {
          aiError    = err.message ?? 'Wochenlimit erreicht.';
          lastAiAt   = Date.now();
        } else {
          aiError = err.message ?? 'Fehler bei der KI-Analyse.';
        }
        return;
      }

      const data = await res.json() as any;
      aiNarrative = JSON.stringify(data);
      lastAiAt    = Date.now();
    } catch {
      aiError = 'Netzwerkfehler. Bitte Verbindung prüfen.';
    } finally {
      isAnalyzing = false;
    }
  }

  // ── PDF Export ────────────────────────────────────────────────────────────
  async function handleDownloadPdf() {
    if (pdfBusy || !hasData) return;
    pdfBusy  = true;
    pdfError = null;
    try {
      const chartImage = getChartImage?.() ?? null;
      await generateInvestmentPdf({
        input,
        returnMetrics,
        riskMetrics,
        mcResult,
        taxResult,
        aiNarrative,
        chartImageBase64: chartImage,
      });
    } catch {
      pdfError = 'PDF konnte nicht erstellt werden.';
    } finally {
      pdfBusy = false;
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    input       = { ...DEFAULT_INPUT };
    mcResult    = null;
    aiNarrative = null;
    lastAiAt    = null;
    aiError     = null;
    activeTab   = 'eingabe';
  }

  // Parse AI narrative for display
  function parseNarrative(raw: string | null): Record<string, string> | null {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  const TABS: { id: typeof activeTab; label: string }[] = [
    { id: 'eingabe',     label: 'Eingabe' },
    { id: 'kennzahlen',  label: 'Kennzahlen' },
    { id: 'montecarlo',  label: 'Monte Carlo' },
    { id: 'steuer',      label: 'Steuer' },
  ];
</script>

<div class="space-y-6">
  <!-- Tab Navigation -->
  <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-1.5 dark:border-white/10">
    <div class="flex items-center gap-1">
      <nav class="flex flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="Investment Analytics Bereiche">
        {#each TABS as tab}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onclick={() => (activeTab = tab.id)}
            class="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200
              {activeTab === tab.id
                ? 'bg-eucalyptus-500 text-white shadow-sm'
                : 'text-text-secondary-light hover:bg-black/5 dark:text-text-secondary-dark dark:hover:bg-white/5'}"
          >
            {tab.label}
          </button>
        {/each}
      </nav>
      <button
        type="button"
        onclick={() => (showGuide = true)}
        class="ml-1 flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-text-muted-light transition-colors hover:text-eucalyptus-600 dark:text-text-muted-dark dark:hover:text-eucalyptus-400"
        aria-label="Methodik & Guide öffnen"
      >
        <BookOpen size={13} aria-hidden="true" />
        <span class="hidden sm:inline">Methodik & Guide</span>
      </button>
    </div>
  </div>

  <!-- Tab Panels -->
  {#if activeTab === 'eingabe'}
    <div>
      <!-- Chart preview in input tab -->
      {#if hasData}
        <div class="mb-5 rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-5 dark:border-white/10">
          <h3 class="mb-4 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
            Wertentwicklung (Vorschau)
          </h3>
          <InvestmentChart
            initialInvestment={input.initialInvestment}
            {cumulativeValues}
            years={yearLabels}
            monteCarloResult={null}
          />
        </div>
      {/if}
      <InputPanel {input} onUpdate={handleInputUpdate} />
    </div>
  {:else if activeTab === 'kennzahlen'}
    {#if hasData}
      <MetricsDashboard {returnMetrics} {riskMetrics} />
    {:else}
      <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-8 text-center dark:border-white/10">
        <p class="text-sm text-text-muted-light dark:text-text-muted-dark">Bitte zuerst Cashflows unter "Eingabe" definieren.</p>
      </div>
    {/if}
  {:else if activeTab === 'montecarlo'}
    <MonteCarloPanel
      initialInvestment={input.initialInvestment}
      {cumulativeValues}
      years={yearLabels}
      {mcResult}
      isRunning={isRunningMC}
      onRun={handleRunMC}
    />
  {:else if activeTab === 'steuer'}
    {#if hasData}
      <TaxPanel {taxResult} {input} />
    {:else}
      <div class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-8 text-center dark:border-white/10">
        <p class="text-sm text-text-muted-light dark:text-text-muted-dark">Bitte zuerst Cashflows unter "Eingabe" definieren.</p>
      </div>
    {/if}
  {/if}

  <!-- AI Narrative Display -->
  {#if aiNarrative}
    {@const parsed = parseNarrative(aiNarrative)}
    {#if parsed}
      <div class="rounded-2xl border border-eucalyptus-500/30 bg-eucalyptus-50 p-5 dark:bg-eucalyptus-500/10">
        <div class="flex items-center gap-2 mb-3">
          <Sparkles size={16} class="text-eucalyptus-600 dark:text-eucalyptus-400" />
          <h3 class="text-sm font-semibold text-eucalyptus-800 dark:text-eucalyptus-200">KI-Analyse</h3>
        </div>
        <div class="space-y-3">
          {#if parsed.summary}
            <div>
              <p class="text-xs font-semibold text-eucalyptus-700 dark:text-eucalyptus-300 mb-0.5">Gesamtbewertung</p>
              <p class="text-sm text-eucalyptus-900 dark:text-eucalyptus-100">{parsed.summary}</p>
            </div>
          {/if}
          {#if parsed.strengths}
            <div>
              <p class="text-xs font-semibold text-eucalyptus-700 dark:text-eucalyptus-300 mb-0.5">Stärken</p>
              <p class="text-sm text-eucalyptus-900 dark:text-eucalyptus-100">{parsed.strengths}</p>
            </div>
          {/if}
          {#if parsed.risks}
            <div>
              <p class="text-xs font-semibold text-eucalyptus-700 dark:text-eucalyptus-300 mb-0.5">Risiken</p>
              <p class="text-sm text-eucalyptus-900 dark:text-eucalyptus-100">{parsed.risks}</p>
            </div>
          {/if}
          {#if parsed.recommendation}
            <div>
              <p class="text-xs font-semibold text-eucalyptus-700 dark:text-eucalyptus-300 mb-0.5">Empfehlung</p>
              <p class="text-sm font-medium text-eucalyptus-900 dark:text-eucalyptus-100">{parsed.recommendation}</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Global Actions -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <!-- Left: KI + PDF -->
    <div class="flex flex-col gap-3">
      <!-- KI Analysis button -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-3">
          <button
            type="button"
            onclick={handleAiAnalysis}
            disabled={isAnalyzing || weeklyLocked || !hasData}
            class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all
              {isAnalyzing || weeklyLocked || !hasData
                ? 'cursor-not-allowed border border-black/10 text-text-muted-light dark:border-white/10 dark:text-text-muted-dark'
                : 'bg-eucalyptus-600 text-white hover:bg-eucalyptus-700 dark:bg-eucalyptus-500 dark:hover:bg-eucalyptus-400'}"
          >
            {#if isAnalyzing}
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Analysiert…
            {:else}
              <Sparkles size={15} />
              KI-Analyse
            {/if}
          </button>
          {#if weeklyLocked && cooldownLabel}
            <span class="text-xs text-text-muted-light dark:text-text-muted-dark">
              Verfügbar in {cooldownLabel}
            </span>
          {:else if !aiNarrative && !weeklyLocked}
            <span class="rounded-full border border-eucalyptus-500/30 bg-eucalyptus-500/10 px-2 py-0.5 text-xs text-eucalyptus-700 dark:text-eucalyptus-300">
              1× pro Woche
            </span>
          {/if}
        </div>
        {#if aiError}
          <p class="text-xs text-red-500">{aiError}</p>
        {/if}
      </div>

      <!-- PDF Export -->
      {#if hasData}
        <div class="flex flex-col gap-1">
          <button
            type="button"
            onclick={handleDownloadPdf}
            disabled={pdfBusy}
            class="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all
              {pdfBusy
                ? 'cursor-wait border-black/10 text-text-muted-light dark:border-white/10 dark:text-text-muted-dark'
                : 'border-eucalyptus-500/40 text-eucalyptus-700 hover:border-eucalyptus-500 hover:bg-eucalyptus-50 dark:border-eucalyptus-500/30 dark:text-eucalyptus-400 dark:hover:bg-eucalyptus-500/10'}"
          >
            {#if pdfBusy}
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              PDF wird erstellt…
            {:else}
              <FileDown size={15} />
              Als PDF exportieren
            {/if}
          </button>
          {#if pdfError}
            <p class="text-xs text-red-500">{pdfError}</p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Right: Reset -->
    <button
      type="button"
      onclick={handleReset}
      class="mt-1 self-start text-xs text-text-secondary-light underline underline-offset-2 hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
    >
      Zurücksetzen
    </button>
  </div>

  <!-- Methodology modal -->
  <MethodologyModal bind:open={showGuide} />

  <!-- Offscreen chart — always mounted so PDF export always has a live canvas -->
  {#if hasData}
    <div
      style="position:absolute;left:-9999px;width:640px;height:280px;overflow:hidden;"
      aria-hidden="true"
      tabindex="-1"
    >
      <InvestmentChart
        initialInvestment={input.initialInvestment}
        {cumulativeValues}
        years={yearLabels}
        monteCarloResult={mcResult}
        onChartReady={(fn) => { getChartImage = fn; }}
      />
    </div>
  {/if}
</div>
