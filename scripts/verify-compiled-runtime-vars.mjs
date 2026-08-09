#!/usr/bin/env node
// Compiled-CSS guard for the CSS-UNDEFINED-VARS-P1 bug family (D1C/D1E): a
// `var(--color-<name>)` reference with no fallback where `--color-<name>` is
// never actually *defined* anywhere in the compiled output silently collapses
// to the CSS initial value. Tailwind v4 emits real `--color-*` custom
// properties for its own built-in default palette (red, blue, gray, ...) but
// NOT for custom colors added only via `tailwind.config.mjs`'s legacy
// `theme.extend.colors` (eucalyptus, light, dark, text, ...) — this is the
// gap. `theme()`-resolved values and `@apply`-resolved utilities never appear
// as `var(...)` in compiled output at all, so they need no special-casing.
//
// Method: cross-reference DEFINITIONS (`--color-x: value;`) against USAGES
// (`var(--color-x)`, no second/fallback argument) in dist/**/*.css. Anything
// undefined and unfallback-guarded is a real, live bug — unless its exact
// declaration text is in the allowlist below (pre-existing, out-of-scope
// findings, each documented with its own reproduction).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST_ASTRO = path.join(ROOT, 'dist/_astro');

// Pre-existing, out-of-scope findings (not in the D1C tracked register). Each entry is the exact
// `var(--color-...)` text as it appears in compiled CSS; allowlisting is scoped to that literal
// property reference only. Empty as of Phase 5-D1E-R1 (Workstream C/D): the two prior entries
// (FOCUS-VISIBLE-RING-INVALID-PROPERTY, RELATED-CARD-THEME-COLOR-FALLBACK-UNDEFINED) were both
// closed with real, defined fallbacks/mechanisms — see the R1 evidence package for reproduction.
export const ALLOWLIST = new Set([]);

function findCssFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findCssFiles(full));
    else if (entry.endsWith('.css')) out.push(full);
  }
  return out;
}

export function auditCompiledRuntimeVars(distAstroDir = DIST_ASTRO) {
  const files = findCssFiles(distAstroDir);
  const defined = new Set();
  for (const file of files) {
    const css = readFileSync(file, 'utf8');
    for (const match of css.matchAll(/--(color-[a-zA-Z0-9-]+)\s*:/g)) defined.add(match[1]);
  }

  const violations = [];
  for (const file of files) {
    const css = readFileSync(file, 'utf8');
    for (const match of css.matchAll(/var\(--(color-[a-zA-Z0-9-]+)\)/g)) {
      const name = match[1];
      if (defined.has(name)) continue;
      const literal = `var(--${name})`;
      if (ALLOWLIST.has(literal)) continue;
      violations.push({ file: path.relative(ROOT, file), literal });
    }
  }
  return { definedCount: defined.size, violations };
}

function main() {
  if (!statSync(DIST_ASTRO, { throwIfNoEntry: false })) {
    throw new Error(`${path.relative(ROOT, DIST_ASTRO)} does not exist — run npm run build first.`);
  }
  const { definedCount, violations } = auditCompiledRuntimeVars();
  if (violations.length > 0) {
    console.error(`Compiled runtime-var guard FAILED: ${violations.length} new unresolved --color-* reference(s):`);
    for (const violation of violations) console.error(`  ${violation.file}: ${violation.literal}`);
    process.exit(1);
  }
  console.log(
    `Compiled runtime-var guard PASS: ${definedCount} defined --color-* custom properties; 0 new unresolved references (${ALLOWLIST.size} pre-existing allowlisted).`,
  );
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) main();
