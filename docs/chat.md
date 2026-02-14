# Ask Mihai · AI (V2)

> **Status**: Production-ready
> **Type**: RAG-based Chatbot + Job Description Analyzer
> **Endpoint**: `/api/chat` (Cloudflare Pages Function)

## Overview

The Ask Mihai · AI assistant is a recruiter-optimized chatbot that lets visitors query the portfolio using natural language **and** analyze job descriptions for candidate-fit. It features:

- **Tabbed Interface**: 💬 Chat + 📄 JD Analysis
- **Intent Router**: 5 deterministic intents (zero API cost) with trilingual facts store
- **Language Detection**: Multi-priority (UI selector → text patterns → Accept-Language → page lang)
- **Session Quotas**: Cookie-based (4 chat + 1 JD per 24h)
- **Structured JD Output**: JSON schema → premium rendered UI with score, progress bar, verdict badge

## Architecture

### Frontend

- **Components**:
  - `ChatWidget.astro`: Tabbed interface (Chat + JD Analysis) with language selector, quick action chips, quota badge, and structured JD result renderer.
  - `ChatDrawer.astro`: Global accessible overlay (`role="dialog"`) wrapping `ChatWidget`.
  - `Header.astro`: "Ask Mihai" floating widget trigger with rotating nudge tooltip.
- **Pages**: `/ai` — Showcase page with embedded chat.
- **Styling**: Tailwind CSS (Eucalyptus palette), Dark mode compatible.
- **Accessibility**: WAI-ARIA Dialog, focus management, `aria-live` regions.
- **Error Handling**: Structured error codes, user-friendly messages, debug codes in console.

### Backend

- **Platform**: Cloudflare Pages Functions
- **File**: `functions/api/chat.ts`
- **Logic**:
  1. Rate limiting (IP-based, 10 req/min).
  2. Input validation (length limits: 4000 chat, 6000 JD).
  3. Language detection (3-priority system).
  4. **Intent router** → serves from `facts.json` (zero LLM cost).
  5. **Session quota check** (cookie-based, 4 chat + 1 JD per 24h).
  6. Corpus loading from `/corpus.jsonl` (warm-start caching).
  7. BM25-like text retrieval (top 5 docs, 8 for job match).
  8. OpenAI `gpt-4o-mini` call with tab-aware prompts.
  9. Response with quota cookie (`Set-Cookie`).

### Intent Router

| Intent | Trigger Examples | Response Source |
|--------|-----------------|----------------|
| `contact_phone` | "phone number", "Telefonnummer" | `facts.json` (privacy-gated) |
| `contact` | "contact", "email", "Kontakt" | `facts.json` |
| `current_role` | "current role", "aktuelle Stelle" | `facts.json` |
| `certifications` | "certifications", "Zertifizierungen" | `facts.json` |
| `projects` | "projects", "Projekte" | `facts.json` |

### Facts Store

`public/facts.json` — trilingual (DE/EN/RO) curated responses. Phone number is privacy-gated (only revealed on explicit `contact_phone` intent).

### Session Quotas

- **Limits**: 4 chat questions + 1 JD analysis per 24-hour session
- **Storage**: `chat_session` cookie (JSON: `{q, jd, ts}`) only when consent is granted
- **Enforcement**: Backend validates before LLM call; returns `429` with quota data
- **UI**: Color-coded badge (green → amber → red) with remaining counts
- **Consent behavior**: If consent is denied/not set, API does not read or set `chat_session`

### JD Analysis Output

JSON schema prompt → structured response:

```json
{
  "verdict": "Strong Match | Good Match | Partial Match | Not Aligned",
  "score": 0-100,
  "summary": "...",
  "matches": [{ "skill": "...", "detail": "...", "source": "..." }],
  "transferable": [{ "skill": "...", "detail": "..." }],
  "gaps": [{ "requirement": "...", "detail": "..." }],
  "recommendation": "..."
}
```

Frontend renders: progress bar (animated), verdict badge, match/transferable/gaps sections, recommendation card.

## Local Development

> `astro dev` does NOT serve Cloudflare Pages Functions.
> Use `wrangler pages dev` for the chat API.

```bash
# One command: export corpus → build → serve with Wrangler
npm run dev:copilot
```

Opens `http://localhost:8788` with site AND `/api/chat`.

### API Key Setup

```bash
# .dev.vars (in project root, gitignored)
OPENAI_API_KEY="sk-..."
```

## Security Features

1. **Strict DOM Rendering**: No `innerHTML` — all DOM built with `createElement`/`textContent`.
2. **XSS Protection**: Links use `rel="noopener noreferrer"`.
3. **Input Validation**: Max 4000 (chat) / 6000 (JD) chars.
4. **Rate Limiting**: IP-based (10 req/min) + session quotas (4+1 per 24h).
5. **Prompt Hardening**: EVIDENCE delimiters prevent prompt injection.
6. **Privacy by Default**: Phone only revealed on explicit request.
7. **Cookie Consent Gating**:
   - Essential: language/theme preferences (local storage), technical functionality.
   - Non-essential: `chat_session` quota persistence cookie.
   - `chat_session` is read/set only when client sends `X-Cookie-Consent: granted`.

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `OPENAI_KEY_MISSING` | 500 | `.dev.vars` missing `OPENAI_API_KEY` |
| `CORPUS_LOAD_FAILED` | 503 | `/corpus.jsonl` not found |
| `OPENAI_UPSTREAM_ERROR` | 502 | OpenAI API error |
| `RATE_LIMIT` | 429 | IP rate limit exceeded |
| `QUOTA_CHAT_EXCEEDED` | 429 | Session chat limit reached |
| `QUOTA_JD_EXCEEDED` | 429 | Session JD limit reached |
| `INPUT_EMPTY` | 400 | Empty message |
| `INPUT_TOO_LONG` | 400 | Message exceeds char limit |

## Quality Gates

```bash
npm run lint:chat       # Security check (no innerHTML, etc.)
npm run lint:a11y:strict # Accessibility check
```

## Smoke Test

```bash
# 1. Test intent router (zero cost)
curl -s -X POST http://localhost:8788/api/chat \
  -H "content-type: application/json" \
  --data '{"message":"What are Mihai'\''s certifications?","tab":"chat"}' | jq .mode
# Expected: "fact"

# 2. Test JD analysis
curl -s -X POST http://localhost:8788/api/chat \
  -H "content-type: application/json" \
  --data '{"message":"Senior Full-Stack Developer, 5+ years experience...","tab":"jd"}' | jq .answer
```
