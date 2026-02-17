import { roundToCents } from './money';
import type { Invoice, InvoiceTotals, TaxSummary } from './types';
import { escapeXml, tag } from './xml';

export function computeInvoiceTotals(invoice: Invoice): InvoiceTotals {
  const taxBuckets = new Map<number, { taxableAmount: number; taxAmount: number }>();

  let netTotal = 0;
  let taxTotal = 0;

  for (const item of invoice.lineItems) {
    const lineNet = roundToCents(item.quantity * item.unitPrice);
    const lineTax = roundToCents((lineNet * item.taxRate) / 100);

    netTotal += lineNet;
    taxTotal += lineTax;

    const current = taxBuckets.get(item.taxRate) ?? { taxableAmount: 0, taxAmount: 0 };
    current.taxableAmount = roundToCents(current.taxableAmount + lineNet);
    current.taxAmount = roundToCents(current.taxAmount + lineTax);
    taxBuckets.set(item.taxRate, current);
  }

  const taxes: TaxSummary[] = [...taxBuckets.entries()].map(([taxRate, values]) => ({
    taxRate,
    taxableAmount: roundToCents(values.taxableAmount),
    taxAmount: roundToCents(values.taxAmount),
  }));

  return {
    netTotal: roundToCents(netTotal),
    taxTotal: roundToCents(taxTotal),
    grossTotal: roundToCents(netTotal + taxTotal),
    taxes,
  };
}

export function generateXRechnungXml(invoice: Invoice): string {
  const totals = computeInvoiceTotals(invoice);
  const issueDate = invoice.issueDate;
  const dueDate = invoice.dueDate?.trim();

  const supplier = invoice.seller;
  const buyer = invoice.buyer;

  const taxTotalXml = totals.taxes
    .map(
      (tax) => `
    <cac:TaxSubtotal>
      ${tag('cbc:TaxableAmount', tax.taxableAmount.toFixed(2))}
      ${tag('cbc:TaxAmount', tax.taxAmount.toFixed(2))}
      <cac:TaxCategory>
        ${tag('cbc:ID', 'S')}
        ${tag('cbc:Percent', tax.taxRate.toFixed(2))}
        <cac:TaxScheme>
          ${tag('cbc:ID', 'VAT')}
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
    )
    .join('');

  const lineItemsXml = invoice.lineItems
    .map((item, index) => {
      const lineNet = roundToCents(item.quantity * item.unitPrice);
      const lineTax = roundToCents((lineNet * item.taxRate) / 100);
      return `
    <cac:InvoiceLine>
      ${tag('cbc:ID', item.id || index + 1)}
      ${tag('cbc:InvoicedQuantity', item.quantity.toFixed(2))}
      ${tag('cbc:LineExtensionAmount', lineNet.toFixed(2))}
      <cac:Item>
        ${tag('cbc:Description', item.description)}
        <cac:ClassifiedTaxCategory>
          ${tag('cbc:ID', 'S')}
          ${tag('cbc:Percent', item.taxRate.toFixed(2))}
          <cac:TaxScheme>
            ${tag('cbc:ID', 'VAT')}
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        ${tag('cbc:PriceAmount', item.unitPrice.toFixed(2))}
      </cac:Price>
      <cac:TaxTotal>
        ${tag('cbc:TaxAmount', lineTax.toFixed(2))}
      </cac:TaxTotal>
    </cac:InvoiceLine>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  ${tag('cbc:CustomizationID', invoice.profileId)}
  ${tag('cbc:ProfileID', 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0')}
  ${tag('cbc:ID', invoice.invoiceNumber)}
  ${tag('cbc:IssueDate', issueDate)}
  ${dueDate ? tag('cbc:DueDate', dueDate) : ''}
  ${tag('cbc:InvoiceTypeCode', '380')}
  ${tag('cbc:DocumentCurrencyCode', invoice.currency)}
  ${invoice.notes ? tag('cbc:Note', invoice.notes) : ''}

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        ${tag('cbc:Name', supplier.name)}
      </cac:PartyName>
      <cac:PostalAddress>
        ${tag('cbc:StreetName', supplier.address.street)}
        ${tag('cbc:CityName', supplier.address.city)}
        ${tag('cbc:PostalZone', supplier.address.postalCode)}
        <cac:Country>${tag('cbc:IdentificationCode', supplier.address.countryCode)}</cac:Country>
      </cac:PostalAddress>
      ${
        supplier.vatId
          ? `<cac:PartyTaxScheme>${tag('cbc:CompanyID', supplier.vatId)}<cac:TaxScheme>${tag('cbc:ID', 'VAT')}</cac:TaxScheme></cac:PartyTaxScheme>`
          : ''
      }
      ${
        supplier.email
          ? `<cac:Contact>${tag('cbc:ElectronicMail', supplier.email)}</cac:Contact>`
          : ''
      }
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        ${tag('cbc:Name', buyer.name)}
      </cac:PartyName>
      <cac:PostalAddress>
        ${tag('cbc:StreetName', buyer.address.street)}
        ${tag('cbc:CityName', buyer.address.city)}
        ${tag('cbc:PostalZone', buyer.address.postalCode)}
        <cac:Country>${tag('cbc:IdentificationCode', buyer.address.countryCode)}</cac:Country>
      </cac:PostalAddress>
      ${
        buyer.vatId
          ? `<cac:PartyTaxScheme>${tag('cbc:CompanyID', buyer.vatId)}<cac:TaxScheme>${tag('cbc:ID', 'VAT')}</cac:TaxScheme></cac:PartyTaxScheme>`
          : ''
      }
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    ${tag('cbc:TaxAmount', totals.taxTotal.toFixed(2))}
    ${taxTotalXml}
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    ${tag('cbc:LineExtensionAmount', totals.netTotal.toFixed(2))}
    ${tag('cbc:TaxExclusiveAmount', totals.netTotal.toFixed(2))}
    ${tag('cbc:TaxInclusiveAmount', totals.grossTotal.toFixed(2))}
    ${tag('cbc:PayableAmount', totals.grossTotal.toFixed(2))}
  </cac:LegalMonetaryTotal>
  ${lineItemsXml}
</Invoice>`.replaceAll(/\n\s*\n/g, '\n');
}

export function safeFileName(invoiceNumber: string): string {
  const cleaned = invoiceNumber.trim().replaceAll(/[^a-zA-Z0-9-_]/g, '-');
  return `${cleaned || 'xrechnung'}.xml`;
}

export function previewText(value: string): string {
  return escapeXml(value);
}
