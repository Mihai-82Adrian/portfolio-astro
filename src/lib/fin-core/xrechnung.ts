import { roundToCents } from './money';
import type { Invoice, InvoiceTotals, LineItem, TaxSummary } from './types';
import { escapeXml, tag } from './xml';

export type XRechnungSyntax = 'ubl' | 'cii';

function taxCategoryCode(rate: number): 'S' | 'Z' {
  return rate > 0 ? 'S' : 'Z';
}

function decimal(value: number): string {
  return roundToCents(value).toFixed(2);
}

function lineNet(item: LineItem): number {
  return roundToCents(item.quantity * item.unitPrice);
}

function lineTax(item: LineItem): number {
  return roundToCents((lineNet(item) * item.taxRate) / 100);
}

export function computeInvoiceTotals(invoice: Invoice): InvoiceTotals {
  const taxBuckets = new Map<number, { taxableAmount: number; taxAmount: number }>();

  let netTotal = 0;
  let taxTotal = 0;

  for (const item of invoice.lineItems) {
    const currentLineNet = lineNet(item);
    const currentLineTax = lineTax(item);

    netTotal += currentLineNet;
    taxTotal += currentLineTax;

    const current = taxBuckets.get(item.taxRate) ?? { taxableAmount: 0, taxAmount: 0 };
    current.taxableAmount = roundToCents(current.taxableAmount + currentLineNet);
    current.taxAmount = roundToCents(current.taxAmount + currentLineTax);
    taxBuckets.set(item.taxRate, current);
  }

  const taxes: TaxSummary[] = [...taxBuckets.entries()]
    .map(([taxRate, values]) => ({
      taxRate,
      taxableAmount: roundToCents(values.taxableAmount),
      taxAmount: roundToCents(values.taxAmount),
    }))
    .sort((a, b) => b.taxRate - a.taxRate);

  return {
    netTotal: roundToCents(netTotal),
    taxTotal: roundToCents(taxTotal),
    grossTotal: roundToCents(netTotal + taxTotal),
    taxes,
  };
}

