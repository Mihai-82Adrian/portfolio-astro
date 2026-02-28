<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { X, BookOpen, Calculator, TrendingUp, HelpCircle, ShieldAlert, Lightbulb } from 'lucide-svelte';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let activeSection = $state<'methodik' | 'praxis'>('methodik');

  function close() { open = false; }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    onclick={close}
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
    <div class="shrink-0 border-b border-white/10">
      <div class="flex items-center justify-between px-6 py-4">
        <div class="flex items-center gap-2.5">
          <BookOpen size={18} class="text-eucalyptus-400" aria-hidden="true" />
          <h2 class="text-base font-semibold text-white">Methodik & Guide</h2>
        </div>
        <button
          type="button"
          onclick={close}
          aria-label="Schließen"
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/8 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-eucalyptus-500"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <!-- Tab switcher -->
      <div class="flex gap-1 px-6 pb-3">
        <button
          type="button"
          onclick={() => (activeSection = 'methodik')}
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
            {activeSection === 'methodik'
              ? 'bg-eucalyptus-500/20 text-eucalyptus-300'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}"
        >
          <Calculator size={12} aria-hidden="true" />
          Formeln & Methodik
        </button>
        <button
          type="button"
          onclick={() => (activeSection = 'praxis')}
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
            {activeSection === 'praxis'
              ? 'bg-amber-500/20 text-amber-300'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}"
        >
          <Lightbulb size={12} aria-hidden="true" />
          Praxis-Beispiel
        </button>
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-8">

