# me-mateescu.de

me-mateescu.de is a multilingual professional portfolio and engineering lab for work at the
intersection of finance operations, automation, AI, and web engineering. It turns the “CFO meets
CTO” direction into inspectable proof: working browser tools, narrow server functions, documented
trust boundaries, and reproducible validation.

**Website:** [me-mateescu.de](https://me-mateescu.de)

## Why the project exists

The repository demonstrates how finance-aware product work can combine deterministic calculation,
privacy-conscious interaction, and carefully bounded AI assistance. It is designed for technical
reviewers, recruiters, collaborators, contributors, and future maintainers—not as a claim of legal,
tax, or investment authority.

The public product has three goals:

- present professional experience, projects, services, and writing in German, English, and Romanian;
- make technical capability reviewable through real tools and source-level contracts;
- show where AI helps interpretation while deterministic engines retain numeric authority.

## Current development and release state

The deployed production site is built from `master`. Repository canonical state on the local
integration lineage is ahead of that deployment and contains completed hardening that is not yet
live. A successful local check or build describes the repository; it does not prove preview or
production state.

Locally complete foundations include Function transport contracts, OpenAI Responses integration,
financial validation, privacy and consent boundaries, repository-truth checks, agent governance,
dependency closure, CSP Report-Only with minimized first-party reporting, exact release tooling,
and the unified local release-candidate gate. They still require human/remote readiness and a
controlled public release.

Remaining public release gates include:

- qualified privacy-policy review remains open;
- execution of the documented public-release lineage after owner review;
- confirmation of the documented GitHub Actions deployment-ownership prerequisites;
- one explicitly authorized OpenAI canary for each configured GPT-5.6 tier;
- remote configuration, required-check, and branch-protection review;
- approved preview and production deployments;
- post-deployment identity, route, cache, privacy, AI, and finance verification;
- Turnstile and Resend only if the currently disabled Sample Review flow is activated.

See [docs/ROADMAP.md](docs/ROADMAP.md) for exit criteria and authorization boundaries.

## Product surfaces

### Portfolio and content

- multilingual homepage, experience, project, service, and contact surfaces;
- project case material and professional timeline;
- blog, resources, tags, RSS, sitemap, and client-side Pagefind search;
- AI data-preparation service discovery with external booking;
- privacy policy, imprint, hreflang, and localized metadata.

### AI-assisted surfaces

- **Ask Mihai:** portfolio-grounded chat plus job-description analysis;
- **Founder Compass:** deterministic questionnaire/profile input with an AI-generated report;
- **Cashflow Forecasting:** deterministic projection with an optional AI stress narrative;
- **Investment Analytics:** deterministic metrics and tax calculations with optional AI interpretation.

Every AI action is user-requested. Server code selects the model, provider settings, and output
contract. Generated text does not override authoritative numeric results.

### Deterministic tools

| Surface | Deterministic responsibility | Optional generated layer |
| --- | --- | --- |
| Startup Runway & Burn Rate | Headcount, revenue growth, injections, burn, and runway | None |
| Brutto-Netto/PAP 2026 | Wage tax and employee/employer social contributions | None |
| XRechnung | Canonical invoice model and UBL/CII export | None |
| Cashflow Forecasting | Twelve-month projection and stress transforms | Narrative only |
| Investment Analytics | Return, risk, Monte Carlo, and German investment-tax calculations | Interpretation only |
| Founder Compass | Questionnaire and profile scoring | Founder report |

The XRechnung implementation supports its documented EN 16931/XRechnung UBL and CII scope.
KoSIT is a separate offline validation gate using pinned artifacts; validator results are not
collapsed into the implementation-support claim.

### Experimental and disabled work

Some project and blog content documents research or experiments and is labeled accordingly. There is
no current authentication, client portal, upload pipeline, queue, or multi-provider abstraction.

The Sample Review route exists but is inactive. Resend is not currently configured, so the Function fails
closed before parsing a submission and no email is sent. Secure intake remains trigger-based roadmap
work.

## Flagship proof points

- OpenAI Responses boundary with streaming, strict structured outputs, no automatic fallback, and
  deterministic no-egress contract tests.
- BMF PAP 2026 and social-contribution validation against checksum-pinned official artifacts and
  mathematical fixtures.
- Privacy-aware Astro architecture: optional analytics, click-to-load comments, and contextual
  disclosure before external AI processing.
- Local-first XRechnung generation with separate fixture and offline KoSIT validation workflows.
- ReportView sanitization and permanent regression coverage for generated Markdown output.

## Architecture overview

| Layer | Current implementation |
| --- | --- |
| Framework | Astro 7.1.3, static output |
| Styling | Tailwind CSS v4 |
| Interactive islands | Svelte 5 |
| Content | Astro content, Markdown/MDX, KaTeX |
| Search | Pagefind |
| Hosting | Cloudflare Pages |
| Server boundary | Cloudflare Pages Functions |
| AI boundary | OpenAI Responses API only |
| Financial boundary | Browser-side deterministic TypeScript engines |

The provider mapping is defined by exported production constants and guarded by tests:

| Function | Model | Mode |
| --- | --- | --- |
| `chat.ts` | `gpt-5.6-terra` | SSE streaming |
| `compass.ts` | `gpt-5.6-sol` | high-reasoning SSE streaming |
| `cashflow-scenario.ts` | `gpt-5.6-terra` | strict structured output |
| `investment-analysis.ts` | `gpt-5.6-sol` | strict structured output |

All four OpenAI-backed Functions use the shared `/v1/responses` transport. It sets `store: false`
unconditionally and does not use provider-side conversation chaining. That flag disables
application-state persistence for the response object; it is not a general retention promise.

For containers, flows, trust zones, and source ownership, read
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deterministic finance and AI assistance

`src/lib/fin-core/`, `src/lib/cashflow/`, and `src/lib/investment/` own authoritative calculations.
Provider prompts receive already-computed inputs for explanation or scenario narrative. Provider
output cannot replace payroll, cashflow, return, risk, tax, or invoice results.

The financial suite covers boundary behavior, finite outputs, cent-level reconciliation, seeded
Monte Carlo reproducibility, official artifact hashes, BMF PAP behavior, contribution ceilings,
investment-tax rules, and disclosed limitations.

The Vorabpauschale calculation uses a documented smoothed annual capital path instead of historical
year-by-year market and basis-rate volatility. Full methodology:
[financial calculation validation](docs/operations/financial-calculation-validation-2026.md).

## Privacy and external services

- Ahrefs Web Analytics is optional and loads only after explicit analytics opt-in.
- Giscus comments are click-to-load; no embed request occurs before the visitor asks for comments.
- OpenAI receives content only after a visitor submits an AI action and sees contextual disclosure.
- Cloudflare supplies baseline hosting, CDN, and Pages Functions.
- cal.eu is an external navigation chosen by the visitor.
- Resend remains inactive with Sample Review.

The project does not equate `store: false` with an account-wide retention status. Technical behavior
is documented separately from legal conclusions, and qualified policy review remains a release gate.
See [privacy, consent, and external services](docs/operations/privacy-consent-external-services.md).

## Security and abuse controls

Pages Functions apply method, origin, media-type, size, schema, timeout, and normalized-error
contracts as relevant. Provider settings stay server-side. Tests inject local transports, making
timeout, rejection, malformed output, and quota cases reproducible without paid calls.

Current quotas are endpoint-specific:

- chat: four ordinary chat requests and one JD analysis per 24 hours;
- Founder Compass, cashflow narrative, and investment narrative: one server-side generation per
  seven days, with matching client cooldown behavior;
- Sample Review: a 60-second throttle, while the feature remains disabled.

The quotas use hashed-IP Cache API keys plus in-memory burst controls. Cloudflare Cache API state is
colo-local and check/set is not globally exact; it is an abuse-smoothing control, not distributed
accounting.

## Validation and quality model

Permanent suites use Node's native test runner, source guards, fixture data, and local builds. They
do not contact OpenAI, Ahrefs, Resend, or production services.

```bash
npm run verify:governance            # canonical documents, links, lifecycle, public audit boundary
npm run verify:repo-truth            # README commands and source-derived claims
npm run verify:release-provenance    # release identity, health, manifest, digest, and build-SBOM contracts
npm run verify:operational-controls  # request context, logging, failures, switches, provider/quota outcomes
npm run verify:dependency-tree       # exact npm-tree diagnostic allowlist
npm run verify:csp                   # generated Report-Only policy and minimized report collector
npm run verify:toolchain             # exact Node/npm/Linux release environment
npm run verify:workflows             # immutable Action pins and one future deployment owner
npm run verify:release-policy        # Sample Review/CSP/lineage/artifact-reuse contract
npm run verify:reproducibility       # host plus two isolated immutable-image builds
npm run verify:release-candidate     # full local gate including KoSIT, Wrangler, and Firefox
npm run verify:privacy               # consent and external-service no-egress boundaries
npm run verify:finance               # payroll, cashflow, investment, and official-source fixtures
npm run verify:function-contracts    # Pages Function transport and quota behavior
npm run verify:ai-provider-contracts # provider URL, models, streaming, schemas, failures
npm run verify:reportview-security   # generated Markdown sanitization
npm run verify:xrechnung:fixtures    # deterministic XML generation fixtures
npm run verify:xrechnung:kosit       # separate offline KoSIT gate; requires prepared Java cache
npm run lint:chat                    # chat source policy
npm run lint:content -- --strict     # content contracts
npm run lint:design-system:strict    # design token and style contracts
npm run lint:a11y:strict             # source and built-output accessibility checks
npm run check                        # Astro and TypeScript diagnostics
npm run build                        # static build and Pagefind index
npm run check:contrast               # color contrast guard
npm run build:release-artifacts      # ignored local deploy tree, manifest, checksums, and build dependency SBOM
npm run verify:postdeploy -- --base-url <url> --expected-release-id <id> --expected-source-revision <sha>
npm run plan:rollback -- --current-manifest <path> --target-manifest <path>
```

KoSIT is proportional: it is required for XRechnung/XML changes, not for unrelated documentation.
Browser validation is required for runtime UI behavior, not for a governance-only wave.

## Local development

Requirements:

- Node.js `>=22.12.0` and npm `>=9.6.5` for ordinary development;
- exact Node `22.22.3`, npm `11.16.0`, Linux x64/glibc for formal release evidence;
- Java only for the offline KoSIT workflow.

Use a clean reproducible install:

```bash
npm ci
npm run dev
```

Astro serves the static development site. To exercise Pages Functions locally, use the existing
Wrangler workflow:

```bash
npm run dev:copilot
```

This builds the site and starts the local Pages runtime. Missing provider keys return controlled
configuration errors; non-AI surfaces remain usable. Independent server-side controls can disable
Chat, Founder Compass, Cashflow AI, or Investment AI before quota/provider work; the inactive Sample
Review control defaults disabled. Accepted local values and fail-closed behavior are documented in
[operational controls and observability](docs/operations/operational-controls-observability.md).

## Environment and secrets

Copy `.dev.vars.example` to the ignored `.dev.vars` file for local Function secrets. Never commit
`.dev.vars`, real credentials, provider identifiers, or values copied from a dashboard.

Current names include:

- `OPENAI_API_KEY` for explicitly requested local AI actions;
- `RESEND_API_KEY`, `SAMPLE_REVIEW_EMAIL_FROM`, and `SAMPLE_REVIEW_EMAIL_TO` only for future,
  separately authorized Sample Review activation.

Ordinary test, check, and build commands need no real provider credential. Tests use synthetic keys
and injected transports.

## Release workflow

Local validation never deploys. A clean `npm run build:release-artifacts` creates ignored local
evidence. Its release identity has `schemaVersion`, `releaseId`, and `sourceRevision`; the offline
manifest additionally records clean-tree, commit-time, toolchain, configuration, artifact-tree, and
build dependency SBOM evidence. This complete lockfile graph includes development tooling and is not
a precise deployed-runtime SBOM. The local `/api/health` Function returns only the three public identity fields inside
the normalized response envelope, uses `no-store`, and does not check provider availability.

The future release path is:

1. prepare and identify a local release candidate;
2. obtain qualified review and explicit authorization for remote actions;
3. confirm live provider tiers and remote configuration;
4. review an authorized preview;
5. choose a public-history-safe integration method;
6. deploy the identified artifact;
7. verify release identity, routes, caches, privacy behavior, AI smoke tests, finance tools, and
   rollback readiness.

Raw internal audits were removed from the active tree, but deletion does not erase existing local
integration history. A future public release must not blindly fast-forward that internal lineage
into public `master`; use the reviewed release-commit procedure in the
[public release lineage strategy](docs/operations/public-release-lineage-strategy.md).

## Repository map

- [AGENTS.md](AGENTS.md) — provider-neutral agent and contributor governance.
- [docs/ROADMAP.md](docs/ROADMAP.md) — active implementation sequence and deferred capabilities.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — components, flows, trust boundaries, and limitations.
- [Pages Functions contracts](docs/operations/pages-functions-contracts.md) — transport envelopes and
  failure behavior.
- [AI Responses migration](docs/operations/ai-provider-responses-migration.md) — provider settings and
  contract evidence.
- [Financial validation](docs/operations/financial-calculation-validation-2026.md) — official sources,
  fixtures, and limitations.
- [Privacy and external services](docs/operations/privacy-consent-external-services.md) — consent and
  no-egress boundaries.
- [Cloudflare Pages configuration](docs/operations/cloudflare-pages-configuration.md) — candidate
  config and live-state boundary.
- [Release identity and provenance](docs/operations/release-identity-provenance.md) — local identity,
  artifact digest, manifest, and build dependency SBOM contracts.
- [Dependency hygiene](docs/operations/dependency-hygiene.md) — direct-use and advisory disposition.
- [Operational controls and observability](docs/operations/operational-controls-observability.md) —
  local structured events, failure/feature contracts, privacy boundary, and candidate indicators.
- [CSP reporting](docs/operations/csp-reporting.md) — browser-origin inventory, Report-Only policy,
  minimized collector, and retained inline allowances.
- [Release pipeline](docs/operations/release-pipeline.md) — exact toolchain, immutable workflows,
  release policy, artifact reuse, public lineage, and reproducibility.
- [Rollback and postdeployment](docs/operations/rollback-postdeploy.md) — mutation-free rollback
  planning and read-only local/future verification.
- [Public release lineage](docs/operations/public-release-lineage-strategy.md) — reviewed future
  release-commit and rollback method.
- [Secret rotation](docs/operations/secret-rotation-runbook.md) — authorized environment procedure.
- [Living documentation](docs/operations/living-documentation-lifecycle.md) — ownership and
  session-close impact review.
- [XRechnung/KoSIT operations](docs/operations/kosit-offline-validation.md) — pinned offline validator.
- [XRechnung conformance scope](docs/tools/xrechnung/CONFORMANCE.md) — supported syntax scope.
- [Public hardening summary](docs/audits/portfolio-hardening-summary-2026.md) — sanitized audit outcome.

Key source directories:

```text
src/pages/             static and localized routes
src/components/        Astro and Svelte UI
src/data/              project, service, and professional content
src/content/           blog and resources
src/lib/               deterministic engines, consent, and shared browser logic
functions/api/         Cloudflare Pages Functions
functions/_lib/        normalized HTTP and provider boundaries
tests/                 permanent contracts and repository truth guards
docs/operations/       focused living technical records
```

## Known limitations

- deployed production may lag repository canonical state;
- qualified privacy-policy review is outstanding;
- live access to both configured OpenAI model tiers is not yet canary-confirmed;
- Cache API quotas are not globally exact;
- Sample Review, Resend, secure uploads, and client intake are disabled;
- no authentication, client portal, admin portal, queue, or multi-provider layer exists;
- operational events and endpoint controls are local contracts only; remote collection, dashboards,
  alerts, configured remote switches, and measured production SLOs do not exist;
- the disclosed Vorabpauschale model uses a smoothed annual path;
- public history needs an explicit disclosure-safe release decision;
- GitHub/Cloudflare deployment ownership and required-check inventory are read-only verified
  (Phase 3-A); Cloudflare logging retention/export could not be inspected (upstream API error, not
  a permission denial); preview validation and the repository security baseline are Phase 3-B1/3-B2
  work, done; recurring monitoring automation and provider readiness remain Phase 3-B3/3-C work.

## Roadmap

[docs/ROADMAP.md](docs/ROADMAP.md) is the only active roadmap. Phase 2 (Astro 7.1.3 migration,
Phase 2D-B launch-scope lock, Phase 2D-C Product Completion, and Phase 2D-D dependency/security
acceptance, including a closure wave that fixed a bounded GitHub Advisory Database audit-coverage
gap) is done, fast-forward integrated into canonical, full 12-phase release-candidate gate passing —
locally only, no preview or production deployment has occurred. Phase 3 Human and Remote Readiness is
active: Phase 3-A's read-only GitHub/Cloudflare audit is done (`REMOTE-READINESS-CONDITIONAL`, no
remote mutation or deployment performed); Phase 3-B groups the remote-facing readiness work —
Phase 3-B1 (public-safe preview and Cloudflare automatic-deployment control) is done: Cloudflare's
automatic production deployment is disabled, a public-safe preview commit was validated live with a
real Cloudflare preview deployment and a real GitHub Actions `Quality Checks` run, and GitHub
`master`/Cloudflare production remained unchanged throughout; Phase 3-B2 (repository security
baseline) is done: Dependabot alerts and automated security fixes are enabled, CodeQL default setup
is configured and reached a terminal result, `master` branch protection is consolidated
(administrators enforced, linear history and conversation resolution required, no independent
reviewer added), and dedicated `preview`/`production` GitHub Environments exist alongside the
pre-existing ones, unchanged; Phase 3-B2 also closed a regulated-claims finding (public-facing
"Finanzberatung mit IHK-Zertifizierung" wording) found still live in canonical source, with permanent
tests; Phase 3-B3 (operational monitoring automation) is next; Phase 3-C (human and provider release
readiness) is planned after it. Secure intake, external APIs, portals, queues, provider abstraction,
and Workers Static Assets remain trigger-based or optional rather than implied features.

## License and contact

The repository is available under the [MIT License](LICENSE).

- Website: [me-mateescu.de](https://me-mateescu.de)
- LinkedIn: [Mihai Adrian Mateescu](https://www.linkedin.com/in/mihai-adrian-mateescu/)
