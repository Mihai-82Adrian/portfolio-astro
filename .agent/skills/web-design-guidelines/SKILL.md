---
name: "web-design-guidelines"
description: "Review code for Astro 5/6, Tailwind v4, React 19, and Cloudflare best practices (2026 Standards)."
argument-hint: "src/**/*.{astro,tsx}"
---

# 2026 Web Stack Guidelines (Astro + Tailwind v4 + React 19)

Review these files for compliance: $ARGUMENTS

Read files, check against rules below. Output concise but comprehensive—sacrifice grammar for brevity. High signal-to-noise. **Crucial:** You must strictly differentiate between `.astro` files (Astro templating) and `.tsx` files (React 19).

## 1. Astro 5/6 (Core Architecture)

- **Syntax:** In `.astro` files, use standard HTML attributes (`class`, `for`, `onkeydown`). NO camelCase React events here.
- **Islands Architecture:** Use `client:load`, `client:visible`, or `client:idle` strictly only when JS is required.
  - For personalized dynamic content that bypasses edge cache (Cloudflare), prefer Astro Server Islands (`server:defer`) over heavy client-side fetching.
- **Data Fetching:** Use Astro's `liveContentCollections` or native `fetch` at build/request time.
- **Images:** Use Astro's `<Image />` or `<Picture />` components instead of raw `<img>` for automatic optimization.

## 2. Tailwind CSS v4 (Styling)

- **CSS-Native Configuration:** Tailwind v4 uses CSS variables. Do not suggest adding plugins or themes to a `tailwind.config.js` if it can be done via `@theme` in the global CSS.
- **Modern Utilities:** Use `text-balance` or `text-pretty` for headings to prevent typographic widows.
- **Dark Mode:** Use `dark:` variants alongside CSS variables. Avoid complex JS logic for theme switching if native CSS can handle it.
- **Animations:** Use `motion-safe:` and `motion-reduce:` variants. Only animate `opacity` and `transform` (compositor-friendly). NEVER use `transition-all`.

## 3. React 19 (UI Components in `.tsx`)

- **Syntax:** Use JSX attributes (`className`, `htmlFor`, `onChange`).
- **Refs:** Pass `ref` as a normal prop. DO NOT use `forwardRef` (deprecated in React 19).
- **Forms:** Use React 19 native `<form action={submitAction}>` and `useActionState` / `useFormStatus` instead of manual `onSubmit` with `e.preventDefault()`.
- **Async:** Use the new `use()` API for resolving promises or context directly in render, instead of old `useEffect` chains.

## 4. Accessibility (A11y) & UX

- **Interactive Elements:** `<button>` for actions, `<a>` for navigation. No `<div onClick>`.
- **Focus:** Never use `outline-none` without replacing it via Tailwind (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- **ARIA:** Icon-only buttons MUST have `aria-label`. Decorative SVGs MUST have `aria-hidden="true"`.

## Output Format

Group by file. Use `file:line` format (VS Code clickable). Terse findings.
Provide a short code block with the exact fix using **2026 syntax**. No preamble.

### Example Output

src/components/ContactForm.tsx:15 - manual event preventDefault in React 19

```tsx
// FIX (React 19):
import { useActionState } from 'react';
// ...
<form action={submitAction} className="flex flex-col gap-4">
```

src/pages/index.astro:42 - React syntax in Astro file

```astro
// FIX (Astro):
<div class="bg-gray-900" onkeydown="handleKey()">
```
