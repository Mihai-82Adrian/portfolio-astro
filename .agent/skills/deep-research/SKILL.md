---
name: deep-research
description: Deep, source-verified research skill that uses web search/browse to gather only high-confidence facts from official and authoritative sources, and outputs a structured, detailed Markdown report (no summaries).
short-description: High-confidence research from official sources only
category: Information Gathering
tags:
  - research
  - verification
  - citations
  - official-sources
version: 1.0.0
author: Mihai Adrian
license: MIT
compatibility:
  - codex: "5.2+"
---

# DeepResearch Skill

## What This Skill Does

Produces a detailed Markdown research report based only on confirmed, high-confidence facts from official or authoritative sources. It always uses web search/browse tools and excludes summaries to avoid loss of context.

## When To Use

- The user asks for deep research or documentation on a topic.
- The user requires official/authoritative sources and strong verification.
- The result must be a full Markdown report (not a short summary).

## Inputs To Clarify (Ask If Missing)

- Topic and scope (what is in-scope vs out-of-scope)
- Timeframe (e.g., 2023-2026) and region/jurisdiction
- Depth expectations (number of sections, granularity)
- Output path and filename (if not provided, choose a default)

## Tool Requirement (Mandatory)

You MUST use the web search/browse tool (web.run) for this skill. Do not proceed without online verification.

## Source Policy (Strict)

Accept ONLY authoritative sources such as:
- Government or regulator sites (e.g., .gov, official EU sites)
- Standards bodies (ISO, IEEE, W3C, etc.)
- Peer-reviewed journals or reputable academic publishers
- Official vendor documentation or official announcements
- Audited datasets published by recognized institutions

Reject or treat as non-authoritative:
- Personal blogs, social media, forums, marketing-only pages
- Secondary summaries that lack primary citations
- Undated or anonymous sources

If primary sources are unavailable for a claim, do not include the claim.

## Confidence Model (Use This Exactly)

Define independent sources as separate organizations (not the same publisher syndicating content).

Confidence tiers:
- 100% (Confirmed-3+): 3+ independent authoritative sources OR 2 authoritative + 1 peer-reviewed/standard, all consistent
- 95% (Confirmed-2): 2 independent authoritative sources, consistent
- 90% (Confirmed-1+2): 1 authoritative source + 2 reputable secondary sources that cite primary data, consistent

Only include findings with confidence >= 90%. If a topic area lacks such evidence, list it as a Research Gap without stating unconfirmed claims.

## Research Workflow

1) Scope and Decompose
   - Break topic into 3-7 research areas.
   - For each area, list the exact questions to answer.

2) Source Discovery (via web.run)
   - Search for primary, official sources first.
   - Prefer original publications and authoritative domains.

3) Source Validation
   - Verify authoring org, publication date, and originality.
   - Confirm independence among sources.

4) Evidence Extraction
   - Extract facts, numbers, definitions, and formal statements.
   - Paraphrase and cite; do not rely on long quotes.

5) Corroboration and Scoring
   - Group equivalent claims across sources.
   - Assign confidence per the model above.
   - Exclude anything below 90%.

6) Report Generation
   - Write a structured Markdown report with full citations.
   - No summary section. Keep full context.

## Output Requirements (Markdown File Only)

- Always produce a Markdown file on disk.
- If the user did not specify a path, use:
  - `./docs/research/` if it exists, else
  - `./research/`, else
  - current working directory.
- Filename format: `DeepResearch_<topic_slug>_<YYYY-MM-DD>.md`

## Report Structure (Mandatory)

1) Title
2) Scope and Methodology
3) Source Criteria and Confidence Model
4) Detailed Findings (grouped by research area)
   - Each finding must include:
     - Statement
     - Evidence table (sources, dates, publisher)
     - Confidence tier and rationale
5) Data Tables / Figures (if applicable)
6) Research Gaps (no unconfirmed claims)
7) Full Source Register (complete citations)

## Example Invocation

User: "Run DeepResearch on EU AI Act enforcement timeline and obligations, 2024-2026, EU only."

Output: `./docs/research/DeepResearch_eu_ai_act_2026-01-13.md`

## Common Pitfalls

- Using secondary summaries without checking primary sources
- Including claims with only one non-authoritative source
- Writing an executive summary (not allowed)
- Mixing opinion with verified facts
