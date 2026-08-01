# Roadmap

This is the single active implementation roadmap and future-capability register for
me-mateescu.de. It sequences repository canonical work; it does not claim that locally complete work
is deployed.

## Status model

Allowed statuses are `DONE`, `ACTIVE`, `NEXT`, `PLANNED`, `TRIGGER-BASED`, `OPTIONAL`, and
`REJECTED`.

- Only one phase should normally be `ACTIVE`.
- `NEXT` identifies the next implementation phase.
- Trigger-based work is not scheduled merely because it is technically possible.
- New features require a demonstrated product or operational need.
- Completed items reopen only for a proven regression or changed requirement.
- Historical audit IDs may explain provenance but do not control sequencing.

## Phase 0 — Completed hardening foundation

Status: `DONE`

**Objective:** Establish an evidence-based, locally canonical foundation before public release work.

**Why now:** Product claims, transport boundaries, regulated calculations, privacy behavior, and Git
state needed a coherent baseline.

**Deliverables:**

- truth, professional-status, content, 404, routing, and cache hardening;
- dependency security refresh with remaining advisory risk explicitly retained;
- ReportView sanitization and security tests;
- Cloudflare candidate configuration-as-code without activation;
- normalized Pages Function transport contracts;
- chat's 24-hour server-side quota repair;
- OpenAI Responses migration and GPT-5.6 endpoint mapping;
- no-egress AI provider contract tests;
- official-source financial correctness validation;
- consent, optional analytics, embeds, and AI disclosure boundaries;
- repository-truth guard;
- repository, worktree, and branch consolidation.

**Dependencies:** None; this is the baseline.

**Remote mutation required:** **No.**

**Exit criteria:** Completed work is present in repository canonical state with permanent local tests.

## Phase 1 — Agent Governance & Public Repository Foundation

Status: `DONE`

**Objective:** Give agents and contributors one durable governance model and give public reviewers an
accurate repository entry point.

**Why now:** Future changes need stable authority, truth, validation, and disclosure boundaries before
release engineering expands.

**Deliverables:**

- root `AGENTS.md` constitution;
- minimal `CLAUDE.md` compatibility shim;
- rebuilt public `README.md`;
- living architecture overview;
- this active roadmap;
- removal of raw internal audits from the active public tree and a sanitized summary;
- governance tests and repository-truth extensions;
- deterministic CI integration.

**Dependencies:** Phase 0 source truth and recovery assets.

**Remote mutation required:** **No.**

**Exit criteria:** Documents agree with source, raw audits are absent from the active tree, permanent
guards pass, the canonical integration branch contains the reviewed local result, and no remote or
production state changed.

## Phase 2 — Operational Release Candidate

Status: `DONE`

**Objective:** Make an auditable, reversible release candidate without changing remote state.

**Why now:** The local release identity, operational controls, CSP boundary, pipeline policy,
reproducibility proof, rollback tooling, and unified gate are complete on Astro 6.4.8. Phase 2D
migrates the toolchain to Astro 7.1.3 and completes remaining product and security-acceptance work
on that foundation before remote activation is considered.

**Closure note:** Phase 2D-D's dependency-security acceptance (including the closure-wave GitHub
Advisory Database `reviewed`/`unreviewed`/`malware` coverage fix) is the last Phase 2 gap; with it
closed and fast-forward integrated into canonical, Phase 2 and all of its sub-phases are locally
complete. This is a repository-canonical, locally-validated completion — no preview or production
deployment has occurred, and Phase 3's remote GitHub/Cloudflare readiness and recurring online
security monitoring remain separate, not-yet-started scope.

### Phase 2A — Release Identity, Provenance & Dependency Closure

Status: `DONE`

**Deliverables:**

- source-grounded dependency and npm-script closure with explicit advisory disposition;
- deterministic release identity and a minimal no-egress `/api/health`;
- clean-source release manifest, artifact-tree digest, and normalized CycloneDX SBOM;
- public-history-safe release lineage strategy with a local tree-equivalence proof;
- secret-rotation runbook;
- controlled living-documentation lifecycle and permanent provenance/governance guards.

**Dependencies:** Phase 1 and a current advisory inventory.

**Remote mutation required:** **No.**

**Exit criteria:** A clean local source tree reproducibly produces linked identity, deployable-tree,
manifest, checksum, and SBOM evidence; the health contract and dependency dispositions are permanent
and locally verified.

