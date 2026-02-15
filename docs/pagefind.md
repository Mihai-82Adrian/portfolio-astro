# Pagefind Indexing Strategy

## Overview

This project uses [Pagefind](https://pagefind.app/) for static search. The indexing process is optimized to be deterministic and noise-free.

## Indexing Scope

We use a **whitelist** approach for indexing content. Only pages containing the `data-pagefind-body` attribute are indexed.

### Included Content

- **Main Pages**: About, Experience, Education, etc. (via `BaseLayout`)
- **Blog Posts**: All individual articles (via `BaseLayout`)
- **Project Pages**: Individual project case studies (via `BaseLayout`)

### Excluded Content

- **Taxonomy Pages**: `/blog/category/*`, `/blog/tag/*` (Do not use `BaseLayout` or explicitly lack the attribute)
- **Redirects**: HTML redirect pages are disabled (see below)
- **System Pages**: 404, RSS feeds

## Redirect Handling

We use **Strategy 1: Hosting-Layer Redirects**.

- **Astro Config**: `build.redirects = false` in `astro.config.mjs`.
- **Mechanism**: We rely on the `public/_redirects` file (Netlify/Cloudflare format) to handle routing.
- **Why**: This prevents Astro from generating minimal HTML files for redirects (e.g., `/en/blog/index.html` containing only a meta refresh). These files previously caused Pagefind warnings ("pages without <html> element") and polluted the build output.

## Verification

To verify the search index:

```bash
npm run build
```

Expected output:

- No warnings about "pages without <html> element".
- Indexed page count should match the number of content pages (approx. 30-40), not the full build count (60+).
