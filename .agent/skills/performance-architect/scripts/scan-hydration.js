import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.resolve(__dirname, '../../../../src');
const EXTENSIONS = ['.astro'];
// Directives that cause hydration
const HYDRATION_DIRECTIVES = [
    'client:load',
    'client:idle',
    'client:visible',
    'client:media',
    'client:only'
];

let hydrationPoints = [];

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
                if (EXTENSIONS.includes(path.extname(file))) {
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
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(SRC_DIR, filePath);

        lines.forEach((line, index) => {
            HYDRATION_DIRECTIVES.forEach(directive => {
                if (line.includes(directive)) {
                    // Check if it's commented out
                    if (line.trim().startsWith('//') || line.trim().startsWith('<!--')) return;

                    hydrationPoints.push({
                        file: relativePath,
                        line: index + 1,
                        directive: directive,
                        content: line.trim()
                    });
                }
            });
        });
    } catch (error) {
        console.error(`Error reading checking file ${filePath}: ${error.message}`);
    }
}

function main() {
    console.log('⚡ Performance Architect: Scanning for Hydration...');

    if (!fs.existsSync(SRC_DIR)) {
        console.error(`Error: Source directory not found at ${SRC_DIR}`);
        process.exit(1);
    }

    const files = getFiles(SRC_DIR);
    files.forEach(file => scanFile(file));

    if (hydrationPoints.length > 0) {
        console.log(`\nFound ${hydrationPoints.length} hydrated components:\n`);

        let expensiveCount = 0;

        hydrationPoints.forEach(p => {
            const isExpensive = p.directive === 'client:load';
            const icon = isExpensive ? '🔴' : '⚠️ ';

            console.log(`${icon} ${p.file}:${p.line}`);
            console.log(`   Directive: ${p.directive}`);
            console.log(`   Code: ${p.content}`);

            if (isExpensive) {
                console.log(`   👉 TIP: Consider changing 'client:load' to 'client:visible' or 'client:idle' to delay JS execution.`);
                expensiveCount++;
            }
            console.log('');
        });

        console.log('Summary:');
        console.log(`- Total Hydration Points: ${hydrationPoints.length}`);
        console.log(`- High Cost (client:load): ${expensiveCount}`);

        if (expensiveCount > 0) {
            console.log('\nMake sure all client:load usages are absolutely necessary for Above-the-Fold interactivity.');
        }

    } else {
        console.log('\n✅ No client-side hydration found. This site is currently 100% static HTML (Excellent!).');
    }
}

main();