### Phase 2B — Operational Controls & Observability

Status: `DONE`

**Deliverables:**

- structured logs for approved operational fields;
- a strict log allowlist excluding prompts, email addresses, IP addresses, and pseudonymous
  identifiers;
- per-endpoint kill switches;
- initial candidate SLOs;
- an explicit failure taxonomy for transport, configuration, quota, provider, and internal failures.

**Dependencies:** Phase 2A release identity and Function contracts.

**Remote mutation required:** **No** for repository implementation; any later configuration activation
requires separate authorization.

**Exit criteria:** Every Function has tested disable behavior, logs contain only allowlisted fields,
candidate SLOs and failure classes are documented, and no sensitive or pseudonymous input is logged.

### Phase 2C — CSP, Pipeline & Unified Release Gate

Status: `DONE`

**Deliverables:**

- CSP Report-Only with an actual minimized report collector;
- deployment-workflow modernization with SHA-pinned GitHub Actions and concurrency control;
- a single deploy owner;
- rollback and post-deployment tooling;
- cross-environment reproducibility verification;
- one `verify:release-candidate` command composing the final deterministic gate.

**Dependencies:** Phase 2B controls and SLO/failure contracts.

**Remote mutation required:** **No** for local implementation; no workflow, preview, production, or
remote configuration was activated.

**Exit criteria:** CSP collection is minimized and tested, deterministic CI has one deployment owner,
rollback/post-deployment commands are reviewable, and the unified local release-candidate gate passes.

### Phase 2D — Astro 7 Foundation and Product Completion

Status: `DONE`

**Objective:** Migrate the canonical toolchain to Astro 7 on a validated, reversible basis, then use
that foundation to close remaining product-scope, completion, and security-acceptance gaps before
Phase 3 human and remote readiness begins.

**Why now:** Phase 2A–2C produced a reviewable release candidate on Astro 6.4.8. Astro 7.1.3 closes
otherwise-unresolved framework advisories and keeps the toolchain current before Phase 3 asks for
human and remote decisions on a candidate that should not need a mid-review framework migration.

**Dependencies:** Phase 2A–2C release candidate.

**Remote mutation required:** **No.**

#### Phase 2D-A — Astro 7 Foundation Migration

Status: `DONE`

**Objective:** Migrate the canonical toolchain from Astro 6.4.8 to Astro 7.1.3 on an isolated
experiment branch, close every technical acceptance gap, and integrate it into canonical only after
a full formal gate passes.

**Deliverables:**

- the exact Astro 7.1.3 target dependency graph with zero current `npm audit` findings for the
  target lockfile and zero unresolved Critical/High advisories;
