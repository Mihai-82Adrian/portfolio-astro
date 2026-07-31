// Guards ChatWidget.astro's client-side error copy against drift from the server's actual
// ErrorCode union (functions/_lib/contracts.ts) and against the "[object Object]" regression
// where parseError() read the wrong JSON path and returned the error object itself instead of
// a string (Wave 3 AI-reliability fix — provider-required failures must render honest,
// specific copy, never a broken or generic message).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CONTRACTS = readFileSync(path.join(ROOT, 'functions/_lib/contracts.ts'), 'utf8');
const CHAT_WIDGET = readFileSync(path.join(ROOT, 'src/components/ChatWidget.astro'), 'utf8');

const errorCodeBlock = CONTRACTS.match(/export type ErrorCode =\s*([\s\S]*?);/)[1];
const serverErrorCodes = [...errorCodeBlock.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);

test('the server ErrorCode union is non-empty and was parsed correctly (sanity check on the regex above)', () => {
  assert.ok(serverErrorCodes.length >= 10, 'expected the full ErrorCode union from contracts.ts');
  assert.ok(serverErrorCodes.includes('FEATURE_DISABLED'));
  assert.ok(serverErrorCodes.includes('PROVIDER_UNAVAILABLE'));
});

test('parseError() reads the nested error.code / error.message path, not the legacy flat shape', () => {
  const methodMatch = CHAT_WIDGET.match(/async parseError\(res: Response\)[\s\S]*?\n {4}\}/);
  assert.ok(methodMatch, 'parseError() method must exist in ChatWidget.astro');
  const body = methodMatch[0];
  assert.match(body, /errData\?\.error\?\.code/, 'must read the code from the nested error envelope');
  assert.match(body, /errData\?\.error\?\.message/, 'must read the message from the nested error envelope, not the error object itself');
  assert.doesNotMatch(body, /errData\.code\b/, 'must not read a top-level .code that the server never sends');
});

test('every server ErrorCode that a chat/JD/finance-AI request can realistically receive has a mapped, non-empty client message', () => {
  const mapMatch = CHAT_WIDGET.match(/CODE_MESSAGES:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\n {4}\};/);
  assert.ok(mapMatch, 'CODE_MESSAGES map must exist in ChatWidget.astro');
  const mapBody = mapMatch[1];
  const mappedCodes = [...mapBody.matchAll(/'([A-Z_]+)':\s*'([^']+)'/g)];
  const mappedCodeSet = new Map(mappedCodes.map((m) => [m[1], m[2]]));

  for (const code of serverErrorCodes) {
    assert.ok(mappedCodeSet.has(code), `ErrorCode '${code}' from contracts.ts has no entry in ChatWidget's CODE_MESSAGES`);
    assert.ok(mappedCodeSet.get(code).length > 0, `CODE_MESSAGES['${code}'] must not be empty`);
  }
});

test('provider-required failure copy names "AI-assisted analysis" specifically, distinct from validation/rate-limit copy', () => {
  const mapMatch = CHAT_WIDGET.match(/CODE_MESSAGES:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\n {4}\};/);
  const mapBody = mapMatch[1];
  for (const code of ['FEATURE_DISABLED', 'FEATURE_NOT_CONFIGURED', 'CONFIGURATION_INVALID', 'PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE', 'PROVIDER_REJECTED']) {
    const entry = mapBody.match(new RegExp(`'${code}':\\s*'([^']+)'`));
    assert.ok(entry, `missing entry for ${code}`);
    assert.match(entry[1], /AI-assisted analysis/, `${code} copy should name AI-assisted analysis specifically, not a generic error`);
  }
  const validationEntry = mapBody.match(/'VALIDATION_FAILED':\s*'([^']+)'/);
  assert.doesNotMatch(validationEntry[1], /AI-assisted analysis/, 'a plain validation error should not imply the provider is the problem');
});
