
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'corpus.jsonl');

async function main() {
    // Ensure dist exists
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (e) {
        // ignore
    }

    // Find all content
    const files = await glob('src/content/**/*.{md,mdx}', { cwd: PROJECT_ROOT, absolute: true });

    const documents = [];

    for (const filePath of files) {
        const content = await fs.readFile(filePath, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);

        // Construct ID from path relative to content root
        // e.g. src/content/blog/foo.md -> blog/foo
        const relPath = path.relative(path.join(PROJECT_ROOT, 'src/content'), filePath);
        const id = relPath.replace(/\.(md|mdx)$/, '');

        // Basic cleaning of body if needed, but keeping markdown is usually fine for RAG.
        // We might want to remove strict frontmatter if we didn't use gray-matter, but we did.

        const doc = {
            id: id,
            url: `/${id}`, // Approximation, real URL depends on collection config
            title: frontmatter.title || id,
            text: body.trim(),
            metadata: {
                ...frontmatter,
                source: 'content-architect-v2'
            }
        };

        documents.push(doc);
    }

    // DETERMINISTIC SORT
    documents.sort((a, b) => a.id.localeCompare(b.id));

    // Write JSONL
    const jsonl = documents.map(doc => JSON.stringify(doc)).join('\n');
    await fs.writeFile(OUTPUT_FILE, jsonl, 'utf-8');

    console.log(`Exported ${documents.length} documents to ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
