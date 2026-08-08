# Pages Functions transport contracts

Status: **Phase 2C implemented locally.** The current contract is source-owned by `functions/api/`,
`functions/_lib/`, and permanent Function/provider/operational tests.

## Endpoint inventory

| Endpoint | Methods | Provider | Streaming | Quota | Absent feature default |
| --- | --- | --- | --- | --- | --- |
| `/api/health` | GET, HEAD | none | no | none | not applicable |
| `/api/csp-report` | POST | none | no | bounded batch/drop controls | not applicable |
| `/api/chat` | POST | OpenAI, `terra` tier | Chat yes; JD no | burst plus 24-hour counts | enabled |
| `/api/compass` | POST | OpenAI, `sol` tier | yes | burst plus seven-day cooldown | enabled |
| `/api/cashflow-scenario` | POST | OpenAI, `terra` tier | no, Structured Outputs | burst plus seven-day cooldown | enabled |
| `/api/investment-analysis` | POST | OpenAI, `sol` tier | no, Structured Outputs | burst plus seven-day cooldown | enabled |
| `/api/sample-review` | POST, HEAD state probe | Resend when separately activated | no | 60-second throttle | disabled |

Dev-only references to `/api/contact` and `/api/posts` have no backing Function and are not public
Function surfaces.

## Shared envelope and request identity

JSON successes and failures preserve the normalized envelope:

```jsonc
{ "ok": true, "data": {}, "requestId": "server-generated UUID" }
{ "ok": false, "error": { "code": "STABLE_CODE", "message": "safe text", "retryable": false }, "requestId": "server-generated UUID" }
```

The server always generates the UUID. `CF-Ray`, `X-Request-ID`, and arbitrary request headers are
not accepted as request identity. One invocation uses the same ID in its public envelope and local
operational events.

Current public error codes are:

```text
METHOD_NOT_ALLOWED UNSUPPORTED_MEDIA_TYPE MALFORMED_JSON PAYLOAD_TOO_LARGE
VALIDATION_FAILED ORIGIN_REJECTED PRIVACY_CONSENT_REQUIRED FEATURE_DISABLED
FEATURE_NOT_CONFIGURED CONFIGURATION_INVALID RATE_LIMITED QUOTA_EXCEEDED
PROVIDER_TIMEOUT PROVIDER_UNAVAILABLE PROVIDER_REJECTED INTERNAL_ERROR
```

`PRIVACY_CONSENT_REQUIRED` (HTTP 400) is specific to the four AI-backed routes
(`/api/chat`, `/api/compass`, `/api/cashflow-scenario`, `/api/investment-analysis`): the request
body must carry `{ privacyConsent: true, privacyNoticeVersion: "ai-openai-v2" }` — the single
authoritative version constant lives in `functions/_lib/ai-privacy-notice.ts` — or the route rejects
before any quota write or provider call. Deterministic fact-chip answers on `/api/chat` (explicit
intent, no free-text question or JD analysis) never call OpenAI and are therefore never gated by
this check; `chat`'s pre-existing burst rate limiter and read-only quota lookup (needed to render
the quota badge for those fact answers too) run before this check, unlike the other three routes,
which check consent before any rate-limit or quota work at all. This is an
**ACCEPTED-SECURITY-ORDERING-EXCEPTION**, not a defect: neither the burst counter nor the quota read
touches OpenAI, costs anything, or logs request content, and moving them behind the consent check
would weaken flood protection for the consent-exempt fact-chip path without any privacy benefit —
see [operational-controls-observability.md](operational-controls-observability.md) for the exact
per-route ordering. See
[privacy-consent-external-services.md](privacy-consent-external-services.md) for the client-side
contextual-consent UX contract.

Internal failure class, provider outcome, token usage, quota subject, and feature state are not added
to public envelopes. The relationship between public codes and internal classes is documented in
[operational controls and observability](operational-controls-observability.md).

Chat and Founder Compass return `text/event-stream`. Their stable events remain `meta` where
applicable, `delta`, `done`, and `error`; provider frames, response IDs, reasoning objects, and
operational metadata are not forwarded. Sample Review keeps its progressive HTML fallback:
JSON-capable requests use the envelope, while native form navigation gets an error page or 303
success redirect.

