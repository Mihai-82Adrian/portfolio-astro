import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.resolve(__dirname, '../../../../src');
const EXTENSIONS = ['.astro', '.html', '.tsx', '.jsx', '.vue', '.svelte'];
const IGNORE_FILES = [];

let violations = [];

// Helper to recursively get files
function getFiles(dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getFiles(filePath));
            } else {
                if (EXTENSIONS.includes(path.extname(file)) && !IGNORE_FILES.includes(file)) {
                    results.push(filePath);
                }
            }
        });
    } catch (error) {
        console.error(`Error scanning directory ${dir}: ${error.message}`);
    }
    return results;
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(SRC_DIR, filePath);

    // Naive regex-based checks (AST would be better but requires heavier deps)

    // 1. Images without Alt Text
    // Matches <img ... > where alt is missing entirely
    // Note: This is tricky with regex, scanning for 'alt='
    // Simplified: Find <img tag line, check if it has alt=

    lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('<!--')) return;

        // Check 1: Image missing alt
        if (line.match(/<img\b(?![^>]*\balt=)/)) {
            violations.push({
                file: relativePath,
                line: index + 1,
                rule: 'img-alt-missing',
                message: 'Image tag found without "alt" attribute. Use alt="" for decorative images.',
                severity: 'error'
            });
        }

        // Check 2: Icon-only button without aria-label
        // Matches: <button ... ></button> (empty content) AND no aria-label
        // This is hard to detect perfectly line-by-line, but we can look for "no text content" approx
        // Looking for explicit known bad patterns like <button class="icon">
        if (line.match(/<button\b(?![^>]*\b(aria-label|aria-labelledby|title)=)[^>]*>\s*<svg/)) {
            violations.push({
                file: relativePath,
                line: index + 1,
                rule: 'button-name',
                message: 'Icon-only button found without accessible name (aria-label/title).',
                severity: 'error'
            });
        }

        // Check 3: Clickable Divs
        if (line.match(/<(div|span)\b[^>]*\bon[a-zA-Z]+=/)) { // onClick, onKeydown etc
            // Check if allow-listed (e.g. has role="button")
            if (!line.includes('role=') && !line.includes('button')) {
                violations.push({
                    file: relativePath,
                    line: index + 1,
                    rule: 'interactive-div',
                    message: 'Interactive event handler found on non-interactive element (<div/span>). Use <button> or add role="button" + tabindex="0".',
                    severity: 'warning'
                });
            }
        }

        // Check 4: Empty links
        if (line.match(/<a\b(?![^>]*\b(aria-label|title)=)[^>]*>\s*<\/a>/)) {
            violations.push({
                file: relativePath,
                line: index + 1,
                rule: 'link-name',
                message: 'Empty link found. Links must have discernible text or accessible name.',
                severity: 'error'
            });
        }

        // Check 5: Heading skipping invalid hierarchy (h1 -> h3)
        // This requires state across lines, skipping for naive line scan
    });
}

function main() {
    console.log('♿ Accessibility Auditor: Scanning Structure...');
    console.log(`Scanning directory: ${SRC_DIR}`);

    if (!fs.existsSync(SRC_DIR)) {
        console.error(`Error: Source directory not found at ${SRC_DIR}`);
        process.exit(1);
    }

    const files = getFiles(SRC_DIR);
    files.forEach(file => scanFile(file));

    if (violations.length > 0) {
        console.log(`\n❌ Found ${violations.length} accessibility issues:\n`);

        let errorCount = 0;

        violations.forEach(v => {
            const icon = v.severity === 'error' ? '🔴' : '⚠️ ';
            console.log(`${icon} [${v.rule}] ${v.file}:${v.line}`);
            console.log(`   ${v.message}`);
            console.log('');

            if (v.severity === 'error') errorCount++;
        });

        console.log(`Summary: ${errorCount} Errors, ${violations.length - errorCount} Warnings.`);
        if (errorCount > 0) process.exit(1);
    } else {
        console.log('\n✅ No Obvious accessibility violations found (Static Scan).');
        console.log('👉 Note: Manual keyboard testing is still required.');
    }
}

main();
