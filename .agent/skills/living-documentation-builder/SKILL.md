---
name: living-documentation-builder
description: Keeps project documentation accurate by scanning the repo, verifying source-of-truth, and updating key docs (README, Context, Specs) without hallucinating features. Supports Dry-Run mode.
short-description: Update and maintain living project documentation
category: Documentation
tags:
  - documentation
  - maintenance
  - markdown
  - source-of-truth
version: 1.1.0
author: Mihai Adrian
license: MIT
compatibility:
  - codex: "5.2+"
---

# Living Documentation Builder

## What This Skill Does
Maintains “living” documentation by syncing Markdown files with the codebase state. It performs a rigorous scan using `ripgrep` to confirm facts, checks internal links for validity, and updates docs. It enforces a strict "No Speculation" policy.

## When To Use
- After refactoring or architectural changes.
- Before onboarding new team members (to ensure `PROJECT_CONTEXT.md` is fresh).
- To audit documentation for broken links or outdated references.

## Inputs To Clarify (Ask If Missing)
- **Target Docs:** Which files to check (default: `PROJECT_CONTEXT.md`, `README_STARTUP.md`).
- **Mode:** `dry_run` (preview changes) OR `apply` (overwrite files). Default to `dry_run`.
- **Scope:** Backend, Frontend, or Infra changes.

## Tool Requirement (Mandatory)
- `file_system`: Read/Write access to `.md` files.
- `terminal.run`: Required for `rg` (ripgrep) and `git log` execution.

## Guardrails (Strict)
1. **Fact-Check First:** Never write a claim (e.g., "Postgres 16") unless verified via code/config (e.g., `grep "postgres:16" docker-compose.yml`).
2. **No Hallucinations:** Do not document "planned" features as existing.
3. **Preserve Formatting:** Do not reformat entire files; only update specific sections.
4. **Link Safety:** If a file path mentioned in docs does not exist on disk, flag it as BROKEN.

## Workflow

1) **Analyze & Scan**
   - Read the target Markdown files to understand current claims.
   - Run `git log -n 10 --oneline` to understand recent changes context.

2) **Fact Verification (The "Truth" Scan)**
   - Use `rg` to find definitions matching documentation claims.
   - Example: If Doc says "API runs on port 8080", run `rg "8080" cmd/server`.

3) **Link Validation**
   - Extract all `[Link](./path/to/file)` references.
   - Verify file existence. If missing, mark for correction.

4) **Drafting Updates**
   - Create precise diffs for outdated sections.
   - Update timestamps (e.g., `> Last verified: YYYY-MM-DD`).

5) **Execution (Dry-Run vs Apply)**
   - **IF `dry_run`:** Output a Markdown report listing:
     - "Facts Corrected"
     - "Broken Links Found"
     - "Proposed Content Diffs"
   - **IF `apply`:** Overwrite the target files and output a confirmation summary.

## Repo Sources of Truth
- `go.mod` / `build.gradle` (Dependencies & Versions)
- `internal/api/routes.go` (API Endpoints)
- `internal/db/migrations/` (Database Schema)
- `infrastructure/` (Deployment Architecture)

## Common Pitfalls
- Deleting manual architectural decisions/ADRs thinking they are "outdated code".
- Updating "Copyright" dates without content changes.
- Breaking Markdown tables by inserting too much text.