export function generateUBLXml(invoice: Invoice): string {
  const totals = computeInvoiceTotals(invoice);
  const supplier = invoice.seller;
  const buyer = invoice.buyer;
  const dueDate = invoice.dueDate?.trim();
  const currency = invoice.currency;

  const taxTotalXml = totals.taxes
    .map(
      (tax) => `
    <cac:TaxSubtotal>
      ${tag('cbc:TaxableAmount', decimal(tax.taxableAmount), { currencyID: currency })}
      ${tag('cbc:TaxAmount', decimal(tax.taxAmount), { currencyID: currency })}
      <cac:TaxCategory>
        ${tag('cbc:ID', taxCategoryCode(tax.taxRate))}
        ${tag('cbc:Percent', decimal(tax.taxRate))}
        <cac:TaxScheme>
          ${tag('cbc:ID', 'VAT')}
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
    )
    .join('');

  const lineItemsXml = invoice.lineItems
    .map((item, index) => {
      const currentLineNet = lineNet(item);
      return `
    <cac:InvoiceLine>
      ${tag('cbc:ID', item.id || index + 1)}
      ${tag('cbc:InvoicedQuantity', decimal(item.quantity), { unitCode: item.unitCode || 'H87' })}
      ${tag('cbc:LineExtensionAmount', decimal(currentLineNet), { currencyID: currency })}
      <cac:Item>
        ${tag('cbc:Description', item.description)}
        <cac:ClassifiedTaxCategory>
          ${tag('cbc:ID', taxCategoryCode(item.taxRate))}
          ${tag('cbc:Percent', decimal(item.taxRate))}
          <cac:TaxScheme>
            ${tag('cbc:ID', 'VAT')}
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        ${tag('cbc:PriceAmount', decimal(item.unitPrice), { currencyID: currency })}
      </cac:Price>
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
  ${tag('cbc:IssueDate', invoice.issueDate)}
  ${dueDate ? tag('cbc:DueDate', dueDate) : ''}
  ${tag('cbc:InvoiceTypeCode', '380')}
  ${tag('cbc:DocumentCurrencyCode', currency)}
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
    ${tag('cbc:TaxAmount', decimal(totals.taxTotal), { currencyID: currency })}
    ${taxTotalXml}
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    ${tag('cbc:LineExtensionAmount', decimal(totals.netTotal), { currencyID: currency })}
    ${tag('cbc:TaxExclusiveAmount', decimal(totals.netTotal), { currencyID: currency })}
    ${tag('cbc:TaxInclusiveAmount', decimal(totals.grossTotal), { currencyID: currency })}
    ${tag('cbc:PayableAmount', decimal(totals.grossTotal), { currencyID: currency })}
  </cac:LegalMonetaryTotal>
  ${lineItemsXml}
</Invoice>`.replaceAll(/\n\s*\n/g, '\n');
}

export function generateCIIXml(invoice: Invoice): string {
  const totals = computeInvoiceTotals(invoice);
  const currency = invoice.currency;
  const dueDate = invoice.dueDate?.trim();

  const lineItemsXml = invoice.lineItems
    .map((item, index) => {
      const currentLineNet = lineNet(item);
      return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        ${tag('ram:LineID', item.id || String(index + 1))}
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        ${tag('ram:Name', item.description)}
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          ${tag('ram:ChargeAmount', decimal(item.unitPrice))}
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        ${tag('ram:BilledQuantity', decimal(item.quantity), { unitCode: item.unitCode || 'H87' })}
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          ${tag('ram:TypeCode', 'VAT')}
          ${tag('ram:CategoryCode', taxCategoryCode(item.taxRate))}
          ${tag('ram:RateApplicablePercent', decimal(item.taxRate))}
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          ${tag('ram:LineTotalAmount', decimal(currentLineNet))}
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
    })
    .join('');

  const taxBreakdownXml = totals.taxes
    .map(
      (tax) => `
      <ram:ApplicableTradeTax>
        ${tag('ram:CalculatedAmount', decimal(tax.taxAmount))}
        ${tag('ram:TypeCode', 'VAT')}
        ${tag('ram:BasisAmount', decimal(tax.taxableAmount))}
        ${tag('ram:CategoryCode', taxCategoryCode(tax.taxRate))}
        ${tag('ram:RateApplicablePercent', decimal(tax.taxRate))}
      </ram:ApplicableTradeTax>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter>
      ${tag('ram:ID', 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0')}
    </ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      ${tag('ram:ID', invoice.profileId)}
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    ${tag('ram:ID', invoice.invoiceNumber)}
    ${tag('ram:TypeCode', '380')}
    <ram:IssueDateTime>
      ${tag('udt:DateTimeString', invoice.issueDate.replaceAll('-', ''), { format: '102' })}
    </ram:IssueDateTime>
    ${invoice.notes ? tag('ram:IncludedNote', invoice.notes) : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${lineItemsXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        ${tag('ram:Name', invoice.seller.name)}
        <ram:PostalTradeAddress>
          ${tag('ram:PostcodeCode', invoice.seller.address.postalCode)}
          ${tag('ram:LineOne', invoice.seller.address.street)}
          ${tag('ram:CityName', invoice.seller.address.city)}
          ${tag('ram:CountryID', invoice.seller.address.countryCode)}
        </ram:PostalTradeAddress>
        ${
          invoice.seller.vatId
            ? `<ram:SpecifiedTaxRegistration>${tag('ram:ID', invoice.seller.vatId, { schemeID: 'VA' })}</ram:SpecifiedTaxRegistration>`
            : ''
        }
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        ${tag('ram:Name', invoice.buyer.name)}
        <ram:PostalTradeAddress>
          ${tag('ram:PostcodeCode', invoice.buyer.address.postalCode)}
          ${tag('ram:LineOne', invoice.buyer.address.street)}
          ${tag('ram:CityName', invoice.buyer.address.city)}
          ${tag('ram:CountryID', invoice.buyer.address.countryCode)}
        </ram:PostalTradeAddress>
        ${
          invoice.buyer.vatId
            ? `<ram:SpecifiedTaxRegistration>${tag('ram:ID', invoice.buyer.vatId, { schemeID: 'VA' })}</ram:SpecifiedTaxRegistration>`
            : ''
        }
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      ${tag('ram:InvoiceCurrencyCode', currency)}
      ${taxBreakdownXml}
      ${
        dueDate
          ? `<ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime>${tag('udt:DateTimeString', dueDate.replaceAll('-', ''), { format: '102' })}</ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>`
          : ''
      }
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        ${tag('ram:LineTotalAmount', decimal(totals.netTotal))}
        ${tag('ram:TaxBasisTotalAmount', decimal(totals.netTotal))}
        ${tag('ram:TaxTotalAmount', decimal(totals.taxTotal), { currencyID: currency })}
        ${tag('ram:GrandTotalAmount', decimal(totals.grossTotal))}
        ${tag('ram:DuePayableAmount', decimal(totals.grossTotal))}
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`.replaceAll(/\n\s*\n/g, '\n');
}

export function generateXRechnungXml(
  invoice: Invoice,
  syntax: XRechnungSyntax = 'ubl'
): string {
  return syntax === 'ubl' ? generateUBLXml(invoice) : generateCIIXml(invoice);
}

export function safeFileName(
  invoiceNumber: string,
  syntax: XRechnungSyntax = 'ubl'
): string {
  const cleaned = invoiceNumber.trim().replaceAll(/[^a-zA-Z0-9-_]/g, '-');
  return `invoice_${cleaned || 'xrechnung'}_xrechnung_${syntax}.xml`;
}

export function previewText(value: string): string {
  return escapeXml(value);
}
