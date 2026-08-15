// Structural regression coverage for every materially distinct production pdfmake export path.
// Exercises the real document-building implementation (not a mock), captures the generated
// Blob, and validates it is a genuine, non-empty, well-formed PDF — without touching the DOM,
// the network, or any provider.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

// fin-core (src/lib/fin-core/xrechnung.ts and its dependencies) uses extensionless relative
// imports, which is fine for the Vite/Astro bundler and for tsc, but not for Node's native
// ESM resolver. Compile to CommonJS in-tree (so bare-specifier resolution for pdfmake still
// finds the real node_modules) the same way scripts/verify-xrechnung-fixtures.mjs already does.
function compileXRechnungPdfRuntime() {
  mkdirSync(path.join(ROOT, '.tmp'), { recursive: true });
  const outDir = mkdtempSync(path.join(ROOT, '.tmp', 'xrechnung-pdf-test-'));
  // Override the project's "type": "module" so tsc's CommonJS output (exports.foo = ...)
  // is loaded as CommonJS rather than misinterpreted as ESM.
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const files = [
    'src/lib/fin-core/types.ts',
    'src/lib/fin-core/date.ts',
    'src/lib/fin-core/money.ts',
    'src/lib/fin-core/xml.ts',
    'src/lib/fin-core/xrechnung.ts',
    'src/lib/xrechnung/pdfExport.ts',
  ];
  execFileSync(
    'npx',
    ['tsc', '--ignoreConfig', '--ignoreDeprecations', '6.0', '--noImplicitAny', 'false',
      '--target', 'ES2022', '--module', 'CommonJS', '--moduleResolution', 'Node',
      '--esModuleInterop', '--skipLibCheck', '--outDir', outDir, ...files],
    { cwd: ROOT, stdio: 'inherit' },
  );
  return outDir;
}

function assertStructurallyValidPdf(bytes, { minBytes = 2000, expectedTextFragments = [] } = {}) {
  assert.ok(bytes.length >= minBytes, `expected at least ${minBytes} bytes, got ${bytes.length}`);
  const head = Buffer.from(bytes.slice(0, 8)).toString('latin1');
  assert.match(head, /^%PDF-1\.\d/, 'missing %PDF- file signature');

  const text = Buffer.from(bytes).toString('latin1');
  assert.match(text, /%%EOF\s*$/, 'missing terminal %%EOF marker');

  // pdfmake streams are flate-compressed, but the object/xref/trailer skeleton stays plain text.
  assert.match(text, /\/Type\s*\/Catalog/, 'missing PDF /Catalog object');
  assert.match(text, /\/Type\s*\/Pages/, 'missing PDF /Pages object');
  assert.match(text, /trailer/, 'missing PDF trailer');

  for (const fragment of expectedTextFragments) {
    assert.match(text, fragment, `expected document metadata to match ${fragment}`);
  }
}

async function blobToBuffer(blob) {
  assert.ok(blob instanceof Blob, 'export function must resolve a real Blob');
  assert.equal(blob.type, 'application/pdf');
  return Buffer.from(await blob.arrayBuffer());
}

test('Investment Analytics PDF export produces a genuine, well-formed PDF', async () => {
  const { calcReturnMetrics, calcRiskMetrics, runMonteCarlo, calcTax, mulberry32 } =
    await import('../src/lib/investment/analytics.ts');
  const { generateInvestmentPdfBlob } = await import('../src/lib/investment/pdfExport.ts');

  const initial = 10000;
  const cashFlows = [{ year: 5, amount: 16000 }];
  const returnMetrics = calcReturnMetrics(initial, cashFlows, 5);
  const riskMetrics = calcRiskMetrics(initial, cashFlows);
  const mcResult = runMonteCarlo(initial, cashFlows, 200, mulberry32(42));
  const taxResult = calcTax(initial, cashFlows, true, true, 0.2, 1000, true, 9);

  const blob = await generateInvestmentPdfBlob({
    input: {
      initialInvestment: initial,
      cashFlows,
      discountRate: 5,
      isFund: true,
      isAccumulating: true,
      ter: 0.2,
      personalFreibetrag: 1000,
      teilfreistellung: true,
      kirchensteuer: 9,
    },
    returnMetrics,
    riskMetrics,
    mcResult,
    taxResult,
    aiNarrative: JSON.stringify({ summary: 'Solide Wertentwicklung.', strengths: 'Diversifikation.' }),
    chartImageBase64: null,
  });

  const bytes = await blobToBuffer(blob);
  assertStructurallyValidPdf(bytes, {
    expectedTextFragments: [/Investment Analytics Report/, /Investitionsanalyse/],
  });
});

