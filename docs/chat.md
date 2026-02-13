# AI Chat PoC (Hardened)

> **Status**: Proof of Concept (PoC)
> **Type**: RAG-based Chatbot
> **Endpoint**: `/api/chat` (Cloudflare Pages Function)

## Overview

The AI Chat is an experimental "Copilot" feature that allows visitors to query the portfolio content using natural language. It uses Retrieval-Augmented Generation (RAG) to provide grounded answers based on the site's content.

## Architecture

### Frontend

- **Components**:
  - `ChatWidget.astro`: Reusable, instance-aware chat interface. Container-agnostic (can be embedded or placed in a drawer).
  - `ChatDrawer.astro`: Global accessible overlay/modal (`role="dialog"`) that wraps `ChatWidget`.
  - `Header.astro`: Contains the "AI Copilot" trigger button (icon-only on mobile, full label on desktop).
- **Pages**:
  - `/ai`: Dedicated showcase page with embedded chat and capabilities overview.
- **Styling**: Tailwind CSS (Eucalyptus palette), Dark mode compatible.
- **Accessibility**:
  - WAI-ARIA Dialog pattern for Drawer.
  - "Label in Name" compliance.
  - `aria-live` regions for messages.
  - Focus management (Focus Trap, Return Focus).
- **Error Handling**:
  - Structured error codes from backend (`RATE_LIMIT`, `CORPUS_LOAD_FAILED`, `OPENAI_KEY_MISSING`, etc.)
  - User-friendly messages in the chat bubble (no internal details leaked).
  - Debug code logged to `console.warn` for developers.

### Backend

- **Platform**: Cloudflare Pages Functions
- **File**: `functions/api/chat.ts`
- **Logic**:
  1. Validates input (Rate detection, Length limits).
  2. Loads corpus from `/corpus.jsonl` (with warm-start caching).
  3. Performs BM25-like text retrieval (top 3 docs).
  4. Calls OpenAI `gpt-4o-mini`.
  5. Returns JSON response with `answer` and `sources`.

### Corpus

The knowledge base is a JSONL file generated from blog content.

```bash
# Regenerate the corpus from src/content/blog/
npm run export:corpus
# Output: public/corpus.jsonl (auto-copied to dist/ on build)
```

## Local Development

> **Important**: `astro dev` (port 4321) does NOT serve Cloudflare Pages Functions.
> You must use `wrangler pages dev` to test the chat API locally.

### Quick Start (recommended)

```bash
# One command: export corpus → build → serve with Wrangler
npm run dev:copilot
```

This opens `http://localhost:8788` with both the site AND the `/api/chat` endpoint working.

### Manual Steps

```bash
npm run export:corpus        # Generate corpus
npm run build                # Build site + Pagefind
npm run dev:chat             # Serve dist/ with Wrangler Pages
```

### API Key Setup

Create a `.dev.vars` file in the project root (already in `.gitignore`):

```bash
# .dev.vars
OPENAI_API_KEY="sk-..."
```

Wrangler reads this file automatically and injects the key as `env.OPENAI_API_KEY`.

## Security Features

1. **Strict DOM Rendering**: No `innerHTML` usage. Messages are built using `document.createElement`.
2. **XSS Protection**: Links are rendered with `rel="noopener noreferrer"`.
3. **Input Validation**: Max length 2000 chars, empty check.
4. **Rate Limiting**: Server-side IP-based limiting (10 req/min).
5. **Error Isolation**: Backend never leaks stack traces or internal error messages.

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `OPENAI_KEY_MISSING` | 500 | `.dev.vars` is missing `OPENAI_API_KEY` |
| `CORPUS_LOAD_FAILED` | 503 | `/corpus.jsonl` not found or unreachable |
| `OPENAI_UPSTREAM_ERROR` | 502 | OpenAI API returned an error |
| `RATE_LIMIT` | 429 | Too many requests from this IP |
| `INPUT_EMPTY` | 400 | Empty message submitted |
| `INPUT_TOO_LONG` | 400 | Message exceeds 2000 chars |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Quality Gates

```bash
# Check for forbidden patterns (like innerHTML)
npm run lint:chat

# Strict accessibility check
npm run lint:a11y:strict
```

## Smoke Test

After `npm run dev:copilot` is running:

```bash
# 1. Verify corpus is served
curl -I http://localhost:8788/corpus.jsonl

# 2. Test the API
curl -s -X POST http://localhost:8788/api/chat \
  -H "content-type: application/json" \
  --data '{"message":"What are Mihai'\''s skills?"}' | head
```
