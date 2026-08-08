# Privacy, consent, and external-service boundary

Status: **living technical record; technical/privacy review and an explicit owner release decision
are complete for the current non-commercial release scope (Phase 3-C Step 3E-A); qualified external
legal review is trigger-based, not a blocker, for that scope — see "Open gates" below.**

This document owns the technical description of when the browser or a Pages Function contacts an
external service. It does not make legal conclusions. The public policy is rendered by
`src/pages/datenschutz.astro`; changes to legal bases or regulated wording require qualified review.

## Service matrix

| Service | Trigger | Data boundary | Current state |
| --- | --- | --- | --- |
| Cloudflare Pages | Any page or Function request | Hosting, CDN, request metadata | Active |
| Cloudflare Web Analytics (RUM) | Explicit performance-analytics opt-in | Core Web Vitals and timing metrics only | Available, opt-in only, manually loaded by the application (see below) |
| Ahrefs Web Analytics | Explicit acquisition-analytics opt-in | Page-view, referrer/channel, UTM, and landing/entry/exit-page analytics | Available, opt-in only |
| Giscus | Visitor clicks the load-comments control | GitHub/Giscus comment embed | Available, click-to-load |
| YouTube (embed) | Visitor clicks the media placeholder | Privacy-enhanced `youtube-nocookie.com` iframe only | Available, click-to-load |
| Spotify (embed) | Visitor clicks the media placeholder | `open.spotify.com` iframe | Available, click-to-load |
| GitHub static snapshot (`/projects`) | None — build-time only | No browser request; `src/data/github-snapshot.json` is committed and rendered statically | Active, static, refreshed only by an explicit manual script run |
| OpenAI | Visitor explicitly submits an AI action, confirmed by an unchecked-by-default per-surface contextual consent checkbox | Function-selected prompt, evidence, or structured tool input | Active for configured AI routes |
| Resend | Valid Sample Review submission after configuration | Form-derived email | Inactive; configuration absent |
| CSP reporting | Browser policy violation | Minimized bounded directive/resource classes | Same-origin; raw report discarded |
| cal.eu | Visitor follows the external booking link | Navigation to external booking service | External link |

## Consent state

`src/lib/consent.ts` owns a versioned preference record (v3) with **two independent, opt-in-only
analytics channels**: `performanceAnalytics.cloudflareRum` and `acquisitionAnalytics.ahrefs`. Necessary
theme and language preferences do not imply either. Legacy banner state is not treated as opt-in.
Accepting one channel never grants the other; each is independently withdrawable, and withdrawal
persists the new preference, emits the internal change event, and reloads the page so the retracted
provider's already-executing code is guaranteed to stop on the next parse (a live DOM change alone
cannot guarantee that — see the withdrawal contract in `src/components/common/CookieConsent.astro`).

A v2 record's single `analytics` boolean — which only ever gated Ahrefs — migrates exclusively to
`acquisitionAnalytics.ahrefs`; it is never extended to `performanceAnalytics.cloudflareRum`, a
purpose the v2 banner never disclosed. Malformed or structurally unrecognized stored values are
treated exactly like a first-time visitor (`decided: false`, both channels off), never as an assumed
decision.

Cloudflare Web Analytics is embedded manually by the application (`BaseLayout.astro`), gated on
`performanceAnalytics.cloudflareRum`, instead of relying on Cloudflare's platform-level automatic
injection — which cannot be consent-gated by application code at all. This manual, consent-gated
loader is application/runtime implementation: it is implemented, validated, and integrated into
canonical. Remotely, Cloudflare's platform-level automatic RUM injection has been disabled for future
deployments (Phase 3-C Step 2C-1: Pages Web Analytics tag/token nulled, zone Automatic Setup switched
to manual-install), and the application loader's site token has been updated to match the new
manual-install token. Phase 3-C Step 2C-2 is implemented, locally validated, and integrated into
canonical; it is not yet deployed to preview or production. The currently-live production deployment predates this
loader entirely and continues to serve its own, separately baked-in beacon until a new deployment is
released; see [cloudflare-pages-configuration.md](cloudflare-pages-configuration.md) for the full
remote-cutover record and the legacy-production distinction.

Giscus remains a separate user-requested embed. No request to `giscus.app` occurs before the visitor
uses the load control.

The former GitHub REST API widget on `/projects` (`GitHubWidget.astro` calling
`loadGitHubStats()` automatically, unconsented, on every page load) has been replaced by a static,
build-time snapshot. `scripts/update-github-snapshot.mjs` is a manual-only tool — never invoked by
build, test, or CI — that fetches the two public, unauthenticated GitHub REST endpoints it needs,
validates their shape strictly, and writes a small deterministic summary to the tracked
`src/data/github-snapshot.json`. The browser never contacts `api.github.com`, and
`localStorage['github_stats_cache']` no longer exists.

## AI processing

Chat, JD analysis, Founder Compass, cashflow stress testing, and investment analysis contact OpenAI
only after an explicit user action. Contextual disclosure appears immediately before each action.
Pages Functions control the model, instructions, output ceiling, and request shape.

