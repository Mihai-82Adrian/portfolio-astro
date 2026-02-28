# Investment Analytics — Living Documentation

> **Last verified:** 2026-02-28 (post-fix audit)
> **Status:** Commit series on `feature/cashflow-forecasting` — bug-fix + DACH feature upgrade applied
> **Route:** `/tools/investment-analytics`
> **Hydration:** `client:visible` (InvestmentApp.svelte)

---

## 1. Overview

Investment Analytics is the most complex tool in the Fin-Tools Hub. It evaluates a single investment across four dimensions:

| Dimension        | What is computed                                              |
|------------------|---------------------------------------------------------------|
| **Return**       | ROI, CAGR, IRR (Newton-Raphson), NPV, Payback Year           |
| **Risk**         | Sharpe, Sortino, Max Drawdown, Volatility, VaR 95 % / 99 %  |
| **Monte Carlo**  | 1,000 lognormal paths → P5 / P50 / P95 per year              |
| **DACH Tax**     | Abgeltungsteuer 26.375 %, Freistellungsauftrag, Vorabpauschale, Teilfreistellung, Kirchensteuer |

All calculations run **entirely in the browser** (no data transmission). The optional AI analysis calls a Cloudflare Worker that proxies OpenAI o4-mini and is rate-limited to **1 call per IP per 7 days** in production.

---

## 2. File Structure

```
src/
├── lib/investment/
│   ├── types.ts           — interfaces, constants, helpers
│   ├── analytics.ts       — pure calculation functions (no side effects)
│   └── pdfExport.ts       — lazy pdfmake, A4 report generator
│
├── components/tools/investment-analytics/
│   ├── InvestmentApp.svelte     — root orchestrator (state, effects, handlers)
│   ├── InputPanel.svelte        — investment params + cashflow builder + tax settings
│   ├── MetricsDashboard.svelte  — return & risk KPI grids
│   ├── MonteCarloPanel.svelte   — run button + chart with MC overlay + results
│   ├── TaxPanel.svelte          — Abgeltungsteuer breakdown + Vorabpauschale
│   ├── InvestmentChart.svelte   — Chart.js 4.x line chart + break-even plugin
│   └── MethodologyModal.svelte  — slide-over guide (5 sections, Svelte 5 syntax)
│
├── pages/tools/investment-analytics/
│   └── index.astro              — page shell, breadcrumb JSON-LD, privacy note
│
functions/api/
└── investment-analysis.ts       — Cloudflare Pages Function (POST handler)
```

### localStorage Key
```
tools.investment-analytics.state.v1
```
Stores `{ input, aiNarrative, lastAiAt }`. Restored on `onMount`; writes gated by `if (!restored) return` to prevent overwriting on initial mount.

---

## 3. Data Model (`src/lib/investment/types.ts`)

### Constants (verified from source)

| Constant                  | Value    | Source                             |
|---------------------------|----------|------------------------------------|
| `RISK_FREE_RATE`          | `0.025`  | Deutsche Bundesanleihe 10Y ~2.5 %  |
| `TAX_RATE`                | `0.26375`| 25 % Abgeltungsteuer + 1.375 % Soli|
| `FREISTELLUNGSAUFTRAG`    | `1000`   | EUR/year per person (§ 20 Abs. 9 EStG) |
| `VORABPAUSCHALE_RATE_2026`| `0.0224` | Basiszins × 0.7 (2026 rate)        |
| `WEEKLY_COOLDOWN_MS`      | `604800000` | 7 × 24 × 60 × 60 × 1000 ms     |

### Default Input (verified from source)
- `initialInvestment`: 10,000 EUR
- `cashFlows`: 5 entries, years 1–5, 2,500 EUR each
- `discountRate`: 8 %
- `personalFreibetrag`: 1,000 EUR
- `isFund`: false, `isAccumulating`: false, `ter`: 0.2 %
- `teilfreistellung`: false, `kirchensteuer`: 0

