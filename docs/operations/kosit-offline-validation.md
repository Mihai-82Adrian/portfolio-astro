# KoSIT Offline Validation

## Purpose and failure model

XRechnung conformance is validated against the official KoSIT validator engine and
XRechnung configuration. Both are large, versioned third-party archives that are never
committed to this repository. Historically they were cached inside each Git
worktree's ignored `tools/kosit/_cache/` and `tools/kosit/runtime/` directories, and
`npm run verify:xrechnung:kosit` invoked a setup step that downloaded them from GitHub
Releases on a cache miss.

This produced a real incident: a new worktree has no local cache, so the first
validation run silently starts downloading multi-megabyte archives from GitHub. If
stdout/stderr is redirected, the cache-miss warning is hidden until after the download
has already started.

The fix in this document removes network access from the standard validation path
entirely. Verification now trusts only a SHA-256-locked, repository-tracked manifest
and a single shared, worktree-independent cache. If the cache is missing or doesn't
match the pinned hashes, verification fails immediately — it never falls back to a
download.

## Shared cache

Default path:

```
${XDG_CACHE_HOME:-$HOME/.cache}/portfolio-astro-validation/kosit
```

Override with:

```
KOSIT_CACHE_DIR=/absolute/path
```

The resolved root is rejected if it resolves (after following symlinks) inside the
repository worktree. This is one cache shared by every worktree on the machine, so a
freshly created worktree does not need any manual artifact copy.

Layout:

```
<cache-root>/
  archives/
    validator/<version>/<archive-filename>
    configuration/<version>/<archive-filename>
  runtime/
    validator/<version>/…        (extracted validator + libs/)
    configuration/<version>/…    (extracted scenarios.xml + resources/)
  state/                          (lock files, ephemeral)
  provenance/                     (local migration/install records, not committed)
```

Archives and runtime are treated as read-only during validation. Nothing under
`<cache-root>` is ever committed to the repository.

## Locked versions and hashes

- KoSIT validator: `1.6.2`
- XRechnung configuration: `2026-01-31`

The trust anchor is `tools/kosit/kosit-artifacts.json` (repository-tracked): exact
archive filenames and SHA-256 hashes for both artifacts, plus the minimum Java major
version the validator requires (11 — the JAR runs fine on newer JDKs; this
environment uses OpenJDK 21). Filenames alone are never trusted — every archive is
hashed before use.

`tools/kosit/versions.json` still holds the official upstream download URLs, but only
the separate download bootstrap (below) reads it. The offline verification path never
opens that file.

## Standard verification command

```
npm run verify:xrechnung:kosit
```

and the explicit alias:

```
npm run verify:xrechnung:kosit:offline
```

are the same command and are both fully offline: no code reachable from either script
ever calls `curl`, `wget`, `fetch`, or a GitHub API. Both print, before any fixture is
generated:

```
KOSIT PREFLIGHT: PASS
KOSIT MODE: OFFLINE
KOSIT CACHE: <resolved cache root>
KOSIT VALIDATOR: 1.6.2
KOSIT CONFIGURATION: 2026-01-31
```

`PASS` means: the manifest parsed, the cache root is outside the repo, both archives
exist and match their pinned SHA-256, Java meets the minimum version, and the
validator/configuration runtime is ready (extracted on first use, reused afterwards).
Preflight can also be run standalone: `npm run kosit:preflight`.

## Fail-closed behavior

Any problem — missing manifest, cache root inside the repo, missing archive, checksum
mismatch, version mismatch, unsupported Java, invalid/missing runtime marker — prints:

```
KOSIT PREFLIGHT: FAIL
KOSIT MODE: OFFLINE
KOSIT NETWORK DOWNLOAD: DISABLED
KOSIT ERROR: <specific code>: <message>
```

and exits non-zero immediately. No failure path calls the download bootstrap.

## Fresh-worktree behavior

Because the cache lives outside every worktree, a brand-new `git worktree add` needs
no manual KoSIT copy: `npm ci` followed directly by `npm run verify:xrechnung:kosit`
resolves the same shared cache and passes, as long as the cache was populated once on
that machine (by migration or by the download bootstrap).

## Offline extraction

When the archives are present but not yet extracted, `ensureRuntime()`
(`scripts/kosit-cache.mjs`) extracts to a temp staging directory under
`<cache-root>/runtime/<kind>/`, verifies the expected entrypoint marker
(`validator-1.6.2.jar` / `scenarios.xml`), and atomically renames the staging
directory into place. A simple PID-checked lock file under `<cache-root>/state/`
serializes concurrent preparation for the same artifact version; a lock whose owning
PID is no longer alive (or older than 5 minutes) is treated as stale and reclaimed.
Interrupted staging directories from a previous crash are swept before a fresh
extraction begins and never become the active runtime. A valid existing runtime is
reused without re-extraction and without ever being torn down first.

## Explicit download bootstrap

```
npm run setup:xrechnung:kosit:download
```

is never called by any verification command. It requires **both**:

1. `KOSIT_ALLOW_DOWNLOAD=1`
2. the `--confirm-download` CLI flag

Without both, it refuses before resolving the manifest, the cache root, or any
network host:

```
KOSIT DOWNLOAD: REFUSED
Set KOSIT_ALLOW_DOWNLOAD=1 and pass --confirm-download explicitly.
```

With both gates it downloads from the URLs in `tools/kosit/versions.json`, verifies
SHA-256 against `tools/kosit/kosit-artifacts.json` before installing, and atomically
installs into the shared cache. It never overwrites an archive that already matches
the pinned hash.

## Cache rotation / recovery from a corrupt runtime

- Corrupt or mismatched archive: delete the offending file under
  `<cache-root>/archives/...` and re-run the download bootstrap (both gates), or
  re-migrate a trusted local copy by hand — verification refuses to use it either way
  until the hash matches.
- Corrupt extracted runtime: delete the affected `<cache-root>/runtime/<kind>/<version>/`
  directory; the next verification run re-extracts it from the (checksum-verified)
  archive.
- New pinned version: update `tools/kosit/kosit-artifacts.json` (and
  `tools/kosit/versions.json` if the source URL changed), then run the download
  bootstrap or migrate the new archive manually.

## Concurrency

Two worktrees (or two CI jobs on the same machine) can start preparation at the same
time; the lock file serializes extraction per artifact version, and a process that
loses the race simply reuses the runtime the winner produced.

## Logging

When preserving verification output, always keep stderr visible:

```
npm run verify:xrechnung:kosit 2>&1 | tee kosit-run.log
```

Never redirect stderr invisibly (e.g. `> log 2>/dev/null`) — a preflight `FAIL` must
stay visible, not be swallowed.

## CI provisioning (future)

CI runners are ephemeral, so a future CI job must populate `KOSIT_CACHE_DIR` before
running verification — either by restoring a persisted cache directory keyed on the
manifest's SHA-256 values, or by running the explicit download bootstrap with both
gates set as a dedicated, audited CI step (never as part of the test job itself).

## No committed binaries

No validator JAR, configuration ZIP, or extracted runtime file is committed to this
repository. Only the manifest (`tools/kosit/kosit-artifacts.json`), the URL registry
(`tools/kosit/versions.json`), and this document are tracked.
