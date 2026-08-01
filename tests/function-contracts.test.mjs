import assert from 'node:assert/strict';
import test from 'node:test';
import { installFakeCaches } from './helpers/fake-caches.mjs';
import { createFetchRouter, jsonResponse, abortError } from './helpers/fetch-router.mjs';

installFakeCaches();

const { createHandler: createChatHandler } = await import('../functions/api/chat.ts');
const { createHandler: createCompassHandler } = await import('../functions/api/compass.ts');
const { createHandler: createCashflowHandler } = await import('../functions/api/cashflow-scenario.ts');
const { createHandler: createInvestmentHandler } = await import('../functions/api/investment-analysis.ts');
const { createHandler: createSampleReviewHandler } = await import('../functions/api/sample-review.ts');

let ipCounter = 0;
function nextIp() {
    ipCounter += 1;
    return `198.51.100.${ipCounter % 250}`;
}

function jsonRequest(url, { method = 'POST', body, headers = {} } = {}) {
    return new Request(`http://localhost${url}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': nextIp(), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

function ctx(request, env = {}) {
    return { request, env };
}

async function assertEnvelopeHeaders(res) {
    assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
}

async function assertErrorEnvelope(res, status, code) {
    await assertEnvelopeHeaders(res);
    assert.equal(res.status, status);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error.code, code);
    assert.equal(typeof body.error.message, 'string');
    assert.ok(body.error.message.length > 0);
    assert.equal(typeof body.requestId, 'string');
    assert.ok(body.requestId.length > 0);
    return body;
}

// ─────────────────────────────────────────────────────────────────────────
// investment-analysis
// ─────────────────────────────────────────────────────────────────────────

test('investment-analysis: GET is rejected with 405 and an Allow header', async () => {
    const handler = createInvestmentHandler();
    const res = await handler(ctx(new Request('http://localhost/api/investment-analysis', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': nextIp() },
    }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.headers.get('Allow'), 'POST');
    await assertErrorEnvelope(res, 405, 'METHOD_NOT_ALLOWED');
});

test('investment-analysis: missing OPENAI_API_KEY fails closed with 503 and makes no fetch call', async () => {
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createInvestmentHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', {
        body: { initialInvestment: 1000, returnMetrics: {}, riskMetrics: {} },
    }), {}));
    await assertErrorEnvelope(res, 503, 'FEATURE_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
});

test('investment-analysis: wrong media type is rejected with 415', async () => {
    const handler = createInvestmentHandler();
    const res = await handler(ctx(new Request('http://localhost/api/investment-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': nextIp() },
        body: 'hello',
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
});

test('investment-analysis: malformed JSON is rejected with 400', async () => {
    const handler = createInvestmentHandler();
    const res = await handler(ctx(new Request('http://localhost/api/investment-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': nextIp() },
        body: '{not valid json',
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 400, 'MALFORMED_JSON');
});

test('investment-analysis: oversized body is rejected with 413', async () => {
    const handler = createInvestmentHandler();
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', {
        body: { pad: 'x'.repeat(50_000) },
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 413, 'PAYLOAD_TOO_LARGE');
});

test('investment-analysis: structurally valid but semantically invalid payload is rejected with 422', async () => {
    const handler = createInvestmentHandler();
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', {
        body: { initialInvestment: 'not-a-number' },
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 422, 'VALIDATION_FAILED');
});

test('investment-analysis: hostile Origin is rejected with 403', async () => {
    const handler = createInvestmentHandler();
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', {
        body: { initialInvestment: 1000, returnMetrics: {}, riskMetrics: {} },
        headers: { Origin: 'https://evil.example.com' },
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 403, 'ORIGIN_REJECTED');
});

test('investment-analysis: success path returns the mocked provider analysis and calls only the provider URL', async () => {
    const analysis = { summary: 's', strengths: 'st', risks: 'r', recommendation: 'rec' };
    const { fetchImpl, calls } = createFetchRouter([
        ['api.openai.com', () => jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(analysis) }] }] })],
    ]);
    const handler = createInvestmentHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', {
        body: {
            initialInvestment: 1000,
            returnMetrics: { roi: 0.1, cagr: 0.05, irr: 0.05, npv: 100, paybackYear: 2 },
            riskMetrics: { sharpeRatio: 1, sortinoRatio: 1, maxDrawdown: 0.1, annualizedVolatility: 0.2, var95: 10, var99: 20 },
        },
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertEnvelopeHeaders(res);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.deepEqual(body.data, analysis);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /api\.openai\.com/);
});

test('investment-analysis: provider timeout maps to 504', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => abortError()],
    ]);
    const handler = createInvestmentHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', {
        body: {
            initialInvestment: 1000,
            returnMetrics: { roi: 0.1, cagr: 0.05, irr: 0.05, npv: 100, paybackYear: 2 },
            riskMetrics: { sharpeRatio: 1, sortinoRatio: 1, maxDrawdown: 0.1, annualizedVolatility: 0.2, var95: 10, var99: 20 },
        },
    }), { OPENAI_API_KEY: 'test-key' }));
    const body = await assertErrorEnvelope(res, 504, 'PROVIDER_TIMEOUT');
    assert.equal(body.error.retryable, true);
});

test('investment-analysis: provider rejection (non-ok HTTP) maps to a controlled 502', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => new Response('rate limited upstream', { status: 429 })],
    ]);
    const handler = createInvestmentHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', {
        body: {
            initialInvestment: 1000,
            returnMetrics: { roi: 0.1, cagr: 0.05, irr: 0.05, npv: 100, paybackYear: 2 },
            riskMetrics: { sharpeRatio: 1, sortinoRatio: 1, maxDrawdown: 0.1, annualizedVolatility: 0.2, var95: 10, var99: 20 },
        },
    }), { OPENAI_API_KEY: 'test-key' }));
    const body = await assertErrorEnvelope(res, 502, 'PROVIDER_REJECTED');
    // The raw upstream body must never be forwarded to the client.
    assert.ok(!body.error.message.includes('rate limited upstream'));
});

test('investment-analysis: malformed provider content is classified, not thrown as a raw 500', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'not json' }] }] })],
    ]);
    const handler = createInvestmentHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', {
        body: {
            initialInvestment: 1000,
            returnMetrics: { roi: 0.1, cagr: 0.05, irr: 0.05, npv: 100, paybackYear: 2 },
            riskMetrics: { sharpeRatio: 1, sortinoRatio: 1, maxDrawdown: 0.1, annualizedVolatility: 0.2, var95: 10, var99: 20 },
        },
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 502, 'PROVIDER_REJECTED');
});

// ─────────────────────────────────────────────────────────────────────────
// cashflow-scenario (mirrors investment-analysis; kept to method/config/success/error only)
// ─────────────────────────────────────────────────────────────────────────

function validCashflowBody() {
    const month = (i) => ({ month: `M${i}`, revenue: 100, costs: 50, net: 50, cumulative: 1000 + i * 50 });
    return {
        initialCash: 1000,
        baseProjection: Array.from({ length: 12 }, (_, i) => month(i)),
        scenarios: ['late_payment', 'churn_spike', 'cost_shock'].map((type) => ({
            type,
            title: type,
            monthlyData: Array.from({ length: 12 }, (_, i) => month(i)),
        })),
    };
}

test('cashflow-scenario: GET is rejected with 405 and an Allow header', async () => {
    const handler = createCashflowHandler();
    const res = await handler(ctx(new Request('http://localhost/api/cashflow-scenario', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': nextIp() },
    }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.headers.get('Allow'), 'POST');
    await assertErrorEnvelope(res, 405, 'METHOD_NOT_ALLOWED');
});

test('sample-review: HEAD proves the release blocker without parsing or submitting a form', async () => {
    const handler = createSampleReviewHandler();
    const disabled = await handler(ctx(new Request('http://localhost/api/sample-review', {
        method: 'HEAD',
    }), {}));
    assert.equal(disabled.status, 204);
    assert.equal(disabled.headers.get('Cache-Control'), 'no-store');
    assert.equal(await disabled.text(), '');

    const enabled = await handler(ctx(new Request('http://localhost/api/sample-review', {
        method: 'HEAD',
    }), configuredEnv));
    assert.equal(enabled.status, 409);
});

test('cashflow-scenario: missing OPENAI_API_KEY fails closed with 503 and makes no fetch call', async () => {
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createCashflowHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/cashflow-scenario', { body: validCashflowBody() }), {}));
    await assertErrorEnvelope(res, 503, 'FEATURE_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
});

test('cashflow-scenario: invalid payload shape is rejected with 422', async () => {
    const handler = createCashflowHandler();
    const res = await handler(ctx(jsonRequest('/api/cashflow-scenario', { body: { initialCash: 'nope' } }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 422, 'VALIDATION_FAILED');
});

test('cashflow-scenario: success path returns the mocked narratives and calls only the provider URL', async () => {
    const narratives = { scenarios: [{ type: 'late_payment', narrative: 'n' }] };
    const { fetchImpl, calls } = createFetchRouter([
        ['api.openai.com', () => jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(narratives) }] }] })],
    ]);
    const handler = createCashflowHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/cashflow-scenario', { body: validCashflowBody() }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.deepEqual(body.data, narratives);
    assert.equal(calls.length, 1);
});

test('cashflow-scenario: provider rejection maps to a controlled 502', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => new Response('boom', { status: 500 })],
    ]);
    const handler = createCashflowHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/cashflow-scenario', { body: validCashflowBody() }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 502, 'PROVIDER_REJECTED');
});

// ─────────────────────────────────────────────────────────────────────────
// compass
// ─────────────────────────────────────────────────────────────────────────

function validCompassAnswers() {
    return Array.from({ length: 12 }, (_, i) => ({
        dimension: `dim-${i}`,
        selectedKey: 'a',
        selectedLabel: 'Label',
        customText: '',
    }));
}

test('compass: GET is rejected with 405 and an Allow header', async () => {
    const handler = createCompassHandler();
    const res = await handler(ctx(new Request('http://localhost/api/compass', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': nextIp() },
    }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.headers.get('Allow'), 'POST');
    await assertErrorEnvelope(res, 405, 'METHOD_NOT_ALLOWED');
});

test('compass: missing OPENAI_API_KEY fails closed with 503 and makes no fetch call', async () => {
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createCompassHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/compass', { body: { answers: validCompassAnswers() } }), {}));
    await assertErrorEnvelope(res, 503, 'FEATURE_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
});

test('compass: fewer than 12 answers is rejected with 422', async () => {
    const handler = createCompassHandler();
    const res = await handler(ctx(jsonRequest('/api/compass', { body: { answers: [] } }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 422, 'VALIDATION_FAILED');
});

test('compass: success path streams SSE and calls only the provider URL', async () => {
    function sseStream(events) {
        const encoder = new TextEncoder();
        return new ReadableStream({
            start(controller) {
                for (const evt of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
                controller.close();
            },
        });
    }
    const { fetchImpl, calls } = createFetchRouter([
        ['api.openai.com', () => new Response(
            sseStream([{ type: 'response.output_text.delta', delta: 'Hallo' }, { type: 'response.completed' }]),
            { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        )],
    ]);
    const handler = createCompassHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/compass', { body: { answers: validCompassAnswers() } }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'text/event-stream');
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
    const text = await res.text();
    assert.match(text, /event: delta/);
    assert.match(text, /event: done/);
    assert.equal(calls.length, 1);
});

test('compass: provider rejection maps to a controlled 502', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => new Response('boom', { status: 500 })],
    ]);
    const handler = createCompassHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/compass', { body: { answers: validCompassAnswers() } }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 502, 'PROVIDER_REJECTED');
});

// ─────────────────────────────────────────────────────────────────────────
// chat
// ─────────────────────────────────────────────────────────────────────────

test('chat: GET is rejected with 405 and an Allow header', async () => {
    const handler = createChatHandler();
    const res = await handler(ctx(new Request('http://localhost/api/chat', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': nextIp() },
    }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.headers.get('Allow'), 'POST');
    await assertErrorEnvelope(res, 405, 'METHOD_NOT_ALLOWED');
});

test('chat: missing OPENAI_API_KEY fails closed with 503 and makes no fetch call', async () => {
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', { body: { message: 'hello' } }), {}));
    await assertErrorEnvelope(res, 503, 'FEATURE_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
});

test('chat: empty message is rejected with 422', async () => {
    const handler = createChatHandler();
    const res = await handler(ctx(jsonRequest('/api/chat', { body: { message: '   ' } }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 422, 'VALIDATION_FAILED');
});

test('chat: knowledge base unavailable maps to a controlled 503 (before it is ever cached)', async () => {
    const { fetchImpl } = createFetchRouter([
        ['/corpus.jsonl', () => new Response('nope', { status: 500 })],
    ]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', { body: { message: 'What is your current role?' } }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 503, 'PROVIDER_UNAVAILABLE');
});

test('chat: JD analysis success path returns the mocked verdict and calls corpus + provider only', async () => {
    const corpusLine = JSON.stringify({
        id: 'doc1', url: 'https://example.com/doc1', title: 'Profile', text: 'Experienced engineer.',
        metadata: { type: 'profile', lang: 'en' },
    });
    const verdict = { verdict: 'Strong Match', score: 85, summary: 's', matches: [], transferable: [], gaps: [], recommendation: 'r' };
    const { fetchImpl, calls } = createFetchRouter([
        ['/corpus.jsonl', () => new Response(corpusLine, { status: 200 })],
        ['api.openai.com', () => jsonResponse({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(verdict) }] }] })],
    ]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', {
        body: { message: 'Please review this job description for a senior role.', tab: 'jd' },
    }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.mode, 'job-match');
    assert.deepEqual(JSON.parse(body.data.answer), verdict);
    assert.equal(calls.length, 2);
    assert.ok(calls.some((c) => c.url.includes('/corpus.jsonl')));
    assert.ok(calls.some((c) => new URL(c.url).hostname === 'api.openai.com'));
});

test('chat: JD analysis provider timeout maps to 504 (corpus already warm from the previous test)', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => abortError()],
    ]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', {
        body: { message: 'Please review this job description for a senior role.', tab: 'jd' },
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(res, 504, 'PROVIDER_TIMEOUT');
});

test('chat: explicit fact intent short-circuits to the facts.json answer without calling the LLM', async () => {
    const facts = { contact: { en: { default: 'Reach me by email.', withPhone: 'Call me.' } }, current_role: {}, certifications: {}, skills: {}, projects: {} };
    const { fetchImpl, calls } = createFetchRouter([
        ['/facts.json', () => jsonResponse(facts)],
    ]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', {
        body: { message: 'contact', intent: 'contact', lang: 'en' },
    }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.mode, 'fact');
    assert.equal(body.data.answer, facts.contact.en.default);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes('/facts.json'));
});

test('chat: explicit fact intent still works when no OPENAI_API_KEY is configured at all — deterministic routing precedes the provider gate', async () => {
    // facts.json may already be warm from an earlier test in this file (module-level cache,
    // same pattern as the corpus cache) — the fetch-call count is not asserted here, only
    // that the answer is served and the provider adapter is never invoked.
    const facts = { contact: { en: { default: 'Reach me by email.', withPhone: 'Call me.' } }, current_role: {}, certifications: {}, skills: {}, projects: {} };
    const { fetchImpl, calls } = createFetchRouter([
        ['/facts.json', () => jsonResponse(facts)],
    ]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', {
        body: { message: 'contact', intent: 'contact', lang: 'en' },
    }), {}));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.mode, 'fact');
    assert.equal(body.data.answer, facts.contact.en.default);
    assert.ok(!calls.some((c) => new URL(c.url).hostname === 'api.openai.com'), 'the provider adapter must never be invoked for a deterministic fact answer');
});

test('chat: explicit fact intent still works when AI_CHAT_ENABLED is explicitly disabled', async () => {
    const facts = { contact: { en: { default: 'Reach me by email.', withPhone: 'Call me.' } }, current_role: {}, certifications: {}, skills: {}, projects: {} };
    const { fetchImpl, calls } = createFetchRouter([
        ['/facts.json', () => jsonResponse(facts)],
    ]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', {
        body: { message: 'contact', intent: 'contact', lang: 'en' },
    }), { OPENAI_API_KEY: 'test-key', AI_CHAT_ENABLED: 'false' }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.mode, 'fact');
    assert.ok(!calls.some((c) => new URL(c.url).hostname === 'api.openai.com'), 'the provider adapter must never be invoked for a deterministic fact answer');
});

test('chat: a free-text question with no explicit intent still fails closed with 503 when the provider is not configured (unchanged)', async () => {
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', { body: { message: 'What are your certifications?' } }), {}));
    await assertErrorEnvelope(res, 503, 'FEATURE_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────
// chat: server-side quota (R10.4b) — enforced by hashed IP, independent of any
// client-supplied header. The obsolete opt-in `chat_session` cookie and its
// `X-Cookie-Consent` gate have been removed (post-R10.4b cleanup); these tests
// prove enforcement is identical no matter what a caller sends and that no
// cookie is ever emitted. Requests use a non-localhost host so the deliberate
// local-dev quota bypass (matching compass/cashflow-scenario/investment-analysis)
// does not mask the check.
// ─────────────────────────────────────────────────────────────────────────

const CHAT_CORPUS_LINE = JSON.stringify({
    id: 'doc1', url: 'https://example.com/doc1', title: 'Profile', text: 'Experienced engineer.',
    metadata: { type: 'profile', lang: 'en' },
});
const CHAT_JD_VERDICT = { verdict: 'Strong Match', score: 85, summary: 's', matches: [], transferable: [], gaps: [], recommendation: 'r' };

function chatSseStream(events) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            for (const evt of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
            controller.close();
        },
    });
}

// Single route that answers both the streaming chat call and the non-streaming
// JD-analysis call correctly, distinguishing them by the outbound request body
// (chat sends `stream: true`, JD analysis does not) — mirrors what the real
// OpenAI Responses API endpoint is asked for in each case.
function chatProviderRoute() {
    return ['api.openai.com', (_url, init) => {
        const payload = JSON.parse(init.body);
        if (payload.stream) {
            return new Response(
                chatSseStream([{ type: 'response.output_text.delta', delta: 'Hi' }, { type: 'response.completed' }]),
                { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
            );
        }
        return jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(CHAT_JD_VERDICT) }] }] });
    }];
}

function chatQuotaRouter() {
    return createFetchRouter([
        ['/corpus.jsonl', () => new Response(CHAT_CORPUS_LINE, { status: 200 })],
        chatProviderRoute(),
    ]);
}

// Non-localhost host: the local-dev quota bypass keys off `request.url`, so a
// realistic production/preview hostname is required to exercise enforcement.
function prodChatRequest(ip, { headers = {}, body = { message: 'What is your current role?' } } = {}) {
    return new Request('https://portfolio-astro-2do.pages.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...headers },
        body: JSON.stringify(body),
    });
}

async function assertFourAllowedThenBlocked(consentHeaders) {
    const ip = nextIp();
    const { fetchImpl, calls } = chatQuotaRouter();
    const handler = createChatHandler({ fetchImpl });

    for (let i = 0; i < 4; i++) {
        const res = await handler(ctx(prodChatRequest(ip, { headers: consentHeaders }), { OPENAI_API_KEY: 'test-key' }));
        assert.equal(res.status, 200, `request ${i + 1} should be permitted`);
        assert.equal(res.headers.get('Set-Cookie'), null, `request ${i + 1} must not set a cookie`);
    }

    const providerCallsAfterFour = calls.filter((c) => new URL(c.url).hostname === 'api.openai.com').length;
    assert.equal(providerCallsAfterFour, 4);

    const fifth = await handler(ctx(prodChatRequest(ip, { headers: consentHeaders }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(fifth, 429, 'QUOTA_EXCEEDED');
    assert.equal(fifth.headers.get('Set-Cookie'), null, 'the blocked response must not set a cookie');

    const providerCallsAfterFifth = calls.filter((c) => new URL(c.url).hostname === 'api.openai.com').length;
    assert.equal(providerCallsAfterFifth, 4, 'the fifth request must not reach the provider');
}

test('chat: no X-Cookie-Consent header — 4 questions permitted, 5th blocked, no 5th provider call, no cookie ever set', async () => {
    await assertFourAllowedThenBlocked({});
});

test('chat: X-Cookie-Consent: granted — identical enforcement, no bypass, no cookie set (header is a no-op)', async () => {
    await assertFourAllowedThenBlocked({ 'X-Cookie-Consent': 'granted' });
});

test('chat: X-Cookie-Consent: denied — identical enforcement, no cookie set (header is a no-op)', async () => {
    await assertFourAllowedThenBlocked({ 'X-Cookie-Consent': 'denied' });
});

test('chat: X-Cookie-Consent: arbitrary other value — identical enforcement, no cookie set (header is a no-op)', async () => {
    await assertFourAllowedThenBlocked({ 'X-Cookie-Consent': 'some-other-value' });
});

test('chat: JD analysis quota (1/24h) is independent of the 4-question chat counter', async () => {
    const ip = nextIp();
    const { fetchImpl, calls } = chatQuotaRouter();
    const handler = createChatHandler({ fetchImpl });

    const chat1 = await handler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(chat1.status, 200);

    const jd1 = await handler(ctx(prodChatRequest(ip, {
        body: { message: 'Please review this job description for a senior role.', tab: 'jd' },
    }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(jd1.status, 200);
    assert.equal(jd1.headers.get('Set-Cookie'), null, 'JD analysis success must not set a cookie');
    const jd1Body = await jd1.json();
    assert.deepEqual(JSON.parse(jd1Body.data.answer), CHAT_JD_VERDICT);

    const jd2 = await handler(ctx(prodChatRequest(ip, {
        body: { message: 'Please review this job description for a senior role.', tab: 'jd' },
    }), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(jd2, 429, 'QUOTA_EXCEEDED');

    // Chat counter (q) is unaffected by the JD (jd) counter — a 2nd ordinary
    // question still succeeds even though the JD quota is already exhausted.
    const chat2 = await handler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(chat2.status, 200);

    const providerCalls = calls.filter((c) => new URL(c.url).hostname === 'api.openai.com').length;
    assert.equal(providerCalls, 3, 'the blocked 2nd JD request must not reach the provider');
});

test('chat: independent client IPs get independent quota state', async () => {
    const ipA = nextIp();
    const ipB = nextIp();
    const { fetchImpl } = chatQuotaRouter();
    const handler = createChatHandler({ fetchImpl });

    for (let i = 0; i < 4; i++) {
        const res = await handler(ctx(prodChatRequest(ipA), { OPENAI_API_KEY: 'test-key' }));
        assert.equal(res.status, 200);
    }
    const blockedA = await handler(ctx(prodChatRequest(ipA), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(blockedA, 429, 'QUOTA_EXCEEDED');

    // A different IP is unaffected by IP A's exhausted quota.
    const resB = await handler(ctx(prodChatRequest(ipB), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(resB.status, 200);
});

test('chat: missing OPENAI_API_KEY still fails closed with 503 and does not consume quota', async () => {
    const ip = nextIp();
    const { fetchImpl: unconfiguredFetch, calls: unconfiguredCalls } = createFetchRouter([]);
    const unconfiguredHandler = createChatHandler({ fetchImpl: unconfiguredFetch });

    const res = await unconfiguredHandler(ctx(prodChatRequest(ip), {}));
    await assertErrorEnvelope(res, 503, 'FEATURE_NOT_CONFIGURED');
    assert.equal(unconfiguredCalls.length, 0);

    // Same IP, now configured — the unconfigured attempt above did not burn quota,
    // so this first real request still reports q=1 (the first use), not q=2.
    const { fetchImpl, calls } = chatQuotaRouter();
    const handler = createChatHandler({ fetchImpl });
    const okRes = await handler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(okRes.status, 200);
    const text = await okRes.text();
    const metaLine = text.split('\n').find((l) => l.startsWith('data: ') && l.includes('"quota"'));
    const meta = JSON.parse(metaLine.slice(6));
    assert.equal(meta.quota.q, 1);
    assert.equal(calls.filter((c) => new URL(c.url).hostname === 'api.openai.com').length, 1);
});

test('chat: quota-exceeded rejection preserves the standard envelope, headers and request ID', async () => {
    const ip = nextIp();
    const { fetchImpl, calls } = chatQuotaRouter();
    const handler = createChatHandler({ fetchImpl });

    for (let i = 0; i < 4; i++) {
        await handler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
    }
    const providerCallsBeforeRejection = calls.filter((c) => new URL(c.url).hostname === 'api.openai.com').length;

    const rejected = await handler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
    const body = await assertErrorEnvelope(rejected, 429, 'QUOTA_EXCEEDED');
    assert.equal(body.error.retryable, false);
    assert.equal(calls.filter((c) => new URL(c.url).hostname === 'api.openai.com').length, providerCallsBeforeRejection);
});

test('chat: quota store failure fails open and leaks no internal cache details', async () => {
    const realCaches = globalThis.caches;
    globalThis.caches = { open: async () => { throw new Error('cache unavailable'); } };
    try {
        const ip = nextIp();
        const { fetchImpl } = chatQuotaRouter();
        const logs = [];
        const handler = createChatHandler({ fetchImpl, logSink: (_level, line) => logs.push(JSON.parse(line)) });
        const res = await handler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
        assert.equal(res.status, 200, 'an unavailable quota store must not take the chat feature down');
        const text = await res.text();
        assert.doesNotMatch(text, /chat-quota|__chat_quota|cache unavailable/);
        const terminal = logs.find((event) => event.event === 'request.completed');
        assert.equal(terminal.quotaDecision, 'STATE_UNAVAILABLE_FAIL_OPEN');
        assert.doesNotMatch(JSON.stringify(logs), /chat-quota|__chat_quota|cache unavailable|198\.51\.100\./);
    } finally {
        globalThis.caches = realCaches;
    }
});

test('chat: provider failure (timeout) consumes no quota', async () => {
    const ip = nextIp();
    const { fetchImpl: failingFetch } = createFetchRouter([
        ['/corpus.jsonl', () => new Response(CHAT_CORPUS_LINE, { status: 200 })],
        ['api.openai.com', () => abortError()],
    ]);
    const failingHandler = createChatHandler({ fetchImpl: failingFetch });
    const failed = await failingHandler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
    await assertErrorEnvelope(failed, 504, 'PROVIDER_TIMEOUT');

    // Same IP against a working provider — the failed attempt above did not burn
    // quota, so this first real request still reports q=1, not q=2.
    const { fetchImpl, calls } = chatQuotaRouter();
    const handler = createChatHandler({ fetchImpl });
    const okRes = await handler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(okRes.status, 200);
    const text = await okRes.text();
    const metaLine = text.split('\n').find((l) => l.startsWith('data: ') && l.includes('"quota"'));
    const meta = JSON.parse(metaLine.slice(6));
    assert.equal(meta.quota.q, 1);
    assert.equal(calls.filter((c) => new URL(c.url).hostname === 'api.openai.com').length, 1);
});

test('chat: successful responses never echo the raw client IP, an IP hash or an internal cache key', async () => {
    const ip = nextIp();
    const { fetchImpl } = chatQuotaRouter();
    const handler = createChatHandler({ fetchImpl });

    const chatRes = await handler(ctx(prodChatRequest(ip), { OPENAI_API_KEY: 'test-key' }));
    const chatText = await chatRes.text();
    assert.doesNotMatch(chatText, /198\.51\.100\.|__chat_quota|chat-quota/);

    const jdRes = await handler(ctx(prodChatRequest(ip, {
        body: { message: 'Please review this job description for a senior role.', tab: 'jd' },
    }), { OPENAI_API_KEY: 'test-key' }));
    const jdBody = await jdRes.json();
    assert.doesNotMatch(JSON.stringify(jdBody), /198\.51\.100\.|__chat_quota|chat-quota/);
});

test('chat: ChatWidget no longer sends the obsolete X-Cookie-Consent header (no remaining legitimate chat purpose)', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(new URL('../src/components/ChatWidget.astro', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /X-Cookie-Consent/i);
});

// ─────────────────────────────────────────────────────────────────────────
// sample-review
// ─────────────────────────────────────────────────────────────────────────

function sampleReviewFormData(overrides = {}) {
    const fields = {
        name: 'Test User',
        company: 'Test Co',
        workEmail: 'test@example.com',
        dataType: 'Andere',
        targetUseCase: 'Noch unklar',
        estimatedVolume: 'Kleines Paket',
        privacyConsent: 'on',
        website: '',
        submittedAt: String(Date.now() - 2000),
        ...overrides,
    };
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return form;
}

function sampleReviewRequest({ formData, headers = {}, accept = 'application/json' } = {}) {
    return new Request('http://localhost/api/sample-review', {
        method: 'POST',
        body: formData ?? sampleReviewFormData(),
        headers: { Accept: accept, 'CF-Connecting-IP': nextIp(), ...headers },
    });
}

const configuredEnv = {
    SAMPLE_REVIEW_ENABLED: 'true',
    RESEND_API_KEY: 'test-resend-key',
    SAMPLE_REVIEW_EMAIL_FROM: 'from@example.com',
    SAMPLE_REVIEW_EMAIL_TO: 'to@example.com',
};

test('sample-review: GET is rejected with 405 and an Allow header', async () => {
    const handler = createSampleReviewHandler();
    const res = await handler(ctx(new Request('http://localhost/api/sample-review', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': nextIp() },
    }), configuredEnv));
    assert.equal(res.headers.get('Allow'), 'POST, HEAD');
    await assertErrorEnvelope(res, 405, 'METHOD_NOT_ALLOWED');
});

test('sample-review: missing email configuration fails closed with 503 and makes no Resend call (the R3.6 regression)', async () => {
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createSampleReviewHandler({ fetchImpl });
    const res = await handler(ctx(sampleReviewRequest(), { SAMPLE_REVIEW_ENABLED: 'true' }));
    await assertErrorEnvelope(res, 503, 'FEATURE_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
});

test('sample-review: partially missing configuration (key present, recipients absent) still fails closed with 503', async () => {
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createSampleReviewHandler({ fetchImpl });
    const res = await handler(ctx(sampleReviewRequest(), {
        SAMPLE_REVIEW_ENABLED: 'true',
        RESEND_API_KEY: 'k',
        SAMPLE_REVIEW_EMAIL_FROM: 'f@example.com',
        SAMPLE_REVIEW_EMAIL_TO: '',
    }));
    await assertErrorEnvelope(res, 503, 'FEATURE_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
});

test('sample-review: missing configuration with an HTML-accepting client renders the honest unavailable card, not a 500', async () => {
    const handler = createSampleReviewHandler();
    const res = await handler(ctx(sampleReviewRequest({ accept: 'text/html' }), {}));
    assert.equal(res.status, 503);
    assert.match(res.headers.get('Content-Type'), /text\/html/);
    const html = await res.text();
    assert.match(html, /nicht verfügbar/);
    assert.ok(!html.includes('RESEND_API_KEY'));
});

test('sample-review: wrong media type is rejected with 415 when configured', async () => {
    const handler = createSampleReviewHandler();
    const res = await handler(ctx(new Request('http://localhost/api/sample-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'CF-Connecting-IP': nextIp() },
        body: '{}',
    }), configuredEnv));
    await assertErrorEnvelope(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
});

test('sample-review: missing required fields are rejected with 422 and no Resend call', async () => {
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createSampleReviewHandler({ fetchImpl });
    const res = await handler(ctx(sampleReviewRequest({ formData: sampleReviewFormData({ workEmail: '' }) }), configuredEnv));
    const body = await assertErrorEnvelope(res, 422, 'VALIDATION_FAILED');
    assert.ok(body.error.fields.includes('workEmail'));
    assert.equal(calls.length, 0);
});

test('sample-review: invalid email format is rejected with 422', async () => {
    const handler = createSampleReviewHandler();
    const res = await handler(ctx(sampleReviewRequest({ formData: sampleReviewFormData({ workEmail: 'not-an-email' }) }), configuredEnv));
    await assertErrorEnvelope(res, 422, 'VALIDATION_FAILED');
});

test('sample-review: honeypot field trips a vague rejection without tipping off the bot', async () => {
    const handler = createSampleReviewHandler();
    const res = await handler(ctx(sampleReviewRequest({ formData: sampleReviewFormData({ website: 'http://spam.example' }) }), configuredEnv));
    const body = await assertErrorEnvelope(res, 422, 'VALIDATION_FAILED');
    assert.doesNotMatch(body.error.message.toLowerCase(), /honeypot|bot|spam/);
});

test('sample-review: hostile Origin is rejected with 403', async () => {
    const handler = createSampleReviewHandler();
    const res = await handler(ctx(sampleReviewRequest({ headers: { Origin: 'https://evil.example.com' } }), configuredEnv));
    await assertErrorEnvelope(res, 403, 'ORIGIN_REJECTED');
});

test('sample-review: success path calls Resend exactly once and returns the redirect target', async () => {
    const { fetchImpl, calls } = createFetchRouter([
        ['api.resend.com', () => jsonResponse({ id: 'email_123' })],
    ]);
    const handler = createSampleReviewHandler({ fetchImpl });
    const res = await handler(ctx(sampleReviewRequest(), configuredEnv));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.redirectTo, '/sample-struktur-pruefen/danke');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /api\.resend\.com/);
});

test('sample-review: Resend rejection maps to a controlled 502 without leaking the provider body', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.resend.com', () => new Response('invalid domain: from@example.com not verified', { status: 422 })],
    ]);
    const handler = createSampleReviewHandler({ fetchImpl });
    const res = await handler(ctx(sampleReviewRequest(), configuredEnv));
    const body = await assertErrorEnvelope(res, 502, 'PROVIDER_UNAVAILABLE');
    assert.ok(!body.error.message.includes('not verified'));
});

test('sample-review: Resend timeout maps to 504', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.resend.com', () => abortError()],
    ]);
    const handler = createSampleReviewHandler({ fetchImpl });
    const res = await handler(ctx(sampleReviewRequest(), configuredEnv));
    await assertErrorEnvelope(res, 504, 'PROVIDER_TIMEOUT');
});

test('sample-review: an injected custom email provider is used instead of the default Resend adapter', async () => {
    let sent = null;
    const emailProvider = { async send(message) { sent = message; } };
    const { fetchImpl, calls } = createFetchRouter([]);
    const handler = createSampleReviewHandler({ fetchImpl, emailProvider });
    const res = await handler(ctx(sampleReviewRequest(), configuredEnv));
    assert.equal(res.status, 200);
    assert.equal(calls.length, 0);
    assert.ok(sent);
    assert.equal(sent.replyTo, 'test@example.com');
});