The CSP collector is the other deliberate exception: browser reporting POSTs use an empty 204 on
accepted input rather than a JSON envelope. It accepts only `application/csp-report` and
`application/reports+json`, caps bodies at 4 KiB and batches at eight reports, emits no CORS header,
and never reflects or forwards input. See [CSP reporting](csp-reporting.md).

## Transport validation

Every route uses a single `onRequest` handler and an explicit method guard, producing normalized 405
responses with `Allow`. JSON responses use:

- `Content-Type: application/json; charset=utf-8`;
- `Cache-Control: no-store`;
- `X-Content-Type-Options: nosniff`.

The AI routes require `application/json`; Sample Review requires `multipart/form-data`. Both declared
and actual body size are checked. Limits are 8 KiB for investment, 20 KiB for compass, 24 KiB for
cashflow, and 32 KiB for chat and Sample Review. Parse failures are distinct from schema/domain
validation failures.

`originGuard` allows no-Origin unauthenticated requests, the canonical site, the current Pages
domain and branch previews, and local Wrangler origins. It does not implement session-bound CSRF
protection and would need replacement if authentication is added.

## Feature and configuration behavior

Feature controls are evaluated after method/origin validation and before body processing, quota
mutation, or provider preparation. The four AI routes default enabled; Sample Review defaults
disabled. Accepted values are `true`, `1`, `on`, `false`, `0`, and `off`, with case/whitespace
normalization.

Explicit disable returns 503 `FEATURE_DISABLED`. An invalid explicit value returns 503
`CONFIGURATION_INVALID` and fails closed. Neither response exposes the environment name or value.
Missing provider configuration on an enabled route returns 503 `FEATURE_NOT_CONFIGURED`. Disabled,
invalid, and missing-configuration paths do not call a provider. Disabled and invalid paths do not
consume quota.

`/api/health` is independent: it never reads or exposes feature switches, provider configuration, or
quota state. It makes no provider/storage request and reports only the Phase 2A public release
identity.

`HEAD /api/sample-review` is a narrow non-submitting postdeploy probe. It returns empty 204 only
when the control is the disabled default and 409 when enabled or invalid. It parses no form body,
touches no quota state, and calls no provider.

Sample Review remains inactive by default. Explicit local enablement without all existing Resend
configuration yields the controlled configuration-missing result. Phase 2B does not activate
Resend, send real email, or bypass the future Turnstile activation requirement.

## Provider and quota failures

The shared OpenAI Responses transport preserves one call, no automatic retry, no fallback,
server-owned model policy, timeout, Structured Outputs, and `store: false`. Safe public mappings
distinguish timeout from unavailable/rejected outcomes without returning upstream bodies or
messages. Structured refusal and malformed output are distinct internal operational outcomes while
remaining backward-compatible public failures.

Cache API quota state is colo-local, check/set may race, and it is not globally exact. Operational
events record only the safe decision, never the IP, hash, subject, or cache key. Chat retains its
documented fail-open storage behavior; other paths do not silently acquire a fail-open policy.

## Operational boundary

All six routes use one request context and completion wrapper. Each invocation produces one local
terminal request event; a provider event exists only when a call began. The same request ID and
release ID link public behavior to the local event. Streaming completion is recorded on stream
completion/cancellation rather than at response construction.

The logger is a strict allowlist and is the only permitted production console boundary. It never
logs request/provider objects, content, identifiers, arbitrary headers, provider messages, or stack
traces. See [operational controls and observability](operational-controls-observability.md) for the
schema, taxonomy, feature values, timing semantics, SLO candidates, and privacy threat review.

## Offline verification

```bash
npm run verify:operational-controls
npm run verify:function-contracts
npm run verify:ai-provider-contracts
npm run verify:release-provenance
npm run verify:csp
```

The suites use Node 22, fake Cache API state, injected fetch/email transports, and synthetic SSE and
Structured Outputs. They cover success, method/origin/media/body/schema rejection, disabled and
invalid controls, missing configuration, quota outcomes, timeout, provider HTTP failure, refusal,
malformed output, streaming completion/cancellation, request-ID linkage, no sensitive logging, and
no egress. No provider credential or live provider call is required.

Local Pages validation uses the repository-locked runtime:

```bash
npm run build
npx wrangler pages dev dist --compatibility-date=2025-11-14 --port=8788
```

Use only non-secret boolean values in ignored `.dev.vars`. Local success does not prove preview,
production, provider access, or deployment state.
