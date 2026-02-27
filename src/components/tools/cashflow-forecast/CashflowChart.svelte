<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MonthlyDataPoint, StressScenarioResult } from '@/lib/cashflow/types';

  let {
    baseData,
    scenarioResult = null,
    initialCash = 0,
    onChartReady = undefined,
  }: {
    baseData:       MonthlyDataPoint[];
    scenarioResult: StressScenarioResult | null;
    initialCash:    number;
    onChartReady?:  (getImage: () => string | null) => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chartInstance: import('chart.js').Chart | null = null;

  // Keep a mutable ref inside the plugin to avoid stale closures
  let liveBase: MonthlyDataPoint[] = baseData;
  let liveScenario: StressScenarioResult | null = scenarioResult;
  let liveInitialCash = initialCash;

  const COLORS = {
    base:        'rgb(107, 142, 111)',
    baseBg:      'rgba(107, 142, 111, 0.12)',
    latePayment: 'rgba(217, 119, 6, 0.85)',
    churnSpike:  'rgba(184, 92, 74, 0.85)',
    costShock:   'rgba(124, 58, 237, 0.85)',
  };

  const scenarioColors = [COLORS.latePayment, COLORS.churnSpike, COLORS.costShock];

  // ── Death-valley + zero-line plugin ─────────────────────────────────────
  const cashflowPlugin = {
    id: 'cashflowZones',
    beforeDraw(chart: any) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();

      // Zero line
      const y0 = scales.y.getPixelForValue(0);
      if (y0 >= chartArea.top && y0 <= chartArea.bottom) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y0);
        ctx.lineTo(chartArea.right, y0);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Insolvency zone for base case
      const pts = liveBase;
      if (pts.length > 1) {
        let inZone = false;
        let zoneStart = 0;
        pts.forEach((p, i) => {
          const x = scales.x.getPixelForValue(i);
          if (p.cumulative < 0 && !inZone) { inZone = true; zoneStart = x; }
          else if (p.cumulative >= 0 && inZone) {
            inZone = false;
            fillInsolvencyZone(ctx, chartArea, zoneStart, x);
          }
        });
        if (inZone) fillInsolvencyZone(ctx, chartArea, zoneStart, scales.x.getPixelForValue(pts.length - 1));
      }

      ctx.restore();
    },
  };

  function fillInsolvencyZone(ctx: CanvasRenderingContext2D, area: any, x1: number, x2: number) {
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, 'rgba(239,68,68,0.18)');
    g.addColorStop(1, 'rgba(249,115,22,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(x1, area.top, x2 - x1, area.bottom - area.top);
  }

  function eur(v: number) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  function buildDatasets() {
    const datasets: any[] = [
      {
        label: 'Liquidität (Basis)',
        data: liveBase.map(d => d.cumulative),
        borderColor: COLORS.base,
        backgroundColor: COLORS.baseBg,
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: liveBase.length <= 12 ? 3 : 0,
        pointHoverRadius: 5,
        pointBackgroundColor: COLORS.base,
      },
    ];

    if (liveScenario) {
      liveScenario.scenarios.forEach((sc, idx) => {
        datasets.push({
          label: sc.title,
          data: sc.monthlyData.map(d => d.cumulative),
          borderColor: scenarioColors[idx],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          pointHoverRadius: 5,
        });
      });
    }

    return datasets;
  }

  async function buildChart() {
    if (!canvas) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    if (!Chart.registry.plugins.get(cashflowPlugin.id as any)) {
      Chart.register(cashflowPlugin as any);
    }

    chartInstance?.destroy();

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: liveBase.map(d => d.month),
        datasets: buildDatasets(),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 250 },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'rgb(107,114,128)',
              font: { size: 11 },
              boxWidth: 20,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const base = liveBase[ctx.dataIndex];
                if (ctx.datasetIndex === 0 && base) {
                  return [
                    `Liquidität: ${eur(ctx.parsed.y)}`,
                    `Einnahmen: ${eur(base.revenue)}`,
                    `Kosten: ${eur(base.costs)}`,
                  ];
                }
                return `${ctx.dataset.label}: ${eur(ctx.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: 'rgb(107,114,128)', font: { size: 11 }, maxRotation: 0 },
            grid:  { color: 'rgba(128,128,128,0.08)' },
          },
          y: {
            ticks: {
              color: 'rgb(107,114,128)',
              font: { size: 11 },
              callback: (v: any) => eur(Number(v)),
            },
            grid: { color: 'rgba(128,128,128,0.08)' },
          },
        },
      },
    });
  }

  function updateChart() {
    if (!chartInstance) return;
    liveBase     = baseData;
    liveScenario = scenarioResult;
    liveInitialCash = initialCash;
    chartInstance.data.labels   = liveBase.map(d => d.month);
    chartInstance.data.datasets = buildDatasets();
    chartInstance.update('none');
  }

  // ── Public API (accessible via bind:this from CashflowApp) ─────────────
  export function getImageBase64(): string | null {
    if (!chartInstance || !canvas) return null;
    // Draw onto an offscreen canvas with white background (transparent canvas → PDF-safe)
    const offscreen = document.createElement('canvas');
    offscreen.width  = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(canvas, 0, 0);
    return offscreen.toDataURL('image/png', 1);
  }

  onMount(async () => {
    await buildChart();
    // Expose getImageBase64 to parent via callback (Svelte 5: bind:this doesn't expose exports)
    onChartReady?.(getImageBase64);
  });
  onDestroy(() => chartInstance?.destroy());

  $effect(() => {
    // Trigger on any prop change
    void baseData;
    void scenarioResult;
    updateChart();
  });
</script>

<div class="relative h-72 w-full sm:h-80">
  <canvas bind:this={canvas} aria-label="Cashflow-Projektion" role="img"></canvas>
</div>
