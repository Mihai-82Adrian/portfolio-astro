# Portfolio Astro - Project Setup

## Project Overview

Astro 5.x static site generator project for me-mateescu.de portfolio refactoring.

**Status**: Phase 1, Week 1 - Foundation Complete
**Created**: 2025-11-07
**Framework**: Astro 5.15.4 with TypeScript strict mode

## Installation

```bash
npm install
```

## Available Scripts

- `npm run dev` - Start development server (<http://localhost:4321>)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run check` - Run TypeScript type checking

## Directory Structure

```structure
portfolio-astro/
├── public/                  # Static assets (no processing)
│   └── images/             # Image assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── layout/        # Header, Footer, Navigation
│   │   ├── blog/          # PostCard, PostList, PostHeader
│   │   ├── ui/            # Button, Card, Badge
│   │   └── mdx/           # Custom MDX components
│   ├── layouts/           # Page layout templates
│   ├── pages/             # File-based routing
│   ├── content/           # Content collections
│   │   ├── config.ts      # Zod schemas for content validation
│   │   └── blog/          # Blog posts (.md, .mdx)
│   ├── styles/            # Global styles
│   └── utils/             # Helper functions
├── astro.config.mjs       # Astro configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## Installed Dependencies

### Production

- `astro@5.15.4` - Core framework

### Development

- `@astrojs/check@0.9.5` - TypeScript type checking
- `typescript@5.9.3` - TypeScript compiler
- `@types/node@24.10.0` - Node.js type definitions

## Configuration

### Astro Configuration (`astro.config.mjs`)

- **Site URL**: <https://me-mateescu.de>
- **Output**: static (for Cloudflare Pages)
- **Build Directory**: ./dist
- **Features**:
  - Automatic CSS inlining for small files
  - CSS code splitting by route
  - Directory-based URL structure

### TypeScript Configuration (`tsconfig.json`)

- **Mode**: Strict mode enabled
- **Path Aliases**:
  - `@components/*` → `src/components/*`
  - `@layouts/*` → `src/layouts/*`
  - `@utils/*` → `src/utils/*`
  - `@styles/*` → `src/styles/*`
  - `@content/*` → `src/content/*`

### Content Collections

- **Blog Collection**: Configured with Zod schema
- **Schema Fields**: title, description, pubDate, updatedDate, tags, draft, featured, image

## Build Output

- **Total Size**: ~1 KB (minimal starter)
- **Generated Files**: index.html, favicon.svg
- **Build Time**: ~800ms

## Next Steps

### Immediate (Phase 1, Week 1)

1. Add Tailwind CSS 4.x integration
2. Configure design system (colors, typography, spacing)
3. Create base layout components
4. Set up dark mode support

### Phase 1, Week 2

1. Create UI component library
2. Build blog components
3. Set up MDX processing
4. Add responsive navigation

### Phase 1, Week 3-4

1. Migrate blog content from legacy HTML
2. Create multilingual pages (DE/EN/RO)
3. Optimize images with Astro's built-in service
4. Set up sitemap and SEO

## Testing Checklist

✅ TypeScript compiles without errors (`npm run check`)
✅ Build succeeds (`npm run build`)
✅ Dev server runs (`npm run dev`)
✅ No console errors or warnings
✅ Clean directory structure
✅ Content Collections configured

## Performance Targets

- **Initial JS**: <100KB (target: <50KB)
- **LCP**: <2.5s
- **FID**: <100ms
- **CLS**: <0.1
- **Lighthouse Score**: 95+

## Known Issues

None - project successfully initialized.

## Notes

- Node.js v22.17.0 and npm 11.4.2 confirmed working
- Git repository initialized
- Ready for Tailwind CSS integration
- Legacy HTML portfolio files remain in parent directory for reference