### Interfaces

```
InvestmentInput   → initialInvestment, cashFlows[], discountRate,
                    isFund, isAccumulating, ter, personalFreibetrag,
                    teilfreistellung, kirchensteuer (0|8|9)
ReturnMetrics     → roi, cagr (number | null), irr | null, npv, paybackYear | null
                    NOTE: cagr is null when cashFlows.length > 1 (use IRR instead)
RiskMetrics       → annualizedReturn, annualizedVolatility, sharpeRatio,
                    sortinoRatio, maxDrawdown, var95, var99
MonteCarloResult  → paths[][], percentile5[], percentile50[], percentile95[],
                    probPositive, expectedFinalValue
TaxResult         → grossGain, taxableGain, taxAmount, netGain,
                    vorabpauschale?, effectiveTaxRate,
                    teilfreistellungReduction, kirchensteuerAmount
InvestmentState   → input, aiNarrative, lastAiAt
```

---

## 4. Analytics Engine (`src/lib/investment/analytics.ts`)

All functions are pure (no side effects, no imports beyond types).

### Return Metrics

| Function           | Formula                                                  |
|--------------------|----------------------------------------------------------|
| `calcROI`          | `(ΣCF − I) / I × 100`                                   |
| `calcCAGR`         | `(exitValue / I)^(1/years) − 1`, expressed in %         |
| `calcNPV`          | `−I + Σ[CF_t / (1 + r)^t]` where `r = discountRate/100` |
| `calcIRR`          | Newton-Raphson, seed 0.1, tolerance 1e-6, max 100 iter  |
| `calcPayback`      | First year where cumulative CF ≥ initial investment      |

**CAGR behavior (updated):**
- Returns a number only when `cashFlows.length === 1` (single exit value — mathematically valid)
- Returns `null` for multiple cashflows — displayed as `—` with tooltip "Siehe IRR"
- The MetricsDashboard and PDF handle `null` gracefully

**IRR edge cases:**
- Returns `null` if derivative < 1e-12 (flat NPV curve)
- Returns `null` if rate diverges below −0.9999
- Displayed as `—` in the UI

### Risk Metrics (`calcRiskMetrics`)

Builds an annual return series from the cashflow sequence, then:

- **μ** = arithmetic mean of annual returns
- **σ** = sample standard deviation (N−1 denominator)
- **Sharpe** = `(μ − r_f) / σ`
- **Sortino** = `(μ − r_f) / σ_down` where σ_down = downside deviation vs r_f
- **Max Drawdown** = computed from cumulative value series (peak-to-trough)
- **VaR 95 %** = `(μ − 1.645σ) × I` — 5th percentile of return distribution (negative = loss in EUR)
- **VaR 99 %** = `(μ − 2.3263σ) × I`

> **Known limitation:** With < 4 data points, Sharpe/VaR values are statistically weak. This is documented in MethodologyModal section E.

### Monte Carlo (`runMonteCarlo`)

- **Algorithm:** lognormal GBM with scheduled cashflows
- **Paths:** 1,000 (default, configurable via `nSims` param)
- **Price process:** `V_t = V_{t-1} × exp(μ − σ²/2 + σ·ε) + CF_t`
  - Drift correction `μ − σ²/2` prevents Jensen's inequality bias
  - `ε ~ N(0,1)` via Box-Muller transform (`gaussianRandom`)
- **Output per year:** P5, P50, P95 percentiles
- **Summary stats:** `probPositive` (% paths ending above initial), `expectedFinalValue` (mean of all paths at final year)
- **μ / σ fallback:** If insufficient data, defaults to μ=0.07, σ=0.15

> **Known behavior:** High-volatility inputs with asymmetric cashflows can produce strongly right-skewed distributions (large P95, negative P50). This is mathematically correct for lognormal processes, not a bug.

### DACH Tax (`calcTax`)

