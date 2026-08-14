# CSP reporting

## Boundary and status

Phase 2C delivers `Content-Security-Policy-Report-Only`. It does not enforce CSP. The source is
`public/_headers`; the built `_headers` file is the validation target. CSP permission does not
replace analytics consent or click-to-load activation.

The exact policy is:

```text
default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://analytics.ahrefs.com https://giscus.app https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://analytics.ahrefs.com https://cloudflareinsights.com; frame-src https://giscus.app https://www.youtube-nocookie.com https://open.spotify.com; media-src 'self'; manifest-src 'self'; worker-src 'self'; report-uri /api/csp-report; report-to csp-endpoint
```

`Reporting-Endpoints: csp-endpoint="/api/csp-report"` declares the modern same-origin endpoint.
`report-uri` remains as the compatible CSP fallback. There is no enforcement header, wildcard,
broad `https:`, `http:`, or `'unsafe-eval'`. `frame-ancestors` is not claimed here because this wave
is Report-Only; the existing `X-Frame-Options: DENY` remains the active framing control.

`'unsafe-inline'` remains narrowly in `script-src` and `style-src`. Current static Astro output
contains framework and component inline scripts plus component inline styles. Static Pages headers
cannot issue per-response nonces. Removing these allowances requires a measured hash or build-time
nonce design before later enforcement; Phase 2C does not broaden them or add evaluation.

## Browser resource and origin inventory

Ordinary external links are navigation only and do not create CSP resource allowances.

| Origin/resource | Actual loader | Category | Consent/activation | Directives |
| --- | --- | --- | --- | --- |
| same origin | Astro assets, Fontsource files, images, manifest, media, Pagefind worker, Pages Functions | essential first-party | immediate | `default/script/style/img/font/connect/media/manifest/worker-src 'self'` |
| `data:` images | generated/static image data | essential first-party rendering | immediate | `img-src data:` |
| `analytics.ahrefs.com` | dynamic script in `BaseLayout.astro` | optional analytics | analytics opt-in only | `script-src`, `connect-src` |
| `static.cloudflareinsights.com` / `cloudflareinsights.com` | dynamic Cloudflare Web Analytics script in `BaseLayout.astro` | optional analytics | performance-analytics opt-in only | `script-src`, `connect-src` |
| `giscus.app` | `Comments.astro` script and frame | user-requested embed | click-to-load | `script-src`, `frame-src` |
| `www.youtube-nocookie.com` | media iframe (privacy-enhanced embed domain; the plain `youtube.com` domain is never used for embeds) | user-requested embed | click-to-load | `frame-src` |
| `open.spotify.com` | media iframe | user-requested embed | click-to-load | `frame-src` |
| OpenAI | Pages Function transport | server-side only | explicit AI submission | none |
| Resend | inactive Sample Review Function transport | inactive/future, server-side only | not active | none |
| Cloudflare | hosting and same-origin Functions | infrastructure | essential | no third-party browser origin |
| cal.eu and social/profile sites | anchors | external link only | visitor navigation | none |

Generated HTML contains no initial Ahrefs script, Giscus script/frame, YouTube frame, or Spotify
frame. Self-hosted Fontsource assets require no third-party font origin. The prior
`via.placeholder.com` test-component image was removed as obsolete.

## Collector contract

`POST /api/csp-report` is a deliberate empty-response exception to the normal JSON envelope:
accepted reports return `204 No Content`. It accepts only `application/csp-report` legacy objects
and `application/reports+json` Reporting API arrays. Other methods return 405, other media types 415,
malformed structures 400, and oversized bodies 413. Responses are empty, `no-store`, do not enable
CORS, set cookies, reflect input, retry a report, or make an external request.

Limits are 4 KiB per request, eight reports per modern batch, bounded nesting and strings, finite
integer metadata, and control-character rejection. Excess or unsupported batch items are dropped
without per-item logging.

Raw bodies, document URLs, query strings, fragments, referrers, source files, samples, lines,
columns, user agents, IP values, cookies, arbitrary hosts, and arbitrary text are neither retained
nor logged. The collector maps input to bounded directive/resource classes. Resource classes are
`self`, `inline`, `eval`, `data`, `blob`, `ahrefs`, `github`, `giscus`, `youtube`, `spotify`,
`other-external`, and `unknown`. It emits at most one minimized `csp.summary` and one terminal
request event per request. Unknown values become bounded classes rather than hashes or raw values.
Strict body/count controls and batch coalescing prevent the endpoint becoming an unbounded log
amplifier.

## Verification

```bash
npm run verify:csp
```

The permanent Node 24 suite builds the actual site, verifies the generated header artifact,
inventoried origins, consent/activation boundaries, collector parsing and limits, empty 204 bodies,
bounded logging, and no egress. Enforcement remains a later evidence-based decision.
