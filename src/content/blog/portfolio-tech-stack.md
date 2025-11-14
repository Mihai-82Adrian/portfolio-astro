---
title: "A Modern Portfolio Architecture: Research Insights on Astro, Tailwind, and TypeScript"
description: "A research-focused breakdown of a performant and maintainable portfolio tech stack, exploring modern frontend patterns, performance strategies, and type-safe development workflows."
pubDate: 2025-11-13
updated: 2025-11-13
category: 'personal'
tags: ['astro', 'typescript', 'tailwind', 'frontend-architecture', 'performance', 'web-development']
heroImage: '/images/blog/tech-stack.webp'
heroAlt: 'Abstract illustration of interconnected web technologies and performance metrics'
draft: false
featured: true
author:
  name: 'Mihai Adrian Mateescu'
  email: 'mihai.mateescu@web.de'
  url: 'https://me-mateescu.de'
---

# A Modern Portfolio Architecture: Research Insights on Astro, Tailwind, and TypeScript

## Introduction: Research Framing

This article documents technical exploration and evaluation rather than claims of production mastery. The following represents findings from researching and building a personal portfolio site—a learning exercise that examined multiple frameworks, styling approaches, and type-safety strategies available in 2024–2025.

Throughout this text, observations are framed as research findings under controlled conditions, not universal absolutes. Performance metrics reflect specific test environments. Framework comparisons highlight strengths observed in available benchmarks, not definitive superiority. The goal is to explore architectural concepts, trade-offs, and evidence-based reasoning for technology choices in static-first, content-focused sites.

## Design Requirements: Research-Driven Objectives

Before evaluating frameworks, requirements were established by studying modern web best practices (2023–2025) from sources including Google Web Vitals guidance, W3C accessibility standards, and performance benchmarking research:

**Performance Targets**
- Largest Contentful Paint (LCP): <1.5s (research target; Google recommends <2.5s for "good")
- Cumulative Layout Shift (CLS): <0.1 (measure of visual stability)
- First Contentful Paint (FCP): <1.0s
- Initial JavaScript: <50KB (industry baseline for static sites)
- SEO: Full HTML crawlability, structured metadata

**Content & Type Safety**
- Markdown/MDX with syntax highlighting for Rust, Julia, Python, TypeScript
- Type-safe frontmatter validation at build time
- Multilingual UI support (English, German, Romanian) with English content
- RSS feed generation for subscribers
- Code Collections schema with Zod validation

**Developer Experience**
- TypeScript strict mode throughout
- Sub-3 second full builds in development
- Hot Module Replacement for instant feedback
- Reusable, accessible component library
- One-command deployment to global CDN

**Accessibility & Design System**
- WCAG 2.2 AA compliance (4.5:1 text contrast minimum; 7:1 for AAA)
- System-aware dark mode
- Eucalyptus green brand color (#6B8E6F) with validated contrast ratios
- Mobile-first responsive design
- Clear typographic hierarchy

## Framework Selection: Why Astro?

After evaluating Next.js App Router, SvelteKit, Nuxt 3, and Astro 5, Astro emerged as the best fit for a content-focused portfolio. The following explores why, grounded in architectural principles rather than claims of "decisiveness."

### 1. Zero JavaScript by Default: Architectural Foundation

Astro's core philosophy prioritizes **shipping HTML, not hydration overhead**. This isn't a minor difference—it's a fundamental architectural shift.

By default, Astro renders components to static HTML at build time. If a component has no interactive requirements, zero JavaScript is generated or shipped to the browser. This contrasts with frameworks like Next.js (App Router minimum ~80KB for routing and hydration) or SvelteKit (~30KB for client-side routing).

**How it works in practice:**

```astro
---
// This runs at build time only
import { getCollection } from 'astro:content';

const posts = await getCollection('blog', ({ data }) => !data.draft);
---

<section class="blog-list">
  {posts.map((post) => (
    <article>
      <h2>{post.data.title}</h2>
      <p>{post.data.description}</p>
      <time datetime={post.data.pubDate.toISOString()}>
        {post.data.pubDate.toLocaleDateString('en-US')}
      </time>
    </article>
  ))}
</section>
```

**Result:** Pure HTML output. No client-side JavaScript for rendering or hydration.

**Performance implication:** Research on Core Web Vitals indicates that reducing JavaScript, especially on initial page load, directly improves LCP and Total Blocking Time (TBT). Astro's default approach eliminates this tax for static content.

### 2. Content Collections API: Type-Safe Schema Validation

Astro's Content Collections enforce schema structure at build time using Zod, a TypeScript-first schema validation library. This means frontmatter errors are caught during the build, not at runtime.

**Example schema configuration:**

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.enum(['finance', 'ai-ml', 'fintech', 'personal']),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    heroImage: z.string().optional(),
  }),
});

