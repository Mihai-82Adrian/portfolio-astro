# Deployment — compatibility entry point

This file is a compatibility entry point only, kept for anyone who lands here from an old link or
search result. It is **not** a deployment manual. Authoritative deployment, configuration, and
rollback behavior lives in the documents below; if anything here ever conflicts with one of them,
that document wins.

## Authoritative documents

- [docs/operations/release-pipeline.md](../docs/operations/release-pipeline.md) — exact toolchain,
  the two tracked GitHub Actions workflows (`quality-gates.yml`, `release.yml`), Action pinning,
  artifact reuse, and deployment ownership.
- [docs/operations/cloudflare-pages-configuration.md](../docs/operations/cloudflare-pages-configuration.md) —
  the `portfolio-astro` Cloudflare Pages project, its Git integration, build settings, domains,
  bindings, and secret-name inventory (no values).
- [docs/operations/rollback-postdeploy.md](../docs/operations/rollback-postdeploy.md) — read-only
  post-deployment verification and the rollback planner.
- [docs/operations/public-release-lineage-strategy.md](../docs/operations/public-release-lineage-strategy.md) —
  how a reviewed public release commit is built and published without exposing internal history.

## Current stable invariants

- GitHub `master` and Cloudflare production are separate states. A commit reaching `master` does not
  by itself mean it is deployed.
- A push or merge to `master` does **not** deploy to production while Cloudflare's
  `production_deployments_enabled` remains `false` (see
  [cloudflare-pages-configuration.md §19a](../docs/operations/cloudflare-pages-configuration.md)).
- Production release happens only through an explicitly authorized `release.yml` `workflow_dispatch`
  (see [release-pipeline.md](../docs/operations/release-pipeline.md)) — never through a bare `git
  push`, and never through the GitHub web UI's merge button.
- Git rollback and production rollback are two separate operations:
  - **Git rollback** uses `git revert` on a reviewed branch/PR, through the normal branch-protected
    flow. It never uses `git reset --hard` or a force-push against `master`.
  - **Production rollback** uses Cloudflare's own deployment rollback to a last-known-good
    deployment (see [rollback-postdeploy.md](../docs/operations/rollback-postdeploy.md)), independent
    of any git operation.
- Secret values (API tokens, account identifiers, provider keys) are never documented, displayed, or
  committed anywhere in this repository — only secret *names* are recorded, and only where an
  authoritative document already tracks them.
