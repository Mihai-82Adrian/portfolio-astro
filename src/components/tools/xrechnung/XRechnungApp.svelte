<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '@/components/tools/ui/Button.svelte';
  import MoneyField from '@/components/tools/ui/MoneyField.svelte';
  import SelectField from '@/components/tools/ui/SelectField.svelte';
  import TextField from '@/components/tools/ui/TextField.svelte';
  import Toggle from '@/components/tools/ui/Toggle.svelte';
  import { toIsoDate } from '@/lib/fin-core/date';
  import { formatEUR } from '@/lib/fin-core/money';
  import type { Invoice, LineItem } from '@/lib/fin-core/types';
  import { validateInvoice } from '@/lib/fin-core/validate';
  import { computeInvoiceTotals, generateXRechnungXml, safeFileName } from '@/lib/fin-core/xrechnung';

  const STORAGE_KEY = 'tools.xrechnung.sender.defaults.v1';

  const taxRateOptions = [
    { value: '19', label: '19% (DE Standard)' },
    { value: '7', label: '7% (DE Reduced)' },
    { value: '0', label: '0% (VAT Exempt)' },
  ];

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
    profileId: 'urn:cen.eu:en16931:2017',
    invoiceNumber: `INV-${new Date().getFullYear()}-001`,
    issueDate: toIsoDate(),
    dueDate: '',
    currency: 'EUR',
    seller: {
      name: '',
      vatId: '',
      email: '',
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

  $: validation = validateInvoice(invoice);
  $: totals = computeInvoiceTotals(invoice);
  $: xmlOutput = validation.valid ? generateXRechnungXml(invoice) : '';

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
    link.download = safeFileName(invoice.invoiceNumber);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
        vatId?: string;
        email?: string;
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
          vatId: parsed.vatId ?? invoice.seller.vatId,
          email: parsed.email ?? invoice.seller.email,
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
      vatId: invoice.seller.vatId,
      email: invoice.seller.email,
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

<div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
  <section class="space-y-5">
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
          />
        </div>
        <TextField id="seller-vat" label="USt-ID (optional)" bind:value={invoice.seller.vatId} />
        <TextField id="seller-email" label="E-Mail (optional)" type="email" bind:value={invoice.seller.email} />
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
          />
        </div>
        <TextField id="buyer-vat" label="USt-ID (optional)" bind:value={invoice.buyer.vatId} />
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
        />
        <TextField
          id="invoice-date"
          label="Rechnungsdatum"
          type="date"
          bind:value={invoice.issueDate}
          required
          error={validation.errors.issueDate}
        />
        <TextField id="due-date" label="Fälligkeitsdatum (optional)" type="date" bind:value={invoice.dueDate} error={validation.errors.dueDate} />
      </div>
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
      </div>

      <div class="mt-4 space-y-3">
        <Button type="button" on:click={downloadXml} disabled={!validation.valid}>Download XML</Button>
        {#if downloadError}
          <p class="text-sm text-error" aria-live="polite">{downloadError}</p>
        {/if}
      </div>
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
