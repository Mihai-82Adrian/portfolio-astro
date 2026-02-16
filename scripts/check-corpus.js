#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const strict = process.argv.includes('--strict');
const root = process.cwd();
const corpusPath = path.join(root, 'public/corpus.jsonl');
const mirrorPath = path.join(root, 'public/corpus-jsonl.txt');

const errors = [];
const warnings = [];

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function normalizeBaseId(id) {
  return id
    .replace(/:de:/g, ':lang:')
    .replace(/:en:/g, ':lang:')
    .replace(/:ro:/g, ':lang:')
    .replace(/:(de|en|ro)$/g, ':lang');
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    errors.push(`Cannot read file: ${filePath} (${err.message})`);
    return '';
  }
}

const corpusRaw = readFileSafe(corpusPath);
const mirrorRaw = readFileSafe(mirrorPath);

if (corpusRaw && mirrorRaw && corpusRaw !== mirrorRaw) {
  errors.push('Freeze violation: public/corpus.jsonl differs from public/corpus-jsonl.txt');
}

const lines = corpusRaw.split('\n').filter(Boolean);
const seenIds = new Set();
const duplicateIds = [];
const docPaths = new Set();
const localeGroup = new Map();

let parsedCount = 0;

for (let i = 0; i < lines.length; i += 1) {
  const lineNo = i + 1;
  const line = lines[i];
  let item;
  try {
    item = JSON.parse(line);
    parsedCount += 1;
  } catch (err) {
    errors.push(`Line ${lineNo}: invalid JSON (${err.message})`);
    continue;
  }

  const required = ['id', 'url', 'title', 'sectionTitle', 'text', 'metadata'];
  for (const key of required) {
    if (!(key in item)) {
      errors.push(`Line ${lineNo}: missing required key '${key}'`);
    }
  }

  if (typeof item.id !== 'string' || !item.id.trim()) {
    errors.push(`Line ${lineNo}: id must be non-empty string`);
    continue;
  }

  if (seenIds.has(item.id)) duplicateIds.push(item.id);
  seenIds.add(item.id);

  if (typeof item.text === 'string' && item.text.length < 40) {
    warnings.push(`Line ${lineNo} (${item.id}): text is very short (<40 chars)`);
  }

  if (!item.metadata || typeof item.metadata !== 'object') {
    errors.push(`Line ${lineNo} (${item.id}): metadata must be object`);
    continue;
  }

  if (typeof item.metadata.lang !== 'string' || !['de', 'en', 'ro'].includes(item.metadata.lang)) {
    warnings.push(`Line ${lineNo} (${item.id}): metadata.lang missing or unexpected`);
  }

  if (item.metadata.docPath) {
    docPaths.add(item.metadata.docPath);
  }

  const baseId = normalizeBaseId(item.id);
  const langs = localeGroup.get(baseId) ?? new Set();
  if (item.metadata.lang) langs.add(item.metadata.lang);
  localeGroup.set(baseId, langs);
}

if (duplicateIds.length) {
  errors.push(`Duplicate ids: ${[...new Set(duplicateIds)].join(', ')}`);
}

for (const docPath of docPaths) {
  const abs = path.join(root, docPath);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing metadata.docPath file: ${docPath}`);
  }
}

for (const [baseId, langs] of localeGroup.entries()) {
  if (langs.size > 0 && langs.size < 3) {
    warnings.push(`Locale coverage: ${baseId} has only [${[...langs].join(', ')}]`);
  }
}

console.log('--- Corpus QA Report ---');
console.log(`Entries parsed: ${parsedCount}`);
console.log(`SHA256 corpus.jsonl:      ${hash(corpusRaw)}`);
console.log(`SHA256 corpus-jsonl.txt:  ${hash(mirrorRaw)}`);
console.log(`Document paths referenced: ${docPaths.size}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.slice(0, 40).forEach((w) => console.log(`- ${w}`));
  if (warnings.length > 40) console.log(`- ... ${warnings.length - 40} more warnings`);
}

if (errors.length) {
  console.log('\nErrors:');
  errors.forEach((e) => console.log(`- ${e}`));
}

if (errors.length > 0 || (strict && warnings.length > 0)) {
  process.exit(1);
}
