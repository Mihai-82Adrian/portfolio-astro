# Portfolio Copilot V2 — Design Document

> Brainstorming validated 2026-02-14. Approach: **Incremental (Option C)**.

## Architecture Philosophy

**Lean & Incremental** — do 5 things perfectly, not 15 mediocrely. Each increment is testable and deployable independently.

---

## 1. Tabbed Chat Widget (Hybrid A+B)

### Layout

Two tabs in the chat header: **💬 Chat** and **📄 JD Analysis**.

```
┌─────────────────────────────────────────┐
│ 🤖 Portfolio Copilot        [🌐 Auto ▾] │  header + language selector
│ ─────────────────────────────────────── │
│ [💬 Chat]  [📄 JD Analysis]            │  tab bar (eucalyptus underline)
├─────────────────────────────────────────┤
│  (active tab content)                   │
├─────────────────────────────────────────┤
│  [textarea]                    [Send ▸] │  input area
│  3/4 questions left                     │  quota counter
└─────────────────────────────────────────┘
```

### 💬 Chat Tab

- Welcome message with rules
- **Quick action chips** (zero API cost, served from facts store):
  - `📋 Contact` | `💼 Current Role` | `🎓 Certifications` | `🚀 Projects`
- Quota counter: "3/4 questions remaining"

### 📄 JD Analysis Tab

- Hero text: *"Paste a job description for a professional fit analysis"*
- Large textarea (~70% of space)
- Character counter: `1,247 / 6,000`
- Collapsible structure guide:
  - Job Title & Company
  - Required Qualifications
  - Responsibilities
  - Nice-to-haves
  - Location & Work Model
- Large "🔍 Analyze Fit" button (eucalyptus-600)
- Separate quota: 1 JD analysis per session

### Language Selector

- Small dropdown in header: `Auto | DE | EN | RO`
- Priority: 1) User selection → 2) `document.documentElement.lang` → 3) Accept-Language → 4) text detection

---

## 2. Structured JD Analysis Output

LLM returns **JSON**, frontend renders as premium UI.

### JSON Schema

```json
{
  "overallScore": 78,
  "verdict": "Good Match",
  "matches": ["Financial Accounting (2+ yrs)", "DATEV", "German B2+"],
  "transferable": [
    { "skill": "E-Commerce compliance", "transfer": "regulatory awareness" }
  ],
  "gaps": [
    { "requirement": "SAP", "status": "not listed" },
    { "requirement": "C1 German", "status": "has B2 (close gap)" }
  ],
  "recommendation": "Mihai is a good fit for this role...",
  "sources": ["modal3 Logistik", "IHK Fachkraft"]
}
```

### UI Rendering

- **Progress bar** (animated, eucalyptus fill)
- **Color-coded verdict**:
  - 🟢 Strong Match (80%+) → eucalyptus-500
  - 🔵 Good Match (60-79%) → info
  - 🟡 Partial Match (40-59%) → warning
  - 🔴 Not Aligned (<40%) → error
- Sections with icons: ✅ Matches, 🔄 Transferable, ⚠️ Gaps
- Sources linked to real portfolio pages

---

## 3. Intent Router + Facts Store

### Routing Flow

```
Message → Language Detection → Intent Router
  ├─ FACT intent (contact, role, skills, certs, projects) → facts.json → instant response ($0)
  ├─ JD Analysis tab → RAG + LLM (structured JSON) → premium render
  └─ Complex/ambiguous → RAG + LLM (text) → standard chat response
```

### Intent Patterns

| Intent | Triggers (EN/DE/RO) | Source |
|---|---|---|
| `contact` | contact, email, reach, erreichen, kontakt | facts.json |
| `current_role` | current, position, aktuelle stelle, rol actual | facts.json |
| `skills` | skills, fähigkeiten, competențe | facts.json |
| `certifications` | certif, IHK, zertifi, certificări | facts.json |
| `projects` | projects, projekte, proiecte, GDS, GENESIS | facts.json |

### Privacy Policy

- **Default**: email + LinkedIn only
- **Phone**: only when explicitly requested (`phone|telefon|nummer`)
- Template: *"For direct phone contact, please ask specifically."*

---

## 4. Session Quotas

### Implementation

- **Cookie-based** (`chat_session`): `{ "q": 0, "jd": 0, "ts": timestamp }`
- Limits: **4 chat questions** + **1 JD analysis** per 24h session
- **Intent router queries** (chips, facts) do NOT consume quota
- Cookie expires at 24h

### UI Badge

```
💬 3/4 questions  |  📄 1/1 JD analysis
```

- Green → Yellow (1 left) → Red (0 left)
- When exhausted: input disabled + message: *"Session limit reached. Come back tomorrow!"*

---

## Implementation Order (Incremental)

1. **Phase 1**: Intent Router + Facts Store + Language detection in `chat.ts`
2. **Phase 2**: Tabbed UI + Quick Action Chips + Language Selector in `ChatWidget.astro`
3. **Phase 3**: Session Quotas (cookie + backend + UI badge)
4. **Phase 4**: JD Analysis structured JSON output + premium rendering
5. **Phase 5**: Polish, E2E testing, documentation update
