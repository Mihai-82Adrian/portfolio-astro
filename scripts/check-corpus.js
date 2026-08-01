#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const strict = process.argv.includes('--strict');
const root = process.cwd();
const corpusPath = path.join(root, 'public/corpus.jsonl');
const factsPath = path.join(root, 'public/facts.json');
const projectsPath = path.join(root, 'src/data/projects.json');

const errors = [];
const warnings = [];

// Phase 2D-C Wave 1 (AI-CHAT-PROJECT-02 / AI-CORPUS-09): public/facts.json's project
// blurbs and public/corpus.jsonl's project entries must not silently drift from the
// canonical src/data/projects.json. This is a permanent guard against the exact class
// of defect found in the Phase 2D-B audit (facts.json describing a different tech
// stack/business model than the live /projects page for the same product).
const BANNED_CLAIM_PHRASES = [
  "World's First",
  "World's first",
  'Zero-hallucination',
  'zero-hallucination',
];

function checkFactsAgainstProjects() {
  let factsRaw;
  let projectsRaw;
  try {
    factsRaw = fs.readFileSync(factsPath, 'utf8');
  } catch (err) {
    errors.push(`Cannot read file: ${factsPath} (${err.message})`);
    return;
  }
  try {
    projectsRaw = fs.readFileSync(projectsPath, 'utf8');
  } catch (err) {
    errors.push(`Cannot read file: ${projectsPath} (${err.message})`);
    return;
  }

  let facts;
  let projectsData;
  try {
    facts = JSON.parse(factsRaw);
  } catch (err) {
    errors.push(`public/facts.json: invalid JSON (${err.message})`);
    return;
  }
  try {
    projectsData = JSON.parse(projectsRaw);
  } catch (err) {
    errors.push(`src/data/projects.json: invalid JSON (${err.message})`);
    return;
  }

  const projects = projectsData.projects ?? [];
  const factsProjectsText = facts.projects ?? {};

  for (const project of projects) {
    const techTokens = (project.techStack ?? [])
      .map((t) => t.name)
      .filter(Boolean);
    if (techTokens.length === 0) continue;

    // Project name marker: the part of the title before a " - "/" – " separator,
    // e.g. "GENESIS - Cognitive Computing Platform" -> "GENESIS". Used to isolate
    // this project's own paragraph within the combined multi-project text, so a
    // token shared with another project (e.g. GDS and GENESIS both use "Rust")
    // can't mask real drift in this project's own paragraph.
    const nameMarker = (project.title ?? '').split(/\s[-–—]\s/)[0].trim();
    const allMarkers = projects
      .map((p) => (p.title ?? '').split(/\s[-–—]\s/)[0].trim())
      .filter(Boolean);

    for (const lang of ['de', 'en', 'ro']) {
      const text = factsProjectsText[lang];
      if (typeof text !== 'string') {
        warnings.push(`public/facts.json: projects.${lang} missing — cannot cross-check ${project.id}`);
        continue;
      }
      if (!nameMarker || !text.includes(nameMarker)) {
        warnings.push(`public/facts.json: projects.${lang} does not mention '${nameMarker || project.id}' by name — cannot isolate its paragraph for a drift check`);
        continue;
      }
      const start = text.indexOf(nameMarker);
      const nextMarkerIndex = Math.min(
        ...allMarkers
          .filter((m) => m !== nameMarker)
          .map((m) => {
            const idx = text.indexOf(m, start + nameMarker.length);
            return idx === -1 ? Infinity : idx;
          }),
        Infinity,
      );
      const paragraph = text.slice(start, nextMarkerIndex === Infinity ? undefined : nextMarkerIndex);

      const hasAnyToken = techTokens.some((token) => paragraph.includes(token));
      if (!hasAnyToken) {
        errors.push(
          `public/facts.json: projects.${lang}'s '${project.id}' paragraph does not mention any current techStack token `
          + `(expected one of: ${techTokens.join(', ')}) — facts.json has drifted from src/data/projects.json`,
        );
      }
    }
  }

  for (const [source, text] of [
    ['public/facts.json (projects.de)', factsProjectsText.de],
    ['public/facts.json (projects.en)', factsProjectsText.en],
    ['public/facts.json (projects.ro)', factsProjectsText.ro],
    ['src/data/projects.json', projectsRaw],
  ]) {
    if (typeof text !== 'string') continue;
    for (const phrase of BANNED_CLAIM_PHRASES) {
      if (text.includes(phrase)) {
        errors.push(`${source}: contains banned unqualified claim phrase "${phrase}" (Decision 2, PHASE_2D_B_LAUNCH_SCOPE_DECISION_MEMO.md)`);
      }
    }
  }
}

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
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

const lines = corpusRaw.split('\n').filter(Boolean);
const seenIds = new Set();
const duplicateIds = [];
const docPaths = new Set();

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

  if (typeof item.text === 'string') {
    for (const phrase of BANNED_CLAIM_PHRASES) {
      if (item.text.includes(phrase)) {
        errors.push(`Line ${lineNo} (${item.id}): contains banned unqualified claim phrase "${phrase}" (Decision 2, PHASE_2D_B_LAUNCH_SCOPE_DECISION_MEMO.md)`);
      }
    }
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

checkFactsAgainstProjects();

console.log('--- Corpus QA Report ---');
console.log(`Entries parsed: ${parsedCount}`);
console.log(`SHA256 corpus.jsonl: ${hash(corpusRaw)}`);
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
