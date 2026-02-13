
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';

// Resolve paths relative to project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.agent/skills/content-architect/resources/content.config.json');

async function loadConfig() {
    try {
        const content = await fs.readFile(CONFIG_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Failed to load config from ${CONFIG_PATH}:`, error);
        process.exit(1);
    }
}

async function auditFile(filePath, config) {
    console.log(`Auditing ${path.relative(PROJECT_ROOT, filePath)}`);
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);
    const isAstro = ext === '.astro';

    let frontmatter = {};
    let body = content;

    if (!isAstro) {
        try {
            const parsed = matter(content);
            frontmatter = parsed.data;
            body = parsed.content;
        } catch (e) {
            console.error(`  [ERROR] Failed to parse frontmatter in ${path.relative(PROJECT_ROOT, filePath)}: ${e.message}`);
            return { errors: [`Frontmatter parsing failed: ${e.message}`], warnings: [] };
        }
    }

    const errors = [];
    const warnings = [];

    // Helper to get rule config
    const getRule = (key) => config.rules?.[key];

    // --- Rule: Language Policy ---
    const isBlog = filePath.includes('/content/blog/');
    const isPage = filePath.includes('/pages/');

    if (isBlog && !isAstro) {
        if (config.languagePolicy?.blog && frontmatter.lang !== config.languagePolicy.blog) {
            errors.push(`Blog post language must be '${config.languagePolicy.blog}'. Found: '${frontmatter.lang}'`);
        }
    } else if (isPage && !isAstro) {
        if (frontmatter.lang && !config.languagePolicy?.pages?.includes(frontmatter.lang)) {
            errors.push(`Page language '${frontmatter.lang}' not allowed. Allowed: ${config.languagePolicy.pages.join(', ')}`);
        }
    }

    // --- Rule: Frontmatter Required Fields ---
    const fmRule = getRule('frontmatterRequiredFields');
    if (fmRule && !isAstro && isBlog) { // Only enforce on blog posts for now
        const required = fmRule.fields || [];
        for (const field of required) {
            if (!frontmatter[field]) {
                const msg = `Missing required frontmatter field: '${field}'`;
                if (fmRule.severity === 'error') errors.push(msg);
                else warnings.push(msg);
            }
        }
    }

    // --- Rule: Executive Summary (BLUF) ---
    const execRule = getRule('requireExecutiveSummary');
    if (execRule && !isAstro) { // Skip for .astro files
        // logic: pass if "Executive Summary" OR "Introduction" OR "Overview" exists.
        const blufRegex = /#+\s*(Executive Summary|BLUF|TL;DR|Introduction|Overview)/i;
        if (!blufRegex.test(body)) {
            const msg = execRule.message || "Missing 'Executive Summary', 'BLUF', 'TL;DR', or 'Introduction' section.";
            if (execRule.severity === 'error') {
                errors.push(msg);
            } else {
                warnings.push(msg);
            }
        }
    }

    // --- Rule: Banned Words ---
    const bannedRule = getRule('bannedWords');
    if (bannedRule) {
        const banned = bannedRule.words || [];
        for (const word of banned) {
            // Simple regex check
            const match = body.match(new RegExp(`\\b${word}\\b`, 'i'));
            if (match) {
                const msg = `Found banned word: '${word}'`;
                if (bannedRule.severity === 'error') errors.push(msg);
                else warnings.push(msg);
            }
        }
    }

    // --- Rule: Required Deep Dive Elements ---
    const ddRule = getRule('requireDeepDiveElements');
    if (ddRule && !isAstro) {
        const isDeepDive = /Deep Dive|Technical|Guide|Tutorial/i.test(frontmatter.title || '') ||
            (frontmatter.tags && frontmatter.tags.some(t => /technical|tutorial|guide/i.test(t)));

        if (isDeepDive) {
            const hasCode = /```/.test(body);
            const hasMermaid = /```mermaid/.test(body) || /<Mermaid/.test(body);

            if (!hasCode && !hasMermaid) {
                const msg = ddRule.message || "Deep dive content must include code blocks or diagrams.";
                if (ddRule.severity === 'error') errors.push(msg);
                else warnings.push(msg);
            }
        }
    }

    // --- Rule: Sources/Citations ---
    const citationRule = getRule('requireCitations');
    if (citationRule && !isAstro) {
        // Only warn if explicitly missing in a long post?
        // For now, minimal noise.
    }

    console.log(`Audited ${path.relative(PROJECT_ROOT, filePath)}`);

    if (errors.length > 0 || warnings.length > 0) {
        console.log(`  Issues in ${path.relative(PROJECT_ROOT, filePath)}:`);
        errors.forEach(e => console.error(`    [ERROR] ${e}`));
        warnings.forEach(w => console.warn(`    [WARN]  ${w}`));
    }

    return { errors, warnings };
}

async function main() {
    const config = await loadConfig();
    const includeGlobs = config.includeGlobs || ['src/content/**/*.{md,mdx}'];
    const excludeGlobs = config.excludeGlobs || ['**/node_modules/**', '**/dist/**'];

    const files = await glob(includeGlobs, {
        ignore: excludeGlobs,
        cwd: PROJECT_ROOT,
        absolute: true
    });

    console.log(`Found ${files.length} files to audit.`);

    let totalErrors = 0;

    for (const file of files) {
        const { errors } = await auditFile(file, config);
        totalErrors += errors.length;
    }

    if (totalErrors > 0) {
        console.error(`\nAudit failed with ${totalErrors} errors.`);
        process.exit(1);
    } else {
        console.log(`\nAudit passed.`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
