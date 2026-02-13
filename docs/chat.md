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
  - `Header.astro`: Contains the "AI Copilot" trigger button.
- **Pages**:
  - `/ai`: Dedicated showcase page with embedded chat and capabilities overview.
- **Styling**: Tailwind CSS (Eucalyptus palette), Dark mode compatible.
- **Accessibility**:
  - WAI-ARIA Dialog pattern for Drawer.
  - "Label in Name" compliance.
  - `aria-live` regions for messages.
  - Focus management (Focus Trap, Return Focus).

### Backend

- **Platform**: Cloudflare Pages Functions
- **File**: `functions/api/chat.ts`
- **Logic**:
  1. Validates input (Rate detection, Length limits).
  2. Performs Vector Search (mocked or real).
  3. Calls LLM Provider (e.g., OpenAI/Anthropic/Local).
  4. Returns streamed or JSON response.

## Security Features

1. **Strict DOM Rendering**: No `innerHTML` usage. Messages are built using `document.createElement`.
2. **XSS Protection**: Links are rendered with `rel="noopener noreferrer"`.
3. **Input Validation**: Max length 500 chars, empty check.
4. **Rate Limiting**: Server-side IP-based limiting (simulated in PoC).

## Development

### Linting

We enforce strict rules for the chat component to prevent regression.

```bash
# Check for forbidden patterns (like innerHTML)
npm run lint:chat

# Strict accessibility check
npm run lint:a11y:strict
```

### Usage

- **Global**: Click "AI Copilot" in the header to open the drawer.
- **Dedicated**: Visit `/ai` to see the full-page experience.

- `OPENAI_API_KEY`: Required for generating answers.

## Development

- **Local Run**: `npm run dev` (uses `wrangler pages dev` for functions).

## Future Roadmap

- UI Redesign (Standardize placement).
- Migrate to OpenAI Assistants API (if statefulness is needed).
