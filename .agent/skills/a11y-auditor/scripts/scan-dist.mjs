
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parse } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.agent/skills/a11y-auditor/resources/a11y.config.json');

// Parse CLI Args
const { values: args } = parseArgs({
    options: {
        strict: { type: 'boolean', default: false },
        format: { type: 'string', default: 'text' },
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

async function scanFile(filePath, config) {
    const content = await fs.readFile(filePath, 'utf-8');
    const root = parse(content);
    const messages = [];

    const addMessage = (ruleId, defaultSeverity, text) => {
        if (isAllowed(filePath, ruleId, config.allowlists || {})) return;
        const ruleConfig = config.rules?.dist?.[ruleId];
        if (!ruleConfig) return;

        const severity = args.strict ? 'error' : (ruleConfig.severity || defaultSeverity);
        messages.push({
            ruleId,
            severity,
            message: text
        });
    };

    // 1. html-lang
    const html = root.querySelector('html');
    if (!html || !html.getAttribute('lang')) {
        addMessage('html-lang', 'error', '<html> tag missing "lang" attribute.');
    }

    // 2. main-landmark
    const main = root.querySelector('main');
    if (!main) {
        addMessage('main-landmark', 'error', 'Missing <main> landmark.');
    }

    // 3. unique-h1
    const h1s = root.querySelectorAll('h1');
    if (h1s.length === 0) {
        addMessage('unique-h1', 'error', 'Missing <h1> heading.');
    } else if (h1s.length > 1) {
        addMessage('unique-h1', 'error', `Found ${h1s.length} <h1> headings. Page must have exactly one.`);
    }

    // 4. unique-ids
    const ids = new Set();
    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
        const id = el.getAttribute('id');
        if (id) {
            if (ids.has(id)) {
                addMessage('unique-ids', 'error', `Duplicate ID found: "${id}"`);
            }
            ids.add(id);
        }
    }

    // 5. heading-order (Simple check: no H1 -> H3)
    // This is hard on flat HTML without walking DOM tree recursively.
    // node-html-parser layout is tree-based.
    // We can do a linear scan of *all headings* in document order?
    // querySelectorAll returns in document order.
    const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let prevLevel = 0;

    for (const h of headings) {
        const level = parseInt(h.tagName.substring(1));
        if (prevLevel > 0 && level > prevLevel + 1) {
            addMessage('heading-order', 'warning', `Skipped heading level: H${prevLevel} -> H${level}`);
        }
        prevLevel = level;
    }

    return { file: filePath, messages };
}

async function main() {
    const config = await loadConfig();
    const include = config.distGlobs || ['dist/**/*.html'];
    const exclude = config.distExcludeGlobs || [];

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

    console.log('🔍 A11y Dist Scan\n');

    for (const res of results) {
        if (res.messages.length > 0) {
            console.log(`📄 ${path.relative(PROJECT_ROOT, res.file)}`);
            for (const msg of res.messages) {
                const icon = msg.severity === 'error' ? '❌' : '⚠️ ';
                console.log(`  ${icon} [${msg.ruleId}] ${msg.message}`);

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
