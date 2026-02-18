#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const generatedDir = path.join(root, '.tmp', 'xrechnung-kosit-fixtures');
const testsuiteSamplesDir = path.join(root, 'tests', 'xrechnung', 'kosit-testsuite-samples');

function collectXmlFiles(baseDir) {
  if (!existsSync(baseDir)) {
    return [];
  }
  const files = [];
  const stack = [baseDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.name.endsWith('.xml')) {
        files.push(fullPath);
      }
    }
  }
  return files.sort();
}

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, { stdio: 'inherit', ...options });
}

function generateFixtureXmlSet() {
  const bootstrap = `
const { generateXRechnungXml } = require('./xrechnung.js');
const fs = require('node:fs');
const path = require('node:path');
const outDir = process.argv[2];

const baseInvoice = {
  profileId: 'urn:cen.eu:en16931:2017',
  invoiceNumber: 'INV-2026-001',
  issueDate: '2026-02-17',
  dueDate: '2026-03-03',
  currency: 'EUR',
  seller: {
    name: 'MAM Finance Ops',
    vatId: 'DE123456789',
    email: 'billing@example.com',
    address: { street: 'Musterstrasse 1', city: 'Hamburg', postalCode: '20095', countryCode: 'DE' }
  },
  buyer: {
    name: 'Client GmbH',
    vatId: 'DE987654321',
    address: { street: 'Beispielweg 5', city: 'Berlin', postalCode: '10115', countryCode: 'DE' }
  },
  notes: 'Delivery & support included.',
  lineItems: [{ id: '1', description: 'Finance Ops Retainer', quantity: 1, unitCode: 'H87', unitPrice: 1000, taxRate: 19 }]
};

const fixtures = [
  { name: 'minimal', invoice: baseInvoice },
  { name: 'multiple-line-items', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-002', lineItems: [...baseInvoice.lineItems, { id:'2', description:'AI implementation', quantity:2, unitCode:'H87', unitPrice:450, taxRate:19 }] } },
  { name: 'vat-19', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-003', lineItems: [{ ...baseInvoice.lineItems[0], taxRate:19 }] } },
  { name: 'vat-7', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-004', lineItems: [{ ...baseInvoice.lineItems[0], taxRate:7 }] } },
  { name: 'vat-0', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-005', lineItems: [{ ...baseInvoice.lineItems[0], taxRate:0 }] } },
  { name: 'mixed-vat', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-006', lineItems: [
      { id:'1', description:'Consulting', quantity:1, unitCode:'H87', unitPrice:700, taxRate:19 },
      { id:'2', description:'Books', quantity:2, unitCode:'H87', unitPrice:100, taxRate:7 },
      { id:'3', description:'Training export', quantity:1, unitCode:'H87', unitPrice:500, taxRate:0 }
  ] } },
  { name: 'buyer-vat-optional', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-007', buyer: { ...baseInvoice.buyer, vatId: 'DE111122223' } } },
  { name: 'missing-due-date', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-008', dueDate: '' } },
  { name: 'escaping', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-009', notes: 'Use & verify <strict> XML with "quotes" and apostrophe\\'s.', lineItems: [{ ...baseInvoice.lineItems[0], description: 'R&D <Advisory> & QA' }] } },
  { name: 'decimal-quantity', invoice: { ...baseInvoice, invoiceNumber: 'INV-2026-010', lineItems: [{ ...baseInvoice.lineItems[0], quantity:1.75, unitPrice:199.995 }] } },
];

for (const fixture of fixtures) {
  for (const syntax of ['ubl', 'cii']) {
    const xml = generateXRechnungXml(fixture.invoice, syntax);
    fs.writeFileSync(path.join(outDir, \`\${fixture.name}_\${syntax}.xml\`), xml, 'utf-8');
  }
}
`;

  rmSync(generatedDir, { recursive: true, force: true });
  mkdirSync(generatedDir, { recursive: true });

  const scriptPath = path.join(generatedDir, '_gen.js');
  writeFileSync(scriptPath, bootstrap);

  const compileDir = path.join(generatedDir, '_runtime');
  mkdirSync(compileDir, { recursive: true });
  run('npx', [
    'tsc',
    '--target',
    'ES2022',
    '--module',
    'CommonJS',
    '--moduleResolution',
    'Node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir',
    compileDir,
    'src/lib/fin-core/types.ts',
    'src/lib/fin-core/money.ts',
    'src/lib/fin-core/xml.ts',
    'src/lib/fin-core/xrechnung.ts',
  ]);

  run('cp', [path.join(compileDir, 'xrechnung.js'), path.join(generatedDir, 'xrechnung.js')]);
  run('node', [scriptPath, generatedDir]);
}

run('node', ['scripts/kosit-setup.mjs']);
generateFixtureXmlSet();

const generatedFiles = collectXmlFiles(generatedDir).filter((f) => !f.includes('_runtime'));
if (generatedFiles.length < 20) {
  throw new Error(`Expected at least 20 generated XML files (10 fixtures x 2 syntaxes), got ${generatedFiles.length}`);
}

console.log(`Generated fixture XML files: ${generatedFiles.length}`);
run('node', ['scripts/kosit-validate.mjs', generatedDir]);

const sampleFiles = collectXmlFiles(testsuiteSamplesDir);
if (sampleFiles.length < 5) {
  throw new Error(
    `Expected >=5 testsuite sample files in ${testsuiteSamplesDir}. Found ${sampleFiles.length}.`
  );
}

console.log(`Validating testsuite sample XML files: ${sampleFiles.length}`);
run('node', ['scripts/kosit-validate.mjs', testsuiteSamplesDir]);
console.log('KoSIT conformance verification: PASS');
