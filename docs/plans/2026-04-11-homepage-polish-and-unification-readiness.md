# Homepage Polish and Unification Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the homepage shell and key commercial surfaces to a professional, visually consistent state so the `feat/data-prep-landing` worktree can be unified without obvious editorial or layout defects.

**Architecture:** This is a focused polish pass, not a redesign. The work stays inside existing Astro components and translation/data files. Priorities are: fix shell-level DE copy defects, tighten homepage hero composition, preserve the new landing page hierarchy, and normalize homepage section ordering and CTA logic so the portfolio reads intentionally from top to bottom.

**Tech Stack:** Astro 5, Tailwind v4, shared translation/data modules, Chrome DevTools MCP for visual verification.

---

### Task 1: Freeze the visual baseline before editing

**Files:**
- Read: `src/components/sections/Hero.astro`
- Read: `src/components/sections/BentoGrid.astro`
- Read: `src/components/layout/Navigation.astro`
- Read: `src/components/layout/Footer.astro`
- Read: `src/pages/index.astro`
- Read: `src/pages/en/index.astro`
- Read: `src/pages/ro/index.astro`
- Read: `src/data/translations.ts`

**Step 1: Reconfirm the current defects**

Use Chrome DevTools MCP on:
- `/`
- `/datenaufbereitung-fuer-ki`
- mobile viewport on `/`

Capture:
- top whitespace between header and hero
- hero badge copy
- CTA ordering and labels
- section order below hero
- footer DE copy
- homepage card language mix in `BentoGrid`

**Step 2: Record the acceptance target in the plan notes**

Acceptance target:
- no obvious mixed-language shell copy on DE homepage
- tighter first viewport on desktop and mobile
- homepage CTA hierarchy centered on professional credibility
- strategic offer teaser and contact/quick-links section appear directly below hero
- `Was ich mache` moves lower in the page

**Step 3: Do not change code yet**

This task exists to keep the implementation grounded in the observed defects rather than assumptions.

**Step 4: Commit**

Skip commit if nothing changed in code. This task is inspection only.

---

### Task 2: Fix shell-level DE copy defects first

**Files:**
- Modify: `src/components/sections/Hero.astro`
- Modify: `src/components/layout/Navigation.astro`
- Modify: `src/components/layout/Footer.astro`
- Modify: `src/data/translations.ts`

**Step 1: Localize the hero availability badge**

Replace the hardcoded badge text in `Hero.astro` with a locale-aware string sourced from `translations.ts`.

Recommended DE copy:
- `Für Beratungsprojekte verfügbar`

Recommended EN copy:
- `Available for consulting`

Recommended RO copy:
- `Disponibil pentru proiecte de consultanță`

**Step 2: Remove remaining hardcoded `Home` in DE/RO shell**

Ensure both nav and footer consume translated labels, not hardcoded English fallbacks.

**Step 3: Localize footer legal microcopy**

Move or normalize:
- `All rights reserved.`
- `Built with`
- `deployed on`

Recommended DE:
- `Alle Rechte vorbehalten.`
- `Erstellt mit`
- `deployt auf` or `bereitgestellt über` depending on tone consistency

Recommended RO:
- `Toate drepturile rezervate.`
- `Construit cu`
- `publicat pe` or `livrat prin`

**Step 4: Verify no visible DE shell copy remains accidentally English**

Run:
- `rg -n "Home|Available for consulting|All rights reserved|Built with|deployed on" src/components src/data`

Expected:
- only intentional EN entries inside EN translation maps

**Step 5: Commit**

```bash
git add src/components/sections/Hero.astro src/components/layout/Navigation.astro src/components/layout/Footer.astro src/data/translations.ts
git commit -m "fix: localize homepage shell copy"
```

---

### Task 3: Tighten homepage hero composition on desktop and mobile

**Files:**
- Modify: `src/components/sections/Hero.astro`
- Read: `src/styles/global.css` (only if spacing tokens need confirmation)
- Optional modify: `src/components/layout/Header.astro` if header spacing contributes materially

**Step 1: Reduce the dead space between header and hero**

Audit the spacing sources in `Hero.astro`:
- outer section top padding
- `Container` `paddingY`
- hero shell margin/padding
- banner wrapper margin

Goal:
- desktop hero should begin visually closer to the nav without feeling cramped
- mobile hero should enter the first viewport materially sooner

**Step 2: Preserve the card aesthetic while reducing vertical drift**

Do not flatten the hero card. Only reduce empty lead-in space.

**Step 3: Check the mobile first screen**

Use Chrome DevTools MCP at `390x844`.

Expected:
- less blank area above the hero card
- badge and title appear earlier in the viewport
- no overlap with sticky header or chat controls

**Step 4: Verify desktop balance**

Use Chrome DevTools MCP at desktop width.

Expected:
- hero still breathes
- visual center remains premium and intentional

**Step 5: Commit**

```bash
git add src/components/sections/Hero.astro src/components/layout/Header.astro
git commit -m "style: tighten homepage hero spacing"
```

Only include `Header.astro` if actually modified.

---

### Task 4: Normalize homepage CTA hierarchy and copy

