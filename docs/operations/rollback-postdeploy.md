# Rollback and postdeployment

## Read-only postdeployment verification

```bash
npm run verify:postdeploy -- \
  --base-url <url> \
  --expected-release-id <release-id> \
  --expected-source-revision <revision>
```

**`--expected-release-id`/`--expected-source-revision` name the *deployed* identity, not the
*canonical candidate* identity.** These two are the same value only when the canonical local `HEAD`
is itself what got deployed (e.g. `master` production). They diverge whenever a public-safe preview
commit is deployed: Cloudflare's build sets `CF_PAGES_COMMIT_SHA` to the commit it actually checked
out (the pushed preview commit), so `provenance.mjs`'s `readSourceIdentity()` computes the
**deployed public preview release identity** from *that* commit's SHA and commit time — not from the
internal canonical source revision recorded in the preview commit's `Canonical-Source` trailer.
Compute the value passed here from the commit that is actually live at `--base-url` (recompute with
`createReleaseIdentity()`/`provenance.mjs identity` against that exact commit), never by reusing the
canonical candidate's own `git-<hash>` identity.

The default verifier uses only GET and HEAD. It requires HTTPS except for explicit localhost, rejects
redirect/origin drift, and checks the homepage, representative DE/EN/RO pages, privacy, one finance
tool, health GET/HEAD identity, CSP Report-Only and reporting headers, cache behavior, document and
asset 404s, robots, sitemap, hreflang, and absence of public manifest/SBOM files.

`HEAD /api/sample-review` is the narrow non-submitting release-state probe: it returns empty 204 only
for the disabled default and 409 when enabled or invalid. It parses no form and calls no provider.
`/api/health` remains independent and exposes no feature state.

The verifier does not accept cookies, load optional embeds, activate Ahrefs, submit a form, call an
AI route, send email, change Cloudflare, or mutate content. Provider canaries are absent by default;
the reserved `--allow-provider-canary` flag fails because canaries require separate Phase 3
authorization and are not implemented in this wave.

## Firefox release matrix

The tracked dependency-free Marionette harness accepts an explicit Firefox binary, base URL,
temporary profile, expected release ID, and dead-proxy mode. The runtime contract pins official
Firefox 144.0.2 and its official archive SHA-256; tracked code contains no personal cache path.

Against local Wrangler it checks fresh undecided consent, no optional initial resource, essential
only, one idempotent Ahrefs insertion after opt-in, withdrawal preventing future insertion,
DE/EN/RO consent copy, ClientRouter locale navigation, click-to-load media and Giscus, CSP
Report-Only, 320 px layout, 200% text-scale layout, health identity, and disabled Sample Review.
Dead proxy prevents successful non-local traffic. Temporary browser/server processes and profiles
are stopped and removed after the run.

## Rollback plan

```bash
npm run plan:rollback -- \
  --current-manifest <path> \
  --target-manifest <path>
```

The planner validates distinct manifests and retained target deploy/checksum evidence, compares
release IDs, source revisions and artifact digests, identifies the target public release commit, and
prints an ordered checklist, verification command, and abort conditions. It never runs Git,
Cloudflare, provider, or deployment commands and never mutates `master`.

Classify an incident before choosing a response:

| Condition | Default disposition |
| --- | --- |
| wrong release/source/artifact, widespread route failure, privacy regression, broken 404/cache, Sample Review enabled | abort before deploy or deployment rollback |
| CSP collector amplification or raw-report leakage | disable/rollback the affected release; do not wait for volume thresholds |
| one AI endpoint provider failure with deterministic/static site healthy | endpoint kill switch before full rollback |
| expected Report-Only violation with no user/security impact | observe and classify |
| missing target evidence, unapproved lineage, unconfirmed deploy ownership, unsafe verification | abort rollback action |

No arbitrary production threshold is invented. A health/release mismatch, material privacy boundary
failure, or wrong artifact is sufficient to abort. Deployment and rollback remain explicitly
authorized Phase 3/4 operations; these commands only prepare evidence.
