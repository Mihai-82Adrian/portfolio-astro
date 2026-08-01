# Operational controls and observability

## Scope

Phase 2B provides local, one-line structured events and deterministic operational contracts for
every active public Pages Function. It does not activate remote logging, retention, dashboards,
alerts, Logpush, or remote feature configuration. Those changes require separate privacy, access,
retention, cost, and production authorization.

The active routes are `/api/health`, `/api/chat`, `/api/compass`,
`/api/cashflow-scenario`, `/api/investment-analysis`, and `/api/sample-review`. Every route uses the
same completion boundary; there are no route exceptions.

## Request context and terminal events

One invocation owns one context:

```ts
type OperationalRequestContext = {
  requestId: string;
  route: OperationalRoute;
  method: string;
  releaseId: string;
  startedAtMonotonicMs: number;
};
```

The server generates a UUID; `CF-Ray`, `X-Request-ID`, and other caller headers are never
authoritative. The same ID appears in the normalized public envelope and operational events.
Routes are a closed enum, methods are normalized uppercase values, release identity comes from the
Phase 2A generated source, and durations use the monotonic runtime clock.

Each invocation emits exactly one `request.completed` event. A provider-backed invocation emits at
most one additional `provider.completed` event and only after a provider call begins. Non-streaming
requests finalize when their response is constructed. Streaming requests finalize when the body
completes, fails, or is cancelled, so response construction is not mislabeled as full latency. A
logging failure is swallowed, never changes the response, and never retries a provider.

## Structured logger

The sole production console boundary is `functions/_lib/operational-logger.ts`. It emits one JSON
object per line through `console.info`, `console.warn`, or `console.error`. Callers pass a typed
event; the logger constructs a new object from this allowlist and ignores unknown runtime keys:

```text
schemaVersion timestamp level event requestId route method status durationMs releaseId
modelTier providerOutcome quotaDecision errorClass retryable inputTokens outputTokens
totalTokens timeToFirstOutputMs providerDurationMs streamOutcome
```

The CSP collector has one separate bounded `csp.summary` shape containing only accepted/dropped
counts plus closed directive/resource/disposition classes. It never adds raw report fields to this
generic schema or emits one event per report.

Schema version is `1`. Strings are closed enums or validated identities. Status is an HTTP integer,
durations are rounded finite non-negative milliseconds, and token counts are finite non-negative
safe integers. There is no caller-controlled message or key field. `info` is used for success,
`warn` for expected rejection or degradation, and `error` for configuration, provider, or internal
failures requiring investigation. A source guard rejects direct `console.log`, `console.info`,
`console.warn`, `console.error`, and `console.debug` calls elsewhere under `functions/`.

Operational logs never contain:

- prompts, model input, model output, response text, or structured-output payloads;
- names, email addresses, phone numbers, form bodies, CV/JD text, or uploaded content;
- financial, investment, or salary inputs;
- raw or hashed IP addresses, safety identifiers, quota subjects, or quota cache keys;
- cookies, authorization values, arbitrary headers, user agents, or referrers;
- URLs with query strings;
- provider response IDs, raw provider objects, provider error bodies, or provider error messages;
- Cloudflare request IDs, `CF-Ray`, or raw Cloudflare request objects;
- environment values, secrets, stack traces, filesystem paths, branch names, hostnames, or usernames.
- CSP report bodies, document/source/blocked URLs, referrers, script samples, line/column values,
  user agents, arbitrary hosts, or report text.

User content is not “sanitized for logs”; it is not logged.

Malformed telemetry is never attributed to a valid route such as `/api/health`. Invalid identity or
route metadata produces one fixed `telemetry.invalid` event with bounded `unknown` values; the
malformed input is not serialized. Sink failures are swallowed without recursive logging and do not
change the user response.

## Failure taxonomy

Public messages remain endpoint-owned safe static text. The operational class is internal and is not
added to public envelopes.