- Sharp and esbuild advisory thresholds satisfied;
- the Unified Markdown processor (`@astrojs/markdown-remark`'s `unified()`) pinned and permanently
  enforced by the unified release gate, rejecting the Astro 7 default Sätteri processor;
- structural validation of all three materially distinct PDF export paths;
- a representative visual regression matrix;
- the complete 12-phase `verify:release-candidate` gate passing on the migrated, documentation-
  synchronized graph;
- host-plus-two-Docker reproducibility;
- Firefox, KoSIT, XRechnung, Pagefind, CSP, `_worker.js`, Functions, and postdeploy validation;
- canonical integration by fast-forward only, with no remote or production deployment.

**Dependencies:** Phase 2C release candidate and an isolated experiment worktree/branch.

**Remote mutation required:** **No.**

**Exit criteria:** The documentation-synchronized experiment HEAD passes the full formal gate,
canonical fast-forwards to that exact HEAD and tree, and the experiment worktree/branch are removed
after independent evidence packaging.

#### Phase 2D-B — Product Scope Audit and Launch Lock

Status: `DONE`

**Objective:** Audit the product surface actually present in the migrated canonical state against
public claims and the roadmap, and lock the launch scope before further product or security work.

**Why now:** The Astro 7 foundation is integrated; before adding or finishing product surfaces, the
current scope needs an evidence-based audit so later phases do not chase an undefined target.

**Deliverables:**

- an inventory of every public route, tool, and claim against current source;
- reconciliation of `README.md` and `docs/ARCHITECTURE.md` claims with the migrated Astro 7 graph;
- an explicit, owner-reviewed launch-scope lock: what ships in the next production release and what
  is explicitly deferred;
- a gap list feeding Phase 2D-C.

**Dependencies:** Phase 2D-A canonical integration.

**Remote mutation required:** **No.**

**Exit criteria:** A recorded scope-lock decision exists, README/architecture claims match source,
and Phase 2D-C's deliverables are drawn only from the locked scope. Met: the 51-entry product-scope
register, public-claim/tool/AI-capability matrices, and six owner-decision packages are recorded in
[docs/product/PHASE_2D_LAUNCH_SCOPE_LOCK.md](product/PHASE_2D_LAUNCH_SCOPE_LOCK.md), with full
supporting evidence held in the external Phase 2D-B audit package.

#### Phase 2D-C — Product Completion

Status: `DONE`

**Objective:** Close the gaps identified by the Phase 2D-B scope audit within the locked launch
scope defined in
[docs/product/PHASE_2D_LAUNCH_SCOPE_LOCK.md](product/PHASE_2D_LAUNCH_SCOPE_LOCK.md).

**Why now:** Only after scope is locked, so completion work targets an agreed surface rather than an
open-ended list.

**Deliverables:** Six waves defined by the locked scope.

**Dependencies:** Phase 2D-B scope lock.

**Remote mutation required:** **No** for local implementation; any activation of a currently
inactive feature requires separate authorization.

**Exit criteria:** Every locked-scope gap is closed with permanent tests, or explicitly deferred with
a recorded reason. Met: all six waves closed and fast-forward integrated into canonical, with the
full 12-phase `verify:release-candidate` gate passing on the final Product Completion HEAD. Product
Completion is locally complete only — no preview or production deployment has occurred, and
dependency/security acceptance (Phase 2D-D) and remote security readiness (Phase 3) remain open. See
the external Phase 2D-C canonical integration package for the full register and evidence.

##### Wave 1 — Public Truth, Route Integrity and Launch Safety

Status: `DONE`

Fast-forward integrated into canonical after permanent-enforcement and evidence closure (unified
release-gate composition, an extended route-integrity verifier covering `_redirects`, JSON-LD, and
social/page metadata, and negative-enforcement probes). See the external Wave 1 closure package for
the full register and evidence.

##### Wave 2 — Fin-Tools Professional Completion

Status: `DONE`

Fast-forward integrated into canonical after RUNWAY-01 zero-activity semantics were resolved per
owner decision, the six-tool desktop/mobile browser acceptance matrix was completed, and the full
12-phase `verify:release-candidate` gate passed. See the external Wave 2 closure package for the
full 12-entry register and evidence.

##### Wave 3 — AI Reliability and Recruiter Experience

Status: `DONE`

Fast-forward integrated into canonical after the acceptance closure register reached zero `OPEN`/
`BLOCKED-OWNER` entries (recruiter result schema and server-side validation, `verify:ai-reliability`
composed into the unified `verify:release-candidate` gate, deterministic-intent language-detection
and `/ai` English-copy defects found and fixed during closure, ChatWidget textarea/select
accessibility fix), the desktop/mobile browser acceptance matrix was completed, and the full
12-phase `verify:release-candidate` gate passed. See the external Wave 3 closure package for the
full register and evidence.

##### Wave 4 — Homepage, Positioning and Service Funnel

Status: `DONE`

Fast-forward integrated into canonical after the acceptance closure register reached zero `OPEN`/
`BLOCKED-OWNER` entries (browser-matrix row-count correction, homepage Fin-Tools Hub card
German-language/DACH disclosure on the German-only `/tools` product, German About description
grammar fix), the extended desktop/mobile browser acceptance matrix passed 9/9, and the full
12-phase `verify:release-candidate` gate passed. See the external Wave 4 closure package for the
full register and evidence.

##### Wave 5 — Content, SEO, Localization and Proof

Status: `DONE`

Fast-forward integrated into canonical after the acceptance closure register reached zero `OPEN`/
`BLOCKED-OWNER` entries: the 3 Anthropic AI Fluency certificates were moved into a dedicated
"AI & Professional Development" category (DE/EN/RO) with visible descriptions, bounded partnership
attribution, and completion-certificate wording; the invalid `WorkExperience` JSON-LD type was
replaced with a valid `OrganizationRole` nested under `Person.worksFor`; and the Pagefind runtime
accessibility warning was promoted to a launch-critical Wave 6 carry-in. The full 12-phase
`verify:release-candidate` gate passed. See the external Wave 5 closure package for the full
register and evidence.

##### Wave 6 — Product Acceptance and Security Handoff

Status: `DONE`

Closed the Wave 6 carry-in (Pagefind search input/label association and runtime accessibility),
added the Fin-Tools localStorage persistence contract and the final product-acceptance route/hub
contracts, and fast-forward integrated into canonical after the full repository-wide permanent suite
passed 510/510 with 0 failures (`tests/full-suite.log` is authoritative) and the full 12-phase
`verify:release-candidate` gate passed. The Wave 5 `OrganizationRole`-under-`Person.worksFor`
structured-data pattern was independently re-verified against the official Schema.org Role
intermediary pattern and confirmed semantically valid; no source change was required. See the
external Phase 2D-C canonical integration package for the full register and evidence.

#### Phase 2D-D — Product and Dependency Security Acceptance

Status: `DONE`

**Objective:** Perform a final security and dependency acceptance pass across the completed product
scope and the Astro 7 graph before Phase 3 human and remote readiness begins.

**Why now:** Phase 3 asks for human and remote decisions; those decisions should rest on a candidate
that has already passed a dedicated security/dependency acceptance pass, not only the standing
release-candidate gate.

**Deliverables:**

- a fresh dependency-advisory pass against the then-current lockfile;
- a focused security review of any surface added in Phase 2D-C;
- confirmation that abuse controls, sanitization, and privacy/consent boundaries are unchanged or
  improved;
- a recorded acceptance decision gating entry into Phase 3.

**Dependencies:** Phase 2D-C product completion.

**Remote mutation required:** **No.**

**Exit criteria:** The acceptance decision is recorded, and no unresolved Critical/High finding
remains open against the locked scope. Met: `PHASE2D-D-READY-FOR-INTEGRATION`, fast-forward
integrated into canonical. A closure wave fixed a bounded audit-coverage gap found by independent
review — the original GitHub Advisory Database queries omitted `type`, so they covered only the
default `reviewed` class for 23 hand-selected packages. The closure added a reproducible,
permanently-tested scanner (`scripts/security/github-advisory-scan.mjs`,
`tests/github-advisory-scan.test.mjs`, composed into `verify:release-candidate`) and ran it against
every one of the 704 exact package/version pairs in the unchanged lockfile for all three advisory
types (`reviewed`, `unreviewed`, `malware`): zero applicable records in every class, plus a fresh
`npm audit --json` at 0/0/0/0/0. The security register has zero `OPEN` entries and the complete
12-phase gate passed again on the closed HEAD. See the external Phase 2D-D closure package for the
full register, query matrix, and evidence.

## Phase 3 — Human and Remote Readiness

Status: `ACTIVE`

**Objective:** Obtain the human decisions and controlled remote evidence that local tests cannot
provide.

**Why now:** Only after Phase 2 produces a reviewable candidate.

### Phase 3-A — Remote Inventory

Status: `DONE`

Read-only GitHub and Cloudflare inventory (deployment ownership, build/compatibility configuration,
required checks, branch protection, Dependabot/CodeQL/secret-scanning state, production HTTP
checks) plus a corrected deployment model: Cloudflare Pages' own Git integration — not the retired
`deploy.yml` GitHub Actions workflow — deploys every push to `master` automatically
(`trigger=github:push`); `deploy.yml` produced only a redundant `trigger=ad_hoc` deployment of the
same commit. Closed with decision `REMOTE-READINESS-CONDITIONAL`, gated on Phase 3-B1 owner
authorization and a Cloudflare observability API retry. No remote mutation, preview, or production
deployment occurred.

### Phase 3-B — Remote Controls and Preview Readiness

Status: `ACTIVE`

Groups the remote-facing work needed before a controlled production cutover: disabling Cloudflare's
automatic production-deployment trigger, proving and validating a public-safe preview lineage,
repository security baseline hardening, and operational monitoring automation. This supersedes the
prior single-batch "Batch 0 through Batch 6" sequencing recorded in the historical Batch 0
cutover-preflight package; that package remains evidence of the read-only audit, strategy
comparison, and local CI-contract fix it performed (fast-forward integrated into canonical), not a
current execution order.

#### Phase 3-B1 — Public-Safe Preview and Deployment Control

Status: `DONE`

**Objective:** Disable Cloudflare's automatic production-deployment trigger, build and push a
public-safe preview commit, and validate it live — with GitHub `master` and Cloudflare production
untouched — before any production dispatch is authorized.

**Deliverables:**

- Cloudflare `production_deployments_enabled` PATCH (`true` → `false`), verified field-by-field
  against a pre-change baseline;
- a public-safe preview commit reproducing the approved canonical tracked tree, parented on current
  public `master`, carrying the existing `Canonical-Source`/`Canonical-Tree`/`Canonical-Artifact`/
  `Release-Manifest` trailers, verified by `npm run verify:public-release-lineage`, pushed to
  `release/phase-3b-cutover` (not `master`);
- a Draft Pull Request (`release/phase-3b-cutover` → `master`) as preview/evidence only, explicitly
  not authorized for merge;
- empirical confirmation that `quality-gates.yml`'s `quality` job — which explicitly sets
  `name: Quality Checks` — is the exact check-run name and context a real GitHub Actions run
  produces, satisfying the existing branch-protection required check without a branch-protection
  mutation;
- a live Cloudflare preview deployment for the exact preview commit, validated with
  `verify:postdeploy` and proportional smoke checks.

**Met:** Cloudflare's `production_deployments_enabled` PATCH verified with only that one field
changed; a public-safe preview commit was pushed to `release/phase-3b-cutover` and opened as a Draft
PR (preview/evidence only, not authorized for merge); two independent real GitHub Actions runs (push
and pull-request triggers) both produced a `Quality Checks` check-run context that satisfied the
existing branch-protection required check, with no branch-protection mutation; the resulting
Cloudflare preview deployment passed `verify:postdeploy` and proportional smoke checks. GitHub
`master` and Cloudflare production remained unchanged throughout. See the external Wave 1 evidence
package for the full record.

**Dependencies:** Phase 3-A inventory.

**Remote mutation required:** **Yes** — the Cloudflare PATCH above, the preview branch push, and the
Draft PR creation. No `master` push, no branch-protection mutation, no production deployment.

**Exit criteria:** The preview commit lineage verifies, the preview deploys and passes postdeploy
validation, and the empirical `Quality Checks` context is confirmed — with GitHub `master` and
Cloudflare production still serving their pre-wave state.

#### Phase 3-B2 — Repository Security Baseline

Status: `DONE`

**Objective:** Harden the repository's remote security posture once deployment control and preview
lineage are proven. Also closed a regulated-claims finding (CL-04, identified 2026-07-18, never
implemented) discovered still live in canonical source during this wave's evidence-package sweep.

**Deliverables (grouped; each item separately authorized at execution time):**

- Dependabot alerts and controlled dependency-update PRs;
- CodeQL default setup;
- branch-protection/ruleset hardening;
- GitHub Environments and reviewer protection;
- Actions permissions/policy review.

**Met:** Dependabot vulnerability alerts and automated security fixes enabled; CodeQL default setup
configured for JavaScript/TypeScript, reaching a terminal result (9 alerts, all `warning`-rule/
`high`-CWE-severity but none reachable from a live attack surface on triage — 6 in the vendored
third-party KaTeX library, 2 in trusted-local-input build/dev-tooling scripts, 1 in a blog
reading-time utility whose sanitized output is never rendered; none dismissed, all documented for
owner review); `master` branch protection consolidated (`enforce_admins`, `required_linear_history`,
`required_conversation_resolution` all `true`; `Quality Checks` required-check context and
`allow_force_pushes`/`allow_deletions` unchanged; no required-reviewer rule added, since there is no
independent reviewer); Actions `sha_pinning_required` enabled (`allowed_actions` deliberately left at
`all` — an exact allowlist could not be safely proven not to block GitHub-managed CodeQL default-setup
runs); `preview` (no required reviewer, limited to `release/*`) and `production` (required reviewer =
owner, limited to `master`, `prevent_self_review: false`) GitHub Environments created without
touching the pre-existing `portfolio-astro (Preview/Production)` environments. Additionally closed
CL-04 (BentoGrid's "Finanzberatung mit IHK-Zertifizierung"), CL-05 (corpus.jsonl's unqualified
restructuring-strategy offer), and CL-06/R5.6a (an employment-vs-service-offer ambiguity in the chat
assistant's evidence handling) with permanent source-of-truth tests, and hardened
`scripts/release/public-lineage.mjs` to require an explicit `--public-parent` whenever local
`refs/heads/master` and `refs/remotes/origin/master` disagree. See the external Wave 2 evidence
package for the full record.

**Dependencies:** Phase 3-B1 success.

**Remote mutation required:** **Yes**, per item, each separately authorized.

#### Phase 3-B3 — Operational Monitoring Automation

Status: `NEXT`

**Objective:** Add recurring, outbound-only remote monitoring once the security baseline is in
place.

**Deliverables (grouped; each item separately authorized at execution time):**

- scheduled dependency-advisory workflow;
- outbound-only alerting;
- Cloudflare release-identity watchdog;
- Cloudflare deployment/log monitoring.

**Dependencies:** Phase 3-B2.

**Remote mutation required:** **Yes**, per item, each separately authorized.

### Phase 3-C — Human and Provider Release Readiness

Status: `PLANNED`

**Objective:** Close the remaining human-review and live-provider gaps before a controlled
production release.

**Deliverables:**

- qualified privacy-policy review;
- fresh online dependency-advisory review;
- Cloudflare log capture, retention, sampling, access, export, Logpush, visibility, and
  data-region review;
- one OpenAI Terra canary;
- one OpenAI Sol canary;
- live project, model, and rate-limit confirmation;
- remote feature-variable parity;
- final release-candidate preview and human acceptance.

**Dependencies:** Phase 3-B's remote controls in a known, authorized state (Phase 3-B1 at minimum;
Phase 3-B2/3-B3 as the owner separately schedules them).

**Remote mutation required:** **Yes.** Every provider, GitHub, Cloudflare, preview, or settings
action requires precise authorization at execution time. Phase 3-A performed none — it was strictly
read-only.

**Exit criteria:** Human review is recorded, both live model tiers are confirmed, remote controls match
the candidate, and preview evidence supports or rejects production release.

## Phase 4 — Controlled Production Release

Status: `PLANNED`

**Objective:** Release an approved artifact into the public production lineage with verification and
rollback readiness.

**Why now:** Only after human and remote readiness succeeds.

**Deliverables:**

- approved integration into public production lineage;
- a public-history/audit-disclosure-safe release method;
- production deployment and release SHA verification;
- 404 and cache matrix;
- privacy and optional-analytics behavior checks;
- click-to-load embed checks;
- AI smoke tests with controlled spend;
- deterministic finance-tool checks;
- hreflang verification;
- CSP report review;
- rollback readiness and decision record.

**Dependencies:** Phase 3 approval and Phase 2 provenance.

**Remote mutation required:** **Yes.** Production lineage and deployment actions require explicit
authorization.

**Exit criteria:** Approved production serves the identified artifact, post-deployment checks pass,
and the rollback path is ready.

**Public-history constraint:** Raw internal audits were removed from the current tree, not from local
integration history. A blind fast-forward of that lineage into public `master` is not assumed safe.
Use a reviewed squash/release commit or another explicitly approved public-history-safe method. Do
not rewrite history as part of ordinary release preparation.

## Phase 5 — Post-release Stabilization

Status: `PLANNED`

**Objective:** Confirm that the release behaves safely and efficiently under real traffic.

**Why now:** Lab validation cannot supply field performance or operational baselines.

**Deliverables:**

- field Core Web Vitals and INP review;
- Function error-rate monitoring;
- provider latency and cost review;
- quota hit-rate analysis;
- CSP report analysis and enforcement decision;
- privacy-boundary revalidation;
- 404 edge behavior review;
- SLO review and threshold adjustment.

**Dependencies:** Phase 4 release and enough observation time for meaningful baselines.

**Remote mutation required:** **Yes** for dashboards or enforcement changes; read-only observation
still requires appropriate access.

**Exit criteria:** SLOs reflect field evidence, regressions are classified, CSP has an explicit
decision, and unresolved release risks have owners.

## Phase 6 — Sample Review & Secure Client Intake

Status: `TRIGGER-BASED`

**Objective:** Build secure client intake only when the service requires real document submission and
review workflow.

**Why now:** It is deferred. The existing form route fails closed and does not justify upload or queue
infrastructure.

**Deliverables when triggered:**

- Turnstile;
- Resend activation;
- secure uploads and signed upload URLs for private storage;
- MIME, type, and size validation;
- malware and content-scanning strategy;
- retention, expiry, and deletion policy;
- no attachment forwarding by default;
- idempotency;
- asynchronous queue and controlled retries;
- request status tracking;
- HMAC-peppered safety identifier;
- distributed quotas;
- endpoint kill switch;
- minimized audit trail.

Likely flow:

```text
browser
→ Turnstile
→ request ticket
→ signed private upload
→ validation/scanning
→ queue
→ controlled review workflow
→ notification
→ expiry/deletion
```

**Dependencies:** Validated product demand, qualified privacy review, storage and threat model, and
operational ownership.

**Remote mutation required:** **Yes.** Turnstile, Resend, storage, queue, secrets, and bindings require
separate authorization.

**Trigger/defer condition:** Trigger only for an approved client-intake offering with retention,
review, deletion, and incident ownership. Otherwise keep email delivery disabled.

**Exit criteria:** Threat model, privacy review, no-egress tests, upload/scanning controls,
idempotency, queue failure behavior, expiry, and deletion are proven in preview before activation.

## Phase 7 — External API & Platform Capabilities

Status: `TRIGGER-BASED`

**Objective:** Add platform surfaces only after a real external consumer or access-control use case
exists.

**Why now:** No current client requires a public API, authentication, portal, or background platform.

**Deliverables when triggered:**

- `/api/v1` and versioned schemas;
- compatibility policy and API changelog;
- authentication and authorization;
- admin portal and client portal;
- explicit role boundaries;
- shared idempotency standard;
- circuit breakers;
- provider abstraction only after a second real provider exists;
- durable or queue infrastructure only when workload characteristics require it.

**Dependencies:** Named consumer, support model, threat model, data classification, SLO, and lifecycle
ownership.

**Remote mutation required:** **Yes** for identity, storage, bindings, or deployed platform changes.

**Trigger/defer condition:** A signed-off product or operational need with an accountable consumer.
Technical possibility alone is insufficient.

**Exit criteria:** Versioning, access control, compatibility, abuse controls, observability, migration,
and deprecation are testable and documented.

## Phase 8 — Product Authority & Conversion

Status: `PLANNED`

**Objective:** Strengthen public authority and conversion using released proof rather than claims.

**Why now:** Proof-based positioning is most credible after production stabilization.

**Deliverables:**

- disciplined “CFO meets CTO” positioning;
- proof-based homepage and project hierarchy;
- sanitized public case studies for:
  - the Responses migration;
  - BMF PAP validation;
  - privacy-aware Astro architecture;
  - XRechnung and separate KoSIT validation;
- services funnel and AI data-preparation positioning;
- ghost-offer removal;
- `/now` update;
- analytics-informed conversion work only after production stabilization and valid opt-in data.

**Dependencies:** Phase 5 evidence and approved public disclosure.

**Remote mutation required:** **No** for local content work; publication requires authorized release.

**Exit criteria:** Every authority claim links to public proof, inactive offers are absent, and
conversion decisions use privacy-compliant evidence.

## Phase 9 — Modernization Experiments

Status: `OPTIONAL`

**Objective:** Time-box future-platform learning without blocking the current release.

**Why now:** Only when capacity exists after release work or a concrete compatibility trigger appears.

**Experiments:**

- Workers Static Assets proof of concept;
- advanced Cloudflare logs;
- multi-provider AI exploration;
- richer RAG and evaluation layer;
- experimental portal work;
- additional background-processing experiments.

**Dependencies:** A written hypothesis, bounded spike, rollback, and no contamination of release work.

**Remote mutation required:** **No** for local spikes; any provider or platform proof outside local
fixtures requires separate authorization.

**Trigger/defer condition:** Run only when the experiment answers a current decision. Delete or archive
it when the question is answered.

**Exit criteria:** A concise evidence report recommends adopt, defer, or reject. This phase is optional
and does not block the current release.

## Rejected defaults

Status: `REJECTED`

- speculative provider abstraction with one provider;
- queues or durable state for synchronous low-volume work;
- public release by blindly fast-forwarding internal audit history;
- activating Sample Review without Turnstile, retention, and operational ownership;
- treating a green local build as deployment approval.
