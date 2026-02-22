<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { X, BookOpen, Users, Calculator, TrendingDown, HelpCircle } from 'lucide-svelte';

  export let open = false;

  function close() { open = false; }
</script>

<svelte:window on:keydown={e => e.key === 'Escape' && close()} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    on:click={close}
    aria-hidden="true"
  ></div>

  <!-- Slide-over panel -->
  <aside
    class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-hidden border-l border-white/10 bg-gray-950 shadow-2xl"
    transition:fly={{ x: 480, duration: 320, easing: cubicOut }}
    aria-label="Methodik & Guide"
    role="dialog"
    aria-modal="true"
  >
    <!-- Header -->
    <div class="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
      <div class="flex items-center gap-2.5">
        <BookOpen size={18} class="text-eucalyptus-400" aria-hidden="true" />
        <h2 class="text-base font-semibold text-white">Methodik & Guide</h2>
      </div>
      <button
        type="button"
        on:click={close}
        aria-label="Schließen"
        class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/8 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-8">

      <!-- ── A. Quick Start ────────────────────────────────────────────── -->
      <section>
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-eucalyptus-500/20">
            <span class="text-xs font-bold text-eucalyptus-400">A</span>
          </div>
          <h3 class="text-sm font-semibold text-white">Wie nutze ich dieses Tool?</h3>
        </div>
        <div class="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Verwende die <span class="font-medium text-eucalyptus-400">drei Szenario-Tabs</span>
            (Pessimistisch, Realistisch, Optimistisch), um verschiedene Zukunftsverläufe zu simulieren.
            Jedes Szenario ist vollständig unabhängig — mit eigenem Kapital, Hiring Plan und Umsatzmodell.
          </p>
          <ol class="space-y-2 pl-1">
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">1</span>
              <span>Trage dein verfügbares <strong class="text-white">Startkapital</strong> ein (Bankguthaben + zugesagte Mittel, netto).</span>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">2</span>
              <span>Füge im <strong class="text-white">Hiring Plan</strong> alle geplanten Rollen mit Bruttogehalt und Startmonat hinzu. Für pessimistische Szenarien: friere Stellen mit dem ❄️-Icon ein.</span>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">3</span>
              <span>Erfasse unter <strong class="text-white">Betriebskosten</strong> alle monatlich anfallenden Kosten sowie einmalige Setup-Kosten (z. B. Notarkosten, Hardware).</span>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">4</span>
              <span>Setze deinen <strong class="text-white">Initial MRR</strong> und eine realistische MoM-Wachstumsrate. Plane geplante Finanzierungsrunden als Kapitalinjektionen in dem Monat, in dem das Geld fließt.</span>
            </li>
          </ol>
          <p class="rounded-lg border border-eucalyptus-500/25 bg-eucalyptus-500/8 px-3 py-2 text-xs text-eucalyptus-300">
            Alle Daten werden automatisch im Browser gespeichert (localStorage). Es findet keine Serverübertragung statt.
          </p>
        </div>
      </section>

      <div class="border-t border-white/8"></div>

      <!-- ── B. Formulas ───────────────────────────────────────────────── -->
      <section>
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20">
            <Calculator size={13} class="text-blue-400" aria-hidden="true" />
          </div>
          <h3 class="text-sm font-semibold text-white">Die Mathematik dahinter</h3>
        </div>
        <div class="space-y-4">

          <!-- Headcount Burn -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <div class="mb-2 flex items-center gap-2">
              <Users size={13} class="text-gray-400" aria-hidden="true" />
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Headcount-Burn</p>
            </div>
            <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-eucalyptus-300">
              Burn = Bruttogehalt × 1,20
            </code>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              Wir addieren pauschal <strong class="text-gray-200">20 %</strong> Lohnnebenkosten (Arbeitgeberanteil: KV + RV + PV + AV). Der tatsächliche AG-Anteil variiert leicht je nach Steuerklasse und Branche, 20 % ist der konservative Planungswert für DACH.
            </p>
          </div>

          <!-- MRR Growth -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <div class="mb-2 flex items-center gap-2">
              <TrendingDown size={13} class="text-gray-400" aria-hidden="true" />
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">MRR-Wachstum (Compound)</p>
            </div>
            <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-blue-300">
              MRR(m) = MRR₀ × (1 + g)^m
            </code>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              <strong class="text-gray-200">MRR₀</strong> = Initial MRR,
              <strong class="text-gray-200">g</strong> = MoM Growth Rate (dezimal),
              <strong class="text-gray-200">m</strong> = Monat.
              Ein Zinseszins-Effekt: 10 % MoM bedeutet in 12 Monaten ~214 % Wachstum.
            </p>
          </div>

          <!-- Net Burn & Runway -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <div class="mb-2 flex items-center gap-2">
              <Calculator size={13} class="text-gray-400" aria-hidden="true" />
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Net Burn & Runway</p>
            </div>
            <div class="space-y-1.5">
              <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-orange-300">
                Net Burn = (Headcount + OpEx) − MRR
              </code>
              <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-orange-300">
                Runway = Cash-Balance ÷ Net Burn
              </code>
            </div>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              Wenn MRR den gesamten Burn übersteigt, ist der Net Burn negativ (profitabel) — die Runway ist theoretisch unbegrenzt. Das Tool begrenzt die Projektion auf 36 Monate.
            </p>
          </div>

        </div>
      </section>

      <div class="border-t border-white/8"></div>

      <!-- ── C. CFO Glossar ────────────────────────────────────────────── -->
      <section>
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20">
            <HelpCircle size={13} class="text-amber-400" aria-hidden="true" />
          </div>
          <h3 class="text-sm font-semibold text-white">CFO-Glossar</h3>
        </div>
        <dl class="space-y-4">

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-red-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-400"></span>
              Death Valley
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Der Zeitraum, in dem die Runway unter <strong class="text-gray-200">3 Monate</strong> fällt. Fundraising-Prozesse (Due Diligence, Term Sheets, Vertragsverhandlungen) dauern oft 3–6 Monate. Ein Eintritt in das Death Valley bedeutet akute Insolvenzgefahr, da eine Finanzierung in dieser Zeit kaum noch abzuschließen ist.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-orange-400"></span>
              Peak Burn Rate
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Der historische Maximalwert des monatlichen Netto-Cash-Verlusts über den Projektionszeitraum. Eine Schlüsselkennzahl für Investoren: Sie zeigt, wie viel Kapital im schlimmsten Monat verbrannt wird, und bestimmt das Mindest-Fundraising-Volumen.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-eucalyptus-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-eucalyptus-400"></span>
              MRR (Monthly Recurring Revenue)
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Der vorhersehbare, monatlich wiederkehrende Umsatz — typischerweise aus Abonnements oder langfristigen Verträgen. MRR ist die wichtigste Gesundheitskennzahl für SaaS- und Subscription-Businesses, da er die Runway direkt verlängert.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-blue-400"></span>
              Kapitalinjektion
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Einmaliger Geldzufluss in einem definierten Monat — z. B. eine Seed-Runde, ein EXIST-Stipendium oder AWS-Activate-Credits. Im Gegensatz zu MRR ist eine Kapitalinjektion nicht wiederkehrend und verlängert den Runway nur bis zum nächsten Peak-Burn-Monat.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-500"></span>
              Lohnnebenkosten (AG-Anteil)
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Der Arbeitgeberanteil der Sozialversicherungsbeiträge in Deutschland (ca. 20 % des Bruttolohns). Setzt sich zusammen aus: Krankenversicherung (~7,3 %), Rentenversicherung (9,3 %), Pflegeversicherung (~1,8 %) und Arbeitslosenversicherung (1,3 %). Diese Kosten trägt der Arbeitgeber zusätzlich zum Bruttogehalt — sie erscheinen nicht auf dem Gehaltszettel.
            </dd>
          </div>

        </dl>
      </section>

      <!-- Footer note -->
      <div class="rounded-lg border border-white/6 bg-white/3 px-4 py-3 text-xs text-gray-500">
        Dieses Tool ist ein Planungsinstrument. Die Berechnungen basieren auf vereinfachten Modellen und ersetzen keine professionelle Steuer- oder Finanzberatung.
      </div>

    </div>
  </aside>
{/if}
