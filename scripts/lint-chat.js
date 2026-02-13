
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAT_WIDGET_PATH = path.join(__dirname, '../src/components/ChatWidget.astro');
const FORBIDDEN_PATTERNS = [
    { regex: /\.innerHTML\s*=/g, message: 'Forbidden: .innerHTML usage detected. Use document.createElement() or textContent.' },
    { regex: /setHTMLUnsafe/g, message: 'Forbidden: setHTMLUnsafe usage detected.' }
];

try {
    const content = fs.readFileSync(CHAT_WIDGET_PATH, 'utf-8');
    const lines = content.split('\n');
    let hasError = false;

    lines.forEach((line, index) => {
        // Skip comments (basic check)
        if (line.trim().startsWith('//')) return;

        FORBIDDEN_PATTERNS.forEach(pattern => {
            if (pattern.regex.test(line)) {
                console.error(`❌ [Chat Security] Line ${index + 1}: ${pattern.message}`);
                console.error(`   Code: ${line.trim()}`);
                hasError = true;
            }
        });
    });

    if (hasError) {
        console.error('\nRefusing to pass quality gate. Please fix security issues.');
        process.exit(1);
    } else {
        console.log('✅ Chat Security Checks Passed.');
    }

} catch (err) {
    console.error('Failed to lint chat widget:', err);
    process.exit(1);
}