The shared provider transport sets `store: false`. This disables application-state persistence for
the response object; it is not a general retention promise. Independently of `store: false`, this
project's OpenAI organization has intentionally enabled voluntary sharing of API inputs and outputs
with OpenAI — model feedback sharing and evaluation/fine-tuning data sharing are both enabled,
confirmed directly by the owner (`OWNER-CONFIRMED`, Phase 3-C Step 3D), as a deliberate, voluntary
contribution to model quality and improvement. OpenAI may use this data for quality evaluation and
to improve or train its models. `store: false` and organization-level sharing are independent
controls; neither implies or disables the other. Zero Data Retention (ZDR) is not claimed. OpenAI
may separately retain data for a bounded window for abuse and security monitoring. The application
does not send raw IP addresses to OpenAI. Quota keys use local hashes, and those keys are not
provider inputs. The server-side quota window is 24 hours for the Chat assistant and 7 days for
Founder Compass, the Cashflow AI narrative, and the Investment Analytics AI interpretation
(`pages-functions-contracts.md`). Because sharing is enabled, the consent copy on every AI surface
and the privacy policy warn users not to enter sensitive, confidential, or third-party personal
data, and to prefer anonymized or synthetic input.

### Contextual consent contract (Phase 3-C Step 2B-2)

Each of the five AI-triggering client actions — chat questions, JD analysis, Founder Compass
report generation, the Cashflow AI stress-test narrative, and the Investment Analytics AI
interpretation — shows an unchecked-by-default, explicit consent checkbox immediately before the
action that would transmit data externally. The checkbox is scoped to its own surface (checking it
for one tool or tab never grants consent for another) and is not persisted to `localStorage`, a
cookie, or any global toggle; it resets to unchecked on reload or when the component remounts.
On the chat and JD-analysis surfaces (`ChatWidget.astro`), checking the box immediately collapses
the full disclosure into a compact "consent active" status row with a withdrawal control (Phase
5-D1A) — this returns space to the message area and happens before any submit, with no network
request of its own; withdrawing restores the full disclosure and re-blocks future submissions,
and consent remains just as transient and per-surface as described above.
Deterministic fact-chip answers on the chat widget (contact, role, certifications, projects) never
call OpenAI and are therefore never gated by this checkbox — no result is hidden or degraded, and
the same applies to the fully client-side Cashflow/Investment deterministic calculations.

Checking the box attaches `{ privacyConsent: true, privacyNoticeVersion: "ai-openai-v2" }` to the
request. `AI_PRIVACY_NOTICE_VERSION` in `functions/_lib/ai-privacy-notice.ts` is the single
authoritative constant for that version string, imported by both the client components and the
four AI Functions rather than duplicated. `ai-openai-v2` (Phase 3-C Step 3D) is a material
correction over the prior `ai-openai-v1` notice: it discloses that organization-level OpenAI
sharing (model feedback, evaluation/fine-tuning) is intentionally enabled, and warns against
submitting sensitive, confidential, or third-party personal data — see
[ai-provider-responses-migration.md](ai-provider-responses-migration.md) §3. Each Function validates the pair and rejects an invalid or
missing pair with `400 PRIVACY_CONSENT_REQUIRED` before any quota write or provider call.
`compass`/`cashflow-scenario`/`investment-analysis` check it before any rate-limit consumption or
quota lookup/write at all. `chat` is an accepted, documented ordering exception: its pre-existing,
body-independent per-IP burst limiter and a read-only quota lookup (needed to render the quota badge
for the consent-exempt deterministic fact-chip path too) run before the consent check; the quota
*write* and the provider call still run only after it (`pages-functions-contracts.md`,
`operational-controls-observability.md`).

## Inactive Sample Review

The form route exists, but email delivery is inactive while Resend configuration is absent. The
Function fails closed before parsing submitted form data and returns a controlled unavailable
response. Activation requires a separately authorized release including Turnstile, Resend
provisioning, focused no-egress and abuse-control tests, and policy review.

Phase 2C release policy requires Sample Review disabled. A read-only HEAD probe verifies that state
without parsing or submitting a form. Later activation requires Turnstile implementation and remote
configuration, Resend configuration, abuse tests, retention/deletion review, qualified privacy
review, and explicit owner authorization; Resend variables alone are insufficient.

## CSP permission and consent

The Report-Only policy permits only inventoried origins. Cloudflare Web Analytics and Ahrefs both
remain opt-in, and Giscus, YouTube, and Spotify remain click-to-load; a CSP allowance does not
authorize loading. `api.github.com` is not permitted — the GitHub static snapshot makes no browser
request. The same-origin report collector discards raw report bodies and does not retain URLs,
referrers, script samples, user-agent/IP data, cookies, or arbitrary hostnames. Cloudflare Insights
hosts (`static.cloudflareinsights.com`, `cloudflareinsights.com`) are classified explicitly in the
collector rather than falling into the generic external-host bucket. See
[CSP reporting](csp-reporting.md).

