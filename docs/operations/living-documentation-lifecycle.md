# Living documentation lifecycle

This protocol keeps repository documentation aligned with current source without turning routine
reviews into editorial churn. Production source, configuration, and permanent tests remain the
behavioral truth; [AGENTS.md](../../AGENTS.md) remains the repository constitution.

## Ownership and update triggers

| Document | Update when |
| --- | --- |
| `AGENTS.md` | A stable repository-wide invariant, workflow, trust rule, or demonstrated repeated failure requires governance improvement |
| `CLAUDE.md` | Official Claude import compatibility changes; otherwise never |
| `README.md` | Public product, architecture, commands, release state, capability, or limitation changes |
| `docs/ARCHITECTURE.md` | Components, trust boundaries, data flow, topology, or architectural limitations change |
| `docs/ROADMAP.md` | Phase status, sequence, trigger, deliverable, dependency, or exit criterion changes |
| Focused operations document | Its narrow contract, behavior, evidence, or runbook changes |
| Historical audit | Never rewritten as current truth; superseded only by explicit living documentation |

An update requires evidence from the owning source: a final committed diff, production code,
configuration, permanent tests, or an authoritative focused record. Historical reports can explain
provenance but cannot establish current behavior.

## Non-update and anti-churn conditions

Review is not a reason to edit. Do not change a living document merely to:

- add a session date, timestamp, commit hash, temporary branch, or machine path;
- record that the document was reviewed;
- rewrite equivalent prose or impose a personal style;
- duplicate an implementation detail already owned by a focused operations document;
- manufacture a documentation commit for every session.

`Reviewed-no-change` is the correct disposition when the final source truth does not affect the
document.

## Mandatory session-close protocol

Every substantial contributor session must:

1. inspect the final committed source diff;
2. classify its documentation impact;
3. review `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and each
   affected focused document;
4. update only affected documents;
5. run governance and repository-truth guards;
6. commit required synchronization coherently;
7. report an explicit `updated` or `reviewed-no-change` decision, with evidence, for every principal
   living document and list the focused documents changed.

Documentation synchronization must be committed before Definition of Done. No uncommitted
after-the-fact correction counts as a completed session.

## Constitutional stability

Documentation evolution must not grant remote or production permissions, weaken instruction
precedence, reduce security/privacy/financial/validation rules, remove explicit authorization,
redefine local work as deployed, prefer an agent tool without project evidence, or turn
`CLAUDE.md` into a second constitution.

Explicit owner authorization is required to change instruction precedence; remote or production
mutation policy; Git-history or `master` protection; financial correctness; privacy and
sensitive-data prohibitions; provider-spend authorization; or Definition of Done minimums. A
demonstrated recurring failure may justify a safety-strengthening rule when its evidence is recorded
and redundant prose is avoided.

## Review expectations

The final reviewer checks claims against their owning source, verifies local links, confirms the
exact `CLAUDE.md` shim, and rejects volatile evidence in public documents. Changed and no-change
dispositions belong in the session report or review evidence, not as permanent review stamps in the
documents themselves.
