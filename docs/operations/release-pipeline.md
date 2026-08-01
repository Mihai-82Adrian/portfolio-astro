# Release pipeline

## Intended state

Phase 2C defines local release policy and future workflow topology. It does not prove or change
GitHub or Cloudflare remote state and does not deploy.

The exact formal release toolchain is Node `22.22.3`, npm `11.16.0`, Linux x64, and glibc.
`.node-version` is the Node source of truth; `packageManager`, Wrangler configuration, workflow
setup, the dependency-tree contract, the reproducibility image, and the release manifest must
agree. Local development may use the documented broader Node 22 engine range, but formal evidence
does not.

## Workflow inventory

| Workflow | Trigger | Purpose | Secrets | Deploys | Disposition |
| --- | --- | --- | --- | ---: | --- |
| `quality-gates.yml` | pull request, selected safe pushes, manual | read-only complete local candidate gate | none | no | sole quality workflow |
| `release.yml` | manual `workflow_dispatch` only | future build-once preview/production release | deploy job only | future | sole tracked deployment owner |

Both workflows default to `contents: read`; there is no `pull_request_target` or write permission.
Quality concurrency is normalized per ref and stale quality work may cancel. Release concurrency is
per `preview` or `production`: preview may cancel, production does not, and only one production run
can proceed.

`quality-gates.yml`'s blocking job explicitly sets `name: Quality Checks`, matching the GitHub
branch-protection required status-check context. Phase 3-B1 confirmed this empirically: two real
GitHub Actions runs (push and pull-request triggers) against a public-safe preview commit both
produced a `Quality Checks` check-run from this workflow, and the required check passed with no
branch-protection mutation.

Every external Action is pinned to an official immutable commit:

| Action | Version | Commit |
| --- | --- | --- |
| `actions/checkout` | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | v7.0.0 | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/upload-artifact` | v7.0.1 | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/download-artifact` | v8.0.1 | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` |
| `cloudflare/wrangler-action` | v4.0.0 | `ebbaa1584979971c8614a24965b4405ff95890e0` |

`npm run verify:workflows` rejects mutable/short Action references, missing version comments,
unapproved owners, mutable containers, toolchain drift, unsafe permissions or triggers, secrets in
quality, multiple deploy owners, missing quality dependency, rebuilds in deploy, branch/lineage
confusion, missing ownership gates, and artifact substitution.

## One deployment owner and fail-closed remote prerequisites

GitHub Actions is the intended future deployment owner. Tracked legacy and duplicate deploy
workflows are removed. Cloudflare automatic Git integration cannot be inspected or disabled by
repository code, so deployment refuses to proceed unless future environment variables confirm:

```text
DEPLOYMENT_OWNER=github-actions
CLOUDFLARE_GIT_INTEGRATION_DISABLED=true
```

Absent or invalid values block deploy but are not needed by quality. `/api/health` does not expose
them. Phase 3 must verify dashboard parity and disable automatic Git integration with explicit
authorization; Phase 2C does neither.

Production requires `master`. Preview rejects the internal integration branch and requires a
public-history-safe reviewed release commit. Preview and production select separate protected
GitHub environments when those environments are later authorized and configured. The workflow
remains manual before Phase 3.

## Build once and artifact reuse

The future pipeline checks out an approved public-lineage commit, verifies the exact toolchain, runs
`npm ci` and `verify:release-candidate`, and creates one deploy tree, manifest, checksum, and build
dependency SBOM. The SHA-pinned upload/download Actions transfer that exact evidence. The deploy job
checks out the recorded revision, validates release ID, source revision, manifest digest, artifact
digest, release policy, exact file set, required secret presence, and remote ownership prerequisites.
It does not reinstall dependencies, run a build script, or reconstruct the artifact.

Deployment fails closed on a failed quality gate, non-public lineage, wrong branch, unconfirmed
ownership, wrong release identity, manifest/digest drift, Sample Review enabled, CSP outside
Report-Only, missing required secret names, unexpected generated files, toolchain drift, invalid
Action pins, or any post-verification rebuild.

## Machine release policy and public lineage

`config/release-policy.json` requires `master`, GitHub Actions ownership, CSP Report-Only, Sample
Review disabled, exact toolchain, artifact reuse, and public release lineage. It is intended
configuration, not remote parity evidence.

`npm run verify:public-release-lineage` checks tracked-tree exclusions.
`npm run prepare:public-release -- --dry-run` is dry-run only: in a disposable local clone it creates
an unreferenced synthetic commit whose parent is current local `master` and whose tree equals the
approved canonical tree. Stable trailers record:

```text
Canonical-Source: <full-sha>
Canonical-Tree: <full-tree-id>
Canonical-Artifact: <artifact-digest>
Release-Manifest: <manifest-digest>
```

No real `master`, branch, public history, remote, or worktree is mutated.

## Reproducibility and unified gate

The isolated environment is the official Node `22.22.3-bookworm-slim` Linux amd64 image pinned to
`sha256:16d364eebf6b62da439dc993d9b80940c78b0ca38438452f011ab9a25c752644`, npm `11.16.0`,
Debian 12, glibc, UTC, and `C.UTF-8`. Dependency installation may use npm; actual container builds
run with no network, no secrets, no host-mounted `node_modules`, and fixed `SOURCE_DATE_EPOCH`.
Containers use the invoking Linux UID/GID for generated evidence, a read-only root filesystem, and
bounded temporary filesystems for the copied repository, Wrangler XDG state, and Wrangler logs.

`npm run verify:reproducibility` compares one clean host-class build and two isolated builds:
identity, tracked-source/package/lock/config checksums, artifact digest and file list, normalized
manifest, and build dependency SBOM bytes/digest. Differences fail rather than being excluded.
Pagefind indexes lexically sorted HTML sequentially through its installed service API; its deployable
search output remains inside the artifact digest.

`npm run verify:release-candidate` is the authoritative complete local gate. It covers governance,
repository truth, toolchain/dependencies/advisories, provenance/policy/lineage, operations, CSP,
privacy, Function/provider/security, finance/PAP/XML, strict product quality, full KoSIT, isolated
reproducibility, local Wrangler/postdeploy, and the checksum-pinned Firefox matrix. It writes ignored
JSON and Markdown summaries under `.artifacts/release-candidate/`, never deploys, and makes no
provider request.

The committed advisory register check is offline and cannot discover future advisories. Phase 3
requires a fresh online `npm audit` review.

## Runtime-log handoff

Repository code emits minimized console events and intentionally configures no external logging
service. This does not prove remote logs are absent. Phase 3 must inspect Cloudflare capture,
default retention, sampling, access, exports, Logpush, dashboard visibility, and relevant data-region
behavior before deployment.