## Logging and validation

Application logs are now a strict operational allowlist and must not contain secrets, prompts,
outputs, personal/form/financial content, raw or hashed identifiers, arbitrary headers, provider
objects/errors, or paths. Permanent adversarial canary tests enforce that boundary; the complete
schema lives in
[operational-controls-observability.md](operational-controls-observability.md). Privacy, Function,
provider, and operational tests use local fixtures and injected providers; they do not contact
Cloudflare Web Analytics, Ahrefs, OpenAI, Resend, or production services.

Run:

```bash
npm run verify:privacy
npm run verify:operational-controls
npm run verify:function-contracts
npm run build
npm run lint:a11y:strict
```

## Open gates

- **Owner release decision (Phase 3-C Step 3E-A):** for the current release — a personal,
  non-commercial professional portfolio and open-source proof of concept — the owner has completed
  a documented technical/privacy review and made an explicit risk-acceptance decision: qualified
  external legal review is trigger-based rather than a release blocker for this scope. This is a
  proportionality and risk-acceptance decision, not a legal conclusion; it does not assert GDPR
  certification, absolute legal compliance, a completed qualified legal review, or the absence of
  risk. Qualified external review becomes required again if the project introduces commercial or
  contractual services, real client documents or data, Sample Review or Resend activation, uploads
  or persistent storage, authentication/accounts/portals, systematic processing of personal
  financial data, organizational users, or a material change of providers or processing purposes.
  Independently of that decision, the specific legal questions below remain open and unresolved:
  the Cloudflare controller/processor role split, the Art. 6(1)(a) legal-basis wording for AI
  and Giscus, and whether the AI features fully fall outside GDPR Art. 22 — none of this document's
  waves, including Step 3E-A, resolve them;
- live-state confirmation during an authorized release candidate;
- Turnstile and Resend only if Sample Review is deliberately activated;
- post-deployment no-egress checks for analytics, embeds, AI actions, and the inactive form;
- **legacy production artifact**: the remote automatic-injection cutover (Step 2C-1) and the local
  application-token update (Step 2C-2) do not retroactively change the currently-live production
  deployment's already-built HTML, which predates the consent-gated loader and still serves its own
  unconditional Cloudflare and Ahrefs scripts. Only a new deployment carrying the current canonical
  loader removes this. See [cloudflare-pages-configuration.md](cloudflare-pages-configuration.md) for
  the full record;
- Step 2B-1 and Step 2B-2 are implemented, validated, and integrated into canonical. Step 2C-1 (remote
  cutover) is executed and verified remotely. Step 2C-2 (application token update) is implemented,
  locally validated, and integrated into canonical; it is not yet deployed to preview or production.
  Preview deployment and preview acceptance for this canonical state are still pending; local validation
  alone does not demonstrate preview or production behavior.

Resolved by Phase 3-C Step 2B-1 (implemented, validated, and integrated into canonical): the former
GitHub REST API widget on `/projects` is now a static build-time snapshot with no browser-side
request; see the service matrix and consent-state sections above.

Resolved by Phase 3-C Step 2B-2 (implemented, validated, and integrated into canonical): the AI
contextual-consent contract described above; the Chat quota-window mis-statement (`PRIV-015`,
weekly → 24-hour) and the `store: false`/training/abuse-monitoring conflation
(`PRIV-003`/`PRIV-004`) in `datenschutz.astro`
§7; YouTube embeds switched to the privacy-enhanced `youtube-nocookie.com` domain (`PRIV-008`); a
`cal.eu` disclosure paragraph added to `datenschutz.astro` (`PRIV-009`); and a localStorage-category
paragraph added to `datenschutz.astro` §2 (`PRIV-011`). `PRIV-005`, `PRIV-006`, `PRIV-016`
(legal-basis and Cloudflare role questions), and `PRIV-017` (whether the AI features' output fully
falls outside GDPR Art. 22) remain open, unchanged, pending qualified review — the new
`datenschutz.astro` §7 paragraph describes the technical behavior (no automated grant/rejection or
binding contract decision) without declaring the Art. 22 legal question itself settled.

Resolved by Phase 3-C Step 3D (implemented, locally validated, and integrated into canonical): the
consent notice version advanced to `ai-openai-v2`, correcting the prior `ai-openai-v1` notice's
framing of OpenAI data use. The owner confirmed (`OWNER-CONFIRMED`) that organization-level OpenAI
sharing — model feedback sharing and evaluation/fine-tuning data sharing — is intentionally enabled
for this project, as a deliberate, voluntary contribution to model quality and improvement; this
was previously understated as an unverified general-policy hedge. `datenschutz.astro` §7 and the
consent copy on all five AI surfaces now disclose this and warn against submitting sensitive,
confidential, or third-party personal data. `store: false` and ZDR-not-claimed remain unchanged and
independent of this sharing setting. Preview deployment and preview acceptance for this canonical
state are pending; local validation alone does not demonstrate preview or production behavior.
