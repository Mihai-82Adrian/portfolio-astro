# me-mateescu.de — Portfolio & Fin-Tools Hub

Personal portfolio and open-source finance tooling for DACH founders, built with Astro 5, Tailwind CSS v4, and Svelte 5.

**Live:** [me-mateescu.de](https://me-mateescu.de)

---

## What's inside

### Portfolio
Trilingual portfolio (DE/EN/RO) with blog, project showcases, career timeline, and an AI-powered chat assistant backed by Cloudflare Workers AI.

### Fin-Tools Hub [`/tools`](https://me-mateescu.de/tools)
Local-first finance tools for DACH founders and freelancers. No accounts, no server-side storage, no tracking.

| Tool | Status | Description |
|---|---|---|
| **XRechnung Generator** | ✅ Live | EN 16931 + KoSIT v3.0 compliant e-invoicing. UBL 2.1 + CII XML, DIN 5008 PDF export |
| **Startup Runway & Burn Rate** | ✅ Live | Headcount-driven burn, MRR compound growth, capital injections, Death Valley visualization |
| **Brutto-Netto-Rechner 2026** | ✅ Live | Official BMF PAP 2026 wage tax, full AN+AG Sozialabgaben, Tax Wedge waterfall, GKV Kassenvergleich |
| Cashflow & Forecasting | 🔄 Planned | Plan-Ist-Vergleiche, Forecast-Snapshots for small teams |
| Investment Analytics | 🔄 Planned | Return/risk metrics, scenario analysis |
| FinTech × KI PoC | 🔄 Planned | Experimental AI/ML at the intersection of FinTech |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5.x (static output) |
| Styling | Tailwind CSS 4.x (CSS-native config, `@theme {}`) |
| Islands | Svelte 5 (Runes API) with `client:load` / `client:visible` |
| Content | MDX + `remark-math` / `rehype-katex` for math equations |
| Search | Pagefind (client-side full-text, built post-`astro build`) |
| AI Chat | Cloudflare Workers AI via `@cf/meta/llama-3.1-8b-instruct` |
| Deployment | Cloudflare Pages via GitHub Actions |
| Icons | Lucide (`@lucide/astro`, `lucide-svelte`) |

---

## Getting Started

```bash
npm install
npm run dev          # dev server at localhost:4321
npm run build        # production build + pagefind index
npm run preview      # preview production build locally
```

### AI Chat & XRechnung local dev

```bash
# AI chat requires a prior build + Wrangler
npm run dev:copilot  # build + wrangler pages dev

# XRechnung KoSIT validation (requires Java)
npm run kosit:setup && npm run kosit:validate
```

---

## Quality & CI

Every pull request runs:

```bash
npm run lint:design-system:strict  # Eucalyptus token compliance
npm run lint:content -- --strict   # editorial standards (BLUF, citations, banned words)
npm run check                      # TypeScript + Astro type errors
npm run build                      # full production build
```

Lighthouse scores (production): **100 / 100 / 100 / 100**

---

## Architecture Highlights

### Multilingual
- **DE** at `/` (primary), **EN** at `/en/`, **RO** at `/ro/`
- Blog and Projects are English-only — `/en/blog/*` → 301 → `/blog/*`
- hreflang generation via `src/utils/i18n.ts`

### Design System
- Brand: Eucalyptus green (`eucalyptus-500` = `#6B8E6F`)
- Tokens in `src/data/design-tokens.json` — no raw hex values in components
- Dark mode: class-based via `src/utils/theme.ts`
- WCAG 2.2 AAA compliance target (7:1 contrast minimum)

### ChatWidget / AI Copilot
An AI chat assistant is embedded in every page via `ChatDrawer.astro`. It is backed by a Cloudflare Workers AI endpoint (`@cf/meta/llama-3.1-8b-instruct`) and uses a RAG knowledge base (`public/corpus.jsonl`) to answer questions about the portfolio, tools, and services. The drawer is toggled by a floating action button and is fully keyboard-accessible.

Key files:
- `src/components/ChatWidget.astro` — FAB + drawer shell
- `src/components/ChatDrawer.astro` — chat UI (message list, input, streaming responses)
- `public/corpus.jsonl` — RAG knowledge base (portfolio, tools, services — DE + EN)

Test locally with `npm run dev:copilot` after a prior build.

### Fin-Tools Hub — Local-First Architecture
All tools run entirely in-browser as Svelte 5 islands. No server-side data processing, no accounts.

- **fin-core lib** (`src/lib/fin-core/`) — pure TypeScript domain models, no UI dependencies
  - `xrechnung.ts` — EN 16931 / XRechnung XML generation + KoSIT validation
  - `runway.ts` — startup cash flow model (headcount burn, MRR compound growth, scenarios)
  - `salary-tax.ts` + `bmf-engine-2026.generated.ts` — BMF PAP 2026 wage tax algorithm (22 methods, Eurocent precision)
- **Islands** (`src/components/tools/`) — Svelte 5 Runes, `localStorage` persistence, reactive `$derived` calculations
- **Shared UI primitives** (`src/components/tools/ui/`) — MoneyField, SelectField, Toggle, InfoTooltip

### XRechnung — Local-First Architecture
- All processing in-browser: XML generation, PDF rendering, validation
- Zero server-side storage — only seller defaults in `localStorage`
- Profiles: XRechnung 3.0 (KoSIT CIUS URN) and EN 16931 Basic (Core URN)
- Syntaxes: UBL 2.1 and UN/CEFACT CII
- Tax regimes: Standard (19%), Kleinunternehmer (§19 UStG), Reverse Charge (§13b UStG)
- PDF: pdfmake lazy-loaded on demand (~2.5MB, not in initial bundle)

---

## Project Structure

```
src/
├── content/blog/        # MDX blog posts (English only)
├── data/                # experience.ts, translations.ts, design-tokens.json
├── layouts/             # BaseLayout.astro (meta, hreflang, ChatDrawer)
├── pages/               # DE / EN / RO pages + blog + projects + tools
├── components/
│   ├── layout/          # Header, Navigation, Footer
│   ├── sections/        # Hero, Timeline, SkillsMatrix, BentoGrid
│   ├── blog/            # PostCard, TableOfContents, ShareButtons
│   ├── tools/
│   │   ├── ui/          # MoneyField, SelectField, Toggle, InfoTooltip
│   │   ├── xrechnung/   # XRechnungApp.svelte + subcomponents
│   │   ├── runway/      # RunwayApp.svelte + chart, editors, methodology modal
│   │   └── salary-tax/  # SalaryTaxApp.svelte + form, waterfall chart, breakdown cards
│   ├── ui/              # Button, Card, Badge, Modal, ThemeToggle
│   └── mdx/             # Callout, CodeBlock, Image (with caption)
├── lib/fin-core/        # Domain models: xrechnung.ts, runway.ts, salary-tax.ts, bmf-engine-2026.generated.ts
└── styles/
    ├── global.css       # Tailwind + CSS custom properties (light/dark)
    └── tools-hub.css    # FinTools-specific styles
```

---

## Links

- **Website:** [me-mateescu.de](https://me-mateescu.de)
- **Blog:** [me-mateescu.de/blog](https://me-mateescu.de/blog)
- **XRechnung Tool:** [me-mateescu.de/tools/xrechnung](https://me-mateescu.de/tools/xrechnung)
- **Startup Runway Tool:** [me-mateescu.de/tools/startup-runway](https://me-mateescu.de/tools/startup-runway)
- **Brutto-Netto-Rechner:** [me-mateescu.de/tools/salary-tax](https://me-mateescu.de/tools/salary-tax)
- **LinkedIn:** [Mihai Adrian Mateescu](https://linkedin.com/in/mihai-adrian-mateescu)

---

## License

MIT License — Copyright © 2026 Mihai Adrian Mateescu.

See [LICENSE](./LICENSE) for the full text. Contributions and forks welcome.
