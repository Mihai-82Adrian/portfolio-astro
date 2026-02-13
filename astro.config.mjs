// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Shared Markdown pipeline (MDX will extend this by default)
const remarkPlugins = [remarkMath];
const rehypePlugins = [
  [
    rehypeKatex,
    {
      strict: false,
      throwOnError: false,
      trust: false,
      output: 'html',
    },
  ],
];

export default defineConfig({
  site: 'https://me-mateescu.de',
  output: 'static',
  outDir: './dist',

  redirects: {
    // Consolidate Blog and Projects to main (DE) version
    '/en/blog': '/blog',
    '/en/blog/*': '/blog/:splat',
    '/ro/blog': '/blog',
    '/ro/blog/*': '/blog/:splat',
    '/en/projects': '/projects',
    '/en/projects/*': '/projects/:splat',
    '/ro/projects': '/projects',
    '/ro/projects/*': '/projects/:splat',
  },

  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),

    // MDX inherits the `markdown` config (remark/rehype, gfm, etc.) by default
    mdx(),

    sitemap({
      i18n: {
        defaultLocale: 'de',
        locales: {
          de: 'de-DE',
          en: 'en-US',
          ro: 'ro-RO',
        },
      },
      filter: (page) =>
        !page.includes('/test/') &&
        !page.includes('/design-system-test') &&
        !page.includes('/draft'),
      customPages: [
        'https://me-mateescu.de/',
        'https://me-mateescu.de/en/',
        'https://me-mateescu.de/ro/',
      ],
      serialize(item) {
        const url = item.url;

        // Homepage - exact matches only
        if (
          url === 'https://me-mateescu.de/' ||
          url === 'https://me-mateescu.de/en/' ||
          url === 'https://me-mateescu.de/ro/'
        ) {
          item.priority = 1.0;
          return item;
        }

        // Main pages
        if (url.match(/\/(about|experience|education|certifications)\/?$/)) {
          item.priority = 0.8;
          return item;
        }

        // Projects
        if (url.match(/\/projects\/?$/)) {
          item.priority = 0.9;
          return item;
        }
        if (url.match(/\/projects\/(gds|genesis|profitminds)\/?$/)) {
          item.priority = 0.85;
          return item;
        }

        // Blog
        if (url.match(/\/blog\/?$/)) {
          item.priority = 0.7;
          return item;
        }
        if (
          url.includes('/blog/') &&
          !url.includes('/category/') &&
          !url.includes('/tag/')
        ) {
          item.priority = 0.7;
          return item;
        }
        if (url.includes('/blog/category/') || url.includes('/blog/tag/')) {
          item.priority = 0.5;
          return item;
        }

        // Everything else
        item.priority = 0.4;
        return item;
      },
    }),
  ],

  markdown: {
    // ✅ Use real imports, not "remark-math"/"rehype-katex" strings
    remarkPlugins,
    rehypePlugins,

    // Astro has these enabled by default, but keeping explicit is fine
    gfm: true,
    smartypants: true,

    // Shiki themes
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },

  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
    assets: '_astro',
    redirects: false,
  },

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },

  compressHTML: true,

  vite: {
    build: {
      cssCodeSplit: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
  },
});