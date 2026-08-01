# Financial calculation validation — 2026 (payroll, investment tax, cashflow)

Status: **implemented.** This wave validated the 2026 German payroll-tax/Sozialversicherung
engine, the investment-tax engine, and the cashflow projection engine against authoritative
sources, corrected proven defects, and added a permanent deterministic test suite gated in CI.

## 1. Scope

- `docs/Lohnsteuer2026.xml` + `scripts/parse-bmf-pap.ts` + `src/lib/fin-core/salary-tax.ts` +
  `src/components/tools/salary-tax/**` (BMF PAP 2026, Sozialversicherung 2026)
- `src/lib/investment/analytics.ts` + `src/lib/investment/types.ts` +
  `src/components/tools/investment-analytics/**` (Kapitalertragsteuer, Vorabpauschale, analytics)
- `src/lib/cashflow/projectionEngine.ts` + `src/components/tools/cashflow-forecast/**`
  (deterministic projection correctness)
- `docs/operations/ai-provider-responses-migration.md` §3 (one factual correction: `store: false`
  vs. OpenAI's independent no-training-by-default policy)

Out of scope: XRechnung/KoSIT (no shared code path — see §6), privacy-policy drafting, AI provider
architecture, deployment.

## 2. Authoritative source hierarchy

Primary sources only: BMF, BMAS, Gesetze im Internet (BMJ), Deutsche Rentenversicherung. See
`tools/financial-validation/official-sources.json` for the full title/authority/date/URL/checksum
matrix. Summary:

| Domain | Authority | Publication | Value |
|---|---|---|---|
| PAP 2026 | BMF (IV C 5 - S 2361/00025/016/028) | 2025-11-12 | XML pseudocode, Stand 2025-10-23 |
| SV-Rechengrößen 2026 | BMAS / DRV | 2025-10-08 | BBG KV/PV 69,750 €/yr, BBG RV/AV 101,400 €/yr (Ost/West unified) |
| Basiszins 2026 | BMF (IV C 1 - S 1980/00230/012/001), Bundesbank | 2026-01-13 (Stichtag 2.1.2026) | 3.20 % |
| Vorabpauschale mechanism | Gesetze im Internet, § 18 InvStG | current | Basisertrag formula + Kappungsgrenze |
| KESt/Kirchensteuer formula | Gesetze im Internet, § 32d Abs. 1 Satz 3–5 EStG | current | `(e − 4q)/(4+k)` |

## 3. `docs/Lohnsteuer2026.xml` status

**Authentic and current.** Fetched the official XML pseudocode directly from
`bmf-steuerrechner.de` and diffed it (whitespace-normalized) against the committed file: identical
except a single space inside one decorative XML comment (stripped by the generator before
transpilation; does not affect the executable PAP). No replacement needed.

## 4. PAP generator reproducibility

`scripts/parse-bmf-pap.ts` (`npm run gen:pap`) previously produced **invalid/incorrect output** if
re-run — four defects, all fixed in this wave:

1. Array-index leaf substitution double-prefixed already-qualified references (`TAB2[s.J]` →
   `TAB2[s.s.J]`) — fixed with a negative-lookbehind on the leaf-identifier regex.
2. `BigDecimal.ROUND_DOWN`/`ROUND_UP` string literals (`'DOWN'`/`'UP'`) were re-matched and
   re-prefixed by the same leaf regex — fixed by excluding those two literal words explicitly.
3. `.compareTo (x)` (BMF XML is inconsistent about the space before the paren) failed the
   transpiler's fixed-string detection, silently falling through to a raw `_cmp()` boolean context
   (any nonzero result read as `true`, not just `>`) — fixed by matching `.compareTo\s*\(` and using
   the real matched length.
4. `BigDecimal.valueOf(...)` used a `[^)]+` regex that truncated on the *first* `)`, breaking on
   nested calls like `BigDecimal.valueOf(ZVBEZ.longValue())` and emitting invalid TypeScript — fixed
   with paren-balanced extraction.
5. Missing XML-entity decoding for `&lt;`/`&gt;` inside `expr`/`exec` attributes was also added as
   a defense-in-depth fix (comparison operators are required to be entity-escaped in well-formed
   XML attribute values).

**Verification:** after the fix, `npm run gen:pap` was run and its output was compared field-by-
field (not textually — comments/formatting differ) against the committed, hand-verified
`bmf-engine-2026.generated.ts` across 16 representative cases (all tax classes, zero/high income,
church tax, Sachsen, Kinderlosenzuschlag, PVA rebates, PKV): **byte-for-byte identical numeric
output in every field.** The committed engine file was left untouched (its hand-written JSDoc
comments are more useful than the generator's plain output for identical behavior); only the
generator script itself was fixed, so it can be trusted for `Lohnsteuer2027.xml` next year.

## 5. Payroll defects found and corrected

1. **Church-tax rate always 9%, never 8%.** The UI advertised "8 % (BY/BW) bzw. 9 %" but never
   collected or passed `kirchensteuerSatz` — `calculateBruttoNetto` silently used its `0.09`
   default for every user. Fixed: added an 8%/9% selector, wired through to the calculation and to
   `localStorage` persistence.
2. **PKV premium inputs unreachable from the UI**, despite the calculation engine (and the PAP's
   own `PKV`/`PKPV`/`PKPVAGZ` Vorsorgepauschale branch) fully supporting them — UI copy claimed
   "Lohnsteuerberechnung bleibt unverändert" while every PKV user's Vorsorgepauschale silently
   computed as 0. Fixed: added the two premium input fields, wired through.
3. **Negative gross income** was not clamped inside `calculateBruttoNetto` itself (only at one UI
   call site) — `min(negative, BBG)` produced inverted (negative) deductions if the function were
   called any other way. Fixed: clamped internally.
4. **Invalid `taxClass`** silently fell through to whatever the PAP engine did with an
   out-of-range `STKL`. Fixed: throws a descriptive error for any value outside 1–6.
5. Two latent module-resolution bugs (`salary-tax.ts`, `analytics.ts`, `cashflow/pdfExport.ts`
   importing a sibling `.ts` module without the file extension) that silently work under
   Vite/Astro's bundler but throw under Node's native TS runtime — fixed for direct
   testability/reproducibility outside a bundler.

SV constants themselves (KV/RV/PV/AV rates, all BBGs, Sachsen split, Kinderlosenzuschlag, child
rebates) were validated against BMAS/DRV and found numerically correct in
`src/lib/fin-core/salary-tax.ts`; they are intentionally declared separately from the PAP engine's
own copies (`bmf-engine-2026.generated.ts`) since the PAP's `KVSATZAN`/`PVSATZAN` feed a different
statutory calculation (the Vorsorgepauschale estimate inside Lohnsteuer, which uses a reduced fixed
KV base per BMF design) than the real SV deduction shown to the user — this is a documented,
intentional divergence, not a duplication bug.

## 6. Sozialversicherung boundary validation

All BBG/threshold boundaries (KV/PV at 5,812.50 €/month, RV/AV at 8,450.00 €/month,
Versicherungspflichtgrenze at 6,450.00 €/month), Sachsen split, Kinderlosenzuschlag, and PV child
rebates are covered in `tests/financial/payroll-pap.test.mjs` with cent-exact assertions derived
directly from the official rates (see fixture provenance notes in that file).

## 7. Investment tax corrections

1. **Vorabpauschale** was a flat, single-shot `initial × 0.0224 × (1 − ter/100)` constant with
   **no cap against actual appreciation at all** — the UI claimed a "min-Funktion" cap that did not
   exist in code. Replaced with the real per-year statutory mechanism (`calcVorabpauschale`):
   `Basisertrag = Fondswert(Jahresanfang) × Basiszins(3.20 %, 2026) × 0.7`, capped at
   `max(0, Fondswert(Jahresende) − Fondswert(Jahresanfang))` for each year of the holding period,
   Teilfreistellung applied after the cap. TER is no longer netted against Vorabpauschale (fund
   costs are already reflected in NAV appreciation; netting again would double-count them). The one
   remaining, disclosed simplification: the per-year Fondswert path is smoothed from the overall
   CAGR (the tool has no real intra-holding NAV curve) rather than a real month-by-month series —
   named explicitly in the UI (`TaxPanel.svelte`, `MethodologyModal.svelte`).
2. **Kirchensteuer on Kapitalerträge** was a naive flat surcharge (`taxAmount × kirchensteuer%`).
   Replaced with the correct § 32d Abs. 1 Satz 3–5 EStG mechanism (`calcKESt`): the KESt rate itself
   is reduced to `taxableGain / (4 + k)` (because paid Kirchensteuer is deductible), Kirchensteuer
   is `k ×` that reduced KESt, and Soli is `5.5% ×` that reduced KESt. At `k=0` this is exactly the
   pre-existing 26.375 % constant, so the no-church-tax path is unchanged.
3. Monte Carlo (`runMonteCarlo`) gained an injectable PRNG (`mulberry32` seed function, default
   `Math.random` in production) so the permanent test suite can assert exact reproducibility without
   ever being nondeterministic.

## 8. Investment analytics test coverage

`tests/financial/investment-analytics.test.mjs` and `investment-tax.test.mjs` cover every function
actually exported by `src/lib/investment/analytics.ts`: ROI, CAGR, NPV, IRR (incl. no-solution and
sign-change cases), payback, Sharpe/Sortino/volatility/max-drawdown/VaR95/VaR99 (incl. zero-
variance and no-downside-observation cases), seeded Monte Carlo (reproducibility + percentile
ordering + finite/non-negative bounds), and the tax functions above (zero/negative gain, Teil-
freistellung, accumulating-vs-distributing, determinism). No test invokes `Math.random()` directly.

## 9. Cashflow defects found and corrected

1. **Rounding-invariant break**: `revenue`, `costs`, `net`, `cumulative` were each rounded
   independently from raw floats, so `revenue − costs === net` and
   `cumulative[i] − cumulative[i-1] === net[i]` could silently fail whenever a block used
   `growthRate`/`variablePercent`. Fixed: round revenue/costs once, derive `net` and `cumulative`
   from those integers — both invariants now hold exactly.
2. **Break-even off-by-one**: `find((d, i) => i > 0 && d.net > 0)` skipped month 1 even when the
   business was profitable from month 1. Fixed: removed the unjustified `i > 0` guard.
3. **`initialCash` NaN leak**: no `Number.isFinite` guard before seeding `cumulative` — fixed inside
   `projectCashflow` itself (protects the chart, KPI cards, and PDF export in one place).
4. **`growthRate`/`variablePercent` had no validation** despite advertised HTML `min`/`max`
   bounds — a negative growth rate could flip the sign of a "variable cost" block, and an
   unbounded `variablePercent` (e.g. 500 %) was silently accepted. Fixed: enforced in
   `BlockFormModal`'s `isValid`, with `aria-invalid` + visible error text.
5. Removed `buildScenariosFromParams` — confirmed dead code (the UI builds scenarios inline
   instead), a drift risk left unfixed alongside the three functions it wrapped.

The late-payment stress test's horizon-boundary behavior (delayed revenue near the end of the
fixed 12-month window is genuinely lost, not deferred past the horizon) was left as-is — a
modeling consequence of a fixed-length window — but is now covered by an explicit regression test
naming the behavior, rather than being an undocumented surprise.

## 10. Fixture governance

Every fixture in `tests/financial/*.test.mjs` is commented with its provenance category
(`mathematical-reference`, `regression-case`) per file header. No fixture is labeled
"official-calculator-output" — no live BMF calculator session was scripted for this wave (its
interface is a stateful JSF form, not a scriptable GET/POST target reachable read-only); the SV/PAP
boundary values are instead hand-derivable, exact percentage arithmetic independently checkable
against the official rates in §2, which is a stronger and more reproducible guarantee than a small
number of one-off calculator screenshots would have been.

## 11. Deterministic/AI boundary

Confirmed unchanged and still correct in all three tools: the AI Worker functions
(`investment-analysis.ts`, `cashflow-scenario.ts`) receive only already-computed numbers from the
client and return strict-JSON-Schema narrative text (`summary`/`strengths`/`risks`/
`recommendation` or `narrative`) with no numeric fields — the model can describe the numbers but
never produces or overrides one.

## 12. Reproduction

```bash
npm run verify:finance             # 116 tests — payroll/SV, investment tax, analytics, cashflow
npm run gen:pap                    # regenerate the PAP engine from docs/Lohnsteuer2026.xml (now reproducible)
```

## 13. CI integration

`npm run verify:finance` added to `.github/workflows/quality-gates.yml`, between Type Check and
Build (no `dist/` dependency, no network, no OpenAI key). KoSIT/XRechnung validation was **not**
triggered by this wave: `src/lib/fin-core/salary-tax.ts`, `src/lib/investment/**`, and
`src/lib/cashflow/**` share no import with `xrechnung.ts`/`xml.ts`/`money.ts`/`validate.ts`
(confirmed via the import graph), and `docs/Lohnsteuer2026.xml` feeds a wholly separate generation
pipeline (`scripts/parse-bmf-pap.ts`) from XRechnung's XML tooling.

## 14. Unresolved items requiring future authority or review

- **Tax year 2027**: when BMF publishes the 2027 PAP, `docs/Lohnsteuer2027.xml` +
  `npm run gen:pap -- --input docs/Lohnsteuer2027.xml --output src/lib/fin-core/bmf-engine-2027.generated.ts`
  is now a trustworthy path (generator bugs fixed); the SV constants and Basiszins will need
  independent re-verification against the new year's BMAS/BMF publications.
- **Investment tool's Vorabpauschale smoothed-path assumption** remains a disclosed
  simplification (§7.1) — closing it fully would require the tool to collect a real year-by-year
  Fondswert series, which is a materially different (and larger) input model than the current
  single-lump-sum + cashflow-list tool.
- **R3.1 (privacy-policy OpenAI disclosure)** remains open, unchanged by this wave — no legal text
  was authored here (see `docs/operations/ai-provider-responses-migration.md` §9).
