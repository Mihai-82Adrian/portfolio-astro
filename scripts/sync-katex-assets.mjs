// Regenerates public/katex/ from the KaTeX package that `rehype-katex` (the math renderer
// wired in astro.config.mjs) actually resolves at runtime — via normal Node module
// resolution, not a hard-coded node_modules path — so served CSS/fonts always match the
// version that generated the markup, regardless of npm hoisting/deduplication (KA-1). See
// docs/operations/dependency-hygiene.md for why root and renderer can otherwise diverge.
// Never hand-edit files under public/katex/.
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function resolveRendererKatexDist() {
  const rehypeKatexEntry = require.resolve('rehype-katex', { paths: [__dirname] });
  const requireFromRehypeKatex = createRequire(rehypeKatexEntry);
  const katexPkgPath = requireFromRehypeKatex.resolve('katex/package.json');
  return path.join(path.dirname(katexPkgPath), 'dist');
}

let SRC_DIST;
try {
  SRC_DIST = resolveRendererKatexDist();
} catch (err) {
  console.error(
    'sync-katex-assets: could not resolve the katex package actually used by rehype-katex ' +
      '(the math renderer) — run npm install first. ' +
      err.message
  );
  process.exit(1);
}

const DEST = path.join(__dirname, '../public/katex');

if (!existsSync(SRC_DIST)) {
  console.error(`sync-katex-assets: resolved renderer katex dist not found at ${SRC_DIST}.`);
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(path.join(SRC_DIST, 'katex.min.css'), path.join(DEST, 'katex.min.css'));
cpSync(path.join(SRC_DIST, 'fonts'), path.join(DEST, 'fonts'), { recursive: true });
