# Privacy, consent, and external-service boundary

Status: **living technical record; qualified privacy-policy review remains open.**

This document owns the technical description of when the browser or a Pages Function contacts an
external service. It does not make legal conclusions. The public policy is rendered by
`src/pages/datenschutz.astro`; changes to legal bases or regulated wording require qualified review.

## Service matrix

| Service | Trigger | Data boundary | Current state |
| --- | --- | --- | --- |
| Cloudflare Pages | Any page or Function request | Hosting, CDN, request metadata | Active |
| Ahrefs Web Analytics | Explicit analytics opt-in | Optional page-view analytics | Available, opt-in only |
| Giscus | Visitor clicks the load-comments control | GitHub/Giscus comment embed | Available, click-to-load |
| OpenAI | Visitor explicitly submits an AI action | Function-selected prompt, evidence, or structured tool input | Active for configured AI routes |
| Resend | Valid Sample Review submission after configuration | Form-derived email | Inactive; configuration absent |
| CSP reporting | Browser policy violation | Minimized bounded directive/resource classes | Same-origin; raw report discarded |
| cal.eu | Visitor follows the external booking link | Navigation to external booking service | External link |

## Consent state

`src/lib/consent.ts` owns versioned analytics preferences. Necessary theme and language preferences
do not imply analytics consent. Legacy banner state is not treated as opt-in. Ahrefs loads only
after an affirmative analytics decision; withdrawal prevents subsequent loading.

Giscus remains a separate user-requested embed. No request to `giscus.app` occurs before the visitor
uses the load control.

## AI processing

Chat, JD analysis, Founder Compass, cashflow stress testing, and investment analysis contact OpenAI
only after an explicit user action. Contextual disclosure appears immediately before each action.
Pages Functions control the model, instructions, output ceiling, and request shape.

The shared provider transport sets `store: false`. This disables application-state persistence for
the response object; it is not a general retention promise. The application does not send raw IP
addresses to OpenAI. Quota keys use local hashes, and those keys are not provider inputs.

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

The Report-Only policy permits only inventoried origins. Ahrefs remains opt-in and Giscus, YouTube,
and Spotify remain click-to-load; a CSP allowance does not authorize loading. The same-origin report
collector discards raw report bodies and does not retain URLs, referrers, script samples,
user-agent/IP data, cookies, or arbitrary hostnames. See [CSP reporting](csp-reporting.md).

## Logging and validation

Application logs are now a strict operational allowlist and must not contain secrets, prompts,
outputs, personal/form/financial content, raw or hashed identifiers, arbitrary headers, provider
objects/errors, or paths. Permanent adversarial canary tests enforce that boundary; the complete
schema lives in
[operational-controls-observability.md](operational-controls-observability.md). Privacy, Function,
provider, and operational tests use local fixtures and injected providers; they do not contact
Ahrefs, OpenAI, Resend, or production services.

Run:

```bash
npm run verify:privacy
npm run verify:operational-controls
npm run verify:function-contracts
npm run build
npm run lint:a11y:strict
```

## Open gates

- qualified review of the public privacy policy;
- live-state confirmation during an authorized release candidate;
- Turnstile and Resend only if Sample Review is deliberately activated;
- post-deployment no-egress checks for analytics, embeds, AI actions, and the inactive form.
