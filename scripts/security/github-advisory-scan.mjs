#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildInventory, sha256 } from './lockfile-inventory.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export const GITHUB_ADVISORIES_ENDPOINT = 'https://api.github.com/advisories';
export const GITHUB_API_VERSION = '2026-03-10';
export const ADVISORY_TYPES = ['reviewed', 'unreviewed', 'malware'];
export const MAX_PACKAGES_PER_REQUEST = 1000; // GitHub `affects` parameter maximum
export const MAX_URL_LENGTH = 8000; // conservative shared client/proxy URL length ceiling
export const PER_PAGE = 100;

export class AdvisoryScanError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'AdvisoryScanError';
    this.code = code;
    this.detail = detail;
  }
}

function affectsValue(packages) {
  return packages.map((entry) => `${entry.name}@${entry.version}`).join(',');
}

export function buildQueryUrl({ endpoint = GITHUB_ADVISORIES_ENDPOINT, type, packages, perPage = PER_PAGE, cursor }) {
  const url = new URL(endpoint);
  url.searchParams.set('ecosystem', 'npm');
  url.searchParams.set('type', type);
  url.searchParams.set('affects', affectsValue(packages));
  url.searchParams.set('per_page', String(perPage));
  if (cursor) url.searchParams.set('after', cursor);
  return url.toString();
}

// Batches must respect both the API's documented maximum package count and the encoded
// URL length a real client/proxy can send; either ceiling alone is insufficient (long
// scoped package names exceed the URL budget long before 1,000 packages accumulate).
export function buildBatches(entries, { endpoint = GITHUB_ADVISORIES_ENDPOINT, type, perPage = PER_PAGE, maxPackages = MAX_PACKAGES_PER_REQUEST, maxUrlLength = MAX_URL_LENGTH } = {}) {
  const batches = [];
  let current = [];
  for (const entry of entries) {
    const candidate = [...current, entry];
    const candidateUrl = buildQueryUrl({ endpoint, type, packages: candidate, perPage });
    if (candidate.length > maxPackages || candidateUrl.length > maxUrlLength) {
      if (current.length === 0) {
        throw new AdvisoryScanError(
          'PACKAGE_TOO_LARGE',
          `A single package/version pair exceeds the URL length ceiling: ${entry.name}@${entry.version}`,
          { entry },
        );
      }
      batches.push(current);
      current = [entry];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) batches.push(current);
  return batches.map((packages, index) => ({ batchId: index + 1, packages }));
}

function parseNextCursor(linkHeader) {
  if (!linkHeader) return undefined;
  const next = linkHeader
    .split(',')
    .map((part) => part.trim())
    .find((part) => /rel="next"/.test(part));
  const match = next?.match(/<([^>]+)>/);
  if (!match) return undefined;
  return new URL(match[1]).searchParams.get('after') ?? undefined;
}

async function fetchAllPages({ type, packages, fetchImpl, endpoint }) {
  const pages = [];
  let cursor;
  let pageIndex = 0;
  do {
    pageIndex += 1;
    const url = buildQueryUrl({ endpoint, type, packages, cursor });
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    });
    if (response.status === 403 || response.status === 429) {
      throw new AdvisoryScanError(
        'RATE_LIMITED',
        `GitHub Advisory Database rate-limited the request (HTTP ${response.status}) for type=${type}.`,
        { url, status: response.status },
      );
    }
    if (response.status !== 200) {
      throw new AdvisoryScanError(
        'HTTP_FAILURE',
        `Unexpected HTTP ${response.status} querying type=${type}.`,
        { url, status: response.status },
      );
    }
    const bodyText = await response.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new AdvisoryScanError('MALFORMED_JSON', `Malformed JSON response querying type=${type}.`, { url });
    }
    if (!Array.isArray(body)) {
      throw new AdvisoryScanError(
        'INDETERMINATE',
        `Expected an array of advisories for type=${type}; received ${typeof body}.`,
        { url },
      );
    }
    const ghsaIds = body.map((advisory) => advisory?.ghsa_id);
    if (ghsaIds.some((id) => typeof id !== 'string' || !id)) {
      throw new AdvisoryScanError('MALFORMED_JSON', `Advisory entry missing ghsa_id for type=${type}.`, { url });
    }
    const linkHeader = typeof response.headers?.get === 'function' ? response.headers.get('link') : undefined;
    cursor = parseNextCursor(linkHeader);
    pages.push({
      pageIndex,
      url,
      httpStatus: response.status,
      resultCount: body.length,
      responseSha256: sha256(bodyText),
      pagination: cursor ? 'MORE_PAGES' : 'COMPLETE',
      ghsaIds: [...ghsaIds].sort(),
      rawBody: bodyText,
    });
  } while (cursor);
  return pages;
}

