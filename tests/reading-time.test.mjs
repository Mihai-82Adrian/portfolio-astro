import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReadingTime, stripHtmlTags } from '../src/utils/readingTime.ts';

test('stripHtmlTags removes a nested/overlapping tag that a single pass would reconstruct', () => {
  // A single pass of /<\/?[a-zA-Z][^>]*>/g on "<<script>script>" removes only the
  // inner "<script>", reconstructing a complete "<script>" from what's left behind
  // (CodeQL js/incomplete-multi-character-sanitization). Looping to a fixpoint must
  // leave no complete tag for a downstream HTML consumer to interpret.
  const result = stripHtmlTags('<<script>script>alert(1)</script>>');
  assert.equal(/<\/?[a-zA-Z][^>]*>/.test(result), false, result);
});

test('calculateReadingTime keeps technical prose that merely contains "<" without a real tag', () => {
  const { words } = calculateReadingTime('latency <40% and throughput <100ms is fine');
  assert.equal(words, 7);
});