```
grossGain      = Σ inflows − initialInvestment

// Teilfreistellung (§ 20 InvStG) — if isFund && teilfreistellung
adjustedGain   = grossGain × 0.7  (else = grossGain)
teilfreistellungReduction = grossGain − adjustedGain

taxableGain    = max(0, adjustedGain − personalFreibetrag)
taxAmount      = taxableGain × 0.26375

// Kirchensteuer
kirchensteuerAmount = taxAmount × (kirchensteuer / 100)  // 0, 8, or 9 %

netGain        = grossGain − taxAmount − kirchensteuerAmount
effectiveTaxRate = ((taxAmount + kirchensteuerAmount) / grossGain) × 100   [if grossGain > 0]

vorabpauschale = initial × VORABPAUSCHALE_RATE_2026 × (1 − ter/100)
                 [only if isFund && isAccumulating]
                 NOTE: Worst-case estimate (assumes positive annual return)
```

**Function signature:**
```ts
calcTax(initial, cashFlows, isFund, isAccumulating, ter,
        personalFreibetrag, teilfreistellung, kirchensteuer)
```

**Remaining simplifications (documented in MethodologyModal section E):**
- No multi-year loss carryforward
- Vorabpauschale is a worst-case estimate (no actual performance adjustment)

---

## 5. UI Components

### InvestmentApp.svelte (Orchestrator)

**State atoms:**

| State variable  | Type                                          | Purpose                              |
|-----------------|-----------------------------------------------|--------------------------------------|
| `input`         | `InvestmentInput`                             | All user inputs                      |
| `activeTab`     | `'eingabe' \| 'kennzahlen' \| 'montecarlo' \| 'steuer'` | Active tab       |
| `mcResult`      | `MonteCarloResult \| null`                    | MC output (invalidated on input change) |
| `aiNarrative`   | `string \| null`                              | Serialized JSON from Worker          |
| `lastAiAt`      | `number \| null`                              | Timestamp for cooldown display       |
| `restored`      | `boolean`                                     | localStorage restore guard           |
| `getChartImage` | `(() => string \| null) \| null`              | PDF chart capture callback           |
| `showGuide`     | `boolean`                                     | MethodologyModal open state          |

**Derived values (computed reactively):**
- `sortedCashFlows` — cashflows sorted ascending by year
- `returnMetrics` — recalculated on every input change
- `riskMetrics` — recalculated on every input change
- `taxResult` — recalculated on every input change
- `cumulativeValues` — running sum for chart
- `yearLabels` — `['Jahr 1', 'Jahr 2', ...]`
- `weeklyLocked` — `isWeeklyCooldownActive(lastAiAt)`
- `hasData` — `input.cashFlows.length > 0`

**Tab invalidation:** Any input change sets `mcResult = null` and `aiNarrative = null`.

### InvestmentChart.svelte

- Chart.js 4.x, dynamically imported (`import('chart.js')`)
- `breakEvenPlugin`: custom inline Chart.js plugin, draws red dashed horizontal line at `initialInvestment` value
- MC datasets: P95 fill to P5 (20 % opacity band), P50 dashed, P5 dashed red
- Legend filter: P95 and P5 band lines hidden from legend
- `getImageBase64()` exported function: copies canvas to offscreen canvas with white background, returns PNG as base64
- `onChartReady` callback: registered on `onMount`, delivers `getImageBase64` to parent

**Critical: PDF chart capture pattern**

The offscreen permanently-mounted chart in `InvestmentApp.svelte` solves the tab-lifecycle problem:

```svelte
<!-- Always mounted outside {#if activeTab} blocks -->
<div style="position:absolute;left:-9999px;width:640px;height:280px;overflow:hidden;"
     aria-hidden="true" tabindex="-1">
  <InvestmentChart
    initialInvestment={input.initialInvestment}
    {cumulativeValues}
    years={yearLabels}
    monteCarloResult={mcResult}
    onChartReady={(fn) => { getChartImage = fn; }}
  />
</div>
```

