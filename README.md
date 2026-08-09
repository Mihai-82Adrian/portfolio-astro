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

- Two independent, opt-in-only analytics channels: Cloudflare Web Analytics (performance) and
  Ahrefs Web Analytics (acquisition), each with its own consent toggle and independent withdrawal.
- Giscus comments are click-to-load; no embed request occurs before the visitor asks for comments.
- YouTube embeds use exclusively the privacy-enhanced `youtube-nocookie.com` domain, also
  click-to-load.
- OpenAI receives content only after a visitor submits an AI action and confirms an unchecked-by-
  default, per-surface contextual consent checkbox; every AI Function rejects the request before
  any quota write or provider call if that confirmation is missing (Founder Compass, Cashflow, and
  Investment reject before any quota or rate-limit work at all; Chat's pre-existing, body-
  independent burst limiter and read-only quota lookup — shared with its consent-exempt
  deterministic fact-chip path — run first, an accepted ordering exception documented in
  [operational-controls-observability.md](docs/operations/operational-controls-observability.md)).
- Cloudflare supplies baseline hosting, CDN, and Pages Functions.
- The `/projects` GitHub summary is a static, periodically-refreshed snapshot; the browser never
  contacts `api.github.com`.
- cal.eu is an external navigation chosen by the visitor; no cal.eu resource loads before that click.
- Resend remains inactive with Sample Review.

