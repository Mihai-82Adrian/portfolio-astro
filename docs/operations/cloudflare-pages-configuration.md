# Cloudflare Pages configuration

Status: **R10.0 — codified, not yet activated.** This document and `wrangler.jsonc` at the repo
root are configuration-as-code candidates. As of this writing, the Cloudflare dashboard remains
the live source of truth for the `portfolio-astro` Pages project; `wrangler.jsonc` only becomes
authoritative on the controlled activation event described below (R10.0b).

## 1. Project identity

| Field | Value |
|---|---|
| Project name | `portfolio-astro` |
| Framework | Astro 7.2.0 |
| Production branch | `master` |
| Git provider | GitHub, `Mihai-82Adrian/portfolio-astro` |
| Uses Pages Functions | yes (`functions/api/*`) |
| Account | "Mihai.mateescu@web.de's Account" (id withheld from this document) |

## 2. Domains (dashboard-managed)

| Domain | Status |
|---|---|
| `portfolio-astro-2do.pages.dev` | default, active |
| `me-mateescu.de` | active, certificate active (Google Trust Services, auto-renews via ACME) |

No unexpected additional domains were found. Domain attachment, DNS, and certificates are managed
through the Cloudflare dashboard/zone and are **not** representable in Pages' Wrangler
configuration file — they stay dashboard-managed regardless of config-as-code activation.

## 3. Git/build settings (dashboard-managed, not codified)

| Field | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (repo root) |
| Build image | v3 (Cloudflare build system) |
| Preview deployments | restricted (`preview_deployment_setting: "custom"`, `preview_branch_includes: ["release/*"]`) — narrowed from the original "all branches" setting by Phase 3-B3; confirmed live and unchanged through Phase 3-C Step 1B |
| PR comments | enabled |

For Pages projects using Git integration, the build command, root directory, and Git connection
itself are **not** controllable from `wrangler.jsonc` — only `pages_build_output_dir` is
representable in the config file (confirmed against current Cloudflare docs, July 2026). These
fields remain dashboard-managed after activation and are unaffected by this change.

## 4. Build-system eligibility

The project already runs on the v3 build image, which satisfies the "V2 build system or later"
requirement for Wrangler-file-based Pages configuration. No build-image change is required to
activate config-as-code.

## 5. Wrangler version requirement

- Repository-locked Wrangler: `^4.81.1` (installed: `4.81.1`), well above the documented minimum
  of `3.45.0` for Pages Wrangler-file support.
- `node_modules/wrangler/config-schema.json` is present and is the schema referenced by
  `$schema` in `wrangler.jsonc`.

## 6. Config-as-code source-of-truth boundary

Per current Cloudflare documentation, once a Wrangler configuration file is deployed for a Pages
project, **it becomes the source of truth for the fields it defines**, and those specific fields
become read-only in the dashboard. Fields the file does not define are unaffected and remain
dashboard-editable. Concretely for this project:

**Becomes codified (`wrangler.jsonc`) on activation:**
- `name`, `pages_build_output_dir`, `compatibility_date`, `compatibility_flags`
- `vars` (`NODE_VERSION`) for local dev, production, and preview

**Remains dashboard/API-managed regardless of activation:**
- Git repository connection, production branch, build command, root directory
- Custom domains, DNS, TLS/certificates
- Secrets (`OPENAI_API_KEY`) — Pages secrets are never stored in the Wrangler file
- Web Analytics beacon tag/token
- Preview-branch inclusion rules, PR comments toggle

