import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. CONFIGURATION & SETUP ---

// Paths
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const CONFIG_PATH = path.join(__dirname, '../resources/audit.config.json');
const TOKENS_PATH = path.join(__dirname, '../resources/design-tokens.json');

// Load Config
let CONFIG;
try {
    CONFIG = require(CONFIG_PATH);
} catch (e) {
    console.error(`❌ Error loading config from ${CONFIG_PATH}: ${e.message}`);
    process.exit(1);
}

// Load Tokens
let TOKENS;
try {
    TOKENS = require(TOKENS_PATH);
} catch (e) {
    console.error(`❌ Error loading tokens from ${TOKENS_PATH}: ${e.message}`);
    process.exit(1);
}

// Flatten tokens for hex matching
// Returns: { "#ffffff": ["colors.light.elevated"], "#000000": [...] }
function flattenTokens(obj, prefix = '', acc = {}) {
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            flattenTokens(obj[key], prefix ? `${prefix}.${key}` : key, acc);
        } else if (typeof obj[key] === 'string' && obj[key].startsWith('#')) {
            const hex = obj[key].toLowerCase();
            if (!acc[hex]) acc[hex] = [];
            acc[hex].push(prefix ? `${prefix}.${key}` : key);
        }
    }
    return acc;
}
const FLATTENED_TOKENS = flattenTokens(TOKENS.colors || TOKENS); // Assuming top-level might be colors or just root

// Build a fallback map for nearest color (simple RGB distance)
const COLOR_MAP = Object.entries(FLATTENED_TOKENS).map(([hex, names]) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { hex, r, g, b, names };
});


// --- 2. UTILITIES ---

function hexToRgb(hex) {
    // Expand shorthand
    const fullHex = hex.length === 4 ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex;
    const r = parseInt(fullHex.slice(1, 3), 16);
    const g = parseInt(fullHex.slice(3, 5), 16);
    const b = parseInt(fullHex.slice(5, 7), 16);
    return { r, g, b };
}

function getNearestToken(hex) {
    const { r, g, b } = hexToRgb(hex);
    let minDist = Infinity;
    let closest = null;

    for (const token of COLOR_MAP) {
        const dist = Math.sqrt(
            Math.pow(r - token.r, 2) +
            Math.pow(g - token.g, 2) +
            Math.pow(b - token.b, 2)
        );
        if (dist < minDist) {
            minDist = dist;
            closest = token;
        }
    }

    // Threshold for "close enough" assignment vs just "nearest"
    return closest ? { names: closest.names, hex: closest.hex, distance: minDist } : null;
}

// Convert glob-like patterns to Regex (Shim for minimal deps)
// Very basic implementation for the requested patterns
function isMatch(filePath, patterns) {
    const relativePath = path.relative(ROOT_DIR, filePath);

    return patterns.some(pattern => {
        // Handle ** for directory recursion
        if (pattern.includes('**')) {
            const parts = pattern.split('**');
            const prefix = parts[0];
            const suffix = parts[1];
            // Simple check: does it start with prefix and end with suffix match?
            // This is brittle but works for "src/**/*.{extensions}"
            if (!relativePath.startsWith(prefix.replace(/^\.\//, ''))) return false;

            if (suffix.startsWith('/*.')) {
                // extension check
                const extBlob = suffix.match(/\{(.+)\}/);
                if (extBlob) {
                    const exts = extBlob[1].split(',');
                    return exts.some(ext => relativePath.endsWith('.' + ext));
                }
                return relativePath.endsWith(suffix.substring(1)); // *.css -> .css
            }
            return true; // Just ** wildcards
        }

        // Handle simple directory match "dist/**"
        if (pattern.endsWith('/**')) {
            const dir = pattern.slice(0, -3);
            return relativePath.startsWith(dir);
        }

        // Exact match
        return relativePath === pattern;
    });
}

function globToRegex(glob) {
    // Very basic glob-to-regex converter for the specific use cases in config
    let regexStr = glob
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\{([^}]+)\}/g, (_, group) => `(${group.replace(/,/g, '|')})`);
    return new RegExp(`^${regexStr}$`);
}

function matchesExcludes(filePath, excludeGlobs) {
    const relPath = path.relative(ROOT_DIR, filePath);
    return excludeGlobs.some(glob => {
        // Handle simple folder excludes like "dist/**"
        if (glob.endsWith('/**')) {
            return relPath.startsWith(glob.slice(0, -3));
        }
        // Handle specific file patterns
        const re = globToRegex(glob);
        return re.test(relPath);
    });
}

function matchesIncludes(filePath, includeGlobs) {
    const relPath = path.relative(ROOT_DIR, filePath);
    return includeGlobs.some(glob => {
        const re = globToRegex(glob);
        return re.test(relPath);
    });
}


// Recursive file walker
function getFiles(dir, includeGlobs, excludeGlobs) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!matchesExcludes(filePath, excludeGlobs)) {
                results = results.concat(getFiles(filePath, includeGlobs, excludeGlobs));
            }
        } else {
            if (matchesIncludes(filePath, includeGlobs) && !matchesExcludes(filePath, excludeGlobs)) {
                results.push(filePath);
            }
        }
    });
    return results;
}


