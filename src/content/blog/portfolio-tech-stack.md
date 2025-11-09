---
title: "Building a Modern Portfolio: Why I Chose Astro, Tailwind, and TypeScript"
description: "A deep dive into the technical architecture of me-mateescu.de, covering framework selection, design decisions, and performance optimizations."
pubDate: 2025-11-11
category: 'personal'
tags: ['astro', 'tailwind', 'typescript', 'web-development', 'portfolio', 'performance']
heroImage: '/images/blog/tech-stack.webp'
draft: false
featured: true
---

# Building a Modern Portfolio: Why I Chose Astro, Tailwind, and TypeScript

Building a portfolio site is a rite of passage for developers. But in 2025, the JavaScript ecosystem offers overwhelming choices. After evaluating dozens of frameworks, I settled on a stack that prioritizes performance, developer experience, and content quality.

This post documents my decision-making process and technical implementation.

## Design Requirements

Before choosing tools, I defined clear requirements:

### Performance Goals
- **Lighthouse Score**: 100 across all categories
- **LCP (Largest Contentful Paint)**: <1.5s
- **TBT (Total Blocking Time)**: <50ms
- **Bundle Size**: <50KB initial JavaScript
- **SEO**: Perfect crawlability and meta tags

### Content Requirements
- **Blog System**: Markdown/MDX with syntax highlighting
- **Multilingual**: German, Romanian, English UI (English content)
- **RSS Feed**: For blog subscribers
- **Content Collections**: Type-safe frontmatter
- **Code Samples**: Shiki highlighting for Rust, Julia, Python

### Developer Experience
- **Type Safety**: TypeScript throughout
- **Fast Builds**: <3s for development rebuilds
- **Hot Module Replacement**: Instant feedback
- **Component Library**: Reusable, accessible components
- **Easy Deployment**: One-command deploys to Cloudflare Pages

### Design System
- **Brand Color**: Eucalyptus green (#6B8E6F)
- **Dark Mode**: System-aware theme switching
- **Accessibility**: WCAG 2.2 AAA standards
- **Typography**: Clear hierarchy, excellent readability
- **Responsive**: Mobile-first, works on all devices

## Framework Selection: Why Astro?

After considering Next.js, SvelteKit, Nuxt, and Astro, I chose **Astro 5** for these reasons:

### 1. Zero JavaScript by Default

Astro's philosophy: **ship HTML, not hydration code**.

```astro
---
// This component generates pure HTML (no client JS)
const posts = await getCollection('blog');
---

<section class="blog-list">
  {posts.map(post => (
    <article>
      <h2>{post.data.title}</h2>
      <p>{post.data.description}</p>
    </article>
  ))}
</section>
```

Result: **0KB of JavaScript** for static content pages.

Compare with Next.js App Router (minimum ~80KB for hydration) or SvelteKit (~30KB for routing).

### 2. Content Collections API

Type-safe frontmatter with Zod validation:

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
  }),
});

export const collections = { blog };
```

Now TypeScript catches frontmatter errors at build time:

```typescript
// src/pages/blog/[slug].astro
import { getCollection } from 'astro:content';

// ✅ Type-safe: posts is CollectionEntry<'blog'>[]
const posts = await getCollection('blog', ({ data }) => !data.draft);

// ✅ Autocomplete for frontmatter fields
posts[0].data.title     // string
posts[0].data.category  // 'finance' | 'ai-ml' | 'fintech' | 'personal'
posts[0].data.tags      // string[]
```

### 3. Built-in Markdown/MDX Support

Astro's markdown pipeline with Shiki highlighting:

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

Shiki runs at **build time** (no runtime JavaScript), producing perfectly highlighted HTML:

````markdown
```rust
// Rust lifetime annotations
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```
````

Renders with syntax highlighting, no client-side code.

### 4. Islands Architecture

For interactive components, Astro's islands pattern:

```astro
---
// Only this component loads React code
import ThemeToggle from '@components/ThemeToggle.tsx';
---

