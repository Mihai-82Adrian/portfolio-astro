import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const budget = require('../resources/performance-budget.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DIST_DIR = path.resolve(__dirname, '../../../../dist');

// Config from budget
// Use simple parsing for "50kb" -> 51200
function parseSize(sizeStr) {
    const units = {
        'kb': 1024,
        'mb': 1024 * 1024,
        'b': 1
    };
    const regex = /^(\d+(?:\.\d+)?)([a-z]+)$/i;
    const match = sizeStr.toString().toLowerCase().match(regex);
    if (!match) return 50 * 1024; // Default 50kb

    const val = parseFloat(match[1]);
    const unit = match[2];

    return Math.floor(val * (units[unit] || 1));
}

const JS_BUDGET = parseSize(budget.global.js_bundle_gzip || "50kb");
const IMG_BUDGET = parseSize(budget.global.image_max_size || "100kb");

let largeFiles = [];

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
                results.push(filePath);
            }
        });
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Error scanning directory ${dir}: ${error.message}`);
        }
    }
    return results;
}

function analyzeFile(filePath) {
    try {
        const stat = fs.statSync(filePath);
        const size = stat.size;
        const ext = path.extname(filePath).toLowerCase();
        const relativePath = path.relative(DIST_DIR, filePath);

        let threshold = 0;
        let type = '';

        if (ext === '.js') {
            threshold = JS_BUDGET;
            type = 'JS';
        } else if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext)) {
            threshold = IMG_BUDGET;
            type = 'Image';
        }

        if (threshold > 0 && size > threshold) {
            largeFiles.push({
                file: relativePath,
                size: size,
                threshold: threshold,
                type: type
            });
        }
    } catch (error) {
        console.error(`Error checking file ${filePath}: ${error.message}`);
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(2) + ' KB';
}

function main() {
    console.log('⚡ Performance Architect: Analyzing Build Output...');

    if (!fs.existsSync(DIST_DIR)) {
        console.error(`Error: Dist directory not found at ${DIST_DIR}`);
        console.error('👉 TIP: Run `npm run build` before running this analysis.');
        // Don't fail, just warn
        return;
    }

    const files = getFiles(DIST_DIR);
    console.log(`Scanning ${files.length} files in dist/...`);

    files.forEach(file => analyzeFile(file));

    if (largeFiles.length > 0) {
        console.log(`\n❌ Found ${largeFiles.length} files exceeding budget:\n`);

        largeFiles.forEach(f => {
            console.log(`🔴 [${f.type}] ${f.file}`);
            console.log(`   Size: ${formatSize(f.size)} (Limit: ${formatSize(f.threshold)})`);
            console.log(`   Over budget by: ${formatSize(f.size - f.threshold)}`);
            console.log('');
        });

        console.log('Recommendation: Check if these assets can be optimized, split, or lazy-loaded.');
        process.exit(1);
    } else {
        console.log('\n✅ All assets are within performance budget. Excellent!');
    }
}

main();
