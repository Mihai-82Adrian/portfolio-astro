#!/usr/bin/env node
import { lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { close, createIndex } from 'pagefind';
import { normalizePagefindEntry } from './provenance.mjs';

function htmlFiles(root, current = '', files = []) {
  for (const entry of readdirSync(path.join(root, current), { withFileTypes: true })) {
    const relative = current ? path.posix.join(current, entry.name) : entry.name;
    const absolute = path.join(root, ...relative.split('/'));
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Pagefind input contains a symlink: ${relative}`);
    if (stat.isDirectory() && relative !== 'pagefind') htmlFiles(root, relative, files);
    else if (stat.isFile() && relative.endsWith('.html')) files.push(relative);
  }
  return files;
}

function assertNoErrors(errors, phase) {
  if (errors?.length) throw new Error(`Pagefind ${phase} failed: ${errors.join('; ')}`);
}

export async function buildPagefind(site) {
  const root = path.resolve(site);
  const { index, errors } = await createIndex();
  assertNoErrors(errors, 'initialization');
  if (!index) throw new Error('Pagefind did not create an index.');
  try {
    const files = htmlFiles(root).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
    for (const sourcePath of files) {
      const result = await index.addHTMLFile({
        sourcePath,
        content: readFileSync(path.join(root, ...sourcePath.split('/')), 'utf8'),
      });
      assertNoErrors(result.errors, `indexing ${sourcePath}`);
    }
    const result = await index.writeFiles({ outputPath: path.join(root, 'pagefind') });
    assertNoErrors(result.errors, 'write');
    const entry = path.join(root, 'pagefind/pagefind-entry.json');
    writeFileSync(entry, normalizePagefindEntry(readFileSync(entry, 'utf8')));
  } finally {
    await close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await buildPagefind(process.argv[2] ?? 'dist');
}
