<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '@/components/tools/ui/Button.svelte';
  import MoneyField from '@/components/tools/ui/MoneyField.svelte';
  import SelectField from '@/components/tools/ui/SelectField.svelte';
  import TextField from '@/components/tools/ui/TextField.svelte';
  import Toggle from '@/components/tools/ui/Toggle.svelte';
  import { isIsoDate, toIsoDate } from '@/lib/fin-core/date';
  import { formatEUR } from '@/lib/fin-core/money';
  import type { Invoice, LineItem } from '@/lib/fin-core/types';
  import { validateInvoice } from '@/lib/fin-core/validate';
  import {
    businessProcessIdForProfile,
    computeInvoiceTotals,
    EN16931_CORE_URN,
    generateXRechnungXml,
    safeFileName,
    XRECHNUNG_CIUS_URN,
    type XRechnungSyntax,
  } from '@/lib/fin-core/xrechnung';

  const STORAGE_KEY = 'tools.xrechnung.sender.defaults.v1';

  const taxRateOptions = [
    { value: '19', label: '19% (DE Standard)' },
    { value: '7', label: '7% (DE Reduced)' },
    { value: '0', label: '0% (VAT Exempt)' },
  ];
  const syntaxOptions = [
    { value: 'ubl', label: 'UBL 2.1' },
    { value: 'cii', label: 'UN/CEFACT CII' },
  ];
  type UiProfileMode = 'xrechnung' | 'en16931';

  const profileOptions: Array<{ value: UiProfileMode; label: string }> = [
    { value: 'xrechnung', label: 'XRechnung 3.0 (KoSIT CIUS)' },
    { value: 'en16931', label: 'EN16931 Basic (UBL)' },
  ];
  const profileModeToCustomizationId: Record<UiProfileMode, string> = {
    xrechnung: XRECHNUNG_CIUS_URN,
    en16931: EN16931_CORE_URN,
  };
  const profileMessages: Record<UiProfileMode, string> = {
    xrechnung: 'Target profile: XRechnung 3.0 (KoSIT CIUS).',
    en16931: 'Target profile: EN16931 Basic (UBL).',
  };
  const endpointSchemeOptions = [
    { value: 'EM', label: 'EM (E-Mail)' },
    { value: '0204', label: '0204 (Leitweg-ID)' },
    { value: '0088', label: '0088 (GLN)' },
  ];
  const paymentMeansOptions = [
    { value: '58', label: '58 - SEPA Credit Transfer' },
    { value: '30', label: '30 - Credit Transfer' },
  ];
  const taxNoteOptions = [
    { value: 'standard_vat', label: 'Standard (mit USt.)' },
    { value: 'kleinunternehmer_19', label: 'Kleinunternehmerregelung (§ 19 UStG)' },
    { value: 'reverse_charge_13b', label: 'Reverse Charge / Steuerschuldnerschaft (§ 13b UStG)' },
    { value: 'intra_community_supply', label: 'Innergemeinschaftliche Lieferung' },
  ];
  const taxNoteLabelMap: Record<string, string> = {
    standard_vat: 'Standard (mit USt.)',
    kleinunternehmer_19: 'Kleinunternehmerregelung (§ 19 UStG)',
    reverse_charge_13b: 'Reverse Charge / Steuerschuldnerschaft (§ 13b UStG)',
    intra_community_supply: 'Innergemeinschaftliche Lieferung',
  };

  function createLineItem(index: number): LineItem {
    return {
      id: String(index + 1),
      description: '',
      quantity: 1,
      unitCode: 'H87',
      unitPrice: 0,
      taxRate: 19,
    };
  }

  let invoice: Invoice = {
    profileId: XRECHNUNG_CIUS_URN,
    invoiceNumber: `INV-${new Date().getFullYear()}-001`,
    buyerReference: 'PO-REF-001',
    issueDate: toIsoDate(),
    serviceDate: toIsoDate(),
    dueDate: '',
    paymentMeansCode: '58',
    payeeIban: '',
    payeeBic: '',
    payeeAccountName: '',
    taxNote: 'standard_vat',
    currency: 'EUR',
    seller: {
      name: '',
      legalForm: '',
      register: '',
      managingDirectors: '',
      taxNumber: '',
      vatId: '',
      email: '',
      phone: '',
      endpointId: '',
      endpointScheme: 'EM',
      address: {
        street: '',
        city: '',
        postalCode: '',
        countryCode: 'DE',
      },
    },
    buyer: {
      name: '',
      vatId: '',
      endpointId: '',
      endpointScheme: 'EM',
      address: {
        street: '',
        city: '',
        postalCode: '',
        countryCode: 'DE',
      },
    },
    lineItems: [createLineItem(0)],
    notes: '',
  };

  let rememberDefaults = false;
  let downloadError = '';
  let syntax: XRechnungSyntax = 'ubl';
  let profileMode: UiProfileMode = 'xrechnung';
  let profileLabel = profileOptions[0].label;
  let sellerLogoDataUrl = '';
  let pdfError = '';
  let pdfBusy = false;

  $: effectiveInvoice = {
    ...invoice,
    profileId: profileModeToCustomizationId[profileMode],
  };
  $: profileLabel = profileOptions.find((option) => option.value === profileMode)?.label ?? profileOptions[0].label;
  $: validation = validateInvoice(effectiveInvoice, { profileMode });
  $: totals = computeInvoiceTotals(effectiveInvoice);
  $: xmlOutput = validation.valid ? generateXRechnungXml(effectiveInvoice, syntax) : '';
  $: validationErrorCount = Object.keys(validation.errors).length;
  $: availableSyntaxOptions =
    profileMode === 'en16931'
      ? [{ value: 'ubl', label: 'UBL 2.1 (locked for EN16931 Basic)' }]
      : syntaxOptions;
  $: if (profileMode === 'en16931' && syntax !== 'ubl') {
    syntax = 'ubl';
  }
  $: previewCustomizationId = effectiveInvoice.profileId;
  $: previewBusinessProcessId = businessProcessIdForProfile(effectiveInvoice.profileId);
  const fieldLabels: Record<string, string> = {
    invoiceNumber: 'Rechnungsnummer',
    buyerReference: 'Buyer Reference (BT-10)',
    issueDate: 'Rechnungsdatum',
    serviceDate: 'Leistungsdatum (BT-72)',
    dueDate: 'Fälligkeitsdatum',
    paymentTerms: 'Zahlungsbedingungen',
    paymentMeansCode: 'Payment Means Code',
    taxNote: 'Steuerregelung',
    payeeIban: 'IBAN (Payee)',
    'seller.name': 'Seller Name',
    'seller.legalForm': 'Rechtsform',
    'seller.register': 'Register',
    'seller.managingDirectors': 'Geschäftsführung',
    'seller.email': 'Seller E-Mail',
    'seller.phone': 'Seller Telefon',
    'seller.endpointId': 'Seller EndpointID',
    'seller.endpointScheme': 'Seller Endpoint-Schema',
    'seller.street': 'Seller Straße',
    'seller.city': 'Seller Ort',
    'seller.postalCode': 'Seller PLZ',
    'seller.countryCode': 'Seller Land',
    'buyer.name': 'Buyer Name',
    'buyer.endpointId': 'Buyer EndpointID',
    'buyer.endpointScheme': 'Buyer Endpoint-Schema',
    'buyer.street': 'Buyer Straße',
    'buyer.city': 'Buyer Ort',
    'buyer.postalCode': 'Buyer PLZ',
    'buyer.countryCode': 'Buyer Land',
    lineItems: 'Line Items',
  };
  const errorFieldIdMap: Record<string, string> = {
    invoiceNumber: 'invoice-number',
    buyerReference: 'buyer-reference',
    issueDate: 'invoice-date',
    serviceDate: 'service-date',
    dueDate: 'due-date',
    paymentTerms: 'payment-terms',
    paymentMeansCode: 'payment-means-code',
    taxNote: 'tax-note',
    payeeIban: 'payee-iban',
    'seller.name': 'seller-name',
    'seller.legalForm': 'seller-legal-form',
    'seller.register': 'seller-register',
    'seller.managingDirectors': 'seller-directors',
    'seller.email': 'seller-email',
    'seller.phone': 'seller-phone',
    'seller.endpointId': 'seller-endpoint-id',
    'seller.endpointScheme': 'seller-endpoint-scheme',
    'seller.street': 'seller-street',
    'seller.city': 'seller-city',
    'seller.postalCode': 'seller-postal',
    'seller.countryCode': 'seller-country',
    'buyer.name': 'buyer-name',
    'buyer.endpointId': 'buyer-endpoint-id',
    'buyer.endpointScheme': 'buyer-endpoint-scheme',
    'buyer.street': 'buyer-street',
    'buyer.city': 'buyer-city',
    'buyer.postalCode': 'buyer-postal',
    'buyer.countryCode': 'buyer-country',
  };

  function fieldIdForErrorKey(key: string): string | undefined {
    if (errorFieldIdMap[key]) {
      return errorFieldIdMap[key];
    }
    const lineItemMatch = key.match(/^lineItems\.(\d+)\.(description|quantity|unitPrice|taxRate)$/);
    if (!lineItemMatch) {
      return undefined;
    }
    const index = Number.parseInt(lineItemMatch[1], 10);
    const field = lineItemMatch[2];
    if (!Number.isFinite(index)) {
      return undefined;
    }
    if (field === 'description') return `line-desc-${index}`;
    if (field === 'quantity') return `line-qty-${index}`;
    if (field === 'unitPrice') return `line-price-${index}`;
    if (field === 'taxRate') return `line-tax-${index}`;
    return undefined;
  }

  function focusErrorField(domId: string): void {
    const element = document.getElementById(domId) as HTMLElement | null;
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
  }

  $: errorEntries = Object.entries(validation.errors).map(([key, message]) => ({
    key,
    label: fieldLabels[key] ?? key,
    message,
    fieldId: fieldIdForErrorKey(key),
  }));
  $: requiredFieldState = {
    invoiceNumber: invoice.invoiceNumber.trim().length > 0 && !validation.errors.invoiceNumber,
    issueDate: invoice.issueDate.trim().length > 0 && !validation.errors.issueDate,
    sellerName: invoice.seller.name.trim().length > 0 && !validation.errors['seller.name'],
    buyerName: invoice.buyer.name.trim().length > 0 && !validation.errors['buyer.name'],
    payeeIban: invoice.payeeIban.trim().length > 0 && !validation.errors.payeeIban,
  };

  function addLineItem(): void {
    invoice = {
      ...invoice,
      lineItems: [...invoice.lineItems, createLineItem(invoice.lineItems.length)],
    };
  }

  function removeLineItem(index: number): void {
    if (invoice.lineItems.length <= 1) {
      return;
    }
    invoice = {
      ...invoice,
      lineItems: invoice.lineItems
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, id: String(i + 1) })),
    };
  }

  function updateLineItem(index: number, patch: Partial<LineItem>): void {
    invoice = {
      ...invoice,
      lineItems: invoice.lineItems.map((item, i) =>
        i === index
          ? {
              ...item,
              ...patch,
            }
          : item
      ),
    };
  }

  function downloadXml(): void {
    downloadError = '';
    if (!validation.valid || !xmlOutput) {
      downloadError = 'Bitte alle Pflichtfelder ausfüllen, bevor XML exportiert wird.';
      return;
    }

    const blob = new Blob([xmlOutput], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFileName(invoice.invoiceNumber, syntax);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleLogoUpload(event: Event): void {
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      pdfError = 'Bitte ein Bildformat für das Logo wählen.';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      sellerLogoDataUrl = typeof reader.result === 'string' ? reader.result : '';
      pdfError = '';
    };
    reader.onerror = () => {
      pdfError = 'Logo konnte nicht gelesen werden.';
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function removeLogo(): void {
    sellerLogoDataUrl = '';
  }

  function isPdfmakeSupportedDataUrl(value: string): boolean {
    return /^data:image\/(png|jpe?g);base64,/i.test(value.trim());
  }

  async function prepareLogoForPdf(raw: string): Promise<string | undefined> {
    const value = raw.trim();
    if (!value) return undefined;
    if (isPdfmakeSupportedDataUrl(value)) return value;
    if (!value.startsWith('data:image/')) return undefined;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve(undefined);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(undefined);
          return;
        }
        // White background for transparent formats before PNG conversion.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(undefined);
      img.src = value;
    });
  }

  function formatDateDE(value: string): string {
    const trimmed = value.trim();
    if (!trimmed || !isIsoDate(trimmed)) return '-';
    const [year, month, day] = trimmed.split('-');
    return `${day}.${month}.${year}`;
  }

  async function downloadPdf(): Promise<void> {
    pdfError = '';
    if (!validation.valid) {
      pdfError = 'Bitte alle Pflichtfelder ausfüllen, bevor PDF exportiert wird.';
      return;
    }

    pdfBusy = true;
    try {
      const [pdfMakeMod, vfsMod] = await Promise.all([
        import('pdfmake/build/pdfmake.js'),
        import('pdfmake/build/vfs_fonts.js'),
      ]);
      const pdfMake = (pdfMakeMod.default ?? pdfMakeMod) as {
        addVirtualFileSystem?: (vfs: Record<string, string>) => void;
        createPdf: (docDefinition: unknown) => { download: (filename: string) => void; getBlob: () => Promise<Blob> };
      };
      const vfsBundle = (vfsMod.default ?? vfsMod) as {
        pdfMake?: { vfs?: Record<string, string> };
        vfs?: Record<string, string>;
      };
      const injectedVfs = (
        vfsBundle.pdfMake?.vfs
        ?? vfsBundle.vfs
        ?? (vfsBundle as unknown as Record<string, string>)
      );
      if (injectedVfs && pdfMake.addVirtualFileSystem) {
        pdfMake.addVirtualFileSystem(injectedVfs);
      }

      const logoForPdf = await prepareLogoForPdf(sellerLogoDataUrl);
      if (sellerLogoDataUrl && !logoForPdf) {
        pdfError = 'Logo-Format nicht unterstützt. PDF wird ohne Logo erstellt.';
      }

      const lineItemRows = effectiveInvoice.lineItems.map((item) => ([
        item.description || '—',
        { text: item.quantity.toFixed(2), alignment: 'right' as const },
        { text: formatEUR(item.unitPrice), alignment: 'right' as const },
        {
          text: effectiveInvoice.taxNote === 'standard_vat' ? `${item.taxRate.toFixed(2)}%` : '0.00%',
          alignment: 'right' as const,
        },
        { text: formatEUR(item.quantity * item.unitPrice), alignment: 'right' as const },
      ]));

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
            { text: 'Register / GmbHG', bold: true },
            { text: effectiveInvoice.seller.register || '-' },
            { text: effectiveInvoice.seller.legalForm || '-' },
            { text: effectiveInvoice.seller.managingDirectors || '-' },
          ],
        },
      ];
      const invoiceNumber = (effectiveInvoice.invoiceNumber || '').trim() || 'Rechnung';

      const docDefinition = {
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
              { text: effectiveInvoice.buyer.name || 'Buyer Name', bold: true, fontSize: 10 },
              { text: effectiveInvoice.buyer.address.street || 'Buyer Street', fontSize: 10 },
              {
                text: `${effectiveInvoice.buyer.address.postalCode || '00000'} ${effectiveInvoice.buyer.address.city || 'City'}`,
                fontSize: 10,
              },
              { text: effectiveInvoice.buyer.address.countryCode || 'DE', fontSize: 10 },
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
                ['Leitweg-ID', effectiveInvoice.buyerReference || '-'],
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
            text: `Leistungsdatum: ${formatDateDE(effectiveInvoice.serviceDate)}\nSteuerregelung: ${taxNoteLabelMap[effectiveInvoice.taxNote]}`,
            fontSize: 10,
            margin: [0, 0, 0, 14],
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto'],
              body: [
                ['Beschreibung', { text: 'Menge', alignment: 'right' }, { text: 'Einzelpreis', alignment: 'right' }, { text: 'Steuer', alignment: 'right' }, { text: 'Netto', alignment: 'right' }],
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
                    [{ text: 'Nettobetrag', alignment: 'right' as const }, { text: formatEUR(totals.netTotal), alignment: 'right' as const }],
                    [{ text: 'Umsatzsteuer', alignment: 'right' as const }, { text: formatEUR(totals.taxTotal), alignment: 'right' as const }],
                    [
                      { text: 'Rechnungsbetrag', bold: true, fontSize: 12, alignment: 'right' as const },
                      { text: formatEUR(totals.grossTotal), bold: true, fontSize: 12, alignment: 'right' as const },
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

      const pdfDoc = pdfMake.createPdf(docDefinition);
      const blob = await pdfDoc.getBlob();
      if (!(blob instanceof Blob)) {
        throw new Error('PDF blob generation failed');
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Rechnung_${safeFileName(invoiceNumber)}.pdf`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PDF export error';
      pdfError = `PDF konnte nicht erstellt werden: ${message}`;
    } finally {
      pdfBusy = false;
    }
  }

  function readStoredDefaults(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        name?: string;
        legalForm?: string;
        register?: string;
        managingDirectors?: string;
        taxNumber?: string;
        vatId?: string;
        email?: string;
        phone?: string;
        endpointId?: string;
        endpointScheme?: string;
        address?: {
          street?: string;
          city?: string;
          postalCode?: string;
          countryCode?: string;
        };
      };

      invoice = {
        ...invoice,
        seller: {
          ...invoice.seller,
          name: parsed.name ?? invoice.seller.name,
          legalForm: parsed.legalForm ?? invoice.seller.legalForm,
          register: parsed.register ?? invoice.seller.register,
          managingDirectors: parsed.managingDirectors ?? invoice.seller.managingDirectors,
          taxNumber: parsed.taxNumber ?? invoice.seller.taxNumber,
          vatId: parsed.vatId ?? invoice.seller.vatId,
          email: parsed.email ?? invoice.seller.email,
          phone: parsed.phone ?? invoice.seller.phone,
          endpointId: parsed.endpointId ?? invoice.seller.endpointId,
          endpointScheme: parsed.endpointScheme ?? invoice.seller.endpointScheme,
          address: {
            ...invoice.seller.address,
            street: parsed.address?.street ?? invoice.seller.address.street,
            city: parsed.address?.city ?? invoice.seller.address.city,
            postalCode: parsed.address?.postalCode ?? invoice.seller.address.postalCode,
            countryCode: parsed.address?.countryCode ?? invoice.seller.address.countryCode,
          },
        },
      };
      rememberDefaults = true;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      rememberDefaults = false;
    }
  }

  function persistDefaults(enabled: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (!enabled) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload = {
      name: invoice.seller.name,
      legalForm: invoice.seller.legalForm,
      register: invoice.seller.register,
      managingDirectors: invoice.seller.managingDirectors,
      taxNumber: invoice.seller.taxNumber,
      vatId: invoice.seller.vatId,
      email: invoice.seller.email,
      phone: invoice.seller.phone,
      endpointId: invoice.seller.endpointId,
      endpointScheme: invoice.seller.endpointScheme,
      address: invoice.seller.address,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  onMount(() => {
    readStoredDefaults();
  });

  $: if (rememberDefaults) {
    persistDefaults(true);
  }

  $: if (!rememberDefaults) {
    persistDefaults(false);
  }
</script>

<div class="grid grid-cols-1 gap-6 rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10 md:p-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
  <section class="space-y-5">
    <article class="rounded-2xl border border-eucalyptus-500/30 bg-[var(--bg-elevated)] p-4 dark:border-eucalyptus-400/30 md:p-5">
      <h2 class="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Target Profile</h2>
      <p class="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Compliance by construction: profile locks mandatory export identifiers.
      </p>
      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          id="invoice-profile-top"
          label="Target Profile"
          bind:value={profileMode}
          options={profileOptions}
        />
      </div>
    </article>

    <article class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10 md:p-5">
      <h2 class="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Sender</h2>
      <p class="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Rechnungssteller Daten (Pflicht für EN 16931 Basis).
      </p>
      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="md:col-span-2">
          <TextField
            id="seller-name"
            label="Firmenname"
            bind:value={invoice.seller.name}
            required
            error={validation.errors['seller.name']}
            valid={requiredFieldState.sellerName}
          />
        </div>
        <div class="md:col-span-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
          <label for="seller-logo" class="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
            Firmenlogo (optional, local Base64)
          </label>
          <input
            id="seller-logo"
            type="file"
            accept="image/*"
            on:change={handleLogoUpload}
            class="mt-2 block w-full rounded-lg border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-sm text-text-primary-light file:mr-3 file:rounded-md file:border-0 file:bg-eucalyptus-500/15 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-eucalyptus-700 dark:border-white/10 dark:text-text-primary-dark dark:file:text-eucalyptus-300"
          />
          {#if sellerLogoDataUrl}
            <div class="mt-3 flex items-center gap-3">
              <img src={sellerLogoDataUrl} alt="Seller logo preview" class="h-10 w-auto rounded bg-white/90 p-1" />
              <Button type="button" variant="secondary" on:click={removeLogo}>Remove Logo</Button>
            </div>
          {/if}
        </div>
        <TextField id="seller-vat" label="USt-ID (optional)" bind:value={invoice.seller.vatId} />
        <TextField
          id="seller-email"
          label="E-Mail"
          type="email"
          bind:value={invoice.seller.email}
          required
          error={validation.errors['seller.email']}
        />
        <TextField
          id="seller-phone"
          label="Telefon"
          bind:value={invoice.seller.phone}
          required
          error={validation.errors['seller.phone']}
        />
        <SelectField
          id="seller-endpoint-scheme"
          label="Endpoint Scheme"
          bind:value={invoice.seller.endpointScheme}
          options={endpointSchemeOptions}
          error={validation.errors['seller.endpointScheme']}
        />
        <TextField
          id="seller-endpoint-id"
          label="Seller EndpointID"
          bind:value={invoice.seller.endpointId}
          required
          error={validation.errors['seller.endpointId']}
        />
        <div class="md:col-span-2">
          <TextField
            id="seller-street"
            label="Straße"
            bind:value={invoice.seller.address.street}
            required
            error={validation.errors['seller.street']}
          />
        </div>
        <TextField
          id="seller-postal"
          label="PLZ"
          bind:value={invoice.seller.address.postalCode}
          required
          error={validation.errors['seller.postalCode']}
        />
        <TextField
          id="seller-city"
          label="Ort"
          bind:value={invoice.seller.address.city}
          required
          error={validation.errors['seller.city']}
        />
        <SelectField
          id="seller-country"
          label="Land"
          bind:value={invoice.seller.address.countryCode}
          options={[{ value: 'DE', label: 'Deutschland (DE)' }, { value: 'AT', label: 'Österreich (AT)' }, { value: 'CH', label: 'Schweiz (CH)' }]}
          error={validation.errors['seller.countryCode']}
        />
      </div>
    </article>

    <article class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10 md:p-5">
      <h2 class="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Buyer</h2>
      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="md:col-span-2">
          <TextField
            id="buyer-name"
            label="Kunde / Firma"
            bind:value={invoice.buyer.name}
            required
            error={validation.errors['buyer.name']}
            valid={requiredFieldState.buyerName}
          />
        </div>
        <TextField id="buyer-vat" label="USt-ID (optional)" bind:value={invoice.buyer.vatId} />
        <SelectField
          id="buyer-endpoint-scheme"
          label="Endpoint Scheme"
          bind:value={invoice.buyer.endpointScheme}
          options={endpointSchemeOptions}
          error={validation.errors['buyer.endpointScheme']}
        />
        <TextField
          id="buyer-endpoint-id"
          label="Buyer EndpointID"
          bind:value={invoice.buyer.endpointId}
          required
          error={validation.errors['buyer.endpointId']}
        />
        <div class="md:col-span-2">
          <TextField
            id="buyer-street"
            label="Straße"
            bind:value={invoice.buyer.address.street}
            required
            error={validation.errors['buyer.street']}
          />
        </div>
        <TextField
          id="buyer-postal"
          label="PLZ"
          bind:value={invoice.buyer.address.postalCode}
          required
          error={validation.errors['buyer.postalCode']}
        />
        <TextField
          id="buyer-city"
          label="Ort"
          bind:value={invoice.buyer.address.city}
          required
          error={validation.errors['buyer.city']}
        />
        <SelectField
          id="buyer-country"
          label="Land"
          bind:value={invoice.buyer.address.countryCode}
          options={[{ value: 'DE', label: 'Deutschland (DE)' }, { value: 'AT', label: 'Österreich (AT)' }, { value: 'CH', label: 'Schweiz (CH)' }]}
          error={validation.errors['buyer.countryCode']}
        />
      </div>
    </article>

    <article class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10 md:p-5">
      <h2 class="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Invoice Meta</h2>
      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          id="invoice-number"
          label="Rechnungsnummer"
          bind:value={invoice.invoiceNumber}
          required
          error={validation.errors.invoiceNumber}
          valid={requiredFieldState.invoiceNumber}
        />
        <TextField
          id="buyer-reference"
          label="Buyer Reference (BT-10)"
          bind:value={invoice.buyerReference}
          error={validation.errors.buyerReference}
          helpText="Wichtig für B2G (Leitweg-ID) oder als Bestellnummer des Kunden (BR-DE-15)."
          valid={invoice.buyerReference.trim().length > 0 && !validation.errors.buyerReference}
        />
        <TextField
          id="invoice-date"
          label="Rechnungsdatum"
          type="date"
          bind:value={invoice.issueDate}
          required
          error={validation.errors.issueDate}
          valid={requiredFieldState.issueDate}
        />
        <TextField
          id="service-date"
          label="Leistungsdatum (BT-72)"
          type="date"
          bind:value={invoice.serviceDate}
          required
          error={validation.errors.serviceDate}
        />
        <TextField id="due-date" label="Fälligkeitsdatum (optional)" type="date" bind:value={invoice.dueDate} error={validation.errors.dueDate} />
        <div class="md:col-span-2">
          <TextField
            id="payment-terms"
            label="Zahlungsbedingungen (optional wenn Due Date gesetzt)"
            bind:value={invoice.paymentTerms}
            error={validation.errors.paymentTerms}
            helpText="Fälligkeitsdatum muss logisch nach dem Rechnungsdatum liegen (BR-CO-25)."
          />
        </div>
        <SelectField
          id="payment-means-code"
          label="Payment Means Code"
          bind:value={invoice.paymentMeansCode}
          options={paymentMeansOptions}
          error={validation.errors.paymentMeansCode}
        />
        <TextField
          id="payee-iban"
          label="IBAN (Payee)"
          bind:value={invoice.payeeIban}
          required
          error={validation.errors.payeeIban}
          helpText="IBAN-Format: beginnt mit 2 Buchstaben und enthält 15-34 Zeichen."
          valid={requiredFieldState.payeeIban}
        />
        <TextField id="payee-bic" label="BIC (optional)" bind:value={invoice.payeeBic} />
        <TextField id="payee-account-name" label="Kontoinhaber (optional)" bind:value={invoice.payeeAccountName} />
      </div>
    </article>

    <article class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10 md:p-5">
      <details open>
        <summary class="cursor-pointer text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">
          Rechtliche &amp; Steuerliche Details
        </summary>
        <p class="mt-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Pflichtangaben für rechtskonforme Rechnungen in Deutschland (u. a. §14 UStG, §35a GmbHG).
        </p>
        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            id="seller-legal-form"
            label="Rechtsform"
            bind:value={invoice.seller.legalForm}
            required
            error={validation.errors['seller.legalForm']}
          />
          <TextField
            id="seller-register"
            label="Registereintrag (z. B. Amtsgericht Hamburg, HRB 123456)"
            bind:value={invoice.seller.register}
            error={validation.errors['seller.register']}
          />
          <div class="md:col-span-2">
            <TextField
              id="seller-directors"
              label="Geschäftsführer / Vertretungsberechtigte"
              bind:value={invoice.seller.managingDirectors}
              error={validation.errors['seller.managingDirectors']}
            />
          </div>
          <TextField
            id="seller-tax-number"
            label="Steuernummer (optional)"
            bind:value={invoice.seller.taxNumber}
          />
          <SelectField
            id="tax-note"
            label="Steuerregelung"
            bind:value={invoice.taxNote}
            options={taxNoteOptions}
            error={validation.errors.taxNote}
          />
        </div>
      </details>
    </article>

    <article class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10 md:p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Line Items</h2>
        <Button type="button" variant="secondary" on:click={addLineItem}>+ Position</Button>
      </div>

      <div class="mt-4 space-y-4">
        {#each invoice.lineItems as item, index (item.id)}
          <div class="rounded-xl border border-black/10 p-3 dark:border-white/10">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div class="md:col-span-5">
                <TextField
                  id={`line-desc-${index}`}
                  label="Beschreibung"
                  value={item.description}
                  error={validation.errors[`lineItems.${index}.description`]}
                  on:input={(event) => updateLineItem(index, { description: event.detail })}
                />
              </div>
              <div class="md:col-span-2">
                <TextField
                  id={`line-qty-${index}`}
                  label="Menge"
                  type="text"
                  value={String(item.quantity)}
                  error={validation.errors[`lineItems.${index}.quantity`]}
                  on:input={(event) =>
                    updateLineItem(index, {
                      quantity: Number.parseFloat(event.detail) || 0,
                    })
                  }
                />
              </div>
              <div class="md:col-span-3">
                <MoneyField
                  id={`line-price-${index}`}
                  label="Einzelpreis"
                  value={item.unitPrice}
                  error={validation.errors[`lineItems.${index}.unitPrice`]}
                  on:input={(event) =>
                    updateLineItem(index, {
                      unitPrice: Number(event.detail) || 0,
                    })
                  }
                />
              </div>
              <div class="md:col-span-2">
                <SelectField
                  id={`line-tax-${index}`}
                  label="MwSt."
                  value={String(item.taxRate)}
                  options={taxRateOptions}
                  helpText="S = Standardsteuer (z.B. 19%). Z = 0% / steuerbefreit / Reverse-Charge-Konstellation."
                  on:change={(event) =>
                    updateLineItem(index, {
                      taxRate: Number.parseFloat(event.detail),
                    })
                  }
                />
              </div>
            </div>
            <div class="mt-3 flex justify-end">
              <Button type="button" variant="secondary" disabled={invoice.lineItems.length <= 1} on:click={() => removeLineItem(index)}>
                Entfernen
              </Button>
            </div>
          </div>
        {/each}
      </div>
      {#if validation.errors.lineItems}
        <p class="mt-3 text-sm text-error">{validation.errors.lineItems}</p>
      {/if}
    </article>
  </section>

  <aside class="space-y-4">
    <article class="rounded-2xl border border-eucalyptus-500/30 bg-[var(--bg-elevated)] p-4 dark:border-eucalyptus-400/30 md:p-5">
      <h2 class="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Live Preview</h2>
      <p class="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Browser-only Vorschau. Keine serverseitige Speicherung.
      </p>

      <div class="mt-4 space-y-4 rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-text-muted-light dark:text-text-muted-dark">From</p>
            <p class="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">{invoice.seller.name || 'Sender'}</p>
            <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              {invoice.seller.address.street || 'Straße'}<br />
              {invoice.seller.address.postalCode || '00000'} {invoice.seller.address.city || 'Stadt'}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm text-text-muted-light dark:text-text-muted-dark">Invoice</p>
            <p class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{invoice.invoiceNumber || 'INV-000'}</p>
            <p class="text-xs text-text-secondary-light dark:text-text-secondary-dark">{invoice.issueDate}</p>
            <p class="text-xs text-text-secondary-light dark:text-text-secondary-dark">Service: {invoice.serviceDate}</p>
          </div>
        </div>

        <div>
          <p class="text-sm text-text-muted-light dark:text-text-muted-dark">To</p>
          <p class="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">{invoice.buyer.name || 'Kunde'}</p>
          <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            {invoice.buyer.address.street || 'Straße'}<br />
            {invoice.buyer.address.postalCode || '00000'} {invoice.buyer.address.city || 'Stadt'}
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-black/10 dark:border-white/10">
                <th class="py-2 text-left font-medium text-text-secondary-light dark:text-text-secondary-dark">Position</th>
                <th class="py-2 text-right font-medium text-text-secondary-light dark:text-text-secondary-dark">Qty</th>
                <th class="py-2 text-right font-medium text-text-secondary-light dark:text-text-secondary-dark">Unit</th>
                <th class="py-2 text-right font-medium text-text-secondary-light dark:text-text-secondary-dark">Total</th>
              </tr>
            </thead>
            <tbody>
              {#each invoice.lineItems as item}
                <tr class="border-b border-black/5 dark:border-white/5">
                  <td class="py-2 text-text-primary-light dark:text-text-primary-dark">{item.description || '—'}</td>
                  <td class="py-2 text-right text-text-secondary-light dark:text-text-secondary-dark">{item.quantity.toFixed(2)}</td>
                  <td class="py-2 text-right text-text-secondary-light dark:text-text-secondary-dark">{formatEUR(item.unitPrice)}</td>
                  <td class="py-2 text-right font-medium text-text-primary-light dark:text-text-primary-dark">
                    {formatEUR(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="space-y-1 text-sm">
          <p class="flex items-center justify-between">
            <span class="text-text-secondary-light dark:text-text-secondary-dark">Net</span>
            <span class="text-text-primary-light dark:text-text-primary-dark">{formatEUR(totals.netTotal)}</span>
          </p>
          <p class="flex items-center justify-between">
            <span class="text-text-secondary-light dark:text-text-secondary-dark">VAT</span>
            <span class="text-text-primary-light dark:text-text-primary-dark">{formatEUR(totals.taxTotal)}</span>
          </p>
          <p class="flex items-center justify-between border-t border-black/10 pt-2 font-semibold dark:border-white/10">
            <span class="text-text-primary-light dark:text-text-primary-dark">Total</span>
            <span class="text-eucalyptus-700 dark:text-eucalyptus-300">{formatEUR(totals.grossTotal)}</span>
          </p>
        </div>
        <p class="rounded-lg border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-xs text-text-secondary-light dark:border-white/10 dark:text-text-secondary-dark">
          Steuerhinweis: {taxNoteLabelMap[invoice.taxNote]}
        </p>
      </div>

      <div class="mt-4 space-y-3">
        <SelectField
          id="invoice-syntax"
          label="Syntax"
          bind:value={syntax}
          options={availableSyntaxOptions}
        />
        <div class="rounded-lg border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-xs dark:border-white/10">
          <p class="font-medium text-text-primary-light dark:text-text-primary-dark">Export IDs (current selection)</p>
          <p class="mt-1 text-text-secondary-light dark:text-text-secondary-dark">
            CustomizationID:
            <code class="font-mono text-[11px] break-all text-eucalyptus-700 dark:text-eucalyptus-300">{previewCustomizationId}</code>
          </p>
          <p class="mt-1 text-text-secondary-light dark:text-text-secondary-dark">
            ProfileID:
            <code class="font-mono text-[11px] break-all text-eucalyptus-700 dark:text-eucalyptus-300">{previewBusinessProcessId}</code>
          </p>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" on:click={downloadPdf} disabled={!validation.valid || pdfBusy}>
            {pdfBusy ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button type="button" variant="secondary" on:click={downloadXml} disabled={!validation.valid}>
            Download XML
          </Button>
        </div>
        <p class="rounded-lg border border-eucalyptus-500/30 bg-eucalyptus-500/15 px-3 py-2 text-xs font-medium text-eucalyptus-700 dark:text-eucalyptus-300">
          {profileMessages[profileMode]} Lokale Verarbeitung im Browser (Zero-Tracking).
        </p>
        {#if downloadError}
          <p class="text-sm text-error" aria-live="polite">{downloadError}</p>
        {/if}
        {#if pdfError}
          <p class="text-sm text-error" aria-live="polite">{pdfError}</p>
        {/if}
        <div
          class={`rounded-lg border px-3 py-2 text-sm ${
            validation.valid
              ? 'border-eucalyptus-500/40 bg-eucalyptus-500/10 text-eucalyptus-700 dark:text-eucalyptus-300'
              : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
          }`}
          aria-live="polite"
        >
          {#if validation.valid}
            Pre-check valid for export ({profileLabel} / {syntax.toUpperCase()}).
          {:else}
            Pre-check failed: {validationErrorCount} Pflichtfeld(er) fehlen oder sind ungültig.
          {/if}
        </div>
        <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
          Validation status in UI = pre-check. Final conformance must be verified with KoSIT validator.
        </p>
      </div>
    </article>

    <article class="rounded-2xl border border-black/10 bg-[var(--bg-elevated)] p-4 dark:border-white/10 md:p-5">
      <h3 class="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">Validation Summary</h3>
      <ul class="mt-3 space-y-2 text-sm">
        <li class="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
          <span>Rechnungsnummer</span>
          <span class={requiredFieldState.invoiceNumber ? 'text-eucalyptus-700 dark:text-eucalyptus-300' : 'text-red-700 dark:text-red-300'}>
            {requiredFieldState.invoiceNumber ? 'OK' : 'Fehlt'}
          </span>
        </li>
        <li class="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
          <span>Rechnungsdatum</span>
          <span class={requiredFieldState.issueDate ? 'text-eucalyptus-700 dark:text-eucalyptus-300' : 'text-red-700 dark:text-red-300'}>
            {requiredFieldState.issueDate ? 'OK' : 'Fehlt/ungültig'}
          </span>
        </li>
        <li class="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
          <span>Seller Name</span>
          <span class={requiredFieldState.sellerName ? 'text-eucalyptus-700 dark:text-eucalyptus-300' : 'text-red-700 dark:text-red-300'}>
            {requiredFieldState.sellerName ? 'OK' : 'Fehlt'}
          </span>
        </li>
        <li class="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
          <span>Buyer Name</span>
          <span class={requiredFieldState.buyerName ? 'text-eucalyptus-700 dark:text-eucalyptus-300' : 'text-red-700 dark:text-red-300'}>
            {requiredFieldState.buyerName ? 'OK' : 'Fehlt'}
          </span>
        </li>
        <li class="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
          <span>IBAN</span>
          <span class={requiredFieldState.payeeIban ? 'text-eucalyptus-700 dark:text-eucalyptus-300' : 'text-red-700 dark:text-red-300'}>
            {requiredFieldState.payeeIban ? 'OK' : 'Ungültig'}
          </span>
        </li>
      </ul>
      <details
        class="mt-4 rounded-lg border border-black/10 bg-[var(--bg-elevated)] dark:border-white/10"
        open={!validation.valid}
      >
        <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
          {validation.valid ? 'Validation Details: no active errors' : `Validation Details: ${validationErrorCount} issue(s)`}
        </summary>
        <div class="border-t border-black/10 px-3 py-3 dark:border-white/10">
          {#if validation.valid}
            <p class="text-sm text-eucalyptus-700 dark:text-eucalyptus-300">
              Alle Pflichtfelder sind gültig. XML-Export ist freigegeben.
            </p>
          {:else}
            <ul class="space-y-2">
              {#each errorEntries as entry}
                <li class="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-semibold text-red-700 dark:text-red-300">{entry.label}</p>
                    {#if entry.fieldId}
                      <button
                        type="button"
                        class="rounded border border-red-500/30 px-2 py-0.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 dark:text-red-300"
                        on:click={() => focusErrorField(entry.fieldId)}
                      >
                        Go to field
                      </button>
                    {/if}
                  </div>
                  <p class="text-xs text-red-700/90 dark:text-red-300/90">{entry.message}</p>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </details>
    </article>

    <Toggle
      id="remember-defaults"
      label="Remember defaults (localStorage)"
      description="Optional. Stores only sender defaults in this browser."
      bind:checked={rememberDefaults}
    />
  </aside>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    :global(*) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
</style>
