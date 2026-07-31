# Phase 2D Launch Scope Lock

Scope-lock date: 2026-07-26

Canonical source identity: this document was authored on the audit branch
`audit/phase-2d-b-product-scope`, fast-forwarded into `integration/portfolio-hardening-2026-07` at
Phase 2D-B closure, from canonical baseline `cf1676ab68cbdcf77fdcaeef3ffe9acdbe8c069a`
(tree `8105d61c16d6b5d84dc6e8f8ce9d22188ea4ea92`).

This is a living, tracked, public-facing product-decision document. It records **what launch scope
was decided and why**, not implementation status. It does not claim any listed item is already
built. Implementation status for each item lives in the external Phase 2D-B audit package
(`PHASE_2D_B_PRODUCT_SCOPE_REGISTER.md`, 51 entries) and is progressed wave-by-wave under
`docs/ROADMAP.md`.

## 1. Authoritative source

The full evidence base for every decision in this document is the Phase 2D-B audit package:

- `PHASE_2D_B_PRODUCT_SCOPE_REGISTER.md` — 51-entry master register;
- `PHASE_2D_B_TOOL_ACCEPTANCE_MATRIX.md`, `PHASE_2D_B_AI_CAPABILITY_MATRIX.md`,
  `PHASE_2D_B_PUBLIC_CLAIM_MATRIX.md`, `PHASE_2D_B_PRODUCT_DEBT_REGISTER.md`,
  `PHASE_2D_B_ROUTE_INVENTORY.md`/`.json` — specialized matrices;
- `PHASE_2D_B_LAUNCH_SCOPE_DECISION_MEMO.md` — the six resolved owner-decision packages plus the
  generic localization policy, statistics reclassification, and launch-critical promotions;
- `PHASE_2D_B_PROPOSED_IMPLEMENTATION_WAVES.md` — the six-wave implementation plan;
- `PHASE_2D_B_AUDIT_REPORT.md`, `PHASE_2D_B_SCOPE_LOCK_REPORT.md` — narrative summaries.