// --- 3. ANALYSIS LOGIC ---

// Regexes
const CLASS_ATTR_REGEX = /\b(?:class|className)\s*=\s*(?:["']([^"']*)["']|\{([^}]+)\})/g; // Matches class="..." or class={...} or className="..."
// const CLASS_LIST_REGEX = /class:list\s*=\s*\{([^\}]+)\}/g; // Matches class:list={[...]} - simplified for now
const HEX_REGEX = /#(?:[0-9a-fA-F]{3}){1,2}(?![0-9a-fA-F])/g;
// Tailwind arbitrary: bg-[...], text-[...], w-[...]
// Exclude var(...) inside brackets to allow css vars
const ARBITRARY_REGEX = /\b([a-zA-Z0-9-]*)-\[(?!var\()([^\]]+)\]/g;

function auditFile(filePath, config) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(ROOT_DIR, filePath);
    const findings = [];
    const lines = content.split('\n');

    // 1. Check for Hardcoded Hex
    // Skip if file is allowed
    const isHexAllowed = config.allowedFilesWithHex.some(pattern => {
        const re = globToRegex(pattern);
        return re.test(relPath);
    });

    if (!isHexAllowed) {
        lines.forEach((line, i) => {
            let match;
            while ((match = HEX_REGEX.exec(line)) !== null) {
                // Ignore if in comments (naive)
                if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('<!--')) continue;

                const hex = match[0].toLowerCase();
                const token = FLATTENED_TOKENS[hex];
                let suggestion = '';

                if (token) {
                    suggestion = `Use token: ${token.join(' or ')}`;
                } else if (config.rules.noHardcodedHex.suggestToken) {
                    const nearest = getNearestToken(hex);
                    if (nearest) {
                        suggestion = `Closest token: ${nearest.names.join(' or ')} (approx)`;
                    }
                }

                findings.push({
                    rule: 'noHardcodedHex',
                    severity: config.rules.noHardcodedHex.severity,
                    file: relPath,
                    line: i + 1,
                    col: match.index + 1,
                    match: match[0],
                    message: `Hardcoded hex color found.`,
                    suggestion,
                    snippet: line.trim()
                });
            }
        });
    }

    // 2. Check for Arbitrary Values (using simplified line scan for robustness)
    lines.forEach((line, i) => {
        let match;
        // Reset regex state if reused (it's not here but good practice)

        // Tailwind Arbitrary Values
        while ((match = ARBITRARY_REGEX.exec(line)) !== null) {
            const fullMatch = match[0]; // e.g., w-[100px]

            // Allowlist check
            const allowed = config.rules.noArbitraryValues.allow.some(pattern => new RegExp(pattern).test(fullMatch));
            if (allowed) continue;

            findings.push({
                rule: 'noArbitraryValues',
                severity: config.rules.noArbitraryValues.severity,
                file: relPath,
                line: i + 1,
                col: match.index + 1,
                match: fullMatch,
                message: `Arbitrary Tailwind value found. Use design tokens.`,
                suggestion: `Check design-tokens.json for standard values.`,
                snippet: line.trim()
            });
        }

        // Z-Index Check
        const Z_INDEX_REGEX = /\bz-(\[?\d+\]?)/g;
        while ((match = Z_INDEX_REGEX.exec(line)) !== null) {
            const val = match[0]; // z-50 or z-[100]
            if (!config.rules.noArbitraryZIndex.allow.includes(val)) {
                findings.push({
                    rule: 'noArbitraryZIndex',
                    severity: config.rules.noArbitraryZIndex.severity,
                    file: relPath,
                    line: i + 1,
                    col: match.index + 1,
                    match: val,
                    message: `Non-standard z-index used.`,
                    suggestion: `Allowed: ${config.rules.noArbitraryZIndex.allow.join(', ')}`,
                    snippet: line.trim()
                });
            }
        }

        // Banned Spacing
        const banned = config.rules.bannedSpacingScale.ban;
        // Matches p-7, m-7, gap-7, etc. -7, x-7, y-7
        const SPACING_REGEX = new RegExp(`\\b[mp][xytrbl]?-${banned.join('|')}\\b|\\bgap-[xy]?-(${banned.join('|')})\\b`, 'g');
        while ((match = SPACING_REGEX.exec(line)) !== null) {
            findings.push({
                rule: 'bannedSpacingScale',
                severity: config.rules.bannedSpacingScale.severity,
                file: relPath,
                line: i + 1,
                col: match.index + 1,
                match: match[0],
                message: `Banned spacing scale value.`,
                suggestion: `Use standard spacing (4, 8, etc.).`,
                snippet: line.trim()
            });
        }
    });

    return findings;
}


