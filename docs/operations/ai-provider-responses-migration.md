# AI provider modernization — Responses API migration (R10.3b / R7.2)

Status: **implemented.** All four OpenAI-backed Functions now call the Responses API
(`/v1/responses`) exclusively on the approved GPT-5.6 tier models. The prior mixed
architecture — `chat`/`compass` already on Responses with `gpt-4.1-mini`/`o4-mini`,
`cashflow-scenario`/`investment-analysis` still on legacy Chat Completions with `o4-mini` — is
**superseded** by this change. See `docs/operations/pages-functions-contracts.md` for the
general transport contract (envelope, method/origin/body handling) shared by all five Functions;
this document covers only the OpenAI-provider-specific architecture.

## 1. Final endpoint/API/model matrix

| Endpoint | API | Model | Reasoning | Verbosity | Output ceiling | Streaming | Structured output | Timeout |
|---|---|---|---|---|---|---|---|---|
| `/api/chat` | `/v1/responses` | `gpt-5.6-terra` | `low` | `medium` | 2500 | yes | no | 30 s |
| `/api/compass` | `/v1/responses` | `gpt-5.6-sol` | `high` | `high` | 8000 | yes | no | 60 s |
| `/api/cashflow-scenario` | `/v1/responses` | `gpt-5.6-terra` | `medium` | `medium` | 4500 | no | strict `json_schema` | 35 s |
| `/api/investment-analysis` | `/v1/responses` | `gpt-5.6-sol` | `medium` | `medium` | 5000 | no | strict `json_schema` | 35 s |

Every request additionally sets `store: false` unconditionally (see §3), and never sets
`previous_response_id`, a Conversations reference, `tools`, or a caller-selected model/effort/
token budget. Output-token ceilings are **total provider budget** (reasoning + visible output +
formatting tokens), not requested visible length — visible length is bounded separately by
prompt instructions, `text.verbosity`, and (for the two structured endpoints) the JSON Schema
itself.

Do not use: the unsuffixed `gpt-5.6` alias, `gpt-4.1-mini`, `o4-mini`, Chat Completions, legacy
Completions, Assistants, Conversations, `previous_response_id`, pro mode, automatic model
fallback, or OpenAI built-in tools. All of the above are enforced by the permanent architecture
guard in `tests/ai-provider-contracts.test.mjs` (`npm run verify:ai-provider-contracts`), which
inspects production source, not fixtures.

## 2. Shared provider boundary

`functions/_lib/responses.ts` is the one place that owns: the `/v1/responses` URL, auth headers,
unconditional `store: false`, timeout-integrated transport (`callResponses`, built on the
existing `fetchWithTimeout`), non-streaming output/refusal/incomplete/failed extraction
(`extractResponsesOutcome`), strict-JSON-Schema parsing (`parseStructuredJSON`), and incremental
SSE decoding (`ResponsesSSEDecoder`).

It deliberately does **not** own model choice, reasoning effort, verbosity, prompts, trusted vs.
untrusted input, endpoint-specific JSON Schemas, or output-token ceilings — those live in each
`functions/api/*.ts` file as explicit, named, exported constants (`CHAT_MODEL`,
`COMPASS_REASONING_EFFORT`, `CASHFLOW_MAX_OUTPUT_TOKENS`, …) and a small `buildXRequestBody()`
function per endpoint, so the contract tests assert against the real production request builder
rather than a parallel reimplementation.

Phase 2B also instruments this shared boundary once instead of duplicating provider logging in
endpoints. It records only the approved tier, closed provider outcome, validated aggregate token
counts when present, provider duration, and streaming first-output/completion state. It never logs
input, output, refusal text, provider IDs, raw errors, or provider objects. The complete local-only
schema and timing semantics are in
[operational-controls-observability.md](operational-controls-observability.md).

## 3. Stateless architecture — what `store: false` means and doesn't

Every request is stateless: `store: false` is set unconditionally inside
`buildResponsesBody()` and cannot be overridden by any caller or endpoint. No
`previous_response_id`, Conversations object, or persisted OpenAI response ID is ever used — the
site resends the full context (trusted instructions + evidence/structured data + the current
user turn) on every call, and each endpoint's server-side quota (Cache API, hashed IP) is the
only cross-request state that exists, entirely independent of OpenAI.

**Limitation, stated plainly:** `store: false` opts out of the Responses application-state
persistence OpenAI would otherwise use for persisted response objects and future Conversations/
`previous_response_id` continuation. That is the *only* thing this flag controls. It does **not**
disable OpenAI's own abuse-monitoring retention, which OpenAI applies independently of `store` for
policy-enforcement purposes on a bounded retention window.

Separately — and not as an effect of `store: false` — OpenAI's platform-wide default is that API
data is not used to train its models unless the organization has explicitly opted in; this project
has not opted in. Do not attribute this non-training default to the `store` flag in any product or
legal copy: an organization that *did* opt into training would still see that training use with
`store: false` set, because the two settings are independent. This project makes no claim of Zero
Data Retention (ZDR) — ZDR is a distinct, separately-negotiated status this account has not been
independently confirmed to have. Do not represent `store: false` as equivalent to ZDR in any
product or legal copy.

## 4. Streaming adapter contract

`chat` and `compass` translate Responses API SSE events into the site's own stable contract
(`event: meta` [chat only] / `delta` / `done` / `error`) via `ResponsesSSEDecoder` +
per-endpoint event handling. The browser never sees a raw OpenAI event name, a response ID, or
reasoning-item content. A stream that ends without an explicit `response.completed` event (a
genuine truncation, distinct from the normal terminal event) resolves to `event: error`, never a
silently-successful `event: done` — see `tests/ai-provider-contracts.test.mjs` for the fragmented-
chunk, CRLF, UTF-8-split, keepalive-comment, malformed-JSON, unknown-event, and truncated-stream
cases the decoder is tested against.

