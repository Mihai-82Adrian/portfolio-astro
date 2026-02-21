#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function compileRuntime() {
  const outDir = mkdtempSync(join(tmpdir(), 'xrechnung-fixtures-'));
  const files = [
    'src/lib/fin-core/types.ts',
    'src/lib/fin-core/money.ts',
    'src/lib/fin-core/xml.ts',
    'src/lib/fin-core/xrechnung.ts',
  ];

  execFileSync(
    'npx',
    [
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
      outDir,
      ...files,
    ],
    { stdio: 'inherit' }
  );
  return outDir;
}

function isXmlWellFormed(xml) {
  const tagRegex = /<([/]?)([A-Za-z_][A-Za-z0-9:._-]*)([^>]*?)([/]?)>/g;
  const stack = [];
  let match;
  while ((match = tagRegex.exec(xml)) !== null) {
    const [, closing, name, , selfClosing] = match;
    if (name.startsWith('?xml')) {
      continue;
    }
    if (selfClosing === '/') {
      continue;
    }
    if (closing === '/') {
      const top = stack.pop();
      if (top !== name) {
        return false;
      }
      continue;
    }
    stack.push(name);
  }
  return stack.length === 0;
}

const outDir = compileRuntime();

try {
  const require = createRequire(import.meta.url);
  const xrechnungModule = require(join(outDir, 'xrechnung.js'));
  const { generateXRechnungXml } = xrechnungModule;

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
      address: {
        street: 'Musterstrasse 1',
        city: 'Hamburg',
        postalCode: '20095',
        countryCode: 'DE',
      },
    },
    buyer: {
      name: 'Client GmbH',
      vatId: 'DE987654321',
      address: {
        street: 'Beispielweg 5',
        city: 'Berlin',
        postalCode: '10115',
        countryCode: 'DE',
      },
    },
    notes: 'Delivery & support included.',
    lineItems: [
      {
        id: '1',
        description: 'Finance Ops Retainer',
        quantity: 1,
        unitCode: 'H87',
        unitPrice: 1000,
        taxRate: 19,
      },
    ],
  };

  const fixtures = [
    { name: 'minimal', invoice: baseInvoice },
    {
      name: 'multiple-line-items',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-002',
        lineItems: [
          ...baseInvoice.lineItems,
          { id: '2', description: 'AI implementation', quantity: 2, unitCode: 'H87', unitPrice: 450, taxRate: 19 },
        ],
      },
    },
    {
      name: 'vat-19',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-003',
        lineItems: [{ ...baseInvoice.lineItems[0], taxRate: 19 }],
      },
    },
    {
      name: 'vat-7',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-004',
        lineItems: [{ ...baseInvoice.lineItems[0], taxRate: 7 }],
      },
    },
    {
      name: 'vat-0',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-005',
        lineItems: [{ ...baseInvoice.lineItems[0], taxRate: 0 }],
      },
    },
    {
      name: 'mixed-vat',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-006',
        lineItems: [
          { id: '1', description: 'Consulting', quantity: 1, unitCode: 'H87', unitPrice: 700, taxRate: 19 },
          { id: '2', description: 'Books', quantity: 2, unitCode: 'H87', unitPrice: 100, taxRate: 7 },
          { id: '3', description: 'Training export', quantity: 1, unitCode: 'H87', unitPrice: 500, taxRate: 0 },
        ],
      },
    },
    {
      name: 'buyer-vat-optional',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-007',
        buyer: { ...baseInvoice.buyer, vatId: 'DE111122223' },
      },
    },
    {
      name: 'missing-due-date',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-008',
        dueDate: '',
      },
    },
    {
      name: 'escaping',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-009',
        notes: 'Use & verify <strict> XML with "quotes" and apostrophe\'s.',
        lineItems: [{ ...baseInvoice.lineItems[0], description: 'R&D <Advisory> & QA' }],
      },
    },
    {
      name: 'decimal-quantity',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-010',
        lineItems: [{ ...baseInvoice.lineItems[0], quantity: 1.75, unitPrice: 199.995 }],
      },
    },
  ];

  const syntaxCases = [
    { syntax: 'ubl', requiredTags: ['<Invoice ', '<cbc:CustomizationID>'] },
    { syntax: 'cii', requiredTags: ['<rsm:CrossIndustryInvoice ', '<ram:GuidelineSpecifiedDocumentContextParameter>'] },
  ];

  for (const fixture of fixtures) {
    for (const syntaxCase of syntaxCases) {
      const xml = generateXRechnungXml(fixture.invoice, syntaxCase.syntax);
      assert(
        xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
        `[${fixture.name}/${syntaxCase.syntax}] Missing XML declaration`
      );
      assert(isXmlWellFormed(xml), `[${fixture.name}/${syntaxCase.syntax}] XML is not well-formed`);

      for (const tag of syntaxCase.requiredTags) {
        assert(
          xml.includes(tag),
          `[${fixture.name}/${syntaxCase.syntax}] Missing expected syntax tag: ${tag}`
        );
      }

      if (fixture.name === 'escaping') {
        assert(
          xml.includes('&amp;') && xml.includes('&lt;') && xml.includes('&quot;'),
          `[${fixture.name}/${syntaxCase.syntax}] XML escaping check failed`
        );
      }

      console.log(`[PASS] ${fixture.name} (${syntaxCase.syntax})`);
    }
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
