<script lang="ts">
  import MoneyField from '@/components/tools/ui/MoneyField.svelte';
  import SelectField from '@/components/tools/ui/SelectField.svelte';
  import Toggle from '@/components/tools/ui/Toggle.svelte';
  import { GKV_PROVIDERS, type KvProviderId } from '@/lib/fin-core/salary-tax';

  let {
    grossMonthly      = $bindable(4329),
    taxClass          = $bindable<1|2|3|4|5|6>(1),
    churchMember      = $bindable(false),
    healthInsurance   = $bindable<'gkv'|'pkv'>('gkv'),
    kvProvider        = $bindable<KvProviderId>('orientierungswert'),
    inSachsen         = $bindable(false),
    kinderlosZuschlag = $bindable(false),
    pvChildrenRebates = $bindable<0|1|2|3|4>(0),
    kinderfreibetraege = $bindable(0),
    jahresfreibetragEuro = $bindable(0),
  } = $props();

  // String bindings for legacy SelectField components (which use string values)
  let taxClassStr      = $state(String(taxClass));
  let kvProviderStr    = $state(String(kvProvider));
  let childrenCountStr = $state(String(pvChildrenRebates + (kinderlosZuschlag ? 0 : 1)));

  // Sync string → typed state
  $effect(() => { taxClass = Number(taxClassStr) as 1|2|3|4|5|6; });
  $effect(() => { kvProvider = kvProviderStr as KvProviderId; });
  $effect(() => {
    const count = Number(childrenCountStr);
    if (count === 0) {
      kinderlosZuschlag = true;
      pvChildrenRebates = 0;
    } else {
      kinderlosZuschlag = false;
      pvChildrenRebates = Math.max(0, count - 1) as 0|1|2|3|4;
    }
  });

  // Kinderfreibeträge string
  let kfbStr = $state(String(kinderfreibetraege));
  $effect(() => { kinderfreibetraege = Number(kfbStr) || 0; });

  const TAX_CLASS_OPTIONS = [
    { value: '1', label: 'I — Ledig, geschieden (kein Kind)' },
    { value: '2', label: 'II — Alleinerziehend' },
    { value: '3', label: 'III — Verheiratet (Hauptverdiener)' },
    { value: '4', label: 'IV — Verheiratet (gleiche Einkommen)' },
    { value: '5', label: 'V — Verheiratet (Zweitverdiener)' },
    { value: '6', label: 'VI — Zweites Arbeitsverhältnis' },
  ];

  const KV_PROVIDER_OPTIONS = GKV_PROVIDERS.map(p => ({
    value: p.id,
    label: `${p.name} (${p.zusatzbeitragPercent.toFixed(2).replace('.', ',')} %)`,
  }));

  const CHILDREN_OPTIONS = [
    { value: '0', label: 'Keine Kinder (Kinderlosenzuschlag)' },
    { value: '1', label: '1 Kind' },
    { value: '2', label: '2 Kinder' },
    { value: '3', label: '3 Kinder' },
    { value: '4', label: '4 Kinder' },
    { value: '5', label: '5+ Kinder' },
  ];

  const inputBase =
    'w-full rounded-lg border border-black/10 bg-[var(--bg-elevated)] px-3 py-2.5 text-sm ' +
    'text-text-primary-light dark:text-text-primary-dark dark:border-white/10 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500/40 ' +
    'transition-colors';
</script>

<div class="space-y-5">

  <!-- ── Gehalt ──────────────────────────────────────────────────────────── -->
  <section>
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      Gehalt
    </h3>
    <MoneyField
      id="gross"
      label="Bruttogehalt (monatlich)"
      bind:value={grossMonthly}
      min={0}
      step={50}
    />
  </section>

  <!-- ── Steuer ───────────────────────────────────────────────────────────── -->
  <section>
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      Lohnsteuer
    </h3>
    <div class="space-y-3">
      <SelectField
        id="taxclass"
        label="Steuerklasse"
        bind:value={taxClassStr}
        options={TAX_CLASS_OPTIONS}
      />
      <Toggle
        id="church"
        label="Kirchenmitglied"
        description="Kirchensteuer 8 % (BY/BW) bzw. 9 % (übrige Länder)"
        bind:checked={churchMember}
      />
    </div>
  </section>

  <!-- ── Krankenversicherung ─────────────────────────────────────────────── -->
  <section>
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      Krankenversicherung
    </h3>
    <div class="space-y-3">

      <!-- GKV / PKV toggle -->
      <div class="rounded-lg border border-black/10 bg-[var(--bg-elevated)] p-3 dark:border-white/10">
        <p class="mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
          Versicherungsart
        </p>
        <div class="flex gap-2">
          {#each [['gkv', 'GKV'], ['pkv', 'PKV']] as [val, lbl]}
            <button
              type="button"
              onclick={() => { healthInsurance = val as 'gkv'|'pkv'; }}
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {healthInsurance === val
                ? 'bg-eucalyptus-500/20 text-eucalyptus-300 ring-1 ring-eucalyptus-500/40'
                : 'text-gray-400 hover:text-gray-200'}"
            >
              {lbl}
            </button>
          {/each}
        </div>
      </div>

      {#if healthInsurance === 'gkv'}
        <SelectField
          id="kvprovider"
          label="Krankenkasse"
          bind:value={kvProviderStr}
          options={KV_PROVIDER_OPTIONS}
          tooltip="Kassenindividueller Zusatzbeitragssatz 2026. Quelle: Kassenbekanntmachungen Dez. 2025."
        />
      {:else}
        <p class="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-xs text-gray-400">
          PKV: Sozialabgaben für KV/PV entfallen. Lohnsteuerberechnung bleibt unverändert.
        </p>
      {/if}

    </div>
  </section>

  <!-- ── Pflegeversicherung ──────────────────────────────────────────────── -->
  <section>
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      Pflegeversicherung (§ 55 SGB XI)
    </h3>
    <div class="space-y-3">
      <Toggle
        id="sachsen"
        label="Beschäftigungsort: Sachsen"
        description="Sonderregelung §58 SGB XI: AN +0,5 %, AG −0,5 %"
        bind:checked={inSachsen}
      />
      <SelectField
        id="children"
        label="Kinder (für PV-Beitrag)"
        bind:value={childrenCountStr}
        options={CHILDREN_OPTIONS}
        tooltip="Kinderlosenzu­schlag +0,6 % AN (§ 55 Abs. 3). Ab dem 2. Kind: −0,25 % pro Kind (§ 55 Abs. 3a)."
      />
    </div>
  </section>

  <!-- ── Weitere Angaben ─────────────────────────────────────────────────── -->
  <section>
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      Weitere Angaben (optional)
    </h3>
    <div class="space-y-3">

      <div class="space-y-1.5">
        <label for="kfb" class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Kinderfreibeträge (ZKF)
        </label>
        <input
          id="kfb"
          type="number"
          bind:value={kfbStr}
          min="0"
          max="8"
          step="0.5"
          inputmode="decimal"
          class={inputBase}
        />
        <p class="text-xs text-gray-500">z. B. 2.0 für zwei Kinder (PAP: ZKF)</p>
      </div>

      <div class="space-y-1.5">
        <label for="jfreib" class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Jahresfreibetrag (€)
        </label>
        <input
          id="jfreib"
          type="number"
          bind:value={jahresfreibetragEuro}
          min="0"
          step="100"
          inputmode="decimal"
          class={inputBase}
        />
        <p class="text-xs text-gray-500">Eingetragener Freibetrag auf der Lohnsteuerkarte</p>
      </div>

    </div>
  </section>

</div>
