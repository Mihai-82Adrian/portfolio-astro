
# AI Chat PoC Documentation

## Overview

A lightweight, secure AI chat widget for the portfolio. It uses Cloudflare Pages Functions (`functions/api/chat.ts`) to proxy requests to OpenAI, retrieving context from a generated `corpus.jsonl` file.

## Security Features

- **No InnerHTML**: Frontend constructs DOM nodes safely via `document.createElement` to prevent XSS.
- **Input Validation**: Messages capped at 2000 characters; empty messages rejected.
- **Rate Limiting**: In-memory IP bucket (10 requests/minute per IP).
- **System Prompt Hardening**: Explicit instructions to ignore leaked prompt injections from the corpus.
- **Corpus Caching**: Parsed corpus is cached in global scope for warm starts.

## Accessibility (A11y)

- **ARIA Labels**: All buttons (Open/Close/Send) have accessible names.
- **Focus Management**: Focus moves to input on open, returns to toggle button on close.
- **Keyboard Support**: Esc key closes the chat window.

## Configuration

managed via `functions/api/chat.ts` and `src/components/ChatWidget.astro`.

### Environment Variables

Set these in Cloudflare Pages settings or `.dev.vars` for local dev:

- `OPENAI_API_KEY`: Required for generating answers.

## Development

- **Linting**: `npm run lint:chat` checks for forbidden patterns (e.g., `innerHTML`).
- **Local Run**: `npm run dev` (uses `wrangler pages dev` for functions).

## Future Roadmap

- UI Redesign (Standardize placement).
- Migrate to OpenAI Assistants API (if statefulness is needed).
