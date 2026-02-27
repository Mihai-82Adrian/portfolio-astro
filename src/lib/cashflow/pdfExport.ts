import type { MonthlyDataPoint, StressScenarioResult } from './types';
import { findInsolvencyMonth, additionalCapitalNeeded } from './types';

// ─── Brand constants ────────────────────────────────────────────────────────
const BRAND        = '#6B8E6F';
const SCENARIO_COLORS: Record<string, string> = {
  late_payment: '#D97706',
  churn_spike:  '#B85C4A',
  cost_shock:   '#7C3AED',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function eur(v: number): string {
  return new Intl.NumberFormat('de-DE', {
    style:              'currency',
    currency:           'EUR',
    maximumFractionDigits: 0,
  }).format(v);
}

function todayDE(): string {
  return new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── Main export function ───────────────────────────────────────────────────
export async function generateCashflowPdf(params: {
  initialCash:      number;
  baseProjection:   MonthlyDataPoint[];
  scenarioResult:   StressScenarioResult | null;
  chartImageBase64: string | null;
}): Promise<void> {
  const { initialCash, baseProjection, scenarioResult, chartImageBase64 } = params;

  // ── Lazy-load pdfmake (same pattern as XRechnung — zero bundle cost on page load) ──
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ]);
  const pdfMake   = (pdfMakeMod.default  ?? pdfMakeMod)  as any;
  const vfsBundle = (vfsMod.default ?? vfsMod) as any;
  const injectedVfs = vfsBundle.pdfMake?.vfs ?? vfsBundle.vfs ?? vfsBundle;
  if (injectedVfs && pdfMake.addVirtualFileSystem) {
    pdfMake.addVirtualFileSystem(injectedVfs);
  }

  // ── KPI calculations (mirrors MetricsSummary.svelte) ─────────────────────
  const endBalance   = baseProjection.at(-1)?.cumulative ?? initialCash;
  const minBalance   = baseProjection.length
    ? Math.min(...baseProjection.map(d => d.cumulative))
    : initialCash;
  const minMonth     = baseProjection.find(d => d.cumulative === minBalance)?.month ?? '—';
  const totalRevenue = baseProjection.reduce((s, d) => s + d.revenue, 0);
  const breakEven    = baseProjection.find((d, i) => i > 0 && d.net > 0)?.month ?? null;

  // ── Build scenario cards ─────────────────────────────────────────────────
  const scenarioBlocks: any[] = [];
  if (scenarioResult?.scenarios?.length) {
    scenarioBlocks.push(
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 14, 0, 0] },
      { text: 'KI-Stresstest — Krisenszenarien', style: 'sectionHeader', margin: [0, 10, 0, 8] },
    );

    for (const sc of scenarioResult.scenarios) {
      const color      = SCENARIO_COLORS[sc.type] ?? '#6b7280';
      const insolvIdx  = findInsolvencyMonth(sc.monthlyData);
      const extraCap   = additionalCapitalNeeded(sc.monthlyData);

      // Note: ✓ / ⚠ Unicode glyphs are not in pdfmake's Roboto VFS bundle → render as □
      // Using plain text labels inside colored boxes instead
      const statusBadge: any = insolvIdx >= 0
        ? {
            table: {
              widths: ['*'],
              body: [[{
                stack: [
                  { text: `Insolvenzrisiko — Monat ${insolvIdx + 1} (${sc.monthlyData[insolvIdx].month})`, bold: true, color: '#dc2626', fontSize: 8 },
                  { text: `Zusätzlicher Kapitalbedarf: ${eur(extraCap)}`, color: '#dc2626', fontSize: 8, margin: [0, 1, 0, 0] },
                ],
                margin: [7, 5, 7, 5],
              }]],
            },
            layout: {
              fillColor:  () => '#FEF2F2',
              hLineColor: () => '#FECACA',
              vLineColor: () => '#FECACA',
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
            },
            margin: [0, 5, 0, 0],
          }
        : {
            table: {
              widths: ['*'],
              body: [[{ text: 'Liquidität bleibt in diesem Szenario positiv.', color: '#15803d', fontSize: 8, margin: [7, 4, 7, 4] }]],
            },
            layout: {
              fillColor:  () => '#F0FDF4',
              hLineColor: () => '#BBF7D0',
              vLineColor: () => '#BBF7D0',
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
            },
            margin: [0, 5, 0, 0],
          };

      // Scenario card: colored left border column + content column
      scenarioBlocks.push({
        margin: [0, 0, 0, 6],
        table: {
          widths: [4, '*'],
          body: [[
            { text: '', fillColor: color, border: [false, false, false, false] },
            {
              stack: [
                { text: sc.title, bold: true, fontSize: 9.5, color: '#1a1a1a', margin: [0, 0, 0, 2] },
                { text: sc.narrative || '', fontSize: 8.5, color: '#444444', lineHeight: 1.4 },
                statusBadge,
              ],
              fillColor: '#FAFAFA',
              margin: [10, 7, 10, 7],
              border: [false, false, false, false],
            },
          ]],
        },
        layout: 'noBorders',
      });
    }
  }

  // ── Document definition ──────────────────────────────────────────────────
  const doc: any = {
    pageSize:    'A4',
    pageMargins: [40, 54, 40, 62],
    info: {
      title:   'Cashflow & Forecasting Report',
      author:  'Mihai-Adrian Mateescu',
      subject: 'Liquiditätsanalyse 12 Monate',
      creator: 'Fin-Tools Hub',
    },
    defaultStyle: {
      font:       'Roboto',
      fontSize:   10,
      color:      '#1a1a1a',
      lineHeight: 1.3,
    },
    styles: {
      reportTitle: { fontSize: 18, bold: true, color: BRAND },
      sectionHeader: { fontSize: 11, bold: true, color: BRAND },
      kpiLabel:   { fontSize: 7.5, color: '#6b7280', margin: [0, 0, 0, 2] },
      kpiPos:     { fontSize: 14, bold: true, color: '#1a1a1a' },
      kpiNeg:     { fontSize: 14, bold: true, color: '#dc2626' },
      kpiBrand:   { fontSize: 14, bold: true, color: BRAND },
      kpiSub:     { fontSize: 7.5, color: '#6b7280', margin: [0, 2, 0, 0] },
    },
    content: [
      // ── Header ──────────────────────────────────────────────────────────
      {
        columns: [
          { text: 'Cashflow & Forecasting Report', style: 'reportTitle' },
          {
            stack: [
              { text: 'Erstellt am', fontSize: 8, color: '#6b7280' },
              { text: todayDE(), fontSize: 8.5, bold: true, color: '#374151' },
            ],
            alignment: 'right',
            margin: [0, 5, 0, 0],
          },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: BRAND }],
        margin: [0, 0, 0, 18],
      },

      // ── KPI grid ─────────────────────────────────────────────────────────
      { text: 'Wichtige Kennzahlen', style: 'sectionHeader', margin: [0, 0, 0, 8] },
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            {
              stack: [
                { text: 'Anfangsbestand', style: 'kpiLabel' },
                { text: eur(initialCash), style: 'kpiPos' },
              ],
              fillColor: '#F9FAFB',
              margin: [10, 10, 10, 12],
              border: [false, false, true, false],
            },
            {
              stack: [
                { text: 'Endbestand (M12)', style: 'kpiLabel' },
                { text: eur(endBalance), style: endBalance >= 0 ? 'kpiBrand' : 'kpiNeg' },
              ],
              fillColor: '#F9FAFB',
              margin: [10, 10, 10, 12],
              border: [false, false, true, false],
            },
            {
              stack: [
                { text: 'Tiefpunkt', style: 'kpiLabel' },
                { text: eur(minBalance), style: minBalance >= 0 ? 'kpiPos' : 'kpiNeg' },
                { text: minMonth, style: 'kpiSub' },
              ],
              fillColor: '#F9FAFB',
              margin: [10, 10, 10, 12],
              border: [false, false, true, false],
            },
            {
              stack: [
                { text: 'Einnahmen (12M)', style: 'kpiLabel' },
                { text: eur(totalRevenue), style: 'kpiBrand' },
                {
                  text: breakEven ? `1. Gewinnmonat: ${breakEven}` : 'Kein Gewinnmonat in 12M',
                  style: 'kpiSub',
                  color: breakEven ? '#6b7280' : '#dc2626',
                },
              ],
              fillColor: '#F9FAFB',
              margin: [10, 10, 10, 12],
              border: [false, false, false, false],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i: number) => (i > 0 && i < 4 ? 1 : 0),
          vLineColor: () => '#e5e7eb',
          paddingLeft:   () => 0,
          paddingRight:  () => 0,
          paddingTop:    () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 16],
      },

      // ── Chart ────────────────────────────────────────────────────────────
      { text: '12-Monats-Liquiditätsprognose', style: 'sectionHeader', margin: [0, 0, 0, 6] },
      chartImageBase64
        ? { image: chartImageBase64, fit: [515, 155], margin: [0, 0, 0, 2] }
        : { text: 'Diagramm nicht verfügbar.', color: '#9ca3af', italics: true, fontSize: 9 },

      // ── Scenarios ────────────────────────────────────────────────────────
      ...scenarioBlocks,
    ],

    // ── Footer ─────────────────────────────────────────────────────────────
    footer: () => ({
      stack: [
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.4, lineColor: '#e5e7eb' }],
          margin: [40, 0, 40, 4],
        },
        {
          text: 'Mihai-Adrian Mateescu  ·  Digital Finance Architect  ·  kontakt@me-mateescu.de  ·  +49 170 474 0121  ·  www.me-mateescu.de',
          fontSize:  7,
          bold:      true,
          color:     '#374151',
          alignment: 'center',
          margin:    [40, 0, 40, 2],
        },
        {
          text: 'Strategiegespräch buchen: www.me-mateescu.de/services  ·  Generiert mit dem KI-gestützten Cashflow-Modeller — Fin-Tools Hub',
          fontSize:  6.5,
          color:     '#9ca3af',
          alignment: 'center',
          margin:    [40, 0, 40, 0],
        },
      ],
      margin: [0, 6, 0, 0],
    }),
  };

  // ── Generate & download ──────────────────────────────────────────────────
  const pdfDoc = pdfMake.createPdf(doc);
  const blob: Blob = await pdfDoc.getBlob();
  if (!(blob instanceof Blob)) throw new Error('PDF blob invalid');

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href     = url;
  anchor.download = `Cashflow-Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
