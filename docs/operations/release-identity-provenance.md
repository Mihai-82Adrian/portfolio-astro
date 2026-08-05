# Release identity and provenance

## Boundary

Phase 2A creates local release evidence. It does not deploy, publish the evidence, identify current
production, or create a public release commit. Generated files stay under the ignored
`.artifacts/release/` directory and must not be copied into `public/`.

## Identity

The versioned source identity is:

```ts
type ReleaseIdentity = {
  schemaVersion: 1;
  releaseId: `git-${string}`;
  sourceRevision: string;
  sourceTreeClean: true;
  sourceCommitTime: string;
};
```

`releaseId` is `git-` plus the first 16 hexadecimal characters of SHA-256 over the schema version,
source revision, clean marker, and source commit timestamp with explicit separators. The timestamp
comes from Git, not the invocation clock. The same clean commit therefore yields the same identity.
A future reviewed public release commit may have a different revision while retaining provenance to
this approved source tree; neither value alone proves deployment.

The public `/api/health` response exposes only `schemaVersion`, `releaseId`, and `sourceRevision`
inside the existing success envelope. The build generates an ignored TypeScript constant used by the
Function bundle. Cloudflare documents a build-time commit variable, but Pages Functions runtime
values are explicit bindings; Phase 2A adds no binding. The route uses `Cache-Control: no-store`,
makes no external request, requires no provider configuration, and does not report dependency,
toolchain, secret, quota, or platform-account details.

## Deployable artifact and tree digest

`npm run build:release-artifacts` requires a clean tracked tree, runs the repository build, copies
`dist/`, and adds Wrangler's locally bundled Pages Functions worker and route manifest. That combined
`deploy/` tree is the deployable artifact.

The artifact-tree SHA-256 walks ordinary files in stable lexical relative-path order. Each entry
hashes an explicit record marker, UTF-8 relative-path length and bytes, file-byte length, and file
bytes. Absolute paths, mtimes, usernames, hostnames, and unused permission metadata are excluded.
Symlinks and special files fail closed. `release-manifest.json` and
`artifact-tree.sha256` are excluded from a root digest to avoid self-reference; neither is in the
deploy tree.

The tool streams file bytes and rejects unsafe output roots. Release evidence remains local, so the
tree digest—not a tar/gzip stream with ambient metadata—is the stable artifact identifier.

### Hidden-path transport and allowlist (Phase 4-R1)

A manual production release run (workflow run `31032716165`, deploy job `92399219141`) failed closed
on an artifact-tree checksum mismatch: `actions/upload-artifact` excludes hidden files by default,
and `release.yml` did not set `include-hidden-files: true`. The uploaded artifact silently dropped
`deploy/.htaccess` (source `public/.htaccess`), shrinking the verified 468-file deploy tree to 467
files. `workflow-artifact.mjs consume` correctly rejected the resulting checksum mismatch before the
deploy job's Cloudflare step ran, so production received zero mutation. `release.yml` now sets
`include-hidden-files: true` on that upload step so GitHub Actions must preserve every
checksum-participating path between the `quality` and `deploy` jobs.

Because hidden-file transport is now enabled, `collectFiles` (the single traversal both artifact
generation and `verifyReleaseArtifacts` use) enforces a fail-closed allowlist: any path whose
basename starts with `.` is rejected unless it is exactly `deploy/.htaccess` at the artifact root — a
nested `.htaccess`, `.env`/`.env.*`, `.git`, `.npmrc`, `.wrangler`, or any other hidden file or
directory throws before its bytes are hashed. This check runs during tree traversal itself, so an
already-written manifest whose checksums happen to match a tampered tree cannot bypass it — the
digest computation never reaches the comparison.
Release builds export the Git commit epoch as `SOURCE_DATE_EPOCH` and the public-safe build epoch,
derive RSS build dates from content, use deterministic server-rendered default IDs, and minify the
Wrangler bundle so invocation-specific temporary source comments cannot enter the artifact. Pagefind
receives HTML files in lexical order through its service API and writes normalized language metadata,
so parallel filesystem discovery cannot assign environment-dependent document numbers. Wrangler runs
from an isolated temporary directory with its XDG configuration and log path bounded there; the
directory is removed after each build.

## Manifest and build dependency SBOM

The version-1 manifest records the clean source revision and commit time, meaningful package name,
exact Node/npm/Linux x64/glibc release environment, build command, checksums for the tracked source,
`package.json`, `package-lock.json`, the `config/` tree, `wrangler.jsonc`, the deployable artifact
tree, and the explicitly scoped build dependency SBOM, plus release identity and tool schema
version. It omits invocation time, paths, Git remotes, environment values, host data, and provider
identifiers.

The build dependency SBOM is CycloneDX JSON specification 1.5 from npm's locked
`package-lock.json` graph, including production and development tooling. It is not a precise
deployed-runtime SBOM and must not be represented as one. Normalization removes the generated UUID
and invocation timestamp, replaces the worktree-derived root name with package metadata, and sorts
components and dependency edges. Structural validation and checksum linkage are mandatory. A
bundle-derived runtime SBOM remains a future refinement only if it can be generated without
speculative package mapping.

## Commands and failure behavior

```bash
npm run build:release-artifacts
npm run verify:release-provenance
npm run verify:reproducibility
```

Generation fails for tracked changes, unexpected untracked production input, a failed build or
Function bundle, inconsistent lockfile/SBOM, unsupported filesystem entries, invalid schemas, or
checksum drift. Permanent tests are offline and cover identity determinism, dirty-source rejection,
path ordering, mtime independence, self-reference, symlink rejection, SBOM normalization, manifest
validation, health linkage, prohibited public fields, Pagefind byte identity across opposite
input-creation orders, the `include-hidden-files: true` workflow contract, a faithful
prepare/transfer/consume round-trip that retains `.htaccess`, the exact hidden-file-omission
regression and its recovery, and hidden-path allowlist rejection that a self-consistent checksum
cannot bypass.

The full manifest and build dependency SBOM may reveal dependency versions and vulnerability
context. They are review evidence, not public runtime assets; publication requires a separate
disclosure decision.
