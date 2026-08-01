<script lang="ts">
  import Icon from '@/components/ui/Icon.svelte';
  import InfoTooltip from '@/components/tools/ui/InfoTooltip.svelte';
  import type { RunwayProjection } from '@/lib/fin-core/runway';
  import { formatEURCompact } from '@/lib/fin-core/runway';

  export let projection: RunwayProjection;

  $: runwayMonths  = projection.runwayMonths;
  $: dvMonth       = projection.deathValleyMonth;
  $: bankruptMonth = projection.bankruptMonth;
  $: peakBurn      = projection.peakBurn;
  $: totalInj      = projection.totalInjections;

  $: runwayColor =
    runwayMonths <= 3 ? 'text-red-500'
    : runwayMonths <= 9 ? 'text-orange-400'
    : 'text-eucalyptus-600 dark:text-eucalyptus-400';

  // ─── CFO Insight ────────────────────────────────────────────────────────
  type InsightLevel = 'critical' | 'danger' | 'warning' | 'ok' | 'neutral' | 'inactive';

  interface Insight {
    level: InsightLevel;
    title: string;
    text: string;
  }

  // RUNWAY-01: zero opening cash, zero burn, zero revenue for the whole horizon is a
  // no-cash-consumption state, not bankruptcy — but it must not read as a celebratory
  // "healthy setup" either, since nothing has actually been funded or validated yet.
  $: isNoActivity =
    projection.snapshots.length > 0 &&
    projection.snapshots[0].openingBalance === 0 &&
    peakBurn === 0 &&
    projection.snapshots.every(s => s.mrr === 0);

  $: insight = ((): Insight => {
    if (isNoActivity) return {
      level: 'inactive',
      title: 'Keine Aktivität im Modell',
      text: 'Kein laufender Burn – im Prognosezeitraum wird keine Liquidität verbraucht. Startkapital und Umsatz liegen bei 0 €.',
    };
    if (bankruptMonth !== null) return {
      level: 'critical',
      title: 'Kritisch — Kapital erschöpft',
      text: `Das Kapital ist in Monat ${bankruptMonth + 1} aufgebraucht. Eine sofortige Finanzierung oder drastische Kostensenkung ist zwingend nötig — idealerweise 3–6 Monate vor diesem Datum.`,
    };
    if (dvMonth !== null && dvMonth <= 3) return {
      level: 'danger',
      title: 'Akuter Fundraising-Bedarf',
      text: `Die kritische 3-Monats-Schwelle wird bereits in Monat ${dvMonth + 1} erreicht. Due-Diligence-Prozesse dauern 2–4 Monate — der Fundraising-Prozess sollte sofort beginnen.`,
    };
    if (dvMonth !== null) return {
      level: 'warning',
      title: 'Fundraising-Fenster beachten',
      text: `Death Valley wird in Monat ${dvMonth + 1} erreicht. Starte den Prozess spätestens in Monat ${Math.max(1, dvMonth - 3)} — Due Diligence benötigt 2–4 Monate Vorlauf.`,
    };
    if (runwayMonths >= 36) return {
      level: 'ok',
      title: 'Gesundes Setup',
      text: `Das Startup ist bei dieser Planung für 3+ Jahre durchfinanziert. Kein kurzfristiger Fundraising-Druck — Fokus auf Wachstum und Product-Market-Fit.`,
    };
    return {
      level: 'neutral',
      title: `Moderater Runway — ${runwayMonths} Monate`,
      text: `Kein Death Valley in Sicht, aber eine Seed-Runde oder Bridge-Finanzierung sollte proaktiv geprüft werden.`,
    };
  })();

  const insightStyles: Record<InsightLevel, string> = {
    critical: 'border-red-500/40     bg-red-500/10     text-red-300',
    danger:   'border-orange-500/40  bg-orange-500/10  text-orange-300',
    warning:  'border-amber-500/40   bg-amber-500/10   text-amber-300',
    ok:       'border-eucalyptus-500/40 bg-eucalyptus-500/10 text-eucalyptus-300',
    neutral:  'border-blue-500/30    bg-blue-500/10    text-blue-300',
    inactive: 'border-black/15        bg-black/5        text-text-primary-light dark:border-white/15 dark:bg-white/5 dark:text-text-primary-dark',
  };

  const insightTitleStyles: Record<InsightLevel, string> = {
    critical: 'text-red-400',
    danger:   'text-orange-400',
    warning:  'text-amber-400',
    ok:       'text-eucalyptus-400',
    neutral:  'text-blue-400',
    inactive: 'text-text-muted-light dark:text-text-muted-dark',
  };
