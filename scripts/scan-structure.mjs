
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parse } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../');
const CONFIG_PATH = path.join(__dirname, 'a11y.config.json');

// Parse CLI Args
const { values: args } = parseArgs({
    options: {
        strict: { type: 'boolean', default: false },
        format: { type: 'string', default: 'text' }, // 'text' or 'json'
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

function isAllowed(file, ruleId, allowlists) {
    const list = allowlists[ruleId] || [];
    const relFile = path.relative(PROJECT_ROOT, file);

    for (const entry of list) {
        if (entry.file) {
            const fileRegex = new RegExp(entry.file);
            if (fileRegex.test(relFile)) return true;
        }
    }
    return false;
}

// Helper to get line number from index
function getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
}

async function scanFile(filePath, config) {
    const content = await fs.readFile(filePath, 'utf-8');
    // node-html-parser is tolerant of Astro syntax (e.g. frontmatter, expressions)
    // Frontmatter like --- ... --- might be parsed as text or comments, acceptable for this use case.
    const root = parse(content);
    const messages = [];

    const addMessage = (ruleId, defaultSeverity, text, element) => {
        if (isAllowed(filePath, ruleId, config.allowlists || {})) return;

        const ruleConfig = config.rules?.source?.[ruleId];
        if (!ruleConfig) return;

        const severity = args.strict ? 'error' : (ruleConfig.severity || defaultSeverity);

        // Try to find line number
        let line = 0;
        let snippet = '';
        if (element) {
            // node-html-parser 6.x supports range? No, default doesn't expose location info easily without options.
            // Trying to find it via raw index if possible, or fallback to 0.
            // Actually, the default parse doesn't give line numbers.
            // We can regex match the specific element string in content to guess line number.
            const outer = element.toString();
            const idx = content.indexOf(outer);
            if (idx !== -1) {
                line = getLineNumber(content, idx);
                snippet = outer.substring(0, 100);
            }
        }

        messages.push({
            ruleId,
            severity,
            message: text,
            line,
            snippet
        });
    };

    // 1. img-alt
    const imgs = root.querySelectorAll('img');
    for (const img of imgs) {
        if (!img.hasAttribute('alt')) {
            addMessage('img-alt', 'error', 'Image tag missing "alt" attribute.', img);
        }
    }

    // 2. button-name (icon only)
    const buttons = root.querySelectorAll('button');
    for (const btn of buttons) {
        const hasName = btn.hasAttribute('aria-label') || btn.hasAttribute('aria-labelledby') || btn.hasAttribute('title');
        if (!hasName) {
            const text = btn.innerText.trim();
            // Check for nested SVG if text is empty
            if (!text) {
                addMessage('button-name', 'error', 'Icon-only button without accessible name (aria-label/title).', btn);
            }
        }
    }

    // 3. link-name
    const links = root.querySelectorAll('a');
    for (const link of links) {
        const hasName = link.hasAttribute('aria-label') || link.hasAttribute('aria-labelledby') || link.hasAttribute('title');
        if (!hasName) {
            const text = link.innerText.trim();
            // If text is empty, check if it wraps an image with alt?
            // node-html-parser innerText might skip some things.
            // If it contains an IMG with alt, it's valid.
            const img = link.querySelector('img');
            const hasImgAlt = img && img.hasAttribute('alt');

            if (!text && !hasImgAlt) {
                // Warning: Astro components often passed as children might hide text.
                // e.g. <Link><Icon /> Text</Link> -> Parser sees <Link> as custom tag? 
                // No, we are searching for <a>.
                // If it is <a href...><slot/></a> in Astro, we might flag it.
                // For now, consistent with "empty link" check.
                addMessage('link-name', 'error', 'Empty link without accessible name.', link);
            }
        }
    }

    // 4. interactive-handlers
    // Query all elements with on... attributes
    // node-html-parser doesn't support wildcard attribute query.
    // We have to iterate all tags? That's expensive.
    // Let's iterate frequent suspects: div, span, section, article
    const interactiveSuspects = root.querySelectorAll('div, span, section, article');
    for (const el of interactiveSuspects) {
        const attrs = el.attributes;
        const hasInteractive = Object.keys(attrs).some(a => a.startsWith('on') && (a.includes('click') || a.includes('key') || a.includes('mouse')));
        if (hasInteractive) {
            const role = el.getAttribute('role');
            const tabIndex = el.getAttribute('tabindex');
            if (!role && !tabIndex) {
                addMessage('interactive-handlers', 'warning', `Interactive handler on non-interactive element <${el.tagName}>.`, el);
            }
        }
    }

    return { file: filePath, messages };
}

async function main() {
    const config = await loadConfig();
    const include = config.includeGlobs || ['src/**/*.{astro,md,mdx,html}'];
    const exclude = config.excludeGlobs || [];

    const files = await glob(include, {
        ignore: exclude,
        cwd: PROJECT_ROOT,
        absolute: true
    });

    const results = [];
    for (const file of files) {
        results.push(await scanFile(file, config));
    }

    if (args.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
        return;
    }

    let errorCount = 0;
    let warningCount = 0;

    console.log('🔍 A11y Source Scan\n');

    for (const res of results) {
        if (res.messages.length > 0) {
            console.log(`📄 ${path.relative(PROJECT_ROOT, res.file)}`);
            for (const msg of res.messages) {
                const icon = msg.severity === 'error' ? '❌' : '⚠️ ';
                console.log(`  ${icon} [${msg.ruleId}] Line ${msg.line}: ${msg.message}`);
                console.log(`      Code: ${msg.snippet}`);

                if (msg.severity === 'error') errorCount++;
                else warningCount++;
            }
            console.log('');
        }
    }

    console.log('----------------------------------------');
    console.log(`Summary: ${errorCount} errors, ${warningCount} warnings.`);

    if (errorCount > 0) {
        console.log('Scan FAILED.');
        process.exit(1);
    } else {
        console.log('Scan PASSED.');
    }
}

main();