These documents are held externally (not in this repository) per the project's standard practice
of keeping volatile audit evidence out of version control (`AGENTS.md` — "Do not commit machine
paths, temporary branches, session data, or volatile snapshots"). This tracked document is the
durable, in-repository summary of the decisions those documents record.

## 2. Owner-approved generic localization policy

**A page that currently exists intentionally in one language must not be translated merely to
create artificial localization symmetry.**

Confirmed single-language surfaces: the Fin-Tools Hub (all 6 tools + hub landing) — German only;
Blog — English only; `/now` — English only; `/ai` — English only; `/projects` — English only. This
principle applies generically to every other intentionally single-language page, not only to these
named examples. Genuine DE/EN/RO route families (home, about, experience, education,
certifications, services, legal pages, the discovery-call/data-prep/sample-review funnel) retain
their real, full localization unchanged.

This does not excuse false metadata. The binding technical launch contract:

- `<html lang>` matches the actual content language;
- canonical points to the real current route;
- `hreflang` is emitted only for real alternate pages;
- no `hreflang` points to a missing route or to a redirect when a direct final URL exists;
- sitemap entries, internal navigation, and CTAs reference only real public routes;
- no locale variant is invented merely because a path-prefix convention exists elsewhere.

"No more 404 pages on the site" means: zero unintended internal links, canonical/hreflang targets,
sitemap/feed entries, or CTA/navigation targets resolving to a missing page. A correct 404 response
for genuinely nonexistent URLs remains available.

## 3. Resolved owner decisions

| # | Decision | Resolution |
|---|---|---|
| 1 | Fin-Tools Hub localization scope | Locked DE-only, permanent, conscious design choice (built on German legal/regulatory frameworks) |
| 2 | GDS/GENESIS project-claim language | Retain both projects; qualify as private/internal research prototypes, unaudited, not publicly reproduced; remove "World's First" and absolute "zero-hallucination" language; remove/qualify unreproducible precision figures; no fabricated freshness |
| 3 | Sample Review disposition | `HIDE-FROM-LAUNCH` / visibly unavailable now; `TRIGGER-BASED` full activation later; backend stays fail-closed; no Turnstile/Resend/retention activation now |
| 4 | `/ai` standalone page | Retained, English-only (no `/en/ai`, `/ro/ai`), made discoverable via a deliberate internal affordance |
| 5 | Positioning/authorship-framing consistency | One coherent register: finance/financial accounting, FinTech, applied AI, human-led/AI-accelerated, architecture/research/orchestration/validation/responsibility — no implied traditional AI-engineering employment, no reduction to generic "AI-generated" |
| 6 | Structured-data/Lighthouse claims | `profit-minds.de` retained only where schema-semantically correct (project/brand relation, not necessarily Person `sameAs`); permanent "100/100 Lighthouse" claim replaced with "Lighthouse-optimized" unless a fresh, release-specific measurement is recorded |

## 4. Statistics requirement — reclassified

`CAPABILITY-STATISTICS-01` is reclassified from `NOT-APPLICABLE` to
`IMPLEMENTED-WITHIN-INVESTMENT-ANALYTICS / REQUIRES-ACCEPTANCE-VERIFICATION`. The owner's original
requirement (six serious Fin-Tools, coverage from cash-flow through statistical and investment
analysis) is intended to be satisfied by Investment Analytics' existing Sharpe, VaR, and Monte
Carlo functionality, subject to a formal acceptance-verification pass in Wave 2. No seventh tool is
in scope.

## 5. Launch-critical register IDs (Bucket A)

`I18N-ROUTE-05`, `I18N-ROUTE-06`, `I18N-ROUTE-07`, `I18N-ROUTE-08`, `DEBT-01`, `DEBT-02` /
`FUNNEL-SAMPLEREVIEW-01`, `DEBT-03`, `DEBT-04`, `AI-CHAT-PROJECT-02`, `AI-CORPUS-09`,
`PROOF-HOMEPAGE-01`, `PROOF-HOMEPAGE-02`, `PROOF-HOMEPAGE-05`, `CONTENT-BLOG-STALE-01`,
`TOOL-RUNWAY-01` (promoted from refinement), plus the new provider-independent deterministic-facts
requirement (Decision Memo Section J, tracked against `AI-DISABLED-08`).

Explicitly launch-critical, restated in the terms of this task's governing instruction:

- factual consistency between repository data, corpus, and deterministic facts;
- `/now` provider and framework-version truth;
- route-language/canonical/hreflang integrity;
- removal of public QA/test routes;
- Sample Review honest unavailable state;
- Startup Runway financial correctness;
- statistics acceptance within Investment Analytics;
- Fin-Tools Hub launch positioning;
- `/ai` English-only discoverability;
- provider-independent deterministic AI facts;
- GDS/GENESIS claim qualification;
- human-plus-AI positioning consistency;
- unsupported and misleading public-claim closure;
- broken Open Graph asset closure;
- zero unintended public links or metadata references to missing pages.

**None of the above is implemented by this document.** Implementation is Phase 2D-C Wave 1, tracked
separately and gated by focused validation and the full `verify:release-candidate` suite before any
integration is proposed.

## 6. Ship-as-is (Bucket B)

`TOOL-CASHFLOW-01`, `TOOL-INVEST-01`, `TOOL-SALARYTAX-01`, `TOOL-XRECHNUNG-01`, `AI-CHAT-QA-01`,
`AI-CHAT-CONTACT-03`, `AI-CITE-10`, `AI-LOG-11`, `AI-PROVIDER-12`, `AI-COMPASS-05`,
`AI-CASHFLOW-06`, `AI-INVEST-07`, `FUNNEL-DATAPREP-01` (core content), `I18N-ROUTE-01`,
`I18N-ROUTE-02`, `I18N-ROUTE-03`, `I18N-ROUTE-04`, plus certifications/experience/education content.

## 7. Refinement (Bucket C)

`HUB-LANDING-01`, `AI-CHAT-JOBFIT-04` (evidence-quality follow-up beyond Wave 1 discoverability),
`AI-DISABLED-08` (beyond the Wave 3 provider-independence fix), `PROOF-HOMEPAGE-03`,
`CONTENT-BLOG-DUP-01`, `CONTENT-BLOG-TOC-01`.

## 8. Hidden/removed launch surfaces (Bucket D)

`/design-system-test` (DE/EN/RO), `/test/components` — removed from the public route tree, not
merely `noindex`'d. Sample Review — visibly unavailable, per Decision 3.

## 9. Post-release (Bucket E)

`PROOF-HOMEPAGE-04`, `PROOF-HOMEPAGE-06`, `CONTENT-BLOG-COVERAGE-01`, `DEBT-05`.

## 10. Trigger-based (Bucket F)

Sample Review full activation (Turnstile, Resend, retention/deletion policy, qualified privacy
review); `CONTENT-BLOG-PAGINATION-01` (activate at the 10th blog post).

## 11. Explicit non-goals

- No seventh Fin-Tool ("statistics" is satisfied within Investment Analytics, not a new tool);
- no EN/RO UI for the Fin-Tools Hub, `/now`, `/ai`, `/projects`, or the Blog — ever, absent a future
  explicit owner reversal of Decision 1/4 and the generic localization policy;
- no Sample Review activation (Turnstile/Resend/retention) in this scope-lock or in Wave 1;
- no new AI provider, no second-provider abstraction, no automatic retry/fallback;
- no database or heavy content system for facts/corpus consistency — a generated-from-canonical-
  source or cross-check-verifier approach only;
- no full homepage redesign, no full copy rewrite — refinement, not replacement, per `AGENTS.md`
  Section 4.1.

## 12. Phase 3 security-monitoring dependencies (unchanged, not in this scope)

Dependabot alerts and controlled dependency-update PRs, CodeQL, secret scanning and push
protection, required checks and branch protection, scheduled online vulnerability audit,
repository/security cron, independent watchdog where justified, outbound-only Telegram alerts,
deduplication and severity policy, production health and release-identity monitoring. These remain
explicitly assigned to Phase 3 and are not evaluated, activated, or implemented by this scope lock
or by Phase 2D-C Wave 1.

## 13. Implementation waves

1. **Public Truth, Route Integrity and Launch Safety** — the current wave (Phase 2D-C Wave 1).
2. **Fin-Tools Professional Completion** — Startup Runway tests, statistics acceptance, hub wording.
3. **AI Reliability and Recruiter Experience** — provider-independent deterministic facts, corpus
   freshness contract, recruiter evidence-quality follow-up.
4. **Homepage, Positioning and Service Funnel** — broader positioning surfacing, project proof,
   funnel CTA hierarchy.
5. **Content, SEO, Localization and Proof** — blog dedup/staleness, metadata polish, bounded
   DE/EN/RO enforcement.
6. **Product Acceptance and Security Handoff** — full acceptance pass, Phase 3 handoff.

Full detail: `PHASE_2D_B_PROPOSED_IMPLEMENTATION_WAVES.md` (external audit package).

## 14. Measurable completion conditions

A wave is complete only when: every register ID assigned to it is `VERIFIED` (not merely
`FIXED-UNVERIFIED`); its focused validation suite passes with fresh evidence; for Wave 1
specifically, the full `verify:release-candidate` 12-phase gate passes; the affected public claims
in `PHASE_2D_B_PUBLIC_CLAIM_MATRIX.md` are reclassified `SUPPORTED`; and no register item in that
wave remains `OPEN` or `BLOCKED-OWNER` without an explicit, recorded owner decision.

## 15. Traceability

Every item named in this document maps one-to-one to a stable ID in the 51-entry
`PHASE_2D_B_PRODUCT_SCOPE_REGISTER.md`. This document is the durable summary; the register is the
authoritative, evidence-backed source. Where the two conflict after a future update, the register
(as most recently reconciled) governs, per `AGENTS.md`'s "narrowest current source of truth"
principle — and this document must be updated in the same wave that changes the register, per the
living-documentation lifecycle.