export const collections = { blog };
```

**Type safety in use:**

```typescript
// src/pages/blog/[slug].astro
import { getCollection } from 'astro:content';

// posts is CollectionEntry<'blog'>[]
const posts = await getCollection('blog', ({ data }) => !data.draft);

// ✅ Full autocomplete and type checking
posts.forEach((post) => {
  console.log(post.data.title);        // string
  console.log(post.data.category);     // 'finance' | 'ai-ml' | 'fintech' | 'personal'
  console.log(post.data.tags);         // string[]
});
```

**Security consideration:** Zod's strict validation prevents malformed frontmatter from reaching rendering logic, reducing surface area for injection vulnerabilities.

### 3. Build-Time Syntax Highlighting with Shiki

Markdown in Astro is processed through Shiki, a syntax highlighter that runs at build time—not in the browser. This means:

- No client-side highlighting library (no runtime cost)
- Code blocks render as plain HTML with semantic highlighting classes
- Themes can be dual (light/dark) with CSS variables

**Configuration example:**

```javascript
// astro.config.mjs
export default defineConfig({
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      langs: ['typescript', 'python', 'rust', 'julia', 'bash'],
      wrap: true,
    },
  },
});
```

**Performance research note:** Build-time highlighting trades increased build time for zero runtime cost. For a site with 50–100 blog posts, Shiki adds ~2–5 seconds to build time but eliminates runtime blocking on every page load.

### 4. Islands Architecture: Selective Hydration

For interactive components, Astro uses an "islands" pattern: static HTML by default, with isolated interactive regions ("islands") that load JavaScript on demand.

**Client directives control hydration timing:**

```astro
---
import ThemeToggle from '@components/ThemeToggle.tsx';
import SearchBox from '@components/SearchBox.tsx';
---

<header>
  <!-- Static HTML, zero JS -->
  <nav class="navbar">
    <a href="/">Home</a>
    <a href="/blog">Blog</a>
  </nav>

  <!-- Island 1: Loads React + ThemeToggle on page load -->
  <ThemeToggle client:load />

  <!-- Island 2: Loads only when visible (Intersection Observer) -->
  <SearchBox client:visible />
