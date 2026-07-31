// Wave 3 (AI Reliability): every /api/chat success response is wrapped in the standard
// `{ ok: true, data: {...}, requestId }` envelope (functions/_lib/http.ts jsonSuccess()).
// ChatWidget.astro's three non-streaming response handlers (fact-chip answers, the
// non-streaming chat fallback, and JD analysis) read `res.json()` and must unwrap `.data`
// before touching `.answer` / `.sources` / `.quota` — reading those fields directly on the
// raw envelope silently produces `undefined` (empty chat bubble, quota never updates), with no
// error thrown and no console warning, discovered via live browser testing against a real
// wrangler-served Function.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHAT_WIDGET = readFileSync(path.join(ROOT, 'src/components/ChatWidget.astro'), 'utf8');

const nonStreamingBlocks = [...CHAT_WIDGET.matchAll(/const data = await res\.json\(\);\s*\n([\s\S]{0,200}?)\n/g)];

test('every non-streaming /api/chat response handler unwraps the { ok, data, requestId } envelope', () => {
  assert.ok(nonStreamingBlocks.length >= 3, 'expected the fact-chip, chat-fallback, and JD-analysis handlers to each parse res.json() once');
  for (const [, block] of nonStreamingBlocks) {
    assert.doesNotMatch(block, /(?<!\.data)\.answer\b/, 'must read data.data.answer, not data.answer, on the raw success envelope');
    assert.doesNotMatch(block, /(?<!\.data)\.sources\b/, 'must read data.data.sources, not data.sources');
    assert.doesNotMatch(block, /(?<!\.data)\.quota\b/, 'must read data.data.quota, not data.quota');
  }
});

test('the fact-chip, chat-fallback, and JD-analysis handlers each read the unwrapped payload', () => {
  const occurrences = [...CHAT_WIDGET.matchAll(/data\.data\.answer/g)];
  assert.equal(occurrences.length, 3, 'expected exactly 3 call sites reading the unwrapped answer (fact-chip, chat-fallback, JD)');
});
