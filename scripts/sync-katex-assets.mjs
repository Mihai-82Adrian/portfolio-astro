// Regenerates public/katex/ from the installed katex package so the served math CSS/fonts
// always match the locked dependency version. Never hand-edit files under public/katex/.
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIST = path.join(__dirname, '../node_modules/katex/dist');
const DEST = path.join(__dirname, '../public/katex');

if (!existsSync(SRC_DIST)) {
  console.error('sync-katex-assets: node_modules/katex/dist not found — run npm install first.');
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(path.join(SRC_DIST, 'katex.min.css'), path.join(DEST, 'katex.min.css'));
cpSync(path.join(SRC_DIST, 'fonts'), path.join(DEST, 'fonts'), { recursive: true });
