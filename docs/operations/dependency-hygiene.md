# Dependency hygiene

## Scope and evidence basis

Phase 2A reviewed every direct dependency, development dependency, and npm script against imports,
configuration, loaders, source files, and the locked dependency tree, using the then-current
lockfile, `npm ls --all`, `npm outdated --json`, and the read-only npm advisory inventory on
2026-07-24. Phase 2D-A migrated the canonical toolchain to Astro 7.1.3 and re-ran the same evidence
basis — `npm ls --all`, `npm outdated --json`, and a point-in-time, registry-backed `npm audit --json`
— against the new lockfile on 2026-07-26. Phase 3-B3R later adopted Dependabot PR #38, bumping the
graph from Astro 7.1.3 to Astro 7.1.6 (see below). The sections below describe the current canonical
`integration/portfolio-hardening-2026-07` graph (Astro 7.2.0, since the routine-maintenance
framework-runtime Batch 3 adoption documented further below). The Astro 6.4.8 graph is preserved
as a historical baseline further below; it no longer describes canonical state.

**Precision note on "fresh" vs. "offline" (Phase 2D-B audit correction, 2026-07-26):** three
distinct facts must not be conflated. (1) The `npm audit --json` run described below was a
**point-in-time, online, registry-backed** query against the npm advisory database — it required
network access to the registry at the time it ran, it was not offline. (2) The repository's
committed unified release gate (`npm run verify:advisory-register`) verifies the **committed
advisory register and exact dependency graph offline**, against the snapshot recorded in
`config/dependency-advisories.json` — it re-checks consistency, it does not re-query the npm
registry, and it cannot discover advisories published after the snapshot was taken. (3) Phase 3 is
planned to add **recurring, fresh, online** advisory discovery and alerting (Dependabot-style
automation) — this does not yet exist and is not provided by either (1) or (2).

## Canonical dependency graph — Astro 7.2.0 (Phase 2D-A, updated Phase 3-B3R, updated framework-runtime Batch 3)

**Exact target lockfile at the time this framework graph was recorded**: `package-lock.json`
SHA-256 `ef0484b4b4bd6c782f7eef2c99b3c9b89d5dc950d723a41b286b8c930d206e41`. Phase 5-D1E's
security-only dependency patches (see below) changed this hash to
`3be86d36c28f3071cdd9e11e7635c8dd58d365d61a50d03f89b9f19ce730c2b2` without touching any of the
`astro`/`@astrojs/*`/`vite` versions this section describes — the framework graph table below
remains current. The routine-maintenance Safe Batch 1 adoption below (2026-08-13) changed the hash
again to `5b42bf683a246303001e7dcd133640fba467c9374604f51b7fc6119cd40fd880`, bumping only
`@lucide/astro` (1.28.0→1.29.0, table updated) and the devDependency `terser` (5.46.1→5.49.2, not
part of this framework table). `config/dependency-advisories.json`'s `lockfileSha256` tracks the
current one. Phase 3-B3R adopted Dependabot PR #38
(`astro` 7.1.3→7.1.6, `@astrojs/mdx` 7.0.3→7.0.5, `@lucide/astro` 1.26.0→1.28.0, plus the
coupled `@astrojs/markdown-remark` 7.2.1→7.2.2 peer bump astro 7.1.5 itself requires) after
confirming every intermediate release is patch-only with no breaking changes against the official
`withastro/astro` release notes.

**Target graph versions observed on Node 22.22.3 / npm 11.16.0 / Linux x64 glibc**:

| Package | Version(s) observed | Path |
| --- | --- | --- |
| `astro` | 7.2.0 | direct |
| `@astrojs/mdx` | 7.0.5 | direct |
| `@astrojs/svelte` | 9.0.1 | direct |
| `@lucide/astro` | 1.29.0 | direct |
| `@astrojs/markdown-remark` | 7.2.2 | transitive via `astro`; supplies the pinned `unified()` processor |
| `vite` | 8.1.5 | transitive via `astro`, `@astrojs/svelte`, `@tailwindcss/vite` (single deduped version) |
| `pagefind` | 1.5.2 | direct |
| `sharp` | 0.35.3 | `astro@7.2.0 -> sharp` (optional) |
| `sharp` | 0.35.2 | `wrangler -> miniflare -> sharp` (optional; `wrangler` at 4.120.0 as of Phase 5-D1E, see below) |
| `esbuild` | 0.28.1 | single deduped version across `astro`, `vite`, `wrangler` |

**No `overrides` or `resolutions` are used to reach this graph.** `npm install` alone resolved every
path to the versions above.

**Fresh `npm audit --json` result** (observation date 2026-08-01, this lockfile):

```json
{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
```

`config/dependency-advisories.json`'s machine-readable `advisoryRecordCounts` (per unique advisory)
and `packagePathFindingCounts` (per installed package/path) are both zero for this graph, and
`records`/`packagePathFindings` are both empty.

