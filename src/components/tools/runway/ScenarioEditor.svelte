<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import HiringPlanEditor from './HiringPlanEditor.svelte';
  import OpexEditor from './OpexEditor.svelte';
  import RevenueEditor from './RevenueEditor.svelte';
  import type { RunwayScenario, Role, OpexItem, RevenueModel, CapitalInjection } from '@/lib/fin-core/runway';

  export let scenario: RunwayScenario;

  const dispatch = createEventDispatcher<{ update: RunwayScenario }>();

  function setInitialCash(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    dispatch('update', { ...scenario, initialCash: value });
  }

  function handleHeadcountUpdate(e: CustomEvent<Role[]>) {
    dispatch('update', { ...scenario, headcount: e.detail });
  }

  function handleOpexUpdate(e: CustomEvent<OpexItem[]>) {
    dispatch('update', { ...scenario, opex: e.detail });
  }

  function handleRevenueUpdate(e: CustomEvent<RevenueModel>) {
    dispatch('update', { ...scenario, revenue: e.detail });
  }

  function handleInjectionsUpdate(e: CustomEvent<CapitalInjection[]>) {
    dispatch('update', { ...scenario, injections: e.detail });
  }
</script>

<div class="space-y-5">
  <!-- VAT Disclaimer -->
  <div class="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2">
    <span class="mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true">ℹ</span>
    <p class="text-xs text-amber-700 dark:text-amber-300">
      Alle Beträge sind <strong>Netto (ohne USt.)</strong> einzugeben.
    </p>
  </div>

  <!-- Starting Capital -->
  <div class="space-y-1.5">
    <label
      for="initial-cash-{scenario.id}"
      class="block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark"
    >
      Startkapital
    </label>
    <div class="relative">
      <input
        id="initial-cash-{scenario.id}"
        type="number"
        value={scenario.initialCash}
        min="0"
        step="1000"
        oninput={setInitialCash}
        class="w-full rounded-xl border border-black/10 bg-[var(--bg-primary)] py-2.5 pl-4 pr-12 text-base font-semibold text-text-primary-light focus:outline-none focus:ring-2 focus:ring-eucalyptus-500/40 dark:border-white/10 dark:text-text-primary-dark"
        aria-label="Verfügbares Startkapital in EUR"
      />
      <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-text-muted-light dark:text-text-muted-dark">EUR</span>
    </div>
  </div>

  <!-- Divider -->
  <hr class="border-black/10 dark:border-white/10" />

  <!-- Hiring Plan -->
  <HiringPlanEditor
    roles={scenario.headcount}
    on:update={handleHeadcountUpdate}
  />

  <hr class="border-black/10 dark:border-white/10" />

  <!-- OpEx -->
  <OpexEditor
    items={scenario.opex}
    on:update={handleOpexUpdate}
  />

  <hr class="border-black/10 dark:border-white/10" />

  <!-- Revenue & Injections -->
  <RevenueEditor
    revenue={scenario.revenue}
    injections={scenario.injections}
    on:updateRevenue={handleRevenueUpdate}
    on:updateInjections={handleInjectionsUpdate}
  />
</div>
