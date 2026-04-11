# Sitewide Localization Audit Implementation Plan

> **For Claude / Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
>
> This is an **editorial systems audit**, not a blind translation pass.
> The objective is to normalize language usage across the public site so each locale reads intentionally, professionally, and consistently, while preserving technical and market-standard English terms where they genuinely improve clarity.

## Goal

Audit and normalize language usage across the entire public site so each locale reads intentionally and professionally, while preserving technical and market-standard English terms where they genuinely add clarity.

## Architecture

This is an editorial systems refactor, not a blanket translation exercise.

The system must:

- classify mixed-language strings into `keep`, `localize`, or `case-by-case`
- prioritize **shared shell and shared components first**
- preserve valid technical terms where appropriate
- avoid rewriting authored content unless mixed-language framing creates a real professionalism or UX issue
- produce a documented editorial policy that can be reused later

## Tech Stack

- Astro 5
- Tailwind v4
- TypeScript content models
- localized routes under `src/pages`
- shared copy in `src/data`
- reusable UI in `src/components`

---

## Task 0: Create a baseline snapshot before changing anything

**Files:**

- Modify: `docs/plans/2026-04-11-sitewide-localization-audit.md`

### Step 1: Record the baseline review set

Add a list of critical pages to snapshot before modifications:

- homepage DE / EN / RO
- landing funnel DE / EN / RO
- about DE / EN / RO
- services DE / EN / RO
- experience DE / EN / RO
- now
- 1 blog list page
- 1 blog detail page
- 1 projects page
- 1 tool page
- legal pages if visible mixed copy exists

### Step 2: Capture baseline notes

For each review page, record:

- route
- visible mixed-language issue(s)
- severity (`P0`, `P1`, `P2`)
- whether issue is shell UI, component UI, page copy, metadata, tool UI, or transactional UI

### Step 3: Add baseline screenshots if available

If practical, attach screenshots or reference paths for before/after comparison.

### Step 4: Commit