**Files:**
- Modify: `src/data/translations.ts`
- Modify: `src/components/sections/Hero.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/en/index.astro`
- Modify: `src/pages/ro/index.astro`

**Step 1: Make the primary CTA point to professional experience**

DE homepage primary CTA should be:
- label: `Berufserfahrung`
- href: `/experience`

EN homepage equivalent:
- `Experience`
- `/en/experience`

RO homepage equivalent:
- `Experiență`
- `/ro/experience`

**Step 2: Keep `Blog` as secondary CTA**

Do not promote projects over professional credibility on the personal homepage.

**Step 3: Ensure CTA labels come from translation/data, not stale defaults**

The earlier `View Projects` regression indicates the component still has fallback defaults that can leak.
Remove dependence on inappropriate defaults for the homepage path.

**Step 4: Recheck hero on all locales**

Expected:
- DE: professional CTA hierarchy
- EN and RO: localized labels and locale-correct hrefs

**Step 5: Commit**

```bash
git add src/data/translations.ts src/components/sections/Hero.astro src/pages/index.astro src/pages/en/index.astro src/pages/ro/index.astro
git commit -m "feat: refocus homepage ctas on experience"
```

---

### Task 5: Reorder homepage sections for stronger narrative flow

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/en/index.astro`
- Modify: `src/pages/ro/index.astro`

**Step 1: Move the strategic offer teaser directly below the hero**

The strategic offer teaser should sit immediately after the personal introduction card and CTA cluster.

**Step 2: Move the contact and quick-links section up**

Place the contact/quick-links block directly below the strategic offer teaser.

**Step 3: Move `Was ich mache` lower**

The `BentoGrid` section should move down into the position currently occupied by the contact/quick-links section.

Target homepage flow:
1. Hero
2. Strategic offer teaser
3. Contact / quick links
4. Bento grid
5. Remaining supporting sections

**Step 4: Preserve semantic heading order**

Do not create skipped heading levels while reordering.

**Step 5: Verify on mobile**

Expected:
- professional identity -> strategic offer -> contact credibility -> broader hub navigation

**Step 6: Commit**

```bash
git add src/pages/index.astro src/pages/en/index.astro src/pages/ro/index.astro
git commit -m "refactor: reorder homepage sections for clearer narrative"
```

---

### Task 6: Clean homepage `BentoGrid` editorial language without over-translating

**Files:**
- Modify: `src/components/sections/BentoGrid.astro`

**Step 1: Remove accidental English framing on DE cards**

Normalize DE copy where English is ornamental, not technical.

Examples to fix:
- `Tech & AI Portfolio`
- `SERVICES` badge if it feels accidental against DE body copy
- `AI-gestützten Chatbots` if better rendered as `KI-gestützten Chatbots`

**Step 2: Keep justified product/market language**

Do not force-translate terms that are functioning as established labels if the result gets worse.

Examples likely safe to keep:
- `Full-Stack`
- `AI/ML`
- `Rust · Python · Astro`
- `Suno V5 Pro`

**Step 3: Normalize DE card language toward one tone**

Recommended direction:
- `Tech & KI-Portfolio`
- `Dienstleistungen`
- `Kreativ`

**Step 4: Check EN/RO only for consistency, not blanket rewriting**

Only adjust if the DE cleanup reveals parallel inconsistencies.

**Step 5: Commit**

```bash
git add src/components/sections/BentoGrid.astro
git commit -m "style: normalize homepage bento editorial copy"
```

---

### Task 7: Final browser verification for unification readiness

**Files:**
- No required code changes

**Step 1: Run verification**

```bash
npm run check
npm run build
```

Expected:
- `0 errors`
- `0 warnings`
- existing hints only
- successful static build

**Step 2: Browser pass with Chrome DevTools MCP**

Verify:
- `/`
- `/datenaufbereitung-fuer-ki`
- mobile `/`
- optional `/en/` and `/ro/`

Checklist:
- no shell-level mixed-language defects on DE
- homepage first viewport feels intentional
- hero CTA hierarchy is correct
- strategic offer teaser appears directly under hero
- contact block follows immediately after teaser
- `BentoGrid` reads as secondary navigation, not primary self-introduction
- footer no longer undermines localization quality

**Step 3: Record residual intentional exceptions**

Document only the terms intentionally retained in English, for example:
- `Ask Mihai`
- `Discovery Call`
- `RAG`
- `Document AI`
- `AI/ML`
- specific tool/product names where justified

**Step 4: Commit final verification note if code changed in this task**

If no code changed, skip commit.

---

### Task 8: Merge readiness checkpoint

**Files:**
- Optional docs note only if needed

**Step 1: Review worktree cleanliness**

Run:

```bash
git status --short
```

Separate:
- user-owned visual/dependency changes
- audit/localization commits
- homepage polish commits

**Step 2: Decide whether the branch is ready for unification**

Ready means:
- no obvious DE shell language defects
- homepage hierarchy reads professionally
- landing page remains visually stronger than services without being detached from brand
- mobile first impression is acceptable

**Step 3: If ready, hand off to finishing workflow**

Use:
- `superpowers:finishing-a-development-branch`

Do not push automatically.