## 5. Structured-output contract

`cashflow-scenario` and `investment-analysis` use `text.format: { type: 'json_schema', name,
schema, strict: true }` with `additionalProperties: false` and complete `required` arrays. A
non-`completed` outcome (refusal, incomplete, failed, malformed/non-JSON, or a JSON value that
isn't an object) is mapped to a controlled `502 PROVIDER_REJECTED` — never a 200 with partial or
guessed data, and never `JSON.parse` of arbitrary prose. The AI only writes narrative
interpretation of numbers the deterministic engines (`src/lib/cashflow`, `src/lib/investment`)
already computed; it never recomputes or overrides an authoritative financial metric.

## 6. One-call, no-retry, no-fallback policy

Every accepted operation makes at most one OpenAI request. There is no automatic retry, no
hedged/parallel request, and no fallback to a different model on rejection, timeout, refusal, or
malformed output — a failure surfaces as a normalized error response and the caller decides
whether to try again. Enforced by dedicated one-call assertions per failure mode in
`tests/ai-provider-contracts.test.mjs`.

## 7. Timeouts

| Endpoint | Before | After | Rationale |
|---|---|---|---|
| `chat` | 25 s | 30 s | Terra at low reasoning is still fast, but is a reasoning model where `gpt-4.1-mini` was not — small margin added for time-to-first-byte. |
| `compass` | 25 s | 60 s | Sol at high reasoning has materially longer time-to-first-token before the first streamed delta. Cloudflare Workers impose no wall-clock cap on time spent awaiting `fetch()`/I-O (only CPU time is metered — [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits)), so this is a deliberate product/UX bound, not a platform constraint. Streaming means the connection stays alive with bytes flowing well before generation fully completes. |
| `cashflow-scenario` | 20 s | 35 s | Non-streaming: the bound covers the *entire* medium-reasoning generation, not just first-byte, since headers only arrive once the full response is ready. |
| `investment-analysis` | 20 s | 35 s | Same reasoning as `cashflow-scenario`. |

Every value above is asserted deterministically in `tests/ai-provider-contracts.test.mjs`
(timeout → `504 PROVIDER_TIMEOUT`, `retryable: true`).

## 8. Safety-identifier — deferred

Current OpenAI guidance recommends a stable, privacy-preserving `safety_identifier` for end-user
applications. This repository has no existing HMAC-peppered identity mechanism, and fabricating
one from raw IP, an unsalted IP hash, email, or request ID would be a weak, reversible identifier
— worse than sending none. No `safety_identifier` (or equivalent `user` field) is sent by any
endpoint in this wave. **Deferred requirement for the R10.4c distributed-abuse-control wave:** an
HMAC-peppered per-endpoint identifier, keyed by a secret provisioned and governed the same way
other Pages secrets are, computed the same way the existing quota IP-hashing already works
(`hashIP`/`hashChatIP` in each endpoint) but with a proper server-only pepper rather than the
current fixed per-endpoint salt string.

## 9. Privacy-policy delta (R3.1 stays open)

`src/pages/datenschutz.astro` (the sole legally-canonical policy; the `en`/`ro` variants defer to
it) currently has **no section describing OpenAI processing of AI-tool submissions at all** —
not stale, simply absent. A materially complete policy would need to disclose, at minimum: that
message/report/analysis content submitted to the four AI tools is sent to OpenAI, LLC (or its
processing entity) for a single stateless completion; that `store: false` is set but does not
constitute Zero Data Retention (§3); OpenAI's own bounded abuse-monitoring retention window;
the legal basis (likely Art. 6(1)(f) or (b) DSGVO depending on how the tools are framed); and
international-transfer wording (SCCs / EU-US Data Privacy Framework status for OpenAI, mirroring
the existing Cloudflare section's approach). This is a **finding, not a fix** — per R3.1, privacy
copy requires qualified legal review before publication, and this document does not author or
publish that legal conclusion. `R3.1` remains open until that review happens.

## 10. Mocked test strategy / no paid provider request

`tests/ai-provider-contracts.test.mjs` (`npm run verify:ai-provider-contracts`) and the existing
`tests/function-contracts.test.mjs` (`npm run verify:function-contracts`) never resolve or
contact `api.openai.com`. Every provider interaction goes through the injected `fetchImpl`
pattern already established for the five Functions (`tests/helpers/fetch-router.mjs`), or
synthetic byte chunks fed directly to `ResponsesSSEDecoder`. No `OPENAI_API_KEY` used in any test
is a real credential.

**Pre-release requirement, not satisfied by this wave:** before this code is deployed with a
real `OPENAI_API_KEY`, run exactly one manually-triggered, explicitly-authorized canary request
per model tier (`gpt-5.6-terra`, `gpt-5.6-sol`) to confirm the account has live access to both
tiers and that the exact request shape used here is accepted — this wave's validation is
entirely mocked and cannot substitute for that confirmation.

## 11. Superseded architecture

The following is historical only, kept for institutional memory, and must not be read as
describing current behavior: prior to this wave, `chat` used the Responses API with
`gpt-4.1-mini` (a non-reasoning model, so no `reasoning`/`text.verbosity` fields existed on that
request), `compass` used the Responses API with `o4-mini` and no `text.verbosity`, and
`cashflow-scenario`/`investment-analysis` used the legacy Chat Completions endpoint
(`/v1/chat/completions`) with `o4-mini`, `reasoning_effort: 'low'`, and
`response_format.json_schema` — the Chat Completions equivalent of `text.format`.
