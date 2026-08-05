#!/usr/bin/env node
// Manual-only refresh for src/data/github-snapshot.json.
//
// This script is never invoked by `npm run build`, `npm test`, or any CI
// gate — it is run explicitly by a human/agent when the GitHub snapshot
// should be refreshed. It replaces the old client-side flow that fetched
// api.github.com from every visitor's browser (see PRIV-018): the browser
// now only ever receives this repository's own static JSON.
//
// Reads exactly two public, unauthenticated GitHub REST endpoints, validates
// their shape strictly, computes a small deterministic summary, and writes
// it with stable key ordering. On any failure it leaves the existing
// tracked snapshot file untouched.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const USERNAME = 'Mihai-82Adrian';
const OUTPUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'github-snapshot.json'
);
const MAX_LANGUAGES = 5;
const MAX_REPOS = 100;
const MAX_NAME_LENGTH = 64;
const USER_AGENT = 'portfolio-astro-github-snapshot-script';

function isFiniteNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Validates only the field this script actually uses from GET /users/{username}.
 *
 * This is an unauthenticated request, and GitHub's unauthenticated
 * `/users/{username}` response never includes `total_private_repos` for any
 * username — that field is only ever populated for the authenticated caller's
 * own profile. This script sends no Authorization header, so it must never
 * claim a private-repository count or a "total" derived from one: either
 * would present a structurally-guaranteed artifact (always absent/zero) as if
 * it were measured data. Only the public repository count is reported.
 */
export function validateUserPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('user payload is not an object');
  }
  if (!isFiniteNonNegativeInteger(payload.public_repos)) {
    throw new Error('user payload public_repos is not a non-negative integer');
  }
  return { publicRepositoryCount: payload.public_repos };
}

/** Validates only the fields this script actually uses from GET /users/{username}/repos. */
export function validateReposPayload(payload) {
  if (!Array.isArray(payload)) {
    throw new Error('repos payload is not an array');
  }
  const bounded = payload.slice(0, MAX_REPOS);
  return bounded.map((repo) => {
    if (!repo || typeof repo !== 'object') {
      throw new Error('repo entry is not an object');
    }
    const language = typeof repo.language === 'string' ? repo.language.slice(0, MAX_NAME_LENGTH) : null;
    const size = isFiniteNonNegativeInteger(repo.size) ? repo.size : 0;
    return { language, size };
  });
}

/**
 * Deterministic language ranking: by aggregate size percentage descending,
 * then by name ascending as a stable tiebreaker (percentage alone is not a
 * stable sort key when two languages tie).
 */
export function computeLanguages(repos) {
  const sizeByLanguage = new Map();
  let totalSize = 0;
  for (const { language, size } of repos) {
    if (!language || size <= 0) continue;
    sizeByLanguage.set(language, (sizeByLanguage.get(language) ?? 0) + size);
    totalSize += size;
  }
  if (totalSize === 0) return [];
  return [...sizeByLanguage.entries()]
    .map(([name, size]) => ({ name, percentage: Math.round((size / totalSize) * 100) }))
    .sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name))
    .slice(0, MAX_LANGUAGES);
}

export function buildSnapshot({ userPayload, reposPayload, generatedAt }) {
  const { publicRepositoryCount } = validateUserPayload(userPayload);
  const repos = validateReposPayload(reposPayload);
  const languages = computeLanguages(repos);
  return {
    generatedAt,
    username: USERNAME,
    publicRepositoryCount,
    languages,
  };
}

function serialize(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`${url} responded with ${response.status}`);
  }
  return response.json();
}

async function main() {
  const userPayload = await fetchJson(`https://api.github.com/users/${USERNAME}`);
  const reposPayload = await fetchJson(
    `https://api.github.com/users/${USERNAME}/repos?per_page=${MAX_REPOS}&sort=updated`
  );
  const snapshot = buildSnapshot({
    userPayload,
    reposPayload,
    generatedAt: new Date().toISOString(),
  });
  writeFileSync(OUTPUT_PATH, serialize(snapshot));
  console.log(`Wrote ${OUTPUT_PATH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('GitHub snapshot refresh failed; existing snapshot left untouched.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
