// Astro 7 defaults `markdown.processor` to satteri() from @astrojs/markdown-satteri.
// This project keeps the Unified remark/rehype pipeline (KaTeX, reading time, GFM,
// SmartyPants). These guards fail if that pin regresses or Satteri activates by accident.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CONFIG_SOURCE = readFileSync(path.join(ROOT, 'astro.config.mjs'), 'utf8');

const MDX_SLUGS = [
  'founder-compass-svelte5-cloudflare-workers',
  'ai-ready-finance-data-rag-document-ai',
  'xrechnung-generator-local-first-en16931',
];

test('astro.config.mjs imports unified() from @astrojs/markdown-remark and never imports satteri', () => {
  assert.match(CONFIG_SOURCE, /import\s*\{\s*unified\s*\}\s*from\s*'@astrojs\/markdown-remark'/);
  assert.doesNotMatch(CONFIG_SOURCE, /from\s*'@astrojs\/markdown-satteri'/);
});

test('resolved markdown.processor is the Unified processor, not the Astro 7 default Satteri', async () => {
  const { isUnifiedProcessor } = await import('@astrojs/markdown-remark');
  const config = (await import('../astro.config.mjs')).default;
  assert.equal(config.markdown.processor.name, 'unified');
  assert.ok(
    isUnifiedProcessor(config.markdown.processor),
    'expected markdown.processor to be created by @astrojs/markdown-remark unified()'
  );
});

test('reading time (remarkReadingTime frontmatter mutation) is available on a built Markdown post', () => {
  const html = readFileSync(path.join(DIST, 'blog/portfolio-tech-stack/index.html'), 'utf8');
  assert.match(html, /\d+\s*min read/);
});

test('KaTeX rendering is present for MDX content using remark-math/rehype-katex', () => {
  const html = readFileSync(
    path.join(DIST, 'blog/founder-compass-svelte5-cloudflare-workers/index.html'),
    'utf8'
  );
  assert.match(html, /class="katex/);
});

test('the three live MDX entries render to static HTML through the same processor boundary', () => {
  for (const slug of MDX_SLUGS) {
    const file = path.join(DIST, 'blog', slug, 'index.html');
    assert.ok(existsSync(file), `expected MDX entry "${slug}" to build`);
    const html = readFileSync(file, 'utf8');
    assert.match(html, /\d+\s*min read/, `expected reading time on MDX entry "${slug}"`);
  }
});

test('a plain Markdown post builds through the same Unified pipeline as MDX', () => {
  const html = readFileSync(path.join(DIST, 'blog/rust-lifetimes-guide/index.html'), 'utf8');
  assert.match(html, /\d+\s*min read/);
  assert.ok(html.length > 0);
});
