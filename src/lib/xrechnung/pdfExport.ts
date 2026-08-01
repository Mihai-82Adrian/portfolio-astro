import { isIsoDate } from '../fin-core/date';
import { formatEUR } from '../fin-core/money';
import type { Invoice } from '../fin-core/types';
import { computeInvoiceTotals } from '../fin-core/xrechnung';

function formatDateDE(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || !isIsoDate(trimmed)) return '-';
  const [year, month, day] = trimmed.split('-');
  return `${day}.${month}.${year}`;
}

export type XRechnungPdfParams = {
  invoice: Invoice;
  profileMode: 'xrechnung' | 'en16931';
  taxRegimePdfText: string;
  taxNoteLabelMap: Record<string, string>;
  logoForPdf?: string;
};

export function buildXRechnungDocDefinition(params: XRechnungPdfParams): any {
  const { invoice: effectiveInvoice, profileMode, taxRegimePdfText, taxNoteLabelMap, logoForPdf } = params;
  const totals = computeInvoiceTotals(effectiveInvoice);

  const lineItemRows = effectiveInvoice.lineItems.map((item) => [
    item.description || '—',
    { text: item.quantity.toFixed(2), alignment: 'right' as const },
    { text: formatEUR(item.unitPrice), alignment: 'right' as const },
    {
      text:
        effectiveInvoice.taxNote === 'standard_vat'
          ? `${item.taxRate.toFixed(2)}%`
          : '0.00%',
      alignment: 'right' as const,
    },
    {
      text: formatEUR(item.quantity * item.unitPrice),
      alignment: 'right' as const,
    },
  ]);

  const footerColumns = [
    {
      stack: [
        { text: 'Bank', bold: true },
        { text: `IBAN: ${effectiveInvoice.payeeIban || '-'}` },
        { text: `BIC: ${effectiveInvoice.payeeBic || '-'}` },
        { text: `Inhaber: ${effectiveInvoice.payeeAccountName || '-'}` },
      ],
    },
    {
      stack: [
        { text: 'Steuerdaten', bold: true },
        { text: `Steuernummer: ${effectiveInvoice.seller.taxNumber || '-'}` },
        { text: `USt-IdNr: ${effectiveInvoice.seller.vatId || '-'}` },
      ],
    },
    {
      stack: [
        { text: 'Register / §35a GmbHG', bold: true },
        { text: `Registergericht & HRB: ${effectiveInvoice.seller.register || '-'}` },
        { text: `Rechtsform: ${effectiveInvoice.seller.legalForm || '-'}` },
        { text: `Geschäftsführer: ${effectiveInvoice.seller.managingDirectors || '-'}` },
      ],
    },
  ];
  const invoiceNumber = (effectiveInvoice.invoiceNumber || '').trim() || 'Rechnung';

  return {
    pageSize: 'A4',
    pageMargins: [56.7, 56.7, 56.7, 56.7],
    info: {
      title: `Rechnung ${invoiceNumber}`,
      author: effectiveInvoice.seller.name || 'Mihai Adrian Mateescu',
      subject: 'E-Rechnung PDF Export',
    },
    defaultStyle: {
      fontSize: 10,
      color: '#000000',
    },
    content: [
      ...(logoForPdf
        ? [
            {
              image: logoForPdf,
              fit: [130, 55],
              absolutePosition: { x: 390, y: 42 },
            },
          ]
        : []),
      {
        absolutePosition: { x: 56.7, y: 127.5 },
        width: 240,
        stack: [
          {
            text: `${effectiveInvoice.seller.name || 'Sender Name'} • ${effectiveInvoice.seller.address.street || 'Street'} • ${effectiveInvoice.seller.address.postalCode || '00000'} ${effectiveInvoice.seller.address.city || 'City'}`,
            fontSize: 7,
            color: '#6b7280',
            decoration: 'underline' as const,
            margin: [0, 0, 0, 8],
          },
          {
            text: effectiveInvoice.buyer.name || 'Buyer Name',
            bold: true,
            fontSize: 10,
          },
          {
            text: effectiveInvoice.buyer.address.street || 'Buyer Street',
            fontSize: 10,
          },
          {
            text: `${effectiveInvoice.buyer.address.postalCode || '00000'} ${effectiveInvoice.buyer.address.city || 'City'}`,
            fontSize: 10,
          },
          {
            text: effectiveInvoice.buyer.address.countryCode || 'DE',
            fontSize: 10,
          },
        ],
      },
      {
        absolutePosition: { x: 350, y: 140 },
        width: 190,
        table: {
          widths: [90, '*'],
          body: [
            ['Rechnungsdatum', formatDateDE(effectiveInvoice.issueDate)],
            ['Rechnungsnummer', invoiceNumber],
            [
              profileMode === 'xrechnung'
                ? 'Leitweg-ID'
                : 'Bestellnummer / Referenz (BT-10)',
              effectiveInvoice.buyerReference || '-',
            ],
            ['Fälligkeit', formatDateDE(effectiveInvoice.dueDate)],
          ],
        },
        layout: 'noBorders' as const,
        fontSize: 9,
      },
      { text: '', margin: [0, 220, 0, 0] },
      {
        text: `Rechnung Nr. ${invoiceNumber}`,
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 6],
      },
      {
        text:
          `Leistungsdatum: ${formatDateDE(effectiveInvoice.serviceDate)}\nSteuerregelung: ${taxNoteLabelMap[effectiveInvoice.taxNote]}` +
          (taxRegimePdfText ? `\n${taxRegimePdfText}` : ''),
        fontSize: 10,
        margin: [0, 0, 0, 14],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              'Beschreibung',
              { text: 'Menge', alignment: 'right' },
              { text: 'Einzelpreis', alignment: 'right' },
              { text: 'Steuer', alignment: 'right' },
              { text: 'Netto', alignment: 'right' },
            ],
            ...lineItemRows,
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f9fafb' : null),
          hLineColor: () => '#d1d5db',
          vLineColor: () => '#e5e7eb',
          hLineWidth: (i: number) => (i === 1 ? 1.2 : 0.6),
          vLineWidth: () => 0,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        fontSize: 9,
      },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 210,
            table: {
              widths: ['*', 90],
              body: [
                [
                  { text: 'Nettobetrag', alignment: 'right' as const },
                  { text: formatEUR(totals.netTotal), alignment: 'right' as const },
                ],
                [
                  { text: 'Umsatzsteuer', alignment: 'right' as const },
                  { text: formatEUR(totals.taxTotal), alignment: 'right' as const },
                ],
                [
                  {
                    text: 'Rechnungsbetrag',
                    bold: true,
                    fontSize: 12,
                    alignment: 'right' as const,
                  },
                  {
                    text: formatEUR(totals.grossTotal),
                    bold: true,
                    fontSize: 12,
                    alignment: 'right' as const,
                  },
                ],
              ],
            },
            layout: {
              hLineColor: (i: number) => (i === 2 ? '#111827' : '#d1d5db'),
              hLineWidth: (i: number) => (i === 2 ? 2 : 0.6),
              vLineWidth: () => 0,
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 6,
              paddingBottom: () => 6,
            },
            margin: [0, 12, 0, 0],
          },
        ],
      },
    ],
    footer: () => ({
      margin: [56.7, 0, 56.7, 18],
      table: {
        widths: ['*', '*', '*'],
        body: [
          footerColumns.map((col) => ({
            stack: col.stack,
            fontSize: 7,
            color: '#374151',
          })),
        ],
      },
      layout: 'noBorders',
    }),
  };
}

export async function generateXRechnungPdf(params: XRechnungPdfParams): Promise<Blob> {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ]);
  const pdfMake = (pdfMakeMod.default ?? pdfMakeMod) as any;
  const vfsBundle = (vfsMod.default ?? vfsMod) as any;
  const injectedVfs = vfsBundle.pdfMake?.vfs ?? vfsBundle.vfs ?? vfsBundle;
  if (injectedVfs && pdfMake.addVirtualFileSystem) {
    pdfMake.addVirtualFileSystem(injectedVfs);
  }

  const docDefinition = buildXRechnungDocDefinition(params);
  const pdfDoc = pdfMake.createPdf(docDefinition);
  const blob: Blob = await pdfDoc.getBlob();
  if (!(blob instanceof Blob)) throw new Error('PDF blob generation failed');
  return blob;
}