Why `640×280px` (not 1×1): Chart.js needs real pixel dimensions to render a meaningful canvas for PNG export. The dimensions match the PDF chart fit target (`fit: [515, 155]` in pdfmake).

### InputPanel.svelte

Three card sections:
1. **Investitionsparameter** — `initialInvestment` (EUR), `discountRate` (%)
2. **Erwartete Cashflows** — dynamic list, max 30 entries; `+ Jahr hinzufügen` auto-increments year; per-row delete button
3. **Steuerliche Einstellungen** — `isFund` toggle → reveals `isAccumulating`, `teilfreistellung` toggles → reveals `ter` input; `kirchensteuer` dropdown (0 / 8 / 9 %); always-visible `personalFreibetrag`

### MetricsDashboard.svelte

- Return grid: ROI, CAGR (null → `—` with tooltip), IRR, NPV (2×4), + Payback Year (1×2 below)
- Risk grid: Sharpe (with qualitative label: Gut/Akzeptabel/Niedrig), Sortino, Max Drawdown, Volatilität (2×4), + VaR 95 % / VaR 99 % (1×2)
- Color coding: positive → `eucalyptus-700`, negative → `red-600`, neutral → `text-primary`

### MonteCarloPanel.svelte

- Run button triggers `handleRunMC()` in App (async, 16 ms yield for spinner render)
- Chart renders same `InvestmentChart` with `monteCarloResult={mcResult}` (no `onChartReady` — PDF uses offscreen chart)
- Results section only visible after successful run: P5 / P50 / P95 final values, Gewinnwahrscheinlichkeit, expected final value with gain/loss delta

### TaxPanel.svelte

- Line-item waterfall: Bruttogewinn → Teilfreistellung (conditional) → Freistellungsauftrag → Steuerpflichtiger Gewinn → Steuersatz → Steuerbetrag → Kirchensteuer (conditional) → **Nettogewinn**
- Effective rate badge (only shown if `grossGain > 0`); includes Kirchensteuer in effective rate
- Loss state card (shown if `grossGain < 0`) with Verlustvortrag note
- Vorabpauschale section: conditional on `isFund && isAccumulating && vorabpauschale !== undefined`; "Schätzwert · Worst Case" badge with tooltip
- Legal disclaimer (Steuerberater-Hinweis)

### MethodologyModal.svelte

Slide-over panel, fixed to right edge (`max-w-xl`), dark background (`bg-gray-950`).

| Section | Icon      | Content                                                      |
|---------|-----------|--------------------------------------------------------------|
| **A**   | A (badge) | Quick Start — 5 numbered steps (Eingabe → Kennzahlen → Monte Carlo → Steuer → KI) |
| **B**   | Calculator| 7 formula cards: ROI, CAGR, IRR, NPV, Sharpe/Sortino, VaR, Monte Carlo lognormal |
| **C**   | TrendingUp| Interpretation guide: CAGR benchmarks, NPV decision rule, Sharpe scale, MC probability |
| **D**   | HelpCircle| Glossar: Abgeltungsteuer, Teilfreistellung, Kirchensteuer, Freistellungsauftrag, Vorabpauschale, TER, Max Drawdown, r_f |
| **E**   | ShieldAlert| Modellgrenzen: 4 documented limitations (updated: Teilfreistellung now supported; CAGR limitation clarified; Vorabpauschale worst-case noted) |

**Svelte 5 patterns used:**
- `$bindable` for `open` prop (not `export let`)
- `onkeydown` (not `on:keydown`) for Escape handling
- `fly` + `fade` transitions from `svelte/transition`

---

## 6. PDF Export (`src/lib/investment/pdfExport.ts`)

### Trigger
`handleDownloadPdf()` in InvestmentApp → `getChartImage?.()` → `generateInvestmentPdf({...})`

### pdfmake loading
```ts
const [pdfMakeMod, vfsMod] = await Promise.all([
  import('pdfmake/build/pdfmake.js'),
  import('pdfmake/build/vfs_fonts.js'),
]);
```
Zero bundle cost on page load (lazy).

