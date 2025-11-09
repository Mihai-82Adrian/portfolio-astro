// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://me-mateescu.de',
  output: 'static',
  outDir: './dist',
  integrations: [
    tailwind({
      applyBaseStyles: false, // We'll use our own base styles
    }),
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
      filter: (page) => {
        // Exclude test pages and drafts
        return !page.includes('/test/') && 
               !page.includes('/design-system-test') &&
               !page.includes('/draft');
      },
      customPages: [
        'https://me-mateescu.de/',
        'https://me-mateescu.de/en/',
        'https://me-mateescu.de/ro/',
      ],
      serialize(item) {
        const url = item.url;
        
        // Homepage - exact matches only (highest priority)
        if (url === 'https://me-mateescu.de/' || 
            url === 'https://me-mateescu.de/en/' || 
            url === 'https://me-mateescu.de/ro/') {
          item.priority = 1.0;
        } 
        // Main pages - about, experience, education, certifications
        else if (url.match(/\/(about|experience|education|certifications)\/?$/)) {
          item.priority = 0.8;
        }
        // Projects pages - high priority for portfolio showcase
        else if (url.match(/\/projects\/?$/)) {
          item.priority = 0.9; // Projects index
        }
        else if (url.match(/\/projects\/(gds|genesis|profitminds)\/?$/)) {
          item.priority = 0.85; // Individual projects
        }
        // Blog index pages
        else if (url.match(/\/blog\/?$/)) {
          item.priority = 0.7;
        }
        // Individual blog posts (not categories, not tags)
        else if (url.includes('/blog/') && 
                 !url.includes('/category/') && 
                 !url.includes('/tag/')) {
          item.priority = 0.7;
        }
        // Blog categories and tags
        else if (url.includes('/blog/category/') || url.includes('/blog/tag/')) {
          item.priority = 0.5;
        }
        // All other pages
        else {
          item.priority = 0.4;
        }
        
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      // Use dual themes for dark/light mode
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      // Wrap long code lines
      wrap: true,
      // Add transformers for enhanced code blocks
      transformers: [
        {
          name: 'add-language-class',
          pre(node) {
            const lang = this.options.lang || 'plaintext';
            this.addClassToHast(node, `language-${lang}`);
          },
        },
      ],
    },
    // Enable GFM and smartypants for better markdown processing
    remarkPlugins: [],
    rehypePlugins: [],
  },
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
  image: {
    // Configure image service (Sharp for optimization)
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
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['astro/components'],
          },
        },
      },
    },
    ssr: {
      noExternal: ['@astrojs/prism'],
    },
  },
});