// Runs every batch for one advisory type sequentially and aggregates its evidence. A
// thrown AdvisoryScanError from any batch aborts the whole type — a partial result is
// never downgraded to "zero advisories found".
async function scanType({ type, entries, fetchImpl, endpoint, batchOptions }) {
  const batches = buildBatches(entries, { endpoint, type, ...batchOptions });
  const batchResults = [];
  for (const batch of batches) {
    const pages = await fetchAllPages({ type, packages: batch.packages, fetchImpl, endpoint });
    batchResults.push({
      batchId: batch.batchId,
      packages: batch.packages.map((entry) => `${entry.name}@${entry.version}`),
      pages,
      resultCount: pages.reduce((sum, page) => sum + page.resultCount, 0),
      finalHttpStatus: pages[pages.length - 1].httpStatus,
      pagination: pages.length > 1 ? 'PAGINATED' : 'SINGLE_PAGE',
    });
  }
  const ghsaIds = [...new Set(batchResults.flatMap((batch) => batch.pages.flatMap((page) => page.ghsaIds)))].sort();
  return {
    type,
    batches: batchResults,
    totalResultCount: batchResults.reduce((sum, batch) => sum + batch.resultCount, 0),
    ghsaIds,
  };
}

export async function scanAdvisories({ entries, types = ADVISORY_TYPES, fetchImpl = fetch, endpoint = GITHUB_ADVISORIES_ENDPOINT, now = () => new Date(), batchOptions }) {
  const results = {};
  for (const type of types) {
    results[type] = await scanType({ type, entries, fetchImpl, endpoint, batchOptions });
  }
  const allGhsaIds = [...new Set(types.flatMap((type) => results[type].ghsaIds))].sort();
  return {
    schemaVersion: 1,
    observedAt: now().toISOString(),
    apiVersion: GITHUB_API_VERSION,
    ecosystem: 'npm',
    types,
    results,
    aggregate: {
      packageVersionCount: entries.length,
      totalResultCount: types.reduce((sum, type) => sum + results[type].totalResultCount, 0),
      ghsaIds: allGhsaIds,
    },
  };
}

function sanitizeForCommit(page) {
  const { rawBody: _rawBody, ...rest } = page;
  return rest;
}

// The manifest must hash the exact bytes written to disk, not the in-memory HTTP body — a
// mismatch here (e.g. a trailing newline added only at write time) makes the manifest
// unverifiable against `sha256sum raw/*.json`.
export function writeRawEvidence(outputDir, results) {
  mkdirSync(path.join(outputDir, 'raw'), { recursive: true });
  const rawManifestLines = [];
  for (const [type, result] of Object.entries(results)) {
    for (const batch of result.batches) {
      for (const page of batch.pages) {
        const fileName = `${type}-batch${batch.batchId}-page${page.pageIndex}.json`;
        const storedBytes = `${page.rawBody}\n`;
        writeFileSync(path.join(outputDir, 'raw', fileName), storedBytes);
        rawManifestLines.push(`${sha256(storedBytes)}  raw/${fileName}`);
      }
    }
  }
  writeFileSync(path.join(outputDir, 'raw-response-checksums.sha256'), `${rawManifestLines.sort().join('\n')}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : undefined;
  if (!outputDir) {
    throw new Error('Usage: node scripts/security/github-advisory-scan.mjs --output <external-output-directory> [--types reviewed,unreviewed,malware]');
  }
  const typesIndex = args.indexOf('--types');
  const types = typesIndex !== -1 ? args[typesIndex + 1].split(',') : ADVISORY_TYPES;
  for (const type of types) {
    if (!ADVISORY_TYPES.includes(type)) throw new Error(`Unsupported advisory type: ${type}`);
  }

  const lockfileContent = readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8');
  const inventory = buildInventory(lockfileContent);

  mkdirSync(outputDir, { recursive: true });

  const scan = await scanAdvisories({ entries: inventory.entries, types });
  scan.lockfileSha256 = inventory.lockfileSha256;
  scan.inventorySha256 = sha256(JSON.stringify(inventory.entries));

  const sanitized = {
    ...scan,
    results: Object.fromEntries(
      Object.entries(scan.results).map(([type, result]) => [
        type,
        { ...result, batches: result.batches.map((batch) => ({ ...batch, pages: batch.pages.map(sanitizeForCommit) })) },
      ]),
    ),
  };
  writeFileSync(path.join(outputDir, 'github-advisory-scan-result.json'), `${JSON.stringify(sanitized, null, 2)}\n`);

  writeRawEvidence(outputDir, scan.results);

  console.log(`GitHub advisory scan complete: ${scan.aggregate.totalResultCount} result(s) across ${types.join(', ')}; ${scan.aggregate.ghsaIds.length} unique GHSA id(s).`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main().catch((error) => {
    console.error(`${error.code ?? 'ERROR'}: ${error.message}`);
    process.exit(1);
  });
}