</header>
```

**Client directive options:**

| Directive | When Hydration Starts | Best For | Performance Trade-off |
|-----------|---------------------|----------|----------------------|
| `client:load` | On page load | Navigation, CTAs | Immediate interactivity; increases LCP |
| `client:idle` | When browser is idle | Toggles, secondary widgets | Defers JS; improves LCP |
| `client:visible` | On viewport entry | Below-the-fold components | Minimal impact on initial load |
| `client:media` | When media query matches | Responsive UI | Query-dependent |
| `client:only` | Client-side only (no SSR) | Browser-dependent apps | No server rendering |

Each directive is a performance contract: developers explicitly declare when interactivity is needed, reducing accidental JS bloat.

### 5. Conceptual Comparison: Framework Performance Profiles

Research indicates different architectural approaches affect performance differently. This table compares frameworks on a content-focused portfolio (50 pages, 100 blog posts, minimal JavaScript):

| Aspect | Astro | Next.js (App) | SvelteKit | Nuxt 3 |
|--------|-------|--------------|-----------|--------|
| **Default JS** | 0KB (zero on static) | ~80KB (hydration) | ~30KB (routing) | ~95KB |
| **Static Generation** | Native (SSG) | Via `generate` | Native (SSG) | Via Nitro |
| **Build Strategy** | HTML first | React-first | Svelte-first | Vue-first |
| **CSS Approach** | Scoped + utility | CSS-in-JS option | Scoped CSS | Scoped + utility |
| **Content Collections** | Built-in Zod | Manual setup | Manual setup | Manual setup |
| **Code Splitting** | Automatic via Vite | Automatic | Automatic | Automatic |

**Disclaimer:** These metrics reflect controlled test scenarios with curated content. Real-world performance depends on implementation quality, third-party integrations, asset optimization, and hosting infrastructure. No framework "wins decisively"—each excels under different constraints.

## Styling: Tailwind CSS 3.4 and Utility-First Design

Tailwind was chosen for styling over CSS-in-JS, vanilla CSS, and other utility frameworks based on alignment with performance and developer experience goals in 2025.

### How Tailwind JIT Compilation Works

Tailwind 3.4 uses **Just-In-Time (JIT) compilation**: the build process scans template files for class names and generates only the CSS needed.

**Development mode:** Scans for classes; rebuilds incrementally when files change.
**Production mode:** Generates only used classes; typically 8–15KB gzipped.

```javascript
// tailwind.config.js
export default {
  content: [
    './src/**/*.{astro,jsx,tsx,js}',
    './src/components/**/*.{astro,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        eucalyptus: {
          50: '#F0F4F0',
          100: '#E1E9E1',
          200: '#C3D3C3',
          300: '#A5BDA5',
          400: '#87A787',
          500: '#6B8E6F',
          600: '#567258',
          700: '#425642',
          800: '#2E3A2D',
          900: '#1A1E19',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
```

### Contrast & Accessibility Compliance

Custom colors must satisfy WCAG 2.2 standards. The eucalyptus palette demonstrates:

- **eucalyptus-600 on white:** Approximately 5.2:1 contrast → **passes WCAG AA** (≥4.5:1) and **AAA** (≥7:1 only for large text ≥18pt)
- **eucalyptus-700 on white:** Approximately 8.1:1 contrast → **passes WCAG AAA** for all text sizes
- **eucalyptus-900 on white:** Approximately 14.2:1 contrast → **excellent contrast**

Validation can be performed with tools that measure luminance ratios or automated testing via `@axe-core/react` during development.

### Dark Mode Implementation

Tailwind supports system-aware dark mode with zero JavaScript:

```astro
<div class="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
  <h1 class="text-eucalyptus-600 dark:text-eucalyptus-400">Welcome</h1>
  <p class="text-gray-700 dark:text-gray-300">
    Your portfolio content here.
  </p>
</div>
```

The `prefers-color-scheme` media query handles switching automatically; no JavaScript required for initial theme.

### Typography Plugin & Content Styling

The `@tailwindcss/typography` plugin provides default prose styling for blog content, eliminating custom CSS for headings, lists, blockquotes, and code blocks:

```astro
---
const { Content } = await post.render();
---

<article class="prose dark:prose-invert prose-eucalyptus max-w-none">
  <Content />
</article>
```

The prose classes configure:
- Line-height and letter-spacing for readability
- Margin and padding scales
- Custom color tokens (via `prose-eucalyptus`)
- Dark mode variants via `dark:prose-invert`

## TypeScript: Type Safety Throughout

TypeScript strict mode (`strict: true` in `tsconfig.json`) enables multiple safety checks:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true
  }
}
```

### Benefits of Strict Mode

**`noImplicitAny`:** Prevents variables with inferred `any` type, forcing explicit typing:

```typescript
// ❌ Error without strict: parameter has implicit any type
function processContent(text) {
  return text.trim().split('\n');
}

// ✅ Fixed: explicit type
function processContent(text: string): string[] {
  return text.trim().split('\n');
}
```

**`strictNullChecks`:** Prevents null/undefined from being assigned to incompatible types:

```typescript
// ❌ Error with strict: Object is possibly 'null'
function getPostTitle(post: Post | null) {
  return post.title; // Property access on nullable type
}

// ✅ Fixed: explicit null check
function getPostTitle(post: Post | null) {
  return post?.title ?? 'Untitled';
}
```

### Discriminated Unions for Type Narrowing

Discriminated unions combine a shared "discriminant" property with TypeScript's type narrowing for robust state handling:

```typescript
interface LoadingState {
  status: 'loading';
}

interface SuccessState {
  status: 'success';
  data: Post[];
}

interface ErrorState {
  status: 'error';
  error: string;
}

type PostState = LoadingState | SuccessState | ErrorState;

// Type narrowing via discriminant
function renderPosts(state: PostState) {
  switch (state.status) {
    case 'loading':
      return <div>Loading...</div>;
    case 'success':
      // TypeScript knows state.data exists here
      return state.data.map(post => <PostCard key={post.id} post={post} />);
    case 'error':
      // TypeScript knows state.error exists here
      return <div>Error: {state.error}</div>;
  }
}
```

### Utility Functions: Content Processing

Utility functions must be defensive against malformed input, especially when processing user-generated content:

```typescript
// src/utils/readingTime.ts
export function calculateReadingTime(
  content: string,
  wordsPerMinute: number = 200
): number {
  if (!content || typeof content !== 'string') {
    return 0;
  }

  // Remove code blocks (preserve structure)
  let plainText = content.replace(/```[\s\S]*?```/g, '');
  plainText = plainText.replace(/`[^`]*`/g, '');

  // Remove HTML tags (safe for user-generated markdown)
  plainText = plainText.replace(/<[^>]*>/g, '');

  // Handle multiple spaces, tabs, newlines
  const words = plainText.trim().split(/\s+/).filter(w => w.length > 0);
  const minutes = Math.max(1, Math.ceil(words.length / wordsPerMinute));

  return minutes;
}

export function formatReadingTime(minutes: number, locale: string = 'en'): string {
  const labels: Record<string, (m: number) => string> = {
    en: (m) => `${m} min read`,
    de: (m) => `${m} Min. Lesezeit`,
    ro: (m) => `${m} min citit`,
  };

  const formatter = labels[locale] || labels.en;
  return formatter(minutes);
}
```

**Security note:** The regex pattern for code block removal (`/```[\s\S]*?```/g`) uses a non-greedy quantifier (`*?`) to avoid catastrophic backtracking—a potential ReDoS (Regular Expression Denial of Service) vector if not written carefully.

## Build & Deployment: Cloudflare Pages Workflow

Static site hosting on Cloudflare Pages provides:
- Global CDN with 250+ edge locations
- Automatic HTTPS
- Branch previews for pull requests
- Zero-configuration build integration

### GitHub Actions Workflow (Updated 2025)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: portfolio-site
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

**Workflow notes:**
- `actions/checkout@v4`: Latest stable version (v3 is deprecated)
- `actions/setup-node@v4`: Node 20 LTS is recommended for optimal ES2024 support
- `NODE_ENV=production`: Reduces bundle size for Tailwind and other build tools
- `cache: 'npm'`: Caches dependencies for faster subsequent runs
- `pages-action@v1`: Latest Cloudflare Pages action

**Security best practices:**
- Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Environments
- Use GitHub Environments to restrict production deploys to specific branches
- Never commit `dist/` directory; generate during CI/CD only

### Build Performance Characteristics

Research measurements (on standard GitHub Actions runner):

| Scenario | Time |
|----------|------|
| Cold build (50 pages, 100 posts) | ~45 seconds |
| Incremental rebuild (single post change) | <2 seconds |
| Dev server startup | ~2 seconds |
| Production CSS generation | ~8.2KB gzipped |

## Performance Optimization & Web Vitals

### Image Optimization with Astro

Astro's `<Image />` component automatically optimizes images at build time:

```astro
---
import { Image } from 'astro:assets';
import heroImg from '@assets/hero.jpg';
---

<!-- Automatically generates AVIF, WebP, original format -->
<Image
  src={heroImg}
  alt="Hero illustration: abstract web performance visualization"
  widths={[400, 800, 1200]}
  sizes="(max-width: 800px) 100vw, 800px"
  loading="lazy"
  format="webp"
/>
```

**Output:** Astro generates multiple formats and sizes:
- `hero-800w.avif` (modern browsers, best compression)
- `hero-800w.webp` (fallback for older browsers)
- `hero-800w.jpg` (final fallback)

Each format is optimized separately with intelligent compression.

**Accessibility consideration:** Alt text should be descriptive and concise. For hero images, consider: "Hero illustration: [what is shown and its relevance]" rather than generic descriptions.

### Font Loading Strategy

Fonts significantly impact LCP (Largest Contentful Paint). Astro recommends:

```astro
<head>
  <!-- Preload critical font (variable font recommended) -->
  <link
    rel="preload"
    href="/fonts/inter-var.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />

  <!-- font-display: swap prevents FOIT (Flash of Invisible Text) -->
  <style is:global>
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/inter-var.woff2') format('woff2-variations');
      font-display: swap;
      font-weight: 100 900;
    }
  </style>
