# Public release lineage strategy

## Lineage model

- **Internal integration lineage:** the locally reviewed hardening history and approved tracked tree;
  it contains granular audit-era commits that are not intended as public release history.
- **Current public `master`:** the existing public-history anchor and production source until a
  separately authorized release changes it.
- **Deployable source tree:** the exact approved tracked tree used to build local release evidence.
- **Release commit:** a new reviewed commit whose parent is current public `master` and whose tracked
  tree equals the approved source tree.
- **Deployed artifact:** a manifest-identified static/Functions tree produced from an authorized
  release source; local generation does not make it deployed.
- **Rollback commit/artifact:** a revert or follow-up commit in public history and/or a previously
  retained, identified artifact selected through an authorized rollback decision.

The inspected local graph is divergent: public `master` has a public-only commit after the common
ancestor, while the integration lineage has many internal commits. Raw audits are absent from the
current tracked tree but remain reachable through the internal lineage.

## Options evaluated

| Method | Result |
| --- | --- |
| Blind fast-forward | Impossible on the divergent graph and would expose the internal lineage if topology later permitted it |
| Ordinary merge | Preserves both histories and therefore publishes the internal audit-era commits |
| Reviewed squash/release commit | Preserves current public history, adds one reviewable parent-child release change, and can match the approved tracked tree exactly |
| History rewrite/filtering | Unnecessary, disruptive, and prohibited for ordinary release preparation |

## Recommended future method

Create one reviewed release commit on a temporary local branch rooted at the then-current public
`master`. Replace its index and worktree with the approved integration commit's tracked tree, review
the complete staged public diff, and commit once. Do not merge the integration branch. This preserves
public history, avoids publishing raw internal commits, and requires no rewrite.

The following is a template, not authorization to run it:

```bash
git status --short
git rev-parse master
git rev-parse integration/portfolio-hardening-2026-07
git merge-base master integration/portfolio-hardening-2026-07

git worktree add -b release/reviewed-candidate ../portfolio-release-review master
git -C ../portfolio-release-review read-tree --reset -u \
  integration/portfolio-hardening-2026-07^{tree}
git -C ../portfolio-release-review status --short
git -C ../portfolio-release-review diff --cached --check
git -C ../portfolio-release-review diff --cached --stat
git -C ../portfolio-release-review commit -m "release: publish reviewed portfolio candidate"

test "$(git -C ../portfolio-release-review rev-parse HEAD^{tree})" = \
  "$(git rev-parse integration/portfolio-hardening-2026-07^{tree})"
test "$(git -C ../portfolio-release-review rev-parse HEAD^)" = \
  "$(git rev-parse master)"
```

Before any public mutation, independently inspect the staged file list, security/privacy claims,
dependency evidence, generated-file exclusions, and the resulting commit. Require explicit owner
authorization for public lineage and deployment as separate decisions.

Abort if either source tree is dirty, `master` moved after review began, the approved revision is
ambiguous, tree IDs differ, raw audit files reappear, ignored/generated evidence is staged, required
validation is stale, or rollback evidence is unavailable. Removing an aborted temporary branch and
worktree must follow the normal clean-worktree checks; never force-delete uncertain work.

## Verification and rollback

The release commit's tracked tree ID must equal the approved integration tree ID; its sole parent
must equal the reviewed public `master` head. Rebuild provenance from the release commit and retain
both the source-to-release mapping and artifact digest. Confirm that no `.artifacts/`, `dist/`,
generated identity module, full SBOM, release manifest, or raw audit file is tracked.

Rollback preserves history: either redeploy a retained prior identified artifact or create a normal
revert/follow-up commit after impact review. Never reset or rewrite public `master`.

## Local proof

Phase 2A reproduced this method in an isolated temporary local repository. It created a synthetic
baseline from the current local `master`, applied only the proposed final tracked tree, and created
one child release commit. The resulting tree ID matched the proposed canonical tree exactly; the
release parent stayed at the synthetic public baseline; raw audit files, ignored release evidence,
build output, and generated identity files were absent. The temporary repository was then removed.
No branch, commit, or worktree under public `master` was changed.

Phase 2C converts the strategy to permanent commands:

```bash
npm run verify:public-release-lineage
npm run prepare:public-release -- --dry-run
```

Preparation is dry-run only. It uses a disposable local clone, current local `master` as the
synthetic sole parent, the approved canonical tree, and canonical source/tree/artifact/manifest
trailers. It validates tracked-file exclusions and removes the disposable clone. The future release
workflow requires this lineage, but no real public release commit or `master` mutation is performed
by Phase 2C.

Phase 3-B1 exercised this exact mechanism for real: the same trailer format and commit-construction
recipe `prepare:public-release`'s dry run proves was used to build one persistent (not disposable)
release commit, parented on the then-current real remote public `master`, pushed to a non-production
branch (`release/phase-3b-cutover`), and opened as preview-only evidence. `npm run
verify:public-release-lineage -- --require-release-commit` confirmed the trailers, tree identity, and
single-parent-equals-public-master contract against that real commit. Public `master` itself was
never pushed to or mutated; the preview branch and its Draft PR are additive, reviewable evidence,
not a merge.
