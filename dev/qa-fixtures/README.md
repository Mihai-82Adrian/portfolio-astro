# QA fixtures (not routed)

These `.astro` files are manual design-system/component/blog-rendering references kept for
developer use only. They live outside `src/pages` on purpose: Astro's file-based router only scans
`src/pages`, so nothing here ever becomes a public route, appears in the sitemap, or gets indexed.

Moved out of `src/pages/design-system-test.astro` (+ `en`/`ro` copies), `src/pages/test/components.astro`,
and `src/pages/test/blog-system.astro` in Phase 2D-C Wave 1 (`DEBT-01` /
`PHASE_2D_B_PRODUCT_DEBT_REGISTER.md`) — those routes had no `robots.txt` disallow and no
consistent `noindex`, so they were reachable and indexable by search engines despite being
internal-only pages.

To use one locally, copy it back into `src/pages/` temporarily; do not restore it in place, since
that reintroduces the same crawlable-surface defect.
