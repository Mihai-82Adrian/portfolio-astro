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
    sitemap(),
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
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
});
