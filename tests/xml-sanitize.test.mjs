import assert from 'node:assert/strict';
import test from 'node:test';
import { stripXmlComments } from '../scripts/xml-sanitize.mjs';

test('stripXmlComments removes a well-formed comment', () => {
  assert.equal(stripXmlComments('<a><!-- note -->b</a>'), '<a>b</a>');
});

test('stripXmlComments removes nested/overlapping comment markers left by a single pass', () => {
  // A single non-global-fixpoint pass on "<!--<!---->-->" only removes the innermost
  // "<!--<!---->" span, leaving a reconstructed, still-complete "<!--...-->" pair
  // that a downstream XML parser could interpret as a live comment/element boundary.
  // Looping to a fixpoint must leave no complete comment pattern at all.
  const input = '<a><!--<!---->-->b</a>';
  const result = stripXmlComments(input);
  assert.equal(/<!--[\s\S]*?-->/.test(result), false, result);
});