| Operational class | Public status/code | Level | Retryable | Provider outcome/called |
| --- | --- | --- | --- | --- |
| `CLIENT_INPUT` | 422 `VALIDATION_FAILED` | warn | no | `NOT_CALLED` / no |
| `INVALID_JSON` | 400 `MALFORMED_JSON` | warn | no | `NOT_CALLED` / no |
| `METHOD_NOT_ALLOWED` | 405 `METHOD_NOT_ALLOWED` | warn | no | `NOT_CALLED` / no |
| `ORIGIN_REJECTED` | 403 `ORIGIN_REJECTED` | warn | no | `NOT_CALLED` / no |
| `BODY_TOO_LARGE` | 413 `PAYLOAD_TOO_LARGE` | warn | no | `NOT_CALLED` / no |
| `UNSUPPORTED_MEDIA_TYPE` | 415 `UNSUPPORTED_MEDIA_TYPE` | warn | no | `NOT_CALLED` / no |
| `QUOTA_REJECTED` | 429 `QUOTA_EXCEEDED` or `RATE_LIMITED` | warn | no | `NOT_CALLED` / no |
| `FEATURE_DISABLED` | 503 `FEATURE_DISABLED` | warn | no | `NOT_CALLED` / no |
| `CONFIGURATION_MISSING` | 503 `FEATURE_NOT_CONFIGURED` | error | no | `NOT_CALLED` / no |
| `CONFIGURATION_INVALID` | 503 `CONFIGURATION_INVALID` | error | no | `NOT_CALLED` / no |
| `PROVIDER_TIMEOUT` | 504 `PROVIDER_TIMEOUT` | error | yes | `TIMED_OUT` / yes |
| `PROVIDER_RATE_LIMITED` | endpoint-compatible 429 or 502 | warn | yes | `RATE_LIMITED` / yes |
| `PROVIDER_REFUSED` | 502 `PROVIDER_REJECTED` | warn | no | `REFUSED` / yes |
| `PROVIDER_MALFORMED` | 502 `PROVIDER_REJECTED` | error | yes | `MALFORMED` / yes |
| `PROVIDER_UNAVAILABLE` | 502/503 safe provider code | error | yes | `FAILED` / yes |
| `CLIENT_ABORTED` | stream cancellation; no replacement envelope | warn | no | `ABORTED` / yes |
| `INTERNAL_FAILURE` | 500 `INTERNAL_ERROR` | error | yes | `NOT_CALLED` / no |

Some existing endpoint-compatible public codes group more than one internal class. The operational
taxonomy preserves the distinction without exposing provider internals. Structured refusal signals
are used where available; free-form provider text is neither classified nor logged.

Permanent tests specifically preserve application quota/rate rejection as
`QUOTA_REJECTED`/`providerOutcome=NOT_CALLED`, while an OpenAI 429 is
`PROVIDER_RATE_LIMITED`/`providerOutcome=RATE_LIMITED`.

## Provider instrumentation

The shared Responses API transport owns provider call instrumentation for all four OpenAI-backed
routes. Outcomes are `NOT_CALLED`, `SUCCEEDED`, `TIMED_OUT`, `RATE_LIMITED`, `REFUSED`,
`MALFORMED`, `ABORTED`, or `FAILED`. Only the approved tier `terra`, `sol`, or `none` is logged;
request or provider model strings are not accepted as log metadata.

When Responses usage metadata exists, only `input_tokens`, `output_tokens`, and `total_tokens` are
copied after integer validation. Missing or invalid usage is omitted, never replaced with zero, and
does not fail the request.

For structured endpoints, `providerDurationMs` is measured from shared transport invocation through
validated terminal extraction; `durationMs` covers total Function work through response
construction. Payload JSON is never logged.

For Chat and Founder Compass:

- stream establishment is represented by the public HTTP response and is not called completion;
- `timeToFirstOutputMs` is request start to the first validated provider text delta;
- `providerDurationMs` is provider call start to a validated terminal provider event;
- `streamOutcome` is `COMPLETED`, `FAILED`, or `CLIENT_ABORTED`;
- a provider failure after HTTP stream creation remains an SSE `error` event and an HTTP status of
  200, while internal operational fields record the failure truthfully;
- completion wrapping pulls one source chunk at a time and does not buffer the stream or change SSE
  framing.

One-call, no-automatic-retry, no-fallback, timeout, cancellation, and `store: false` contracts remain
unchanged.

## Quota decisions

Terminal events use:

- `NOT_APPLICABLE` when no quota boundary applies;
- `ALLOWED` when a non-local quota check permits the operation;
- `REJECTED_LIMIT` for burst or count exhaustion;
- `REJECTED_COOLDOWN` for an active time-window entry;
- `BYPASSED_LOCAL` for the existing local-development bypass;
- `STATE_UNAVAILABLE_FAIL_OPEN` only for Chat's documented Cache API failure path.

No quota subject or cache key is logged. Cache API state remains colo-local, race-prone around
check/set, and not globally exact distributed accounting. Only documented storage paths fail open.

## Endpoint controls

Controls are server-side environment values parsed after method/origin validation and before body
processing, quota mutation, provider preparation, or provider calls.

| Control | Absent default |
| --- | --- |
| `AI_CHAT_ENABLED` | enabled |
| `AI_COMPASS_ENABLED` | enabled |
| `AI_CASHFLOW_ENABLED` | enabled |
| `AI_INVESTMENT_ENABLED` | enabled |
| `SAMPLE_REVIEW_ENABLED` | disabled |

