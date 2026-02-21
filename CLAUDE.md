# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build (astro build + pagefind index)
npm run preview          # Preview production build locally
npm run check            # TypeScript/Astro type-check
npm run check:contrast   # Verify WCAG color contrast ratios

# Linting
npm run lint:design-system        # Audit for design system violations
npm run lint:design-system:strict # Strict mode (exits non-zero on warnings)
npm run lint:a11y                  # Accessibility structure scan
npm run lint:a11y:strict           # Strict a11y (run after build)
npm run lint:chat                  # Lint ChatWidget component
npm run lint:content               # Content-Architect editorial audit

# CI equivalents
npm run ci:quality       # lint:design-system + lint:chat + check + build
npm run ci:a11y          # build + lint:a11y:strict

# Chat/AI tool local dev (requires build first)
npm run dev:chat         # Wrangler Pages dev for ChatWidget testing
npm run dev:copilot      # build + dev:chat

# XRechnung validation tooling
npm run verify:xrechnung:fixtures
npm run kosit:setup && npm run kosit:validate
```

## Architecture

### Tech Stack
- **Astro 5.x** (static output) + **Tailwind CSS 4.x** + **Svelte 5** for interactive islands
- **MDX** with `remark-math` / `rehype-katex` for math equations in blog posts
- **Pagefind** for client-side full-text search (built post-`astro build`)
- **Cloudflare Pages** deployment via GitHub Actions; `wrangler` used for local AI chat testing

### Multilingual Structure
- **German (DE)** is the primary locale at `/` — all main pages live here
- **English** at `/en/`, **Romanian** at `/ro/`
- `src/data/translations.ts` holds all UI strings keyed by locale
- Blog and Projects are **English-only** — `/en/blog/*` and `/ro/blog/*` redirect (301) to `/blog/*`
- `src/utils/i18n.ts` exports `getAlternateUrls()` for hreflang generation

### Page & Component Layout
```
src/
├── content/blog/          # Markdown/MDX blog posts (English only)
├── data/                  # Static data: experience.ts, translations.ts, design-tokens.json
├── layouts/BaseLayout.astro   # Root layout (meta, theme init, hreflang, ChatDrawer)
├── pages/
│   ├── index.astro        # DE homepage
│   ├── en/                # EN pages
│   ├── ro/                # RO pages
│   ├── blog/              # Blog listing + [slug] + category/[category]
│   └── projects/          # Projects listing + [slug]
├── components/
│   ├── layout/            # Header, Navigation, Footer
│   ├── sections/          # Hero, Timeline, SkillsMatrix, BentoGrid, etc.
│   ├── blog/              # PostCard, PostHeader, TableOfContents, etc.
│   ├── projects/          # ProjectCard, GitHubWidget, etc.
│   ├── ui/                # Button, Card, Badge, Modal, ThemeToggle, Icon
│   ├── tools/ui/          # Svelte 5 form primitives for FinTools Hub
│   ├── mdx/               # Custom MDX components: Callout, CodeBlock, Image
│   ├── media/             # MediaCard, MediaEmbed, MediaGallery
│   └── common/            # CookieConsent
├── utils/                 # theme.ts, i18n.ts, readingTime.ts, structuredData.ts
└── styles/
    ├── global.css         # Tailwind import + CSS custom properties for theming
    └── tools-hub.css      # FinTools-specific styles
```

### Design System
- **Brand color**: Eucalyptus green (`eucalyptus-500` = `#6B8E6F`); use `eucalyptus-700` for text links in light mode
- **Secondary**: Warm taupe (`taupe-400` = `#C9B89B`)
- **Dark mode**: Class-based (`darkMode: 'class'` in `tailwind.config.mjs`); toggled via `src/utils/theme.ts`
- **Source of truth**: `src/data/design-tokens.json` — never use raw hex values in components
- **Compliance target**: WCAG 2.2 AAA (7:1 contrast minimum for body text)
- CSS custom properties (`--bg-primary`, `--text-primary`, etc.) are set in `src/styles/global.css` for both `:root` (light) and `.dark` (dark) scopes

### Blog Content Schema
Blog posts in `src/content/blog/` must include:
```yaml
title: string
description: string
pubDate: date
lang: 'en'  # always English
category: 'finance' | 'ai-ml' | 'fintech' | 'personal'
tags: string[]
draft: boolean  # default false
featured: boolean  # default false
```

### ChatWidget / AI Copilot
`src/components/ChatWidget.astro` and `ChatDrawer.astro` implement an AI chat interface backed by a Cloudflare Workers AI endpoint. Test locally with `npm run dev:chat` (requires a prior build).

### FinTools Hub
Interactive finance tools built as Svelte 5 islands (`src/components/tools/`). Includes XRechnung (German e-invoicing) generation and validation. Dedicated CSS at `src/styles/tools-hub.css`.

## Skills (Custom Slash Commands)

Skills live in `.agent/skills/<name>/SKILL.md` and are exposed as slash commands via `.claude/commands/`.

| Command | When to Use |
|---|---|
| `/brainstorming` | Before any new feature or creative work |
| `/design-system-guardian` | Before committing UI changes |
| `/web-design-guidelines` | Astro 5/Tailwind v4/React 19/Cloudflare best practices |
| `/a11y-auditor` | After building UI components |
| `/frontend-design` | Generating new polished UI |
| `/ui-component-generator` | Scaffolding Astro or Svelte 5 components |
| `/content-architect` | Writing or auditing blog content |
| `/seo-auditor` | Checking meta tags, OpenGraph, sitemap |
| `/performance-architect` | Pre-merge Lighthouse optimization |
| `/security-baseline` | Backend/API security review |
| `/pr-reviewer` | Pre-merge code review |
| `/git-commit-architect` | Generating Conventional Commit messages |
| `/deep-research` | Source-verified research before writing articles |

## Key Constraints

- All UI must pass `npm run lint:design-system` — no arbitrary hex colors or magic spacing values
- Blog posts are always English (`lang: 'en'`); site UI strings go in `src/data/translations.ts`
- `npm run build` runs pagefind after astro build — do not skip this for search to work
- The `dist/` folder is the Cloudflare Pages deploy target; never commit it
- Path aliases: `@/` → `src/`, `@components/` → `src/components/`, `@utils/` → `src/utils/` (see `tsconfig.json`)