// --- 4. MAIN EXECUTION ---

function main() {
    const args = process.argv.slice(2);
    const isJson = args.includes('--json');
    const isStrict = args.includes('--strict');

    if (!isJson) {
        console.log('🛡️  Design System Guardian: V2 Audit Starting...');
    }

    const files = getFiles(path.join(ROOT_DIR, 'src'), CONFIG.includeGlobs, CONFIG.excludeGlobs);

    if (!isJson) console.log(`Scanning ${files.length} files...`);

    let allFindings = [];
    files.forEach(file => {
        const findings = auditFile(file, CONFIG);
        allFindings = allFindings.concat(findings);
    });

    // Filtering logic based on strict mode could happen here, but we usually report everything and exit based on Error count
    const errors = allFindings.filter(f => f.severity === 'error');
    const warnings = allFindings.filter(f => f.severity === 'warning');

    if (isJson) {
        console.log(JSON.stringify({
            summary: {
                total: allFindings.length,
                errors: errors.length,
                warnings: warnings.length,
                filesScanned: files.length
            },
            findings: allFindings
        }, null, 2));
    } else {
        if (allFindings.length === 0) {
            console.log('\n✅ No design system violations found.');
        } else {
            console.log('\n❌ Violations Found:\n');
            allFindings.forEach(f => {
                const icon = f.severity === 'error' ? '🔴' : '⚠️ ';
                console.log(`${icon} [${f.rule}] ${f.file}:${f.line}`);
                console.log(`   Match: "${f.match}"`);
                console.log(`   Message: ${f.message}`);
                if (f.suggestion) console.log(`   Suggestion: ${f.suggestion}`);
                console.log('');
            });
            console.log(`Summary: ${errors.length} errors, ${warnings.length} warnings.`);
        }
    }

    // Exit Code Logic
    if (errors.length > 0) {
        process.exit(1);
    }
    if (isStrict && warnings.length > 0) {
        process.exit(1);
    }
    process.exit(0);
}

main();
