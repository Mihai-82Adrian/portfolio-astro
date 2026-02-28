import type { ReturnMetrics, RiskMetrics, MonteCarloResult, TaxResult, InvestmentInput } from './types';

const BRAND = '#6B8E6F';

function eur(v: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(v);
}

function pct(v: number, dec = 1): string {
  return `${v.toFixed(dec).replace('.', ',')} %`;
}

function fmt(v: number, dec = 2): string {
  return v.toFixed(dec).replace('.', ',');
}

function todayDE(): string {
  return new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function generateInvestmentPdf(params: {
  input:            InvestmentInput;
  returnMetrics:    ReturnMetrics;
  riskMetrics:      RiskMetrics;
  mcResult:         MonteCarloResult | null;
  taxResult:        TaxResult;
  aiNarrative:      string | null;
  chartImageBase64: string | null;
  targetWindow?:    Window;
}): Promise<void> {
  const { returnMetrics, riskMetrics, mcResult, taxResult, aiNarrative, chartImageBase64, targetWindow } = params;
  const { input } = params;

  // Lazy-load pdfmake
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ]);
  const pdfMake   = (pdfMakeMod.default ?? pdfMakeMod) as any;
  const vfsBundle = (vfsMod.default ?? vfsMod) as any;
  const injectedVfs = vfsBundle.pdfMake?.vfs ?? vfsBundle.vfs ?? vfsBundle;
  if (injectedVfs && pdfMake.addVirtualFileSystem) {
    pdfMake.addVirtualFileSystem(injectedVfs);
  }

  // ── AI narrative section ────────────────────────────────────────────────
  const aiSection: any[] = [];
  if (aiNarrative) {
    let parsed: any = null;
    try { parsed = JSON.parse(aiNarrative); } catch {}

    aiSection.push(
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 14, 0, 0] },
      { text: 'KI-Analyse', style: 'sectionHeader', margin: [0, 10, 0, 8] },
    );

    if (parsed && typeof parsed === 'object') {
      const sections: [string, string][] = [
        ['Gesamtbewertung', parsed.summary],
        ['Stärken', parsed.strengths],
        ['Risiken', parsed.risks],
        ['Empfehlung', parsed.recommendation],
      ];
      for (const [label, text] of sections) {
        if (text) {
          aiSection.push({
            margin: [0, 0, 0, 6],
            table: {
              widths: [4, '*'],
              body: [[
                { text: '', fillColor: BRAND, border: [false, false, false, false] },
                {
                  stack: [
                    { text: label, bold: true, fontSize: 9, color: '#1a1a1a', margin: [0, 0, 0, 2] },
                    { text, fontSize: 8.5, color: '#444444', lineHeight: 1.4 },
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
    } else {
      aiSection.push({ text: aiNarrative, fontSize: 9, color: '#444444', lineHeight: 1.4, margin: [0, 0, 0, 8] });
    }
  }

  // ── MC section ──────────────────────────────────────────────────────────
  const mcSection: any[] = [];
  if (mcResult) {
    const finalP5  = mcResult.percentile5[mcResult.percentile5.length - 1];
    const finalP50 = mcResult.percentile50[mcResult.percentile50.length - 1];
    const finalP95 = mcResult.percentile95[mcResult.percentile95.length - 1];

    mcSection.push(
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 14, 0, 0] },
      { text: 'Monte-Carlo-Simulation (1.000 Pfade)', style: 'sectionHeader', margin: [0, 10, 0, 8] },
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { stack: [{ text: 'P5 (Worst Case)', style: 'kpiLabel' }, { text: eur(finalP5), style: 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'P50 (Median)', style: 'kpiLabel' }, { text: eur(finalP50), style: 'kpiBrand' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'P95 (Best Case)', style: 'kpiLabel' }, { text: eur(finalP95), style: 'kpiBrand' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'Gewinnwahr.', style: 'kpiLabel' }, { text: pct(mcResult.probPositive), style: mcResult.probPositive >= 50 ? 'kpiBrand' : 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, false, false] },
          ]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i > 0 && i < 4 ? 1 : 0), vLineColor: () => '#e5e7eb', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        margin: [0, 0, 0, 8],
      },
    );
  }

  const doc: any = {
    pageSize: 'A4',
    pageMargins: [40, 54, 40, 62],
    info: {
      title:   'Investment Analytics Report',
      author:  'Mihai-Adrian Mateescu',
      subject: 'Investitionsanalyse',
      creator: 'Fin-Tools Hub',
    },
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#1a1a1a', lineHeight: 1.3 },
    styles: {
      reportTitle:   { fontSize: 18, bold: true, color: BRAND },
      sectionHeader: { fontSize: 11, bold: true, color: BRAND },
      kpiLabel: { fontSize: 7.5, color: '#6b7280', margin: [0, 0, 0, 2] },
      kpiPos:   { fontSize: 14, bold: true, color: '#1a1a1a' },
      kpiNeg:   { fontSize: 14, bold: true, color: '#dc2626' },
      kpiBrand: { fontSize: 14, bold: true, color: BRAND },
      kpiSub:   { fontSize: 7.5, color: '#6b7280', margin: [0, 2, 0, 0] },
    },
    content: [
      // Header
      {
        columns: [
          { text: 'Investment Analytics Report', style: 'reportTitle' },
          { stack: [{ text: 'Erstellt am', fontSize: 8, color: '#6b7280' }, { text: todayDE(), fontSize: 8.5, bold: true, color: '#374151' }], alignment: 'right', margin: [0, 5, 0, 0] },
        ],
        margin: [0, 0, 0, 8],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: BRAND }], margin: [0, 0, 0, 18] },

      // Return Metrics KPI grid
      { text: 'Rendite-Kennzahlen', style: 'sectionHeader', margin: [0, 0, 0, 8] },
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { stack: [{ text: 'ROI', style: 'kpiLabel' }, { text: pct(returnMetrics.roi), style: returnMetrics.roi >= 0 ? 'kpiBrand' : 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'CAGR p.a.', style: 'kpiLabel' }, { text: returnMetrics.cagr !== null ? pct(returnMetrics.cagr) : '—', style: (returnMetrics.cagr ?? 0) >= 0 ? 'kpiBrand' : 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'IRR', style: 'kpiLabel' }, { text: returnMetrics.irr !== null ? pct(returnMetrics.irr) : '—', style: (returnMetrics.irr ?? 0) >= 0 ? 'kpiBrand' : 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'NPV (Kapitalwert)', style: 'kpiLabel' }, { text: eur(returnMetrics.npv), style: returnMetrics.npv >= 0 ? 'kpiBrand' : 'kpiNeg' }, { text: returnMetrics.paybackYear ? `Amortisation: Jahr ${returnMetrics.paybackYear}` : 'Kein Break-Even', style: 'kpiSub' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, false, false] },
          ]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i > 0 && i < 4 ? 1 : 0), vLineColor: () => '#e5e7eb', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        margin: [0, 0, 0, 16],
      },

      // Risk Metrics
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 0] },
      { text: 'Risiko-Kennzahlen', style: 'sectionHeader', margin: [0, 10, 0, 8] },
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { stack: [{ text: 'Sharpe Ratio', style: 'kpiLabel' }, { text: fmt(riskMetrics.sharpeRatio), style: riskMetrics.sharpeRatio >= 1 ? 'kpiBrand' : riskMetrics.sharpeRatio >= 0 ? 'kpiPos' : 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'Sortino Ratio', style: 'kpiLabel' }, { text: fmt(riskMetrics.sortinoRatio), style: riskMetrics.sortinoRatio >= 1 ? 'kpiBrand' : riskMetrics.sortinoRatio >= 0 ? 'kpiPos' : 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'Max. Drawdown', style: 'kpiLabel' }, { text: pct(riskMetrics.maxDrawdown), style: 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            { stack: [{ text: 'Volatilität p.a.', style: 'kpiLabel' }, { text: pct(riskMetrics.annualizedVolatility), style: 'kpiPos' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, false, false] },
          ]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i > 0 && i < 4 ? 1 : 0), vLineColor: () => '#e5e7eb', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          { stack: [{ text: 'VaR 95 %', fontSize: 8, color: '#6b7280', margin: [0, 0, 0, 2] }, { text: eur(riskMetrics.var95), fontSize: 12, bold: true, color: riskMetrics.var95 < 0 ? '#dc2626' : BRAND }], margin: [0, 0, 10, 8] },
          { stack: [{ text: 'VaR 99 %', fontSize: 8, color: '#6b7280', margin: [0, 0, 0, 2] }, { text: eur(riskMetrics.var99), fontSize: 12, bold: true, color: riskMetrics.var99 < 0 ? '#dc2626' : BRAND }], margin: [0, 0, 0, 8] },
        ],
      },

      // Chart
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 0] },
      { text: 'Wertentwicklung', style: 'sectionHeader', margin: [0, 10, 0, 6] },
      chartImageBase64
        ? { image: chartImageBase64, fit: [515, 155], margin: [0, 0, 0, 8] }
        : { text: 'Diagramm nicht verfügbar.', color: '#9ca3af', italics: true, fontSize: 9 },

      // Monte Carlo
      ...mcSection,

      // Tax
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 14, 0, 0] },
      { text: 'DACH Steuerberechnung (Abgeltungsteuer)', style: 'sectionHeader', margin: [0, 10, 0, 8] },
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [[
            { stack: [{ text: 'Bruttogewinn', style: 'kpiLabel' }, { text: eur(taxResult.grossGain), style: taxResult.grossGain >= 0 ? 'kpiBrand' : 'kpiNeg' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false] },
            {
              stack: [
                { text: 'Steuerpflichtig', style: 'kpiLabel' },
                { text: eur(taxResult.taxableGain), style: 'kpiPos' },
                ...(taxResult.teilfreistellungReduction > 0
                  ? [{ text: `inkl. −${eur(taxResult.teilfreistellungReduction)} Teilfreistellung`, fontSize: 7, color: '#6b7280', margin: [0, 2, 0, 0] }]
                  : []),
              ],
              fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false],
            },
            {
              stack: [
                { text: 'Steuerbetrag', style: 'kpiLabel' },
                { text: eur(taxResult.taxAmount), style: 'kpiNeg' },
                ...(taxResult.kirchensteuerAmount > 0
                  ? [{ text: `+ KiSt ${eur(taxResult.kirchensteuerAmount)}`, fontSize: 7, color: '#6b7280', margin: [0, 2, 0, 0] }]
                  : []),
              ],
              fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, true, false],
            },
            { stack: [{ text: 'Nettogewinn', style: 'kpiLabel' }, { text: eur(taxResult.netGain), style: taxResult.netGain >= 0 ? 'kpiBrand' : 'kpiNeg' }, { text: `Eff. Steuersatz: ${pct(taxResult.effectiveTaxRate)}`, style: 'kpiSub' }], fillColor: '#F9FAFB', margin: [10, 10, 10, 12], border: [false, false, false, false] },
          ]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i > 0 && i < 4 ? 1 : 0), vLineColor: () => '#e5e7eb', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        margin: [0, 0, 0, 8],
      },

      // AI narrative
      ...aiSection,
    ],

    footer: () => ({
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.4, lineColor: '#e5e7eb' }], margin: [40, 0, 40, 4] },
        { text: 'Mihai-Adrian Mateescu  ·  Digital Finance Architect  ·  kontakt@me-mateescu.de  ·  +49 170 474 0121  ·  www.me-mateescu.de', fontSize: 7, bold: true, color: '#374151', alignment: 'center', margin: [40, 0, 40, 2] },
        { text: 'Strategiegespräch buchen: www.me-mateescu.de/services  ·  Generiert mit dem KI-gestützten Investment Analytics — Fin-Tools Hub', fontSize: 6.5, color: '#9ca3af', alignment: 'center', margin: [40, 0, 40, 0] },
      ],
      margin: [0, 6, 0, 0],
    }),
  };

  const pdfDoc = pdfMake.createPdf(doc);
  const blob: Blob = await pdfDoc.getBlob();
  if (!(blob instanceof Blob)) throw new Error('PDF blob invalid');

  const url = URL.createObjectURL(blob);
  if (targetWindow) {
    // iOS Safari path: inject into pre-opened window (avoids async user-gesture restriction)
    targetWindow.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } else {
    // Desktop path: anchor download with filename
    const anchor = document.createElement('a');
    anchor.href     = url;
    anchor.download = `Investment-Analytics_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
