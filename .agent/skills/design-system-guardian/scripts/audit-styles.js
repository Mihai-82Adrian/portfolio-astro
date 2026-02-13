import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tokens = require('../resources/design-tokens.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.resolve(__dirname, '../../../../src'); // Adjust path to project src
const EXTENSIONS = ['.astro', '.tsx', '.jsx', '.vue', '.html', '.svelte'];
const IGNORE_FILES = ['global.css']; // Files to ignore

// Violation patterns
const PATTERNS = [
    {
        id: 'hardcoded-hex',
        regex: /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
        message: 'Hardcoded hex color found. Use design tokens instead (e.g., text-eucalyptus-500).',
        severity: 'error'
    },
    {
        id: 'magic-number-tailwind',
        // Matches arbitrary values in tailwind classes like w-[123px], p-[10%], top-[3rem]
        // Exclude variables like bg-[var(--...)]
        regex: /\b[a-zA-Z0-9-]*-\[(?!var\()[^\]]+\]/g,
        message: 'Magic number/arbitrary value found in Tailwind class. Use design system spacing/sizing tokens.',
        severity: 'warning'
    },
    {
        id: 'z-index-arbitrary',
        regex: /z-\[\d+\]/g,
        message: 'Arbitrary z-index found. Use standard z-index utilities.',
        severity: 'error'
    }
];

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

function auditFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(SRC_DIR, filePath);

        lines.forEach((line, index) => {
            PATTERNS.forEach(pattern => {
                let match;
                // Reset regex state
                pattern.regex.lastIndex = 0;
                while ((match = pattern.regex.exec(line)) !== null) {
                    // Skip comments (naive check)
                    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;

                    violations.push({
                        file: relativePath,
                        line: index + 1,
                        rule: pattern.id,
                        match: match[0],
                        message: pattern.message,
                        severity: pattern.severity,
                        preview: line.trim().substring(0, 100)
                    });
                }
            });
        });
    } catch (error) {
        console.error(`Error reading checking file ${filePath}: ${error.message}`);
    }
}

function main() {
    console.log('🛡️  Design System Guardian: Starting Audit...');
    console.log(`Scanning directory: ${SRC_DIR}`);

    if (!fs.existsSync(SRC_DIR)) {
        console.error(`Error: Source directory not found at ${SRC_DIR}`);
        process.exit(1);
    }

    const files = getFiles(SRC_DIR);
    console.log(`Found ${files.length} files to scan.`);

    files.forEach(file => auditFile(file));

    if (violations.length > 0) {
        console.log('\n❌ Design System Violations Found:\n');
        let errorCount = 0;

        violations.forEach(v => {
            const icon = v.severity === 'error' ? '🔴' : '⚠️ ';
            console.log(`${icon} [${v.rule}] ${v.file}:${v.line}`);
            console.log(`   match: "${v.match}"`);
            console.log(`   ${v.message}`);
            // console.log(`   code:  ${v.preview}`);
            console.log('');

            if (v.severity === 'error') errorCount++;
        });

        console.log(`Total Violations: ${violations.length} (${errorCount} errors, ${violations.length - errorCount} warnings)`);
        // Exit with error code if there are errors (strict mode)
        if (errorCount > 0) process.exit(1);
    } else {
        console.log('\n✅ No Design System violations found. Great job!');
    }
}

main();