</head>
```

**Key properties:**
- `rel="preload"`: Requests font early, before CSS parsing
- `crossorigin`: Required for fonts, even from same origin
- `font-display: swap`: Uses system font initially, swaps when web font loads (avoids layout shift)

### Code Splitting & Dynamic Imports

Astro uses Vite's build system, which automatically code-splits based on dynamic imports:

```astro
---
// Only loaded on pages using this component
import SearchWidget from '@components/SearchWidget.tsx';
---

<!-- Island with client:idle hydration -->
<SearchWidget client:idle />
```

Vite analysis:
- Static imports are bundled with the entry chunk
- Dynamic imports become separate chunks
- Each island gets its own chunk if not tree-shakeable
- Preload relationships are automatically inserted

**Result:** Homepage doesn't load search widget JavaScript; only pages using it do.

### Content Security Policy (CSP) Recommendations

Static sites don't inherently need JavaScript execution, so a strict CSP is practical:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none';
```

**Rationale:**
- `default-src 'self'`: Only resources from same origin
- `script-src 'self'`: Only local scripts (no inline, no external)
- `style-src 'unsafe-inline'`: Scoped Astro styles use inline `<style>` tags
- `img-src 'self' data: https:`: Local, embedded, or HTTPS remote images
- `connect-src 'none'`: No API calls (for purely static sites)

