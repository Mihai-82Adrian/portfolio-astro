// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { unified } from '@astrojs/markdown-remark';

import svelte from '@astrojs/svelte';
import { calculateReadingTime } from './src/utils/readingTime.ts';
import fs from 'node:fs';

// Custom Remark Plugin for Reading Time
/**
 * @returns {(tree: any, file: any) => void}
 */
function remarkReadingTime() {
  return function (tree, file) {
    const readingTime = calculateReadingTime(String(file.value));
    if (!file.data.astro) file.data.astro = {};
    if (!file.data.astro.frontmatter) file.data.astro.frontmatter = {};
    file.data.astro.frontmatter.readingTime = readingTime;
  };
}

// Shared Markdown pipeline (MDX will extend this by default)
const remarkPlugins = [remarkMath, remarkReadingTime];
/** @type {NonNullable<import('astro').AstroUserConfig['markdown']>['rehypePlugins']} */
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

const NOINDEX_SITEMAP_PATHS = new Set([
  '/en/datenschutz/',
  '/ro/datenschutz/',
  '/en/impressum/',
  '/ro/impressum/',
  '/sample-struktur-pruefen/danke/',
  '/en/sample-structure-review/thank-you/',
  '/ro/revizuire-structura-esantion/multumesc/',
  '/404/',
]);

const CUSTOM_I18N_SITEMAP_LINKS = new Map([
  [
    'https://me-mateescu.de/datenaufbereitung-fuer-ki/',
    [
      { lang: 'de-DE', url: 'https://me-mateescu.de/datenaufbereitung-fuer-ki/' },
      { lang: 'en-US', url: 'https://me-mateescu.de/en/ai-data-preparation/' },
      { lang: 'ro-RO', url: 'https://me-mateescu.de/ro/pregatire-date-ai/' },
    ],
  ],
  [
    'https://me-mateescu.de/en/ai-data-preparation/',
    [
      { lang: 'de-DE', url: 'https://me-mateescu.de/datenaufbereitung-fuer-ki/' },
      { lang: 'en-US', url: 'https://me-mateescu.de/en/ai-data-preparation/' },
      { lang: 'ro-RO', url: 'https://me-mateescu.de/ro/pregatire-date-ai/' },
    ],
  ],
  [
    'https://me-mateescu.de/ro/pregatire-date-ai/',
    [
      { lang: 'de-DE', url: 'https://me-mateescu.de/datenaufbereitung-fuer-ki/' },
      { lang: 'en-US', url: 'https://me-mateescu.de/en/ai-data-preparation/' },
      { lang: 'ro-RO', url: 'https://me-mateescu.de/ro/pregatire-date-ai/' },
    ],
  ],
  [
    'https://me-mateescu.de/sample-struktur-pruefen/',
    [
      { lang: 'de-DE', url: 'https://me-mateescu.de/sample-struktur-pruefen/' },
      { lang: 'en-US', url: 'https://me-mateescu.de/en/sample-structure-review/' },
      { lang: 'ro-RO', url: 'https://me-mateescu.de/ro/revizuire-structura-esantion/' },
    ],
  ],
  [
    'https://me-mateescu.de/en/sample-structure-review/',
    [
      { lang: 'de-DE', url: 'https://me-mateescu.de/sample-struktur-pruefen/' },
      { lang: 'en-US', url: 'https://me-mateescu.de/en/sample-structure-review/' },
      { lang: 'ro-RO', url: 'https://me-mateescu.de/ro/revizuire-structura-esantion/' },
    ],
  ],
  [
    'https://me-mateescu.de/ro/revizuire-structura-esantion/',
    [
      { lang: 'de-DE', url: 'https://me-mateescu.de/sample-struktur-pruefen/' },
      { lang: 'en-US', url: 'https://me-mateescu.de/en/sample-structure-review/' },
      { lang: 'ro-RO', url: 'https://me-mateescu.de/ro/revizuire-structura-esantion/' },
    ],
  ],
]);

export default defineConfig({
  site: 'https://me-mateescu.de',
  output: 'static',
  outDir: './dist',

  redirects: {
    // Consolidate Blog and Projects to main (DE) version.
    // Keep exact routes before splat rules for clearer redirect resolution.
    '/en/blog': '/blog',
    '/ro/blog': '/blog',
    '/en/projects': '/projects',
    '/ro/projects': '/projects',
    '/en/blog/*': '/blog/:splat',
    '/ro/blog/*': '/blog/:splat',
    '/en/projects/*': '/projects/:splat',
    '/ro/projects/*': '/projects/:splat',
  },

  integrations: [
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
        !page.includes('/draft') &&
        !NOINDEX_SITEMAP_PATHS.has(new URL(page).pathname),
      customPages: [
        'https://me-mateescu.de/',
        'https://me-mateescu.de/en/',
        'https://me-mateescu.de/ro/',
      ],
      serialize(item) {
        const url = item.url;

        if (NOINDEX_SITEMAP_PATHS.has(new URL(url).pathname)) {
          return undefined;
        }

        const customLinks = CUSTOM_I18N_SITEMAP_LINKS.get(url);
        if (customLinks) {
          item.links = customLinks;
        }

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

        // Tools (live tools are flagship pages)
        if (url.match(/\/tools\/?$/) || url.includes('/tools/')) {
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
    svelte(),
  ],

  markdown: {
    // Astro 7 defaults `markdown.processor` to satteri(); pin unified() explicitly
    // to keep the remark/rehype pipeline (KaTeX, reading time, GFM, SmartyPants).
    processor: unified({
      remarkPlugins,
      rehypePlugins,
      gfm: true,
      smartypants: true,
    }),

    // Shiki themes (cross-cutting, applies regardless of markdown.processor)
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
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      // Fontsource subset files can fall under Vite's default 4096-byte
      // inline threshold, which base64-embeds them as `data:font` URIs
      // directly in the built CSS — a value `font-src 'self'` never allows.
      // Fonts must always ship as separate hashed files instead.
      assetsInlineLimit: (filePath) => (/\.woff2?$/.test(filePath) ? false : undefined),
    },
  },
});