This resolves all five findings tracked in the historical Astro-6 advisory register below, for this
exact graph:

- the three Astro advisories (`GHSA-4g3v-8h47-v7g6`, `GHSA-f48w-9m4c-m7f5`, `GHSA-7pw4-f3q4-r2p2`)
  no longer apply — each is patched at or before `astro@7.0.4`–`7.1.0`, and this graph is on
  `astro@7.1.3`;
- the esbuild advisory (`GHSA-g7r4-m6w7-qqqr`, patched `>=0.28.1`) no longer applies — every
  `esbuild` path on this graph is the patched `0.28.1`, not the previously-affected `0.27.7`;
- the Sharp/libvips advisory (`GHSA-f88m-g3jw-g9cj`, patched `>=0.35.0`) no longer applies — both
  `sharp` paths on this graph (`0.35.3`, `0.35.2`) are patched versions, not the previously-affected
  `0.34.5`.

**Zero findings for the exact lockfile at the recorded observation time; future advisories remain
subject to continuous monitoring and reevaluation.** This is a point-in-time, online,
registry-backed `npm audit` result for this one lockfile — it is not a permanent or
continuously-verified zero-vulnerability claim. The committed `verify:advisory-register` gate
re-checks this snapshot's internal consistency offline on every run; it does not substitute for
Phase 3's planned recurring *online* advisory discovery and scheduled monitoring/Dependabot-style
automation, which remain required regardless of this observation.

`config/dependency-tree-exceptions.json` is empty on this graph: the two Astro-6-era optional
musl-on-glibc diagnostics no longer occur, so the verifier correctly rejects them as stale rather
than pre-approving them.

### Fresh online advisory review (Phase 3-C Step 3E-A, superseding the 2026-08-01 zero-findings snapshot above)

The `2026-08-01` `config/dependency-advisories.json` snapshot above is now stale: new advisories were
published against this exact lockfile on 2026-08-03/2026-08-04. A fresh `npm audit --json` and a live
GitHub Advisory Database scan (`scripts/security/github-advisory-scan.mjs`, all three types —
`reviewed`, `unreviewed`, `malware`) against the unchanged canonical lockfile found **7 applicable
GHSA records**, all `devDependencies`, none reachable from `dist/` or the deployed Pages Functions
runtime:

| Package/path | GHSA | Severity | Reachable via | Repository Dependabot alert |
| --- | --- | --- | --- | --- |
| `undici@7.28.0` (`wrangler@4.114.0 -> miniflare -> undici`) | GHSA-4cwx-7wf7-3272 | high | local `wrangler pages dev`/miniflare simulator only | #49, open |
| `undici@7.28.0` (same path) | GHSA-m8rv-5g2x-5cg5, GHSA-jr45-8vmc-qm54, GHSA-v3r7-h72x-cjcm, GHSA-8xcm-r25x-g524 | medium (×4) | same | #52, #50, #51, #48, all open |
| `fast-uri@3.1.4` (`@astrojs/check -> ... -> ajv -> fast-uri`) | GHSA-7p8r-x3mc-p8w7 | high | local `npm run check` (Astro/TS diagnostics) only | not yet alerted (GHAD/Dependabot sync lag) |
| `brace-expansion@5.0.8` (`glob -> minimatch -> brace-expansion`) | GHSA-rgw5-rvv9-x895 | high | local build/test scripts' glob patterns only | not yet alerted (GHAD/Dependabot sync lag) |

The separately-resolved top-level `undici@7.29.0` (pulled in by `jsdom`, used only by
`tests/report-markdown.test.mjs`) is **not** in any vulnerable range — the fix for every one of the
5 undici GHSAs above is `>=7.29.0`; only the nested copy `miniflare` pins at `7.28.0` is affected.

**Applicability verdict: not-applicable to the deployed product for all 7.** `wrangler`, `miniflare`,
and `@astrojs/check` are `devDependencies` (`dev: true` in the lockfile); `glob` is a devDependency
used only by local repository scripts. None of the four packages above are imported by `functions/`
or `src/`, and none are bundled into `dist/` or the Cloudflare Pages Functions deploy artifact. Each
advisory's vulnerable capability is absent from how this repository actually exercises these
packages: the undici findings require either a shared multi-tenant HTTP cache or an attacker-supplied
duck-typed blob body — capabilities `wrangler pages dev`'s local single-developer simulator never
exposes to untrusted network input; the `fast-uri` finding requires parsing an attacker-controlled
URL — `@astrojs/check` only parses this repository's own local TypeScript/Astro/YAML config; the
`brace-expansion` finding is a glob-pattern DoS — this repository's `glob` usage expands only
repository-local file patterns, never external input. This session did not upgrade any dependency;
resolving these (a `wrangler` major-version bump, `isSemVerMajor: true` per `npm audit`) remains
future dependency-upgrade work, not a release blocker for the current preview candidate.