{#if activeSection === 'methodik'}
      <!-- ── A. Quick Start ──────────────────────────────────────────────── -->
      <section>
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-eucalyptus-500/20">
            <span class="text-xs font-bold text-eucalyptus-400">A</span>
          </div>
          <h3 class="text-sm font-semibold text-white">Wie nutze ich dieses Tool?</h3>
        </div>
        <div class="space-y-3 text-sm leading-relaxed text-gray-300">
          <p>
            Das Tool bewertet eine einzelne Investition anhand von
            <span class="font-medium text-eucalyptus-400">Rendite-, Risiko- und Steuermetriken</span>.
            Alle Berechnungen erfolgen lokal im Browser — kein Server, keine Cloud.
          </p>
          <ol class="space-y-2 pl-1">
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">1</span>
              <span>Trage unter <strong class="text-white">Eingabe</strong> den Investitionsbetrag (z. B. Kaufpreis einer Anlage) und die Diskontierungsrate für die NPV-Berechnung ein.</span>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">2</span>
              <span>Füge im <strong class="text-white">Cashflow-Builder</strong> alle erwarteten jährlichen Rückflüsse hinzu. Positive Werte = Einnahmen (Dividenden, Miete, Verkaufserlös), negative Werte = Zusatzinvestitionen (Renovierung, Nachkauf).</span>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">3</span>
              <span>Wechsle zu <strong class="text-white">Kennzahlen</strong> für ROI, CAGR, IRR, NPV und alle Risikometrik­en auf einen Blick.</span>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">4</span>
              <span>Starte unter <strong class="text-white">Monte Carlo</strong> die Simulation (1.000 Pfade) — sie zeigt, wie stark Unsicherheit das Ergebnis verändern kann.</span>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/15 text-xs font-bold text-eucalyptus-400">5</span>
              <span>Konfiguriere unter <strong class="text-white">Steuer</strong> ob es sich um einen Fonds handelt und trage deinen Freistellungsauftrag ein — das Tool berechnet die Abgeltungsteuer automatisch.</span>
            </li>
          </ol>
          <p class="rounded-lg border border-eucalyptus-500/25 bg-eucalyptus-500/8 px-3 py-2 text-xs text-eucalyptus-300">
            Daten werden automatisch im Browser-Speicher (localStorage) gesichert. Es findet kein Datentransfer statt. Die optionale KI-Analyse ist auf 1× pro Woche limitiert.
          </p>
        </div>
      </section>

      <div class="border-t border-white/8"></div>

      <!-- ── B. Formeln ─────────────────────────────────────────────────── -->
      <section>
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20">
            <Calculator size={13} class="text-blue-400" aria-hidden="true" />
          </div>
          <h3 class="text-sm font-semibold text-white">Die Mathematik dahinter</h3>
        </div>
        <div class="space-y-4">

          <!-- ROI -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">ROI — Return on Investment</p>
            <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-eucalyptus-300">
              ROI = (Σ Cashflows − Investition) / Investition × 100
            </code>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              Die einfachste Renditekennzahl: Wie viel Prozent des eingesetzten Kapitals hast du netto zurückerhalten? Berücksichtigt <strong class="text-gray-200">keine Zeitwerteffekte</strong> — dafür ist der NPV/IRR besser geeignet.
            </p>
          </div>

          <!-- CAGR -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">CAGR — Compound Annual Growth Rate</p>
            <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-blue-300">
              CAGR = (Exitwert / Investition)^(1/Jahre) − 1
            </code>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              Die annualisierte Wachstumsrate: Bei welchem konstanten Jahreszins hätte dein Kapital den gleichen Gesamtrückfluss erzielt? Vergleichbar mit dem Zinseszins-Ansatz.
            </p>
            <p class="mt-2 rounded-md border border-amber-500/20 bg-amber-500/8 px-2.5 py-1.5 text-xs text-amber-300">
              <strong class="text-amber-200">Einschränkung:</strong> CAGR ist nur bei einem einzelnen Exit-Cashflow mathematisch korrekt.
              Bei mehreren Cashflows auf verschiedene Jahre wird <strong class="text-amber-200">—</strong> angezeigt —
              verwende stattdessen den <strong class="text-amber-200">IRR</strong>, der Zeitwerteffekte korrekt berücksichtigt.
            </p>
          </div>

          <!-- IRR -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">IRR — Internal Rate of Return (Interner Zinsfuß)</p>
            <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-amber-300">
              NPV(IRR) = 0  →  −I + Σ [CF_t / (1+IRR)^t] = 0
            </code>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              Der Diskontierungssatz, bei dem der Kapitalwert null wird. Berechnung per Newton-Raphson-Verfahren (Startwert 10 %, Toleranz 10⁻⁶). Wenn IRR &gt; deine Mindestrendite (Diskontierungsrate), ist die Investition rentabel.
            </p>
            <p class="mt-2 rounded-md border border-red-500/20 bg-red-500/8 px-2.5 py-1.5 text-xs text-red-300">
              <strong class="text-red-200">Achtung:</strong> Bei unkonventionellen Cashflows (z. B. hohe Nachschusspflichten am Ende der Laufzeit) kann es <strong class="text-red-200">mehrere mathematisch gültige IRR-Werte</strong> geben. In diesem Fall ist der NPV die verlässlichere Entscheidungsgrundlage.
            </p>
          </div>

          <!-- NPV -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">NPV — Net Present Value (Kapitalwert)</p>
            <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-eucalyptus-300">
              NPV = −I + Σ [CF_t / (1 + r)^t]
            </code>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              Der heutige Wert aller zukünftigen Cashflows minus der Anfangsinvestition.
              <strong class="text-gray-200">NPV &gt; 0</strong> → Investition schafft Wert (Diskontierungsrate = deine Opportunitätskosten).
              <strong class="text-gray-200">NPV &lt; 0</strong> → Alternativanlage wäre besser.
            </p>
          </div>

          <!-- Sharpe & Sortino -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Sharpe & Sortino Ratio</p>
            <div class="space-y-1.5">
              <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-purple-300">
                Sharpe = (μ − r_f) / σ
              </code>
              <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-purple-300">
                Sortino = (μ − r_f) / σ_down
              </code>
            </div>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              <strong class="text-gray-200">μ</strong> = durchschn. jährl. Rendite,
              <strong class="text-gray-200">r_f</strong> = risikoloser Zinssatz (2,5 % — dt. Bundesanleihe 10J.),
              <strong class="text-gray-200">σ</strong> = Gesamtvolatilität,
              <strong class="text-gray-200">σ_down</strong> = nur Abwärtsvolatilität.
              Sortino bestraft nur negative Schwankungen — fairer bei asymmetrischen Renditen. Faustregel: Sharpe &gt; 1 = gut, &gt; 2 = sehr gut.
            </p>
          </div>

          <!-- VaR -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">VaR — Value at Risk (parametrisch)</p>
            <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-red-300">
              VaR 95% = (μ − 1,645 × σ) × Investition
            </code>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              Das 5. Perzentil der Renditeverteilung — der maximale Verlust, der mit 95 % Wahrscheinlichkeit nicht überschritten wird.
              Ein negativer Wert bedeutet Verlust in EUR. Basiert auf der Normalverteilungs-Annahme. Bei stark asymmetrischen Cashflows ist der parametrische VaR eine Annäherung — die Monte-Carlo-Simulation liefert ein robusteres Bild.
            </p>
          </div>

          <!-- Monte Carlo -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Monte-Carlo-Simulation</p>
            <code class="block rounded-md bg-gray-900/80 px-3 py-2 font-mono text-sm text-green-300">
              V_t = V_{'{'}t-1{'}'} × exp(μ − σ²/2 + σ·ε)
            </code>
            <p class="mt-2 text-xs leading-relaxed text-gray-400">
              1.000 Pfade mit log-normalem Wachstum (Box-Muller-Transformation). Der Driftterm
              <strong class="text-gray-200">μ − σ²/2</strong> ist die Itô-Korrektur (Log-Normal-Bias-Korrektur): ohne diesen Term würde der Erwartungswert der Simulation den gewünschten Drift überschätzen.
              <strong class="text-gray-200">ε ~ N(0,1)</strong> ist der Zufallsschock.
              <strong class="text-gray-200">μ</strong> und <strong class="text-gray-200">σ</strong> werden aus den jährlichen Wertveränderungen
              (inkl. Cashflow-Effekte) geschätzt — die Simulation modelliert somit die Wertentwicklung des Portfolios
              unter Berücksichtigung der beobachteten Volatilität.
              Ergebnis: P5 (Worst Case), P50 (Median), P95 (Best Case) pro Jahr.
            </p>
            <div class="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2">
              <p class="text-xs leading-relaxed text-amber-300/90">
                <strong>Hinweis zur Interpretation:</strong> ROI/IRR/NPV messen den <em>Cash-on-Cash-Return</em> —
                wieviel Geld Sie relativ zur Investition zurückerhalten.
                Die Monte-Carlo-Simulation modelliert dagegen die <em>Portfoliowertentwicklung</em> —
                wie sich der Gesamtwert Ihrer Anlage unter Unsicherheit entwickeln könnte.
                Beide Perspektiven ergänzen sich, können aber bei negativem ROI dennoch eine hohe Gewinnwahrscheinlichkeit zeigen,
                wenn der Portfoliowert die Anfangsinvestition übersteigt.
              </p>
            </div>
          </div>

        </div>
      </section>

      <div class="border-t border-white/8"></div>

      <!-- ── C. Interpretationsguide ─────────────────────────────────────── -->
      <section>
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20">
            <TrendingUp size={13} class="text-amber-400" aria-hidden="true" />
          </div>
          <h3 class="text-sm font-semibold text-white">Wie interpretiere ich die Ergebnisse?</h3>
        </div>
        <div class="space-y-4">

          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold text-eucalyptus-400">ROI &amp; CAGR — Renditeeinschätzung</p>
            <ul class="space-y-1.5 text-xs leading-relaxed text-gray-400">
              <li><span class="text-eucalyptus-400 font-medium">CAGR &gt; 7 %:</span> Schlägt langfristig den breiten Aktienmarkt (historischer S&amp;P 500-Schnitt ~7 % real)</li>
              <li><span class="text-eucalyptus-400 font-medium">CAGR 3–7 %:</span> Solide, entspricht etwa Immobilien oder Anleihen-Mix</li>
              <li><span class="text-red-400 font-medium">CAGR &lt; 2,5 %:</span> Schlechter als der risikolose Zins (Bundesanleihe) — fraglich ob das Risiko sich lohnt</li>
            </ul>
          </div>

          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold text-blue-400">NPV — Entscheidungsregel</p>
            <ul class="space-y-1.5 text-xs leading-relaxed text-gray-400">
              <li><span class="text-eucalyptus-400 font-medium">NPV &gt; 0:</span> Investition schafft Wert über die geforderte Mindestrendite hinaus — grundsätzlich empfehlenswert</li>
              <li><span class="text-gray-300 font-medium">NPV = 0:</span> Investition erzielt exakt die Diskontierungsrate — Gleichstand mit der Alternativanlage</li>
              <li><span class="text-red-400 font-medium">NPV &lt; 0:</span> Eine Alternativanlage mit der Diskontierungsrate wäre besser</li>
            </ul>
          </div>

          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold text-purple-400">Sharpe Ratio — Risiko-adjustierte Rendite</p>
            <ul class="space-y-1.5 text-xs leading-relaxed text-gray-400">
              <li><span class="text-eucalyptus-400 font-medium">&gt; 2,0:</span> Ausgezeichnet — sehr effizienter Einsatz des Risikokapitals</li>
              <li><span class="text-eucalyptus-400 font-medium">1,0 – 2,0:</span> Gut — übliche Range für aktiv gemanagte Portfolios</li>
              <li><span class="text-amber-400 font-medium">0,5 – 1,0:</span> Akzeptabel — Investition trägt Risiko, das gerade noch entlohnt wird</li>
              <li><span class="text-red-400 font-medium">&lt; 0,5:</span> Schwach — Risiko wird nicht ausreichend kompensiert</li>
            </ul>
          </div>

          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <p class="mb-2 text-xs font-semibold text-amber-400">Monte Carlo — Gewinnwahrscheinlichkeit</p>
            <ul class="space-y-1.5 text-xs leading-relaxed text-gray-400">
              <li><span class="text-eucalyptus-400 font-medium">&gt; 70 %:</span> Robuste Investition — die Mehrzahl der simulierten Szenarien endet im Gewinn</li>
              <li><span class="text-amber-400 font-medium">50 – 70 %:</span> Leicht positiver Erwartungswert, aber erhebliche Unsicherheit</li>
              <li><span class="text-red-400 font-medium">&lt; 50 %:</span> Mehr als die Hälfte der Pfade endet im Verlust — hohes spekulatives Risiko</li>
            </ul>
            <p class="mt-2 text-xs text-gray-500">
              Hinweis: Hohe P95-Werte bei gleichzeitig negativem P50 zeigen eine stark rechts-schiefe Verteilung — typisch für volatile Anlagen. Der Erwartungswert kann positiv sein, obwohl die meisten Pfade negativ enden.
            </p>
          </div>

        </div>
      </section>

      <div class="border-t border-white/8"></div>

      <!-- ── D. Glossar ────────────────────────────────────────────────────── -->
      <section>
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-gray-500/20">
            <HelpCircle size={13} class="text-gray-400" aria-hidden="true" />
          </div>
          <h3 class="text-sm font-semibold text-white">Glossar</h3>
        </div>
        <dl class="space-y-4">

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-eucalyptus-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-eucalyptus-400"></span>
              Abgeltungsteuer (Abgeltungssteuer)
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Pauschale Kapitalertragsteuer von <strong class="text-gray-200">25 % zzgl. 5,5 % Solidaritätszuschlag auf die Steuer (= 1,375 %) → gesamt 26,375 %</strong> auf Zinsen, Dividenden und Kursgewinne. Wird an der Quelle einbehalten.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-orange-400"></span>
              Teilfreistellung (§ 20 InvStG)
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Für <strong class="text-gray-200">Aktienfonds</strong> (Aktienanteil ≥ 51 %) sind <strong class="text-gray-200">30 %</strong> des Gewinns steuerfrei. Gilt für in Deutschland registrierte Investmentfonds nach dem Investmentsteuergesetz 2018.
              <strong class="text-gray-200">Im Tool zuschaltbar für Aktienfonds (30 %).</strong>
              Mischfonds (15 %) oder Immobilienfonds (60 %) sind aktuell nicht als direkter Toggle modelliert.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-yellow-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400"></span>
              Kirchensteuer
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              <strong class="text-gray-200">8 %</strong> (Bayern, Baden-Württemberg) oder <strong class="text-gray-200">9 %</strong> (übrige Bundesländer) auf den Abgeltungsteuerbetrag. Kirchensteuerpflichtige Anleger müssen dies zusätzlich zur Abgeltungsteuer abführen. Hier als Vereinfachung direkt auf den Steuerbetrag berechnet.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-blue-400"></span>
              Freistellungsauftrag (Sparerpauschbetrag)
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              <strong class="text-gray-200">1.000 € / Jahr</strong> für Einzelpersonen, <strong class="text-gray-200">2.000 €</strong> für Verheiratete (§ 20 Abs. 9 EStG). Kapitalerträge bis zu diesem Betrag sind steuerfrei. Der Betrag kann auf mehrere Banken aufgeteilt werden.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"></span>
              Vorabpauschale (§ 18 InvStG)
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Jährliche fiktive Besteuerung für <strong class="text-gray-200">thesaurierende Fonds</strong>, die keine Ausschüttungen vornehmen.
              Basisertrag = Fondswert (1.1.) × Basiszins (2026: 3,20 %) × 0,7 <strong class="text-gray-200">(= 2,24 %)</strong>.
              Die Vorabpauschale ist <strong class="text-gray-200">begrenzt auf die tatsächliche Wertsteigerung</strong>
              (min-Funktion: nie höher als der reale Kursanstieg des Jahres). Verhindert eine vollständige Steuerstundung bis zum Verkauf.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-purple-400"></span>
              TER — Total Expense Ratio
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Die jährlichen Gesamtkosten eines Fonds als Prozentsatz des verwalteten Vermögens. Enthält Managementgebühr, Verwaltungsgebühr und sonstige Fondskosten. ETFs: typisch 0,05–0,5 %, aktive Fonds: 1–2 %. Wird automatisch aus der Vorabpauschale herausgerechnet.
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-red-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-400"></span>
              Max. Drawdown
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Der maximale kumulierte Wertverlust vom Hochpunkt bis zum nachfolgenden Tiefpunkt. Ein Drawdown von −40 % bedeutet: Das Investment hat nach seinem Peak 40 % seines Wertes verloren. Wichtige Risikokennzahl für psychologische Belastbarkeit — kannst du diesen Verlust emotional aushalten?
            </dd>
          </div>

          <div>
            <dt class="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-500"></span>
              Risikoloser Zinssatz (r_f)
            </dt>
            <dd class="mt-1 text-xs leading-relaxed text-gray-400">
              Im Tool verwendet: <strong class="text-gray-200">2,5 %</strong> p.a. (dt. Bundesanleihe 10 Jahre, ~aktueller Marktstand). Dient als Benchmark für Sharpe/Sortino: Jede Rendite unter diesem Wert rechtfertigt das eingegangene Risiko nicht.
            </dd>
          </div>

        </dl>
      </section>

      <!-- ── E. Einschränkungen ──────────────────────────────────────────── -->
      <section>
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/20">
            <ShieldAlert size={13} class="text-red-400" aria-hidden="true" />
          </div>
          <h3 class="text-sm font-semibold text-white">Modellgrenzen & Hinweise</h3>
        </div>
        <ul class="space-y-2 text-xs leading-relaxed text-gray-400">
          <li class="flex gap-2">
            <span class="mt-0.5 text-amber-400">▸</span>
            <span>Das Risikomodell basiert auf der <strong class="text-gray-200">historischen Volatilität</strong> der eingegebenen Cashflows. Bei wenigen Datenpunkten (&lt; 4 Jahre) sind Sharpe/VaR-Werte wenig aussagekräftig.</span>
          </li>
          <li class="flex gap-2">
            <span class="mt-0.5 text-amber-400">▸</span>
            <span>Monte-Carlo nimmt <strong class="text-gray-200">log-normale Renditen</strong> an — Extremereignisse (Fat Tails, Krisen) werden damit tendenziell untergewichtet.</span>
          </li>
          <li class="flex gap-2">
            <span class="mt-0.5 text-amber-400">▸</span>
            <span>Die <strong class="text-gray-200">Steuerberechnung</strong> ist vereinfacht: Keine Verlustverrechnung über mehrere Jahre. Kirchensteuer und Teilfreistellung (30 % für Aktienfonds) sind optional konfigurierbar, ersetzen aber keine individuelle Steuerberatung.</span>
          </li>
          <li class="flex gap-2">
            <span class="mt-0.5 text-amber-400">▸</span>
            <span>Die <strong class="text-gray-200">Vorabpauschale</strong> wird als Worst-Case-Schätzung berechnet: Es wird ein positives Jahresergebnis angenommen. In Jahren mit negativer oder keiner Wertsteigerung fällt die Vorabpauschale geringer oder gar nicht an.</span>
          </li>
          <li class="flex gap-2">
            <span class="mt-0.5 text-amber-400">▸</span>
            <span><strong class="text-gray-200">CAGR</strong> wird nur bei einem einzelnen Exit-Cashflow berechnet — mathematisch korrekt für einfache Einmalanlage mit Verkauf. Bei mehreren Cashflows ist IRR die richtige Kennzahl.</span>
          </li>
        </ul>
      </section>

      <!-- Footer -->
      <div class="rounded-lg border border-white/6 bg-white/3 px-4 py-3 text-xs text-gray-500">
        Dieses Tool ist ein Planungsinstrument. Die Berechnungen basieren auf vereinfachten Modellen und ersetzen keine professionelle Steuer- oder Anlageberatung. Vergangene Renditen sind keine Garantie für zukünftige Ergebnisse.
      </div>

{:else}
      <!-- ── Praxis-Beispiel ────────────────────────────────────────────────── -->
      <section>
        <div class="mb-4 flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20">
            <Lightbulb size={13} class="text-amber-400" aria-hidden="true" />
          </div>
          <h3 class="text-sm font-semibold text-white">Praxis-Beispiel: Investition von privatem Vermögen</h3>
        </div>

        <!-- Scenario intro -->
        <div class="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-amber-400 mb-2">Der Fall</p>
          <p class="text-sm leading-relaxed text-gray-300">
            Du bist erfolgreicher Unternehmer und hast dir <strong class="text-white">100.000 € als Gewinnausschüttung privat auszahlen lassen</strong>.
            Du überlegst, dieses Geld privat für 5 Jahre in einen globalen Aktien-ETF (thesaurierend) zu investieren,
            um die Inflation zu schlagen. Dein Bankberater rechnet mit rund <strong class="text-white">6–7 % Rendite p.a.</strong> —
            aber du willst das Risiko und die exakte Steuerlast (nach DACH-Regeln für Privatpersonen) selbst nachrechnen.
          </p>
        </div>

        <!-- Steps -->
        <div class="space-y-4">

          <!-- Step 1 -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <div class="mb-3 flex items-center gap-2.5">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/20 text-xs font-bold text-eucalyptus-400">1</span>
              <p class="text-sm font-semibold text-white">Die Eingabe</p>
            </div>
            <ul class="space-y-2 text-xs leading-relaxed text-gray-400">
              <li class="flex gap-2">
                <span class="text-eucalyptus-400 mt-0.5">▸</span>
                <span><strong class="text-gray-200">Investitionsbetrag:</strong> 100.000 € · <strong class="text-gray-200">Diskontierungsrate:</strong> 8 %</span>
              </li>
              <li class="flex gap-2">
                <span class="text-eucalyptus-400 mt-0.5">▸</span>
                <span>
                  <strong class="text-gray-200">Cashflow:</strong> Trage <strong class="text-white">+135.000 € in Jahr 5</strong> ein
                  (konservativer Exit-Wert, entspricht ca. 6,2 % Wachstum p.a. nach CAGR-Formel: (135k/100k)^(1/5)−1).
                  Ein einzelner Cashflow — damit berechnet das Tool den <strong class="text-white">CAGR direkt</strong>.
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-eucalyptus-400 mt-0.5">▸</span>
                <span>
                  <strong class="text-gray-200">Steuer-Setup:</strong> Fonds → Thesaurierend aktivieren (TER 0,20 %) →
                  <strong class="text-white">Aktienfonds (30 % Teilfreistellung)</strong> aktivieren →
                  Freistellungsauftrag 1.000 €
                </span>
              </li>
            </ul>
          </div>

          <!-- Step 2 -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <div class="mb-3 flex items-center gap-2.5">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">2</span>
              <p class="text-sm font-semibold text-white">Die Erkenntnis (Kennzahlen-Tab)</p>
            </div>
            <ul class="space-y-2 text-xs leading-relaxed text-gray-400">
              <li class="flex gap-2">
                <span class="text-blue-400 mt-0.5">▸</span>
                <span>
                  <strong class="text-gray-200">CAGR ≈ 6,2 %</strong> — bestätigt die Bankberater-Aussage grob.
                  Der <strong class="text-gray-200">NPV</strong> (bei 8 % Diskontierungsrate) zeigt dir,
                  ob das Investment eine Opportunitätskosten-Hurdle schlägt.
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-blue-400 mt-0.5">▸</span>
                <span>
                  Der <strong class="text-gray-200">VaR 95 %</strong> ist die ungeschminkte Wahrheit:
                  Bei historischer Volatilität eines globalen ETFs (σ ≈ 15–20 %)
                  könntest du in einem einzelnen schlechten Jahr
                  <strong class="text-white">mehrere Tausend Euro verlieren</strong>.
                  Als Privatanleger musst du diese Zahl nüchtern einkalkulieren, bevor du unterschreibst.
                </span>
              </li>
            </ul>
          </div>

          <!-- Step 3 -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <div class="mb-3 flex items-center gap-2.5">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">3</span>
              <p class="text-sm font-semibold text-white">Der Stress-Test (Monte-Carlo-Tab)</p>
            </div>
            <ul class="space-y-2 text-xs leading-relaxed text-gray-400">
              <li class="flex gap-2">
                <span class="text-purple-400 mt-0.5">▸</span>
                <span>
                  Klicke auf <strong class="text-gray-200">Simulation starten</strong>.
                  Die 1.000 Pfade zeigen nicht nur das P50-Szenario (Median),
                  sondern auch den <strong class="text-white">P5-Worst-Case</strong>.
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-purple-400 mt-0.5">▸</span>
                <span>
                  Wenn die <strong class="text-gray-200">P5-Linie nach 5 Jahren unter 100.000 €</strong> liegt:
                  Es gibt ein reales statistisches Risiko, mit Verlust auszusteigen.
                  Das ist die Information, die dein Bankberater dir nicht zeigt.
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-purple-400 mt-0.5">▸</span>
                <span>
                  Die <strong class="text-gray-200">Gewinnwahrscheinlichkeit</strong> (% der Pfade mit Endwert &gt; 100.000 €)
                  ist deine ehrlichste Risikokennzahl für dieses Szenario.
                </span>
              </li>
            </ul>
          </div>

          <!-- Step 4 -->
          <div class="rounded-xl border border-white/8 bg-white/4 p-4">
            <div class="mb-3 flex items-center gap-2.5">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">4</span>
              <p class="text-sm font-semibold text-white">Die harte Realität (Steuer-Tab)</p>
            </div>
            <ul class="space-y-2 text-xs leading-relaxed text-gray-400">
              <li class="flex gap-2">
                <span class="text-red-400 mt-0.5">▸</span>
                <span>
                  Von deinen <strong class="text-gray-200">35.000 € Bruttogewinn</strong> werden dank der
                  <strong class="text-white">Teilfreistellung</strong> nur 70 % (24.500 €) besteuert —
                  minus Freistellungsauftrag (1.000 €) = 23.500 € steuerpflichtiger Gewinn.
                  Das Tool rechnet das automatisch durch.
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-red-400 mt-0.5">▸</span>
                <span>
                  Die <strong class="text-gray-200">Vorabpauschale</strong> (jährliche Schätzsteuer für Thesaurierer)
                  zeigt dir, wie viel Cash du <strong class="text-white">jedes Jahr im Januar</strong> auf dem Girokonto
                  vorhalten musst — obwohl du nichts ausgezahlt bekommst.
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-eucalyptus-400 mt-0.5">▸</span>
                <span>
                  Ganz unten: <strong class="text-white">Nettogewinn nach Steuern</strong> —
                  die einzige Zahl, die für deine Entscheidung zählt.
                </span>
              </li>
            </ul>
          </div>

          <!-- Step 5 — AI -->
          <div class="rounded-xl border border-eucalyptus-500/20 bg-eucalyptus-500/8 p-4">
            <div class="mb-3 flex items-center gap-2.5">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-eucalyptus-500/20 text-xs font-bold text-eucalyptus-400">5</span>
              <p class="text-sm font-semibold text-white">Das Management-Summary (KI-Analyse)</p>
            </div>
            <p class="text-xs leading-relaxed text-gray-400">
              Nutze nach der Simulation die <strong class="text-eucalyptus-300">KI-Analyse</strong>,
              um alle Ergebnisse wie von einem externen CFO zusammenfassen zu lassen —
              Stärken, Risiken und eine direkte Handlungsempfehlung.
              Ideal, um das Investment intern zu kommunizieren oder mit deinem Steuerberater zu besprechen.
            </p>
          </div>

        </div>
      </section>

      <!-- Praxis Footer -->
      <div class="rounded-lg border border-white/6 bg-white/3 px-4 py-3 text-xs text-gray-500">
        Dieses Beispiel dient der Illustration. Alle Zahlen sind Näherungswerte. Für verbindliche Steuer- und Investitionsentscheidungen konsultiere einen Steuerberater und Finanzberater.
      </div>

{/if}

    </div>
  </aside>
{/if}