</script>

<!-- KPI Grid -->
<div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">

  <!-- Runway -->
  <div class="rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
    <p class="min-w-0 text-xs font-semibold uppercase tracking-wider text-text-muted-light [overflow-wrap:anywhere] dark:text-text-muted-dark">
      Runway
    </p>
    <p class="mt-1.5 text-2xl font-bold {runwayColor}">
      {runwayMonths >= 36 ? '36+' : runwayMonths}<span class="ml-0.5 text-sm font-normal"> Mo.</span>
    </p>
  </div>

  <!-- Death Valley / Fundraising Alert -->
  <div class="rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
    <div class="flex min-w-0 flex-wrap items-center gap-0.5">
      <p class="min-w-0 text-xs font-semibold uppercase tracking-wider text-text-muted-light [overflow-wrap:anywhere] dark:text-text-muted-dark">
        Fundraising-Alarm
      </p>
      <InfoTooltip>
        <p class="mb-1 font-semibold text-white">Death Valley</p>
        Die kritische Phase, in der die Runway unter 3 Monate fällt. Ab hier ist Fundraising meist zu spät — Due-Diligence-Prozesse dauern 2–4 Monate. Plane frühzeitig.
      </InfoTooltip>
    </div>
    <p class="mt-1.5 text-2xl font-bold {dvMonth !== null ? 'text-red-500' : 'text-eucalyptus-600 dark:text-eucalyptus-400'}">
      {dvMonth !== null ? `Mo. ${dvMonth + 1}` : '–'}
    </p>
  </div>

  <!-- Peak Burn -->
  <div class="rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
    <div class="flex min-w-0 flex-wrap items-center gap-0.5">
      <p class="min-w-0 text-xs font-semibold uppercase tracking-wider text-text-muted-light [overflow-wrap:anywhere] dark:text-text-muted-dark">
        Peak Burn
      </p>
      <InfoTooltip>
        <p class="mb-1 font-semibold text-white">Peak Burn Rate</p>
        Der Monat mit dem höchsten Netto-Cash-Verlust (Ausgaben minus Einnahmen), bevor das MRR-Wachstum die Kosten einholt. Bestimmt das Mindest-Fundraising-Volumen.
      </InfoTooltip>
    </div>
    <p class="mt-1.5 text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
      {formatEURCompact(peakBurn)}<span class="ml-0.5 text-sm font-normal">/Mo.</span>
    </p>
  </div>

  <!-- Capital Injections -->
  <div class="rounded-xl border border-black/10 bg-[var(--bg-primary)] p-4 dark:border-white/10">
    <p class="min-w-0 text-xs font-semibold uppercase tracking-wider text-text-muted-light [overflow-wrap:anywhere] dark:text-text-muted-dark">
      Kapitalzuflüsse
    </p>
    <p class="mt-1.5 text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
      {totalInj > 0 ? formatEURCompact(totalInj) : '–'}
    </p>
  </div>

</div>

<!-- CFO Insight Card -->
<div class="mt-3 rounded-xl border {insightStyles[insight.level]} px-4 py-3">
  <div class="mb-1.5 flex items-center gap-2">
    {#if insight.level === 'critical'}
      <Icon name="AlertCircle" size={14} class="shrink-0 text-red-400" aria-hidden="true" />
    {:else if insight.level === 'danger' || insight.level === 'warning'}
      <Icon name="AlertTriangle" size={14} class="shrink-0 {insight.level === 'danger' ? 'text-orange-400' : 'text-amber-400'}" aria-hidden="true" />
    {:else if insight.level === 'ok'}
      <Icon name="CheckCircle2" size={14} class="shrink-0 text-eucalyptus-400" aria-hidden="true" />
    {:else if insight.level === 'inactive'}
      <Icon name="Info" size={14} class="shrink-0 text-text-muted-light dark:text-text-muted-dark" aria-hidden="true" />
    {:else}
      <Icon name="TrendingUp" size={14} class="shrink-0 text-blue-400" aria-hidden="true" />
    {/if}
    <p class="text-xs font-semibold {insightTitleStyles[insight.level]}">
      {insight.title}
    </p>
  </div>
  <p class="text-xs leading-relaxed opacity-90">
    {insight.text}
  </p>
</div>