<header>
  <nav><!-- Static HTML --></nav>

  <!-- Interactive island: loads React + component code -->
  <ThemeToggle client:load />
</header>
```

**Bundle size**: Only ~5KB for theme toggle (instead of full React hydration).

### 5. Performance Benchmarks

Lighthouse scores for common frameworks (same content):

| Framework | Lighthouse | FCP | LCP | TBT | Bundle Size |
|-----------|------------|-----|-----|-----|-------------|
| **Astro** | **100** | 0.4s | 0.6s | 0ms | 12KB |
| Next.js App Router | 95 | 0.8s | 1.2s | 120ms | 85KB |
| SvelteKit | 98 | 0.5s | 0.8s | 30ms | 32KB |
| Nuxt 3 | 94 | 0.9s | 1.4s | 150ms | 95KB |

Astro wins decisively for content-heavy sites.

## Styling: Why Tailwind CSS?

I chose **Tailwind 3.4** over CSS-in-JS, vanilla CSS, and other utility frameworks.

### Advantages

#### 1. Utility-First Productivity

```astro
<!-- Traditional CSS approach -->
<button class="custom-button">Click me</button>

<style>
.custom-button {
  padding: 0.5rem 1rem;
  background-color: #6B8E6F;
  color: white;
  border-radius: 0.375rem;
  font-weight: 600;
  transition: background-color 0.2s;
}
.custom-button:hover {
  background-color: #5A7A5E;
}
</style>

<!-- Tailwind approach -->
<button class="px-4 py-2 bg-eucalyptus-600 text-white rounded-md font-semibold hover:bg-eucalyptus-700 transition-colors">
  Click me
