<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MonteCarloResult } from '@/lib/investment/types';

  let {
    initialInvestment = 0,
    cumulativeValues = [],
    years = [],
    monteCarloResult = null,
    onChartReady = undefined,
  }: {
    initialInvestment:  number;
    cumulativeValues:   number[];
    years:              string[];
    monteCarloResult:   MonteCarloResult | null;
    onChartReady?:      (getImage: () => string | null) => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chartInstance: import('chart.js').Chart | null = null;

  let liveInitial       = initialInvestment;
  let liveCumulative    = cumulativeValues;
  let liveYears         = years;
  let liveMC: MonteCarloResult | null = monteCarloResult;

  const BRAND       = 'rgb(107, 142, 111)';
  const BRAND_BG    = 'rgba(107, 142, 111, 0.12)';
  const BRAND_50    = 'rgba(107, 142, 111, 0.50)';
  const BRAND_20    = 'rgba(107, 142, 111, 0.20)';
  const DANGER      = '#dc2626';

  function eur(v: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }

  function buildDatasets(): any[] {
    const datasets: any[] = [
      {
        label: 'Kumulierter Wert (Basis)',
        data:  liveCumulative,
        borderColor:     BRAND,
        backgroundColor: BRAND_BG,
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: liveCumulative.length <= 15 ? 3 : 0,
        pointHoverRadius: 5,
        pointBackgroundColor: BRAND,
        order: 3,
      },
    ];

    if (liveMC) {
      // P95 band fill to P5
      datasets.push({
        label: 'Monte Carlo P95',
        data:  liveMC.percentile95.slice(1),
        borderColor:     BRAND_20,
        backgroundColor: BRAND_20,
        fill: '+1',
        tension: 0.35,
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 0,
        order: 0,
      });

      // P50 median
      datasets.push({
        label: 'Monte Carlo P50 (Median)',
        data:  liveMC.percentile50.slice(1),
        borderColor:     BRAND_50,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.35,
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 1,
      });

      // P5 worst case
      datasets.push({
        label: 'Monte Carlo P5 (Worst)',
        data:  liveMC.percentile5.slice(1),
        borderColor:     BRAND_20,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.35,
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 2,
      });
    }

    return datasets;
  }

  // Break-even reference line plugin
  const breakEvenPlugin = {
    id: 'investmentBreakEven',
    beforeDraw(chart: any) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || liveInitial <= 0) return;
      const yBreak = scales.y.getPixelForValue(liveInitial);
      if (yBreak < chartArea.top || yBreak > chartArea.bottom) return;

      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, yBreak);
      ctx.lineTo(chartArea.right, yBreak);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  };

  async function buildChart() {
    if (!canvas) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    if (!Chart.registry.plugins.get(breakEvenPlugin.id as any)) {
      Chart.register(breakEvenPlugin as any);
    }

    chartInstance?.destroy();

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels:   liveYears,
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
              filter: (item: any) => !item.text.includes('P95') && !item.text.includes('P5 ('),
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `${ctx.dataset.label}: ${eur(ctx.parsed.y)}`,
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
              font:  { size: 11 },
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
    liveInitial    = initialInvestment;
    liveCumulative = cumulativeValues;
    liveYears      = years;
    liveMC         = monteCarloResult;
    chartInstance.data.labels   = liveYears;
    chartInstance.data.datasets = buildDatasets();
    chartInstance.update('none');
  }

  export function getImageBase64(): string | null {
    if (!chartInstance || !canvas) return null;
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
    onChartReady?.(getImageBase64);
  });
  onDestroy(() => chartInstance?.destroy());

  $effect(() => {
    void initialInvestment;
    void cumulativeValues;
    void years;
    void monteCarloResult;
    updateChart();
  });
</script>

<div class="relative h-72 w-full sm:h-80">
  <canvas bind:this={canvas} aria-label="Investment-Wertentwicklung" role="img"></canvas>
</div>
