# me-mateescu.de — Portfolio & Fin-Tools Hub

Personal portfolio and open-source finance tooling for DACH founders, built with Astro 5, Tailwind CSS v4, and Svelte 5.

**Live:** [me-mateescu.de](https://me-mateescu.de)

---

## What's inside

### Portfolio
Trilingual portfolio (DE/EN/RO) with blog, project showcases, career timeline, and an AI-powered chat assistant backed by Cloudflare Workers AI.

### Fin-Tools Hub [`/tools`](https://me-mateescu.de/tools)
Local-first finance tools for DACH founders and freelancers. No accounts, no server-side storage, no tracking.

| Tool | Description |
|---|---|
| [**XRechnung Generator**](https://me-mateescu.de/tools/xrechnung) | EN 16931 + KoSIT v3.0 compliant e-invoicing. UBL 2.1 + CII XML, DIN 5008 PDF export |
| [**Startup Runway & Burn Rate**](https://me-mateescu.de/tools/startup-runway) | Headcount-driven burn, MRR compound growth, capital injections, Death Valley visualization |
| [**Cashflow & Forecasting**](https://me-mateescu.de/tools/cashflow-forecast) | 12-month liquidity planner with revenue/cost blocks. AI stress test simulates late payments, churn spikes, and cost shocks (o4-mini) |
| [**Investment Analytics**](https://me-mateescu.de/tools/investment-analytics) | ROI/CAGR/IRR/NPV, Sharpe/Sortino/VaR, 1000-path Monte Carlo, DACH Abgeltungsteuer (Teilfreistellung, Kirchensteuer, Vorabpauschale), AI analysis + PDF export |
| [**Brutto-Netto-Rechner 2026**](https://me-mateescu.de/tools/salary-tax) | Official BMF PAP 2026 wage tax, full AN+AG Sozialabgaben, Tax Wedge waterfall, GKV Kassenvergleich |
| [**Founder Compass**](https://me-mateescu.de/tools/founder-compass) | 12-question entrepreneur profiler — risk tolerance, funding strategy, business model. Personalized AI report (o4-mini) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5.x (static output) |
| Styling | Tailwind CSS 4.x (CSS-native config, `@theme {}`) |
| Islands | Svelte 5 (Runes API) with `client:load` / `client:visible` |
| Content | MDX + `remark-math` / `rehype-katex` for math equations |
| Search | Pagefind (client-side full-text, built post-`astro build`) |
| Charts | Chart.js 4.x (line, bar, waterfall — lazy-loaded per tool) |
| PDF | pdfmake (lazy-loaded on demand, zero initial bundle cost) |
| AI Chat | Cloudflare Workers AI via `@cf/meta/llama-3.1-8b-instruct` |
| AI Analysis | OpenAI o4-mini via Cloudflare Workers (structured JSON output) |
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

### AI tools & local dev

```bash
# AI chat + tool Workers require a prior build + Wrangler
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

Documentation-only changes (`README.md`, `LICENSE`, `docs/`) skip CI and deployment via `paths-ignore`.

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

Test locally with `npm run dev:copilot` after a prior build.

### Fin-Tools Hub — Local-First Architecture
All tools run entirely in-browser as Svelte 5 islands. No server-side data processing, no accounts. Optional AI analysis endpoints use Cloudflare Workers with weekly rate limits per hashed IP.

**Domain libraries** (`src/lib/`) — pure TypeScript, no UI dependencies:
- `fin-core/` — XRechnung XML generation, startup runway model, BMF PAP 2026 wage tax engine
- `cashflow/` — projection engine, scenario parameters, PDF export
- `investment/` — ROI/IRR/NPV/Sharpe/Sortino/VaR analytics, Monte Carlo simulation, DACH tax (Abgeltungsteuer + Teilfreistellung + Kirchensteuer + Vorabpauschale), PDF export
- `founder-compass/` — profiler question bank and scoring logic

**AI Workers** (`functions/api/`) — Cloudflare Workers, o4-mini structured output:
- `cashflow-scenario.ts` — stress test narratives (late payment, churn, cost shock)
- `investment-analysis.ts` — investment assessment (summary, strengths, risks, recommendation)
- `compass.ts` — founder profile report (SSE streaming)
- `chat.ts` — portfolio AI chat (Llama 3.1)

**Shared UI primitives** (`src/components/tools/ui/`) — MoneyField, SelectField, Toggle, InfoTooltip

---

## Project Structure

```
src/
├── content/blog/          # MDX blog posts (English only)
├── data/                  # experience.ts, translations.ts, design-tokens.json
├── layouts/               # BaseLayout.astro (meta, hreflang, ChatDrawer)
├── pages/                 # DE / EN / RO pages + blog + projects + tools
├── components/
│   ├── layout/            # Header, Navigation, Footer
│   ├── sections/          # Hero, Timeline, SkillsMatrix, BentoGrid
│   ├── blog/              # PostCard, TableOfContents, ShareButtons
│   ├── tools/
│   │   ├── ui/            # MoneyField, SelectField, Toggle, InfoTooltip
│   │   ├── xrechnung/     # XRechnungApp.svelte + subcomponents
│   │   ├── runway/        # RunwayApp.svelte + chart, editors, methodology modal
│   │   ├── salary-tax/    # SalaryTaxApp.svelte + waterfall chart, breakdown cards
│   │   ├── cashflow-forecast/  # CashflowApp.svelte + chart, block manager, scenarios
│   │   ├── investment-analytics/ # InvestmentApp.svelte + metrics, Monte Carlo, tax panel
│   │   └── founder-compass/    # FounderCompassApp.svelte + questionnaire, AI report
│   ├── ui/                # Button, Card, Badge, Modal, ThemeToggle
│   └── mdx/               # Callout, CodeBlock, Image (with caption)
├── lib/
│   ├── fin-core/          # XRechnung, runway model, BMF PAP 2026 engine
│   ├── cashflow/          # Projection engine, scenario params, PDF export
│   ├── investment/        # Analytics (ROI/IRR/NPV/MC), DACH tax, PDF export
│   └── founder-compass/   # Profiler logic
├── styles/
│   ├── global.css         # Tailwind + CSS custom properties (light/dark)
│   └── tools-hub.css      # FinTools-specific styles
└── utils/                 # theme.ts, i18n.ts, readingTime.ts, structuredData.ts

functions/api/             # Cloudflare Workers (AI endpoints)
```

---

## Links

- **Website:** [me-mateescu.de](https://me-mateescu.de)
- **Blog:** [me-mateescu.de/blog](https://me-mateescu.de/blog)
- **Fin-Tools Hub:** [me-mateescu.de/tools](https://me-mateescu.de/tools)
- **LinkedIn:** [Mihai Adrian Mateescu](https://linkedin.com/in/mihai-adrian-mateescu)

---

## License

MIT License — Copyright © 2026 Mihai Adrian Mateescu.

See [LICENSE](./LICENSE) for the full text. Contributions and forks welcome.