The project does not equate `store: false` with an account-wide retention status. Technical behavior
is documented separately from legal conclusions; qualified external legal review is trigger-based for
this personal, non-commercial scope (see
[Current development and release state](#current-development-and-release-state)) rather than an open
release gate. See
[privacy, consent, and external services](docs/operations/privacy-consent-external-services.md).

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
do not contact OpenAI, Cloudflare Web Analytics, Ahrefs, Resend, or production services.

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

The release path — already exercised once for the Phase 4 controlled production release, and the
durable operating model for any future release — is:

1. prepare and identify a local release candidate;
2. obtain qualified review and explicit authorization for remote actions;
3. confirm live provider tiers and remote configuration;
4. review an authorized preview;
5. choose a public-history-safe integration method;
6. deploy the identified artifact;
7. verify release identity, routes, caches, privacy behavior, AI smoke tests, finance tools, and
   rollback readiness.

Raw internal audits were removed from the active tree, but deletion does not erase existing local
integration history. The Phase 4 production release used the reviewed release-commit procedure in the
[public release lineage strategy](docs/operations/public-release-lineage-strategy.md) rather than a
blind fast-forward of that internal lineage into public `master`; any future release must do the
same.

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

## Current development and release state

The deployed production site is built from public `master`. Public master/repository state and
deployed production state remain separate states as a matter of mechanism — a git commit and a live
deployment are always two different systems — even though, since the Phase 4 controlled production
release, they currently carry the same canonical content. A successful local check or build still
only describes the repository; the live release identity a deployment is actually serving is
observed independently through `/api/health` (see [Release workflow](#release-workflow)), not
inferred from a local build. **The Phase 4 controlled production release is complete** — production
was independently confirmed, via both the Cloudflare API and a live `/api/health` fetch, to serve the
canonical release; a local green build or a repository commit is still not, by itself, deployment
approval for any future change beyond this point.

Foundations delivered through Phase 4 include Function transport contracts, OpenAI Responses
integration, financial validation, privacy and consent boundaries, repository-truth checks, agent
governance, dependency closure, CSP Report-Only with minimized first-party reporting, exact release
tooling, and the unified local release-candidate gate. The documented public-release lineage was
executed after owner review, GitHub Actions deployment-ownership prerequisites were confirmed, and
post-deployment identity, route, cache, privacy, AI, and finance verification passed. Turnstile and
Resend remain inactive and are only required if the currently disabled Sample Review flow is
activated (Phase 6, trigger-based).

CodeQL default setup is configured; the two open alerts on the default branch
(`js/incomplete-url-substring-sanitization` in test-only source) are root-caused as a scanner pattern
match on a trusted-local-file documentation check rather than an untrusted-URL sanitization gap, with
a source fix prepared locally and pending a separately authorized remote CodeQL confirmation. GitHub
Dependabot vulnerability alerts are configured with 0 open alerts; a fresh `npm audit` and a live
GitHub Advisory Database scan (all record types) both found 0 unresolved applicable advisories
against the exact current lockfile. Automatic Cloudflare production deployment remains disabled
(`production_deployments_enabled: false`) — production is promoted only through the authorized
release-workflow path. The Phase 3/Phase 4 release-dependency freeze was lifted in
repository-canonical configuration once Phase 4 completed (`open-pull-requests-limit: 8` npm / `5`
github-actions); Dependabot security alerts/updates were never subject to that freeze, and the
restored limits take effect on GitHub only once merged to the default branch. See
[dependency-hygiene.md](docs/operations/dependency-hygiene.md) for the full disposition.

Phase 5 post-release stabilization is now active: its field-observation deliverables (Core Web
Vitals/INP, Function error rates, provider latency/cost, quota hit rates, CSP report analysis, 404
edge behavior, SLO calibration) are not yet actionable, since production has been live only a short
time as of this revision — each needs its own observation window before it produces meaningful
evidence.

**Owner privacy release decision (Phase 3-C Step 3E-A):** the technical/privacy review is complete,
and the owner has recorded an explicit risk-acceptance decision for this personal, non-commercial
portfolio scope. Qualified external legal review is trigger-based, not completed, for this scope —
it is not claimed as done, and this is not a claim of absolute legal compliance. External review
becomes required again under the explicit trigger conditions recorded in
[docs/ROADMAP.md](docs/ROADMAP.md) and
[privacy-consent-external-services.md](docs/operations/privacy-consent-external-services.md) — for
example, commercial/contractual use, real client data, or activating Sample Review/Resend. Those same
documents record that qualified privacy-policy review of specific open legal questions (the
Cloudflare controller/processor role split and the Art. 6(1)(a)/Art. 22 legal-basis wording) remains
open and required before any individualized legal conclusion can be drawn.

See [docs/ROADMAP.md](docs/ROADMAP.md) for exit criteria and authorization boundaries.

## Known limitations

Beyond the CodeQL/Dependabot/freeze status above:

- production `NODE_VERSION` (`22`) versus the formal-evidence toolchain pin is a pre-existing,
  disclosed parity gap — see
  [cloudflare-pages-configuration.md](docs/operations/cloudflare-pages-configuration.md) §9/§21;
- Cache API quotas are not globally exact;
- Sample Review, Resend, secure uploads, and client intake are disabled;
- no authentication, client portal, admin portal, queue, or multi-provider layer exists;
- operational events and endpoint controls are local contracts only; remote collection, dashboards,
  alerts, configured remote switches, and measured production SLOs do not exist;
- the disclosed Vorabpauschale model uses a smoothed annual path;
- Cloudflare account-level Logpush is confirmed not configured, and the Workers Observability API
  cannot retrieve the Pages-managed Functions script (a platform surface limitation for Pages
  Functions, not a permission denial) — accepted for this personal, low-volume, non-commercial
  release rather than a blocker.

## Roadmap

[docs/ROADMAP.md](docs/ROADMAP.md) is the only active roadmap and owns full phase-by-phase detail;
this section is a durable summary.

Phase 2 (Astro 7.1.3 migration and product completion) is done — Phase 2 itself involved no preview
or production deployment; that came later, through Phase 4.

Phase 3 Human and Remote Readiness is done: Phase 3-A (read-only GitHub/Cloudflare audit) is done,
Phase 3-B (remote controls and preview readiness — including disabling Cloudflare's automatic
production deployment and hardening the repository security baseline) is done, and Phase 3-C (human
and provider release readiness — including the Dependabot release freeze, live OpenAI canaries, and
the owner's privacy release decision) is done. Throughout Phase 3, GitHub `master` and Cloudflare
production remained two separate states and production did not change.

Phase 4 then executed the controlled production release, independently confirmed via both the
Cloudflare API and a live `/api/health` fetch; public master and production now converge on the same
canonical content while remaining, mechanically, separate states. Phase 5 post-release stabilization
is active; its field-observation deliverables are not yet actionable. Secure intake, external APIs,
portals, queues, provider abstraction, and Workers Static Assets remain trigger-based or optional
rather than implied features.

## License and contact

The repository is available under the [MIT License](LICENSE).

- Website: [me-mateescu.de](https://me-mateescu.de)
- LinkedIn: [Mihai Adrian Mateescu](https://www.linkedin.com/in/mihai-adrian-mateescu/)
