<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import InfoTooltip from '@/components/tools/ui/InfoTooltip.svelte';
  import type { Role } from '@/lib/fin-core/runway';
  import { EMPLOYER_OVERHEAD_DE, formatEURCompact } from '@/lib/fin-core/runway';

  export let roles: Role[];

  const dispatch = createEventDispatcher<{ update: Role[] }>();

  function uid(): string {
    return Math.random().toString(36).slice(2, 9);
  }

  function addRole() {
    dispatch('update', [
      ...roles,
      { id: uid(), title: '', monthlyCost: 0, startMonth: 0, status: 'active' },
    ]);
  }

  function removeRole(id: string) {
    dispatch('update', roles.filter(r => r.id !== id));
  }

  function updateRole(id: string, field: keyof Role, value: string | number) {
    dispatch('update', roles.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
  }

  function toggleStatus(id: string) {
    dispatch('update', roles.map(r =>
      r.id === id
        ? { ...r, status: r.status === 'active' ? 'frozen' : 'active' }
        : r
    ));
  }

  $: totalHeadcountCost = roles
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + r.monthlyCost * (1 + EMPLOYER_OVERHEAD_DE), 0);
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1">
      <h3 class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
        Hiring Plan
      </h3>
      <InfoTooltip>
        <p class="font-semibold text-white mb-1">Headcount-Burn</p>
        Beinhaltet automatisch ca. 20 % Lohnnebenkosten (Arbeitgeberanteil für Kranken-, Renten-, Pflege- und Arbeitslosenversicherung). Das ist der wahre Cash-Out pro Mitarbeiter.
        <p class="mt-2 text-gray-400">❄️ = Stelle geplant, aber in diesem Szenario eingefroren.</p>
      </InfoTooltip>
    </div>
    <button
      type="button"
      onclick={addRole}
      class="inline-flex items-center gap-1 rounded-lg border border-eucalyptus-500/40 px-2.5 py-1 text-xs font-medium text-eucalyptus-700 hover:bg-eucalyptus-500/10 dark:text-eucalyptus-300 transition-colors"
    >
      + Rolle hinzufügen
    </button>
  </div>

  {#if roles.length === 0}
    <p class="text-xs text-text-muted-light dark:text-text-muted-dark italic">
      Noch keine Rollen definiert.
    </p>
  {/if}

  {#each roles as role (role.id)}
    <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-black/10 bg-[var(--bg-primary)] p-2.5 dark:border-white/10"
      class:opacity-50={role.status === 'frozen'}
    >
      <!-- Title -->
      <input
        type="text"
        value={role.title}
        placeholder="z. B. Lead Developer"
        oninput={e => updateRole(role.id, 'title', (e.target as HTMLInputElement).value)}
        class="min-w-0 rounded border border-black/10 bg-transparent px-2 py-1 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
        aria-label="Rollenbezeichnung"
      />

      <!-- Monthly cost -->
      <div class="relative">
        <input
          type="number"
          value={role.monthlyCost}
          min="0"
          step="100"
          oninput={e => updateRole(role.id, 'monthlyCost', Number((e.target as HTMLInputElement).value))}
          class="w-24 rounded border border-black/10 bg-transparent py-1 pl-2 pr-7 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
          aria-label="Bruttolohn monatlich"
        />
        <span class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">€</span>
      </div>

      <!-- Start month -->
      <div class="relative">
        <input
          type="number"
          value={role.startMonth}
          min="0"
          max="35"
          oninput={e => updateRole(role.id, 'startMonth', Number((e.target as HTMLInputElement).value))}
          class="w-14 rounded border border-black/10 bg-transparent py-1 pl-2 pr-6 text-xs text-text-primary-light focus:outline-none focus:ring-1 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
          aria-label="Startmonat (0 = Monat 1)"
          title="Startmonat (0 = Monat 1)"
        />
        <span class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-xs text-text-muted-light dark:text-text-muted-dark">M</span>
      </div>

      <!-- Freeze / Remove -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          onclick={() => toggleStatus(role.id)}
          title={role.status === 'active' ? 'Einfrieren' : 'Aktivieren'}
          class="rounded p-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          aria-pressed={role.status === 'frozen'}
        >
          {role.status === 'frozen' ? '❄️' : '✓'}
        </button>
        <button
          type="button"
          onclick={() => removeRole(role.id)}
          aria-label="Rolle entfernen"
          class="rounded p-1 text-text-muted-light hover:text-red-500 dark:text-text-muted-dark transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  {/each}

  <!-- Total with Lohnnebenkosten note -->
  {#if roles.some(r => r.status === 'active')}
    <div class="flex items-center justify-between rounded-lg bg-eucalyptus-500/8 px-3 py-2">
      <div class="flex items-center gap-1">
        <span class="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Headcount-Burn gesamt
        </span>
        <InfoTooltip>
          <p class="font-semibold text-white mb-1">Inkl. Lohnnebenkosten (AG-Anteil)</p>
          KV + RV + PV + AV = ca. 20 % auf den Bruttolohn. Diese Kosten trägt der Arbeitgeber zusätzlich — sie erscheinen nicht auf dem Gehaltszettel des Mitarbeiters.
        </InfoTooltip>
      </div>
      <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">
        {formatEURCompact(totalHeadcountCost)}/Mo.
      </span>
    </div>
  {/if}
</div>