**Note:** For sites with third-party integrations (analytics, forms, maps), CSP must be loosened accordingly.

## Research Findings: Web Vitals in Controlled Scenarios

The following measurements are from local testing with specific configurations and should not be interpreted as universal performance claims.

### Testing Methodology

- **Device:** Simulated Nexus 5X (mobile)
- **Network:** Chrome DevTools throttling (Slow 4G)
- **Cache:** Cleared before each run
- **Tool:** Chrome Lighthouse v11.4
- **Runs:** 3 iterations; median reported

### Observed Results

**Lighthouse Scores (mobile):**
- Performance: 100
- Accessibility: 100
- Best Practices: 100
- SEO: 100

**Core Web Vitals:**
- **LCP:** 0.58s (median; target <2.5s)
- **INP:** 18ms (median; target <200ms)
- **CLS:** 0.002 (median; target <0.1)

**Asset Sizes:**
- Initial HTML: 14.2KB gzipped
- CSS (Tailwind): 7.8KB gzipped
- JavaScript (React + theme toggle): 11.2KB gzipped
- **Total:** ~33KB for homepage

### Caveats & Variability

Lighthouse scores fluctuate 5–15 points between runs due to:
- CPU throttling variance
- Network simulation accuracy
- Cache state on CDN
- Third-party script performance (if any)

These metrics illustrate *what is achievable* with a well-optimized Astro stack in a controlled environment. Real-world performance depends on:
- Hosting latency (TTFB—Time to First Byte)
- User device capabilities
- Network conditions
- Additional integrations (analytics, ads, embedded content)

**Recommendation:** Validate performance with your own testing infrastructure and real user monitoring (RUM) data before making claims in production environments.

## Lessons Learned: Research-Informed Insights

### What Aligned Well with Initial Goals

1. **Zero-JS default philosophy:** Eliminated hydration overhead entirely for static content, directly improving LCP and TBT measurements.

2. **Content Collections with Zod:** Build-time schema validation caught frontmatter errors before rendering, increasing confidence in data structure.

3. **Tailwind JIT in development:** Fast incremental rebuilds kept development feedback loop responsive (<1 second for style changes).

4. **TypeScript strict mode:** Early error detection in utility functions and component props prevented runtime bugs in production builds.

5. **Cloudflare Pages:** Global CDN reduced TTFB (Time to First Byte) to 50–150ms across geographic regions.

### Areas Requiring Adjustment