test('Cashflow Forecast PDF export produces a genuine, well-formed PDF', async () => {
  const { projectCashflow } = await import('../src/lib/cashflow/projectionEngine.ts');
  const { generateCashflowPdfBlob } = await import('../src/lib/cashflow/pdfExport.ts');

  const blocks = [
    { id: '1', category: 'revenue', subcategory: 'recurring', label: 'MRR', amount: 12000, growthRate: 2 },
    { id: '2', category: 'fixed_cost', subcategory: 'payroll', label: 'Gehälter', amount: 8000 },
  ];
  const baseProjection = projectCashflow(50000, blocks, 12);

  const blob = await generateCashflowPdfBlob({
    initialCash: 50000,
    baseProjection,
    scenarioResult: null,
    chartImageBase64: null,
  });

  const bytes = await blobToBuffer(blob);
  assertStructurallyValidPdf(bytes, {
    expectedTextFragments: [/Cashflow & Forecasting Report/],
  });
});

test('XRechnung invoice PDF export produces a genuine, well-formed PDF', async () => {
  const outDir = compileXRechnungPdfRuntime();
  const require = createRequire(import.meta.url);
  const { generateXRechnungPdf } = require(path.join(outDir, 'xrechnung', 'pdfExport.js'));

  const invoice = {
    profileId: 'urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0',
    invoiceNumber: 'INV-2026-042',
    buyerReference: '04011000-1234512345-06',
    issueDate: '2026-07-01',
    serviceDate: '2026-07-01',
    dueDate: '2026-07-31',
    paymentMeansCode: '58',
    payeeIban: 'DE89370400440532013000',
    payeeBic: 'COBADEFFXXX',
    payeeAccountName: 'Beispiel GmbH',
    taxNote: 'standard_vat',
    currency: 'EUR',
    seller: {
      name: 'Beispiel GmbH',
      legalForm: 'GmbH',
      register: 'AG München HRB 123456',
      managingDirectors: 'Max Mustermann',
      taxNumber: '143/815/08150',
      vatId: 'DE123456789',
      endpointId: 'DE123456789',
      endpointScheme: '9930',
      address: { street: 'Musterstraße 1', city: 'München', postalCode: '80331', countryCode: 'DE' },
    },
    buyer: {
      name: 'Kunde AG',
      endpointId: '04011000-1234512345-06',
      endpointScheme: '0204',
      address: { street: 'Kundenweg 2', city: 'Berlin', postalCode: '10115', countryCode: 'DE' },
    },
    lineItems: [
      { id: '1', description: 'Beratungsleistung', quantity: 10, unitCode: 'HUR', unitPrice: 150, taxRate: 19 },
    ],
  };

  try {
    const blob = await generateXRechnungPdf({
      invoice,
      profileMode: 'xrechnung',
      taxRegimePdfText: '',
      taxNoteLabelMap: { standard_vat: 'Standard (mit USt.)' },
      logoForPdf: undefined,
    });

    const bytes = await blobToBuffer(blob);
    assertStructurallyValidPdf(bytes, {
      expectedTextFragments: [/E-Rechnung PDF Export/, /INV-2026-042/],
    });
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