Two of the seven (`fast-uri`, `brace-expansion`) are not yet Dependabot alerts for this repository
even though the underlying GHSA records already exist in the live GitHub Advisory Database — a
GHAD-to-Dependabot sync-lag observation, not a repository misconfiguration.

### Live advisory remediation and gate (Phase 5-D1E)

The Phase 3-C Step 3E-A review above deliberately left its 7 findings unpatched
(`devDependencies`, judged unreachable). Phase 5-D1E revisited that decision: a
fresh live scan (`scripts/security/github-advisory-scan.mjs`, all three types)
against the unchanged lockfile (`ef0484b4b4bd6c782f7eef2c99b3c9b89d5dc950d723a41b286b8c930d206e41`)
found **10 applicable GHSA records** — the prior 6 (`fast-uri`, `brace-expansion`,
5× `undici`) plus 4 newly published since: `dompurify` (GHSA-55q2-fjhq-7xh7,
IN_PLACE hook removal XSS, direct runtime dependency used by
`src/lib/security/report-markdown.ts`), two `js-yaml` ranges (GHSA-5p4m-2wfm-xmqj,
quadratic-CPU `!!omap` resolution, via `astro`/`gray-matter` build tooling), and
`nanoid` (GHSA-2v37-7h3g-55p8, indefinite loop on a zero-size custom generator,
via `vite`/`postcss` build tooling).

Because every one of the 10 has a compatible patch release and none required a
breaking or major-version change, Phase 5-D1E's default policy (patch when
safe, regardless of reachability) superseded Step 3E-A's "leave it, it's
unreachable" disposition:

| Package | Installed → patched | Path | Mechanism |
| --- | --- | --- | --- |
| `dompurify` | 3.4.12 → 3.4.13 | direct | exact-pin bump in `package.json` |
| `js-yaml` | 4.3.0 → 4.3.1, 3.15.0 → 3.15.1 | `astro`/`@astrojs/internal-helpers`, `gray-matter` | `npm update` (parent semver range already allowed it) |
| `fast-uri` | 3.1.4 → 3.1.5 | `@astrojs/check` → ... → `ajv` | `npm update` |
| `brace-expansion` | 5.0.8 → 5.0.9 | `glob` → `minimatch` | `npm update` |
| `undici` | 7.28.0 (nested under `miniflare`) → 7.29.0 (deduped with the existing `jsdom` copy) | `wrangler` → `miniflare` | `wrangler` 4.114.0 → 4.120.0 exact-pin bump (same major version; `npm update` alone could not cross `miniflare`'s pin) |
| `nanoid` | 3.3.16 → 3.3.18 | `@astrojs/svelte` → `vite` → `postcss` | `npm update` |

A final live scan against the resulting lockfile
(`3be86d36c28f3071cdd9e11e7635c8dd58d365d61a50d03f89b9f19ce730c2b2`) found **0
applicable records** across `reviewed`, `unreviewed`, and `malware`. `npm run
build`, `npm run verify:dependency-tree`, `npm run verify:reportview-security`
(DOMPurify contract), and `npm run verify:advisory-scanner` (unaffected
mocked-fetch contract) all pass unchanged.

**Freshness-authority change:** `config/dependency-advisories.json` remains a
tracked point-in-time snapshot for human/audit reference, but it is no longer
the release's security authority. `npm run verify:live-advisories`
(`scripts/release/live-advisory-gate.mjs`) performs a fresh, exact-lockfile,
all-three-type live scan on every `verify:release-candidate` run and fails
closed — a network failure, rate limit, or any unresolved applicable advisory
fails the gate; it never falls back to the committed snapshot. This is
distinct from `verify:advisory-scanner` (`tests/github-advisory-scan.test.mjs`),
which remains a mocked-fetch contract test proving the scanner's
batching/pagination/fail-closed logic and performs no network access.

### Routine maintenance Safe Batch 1 (2026-08-13)

The routine maintenance operating lane's `npm run verify:advisory-register` gate deterministically
fails any PR that changes `package-lock.json` without a matching `config/dependency-advisories.json`
snapshot update — it is a byte-exact `lockfileSha256` consistency check, not a network call, so it
fails identically for every open Dependabot PR at the moment their lockfile diverges from the
committed snapshot. This is the gate working as designed, not a defect: the required maintenance step
is to regenerate the snapshot (`node scripts/release/live-advisory-gate.mjs` against the candidate
lockfile, then update `config/dependency-advisories.json`'s `lockfileSha256`/`observedDate`/
`freshnessBoundary` to match) as part of adopting the dependency change, which this batch did.
`terser` (5.46.1→5.49.2, devDependency-only, invoked via `astro.config.mjs`'s Vite `build.minify:
'terser'` option) and `@lucide/astro` (1.28.0→1.29.0, runtime icon imports across several pages and
`src/components/ui/Icon.astro`) were adopted after confirming no breaking upstream change and no
applicable GHSA record against the resulting lockfile. `astro`/`@astrojs/*`/`svelte` (Dependabot #57),
`katex`/`marked` (Dependabot #58), and `typescript` (Dependabot #59) remain open, un-adopted, and
tracked in the Dependabot backlog — `typescript` 7.0.2 additionally cannot install cleanly today
(`@astrojs/check@0.9.10` peer-depends on `typescript@^5.0.0 || ^6.0.0`, not 7.x).

### Security-sensitive maintenance Batch 2 (2026-08-14)

Dependabot's regrouped security-sensitive PR (#65, superseding the closed #58) proposed `katex`
0.16.47→0.18.4, `marked` 18.0.6→18.0.9, and `wrangler` 4.120.0→4.120.1 together. Evidence-based
triage split the group: `marked` and `wrangler` were adopted; `katex` was deferred. `marked`
18.0.7 contains real O(n²) regex/tokenizer backtracking hardening reachable from this project's
actual trust boundary (`src/lib/security/report-markdown.ts`, which renders AI-provider-generated
Founder Compass report text — untrusted per this project's AI-provider policy — through `marked`
before DOMPurify sanitization); no formal GHSA/CVE applies to 18.0.6, and the existing
`tests/report-markdown.test.mjs` sanitization-contract coverage (8/8) passed unchanged against
18.0.9, confirming no parsing-semantics regression. `wrangler` 4.120.1 is an upstream patch-only
release (dependency currency for `workerd`/`@cloudflare/workers-types`, an internal Miniflare
config-shape refactor upstream explicitly describes as producing no user-visible change);
devDependency-only, used solely for local `wrangler pages dev` simulation and local release
tooling, never deployed. `katex` was deferred for the version-coupling reason documented above in
"Vendored runtime assets — KaTeX": `rehype-katex@7.0.1` (latest) hard-pins `katex@^0.16.0`, so a
top-level bump to 0.18.4 cannot change actual math rendering and, left as-is, would ship a
CSS/HTML version mismatch. KaTeX 0.18.2's "prevent prototype pollution in settings" fix is a real
upstream hardening commit (guards `Settings`/`Namespace` lookups with `hasOwnProperty` against an
already-polluted `Object.prototype`) with no assigned CVE/GHSA; it is not reachable in this
project because `rehype-katex` is invoked in `astro.config.mjs` with a fixed, literal, build-time-only
options object (`trust: false` explicit) processing only repository-authored Markdown/MDX — no
runtime or attacker-controlled input ever reaches KaTeX's `Settings` construction.

### Routine maintenance framework-runtime Batch 3 (2026-08-14)

Dependabot's framework-runtime group (#57) proposed `astro` 7.1.6→7.2.0, `@astrojs/sitemap`
3.7.2→3.7.3, `svelte` 5.56.6→5.56.8, and `@astrojs/check` 0.9.9→0.9.10 together. All four were
adopted as a coherent group after evidence showed none individually required deferral. Astro
7.1.7–7.2.0 contains no breaking changes against the official `withastro/astro` release notes; its
new opt-in features (`experimental.incrementalBuild`, `astro preview --background`, `session:
false`, element-specific CSP directives) are all inactive on this project's unconfigured,
adapter-less, `output: 'static'` build, and `astro preview`/`npm run preview` is never invoked by
any script, test, or CI workflow in this repository (the release/Firefox/postdeploy harness spawns
`wrangler pages dev` directly, never `astro preview`), so the new automatic background-preview
detection has no effect here. `@astrojs/markdown-remark` stayed at 7.2.2 (unchanged), confirming
the pinned Unified Markdown processor invariant is untouched — verified empirically by the
unchanged 12/12 `tests/markdown-processor.test.mjs` result. `@astrojs/sitemap` 3.7.3's `<lastmod>`
accuracy fix is a no-op for this project: neither the integration's `serialize()` callback nor its
top-level options set any `lastmod` value, so `dist/sitemap-index.xml` and `dist/sitemap-0.xml`
were confirmed byte-identical before and after the bump. `svelte` 5.56.7/5.56.8 are patch-only; the
hydration-failed-error-boundary fix is directly relevant to `XRechnungApp.svelte`'s use of
`svelte:boundary`, and the select-spread-attribute fix does not apply (no `<select>` in this
repository uses spread attributes). `@astrojs/check` 0.9.10's only change is an internal `yargs`
17→18 bump (CLI argument parsing for `astro check`, dev-tooling only); its published peer range
remains `typescript@^5.0.0 || ^6.0.0`, reconfirmed unchanged — Dependabot #59 (TypeScript 7) stays
blocked for this reason, not resolved by this batch.

### Dependabot custom label removal (2026-08-14)

`.github/dependabot.yml`'s `npm` and `github-actions` `updates` entries each configured `labels:
[dependencies, security]`. The repository never created a `security` label (verified live via the
repository label API: only `bug`, `dependencies`, `documentation`, `duplicate`, `enhancement`,
`good first issue`, `help wanted`, `invalid`, `javascript`, `question`, `wontfix` exist), and
Dependabot posted a warning comment on every open PR (#59, #61, #67 observed) — "The following
labels could not be found: `security`." Per current official GitHub documentation, a configured
`labels` list **replaces** Dependabot's default labeling (a `dependencies` label plus an
ecosystem label) rather than adding to it, and any listed label absent from the repository is
silently dropped from the PR rather than being created. The prior configuration therefore achieved
nothing beyond the default `dependencies` label it was overriding, while additionally implying —
incorrectly — that every routine, non-security version-update PR was security-related. Both
`labels:` blocks were removed entirely, restoring Dependabot's own default labeling. This is a
repository-control-plane correction, not a security-posture change: actual security state remains
determined by Dependabot vulnerability alerts, CodeQL, and the exact-lockfile live advisory gate,
never by this label.

### Routine maintenance Batch 4 (2026-08-14)

Two independent routine candidates were evaluated: `@lucide/astro` 1.29.0→1.31.0 (Dependabot #71)
and `@types/node` 25.9.5→26.2.0 (Dependabot #70). Only `@lucide/astro` was adopted.

`@lucide/astro` 1.31.0: the only rename event in the 1.29.0–1.31.0 range is a 1.30.0 redesign of
the emoji-style icons (`laugh`, `annoyed`, `angry`, `smile`, `frown`, `smile-plus`, `meh` renamed
to `face-*` names) — none of this project's 62 imported icon names (51 bulk + 11 subpath) are
among them, verified exhaustively against the published 1.31.0 package's actual export map
(`src/icons/index.ts` and `src/aliases/aliases.ts`). A source-level diff of every icon file this
project imports (including the underlying files behind numeric-suffix aliases like `CheckCircle2`,
`Code2`, `BarChart3`, `LineChart`, `FileCode2`) found zero geometry changes between 1.29.0 and
1.31.0. `peerDependencies.astro` remains `^4 || ^5 || ^6 || ^7`, compatible with this project's
Astro 7.2.0. No install-time script exists in the published package.

`@types/node` 26.2.0 was deferred, not because a concrete incompatibility was found, but because
adopting it would widen an existing, undocumented policy gap. Every formal Node runtime pin in
this repository — `.node-version` (`22.22.3`), GitHub Actions (`node-version-file:
.node-version`), the reproducibility container (`release/Dockerfile.reproducibility`), and
Cloudflare Pages' own `NODE_VERSION` build variable (`wrangler.jsonc`, both `preview` and
`production`) — is pinned to Node 22.22.3, consistently and without exception. `@types/node` was
already at `^25.6.0` (three majors ahead of the pinned runtime) before this PR; adopting 26.2.0
would widen that to four majors ahead, with no recorded owner decision on whether this project
intentionally tracks "latest `@types/node` regardless of runtime major" or should keep
`@types/node` aligned to the actual Node 22 runtime line. A static audit of this project's Node
API usage (`fs`, `path`, `url`, `process`, `crypto`, `os`, `util`, `net`, `module`, `child_process`,
`stream`, `assert`, `test`) found nothing exotic enough to require Node 26-only typings, and
`@types/node@26.2.0`'s declared `typeScriptVersion` (`5.6`) is unchanged from `25.9.5` and remains
compatible with this project's TypeScript `^5.7.3` — so no compiler-version conflict blocks
adoption technically. The deferral is a policy question for an explicit owner decision, not a
proven defect; a passing `npm ci`/`astro check` was deliberately not treated as sufficient
justification on its own, since a devDependency's type declarations compiling successfully does
not prove the described APIs exist on the actual Node 22.22.3 runtime the code executes on.

### Node 24 LTS toolchain migration — Wave 1A (2026-08-14)

`.node-version` (`22.22.3` → `24.19.0`), `package.json`'s `packageManager` (`npm@11.16.0` →
`npm@11.17.0`, exact parity with npm 11.17.0 bundled by Node 24.19.0), `release/Dockerfile.
reproducibility`'s base image and digest, `config/dependency-tree-exceptions.json`'s `toolchain`
block, the three GitHub Actions workflows' `npm install --global npm@…` step, and the candidate
`wrangler.jsonc` `NODE_VERSION` value moved together as one coordinated pin change, per this
repository's own toolchain-drift invariant (`scripts/release/guards.mjs`'s `verifyToolchain`).
Node 22 (Jod) crossed from Active LTS into Maintenance LTS on 2025-10-21; Node 24 (Krypton) has
been Active LTS since 2025-10-28 (EOL 2028-04-30) and was independently reverified live against
`nodejs.org/dist/index.json` and `nvm ls-remote --lts` at execution time — 24.19.0 remains the
latest stable Node 24 patch, no newer patch shipped since. `package-lock.json` is **byte-identical**
before and after this wave (confirmed by SHA-256 comparison after `npm ci` under the new toolchain)
— no dependency graph, dependency version, or transitive resolution changed, so
`config/dependency-advisories.json` was **not** touched (no lockfile change to resync against, per
this file's own `verify:advisory-register` gate contract). `wrangler` stays at `4.120.1`
(unchanged — explicitly out of scope for this wave, unlike the bundled recommendation in the prior
modernization-readiness research). `@types/node` stays at `^25.6.0`/resolved `25.9.5` (unchanged —
explicit owner decision for this wave; see the Batch 4 entry above for the pre-existing policy gap
this does not resolve, now measured against Node 24 rather than Node 22 as the "how many majors
ahead" baseline). `engines.node` (`>=22.12.0`) is unchanged: it is the documented ordinary-development
floor, distinct from the exact formal-release pin `verifyToolchain` enforces, and nothing in this
repository's source requires a Node 24-only API, so narrowing it would drop legitimate Node
22.12–22.x contributor support without a technical justification. `typescript`, `astro`, `svelte`,
`tailwindcss`, `katex`, `jsdom`, `node-html-parser`, and `terser` were not touched.

## Historical baseline — Astro 6.4.8 (superseded)

The remainder of this section is preserved as a historical record of the Astro 6.4.8 graph reviewed
in Phase 2A. It no longer describes the canonical graph and is not reevaluated going forward except
where the migration register or decision document requires a historical comparison.

### Direct dependency disposition (Astro 6.4.8, historical)

| Package | Scope and source use | Disposition |
| --- | --- | --- |
| `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/svelte` | Build integrations in `astro.config.mjs` | Retain |
| `@astrojs/rss` | RSS route generation | Updated to 4.0.19, the compatible advisory fix |
| three `@fontsource-variable/*` packages | Imported by the global layout/styles | Retain |
| `@lucide/astro` | Astro icon imports | Updated to 1.26.0, the compatible advisory fix |
| `astro` | Static build/runtime framework | Retained at 6.4.8 at the time; migrated to 7.1.3 in Phase 2D-A |
| `chart.js` | Tool chart components | Retain |
| `dompurify`, `marked` | Report Markdown rendering and sanitization | Retain |
| `katex`, `rehype-katex`, `remark-math` | Math content processing | Retain |
| `pdfmake` | Browser PDF exports | Retain |
| `svelte` | Interactive islands | Retain |
| `@astrojs/check`, `typescript`, `@types/node` | Type and Astro checks | Retain |
| `@tailwindcss/typography`, `@tailwindcss/vite`, `tailwindcss` | Styles and build integration | Retain |
| `glob`, `gray-matter`, `node-html-parser` | Repository validation scripts | Retain |
| `jsdom` | DOM/security tests | Retain |
| `pagefind` | Post-build search index | Updated to 1.5.2 for its deterministic-index fix |
| `terser` | Source audit/minification script use | Retain |
| `wrangler` | Locked local Pages Functions runtime and bundler | Updated to 4.114.0 |
| `lodash` | No import, script, loader, or configuration use | Removed |
| `patch-package` | No postinstall, patches directory, or active patch | Removed |
| `baseline-browser-mapping` | No direct use; build tools own any transitive requirement | Removed |

### Historical advisory register (Astro 6.4.8, resolved for the current graph)

The bounded `npm audit --json` inventory on 2026-07-24 reported five package/path findings against
the Astro 6.4.8 graph: one low, two moderate, and two high. `config/dependency-advisories.json` is
the offline consistency authority for whichever graph is current; it cannot discover future
advisories, so Phase 3 still requires a fresh online review.

| Advisory | Title and severity | Package, installed path, affected and patched range | Historical disposition |
| --- | --- | --- | --- |
| [GHSA-4g3v-8h47-v7g6](https://github.com/advisories/GHSA-4g3v-8h47-v7g6); no CVE assigned | Reflected XSS through unescaped View Transition animation properties; moderate | `astro@6.4.8` direct, also affecting `@astrojs/mdx@5.0.3` and `@astrojs/svelte@8.0.4`; affected `>=2.9.0 <=7.0.9`; patched `>=7.1.0` | Resolved by the Astro 7.1.3 migration; no affected View Transition animation-property flow existed on the Astro 6 graph either. |
| [GHSA-f48w-9m4c-m7f5](https://github.com/advisories/GHSA-f48w-9m4c-m7f5), CVE-2026-59729 | Unescaped spread attribute names in `renderHTMLElement`; moderate | `astro@6.4.8` direct and the same integration paths; affected `<7.0.6`; patched `>=7.0.6` | Resolved by the Astro 7.1.3 migration; the repository never used the affected component/runtime pattern. |
| [GHSA-7pw4-f3q4-r2p2](https://github.com/advisories/GHSA-7pw4-f3q4-r2p2), CVE-2026-59727 | Unescaped `transition:*` values on hydrated islands; low | `astro@6.4.8` direct and the same integration paths; affected `>=3.10.0 <7.0.4`; patched `>=7.0.4` | Resolved by the Astro 7.1.3 migration; no production source used the affected transition directives. |
| [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr); no CVE assigned | Windows development-server arbitrary file read; low | `esbuild@0.27.7` through `astro@6.4.8` and `vite@7.3.6`; affected `>=0.27.3 <0.28.1`; patched `>=0.28.1` | Resolved by the Astro 7.1.3 migration, which dedupes `esbuild` to the patched `0.28.1`; was already `NOT_APPLICABLE` on the Astro 6 graph (Linux-only supported build/runtime). |
| [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), covering CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, and CVE-2026-35591 | Inherited libvips vulnerabilities; high | optional `sharp@0.34.5` through `astro@6.4.8`; affected `<0.35.0`; patched `>=0.35.0` | Resolved by the Astro 7.1.3 migration, which resolves both `sharp` paths to patched `0.35.x`; was `TRANSITIVE_BLOCKED` pending that migration. |

All Astro-path findings were build/framework dependencies, not deployed npm package installations;
their generated site output was only potentially affected when repository source used the cited
rendering pattern, which it did not.

### Historical dependency-tree diagnostic contract (Astro 6.4.8)

On the Astro 6.4.8 graph, `npm run verify:dependency-tree` reported exactly two optional host
selection diagnostics under `wrangler@4.114.0 > miniflare@4.20260722.0 > sharp@0.35.2`:
`@img/sharp-libvips-linuxmusl-x64@1.2.4` invalid against optional `1.3.1`, and
`@img/sharp-linuxmusl-x64@0.34.5` invalid against optional `0.35.2`. Both diagnostics no longer
occur on the current Astro 7.2.0 graph; `config/dependency-tree-exceptions.json` is empty.

## npm-script disposition

All package scripts resolve to installed binaries, repository files, or npm-composed scripts.
`gen:pap` uses Node 22's native TypeScript execution instead of the absent `tsx` package and no
longer suggests `npx` installation. Its generated engine matched the committed engine in four
reference cases. Standalone maintenance scripts not exposed through npm remain source-owned tools;
absence from `package.json` alone is not evidence that they are obsolete.

## Dependency-tree diagnostic contract (current)

`npm run verify:dependency-tree` parses `npm ls --all --json`; a non-zero npm exit is never accepted
by itself. On Node 22.22.3, npm 11.16.0, Linux x64 glibc, npm reports zero optional, peer, or
non-optional diagnostics for the current Astro 7.2.0 graph. The exact machine-readable contract is
`config/dependency-tree-exceptions.json`, currently empty. The verifier normalizes paths and
ordering, accepts only pre-approved exceptions, and fails for a new, changed, missing, peer, or
non-optional problem, and for a stale exception. Reevaluate for an npm major/minor change, a
Sharp/optional-package or lockfile change, or a CI platform change.

## Changes and verification

Phase 2D-A changes were limited to the Astro 7.1.3 toolchain migration (`astro`, `@astrojs/mdx`,
`@astrojs/svelte`, `@astrojs/markdown-remark`, `vite`, `pagefind`, transitive `sharp`/`esbuild`), the
Astro 7 compiler-compatibility source fix, and the added structural test coverage for the pinned
Unified Markdown processor and the three PDF export paths. On the supported glibc Linux host, the
locked graph, application build, and Sharp image build remain valid. No exact diagnostic exception
remains needed; the empty exceptions file is machine checked rather than hidden.

Verification commands:

```bash
npm ci
npm ls --all
npm audit --json
npm outdated --json
npm run verify:dependency-tree
npm run verify:finance
npm run check
npm run build
```

Future review triggers are a lockfile change, new direct import, npm-script change, new advisory,
supported-runtime change, or activation of an inactive feature.

## Vendored runtime assets — KaTeX (Phase 3-B3)

`public/katex/` is **not** hand-vendored and is not committed. `scripts/sync-katex-assets.mjs`
copies exactly `katex.min.css` and `fonts/` from the installed `katex` package (`node_modules/katex/dist`)
into `public/katex/`, so the served assets always match the locked `katex` version with no manual
copy-paste drift. `npm run dev` and `npm run build` both invoke this script **explicitly, as their
own first step** — not through the implicit `predev`/`prebuild` npm lifecycle hooks. This is a
deliberate release-critical decision: those hooks silently do not run when the operator's npm
configuration sets `ignore-scripts=true` (a common personal/team npm hardening default, unrelated to
this project), which previously made a plain `npm run build` produce a build silently missing the
KaTeX assets on any such host while an isolated container build (which never inherits a host user's
`~/.npmrc`) built correctly — see Phase 3-C Step 2B-1RR2/RR3. Explicit invocation makes the build
correct regardless of the operator's npm lifecycle-script configuration. Math rendering itself happens at build time through
`rehype-katex` (see `astro.config.mjs`); the site never loads KaTeX's client-side JavaScript bundle
(`katex.js`/`katex.mjs`), so those files — and the unused `contrib/` auto-render helpers — are not
generated at all. This removed six CodeQL `js/incomplete-sanitization` findings that were only
reachable through the previously committed, unused, and version-drifted `katex.js`/`katex.mjs` copies
(the same non-global `.replace()` calls exist in the upstream `katex@0.16.47` source itself and are
not reachable from any code path this project executes).

**Version-coupling constraint with `rehype-katex` (found 2026-08-14, Batch 2 research):** the
top-level `katex` package and `sync-katex-assets.mjs`'s copied CSS/fonts only matter if they match
what `rehype-katex` actually renders with — and `rehype-katex@7.0.1` (the latest published version)
hard-pins `"katex": "^0.16.0"` as a regular `dependencies` entry, not a peer dependency. Because
`remark-math`'s `micromark-extension-math@3.1.0` pins the same `^0.16.0` range, `npm install` nests
**separate** `katex@0.16.47` copies under both packages whenever the top-level `katex` is bumped
past `0.16.x` — confirmed empirically by bumping the top-level pin to `0.18.4` and observing `npm ls
katex` report three simultaneous installed copies. The actually-rendered math HTML is produced by
`rehype-katex`'s nested 0.16.47 copy regardless of the top-level version, so bumping only the
top-level `katex` pin has no effect on rendering while silently shipping a *different* version's
`katex.min.css` (via `sync-katex-assets.mjs`, which reads `node_modules/katex/dist` — the top-level
copy) than the version that generated the HTML markup the CSS is meant to style. KaTeX 0.18.0's
class-prefix rename (`base`, `strut`, `vbox`, and 16 other internal classes renamed to their
`katex-`-prefixed form) makes this concrete: a build with `katex@0.18.4` at the top level ships a
stylesheet with only `.katex-strut`/`.katex-base` rules while `rehype-katex`'s nested 0.16.47 still
emits `class="strut"`/`class="base"` markup — those rules no longer match. Do not adopt a top-level
`katex` bump past `0.16.x` until `rehype-katex` itself depends on a compatible newer `katex` range;
until then such a bump is inert at best (no rendering change) and asset-mismatched at worst.

## Dependabot release freeze (Phase 3-C / Phase 4, lifted Phase 5-D2-B)

Phase 3-C through Phase 4 set `open-pull-requests-limit: 0` on both the `npm` and `github-actions`
`updates` entries in `.github/dependabot.yml`, pausing **routine version-update pull requests** for
the duration of those phases. This never touched Dependabot vulnerability alerts, automated security
fixes, or security-update pull requests — those are governed independently of
`open-pull-requests-limit` (confirmed against official GitHub Dependabot documentation: the limit
"manages how many version update pull requests Dependabot can have open simultaneously" and
security-update PRs are not counted against it). This repository does not claim security-update PRs
are *unlimited* in an absolute sense — GitHub.com may apply its own separate internal ceiling to
security-update PRs that this configuration does not control and this document does not attempt to
characterize.

Phase 4's controlled production release is now complete (verified in the Phase 5-D2A evidence
baseline: live Cloudflare production deployment and `/api/health` both independently confirmed
serving the canonical release). Phase 5-D2-B restored `open-pull-requests-limit: 8` (npm) and `5`
(github-actions) — the pre-freeze values — in the repository-canonical `.github/dependabot.yml`.
**This is a repository-canonical config change, not yet a remote effect:** Dependabot only reads the
version of `dependabot.yml` present on the repository's actual default branch. Routine version-update
pull requests will not resume on GitHub until this change is authorized onto that default branch;
until then, GitHub continues operating under the `0`-limit configuration it can currently see.

Both `updates` entries also dropped the redundant `target-branch: master` key: the repository's
actual GitHub default branch is already `master` (confirmed live via the repository API), so the key
added no information. Per official GitHub documentation, `target-branch` is a version-updates-only
option, and specifying it to point at a **non-default** branch is documented to cause certain
per-entry customizations (assignees, commit-message, labels) to no longer apply to that ecosystem's
security-update PRs, falling back to Dependabot's default behavior instead. Since `master` is this
repository's actual default branch, that specific bypass condition likely did not apply before this
change either; the key was removed as a redundant simplification, not because it was observed to be
actively suppressing security-update customization.

The freeze does not change any advisory threshold, does not add an `ignore` rule, and does not enable
auto-merge (no such mechanism exists in this repository). The `npm` and `github-actions` ecosystem
blocks, their weekly schedules, their `labels`, and the `npm` block's `framework-runtime` /
`security-sensitive` groups are all otherwise unchanged.

**Unfreeze trigger (met):** the freeze was explicitly scoped to Phase 3-C and Phase 4
(`docs/ROADMAP.md`). Its trigger — Phase 4's controlled production release being complete — is now
met, and the pre-freeze limits (`8` npm, `5` github-actions) were restored in the repository-canonical
config above. Do not restore `target-branch: master`; it remains redundant regardless of freeze state
as long as `master` stays the actual default branch.