Accepted enabled values are `true`, `1`, and `on`; accepted disabled values are `false`, `0`, and
`off`. Case and surrounding whitespace are normalized. Any other explicitly supplied value fails
closed with HTTP 503 and public code `CONFIGURATION_INVALID`. Explicitly disabled features return
HTTP 503 and `FEATURE_DISABLED`. Neither response reveals the control name or value.

Disabled or invalid controls do not touch quota state and do not call a provider. `/api/health`
does not expose controls. Enabling an AI control without `OPENAI_API_KEY` produces the existing
controlled configuration-missing response. Sample Review remains disabled by default; explicit
local enablement still requires its existing Resend configuration and does not bypass future
Turnstile activation requirements. Phase 2B does not activate Resend or send real email.

For local testing, `.dev.vars` remains ignored. Boolean-only examples are:

```dotenv
AI_CHAT_ENABLED=false
AI_COMPASS_ENABLED=on
AI_CASHFLOW_ENABLED=1
AI_INVESTMENT_ENABLED=off
SAMPLE_REVIEW_ENABLED=false
```

Do not commit `.dev.vars`. These examples do not imply preview or production values exist.

## Candidate indicators and SLO discipline

Phase 2B defines measurement contracts, not production baselines. Numerical availability and latency
thresholds remain provisional until authorized preview evidence exists.

| Indicator | Measurement contract | Current classification |
| --- | --- | --- |
| Static-route availability | Successful authorized synthetic fetch divided by attempts; measure separately by route and environment | candidate target; threshold deferred |
| Function request success | Terminal 2xx completions divided by eligible requests; exclude unsupported methods, origin/media/schema/body 4xx, quota rejection, and explicit feature disable | candidate target; threshold deferred |
| Internal Function failure rate | `INTERNAL_FAILURE` terminals divided by eligible Function requests over a proposed rolling 28-day window | candidate target; threshold deferred |
| Provider timeout/rate-limit/refusal rate | Each provider outcome divided by provider calls, by route and approved tier, over a proposed rolling 28-day window | measurement-only until preview |
| Streaming time to first output | Distribution of `timeToFirstOutputMs` for completed streams, separately by route/tier; failures reported separately | measurement-only until preview |
| Structured completion latency | Distribution of `providerDurationMs` for validated structured completions, separately by route/tier | measurement-only until preview |
| Quota distribution | Counts and ratios of safe quota decisions by route; no subject dimension | measurement-only |
| Feature disabled/configuration invalid | Count of `FEATURE_DISABLED` and `CONFIGURATION_INVALID` terminals by route/release | zero invalid configuration candidate; disabled is operational state |
| Deterministic financial regression | Relevant permanent finance suite failures | zero-tolerance invariant |
| Analytics before opt-in | Ahrefs requests observed before consent in permanent no-egress checks | zero-tolerance invariant |

Additional zero-tolerance invariants are no sensitive content in operational logs and no provider
call while a route is disabled or invalid. They are contract failures, not percentile SLOs.
Availability excludes deliberate quota and feature-control rejection; dashboards must not erase
those decisions, but must graph them separately. Final production windows, targets, retention, and
alerts require later authorization.

## Privacy, security, and overhead review

The closed key set prevents arbitrary-key and nested-object injection. Enum/identity validation and
JSON serialization prevent control/newline injection. Numeric guards omit NaN, Infinity, negative
usage, and oversized arbitrary values. Server-generated request IDs prevent spoofing. Control values
are never logged or exposed. Exactly one terminal event limits amplification and duplicate
completion. Raw errors, causes, stacks, request/provider objects, and fallback event data are never
serialized. Logger exceptions are swallowed without recursive logging.

Timing is rounded to whole milliseconds and cannot be joined to an IP, cookie, user identifier, or
content field. Release ID is an intentional non-secret diagnostic identity already exposed by
`/api/health`. Client cancellation is recorded only when observable by the stream wrapper.

Local synthetic review found context construction to be constant-size, logger serialization bounded
to the allowlist, and disabled responses to exit before provider/quota preparation. Instrumentation
does not deep-clone requests or provider objects, access the filesystem, buffer streams, or change
provider retry/timeout behavior. No Cloudflare production-performance claim is made.

## Verification and future activation

```bash
npm run verify:operational-controls
npm run verify:dependency-tree
npm run verify:function-contracts
npm run verify:ai-provider-contracts
```

The operational suite uses synthetic canaries for prompts, outputs, contact data, CV/JD text,
financial values, IP/hashed identifiers, cookies, authorization, provider errors/IDs, and paths.
Fixtures are offline and deterministic. The application emits minimized console events and
intentionally configures no external logging service. That does not prove Cloudflare captures no
logs. Phase 3 must verify capture, default retention, sampling, access, exports, Logpush, dashboard
visibility, and relevant data-region behavior, alongside alerts, production SLOs, and remote feature
values.
