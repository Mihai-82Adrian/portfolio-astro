# Portfolio Astro - Mihai Adrian Mateescu

Professional portfolio website built with Astro, featuring blog, projects showcase, and AI/ML content.

## 🎨 Design System

- **Color Palette**: Warm Eucalyptus theme with sophisticated green/teal tones
- **Typography**: Geist/Inter for modern professional look
- **Dark Mode**: Full support with theme toggle
- **Accessibility**: WCAG 2.2 AAA compliance target

## 🚀 Tech Stack

- **Framework**: Astro 5.x
- **Styling**: Tailwind CSS 4.x
- **Content**: Markdown with Shiki syntax highlighting
- **Deployment**: Cloudflare Pages (planned)
- **Comments**: Giscus (GitHub Discussions)

## 📦 Setup

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

## 🔧 GitHub Discussions Setup (Required for Comments)

**IMPORTANT**: To enable blog comments with Giscus, you need to:

1. Go to repository **Settings** → **General**
2. Scroll down to **Features** section
3. Check ✅ **Discussions**
4. Click **Set up discussions**
5. Use the default welcome post or customize it

Once enabled, get your Giscus configuration at: https://giscus.app

You'll need:
- Repository: `Mihai-82Adrian/portfolio-astro`
- Mapping: `pathname` (recommended)
- Theme: Match your site's theme (light/dark)

## 📝 Content Structure

```text
src/
├── content/
│   ├── blog/           # Blog posts (Markdown)
│   └── projects/       # Project showcases
├── pages/
│   ├── blog/          # Blog pages (DE main)
│   ├── projects/      # Projects pages (DE main)
│   ├── en/            # English translations
│   └── ro/            # Romanian translations
├── components/
│   ├── blog/          # Blog-specific components
│   ├── layout/        # Layout components
│   ├── projects/      # Project components
│   └── ui/            # UI components
└── styles/            # Global styles
```

## 🌍 Multilingual Strategy

- **Primary**: German (DE) at `/`
- **English**: `/en/` for translated pages
- **Romanian**: `/ro/` for translated pages
- **Note**: Blog and Projects are English-only content
  - `/en/blog/*` and `/ro/blog/*` redirect to `/blog/*`
  - `/en/projects/*` and `/ro/projects/*` redirect to `/projects/*`

## 📊 Features Implemented

- ✅ Responsive design with mobile-first approach
- ✅ Blog system with Shiki syntax highlighting (Rust, Julia, Python, TypeScript, etc.)
- ✅ Project portfolio with GitHub integration widget
- ✅ Interactive career timeline (13 positions, 2003-2024)
- ✅ Skills matrix visualization
- ✅ Reading time estimates
- ✅ Related posts algorithm (category + tags + recency scoring)
- ✅ Social sharing buttons (Twitter, LinkedIn, Email, Copy, Web Share API)
- ✅ Dark/light mode with system preference detection
- ✅ Multi-language consolidation with 301 redirects
- 🔄 Comments system with Giscus (in progress)
- 🔄 Newsletter integration (planned)
- 🔄 Table of contents with scroll-spy (planned)
- 🔄 Math equations with KaTeX (planned)

## 🎯 Roadmap Progress

Based on the Portfolio Refactor Research document:

- ✅ **Phase 1**: Foundation (Weeks 1-2) - Complete
- ✅ **Phase 2**: Core Pages (Weeks 3-4) - Complete
- 🔄 **Phase 3**: Blog & Content (Weeks 5-6) - 70% Complete
  - ✅ Blog system, syntax highlighting, reading time
  - ✅ Related posts, social sharing
  - 🔄 Comments system (current task)
  - ⏳ Newsletter, Table of contents, Math equations
- ⏳ **Phase 4**: Polish & Optimization (Weeks 7-8)
- ⏳ **Phase 5**: Deployment & Launch (Week 9)

## 🔗 Links

- **Website**: https://me-mateescu.de
- **LinkedIn**: [Mihai Adrian Mateescu](https://linkedin.com/in/mihai-adrian-mateescu)
- **GitHub**: [@Mihai-82Adrian](https://github.com/Mihai-82Adrian)
- **Email**: mihai.mateescu82@gmail.com

## 📄 License

Copyright © 2025 Mihai Adrian Mateescu. All rights reserved.

## 🚀 Performance Targets

- Lighthouse Score: 95+ (all categories)
- Load Time: < 2 seconds
- First Contentful Paint: < 1 second
- Accessibility: WCAG 2.2 AAA compliance

---

**Built with ❤️ using Astro**
