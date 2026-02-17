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

function compileFixtures() {
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

const outDir = compileFixtures();

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
    {
      name: 'minimal invoice',
      invoice: baseInvoice,
      tags: ['<cbc:ID>INV-2026-001</cbc:ID>', '<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>'],
    },
    {
      name: 'multiple line items',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-002',
        lineItems: [
          ...baseInvoice.lineItems,
          {
            id: '2',
            description: 'AI implementation',
            quantity: 2,
            unitCode: 'H87',
            unitPrice: 450,
            taxRate: 19,
          },
        ],
      },
      tags: ['<cbc:ID>2</cbc:ID>', '<cbc:Description>AI implementation</cbc:Description>'],
    },
    {
      name: 'vat and escaping',
      invoice: {
        ...baseInvoice,
        invoiceNumber: 'INV-2026-003',
        notes: 'Use & verify <strict> XML.',
      },
      tags: ['<cbc:TaxAmount>190.00</cbc:TaxAmount>', '<cbc:Note>Use &amp; verify &lt;strict&gt; XML.</cbc:Note>'],
    },
  ];

  for (const fixture of fixtures) {
    const xml = generateXRechnungXml(fixture.invoice);
    assert(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), `[${fixture.name}] Missing XML declaration`);
    assert(isXmlWellFormed(xml), `[${fixture.name}] XML is not well-formed`);
    for (const tag of fixture.tags) {
      assert(xml.includes(tag), `[${fixture.name}] Missing expected tag: ${tag}`);
    }
    console.log(`[PASS] ${fixture.name}`);
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