### Report Structure (A4, margins 40/54/40/62)

1. Header: title + creation date (right-aligned)
2. Brand separator line (eucalyptus-500, 1.5px)
3. **Rendite-Kennzahlen** — 4-column KPI grid: ROI, CAGR, IRR, NPV + Payback
4. **Risiko-Kennzahlen** — 4-column KPI grid: Sharpe, Sortino, Max DD, Volatilität; + VaR 95/99 row
5. **Wertentwicklung** — chart PNG (515×155 fit); fallback text if `chartImageBase64 === null`
6. **Monte-Carlo** (conditional) — 4-column: P5, P50, P95, Gewinnwahrscheinlichkeit
7. **DACH Steuerberechnung** — 4-column: Bruttogewinn, Steuerpflichtig, Steuerbetrag, Nettogewinn
8. **KI-Analyse** (conditional) — 4 colored left-border cards: Gesamtbewertung, Stärken, Risiken, Empfehlung

### Footer (every page)
- Contact line: name, title, email, phone, website
- Booking CTA + generator attribution

### iOS Safari Fix (pre-open window pattern)

`handleDownloadPdf()` calls `window.open('', '_blank')` **synchronously** (before any `await`) to stay within the user-gesture context. The `Window` reference is passed as `targetWindow` to `generateInvestmentPdf`. After blob creation:

- **Desktop:** standard `<a download>` trigger
- **iOS Safari:** `targetWindow.location.href = url` (iOS blocks `download` attribute on `<a>`)

On error, `targetWindow?.close()` prevents orphaned blank tabs.

### Output
Blob → `URL.createObjectURL` → targeted download (desktop: anchor; iOS: pre-opened window)
Filename: `Investment-Analytics_YYYY-MM-DD.pdf`

---

## 7. AI Worker (`functions/api/investment-analysis.ts`)

**Endpoint:** `POST /api/investment-analysis`
**Model:** OpenAI o4-mini, `reasoning_effort: 'low'`, `role: 'developer'`

### Security layers (production only — localhost bypassed)

| Layer         | Mechanism                                              | Limit                    |
|---------------|--------------------------------------------------------|--------------------------|
| Burst rate    | In-memory `Map<IP, {count, resetTime}>`                | 5 req/60 s per IP        |
| Weekly quota  | Cache API (`caches.open('investment-analysis-weekly')`) | 1 req/7 days per IP hash |
| IP hashing    | SHA-256 of `investment-analysis:{ip}:salt_7d`          | GDPR-compliant, no plain IP stored |

### Input validation
Required fields: `initialInvestment` (number), `returnMetrics` (object), `riskMetrics` (object).
`taxResult` and `mcResult` are optional (passed if available).

### Structured output schema
```json
{
  "summary":        "string",
  "strengths":      "string",
  "risks":          "string",
  "recommendation": "string"
}
```
Enforced via `response_format.json_schema` (strict mode). The frontend stores the raw JSON string in `aiNarrative` state and renders it parsed.

### System prompt tone
"CFO-Berater und Portfoliomanager, DACH-Expertise, direkt, professionell, faktenbasiert. Keine Allgemeinplätze." All output in German, 2–3 sentences per field max.

---

## 8. Page Shell (`src/pages/tools/investment-analytics/index.astro`)

- `BaseLayout` with `lang="de"`, title + description meta set
- Breadcrumb JSON-LD: Home → Tools → Investment Analytics
- Privacy note: "Alle Berechnungen lokal im Browser. Keine Konten."
- CTA link to `/services` for deeper analysis
- `<InvestmentApp client:visible />` — hydrated only when viewport intersects

---

## 9. Design System Compliance

All components use design tokens exclusively (verified):

