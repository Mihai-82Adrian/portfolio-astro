<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { AlertTriangle, CheckCircle2 } from 'lucide-svelte';
  import type { RunwayProjection } from '@/lib/fin-core/runway';

  export let projection: RunwayProjection;

  let canvas: HTMLCanvasElement;
  let chartInstance: import('chart.js').Chart | null = null;

  // Mutable ref used inside the plugin — avoids stale closure
  let liveProjection = projection;

  const EUCALYPTUS    = 'rgb(107, 142, 111)';
  const EUCALYPTUS_BG = 'rgba(107, 142, 111, 0.15)';

  const deathValleyPlugin = {
    id: 'deathValleyZone',
    beforeDraw(chart: any) {
      const { ctx, chartArea, scales } = chart;
      const snaps = liveProjection.snapshots;
      if (!snaps.length || !chartArea) return;

      ctx.save();
      let inDV = false;
      let dvStart = 0;

      snaps.forEach((snap, i) => {
        const x = scales.x.getPixelForValue(i);
        if (snap.isDeathValley && !inDV) { inDV = true; dvStart = x; }
        else if (!snap.isDeathValley && inDV) { inDV = false; fillDV(ctx, chartArea, dvStart, x); }
      });
      if (inDV) fillDV(ctx, chartArea, dvStart, scales.x.getPixelForValue(snaps.length - 1));
      ctx.restore();
    },
  };

  function fillDV(ctx: CanvasRenderingContext2D, area: any, x1: number, x2: number) {
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, 'rgba(239,68,68,0.22)');
    g.addColorStop(1, 'rgba(249,115,22,0.08)');
    ctx.fillStyle = g;
    ctx.fillRect(x1, area.top, x2 - x1, area.bottom - area.top);
  }

  async function buildChart() {
    if (!canvas) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    // Register plugin only once
    if (!Chart.registry.plugins.get(deathValleyPlugin.id as any)) {
      Chart.register(deathValleyPlugin as any);
    }

    chartInstance?.destroy();
    const snaps = liveProjection.snapshots;

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: snaps.map(s => s.label),
        datasets: [{
          label: 'Cash-Balance',
          data: snaps.map(s => Math.max(s.closingBalance, 0)),
          borderColor: EUCALYPTUS,
          backgroundColor: EUCALYPTUS_BG,
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: snaps.length <= 18 ? 3 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: EUCALYPTUS,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const snap = liveProjection.snapshots[ctx.dataIndex];
                if (!snap) return '';
                const lines = [
                  `Cash: ${eur(snap.closingBalance)}`,
                  `Burn: ${eur(snap.totalBurn)}`,
                  `MRR:  ${eur(snap.mrr)}`,
                ];
                if (snap.injections > 0) lines.push(`Injektion: ${eur(snap.injections)}`);
                return lines;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: 'rgb(107,114,128)', font: { size: 11 }, maxRotation: 45 },
            grid:  { color: 'rgba(128,128,128,0.08)' },
          },
          y: {
            ticks: { color: 'rgb(107,114,128)', font: { size: 11 }, callback: v => eur(Number(v)) },
            grid:  { color: 'rgba(128,128,128,0.08)' },
          },
        },
      },
    });
  }

  /** Update data in-place — no destroy/rebuild, no timing issues */
  function updateChart() {
    if (!chartInstance) return;
    const snaps = liveProjection.snapshots;
    chartInstance.data.labels = snaps.map(s => s.label);
    chartInstance.data.datasets[0].data = snaps.map(s => Math.max(s.closingBalance, 0));
    chartInstance.update('none');
  }

  function eur(v: number) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  onMount(() => buildChart());
  onDestroy(() => chartInstance?.destroy());

  // React to projection changes: update ref then patch chart data (no rebuild)
  $: {
    liveProjection = projection;
    updateChart();
  }
</script>

<div class="relative h-64 w-full">
  <canvas bind:this={canvas} aria-label="Runway-Projektion Chart" role="img"></canvas>
</div>

{#if projection.deathValleyMonth !== null}
  <p class="mt-2 flex items-center gap-1.5 text-xs text-red-400">
    <AlertTriangle size={13} aria-hidden="true" class="shrink-0" />
    Fundraising-Alarm ab Monat {projection.deathValleyMonth + 1} — weniger als 3 Monate Runway verbleibend.
  </p>
{:else if projection.runwayMonths >= 36}
  <p class="mt-2 flex items-center gap-1.5 text-xs text-eucalyptus-500 dark:text-eucalyptus-400">
    <CheckCircle2 size={13} aria-hidden="true" class="shrink-0" />
    Runway über 36 Monate — kein Death Valley im Projektionshorizont.
  </p>
{/if}
