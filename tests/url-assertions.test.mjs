import assert from 'node:assert/strict';
import test from 'node:test';
import { textMentionsHost, startsWithOrigin } from './helpers/url-assertions.mjs';

test('textMentionsHost matches a real hostname token but not a superstring bypass', () => {
  assert.ok(textMentionsHost("script-src 'self' https://api.openai.com;", 'api.openai.com'));
  assert.equal(textMentionsHost('https://evil-api.openai.com', 'api.openai.com'), false);
  assert.equal(textMentionsHost('https://api.openai.com.attacker.example', 'api.openai.com'), false);
});

test('startsWithOrigin matches the exact origin and its paths, not a superstring bypass', () => {
  assert.ok(startsWithOrigin('https://me-mateescu.de', 'https://me-mateescu.de'));
  assert.ok(startsWithOrigin('https://me-mateescu.de/blog', 'https://me-mateescu.de'));
  assert.equal(startsWithOrigin('https://me-mateescu.de.attacker.example', 'https://me-mateescu.de'), false);
});