## 7. Candidate field mapping (`wrangler.jsonc`)

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "portfolio-astro",
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2025-11-14",
  "vars": { "NODE_VERSION": "24.19.0" },
  "env": {
    "preview":    { "vars": { "NODE_VERSION": "24.19.0" } },
    "production": { "vars": { "NODE_VERSION": "24.19.0" } }
  }
}
```

**Wave 1A update (2026-08-14):** the candidate `NODE_VERSION` above moved from `22.22.3` to
`24.19.0` alongside the repository-local Node 24 LTS toolchain migration (`.node-version`,
`release/Dockerfile.reproducibility`, `package.json` `packageManager`). This is a repository-local,
inactive-candidate edit only — it does not mutate the live Cloudflare dashboard.

**Discrepancy reconciled (2026-08-14, Wave 1A):** prior text in this document described the live
dashboard `NODE_VERSION` as the bare, broader value `"22"`. A fresh, read-only, live MCP query of
the `portfolio-astro` Pages project on 2026-08-14 (during this wave) found the actual current
remote value is the **exact** string `"22.22.3"` for both `preview` and `production` — not `"22"`.
The `"22"` observation in the rest of this document (§7 second column, §9, §11) is therefore stale
and is preserved below only as a historical record of what was observed at that earlier time; the
value confirmed fresh in this wave is `22.22.3` exact, for both environments. This does not change
the parity conclusion (remote is not `24.19.0`), but it does mean the pre-Wave-1A remote/repository
gap was narrower than documented — the remote dashboard already matched the repository's exact
pre-Wave-1A pin. `production_deployments_enabled` was independently reconfirmed `false` in the same
read, unchanged. No remote value was mutated by this read or by this wave.

| Field | Candidate | Live dashboard (MCP, fresh 2026-08-14) | `wrangler pages download config` (earlier observation) | Verdict |
|---|---|---|---|---|
| `name` | `portfolio-astro` | `portfolio-astro` | `portfolio-astro` | exact parity |
| `pages_build_output_dir` | `./dist` | `destination_dir: dist` | `dist` | intentional normalization (`./dist` is the documented canonical form; resolves identically) |
| `compatibility_date` | `2025-11-14` | `2025-11-14` (both envs) | `2025-11-14` | exact parity |
| `compatibility_flags` | omitted | `[]` (both envs) | omitted | exact parity (empty is the schema default) |
| `vars.NODE_VERSION` (top-level) | `"24.19.0"` | preview & production: `"22.22.3"` exact (reconciled, see above; dated observation, 2026-08-14) | `"22"` (earlier, now superseded observation) | **Resolved (Wave 1B-R1, 2026-08-15) — see §23.** Cloudflare build-config now reads `"24.19.0"` for both environments. |
| `env.production.vars.NODE_VERSION` | `"24.19.0"` | fresh 2026-08-14: `"22.22.3"` exact (dated observation) | `"22"` (earlier, superseded) | **Resolved (Wave 1B-R1, 2026-08-15) — see §23.** |
| `env.preview.vars.NODE_VERSION` | `"24.19.0"` | fresh 2026-08-14: `"22.22.3"` exact (dated observation) | *(not emitted — download-config only wrote top-level + production)* | **Resolved (Wave 1B-R1, 2026-08-15) — see §23.** |
| `OPENAI_API_KEY` | not present | secret, set (both envs) | not present (secrets are never downloaded) | secret intentionally excluded from source control |
| `RESEND_API_KEY`, `SAMPLE_REVIEW_EMAIL_FROM`, `SAMPLE_REVIEW_EMAIL_TO` | not present | **not present in either environment** | not present | unresolved — see §9 blocker |
| Bindings (KV/D1/R2/DO/queues/Hyperdrive/Vectorize) | none | none | none | exact parity — nothing to represent |
| `account_id` | omitted | n/a | n/a | correctly omitted — not required for this Pages project, avoids embedding an account identifier |
| `web_analytics_tag`/`token`, `build_command`, `root_dir`, git config | not representable | present | not present | dashboard-managed, not representable in Pages Wrangler config |

## 8. Production/preview inheritance model (Pages-specific, not the Workers model)

Confirmed against current Cloudflare docs: `vars` (and other bindings) are **non-inheritable**
keys for Pages. A top-level `vars` block applies to **local development and production only**.
Preview deployments receive **nothing** from the top-level block and require their own explicit
`env.preview.vars`. `name`, `pages_build_output_dir`, `compatibility_date`, and
`compatibility_flags` are **inheritable** and apply to all three contexts (local, preview,
production) unless explicitly overridden. This is the reasoning behind the explicit
`env.preview.vars.NODE_VERSION` block in the candidate.

## 9. Plaintext-variable policy

`NODE_VERSION` is the only plaintext variable in the last dashboard evidence. Repository candidate
configuration now pins the formal release patch version (`24.19.0` as of Wave 1A) consistently
across local, preview, and production declarations. A fresh 2026-08-14 read found the live remote
value was the exact `"22.22.3"` for both environments (superseding this document's earlier `"22"`
observation — see the reconciliation note in §7); that Wave 1A read did not change the remote value.
**The separately authorized remote parity step has since been performed (Wave 1B-R1, 2026-08-15 —
see §23): the live Cloudflare build-config `NODE_VERSION` is now `24.19.0` for both environments,**
matching the repository pin. This is a build-configuration alignment only; it does not by itself
change what the production application serves — see §23 for that distinction.

## 10. Secret-name inventory (no values)

| Secret name | Consuming route(s) | Environments configured (dashboard) | Status |
|---|---|---|---|
| `OPENAI_API_KEY` | `functions/api/{chat,compass,cashflow-scenario,investment-analysis}.ts` | preview, production | configured (present as `secret_text` in both deployment_configs) |
| `RESEND_API_KEY` | `functions/api/sample-review.ts` | **none** | **missing — see blocker below** |

Secrets are never written to `wrangler.jsonc` or any other repository file. Provisioning remains
exclusively a Cloudflare-dashboard/`wrangler pages secret put` action, out of scope for R10.0.

## 11. Application binding-contract matrix

| Binding/variable | Consumers | Required/optional | Local (`.dev.vars`) | Preview | Production | Secret/plaintext | Status |
|---|---|---|---|---|---|---|---|
| `OPENAI_API_KEY` | `functions/api/chat.ts`, `compass.ts` — explicit `if (!env.OPENAI_API_KEY)` guard, return 500 `OPENAI_KEY_MISSING`. `functions/api/investment-analysis.ts`, `cashflow-scenario.ts` — **no explicit guard**, used directly in `Authorization: Bearer ${env.OPENAI_API_KEY}` | Required only when the corresponding POST action is invoked (chat, Founder Compass, cashflow scenario, investment analysis). Not required for route/page load. | not in `.dev.vars.example` | set | set | secret | configured; two of four consumers lack a friendly-failure guard — if ever unset, those two would send `Bearer undefined` to OpenAI instead of a clean 500. Not a blocker (key is present) but worth hardening outside R10.0 scope. |
| `RESEND_API_KEY` | `functions/api/sample-review.ts` → `createResendEmailProvider` | Required only when the sample-review form is submitted (POST). Throws `Missing email configuration.` if absent, caught and surfaced as an error response — does not affect other routes or the build. | in `.dev.vars.example` (empty) | **not set** | **not set** | secret | **missing — controlled-activation blocker** |
| `SAMPLE_REVIEW_EMAIL_FROM` | `functions/api/sample-review.ts` | Required only when the sample-review form is submitted | in `.dev.vars.example` (empty) | **not set** | **not set** | plaintext | **missing — controlled-activation blocker** |
| `SAMPLE_REVIEW_EMAIL_TO` | `functions/api/sample-review.ts` | Required only when the sample-review form is submitted | in `.dev.vars.example` (empty) | **not set** | **not set** | plaintext | **missing — controlled-activation blocker** |
| `NODE_VERSION` | Build system only; no runtime `env.NODE_VERSION` reads found in `functions/` or `src/` | Build-time only | formal release `24.19.0` | `24.19.0` (Wave 1B-R1, 2026-08-15; was `22.22.3` at the 2026-08-14 read — see §7 reconciliation) | `24.19.0` (Wave 1B-R1, 2026-08-15; was `22.22.3` at the 2026-08-14 read) | plaintext | **build-config parity resolved — see §23.** Served production application unchanged; see §23. |

**Missing-binding classification (`RESEND_API_KEY`, `SAMPLE_REVIEW_EMAIL_FROM`,
`SAMPLE_REVIEW_EMAIL_TO`):** confirmed absent in both preview and production dashboard
configuration (MCP snapshot) and absent from the fresh `wrangler pages download config` output.
Affected feature: the "sample structure review" form at `/sample-struktur-pruefen` posts to
`/api/sample-review`, which currently fails closed with `503 FEATURE_NOT_CONFIGURED` in both
preview and production whenever that form is submitted. This is **not** a regression introduced by
R10.0 — it reflects the current live state, discovered by this audit. It is **not fixed here**:
provisioning secrets/plaintext values is out of scope for R10.0 and is tracked as a separate,
secure-provisioning task before/alongside R10.0b activation if the feature is meant to be live.

## 12. Local validation

See §13 of the R10.0 task record for the full local Pages runtime matrix (build, `wrangler pages
dev` against this candidate, route/status/cache checks). Summary: build succeeds, candidate
configuration loads cleanly under `wrangler pages dev`, no secret-dependent action was invoked.

## 13. Activation procedure (do not execute in R10.0)

1. Confirm this file matches the then-current dashboard state (re-run the MCP snapshot; dashboard
   config can drift between R10.0 and activation).
2. Resolve the `RESEND_API_KEY` / `SAMPLE_REVIEW_EMAIL_*` blocker (§11) or explicitly accept the
   sample-review feature staying broken through activation — this must be a deliberate decision,
   not a silent gap.
3. Create a new deployment (Git push to `master`, or `wrangler pages deploy`) that includes
   `wrangler.jsonc`. That deployment is the exact activation event — Cloudflare Pages reads the
   file starting with that deployment and the codified fields become dashboard-read-only from then
   on.
4. This is a deployment action and is explicitly out of scope for R10.0 (read-only task). It is the
   subject of the separate R10.0b task (see the R10.0 final report for the full plan).

## 14. Post-activation verification

- Re-fetch the project via the same MCP calls used in R10.0 and confirm `compatibility_date`,
  `compatibility_flags`, and `vars` for both `preview` and `production` now match `wrangler.jsonc`
  byte-for-byte in meaning.
- Confirm the dashboard UI shows the codified fields as read-only/config-file-managed.
- Confirm domains, build command, and root directory are unchanged (they are not touched by this
  file).
- Run the full production/preview/custom-domain/Functions verification matrix from the R10.0b plan.

## 15. Audit-log verification

After activation, query `/accounts/{account_id}/logs/audit` filtered to the activation window and
confirm exactly one deployment-settings-affecting event corresponding to the intended deployment,
with no other unexplained Pages-project write events in the same window.

## 16. Rollback procedure

1. Revert or delete `wrangler.jsonc` from the deployed branch.
2. Create a new deployment without the file (a normal Git push, or `wrangler pages deploy` from a
   tree that no longer contains it).
3. Confirm the dashboard fields become editable again and reflect the last-deployed
   Wrangler-file values (Cloudflare Pages does not silently restore older dashboard settings — the
   values at the moment the file is removed become the new dashboard baseline).
4. Re-run the MCP snapshot to confirm the resulting live configuration is understood and
   intentional before making any further dashboard edits.

## 17. Credential-handling prohibition

No secret value, API token, account ID, or other credential material is ever to be written to
`wrangler.jsonc`, this document, or any other repository file. Secrets are provisioned exclusively
through Cloudflare's secret mechanisms (dashboard or `wrangler pages secret put`), outside version
control, by a human operator with the appropriate authorization.

## 18. No direct dashboard editing of codified fields after activation

Once `wrangler.jsonc` is deployed, `name`, `pages_build_output_dir`, `compatibility_date`,
`compatibility_flags`, and `vars` must only be changed by editing this file and creating a new
deployment. Editing the same fields in the dashboard after activation has no effect (the file wins)
and creates a misleading impression that a change occurred when it did not.

## 19a. Phase 3-B1 production-deployment control (dashboard/API-managed, not this file)

`source.config.production_deployments_enabled` for the `portfolio-astro` Pages project — a
dashboard/API-managed field, not representable in `wrangler.jsonc` — was PATCHed from `true` to
`false` in Phase 3-B1, verified field-by-field against a pre-change baseline (every other
`source.config` field, including `preview_deployment_setting`, `production_branch`, and Git
repository connection, was confirmed unchanged). Cloudflare's Git integration no longer deploys
pushes to `master` to production automatically; a manual `release.yml` dispatch (once authorized) is
the only remaining production deployment path. This is independently reversible with one PATCH back
to `true` and does not affect any field this document's §7 candidate mapping tracks.

## 19. Disaster-recovery considerations

- The Git repository (`master` branch) is the durable source of both application code and, after
  activation, this configuration file — a full project loss on Cloudflare's side is recoverable by
  recreating the Pages project, reconnecting the GitHub repository, and redeploying `master`.
- Secrets are **not** recoverable from any repository artifact by design; disaster recovery for
  secrets depends on whatever secret-management process the operator maintains outside this repo
  (e.g., a password manager entry for `OPENAI_API_KEY`). This document intentionally does not
  track where that value is kept.
- The custom domain (`me-mateescu.de`) and its certificate are Cloudflare-managed and are
  reprovisioned automatically on re-attachment; DNS ownership of the zone is the actual recovery
  dependency, not anything in this repository.

## 20. Cloudflare Web Analytics: automatic injection vs. application-controlled loading (Phase 3-C Step 2B/2C)

`build_config.web_analytics_tag`/`web_analytics_token` (§10, §11) remained unchanged remotely through
Step 2B-1, which added a manually embedded, consent-gated `<script>` in `BaseLayout.astro` reusing the
project's then-current site token — a tracked, non-secret literal constant in source, consistent with
how the Ahrefs `data-key` is already handled, and deliberately not a build-time `PUBLIC_` environment
variable (that mechanism is reserved for genuinely build-varying values such as
`PUBLIC_SOURCE_DATE_EPOCH`; this token is static per-project and only changes on a deliberate owner
reset or provider-side mode change).

**Remote cutover complete (Phase 3-C Step 2C-1):** `build_config.web_analytics_tag` and
`web_analytics_token` were PATCHed to `null` on the `portfolio-astro` Pages project (verified via a
fresh `GET` and full field-by-field comparison — every other field, including
`production_deployments_enabled`, remained invariant, and no deployment was created). The zone-level
Web Analytics Automatic Setup for `me-mateescu.de` was owner-confirmed switched from
"Enable, excluding visitor data in the EU" to "Enable with JS Snippet installation" (manual install).
Both automatic-injection sources are therefore disabled for any **future** deployment; neither will
bake an unconditional beacon into a new build again. Switching to manual-install mode caused
Cloudflare to issue a new site token for the manual snippet, distinct from the pre-cutover
`build_config.web_analytics_token`.

**Canonical application state (Phase 3-C Step 2C-2):** the application loader's `CF_BEACON_TOKEN`
constant in `BaseLayout.astro` carries this manual-install token. Step 2C-2 is implemented, locally
validated, integrated into canonical, and was promoted to production by the Phase 4 controlled
production release.

**The legacy pre-Phase-4 production build (built before Step 2B-1 existed) is superseded:** that
earlier deployment served an unconditional Cloudflare beacon and an unconditional Ahrefs script,
baked into its already-built static HTML at the time it was built — neither the Step 2C-1
remote-configuration cutover nor the Step 2C-2 application-token update could retroactively change
that already-built HTML, only a new deployment carrying the consent-aware loader could. The Phase 4
controlled production release is that new deployment: the currently-live production build now serves
the consent-gated loader. This historical gap (recorded via a live, read-only, zero-consent browser
inspection of the legacy production build during Step 2C-1, evidence not part of this repository)
described the pre-Phase-4 legacy build only, not current production state.

## 21. Read-only remote parity and logging review (Phase 3-C Step 3E-A)

A read-only MCP snapshot of the `portfolio-astro` Pages project confirmed, without exposing secret
values:

- `source.config.production_deployments_enabled: false` and `preview_branch_includes: ["release/*"]`
  unchanged since Phase 3-B1/3-B3;
- `canonical_deployment` (the artifact actually served at `me-mateescu.de`) unchanged at its expected
  identity, confirming production invariance throughout Phase 3-C;
- `OPENAI_API_KEY` present as `secret_text` in both `preview` and `production` deployment configs —
  binding presence confirmed, value never read;
- `build_config.web_analytics_tag`/`web_analytics_token` still `null` in both environments, confirming
  the Step 2C-1 automatic-injection cutover remains in effect;
- `RESEND_API_KEY`/`SAMPLE_REVIEW_EMAIL_FROM`/`SAMPLE_REVIEW_EMAIL_TO` still absent from both
  environments, consistent with Sample Review remaining disabled by release policy;
- the account-level deployment list showed no unexpected deployment beyond the known accepted
  previews, the frozen Dependabot-branch preview builds (consistent with the Phase 3-C dependency
  freeze), and one `idle`/skipped `production`-environment record for a `master` push — consistent
  with `production_deployments_enabled: false` causing Cloudflare to log but not build that push;
- account-level Logpush jobs: **not configured** (empty result) — no recurring log export exists for
  this account;
- the Workers Observability API could not retrieve the Pages-managed Functions script
  (`pages-worker--9129850-production`) — **API-inaccessible**, a known platform limitation for
  Pages-managed Functions rather than a permission denial, consistent with the pre-existing
  unverified-retention/export limitation already recorded in `README.md` and `docs/ARCHITECTURE.md`;
- account audit logs since 2026-08-01 show exactly two owner-initiated account-level events (a Web
  Analytics settings update and an abuse-contact-email addition), neither touching this Pages
  project's deployment settings, confirming no unexplained Pages-project-affecting write occurred.

For this personal, low-volume, non-commercial release, the absence of Logpush/advanced observability
is accepted rather than a blocker: there is no sensitive application logging (the operational logger
allowlist is separately verified — see
[operational-controls-observability.md](operational-controls-observability.md)), and this is an
owner-accepted limitation, not a silently assumed one. The `NODE_VERSION` production/candidate parity
gap from §7/§9 remains open and applies only to a future production cutover under Phase 4.

## 22. Wave 1B control-plane provenance finding (2026-08-15, attempt blocked, provenance normalized)

A controlled Node 24 remote-parity attempt (Wave 1B) PATCHed only
`deployment_configs.preview.env_vars.NODE_VERSION` on the `portfolio-astro` Pages project and
observed the following, read-only and via one narrow PATCH plus one rollback PATCH — no
production mutation, no deployment, no build:

- pre-attempt preview and production `NODE_VERSION` were both the exact string `22.22.3`;
- pre-attempt preview and production `deployment_configs.*.wrangler_config_hash` were both
  `1574fc1d3e7fccea47bc35249a940ad265db5ac89b777c5ecd974d25570827aa`;
- that hash is exactly `SHA-256` of the raw bytes of the repository's `wrangler.jsonc` as it stood
  at the pre-Wave-1A, pre-Node-24 commit (`bea9b6d003a922de3857a4bc90a4e64af2311923`), reproduced
  independently in this session — direct evidence the field is genuine per-project Wrangler-file
  provenance, not an opaque or account-wide fingerprint;
- a PATCH changing only `env_vars.NODE_VERSION` to `24.19.0` on `preview` caused
  `deployment_configs.preview.wrangler_config_hash` to disappear from the project entirely;
- an immediate rollback of `NODE_VERSION` to `22.22.3` did **not** restore the hash — it remains
  absent on `preview` as of this writing;
- `deployment_configs.production.wrangler_config_hash` was untouched throughout and still reads
  `1574fc1d3e7fccea47bc35249a940ad265db5ac89b777c5ecd974d25570827aa`;
- no preview build was started, no production configuration field changed, no production
  application deployment occurred, and production `sourceRevision`/`releaseId` were unchanged
  before and after.

**Upstream semantics (verified against primary sources, 2026-08-15):**

- Cloudflare's own Pages "Update project" OpenAPI schema documents
  `deployment_configs.{preview,production}.wrangler_config_hash` as *"Hash of the Wrangler
  configuration used for the deployment"* and accepts it as a settable field on the same PATCH
  endpoint used for environment variables.
- Wrangler's own deploy implementation
  (`packages/wrangler/src/api/pages/deploy.ts`, `cloudflare/workers-sdk`, commit
  `1b73c879c168dcc78b0f2657d04bc784b8af7da3` on `main`) computes this value as
  `createHash("sha256").update(await readFile(config.configPath)).digest("hex")` — i.e. a plain
  SHA-256 over the raw bytes of the Wrangler configuration file — and submits it as
  `wrangler_config_hash` on every `wrangler pages deploy`.
- Wrangler's own Pages secret-mutation code (`packages/wrangler/src/pages/secret/index.ts`, same
  commit; used by `wrangler pages secret put`/`bulk`/`delete`) explicitly re-sends
  `project.deployment_configs[env].wrangler_config_hash` as part of every environment-variable
  PATCH it issues, rather than omitting it. This is consistent with Wave 1B's finding and implies
  the field is not implicitly preserved by the API when an `env_vars`-only PATCH omits it.

Cloudflare's public API reference does not explicitly document the exact clearing behavior
observed when `wrangler_config_hash` is omitted from a `deployment_configs.<env>` PATCH — that
specific side effect is recorded here as **OBSERVED-API-BEHAVIOR**, corroborated by Wrangler's
own defensive pattern of always re-sending the field, not as an officially guaranteed contract.

**Provenance normalization (this session):** the repository's `wrangler.jsonc` `env` comment
previously described the *then-current* remote state ("live Cloudflare preview and production
both remain unmutated at `22.22.3`..."), a fact that would have gone stale immediately after a
successful parity mutation and, because Wrangler hashes raw file bytes, would have forced a
provenance-breaking edit at exactly the moment provenance matters most. The comment was rewritten
to describe only the stable, non-temporal reason the `preview`/`production` blocks exist (`vars`
non-inheritance) and to point at this document for current remote state, with no semantic JSON
change. The resulting raw-byte SHA-256 of `wrangler.jsonc` is the authorized provenance value for the next
parity attempt and is recorded in that session's external evidence record; this document
intentionally does not restate that hash inline to avoid re-creating the same staleness problem
for a document that is not itself hashed for provenance.

**Recommended retry shape (not executed by this session):** the next Cloudflare Node 24 parity
attempt should PATCH `deployment_configs.preview.env_vars.NODE_VERSION` and
`deployment_configs.preview.wrangler_config_hash` atomically in the same request, mirroring
Wrangler's own secret-mutation pattern, then proceed to controlled preview-build validation before
any production configuration change.

## 23. Node 24 Cloudflare parity validated — Wave 1B-R1 (2026-08-15)

Following the retry shape recommended in §22, a Wave 1B-R1 session executed the atomic-PATCH retry
and validated it end to end:

- the atomic preview PATCH carried both `env_vars.NODE_VERSION = "24.19.0"` and
  `wrangler_config_hash = bba203194506dbe39e3b8d889b88391034461db067c4724c3ce09f46f561fbcf` in the
  same request;
- an immediate, independent read-back showed exactly those two fields changed from the pre-attempt
  preview baseline (`22.22.3` / hash absent, per §22) — no other field moved;
- a temporary branch (`release/node24-cloudflare-parity-r1-2026-08-15`) was pushed pointing exactly
  at the existing public master commit (`21598ed8eb65e771d1d128cdeec3fa500f43d7e3`); no new source
  commit was created;
- that push triggered a real Cloudflare Git-integrated preview deployment
  (`3218e514-aeb2-4d26-982d-a63bd3aa7297`), `is_skipped = false`, all five build stages SUCCESS on
  the first attempt;
- the build logs directly show `Node 24.19.0` and `npm 11.17.0` in use throughout the build;
- a post-build provenance re-check confirmed `wrangler_config_hash` on `preview` was unaffected by
  the build (remained `bba20319...`);
- preview smoke checks (root, `/api/health`, a tools route, a locale route, a static asset, a 404,
  the sitemap) all passed with correct security headers and no mutating action;
- only after preview validation passed, `production` was PATCHed atomically with the same two
  fields (`NODE_VERSION = "24.19.0"`, the same final `wrangler_config_hash`);
- the final Cloudflare semantic diff from the session-start baseline contained exactly four
  authorized field changes (preview `NODE_VERSION`, preview `wrangler_config_hash`, production
  `NODE_VERSION`, production `wrangler_config_hash`) and nothing else;
- `production_deployments_enabled` remained `false` throughout; neither PATCH created a new
  production deployment;
- `/api/health` was reconfirmed unchanged before and after, still reporting `sourceRevision`
  `a657b26a61da0f9744b502fc01a049a8be4549ea` and `releaseId` `git-7349a41219a61d1b` (the Phase 4
  release);
- the temporary branch was deleted, remotely and locally, after evidence capture; the Cloudflare
  preview deployment record itself was preserved (not deleted).

**CLOUDFLARE BUILD-CONFIG PARITY: RESOLVED.** Both `preview` and `production` Pages build
configuration now read `NODE_VERSION = 24.19.0` with matching `wrangler_config_hash` values.

**NODE 24 REMOTE BUILD VALIDATION: PASS.** A real Cloudflare Git-integrated preview build completed
successfully on Node 24.19.0 / npm 11.17.0.

**PRODUCTION APPLICATION NODE-24 CUTOVER: NOT PERFORMED.** These two PATCHes changed only Pages
build-environment configuration. No production deployment was created or promoted by this work; the
application currently served at `me-mateescu.de` remains the Phase 4 release (`a657b26a...`), which
was itself built under the prior Node 22 toolchain. A future production release that redeploys the
current repository tree will be the first one actually built under Node 24 — this section records
that the build *environment* is now ready for that, not that it has happened.
