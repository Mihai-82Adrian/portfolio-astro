
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'corpus.jsonl');

/**
 * Generate a deterministic ID for a chunk.
 */
function generateId(type, lang, slug, sectionSlug = '') {
    const base = `${type}:${lang}:${slug}`;
    if (sectionSlug) return `${base}#${sectionSlug}`;
    return base;
}

/**
 * Heuristic URL generator
 */
function generateUrl(filePath, frontmatter) {
    const relPath = path.relative(path.join(PROJECT_ROOT, 'src'), filePath);
    // e.g. content/blog/foo.md -> /blog/foo
    // e.g. pages/en/about.astro -> /en/about

    let url = '/' + relPath
        .replace(/^content\//, '')
        .replace(/^pages\//, '')
        .replace(/\.(md|mdx|astro)$/, '')
        .replace(/index$/, ''); // /index -> /

    // Cleanup trailing slash if not root
    if (url.length > 1 && url.endsWith('/')) {
        url = url.slice(0, -1);
    }

    return url || '/';
}

/**
 * Split content into chunks based on headers (H2, H3).
 * Returns array of { title, text, slug, level }
 */
function chunkContent(body) {
    const lines = body.split('\n');
    const chunks = [];
    let currentChunk = {
        title: 'Introduction',
        text: [],
        slug: 'intro',
        level: 1
    };

    for (const line of lines) {
        // match ## Title or ### Title
        const match = line.match(/^(#{2,3})\s+(.+)$/);
        if (match) {
            // Push old chunk if it has text
            if (currentChunk.text.length > 0) {
                chunks.push({
                    title: currentChunk.title,
                    text: currentChunk.text.join('\n').trim(),
                    slug: currentChunk.slug, // simplistic slug
                });
            }

            // Start new chunk
            const level = match[1].length;
            const title = match[2].trim();
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            currentChunk = {
                title,
                text: [], // Don't include header in text to avoid duplication? Or Include it? 
                // RAG usually likes the header context. Let's NOT include the header line in 'text' strictly, 
                // but the title field covers it.
                slug,
                level
            };
        } else {
            currentChunk.text.push(line);
        }
    }

    // Push final chunk
    if (currentChunk.text.length > 0) {
        chunks.push({
            title: currentChunk.title,
            text: currentChunk.text.join('\n').trim(),
            slug: currentChunk.slug,
        });
    }

    return chunks.filter(c => c.text.length > 50); // Filter very short chunks
}

async function processFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);
    let frontmatter = {};
    let body = content;

    // Handle .astro vs .md
    if (ext === '.astro') {
        // Very basic extraction for astro (skip frontmatter part if strictly --- fences)
        // Usually Astro pages in src/pages might be mixed. 
        // For corpus, we primarily want content/blog. 
        // If we audit pages, we might want to index them too? 
        // Config says includeGlobs: src/content (md), src/pages (astro).

        // Naive clean: remove code fence
        body = content.replace(/^---[\s\S]*?---/, '').trim();
        frontmatter = { title: path.basename(filePath, ext) }; // fallback
    } else {
        const parsed = matter(content);
        frontmatter = parsed.data;
        body = parsed.content;
    }

    const type = filePath.includes('/content/blog/') ? 'blog' : 'page';
    const lang = frontmatter.lang || 'en'; // fallback
    const slug = path.basename(filePath, path.extname(filePath));
    const url = generateUrl(filePath, frontmatter);

    const chunks = chunkContent(body);

    return chunks.map(chunk => {
        return {
            id: generateId(type, lang, slug, chunk.slug !== 'intro' ? chunk.slug : ''),
            url: url + (chunk.slug !== 'intro' ? `#${chunk.slug}` : ''),
            title: frontmatter.title || slug,
            sectionTitle: chunk.title,
            text: chunk.text,
            metadata: {
                type,
                lang,
                tags: frontmatter.tags || [],
                pubDate: frontmatter.pubDate,
                source: 'content-architect-v2'
            }
        };
    });
}

async function main() {
    // Ensure dist exists
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (e) {
        // ignore
    }

    // Reuse config-like globs or just strict set?
    // User requested robust quality export.
    const files = await glob(['src/content/**/*.{md,mdx}'], {
        cwd: PROJECT_ROOT,
        absolute: true,
        ignore: ['**/node_modules/**']
    });

    // We can also include pages if we want, but usually blog is the rich text.
    // Let's stick to content for high quality RAG first.

    let allChunks = [];

    for (const filePath of files) {
        const fileChunks = await processFile(filePath);
        allChunks = allChunks.concat(fileChunks);
    }

    // DETERMINISTIC SORT by ID
    allChunks.sort((a, b) => a.id.localeCompare(b.id));

    // Write JSONL
    // Verify determinism: JSON.stringify key order is usually stable in modern Node, 
    // but to be super safe we could sort keys. 
    // For now, standard stringify is fine.

    const jsonl = allChunks.map(doc => JSON.stringify(doc)).join('\n');
    await fs.writeFile(OUTPUT_FILE, jsonl, 'utf-8');

    // Generate Hash for verification
    const hash = crypto.createHash('sha256').update(jsonl).digest('hex');

    console.log(`Exported ${allChunks.length} chunks to ${OUTPUT_FILE}`);
    console.log(`Corpus Hash: ${hash}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
