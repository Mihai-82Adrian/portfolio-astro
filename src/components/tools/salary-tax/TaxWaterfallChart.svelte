<script lang="ts">
  import InfoTooltip from '@/components/tools/ui/InfoTooltip.svelte';
  import type { BruttoNettoResult } from '@/lib/fin-core/salary-tax';

  let { result }: { result: BruttoNettoResult } = $props();

  // ── Chart geometry ─────────────────────────────────────────────────────────
  const VW       = 620;  // viewBox width
  const CT       = 36;   // chart top (y) — space for value labels
  const CH       = 180;  // chart height in pixels
  const CB       = CT + CH; // chart bottom y = 216
  const BAR_W    = 68;
  const GAP      = 20;
  const X_START  = (VW - (6 * BAR_W + 5 * GAP)) / 2; // ≈ 44

  function colX(i: number) { return X_START + i * (BAR_W + GAP); }

  const eur = (v: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(v);

  // ── Derived values ─────────────────────────────────────────────────────────
  const agTotal  = $derived(result.employerTotalCost);
  const agSocial = $derived(result.kvAG + result.rvAG + result.pvAG + result.avAG);
  const brutto   = $derived(result.grossMonthly);
  const taxes    = $derived(
    result.lohnsteuer + result.solidaritaetszuschlag + result.kirchensteuer,
  );
  const anSocial = $derived(result.kvAN + result.rvAN + result.pvAN + result.avAN);
  const netto    = $derived(result.netMonthly);

  // ── SVG helper: money value → y coordinate (higher money = lower y) ────────
  const yM = $derived((v: number) => CB - (v / agTotal) * CH);
  const hM = $derived((v: number) => (v / agTotal) * CH);

  // ── Bar definitions ────────────────────────────────────────────────────────
  // Each: { x, y (top), h (height), color, label, amount, isDeduction }
  const bars = $derived([
    {
      x: colX(0), y: yM(agTotal), h: hM(agTotal),
      color: 'rgba(107,142,111,0.85)', stroke: '#6B8E6F',
      label: 'AG-Kosten', amount: agTotal, isDeduction: false,
    },
    {
      x: colX(1), y: yM(agTotal), h: hM(agSocial),
      color: 'rgba(59,130,246,0.75)', stroke: '#3b82f6',
      label: 'AG-Sozialabg.', amount: agSocial, isDeduction: true,
    },
    {
      x: colX(2), y: yM(brutto), h: hM(brutto),
      color: 'rgba(107,142,111,0.65)', stroke: '#6B8E6F',
      label: 'Bruttogehalt', amount: brutto, isDeduction: false,
    },
    {
      x: colX(3), y: yM(brutto), h: hM(taxes),
      color: 'rgba(239,68,68,0.75)', stroke: '#ef4444',
      label: 'Steuern', amount: taxes, isDeduction: true,
    },
    {
      x: colX(4), y: yM(netto + anSocial), h: hM(anSocial),
      color: 'rgba(249,115,22,0.75)', stroke: '#f97316',
      label: 'AN-Sozialabg.', amount: anSocial, isDeduction: true,
    },
    {
      x: colX(5), y: yM(netto), h: hM(netto),
      color: 'rgba(107,142,111,0.95)', stroke: '#6B8E6F',
      label: 'Nettogehalt', amount: netto, isDeduction: false,
    },
  ]);

  // ── Bridge lines (dashed, at the "step" transition levels) ────────────────
  const bridges = $derived([
    // Col 0 → Col 1: at brutto level (bottom of AG-Soz bar)
    { x1: colX(0) + BAR_W, x2: colX(1), y: yM(brutto) },
    // Col 1 → Col 2: at brutto level (confirms transition)
    { x1: colX(1) + BAR_W, x2: colX(2), y: yM(brutto) },
    // Col 2 → Col 3: at brutto level (start subtracting taxes)
    { x1: colX(2) + BAR_W, x2: colX(3), y: yM(brutto) },
    // Col 3 → Col 4: after taxes deducted
    { x1: colX(3) + BAR_W, x2: colX(4), y: yM(netto + anSocial) },
    // Col 4 → Col 5: at netto level
    { x1: colX(4) + BAR_W, x2: colX(5), y: yM(netto) },
  ]);

  // ── Tax wedge bracket coordinates ─────────────────────────────────────────
  // Bracket spans over AG-Soz (col 1), Steuern (col 3), AN-Soz (col 4)
  // colX / BAR_W / CB are pure constants → plain const (not $derived)
  const wedgeX1  = colX(1);
  const wedgeX2  = colX(4) + BAR_W;
  const bracketY = CB + 38;

  const wedgePct = $derived(result.taxWedgePercent.toFixed(1).replace('.', ','));
</script>

<!-- Steuerkeil label + tooltip (below chart, HTML — not inside SVG) -->
<div class="mb-2 flex items-center justify-center gap-1 text-xs text-amber-400/80">
  <span class="font-semibold">Steuerkeil {wedgePct} %</span>
  <InfoTooltip>
    Der Steuerkeil (Tax Wedge, OECD-Definition) zeigt, wie viel Prozent der
    Gesamtkosten des Arbeitgebers durch Steuern und Sozialabgaben an den Staat
    fließen. Er umfasst Lohnsteuer, SolZ, Kirchensteuer sowie alle AN- und
    AG-Anteile der Sozialversicherung (KV, RV, PV, AV).
  </InfoTooltip>
</div>

<div class="w-full overflow-x-auto">
  <svg
    viewBox="0 0 {VW} 290"
    width="100%"
    aria-label="Brutto-Netto Waterfall Chart"
    role="img"
    class="block min-w-[480px]"
  >
    <!-- Grid lines (subtle) -->
    {#each [0.25, 0.5, 0.75] as frac}
      <line
        x1={X_START - 8} y1={CT + CH * (1 - frac)}
        x2={X_START + 6 * BAR_W + 5 * GAP + 8} y2={CT + CH * (1 - frac)}
        stroke="rgba(128,128,128,0.12)" stroke-width="1"
      />
    {/each}

    <!-- Bridge lines -->
    {#each bridges as b}
      <line
        x1={b.x1} y1={b.y}
        x2={b.x2} y2={b.y}
        stroke="rgba(128,128,128,0.45)"
        stroke-width="1"
        stroke-dasharray="4 3"
      />
    {/each}

    <!-- Bars -->
    {#each bars as bar, i}
      {#if bar.h > 0.5}
        <!-- Bar rect -->
        <rect
          x={bar.x} y={bar.y}
          width={BAR_W} height={bar.h}
          fill={bar.color}
          rx="3"
        />
        <!-- Subtle top border line for deduction bars -->
        {#if bar.isDeduction}
          <line
            x1={bar.x} y1={bar.y}
            x2={bar.x + BAR_W} y2={bar.y}
            stroke={bar.stroke} stroke-width="1.5"
          />
        {/if}
        <!-- Value label above bar (deductions) or inside (totals) -->
        {#if !bar.isDeduction}
          <!-- amount inside bar or above if too tall -->
          <text
            x={bar.x + BAR_W / 2}
            y={bar.h > 24 ? bar.y + Math.min(bar.h / 2, 20) : bar.y - 6}
            text-anchor="middle"
            font-size="10"
            font-weight="600"
            fill={bar.h > 24 ? 'rgba(255,255,255,0.9)' : 'rgb(209,213,219)'}
          >
            {eur(bar.amount)}
          </text>
        {:else}
          <!-- deduction: label above bar -->
          <text
            x={bar.x + BAR_W / 2}
            y={bar.y - 6}
            text-anchor="middle"
            font-size="10"
            font-weight="600"
            fill="rgb(209,213,219)"
          >
            −{eur(bar.amount)}
          </text>
        {/if}
      {/if}
    {/each}

    <!-- X-axis labels -->
    {#each bars as bar, i}
      <text
        x={bar.x + BAR_W / 2}
        y={CB + 18}
        text-anchor="middle"
        font-size="10"
        fill="rgb(107,114,128)"
      >
        {bar.label}
      </text>
    {/each}

    <!-- Tax Wedge annotation -->
    <line x1={wedgeX1} y1={bracketY} x2={wedgeX2} y2={bracketY}
      stroke="rgba(251,191,36,0.6)" stroke-width="1.5" />
    <line x1={wedgeX1} y1={bracketY - 5} x2={wedgeX1} y2={bracketY}
      stroke="rgba(251,191,36,0.6)" stroke-width="1.5" />
    <line x1={wedgeX2} y1={bracketY - 5} x2={wedgeX2} y2={bracketY}
      stroke="rgba(251,191,36,0.6)" stroke-width="1.5" />
    <text
      x={(wedgeX1 + wedgeX2) / 2}
      y={bracketY + 14}
      text-anchor="middle"
      font-size="10"
      font-weight="700"
      fill="rgb(251,191,36)"
    >
      Steuerkeil {wedgePct} %
    </text>
  </svg>
</div>