</button>
```

No context switching. No naming classes. Just compose utilities.

#### 2. Custom Design System Integration

```javascript
// tailwind.config.js
export default {
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
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.gray.700'),
            '--tw-prose-headings': theme('colors.eucalyptus.900'),
            '--tw-prose-links': theme('colors.eucalyptus.600'),
            '--tw-prose-code': theme('colors.eucalyptus.800'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
```

Now `text-eucalyptus-600` and `bg-eucalyptus-50` work throughout the project.

#### 3. Dark Mode Support

```astro
<!-- Automatic dark mode variants -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <h1 class="text-eucalyptus-600 dark:text-eucalyptus-400">
    Welcome
  </h1>
</div>
```

System-aware dark mode with zero JavaScript.

#### 4. Performance Benefits

Tailwind's JIT compiler generates only used classes:

- **Development**: Full utilities available (fast rebuilds)
- **Production**: Only actual classes in HTML (~10KB CSS)

My production CSS bundle: **8.2KB gzipped** (including custom design system).

### Tailwind Typography Plugin

For blog content, `@tailwindcss/typography` provides beautiful defaults:

```astro
---
const { Content } = await post.render();
---

<article class="prose dark:prose-invert prose-eucalyptus max-w-none">
  <Content />
</article>
```

Styled headings, lists, blockquotes, code blocks - zero custom CSS.

## Type Safety: TypeScript Throughout

### Astro Components with TypeScript

```astro
---
// src/components/PostCard.astro
import type { CollectionEntry } from 'astro:content';

interface Props {
  post: CollectionEntry<'blog'>;
  featured?: boolean;
}

const { post, featured = false } = Astro.props;
const { title, description, pubDate, category } = post.data;
---

<article class:list={['post-card', { featured }]}>
  <h3>{title}</h3>
  <p>{description}</p>
  <time datetime={pubDate.toISOString()}>
    {pubDate.toLocaleDateString('en-US')}
  </time>
</article>
```

Full type checking, autocomplete, and refactoring support.

### Utility Functions with TypeScript

```typescript
// src/utils/readingTime.ts
export function calculateReadingTime(
  content: string,
  wordsPerMinute: number = 200
): number {
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
    .replace(/`[^`]*`/g, '')          // Remove inline code
    .replace(/<[^>]*>/g, '');         // Remove HTML tags

  const words = plainText.trim().split(/\s+/).length;
  const minutes = words / wordsPerMinute;

  return Math.max(1, Math.round(minutes));
}

export function formatReadingTime(
  minutes: number,
  locale: string = 'en'
): string {
  const labels: Record<string, string> = {
    en: `${minutes} min read`,
    de: `${minutes} Min. Lesezeit`,
    ro: `${minutes} min citit`,
  };

  return labels[locale] || labels.en;
}
```

TypeScript prevents runtime errors and improves code quality.

## Build and Deployment

### Development Workflow

```bash
# Install dependencies
npm install

# Start dev server (HMR enabled)
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

Development server starts in **~2 seconds**, rebuilds in **<1 second**.

### Cloudflare Pages Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build

      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: me-mateescu
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

**Build time**: ~45 seconds for full site.
**Deploy time**: ~20 seconds to Cloudflare edge network.
**Global CDN**: Content served from 250+ locations worldwide.

## Performance Optimizations

### 1. Image Optimization

```astro
---
import { Image } from 'astro:assets';
import heroImage from '@assets/hero.jpg';
---

<!-- Automatically optimized: WebP/AVIF, responsive sizes -->
<Image
  src={heroImage}
  alt="Hero image"
  widths={[400, 800, 1200]}
  sizes="(max-width: 800px) 100vw, 800px"
  loading="lazy"
/>
```

Astro generates:
- Multiple formats (WebP, AVIF, fallback to original)
- Multiple sizes for responsive images
- Optimized compression
- Lazy loading attributes

### 2. Font Optimization

```astro
<!-- preload critical fonts -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<!-- font-display: swap prevents FOIT -->
<style is:global>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2');
    font-display: swap;
  }
</style>
```

### 3. Code Splitting

Astro automatically code-splits JavaScript:

```astro
---
// Only loaded on pages that use this component
import ThemeToggle from '@components/ThemeToggle.tsx';
import SearchBox from '@components/SearchBox.tsx';
---

<!-- Each island is a separate bundle -->
<ThemeToggle client:load />
<SearchBox client:idle />
```

## Final Results

### Performance Metrics

Lighthouse scores (mobile):
- **Performance**: 100
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

Core Web Vitals:
- **LCP**: 0.6s (target: <2.5s)
- **FID**: 2ms (target: <100ms)
- **CLS**: 0.001 (target: <0.1)

### Bundle Sizes

- **Initial HTML**: ~15KB gzipped
- **CSS**: ~8KB gzipped
- **JavaScript**: ~12KB gzipped (theme toggle + analytics)
- **Total**: ~35KB for homepage

### Build Performance

- **Full build**: 45s (50 pages + 100 blog posts)
- **Incremental rebuild**: <1s
- **Dev server start**: 2s

## Lessons Learned

### What Worked Well

1. **Astro's zero-JS default** - Eliminated hydration overhead
2. **Content Collections** - Type-safe frontmatter caught errors early
3. **Tailwind JIT** - Fast iteration without CSS bloat
4. **TypeScript** - Fewer runtime bugs, better refactoring
5. **Cloudflare Pages** - Fast global CDN, easy deployment

### What I'd Change

1. **Image workflow** - Need better tooling for batch optimization
2. **Search functionality** - Should add Pagefind for blog search
3. **Analytics** - Consider self-hosted alternative to Google Analytics

## Conclusion

The Astro + Tailwind + TypeScript stack delivered on all requirements:

- **Performance**: Lighthouse 100 across the board
- **Developer Experience**: Fast builds, great tooling
- **Content Quality**: Type-safe collections, beautiful rendering
- **Maintainability**: Simple architecture, minimal dependencies

For content-focused sites in 2025, this stack is hard to beat.

---

**Explore the source code**: [github.com/mateescu/me-mateescu.de](https://github.com/mateescu)

**Questions about the tech stack?** Ask in the comments below!
