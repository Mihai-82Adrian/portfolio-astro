
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Resolve paths relative to project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.agent/skills/content-architect/resources/content.config.json');

// Parse CLI Args
const { values: args } = parseArgs({
    options: {
        strict: {
            type: 'boolean',
            default: false,
        },
        format: {
            type: 'string',
            default: 'text', // 'text' or 'json'
        },
    },
});

async function loadConfig() {
    try {
        const content = await fs.readFile(CONFIG_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Failed to load config from ${CONFIG_PATH}:`, error);
        process.exit(1);
    }
}

function report(results, format) {
    if (format === 'json') {
        console.log(JSON.stringify(results, null, 2));
        return;
    }

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
        if (result.messages.length > 0) {
            console.log(`\n📄 ${path.relative(PROJECT_ROOT, result.file)}`);
            for (const msg of result.messages) {
                const label = msg.severity.toUpperCase();
                const icon = msg.severity === 'error' ? '❌' : '⚠️ ';
                console.log(`  ${icon} [${label}] ${msg.ruleId}: ${msg.message}`);
                if (msg.line) console.log(`      Line: ${msg.line}`);

                if (msg.severity === 'error') totalErrors++;
                else totalWarnings++;
            }
        }
    }

    console.log('\n----------------------------------------');
    console.log(`Summary: ${totalErrors} errors, ${totalWarnings} warnings.`);

    if (totalErrors > 0) {
        console.log('Build FAILED.');
        process.exit(1);
    } else {
        console.log('Build PASSED.');
    }
}

async function auditFile(filePath, config) {
    const ext = path.extname(filePath);
    const isAstro = ext === '.astro';
    const content = await fs.readFile(filePath, 'utf-8');

    const messages = [];

    const addMessage = (ruleId, defaultSeverity, text, line = null) => {
        const ruleConfig = config.rules?.[ruleId];
        const severity = args.strict ? 'error' : (ruleConfig?.severity || defaultSeverity);
        messages.push({
            ruleId,
            severity,
            message: text,
            line
        });
    };

    let frontmatter = {};
    let body = content;
    let lines = content.split('\n');

    if (!isAstro) {
        try {
            const parsed = matter(content);
            frontmatter = parsed.data;
            body = parsed.content;
        } catch (e) {
            addMessage('frontmatter-parse', 'error', `Frontmatter parsing failed: ${e.message}`, 1);
            return { file: filePath, messages };
        }
    }

    // Context helpers
    const getRule = (key) => config.rules?.[key];
    const isBlog = filePath.includes('/content/blog/');
    const isPage = filePath.includes('/pages/');

    // --- Rule: Language Policy ---
    if (config.languagePolicy) {
        if (isBlog && !isAstro && config.languagePolicy.blog) {
            if (frontmatter.lang !== config.languagePolicy.blog) {
                addMessage('languagePolicy', 'error', `Blog post language must be '${config.languagePolicy.blog}'. Found: '${frontmatter.lang}'`);
            }
        } else if (isPage && !isAstro && config.languagePolicy.pages) {
            if (frontmatter.lang && !config.languagePolicy.pages.includes(frontmatter.lang)) {
                addMessage('languagePolicy', 'error', `Page language '${frontmatter.lang}' not allowed. Allowed: ${config.languagePolicy.pages.join(', ')}`);
            }
        }
    }

    // --- Rule: Frontmatter Required Fields ---
    const fmRule = getRule('frontmatterRequiredFields');
    if (fmRule && isBlog && !isAstro) {
        const required = fmRule.fields || [];
        for (const field of required) {
            if (!frontmatter[field]) {
                addMessage('frontmatterRequiredFields', 'error', `Missing required frontmatter field: '${field}'`);
            }
        }
    }

    // --- Rule: Executive Summary (BLUF) ---
    const execRule = getRule('requireExecutiveSummary');
    if (execRule && !isAstro) {
        const blufRegex = /#+\s*(Executive Summary|BLUF|TL;DR|Introduction|Overview)/i;
        if (!blufRegex.test(body)) {
            addMessage('requireExecutiveSummary', 'error', execRule.message || "Missing 'Executive Summary'.");
        }
    }

    // --- Rule: Require Outline First ---
    const outlineRule = getRule('requireOutlineFirst');
    if (outlineRule && !isAstro && body.length > 3000) { // Only long content
        // Heuristic: "## Table of Contents" OR "## Outline"
        // OR the first H2 is a list?
        const hasExplicitOutline = /#+\s*(Table of Contents|Outline|In this Article)/i.test(body);
        if (!hasExplicitOutline) {
            // Check if first H2 is followed promptly by a list
            // This is hard to do perfectly with regex, skipping for now to avoid false positives.
            // We'll enforce explicit 'Table of Contents' or 'Outline' for now if strictly required.
            // But let's check config. If undefined, ignore.
            // For now, let's just warn if > 5000 chars and no TOC.
            if (body.length > 5000) {
                addMessage('requireOutlineFirst', 'warning', outlineRule.message || "Long content should have an outline.");
            }
        }
    }

    // --- Rule: Deep Dive Elements ---
    const ddRule = getRule('requireDeepDiveElements');
    if (ddRule && !isAstro) {
        const isDeepDive = /Deep Dive|Technical|Guide|Tutorial/i.test(frontmatter.title || '') ||
            (frontmatter.tags && frontmatter.tags.some(t => /technical|tutorial|guide/i.test(t)));

        if (isDeepDive) {
            const requiredElements = ddRule.requiredElements || ['code_block', 'mermaid_diagram'];

            let missing = [];
            if (requiredElements.includes('code_block') && !/```/.test(body)) missing.push('code_block');
            if (requiredElements.includes('mermaid_diagram') && !(/```mermaid/.test(body) || /<Mermaid/.test(body))) missing.push('mermaid_diagram');

            if (missing.length === requiredElements.length) { // Verify if *at least one* is present if logic implies OR, but naming implies AND?
                // Config says "Deep dive content should include at least one code block or diagram." -> implied OR.
                // So if ALL are missing, then error.
                addMessage('requireDeepDiveElements', 'warning', ddRule.message || "Deep dive content must include code blocks or diagrams.");
            }
        }
    }

    // --- Rule: Citations ---
    const citationRule = getRule('requireCitations');
    if (citationRule && !isAstro && isBlog) {
        // Look for markdown links [text](http) or reference style [text][id] or footnotes [^1]
        const hasLinks = /\[.*?\]\(http.*?\)/.test(body) || /\[\^.*?\]/.test(body);
        if (!hasLinks && body.length > 2000) {
            addMessage('requireCitations', 'warning', citationRule.message || "Content should have citations.");
        }
    }

    // --- Rule: Banned Words ---
    const bannedRule = getRule('bannedWords');
    if (bannedRule) {
        const banned = bannedRule.words || [];
        for (const word of banned) {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            const match = body.match(regex);
            if (match) {
                // Find line number
                const index = match.index;
                const lineNum = body.substring(0, index).split('\n').length + (isAstro ? 0 : (lines.length - body.split('\n').length));
                addMessage('bannedWords', 'warning', `Found banned word: '${word}'`, lineNum);
            }
        }
    }

    return { file: filePath, messages };
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

    const results = [];
    for (const file of files) {
        results.push(await auditFile(file, config));
    }

    report(results, args.format);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
