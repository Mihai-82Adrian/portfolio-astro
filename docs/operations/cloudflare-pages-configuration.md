# Cloudflare Pages configuration

Status: **R10.0 — codified, not yet activated.** This document and `wrangler.jsonc` at the repo
root are configuration-as-code candidates. As of this writing, the Cloudflare dashboard remains
the live source of truth for the `portfolio-astro` Pages project; `wrangler.jsonc` only becomes
authoritative on the controlled activation event described below (R10.0b).

## 1. Project identity

| Field | Value |
|---|---|
| Project name | `portfolio-astro` |
| Framework | Astro 6.4.8 |
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
| Preview deployments | enabled for all branches (`preview_branch_includes: ["*"]`) |
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
  "vars": { "NODE_VERSION": "22.22.3" },
  "env": {
    "preview":    { "vars": { "NODE_VERSION": "22.22.3" } },
    "production": { "vars": { "NODE_VERSION": "22.22.3" } }
  }
}
```

| Field | Candidate | Live dashboard (MCP) | `wrangler pages download config` | Verdict |
|---|---|---|---|---|
| `name` | `portfolio-astro` | `portfolio-astro` | `portfolio-astro` | exact parity |
| `pages_build_output_dir` | `./dist` | `destination_dir: dist` | `dist` | intentional normalization (`./dist` is the documented canonical form; resolves identically) |
| `compatibility_date` | `2025-11-14` | `2025-11-14` (both envs) | `2025-11-14` | exact parity |
| `compatibility_flags` | omitted | `[]` (both envs) | omitted | exact parity (empty is the schema default) |
| `vars.NODE_VERSION` (top-level) | `"22.22.3"` | preview & production last observed as `"22"` | `"22"` (top-level + `env.production`) | Phase 3 parity blocker; repository formal toolchain is exact and remote state was not mutated |
| `env.production.vars.NODE_VERSION` | `"22.22.3"` | last observed `"22"` | `"22"` | Phase 3 parity blocker |
| `env.preview.vars.NODE_VERSION` | `"22.22.3"` | last observed `"22"` | *(not emitted — download-config only wrote top-level + production)* | explicit preview declaration retained; exact remote parity requires authorized Phase 3 review |
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
configuration now pins the formal release patch version consistently across local, preview, and
production declarations. The last observed remote value was the broader `"22"` and therefore
requires authorized Phase 3 parity review; Phase 2C does not change it.

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
| `NODE_VERSION` | Build system only; no runtime `env.NODE_VERSION` reads found in `functions/` or `src/` | Build-time only | formal release `22.22.3` | last observed `22` | last observed `22` | plaintext | candidate `22.22.3`; Phase 3 remote parity blocker |

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
