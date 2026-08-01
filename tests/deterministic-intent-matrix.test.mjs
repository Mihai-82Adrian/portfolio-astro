// Wave 3 closure (post-AI-11 acceptance): a server-side matrix covering every declared
// deterministic intent x every language actually present in public/facts.json (the tracked
// facts source — no translation is invented here). For every combination this proves: status
// 200, a non-empty answer, valid (empty, for fact mode) evidence/source behavior, that the
// provider adapter is never invoked, and that the deterministic path works both with no
// OPENAI_API_KEY at all and with AI_CHAT_ENABLED=false.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { installFakeCaches } from './helpers/fake-caches.mjs';
import { createFetchRouter, jsonResponse } from './helpers/fetch-router.mjs';

installFakeCaches();

const { createHandler: createChatHandler } = await import('../functions/api/chat.ts');

const FACTS = JSON.parse(readFileSync(new URL('../public/facts.json', import.meta.url), 'utf8'));
const LANGS = ['de', 'en', 'ro'];
// Mirrors the bounded `Intent` union in functions/api/chat.ts — the same explicit,
// non-keyword-matched set surfaced to users via the quick-action chips.
const INTENTS = ['contact', 'contact_phone', 'current_role', 'tools', 'skills', 'certifications', 'projects'];

for (const lang of LANGS) {
    assert.ok(FACTS.contact[lang], `facts.json must have a contact block for tracked language ${lang}`);
}

let ipCounter = 5000;
function nextIp() {
    ipCounter += 1;
    return `198.51.100.${ipCounter % 250}`;
}

function factRequest(intent, lang) {
    return new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': nextIp() },
        body: JSON.stringify({ message: intent, tab: 'chat', intent, lang }),
    });
}

function expectedAnswer(intent, lang) {
    switch (intent) {
        case 'contact': return FACTS.contact[lang]?.default;
        case 'contact_phone': return FACTS.contact[lang]?.withPhone;
        case 'current_role': return FACTS.current_role[lang];
        case 'tools': return FACTS.current_role[lang];
        case 'skills': return FACTS.skills[lang];
        case 'certifications': return FACTS.certifications[lang];
        case 'projects': return FACTS.projects[lang];
        default: return undefined;
    }
}

function factsRouter() {
    return createFetchRouter([
        ['/facts.json', () => jsonResponse(FACTS)],
        ['api.openai.com', () => { throw new Error('the provider adapter must never be called for a deterministic fact intent'); }],
    ]);
}

for (const intent of INTENTS) {
    for (const lang of LANGS) {
        test(`deterministic intent matrix: ${intent} / ${lang} works without OPENAI_API_KEY and never calls the provider`, async () => {
            const { fetchImpl, calls } = factsRouter();
            const handler = createChatHandler({ fetchImpl });
            const res = await handler({ request: factRequest(intent, lang), env: {} });
            assert.equal(res.status, 200);
            const body = await res.json();
            assert.equal(body.ok, true);
            assert.equal(body.data.mode, 'fact');
            assert.equal(typeof body.data.answer, 'string');
            assert.ok(body.data.answer.length > 0, 'answer must be non-empty');
            assert.equal(body.data.answer, expectedAnswer(intent, lang));
            assert.deepEqual(body.data.sources, [], 'deterministic fact answers carry no fabricated sources');
            assert.ok(!calls.some((c) => new URL(c.url).hostname === 'api.openai.com'), 'provider adapter must not be called');
        });

        test(`deterministic intent matrix: ${intent} / ${lang} works with AI_CHAT_ENABLED=false`, async () => {
            const { fetchImpl, calls } = factsRouter();
            const handler = createChatHandler({ fetchImpl });
            const res = await handler({
                request: factRequest(intent, lang),
                env: { OPENAI_API_KEY: 'test-key', AI_CHAT_ENABLED: 'false' },
            });
            assert.equal(res.status, 200);
            const body = await res.json();
            assert.equal(body.data.mode, 'fact');
            assert.equal(body.data.answer, expectedAnswer(intent, lang));
            assert.ok(!calls.some((c) => new URL(c.url).hostname === 'api.openai.com'), 'provider adapter must not be called');
        });
    }
}