```bash
git add docs/plans/2026-04-11-sitewide-localization-audit.md
git commit -m "docs: add localization audit baseline snapshot"
````

---

## Baseline Review Set

- `/`
- `/en/`
- `/ro/`
- `/datenaufbereitung-fuer-ki`
- `/en/ai-data-preparation`
- `/ro/pregatire-date-ai`
- `/discovery-call`
- `/en/discovery-call`
- `/ro/discovery-call`
- `/sample-struktur-pruefen`
- `/en/sample-structure-review`
- `/ro/revizuire-structura-esantion`
- `/about`
- `/en/about`
- `/ro/about`
- `/services`
- `/en/services`
- `/ro/services`
- `/experience`
- `/en/experience`
- `/ro/experience`
- `/now`
- `/blog`
- `/blog/bridging-finance-ai`
- `/projects`
- `/tools`
- `/impressum`
- `/en/datenschutz`
- `/ro/datenschutz`

## Baseline Notes

| Route / Surface | Issue | Severity | Surface Type |
| --- | --- | --- | --- |
| `/en/ai-data-preparation` | German card labels in reusable landing components | `P0` | shared component copy |
| `/ro/pregatire-date-ai` | German card labels in reusable landing components | `P0` | shared component copy |
| `/datenaufbereitung-fuer-ki` | Decorative English badge copy like `Finance-first Data Prep` weakens DE professionalism | `P0` | shared component copy |
| landing funnel DE / EN / RO | Mixed CTA and helper framing around `Discovery Call`, `Sample Review`, `Output` not yet normalized by glossary | `P0` | shared component copy |
| homepage DE / EN / RO | New teaser uses partially mixed commercial phrasing; needs glossary-based decision | `P1` | locale page copy |
| `about`, `en/about`, `ro/about` | `Now` feature introduced recently and likely contains mixed-language framing; needs editorial review | `P1` | locale page copy |
| `/now` | New module entry uses English-first product phrasing that may be acceptable or may need selective adaptation; requires case-by-case decision | `P1` | locale page copy |
| shared navigation / footer | Landing offer labels are localized, but overall shell still needs full audit for mixed-language consistency | `P1` | shared shell |
| transactional pages (`/sample-struktur-pruefen/danke`, EN/RO equivalents) | Thank-you and follow-up framing may still mix commercial English with localized body copy | `P1` | transactional UI |
| blog / projects / tools shells | Unknown spread of mixed UI labels outside authored longform; needs full inventory before changes | `P1` | shared component copy |
| legal and secondary pages | Low-likelihood mixed copy, but still part of audit perimeter | `P2` | locale page copy |

## Baseline Screenshot Notes

- No screenshot bundle attached in-repo for this baseline.
- Use manual before/after review on the baseline routes above during verification.

---

## Task 1: Define the editorial decision standard

**Files:**

- Modify: `docs/plans/2026-04-11-sitewide-localization-audit.md`

### Step 1: Add severity levels

Define:

- `P0` = critical professionalism / CTA / nav / metadata / mixed-language sentence / form / landing issue
- `P1` = section headings, badges, teaser cards, helper copy, breadcrumbs, filters, labels
- `P2` = secondary microcopy, lower-priority descriptive framing, old supporting pages

### Step 2: Add the decision matrix

Create three categories:

#### `Keep as-is`

Examples:

- RAG
- XML
- ERP
- XRechnung
- Document AI
- AI-ready
- JSONL
- CSV
- Parquet
- SAP
- EN 16931

#### `Localize`

Examples:

- explanatory sentences
- helper copy
- descriptive CTAs
- card intros
- empty states
- breadcrumbs when not route/product names
- section framing
- labels such as “Read more”, “Learn more”, “View details”, etc.

#### `Case-by-case`

Examples:

- Discovery Call
- Output
- Sample Review
- Accounting Cleanup
- Compliance Transformation
- Process Digitalization
- Now
- Workflow
- Finance-first
- AI Data Preparation

### Step 3: Add a glossary / term registry

Create a registry table with columns:

- term
- DE
- EN
- RO
- status (`keep`, `localized`, `conditional`)
- usage note

Minimum terms to include:

- RAG
- AI-ready
- Document AI
- Discovery Call
- Sample Review
- Output
- Workflow
- Process Digitalization
- Compliance Transformation
- Accounting Cleanup
- Now
- Finance Data
- XRechnung
- XML
- ERP

### Step 4: Record locale policy

#### `DE`

- avoid decorative English in headlines, badges, card titles, helper copy, and descriptive marketing UI
- keep technical English only if it is standard, more precise, or more natural than forced translation

#### `EN`

- fully English except:

  - product names
  - standards / formats
  - company names
  - proper nouns that should not be translated

#### `RO`

- Romanian-first copy
- allow technical English only where it is standard and more natural than forced translation
- avoid decorative English for symmetry

### Step 5: Add the “no mixed-language sentence” rule

Add an explicit rule:

> No mixed-language sentence is allowed in DE or RO unless the embedded English term is explicitly whitelisted in the glossary / term registry.

### Step 6: Add authored content boundary

Add a non-goal / boundary section:

- Do not translate standards or file formats
- Do not mass-rewrite blog post titles or article bodies unless mixed-language framing clearly damages professionalism
- Do not rewrite substantial authored longform just for stylistic symmetry
- Do not translate job titles, company names, certifications, product names, route/product proper nouns, unless they are shell-level artifacts
- Do not “Romanianize” or “Germanize” technical jargon just for uniformity

### Step 7: Commit

```bash
git add docs/plans/2026-04-11-sitewide-localization-audit.md
git commit -m "docs: define localization audit standard and glossary"
```

---

## Task 2: Inventory all public locale surfaces

**Files:**

- Inspect: `src/pages/**/*`
- Inspect: `src/components/**/*`
- Inspect: `src/data/**/*`

### Step 1: Build the inventory

Scan all language-bearing UI text in:

- global navigation
- footer
- homepage and hero sections
- landing funnels
- about / now / services / experience / education
- blog list/detail UI chrome
- project list/detail UI chrome
- tool landing pages and tool shell UI
- legal pages
- forms, thank-you pages, validation messages, helper text, placeholders, submit states

### Step 2: Separate surface types

Tag every finding as one of:

- shared shell
- shared component copy
- locale page copy
- structured data / SEO fields
- tool UI / form UI
- transactional / success / error state UI

### Step 3: Add severity to each finding

For each finding, classify:

- `P0`
- `P1`
- `P2`

### Step 4: Create the audit table

For each finding, record:

- file path
- route(s)
- current string
- locale(s) affected
- surface type
- severity
- classification (`keep` / `localize` / `case-by-case`)
- recommended replacement
- rationale

### Step 5: Commit

```bash
git add docs/plans/2026-04-11-sitewide-localization-audit.md
git commit -m "docs: add sitewide localization audit inventory"
```

---

## Task 3: Fix shared shell and reusable components first

**Files:**

- Modify: `src/components/layout/Navigation.astro`
- Modify: `src/components/layout/Footer.astro`
- Modify: relevant shared sections under `src/components/sections/`
- Modify: relevant shared content models under `src/data/`

### Step 1: Localize only what should not remain mixed

Prioritize:

- navigation labels
- footer labels
- shared CTA labels
- helper labels
- teaser blocks
- card headings
- breadcrumbs labels where they are not proper names
- language switcher / locale helper copy if applicable

### Step 2: Preserve approved technical English

Keep whitelisted terms exactly as documented:

- RAG
- XML
- ERP
- Document AI
- XRechnung
- AI-ready
- JSONL / CSV / Parquet if shown to expert audiences

### Step 3: Move reusable copy into locale-aware data sources

If a shared component hardcodes language-bearing UI:

- move that copy into localized data or a locale-aware content model
- do not leave mixed strings embedded in reusable components

### Step 4: Verify with concrete grep patterns

Run targeted grep searches, for example:

```bash
rg -n "Discovery Call|Sample Review|Output|Workflow|Finance-first|Read more|Learn more|View details|Hobbies|Skills|Jetzt|Acum|Now" src/pages src/components src/data
```

Add locale-specific grep patterns if needed.

### Step 5: Commit

```bash
git add src/components src/data
git commit -m "refactor: localize shared site chrome and reusable component copy"
```

---

## Task 4: Normalize the commercial pages

**Files:**

- Modify: landing funnel routes in `src/pages/`
- Modify: `src/data/services/data-prep-for-ai.ts`
- Modify: commercial home teasers in:

  - `src/pages/index.astro`
  - `src/pages/en/index.astro`
  - `src/pages/ro/index.astro`

### Step 1: Apply the editorial standard

#### `DE`

- remove ornamental English from badges and descriptive marketing copy
- keep technical English only when glossary-approved

#### `EN`

- ensure all commercial framing is fully English
- no German/Romanian labels, buttons, badges, or helper text

#### `RO`

- use Romanian-first commercial copy
- retain only justified technical English

### Step 2: Normalize CTA wording

Review and decide per locale:

- Discovery Call
- Sample Review
- Output
- AI-ready
- Process Digitalization
- Compliance Transformation

Use glossary decisions, not ad hoc instincts.

### Step 3: Verify metadata

For each locale version, check:

- `title`
- `meta description`
- `og:title`
- `og:description`
- breadcrumb labels
- canonical
- alternates / hreflang

### Step 4: Commit

```bash
git add src/pages src/data/services/data-prep-for-ai.ts
git commit -m "feat: normalize localization on commercial pages"
```

---

## Task 5: Normalize profile and narrative pages

**Files:**

- Modify: `src/pages/about.astro`
- Modify: `src/pages/en/about.astro`
- Modify: `src/pages/ro/about.astro`
- Modify: `src/pages/now.astro`
- Modify: `src/pages/services.astro`
- Modify: `src/pages/en/services.astro`
- Modify: `src/pages/ro/services.astro`
- Modify: `src/pages/experience.astro`
- Modify: `src/pages/en/experience.astro`
- Modify: `src/pages/ro/experience.astro`
- Modify equivalent education / legal pages if audit table flags issues

### Step 1: Fix mixed-language framing

Prioritize:

- section badges
- card titles
- teasers
- feature intros
- microcopy
- helper descriptions

### Step 2: Respect authored content boundary

Do not rewrite substantial prose unless:

- mixed-language UI framing breaks locale professionalism
- the text is actually shell-level content reused across locales
- metadata or framing causes visible inconsistency

### Step 3: Protect professional facts

Do not casually translate or mutate:

- job titles
- company names
- certification names
- legal terms that are formal names
- standards / formats
- product/tool names

### Step 4: Verify route-by-route

Check DE, EN, RO manually and via targeted grep.

### Step 5: Commit

```bash
git add src/pages
git commit -m "feat: normalize localization on profile and narrative pages"
```

---

## Task 6: Normalize forms, transactional pages, and system UI

**Files:**

- Modify: landing funnel forms and thank-you pages
- Modify: tool page shells and form labels where necessary
- Modify: any helper text, placeholders, validation states, empty states, success/error copy

### Step 1: Separate authored content from system UI

Only fix:

- form labels
- button labels
- placeholder copy
- consent text
- helper text
- error states
- success states
- thank-you pages
- modal headings
- empty states

### Step 2: Apply the decision standard

Use glossary-backed decisions for terms like:

- Discovery Call
- Sample Review
- Output
- Workflow

### Step 3: Ensure no mixed-language form UX remains

Forms and transactional pages must feel native to the current locale.

### Step 4: Commit

```bash
git add src/components src/pages functions
git commit -m "feat: normalize localization in forms and transactional UI"
```

---

## Task 7: Audit blog, projects, and tool UI chrome

**Files:**

- Modify: shared blog / project / tool components only if audit table flags issues
- Modify: tool page shells and list/filter/meta UI where necessary

### Step 1: Separate authored content from UI chrome

Only fix:

- list labels
- filter names
- helper text
- button labels
- empty states
- modal headings
- meta labels
- archive / category / read-more UI
- project / blog shell framing

Do not mass-rewrite:

- article bodies
- technical tool logic copy
- authored post content
  unless it is clearly a shell or professionalism issue

### Step 2: Apply the glossary and locale rules

Preserve domain-native terms where appropriate.

### Step 3: Commit

```bash
git add src/components src/pages
git commit -m "feat: normalize localization in blog project and tool UI"
```

---

## Task 8: Verification and regression pass

**Files:**

- Verify generated output and affected routes

### Step 1: Run static verification

```bash
npm run check
npm run build
```

**Expected:**

- `check` passes with no errors
- `build` passes

### Step 2: Run targeted grep on built output

Use concrete checks for likely leftovers, for example:

```bash
rg -n "Typische Ursachen|Typische Folgen|Finance-first|Hobbies & Interessen|Discovery Call|Sample Review|Output|Workflow|Read more|Learn more" dist
```

Add more project-specific patterns as needed.

### Step 3: Manual review set

Review at minimum:

- DE / EN / RO homepages
- landing funnel DE / EN / RO
- about DE / EN / RO
- services DE / EN / RO
- experience DE / EN / RO
- now
- 1 blog page
- 1 projects page
- 1 tool page
- form flow and thank-you pages
- mobile + desktop views for critical routes

### Step 4: Editorial QA by page intent

Confirm each page reads correctly for its role:

- homepage = broad positioning
- landing pages = commercial clarity
- about = personal-professional framing
- services = offering clarity
- tools = utility and precision
- blog = shell consistency, not article homogenization
- legal = exactness and formality

### Step 5: Commit

```bash
git add .
git commit -m "chore: complete sitewide localization audit pass"
```

---

## Task 9: Final documentation

**Files:**

- Modify: `README.md` only if locale policy needs project-level documentation
- Modify: `docs/plans/2026-04-11-sitewide-localization-audit.md`

### Step 1: Add the final policy summary

Document:

- which terms remain intentionally English
- which classes of strings must always be localized
- the no-mixed-language-sentence rule
- authored content boundaries
- severity model (`P0 / P1 / P2`)
- where localized shared copy should live
- where glossary decisions should be updated in the future

### Step 2: Commit

```bash
git add README.md docs/plans/2026-04-11-sitewide-localization-audit.md
git commit -m "docs: record final sitewide localization policy"
```