1. **Shiki build time:** Syntax highlighting added ~3 seconds to full builds. Implemented caching strategy (Shiki highlighter instances) to reduce incremental builds to <500ms.

2. **Image workflow:** Batch optimization of dozens of images was manual. Evaluated tools like ImageMagick and Sharp for automation; not yet integrated.

3. **Search functionality:** Static sites lack native search. Researched Pagefind (build-time index generation) as lightweight alternative to client-side libraries.

4. **Analytics:** Google Analytics adds ~50KB JavaScript. Evaluated privacy-focused alternatives (Plausible, Fathom) for future iteration.

## Production Readiness Checklist

Before deploying an Astro + Tailwind + TypeScript site to production:

### Configuration & Build
- [ ] `astro check` passes without errors
- [ ] `tsc --noEmit` passes (TypeScript strict mode)
- [ ] `npm run build` completes in <60 seconds
- [ ] `dist/` contains only minified, hashed assets
- [ ] `NODE_ENV=production` during builds

### Performance
- [ ] LCP <2.5s on 4G throttling (mobile)
- [ ] CLS <0.1 (measure after all fonts load)
- [ ] CSS bundle <20KB gzipped
- [ ] Initial HTML <30KB gzipped
- [ ] Zero layout shifts during font loading

### Accessibility
- [ ] Color contrast ≥4.5:1 for all text (WCAG AA)
- [ ] Interactive elements keyboard-accessible
- [ ] Form labels associated with inputs
- [ ] Images have descriptive alt text
- [ ] Focus styles visible with `:focus-visible`

### Security
- [ ] CSP header configured and tested
- [ ] No inline event handlers (`onclick`, `onload`)
- [ ] User-generated markdown sanitized with DOMPurify or similar
- [ ] API tokens stored in environment variables
- [ ] GitHub Actions secrets properly scoped

### SEO & Content
- [ ] Frontmatter schema validated for all posts
- [ ] Meta descriptions provided (50–160 characters)
- [ ] RSS feed valid (test with feed validator)
- [ ] Sitemap generated and submitted
- [ ] Open Graph tags for social sharing

### Deployment
- [ ] GitHub Actions workflow tested on PR branch
- [ ] Cloudflare Pages project configured
- [ ] Environment variables set (API token, account ID)
- [ ] Production branch protection enabled
- [ ] Build logs reviewed for warnings

## Glossary: Key Concepts

**SSG (Static Site Generation):** HTML generated at build time; no server rendering needed.

**Islands Architecture:** Static HTML with isolated interactive regions ("islands") that load framework code only when needed.

**Hydration:** Process of attaching JavaScript interactivity to pre-rendered HTML from the server.

**Code Splitting:** Bundler divides code into separate chunks; browsers load chunks on demand via dynamic imports.

**JIT (Just-In-Time) Compilation:** Tailwind generates CSS for only the classes actually used, reducing bundle size.

**LCP (Largest Contentful Paint):** Time until the largest visible element loads; Google target <2.5s.

**CLS (Cumulative Layout Shift):** Measure of unexpected layout movement; target <0.1.

**TBT (Total Blocking Time):** Time main thread is blocked; target <200ms.

**Content Collections:** Astro's system for organizing and validating structured content (blog posts, documentation).

**Discriminated Union:** TypeScript pattern combining shared "discriminant" property with union types for robust type narrowing.

**Strict Mode:** TypeScript compiler mode enabling maximum type safety (`strict: true`).

## Conclusion

The Astro + Tailwind + TypeScript stack demonstrated alignment with research-informed performance and type-safety objectives for a portfolio site. The architecture prioritizes HTML-first delivery, reducing JavaScript overhead, and enforces type safety at build time.

This approach excels for content-focused websites where performance and maintainability are priorities. The trade-offs—higher build times for Shiki highlighting, more verbose TypeScript annotations—were acceptable given the performance gains and developer confidence gained from strict type checking.

This remains a learning project. Patterns observed here may not generalize to e-commerce platforms, real-time dashboards, or other interactive applications where different architectural choices would be more suitable.

---

**Explore the source code:** Available on GitHub at [github.com/Mihai-82Adrian](https://github.com/Mihai-82Adrian)

**Questions or feedback?** Share thoughts on architecture, performance optimization, or type-safety strategies for modern web development.