| Token used                | CSS custom property          | Context                       |
|---------------------------|------------------------------|-------------------------------|
| `eucalyptus-500/600/700`  | Tailwind scale               | CTAs, positive values, brand  |
| `var(--bg-primary)`       | CSS custom property          | Input backgrounds             |
| `var(--bg-elevated)`      | CSS custom property          | Card backgrounds              |
| `text-text-primary-light/dark`   | CSS custom property   | Body text                     |
| `text-text-secondary-light/dark` | CSS custom property   | Labels                        |
| `text-text-muted-light/dark`     | CSS custom property   | Hints, placeholders           |
| `red-600 / red-400`       | Tailwind scale               | Negative values, losses       |
| Brand hex `#6B8E6F`       | pdfExport.ts only            | PDF brand color (not in UI)   |

---

## 10. Known Limitations & Documented Caveats

These are explicitly documented in MethodologyModal section E and known by design:

1. **Sparse data risk:** Sharpe / VaR statistically unreliable with < 4 cashflow years
2. **Fat tails:** Monte Carlo uses lognormal (not fat-tailed) distribution — underweights crisis scenarios (v2 feature: Student-T or stress shock)
3. **Tax simplification:** No multi-year Verlustvortrag. Kirchensteuer (8/9 %) and Teilfreistellung (30 % Aktienfonds) are now supported.
4. **CAGR scope:** Valid only for single-cashflow exit; displayed as `—` for multi-cashflow scenarios (use IRR)
5. **Vorabpauschale estimate:** Worst-case calculation — actual amount may be lower or zero in negative return years

---

## 11. Audit Results (2026-02-28)

### Browser inspection (Chrome DevTools, localhost:8788)
- **Console errors:** 0
- **Console warnings:** 0
- **Page loads:** ✅ Svelte island hydrates correctly via `client:visible`
- **Chart renders:** ✅ Default 5-year scenario with eucalyptus color + break-even line
- **Tab navigation:** ✅ All 4 tabs accessible with correct ARIA roles (`role="tab"`, `aria-selected`)
- **Methodik & Guide button:** ✅ Visible with BookOpen icon + text label (hidden on mobile)

### Functional verification
- **Input → Chart reactivity:** ✅ Chart updates on cashflow change
- **MC invalidation:** ✅ `mcResult` cleared on any input mutation
- **localStorage persistence:** ✅ State restored on page reload (restored guard prevents overwrite on mount)
- **PDF offscreen chart:** ✅ Verified working in production PDF (confirmed via user test 2026-02-27)
- **AI weekly cooldown:** ✅ localhost bypass active, production Cache API quota functional
- **PDF generation:** ✅ All sections render: KPI grids, chart PNG, MC results, tax, AI narrative

### Not yet verified (pre-deployment)
- Cloudflare Cache API weekly quota in production environment
- PDF on mobile browsers (pdfmake Blob download behavior)
- Lighthouse performance score with pdfmake lazy load

---

## 12. Adding / Modifying This Tool

### To add a new metric
1. Add field to `ReturnMetrics` or `RiskMetrics` in `types.ts`
2. Compute it in `analytics.ts` (pure function, no side effects)
3. Display it in `MetricsDashboard.svelte`
4. Add it to the PDF KPI grid in `pdfExport.ts`
5. Update MethodologyModal section B (formula) and C (interpretation)

### To change tax rates
All constants are in `types.ts`. Update `TAX_RATE` and/or `VORABPAUSCHALE_RATE_2026`. The `STORAGE_KEY` includes a version suffix (`v1`) — bump to `v2` if the state shape changes to avoid loading stale localStorage data.

### To add a new tab
1. Add to the `TABS` array in `InvestmentApp.svelte`
2. Add a `{:else if activeTab === 'newtab'}` block
3. Create the child component following the same props pattern (`$props()`)

### Deployment
Push branch → create PR → CI passes → merge to master → Cloudflare Pages auto-deploys.
Worker (`functions/api/investment-analysis.ts`) deploys as a Cloudflare Pages Function — no separate deploy step needed.
