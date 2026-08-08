// Permanent deterministic provider-contract suite for the R10.3b/R7.2 Responses API migration.
// Covers: request-builder truth (model/reasoning/verbosity/ceiling/store), transport shape,
// one-call/no-retry/no-fallback behavior, the Responses SSE decoder, and a source-level
// architecture guard against regressing to Chat Completions or an unapproved model.
//
// No test resolves or contacts api.openai.com — every provider interaction goes through an
// injected fetchImpl (tests/helpers/fetch-router.mjs) or synthetic fixtures fed directly to
// the shared decoder/extraction functions in functions/_lib/responses.ts.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { installFakeCaches } from './helpers/fake-caches.mjs';
import { createFetchRouter, jsonResponse, abortError } from './helpers/fetch-router.mjs';
import { AI_PRIVACY_NOTICE_VERSION } from '../functions/_lib/ai-privacy-notice.ts';

installFakeCaches();

const { createHandler: createChatHandler, buildChatRequestBody, CHAT_MODEL, CHAT_REASONING_EFFORT, CHAT_TEXT_VERBOSITY, CHAT_MAX_OUTPUT_TOKENS } =
    await import('../functions/api/chat.ts');
const { createHandler: createCompassHandler, buildCompassRequestBody, COMPASS_MODEL, COMPASS_REASONING_EFFORT, COMPASS_TEXT_VERBOSITY, COMPASS_MAX_OUTPUT_TOKENS } =
    await import('../functions/api/compass.ts');
const { createHandler: createCashflowHandler, buildCashflowRequestBody, CASHFLOW_MODEL, CASHFLOW_MAX_OUTPUT_TOKENS, CASHFLOW_SCHEMA_NAME } =
    await import('../functions/api/cashflow-scenario.ts');
const { createHandler: createInvestmentHandler, buildInvestmentRequestBody, INVESTMENT_MODEL, INVESTMENT_MAX_OUTPUT_TOKENS, INVESTMENT_SCHEMA_NAME } =
    await import('../functions/api/investment-analysis.ts');
const { RESPONSES_API_URL, ResponsesSSEDecoder, extractResponsesOutcome, parseStructuredJSON } =
    await import('../functions/_lib/responses.ts');

let ipCounter = 100;
function nextIp() {
    ipCounter += 1;
    return `203.0.113.${ipCounter % 250}`;
}

function jsonRequest(url, { method = 'POST', body, headers = {} } = {}) {
    const mergedBody = body === undefined
        ? undefined
        : { privacyConsent: true, privacyNoticeVersion: AI_PRIVACY_NOTICE_VERSION, ...body };
    return new Request(`http://localhost${url}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': nextIp(), ...headers },
        body: mergedBody === undefined ? undefined : JSON.stringify(mergedBody),
    });
}
function ctx(request, env = {}) {
    return { request, env };
}

const SAMPLE_INPUT = [
    { role: 'developer', content: 'You are a test.' },
    { role: 'user', content: 'Hello.' },
];

// ─────────────────────────────────────────────────────────────────────────
// 1. Request-builder truth — inspects the actual production builders, not a
//    parallel reimplementation of the expected request.
// ─────────────────────────────────────────────────────────────────────────

function assertCommonShape(body, { model, effort, verbosity, ceiling, stream }) {
    assert.equal(body.model, model);
    assert.deepEqual(body.reasoning, { effort });
    assert.equal(body.text.verbosity, verbosity);
    assert.equal(body.max_output_tokens, ceiling);
    assert.equal(body.store, false, 'store must be explicitly false');
    if (stream) {
        assert.equal(body.stream, true);
    } else {
        assert.equal(body.stream, undefined, 'non-streaming endpoints must not set stream');
    }
    assert.equal(body.previous_response_id, undefined);
    assert.equal(body.conversation, undefined);
    assert.equal(body.tools, undefined);
    assert.equal(body.user, undefined, 'no caller/application user id may be sent');
}

test('chat: request builder matches the approved policy exactly (gpt-5.6-terra, low/medium, 2500, streaming)', () => {
    const body = buildChatRequestBody(SAMPLE_INPUT, { stream: true });
    assertCommonShape(body, { model: 'gpt-5.6-terra', effort: 'low', verbosity: 'medium', ceiling: 2500, stream: true });
    assert.equal(CHAT_MODEL, 'gpt-5.6-terra');
    assert.equal(CHAT_REASONING_EFFORT, 'low');
    assert.equal(CHAT_TEXT_VERBOSITY, 'medium');
    assert.equal(CHAT_MAX_OUTPUT_TOKENS, 2500);
});

test('chat: request builder for JD analysis (non-streaming) carries the same model/ceiling, no stream flag', () => {
    const body = buildChatRequestBody(SAMPLE_INPUT, { stream: false });
    assertCommonShape(body, { model: 'gpt-5.6-terra', effort: 'low', verbosity: 'medium', ceiling: 2500, stream: false });
});

test('compass: request builder matches the approved policy exactly (gpt-5.6-sol, high/high, 8000, streaming)', () => {
    const body = buildCompassRequestBody(SAMPLE_INPUT);
    assertCommonShape(body, { model: 'gpt-5.6-sol', effort: 'high', verbosity: 'high', ceiling: 8000, stream: true });
    assert.equal(COMPASS_MODEL, 'gpt-5.6-sol');
    assert.equal(COMPASS_REASONING_EFFORT, 'high');
    assert.equal(COMPASS_TEXT_VERBOSITY, 'high');
    assert.equal(COMPASS_MAX_OUTPUT_TOKENS, 8000);
});

test('cashflow-scenario: request builder matches the approved policy exactly (gpt-5.6-terra, medium/medium, 4500, non-streaming, strict schema)', () => {
    const body = buildCashflowRequestBody(SAMPLE_INPUT);
    assertCommonShape(body, { model: 'gpt-5.6-terra', effort: 'medium', verbosity: 'medium', ceiling: 4500, stream: false });
    assert.equal(CASHFLOW_MODEL, 'gpt-5.6-terra');
    assert.equal(CASHFLOW_MAX_OUTPUT_TOKENS, 4500);
    const format = body.text.format;
    assert.equal(format.type, 'json_schema');
    assert.equal(format.name, CASHFLOW_SCHEMA_NAME);
    assert.equal(format.strict, true);
    assert.equal(format.schema.additionalProperties, false);
    assert.ok(Array.isArray(format.schema.required));
});

test('investment-analysis: request builder matches the approved policy exactly (gpt-5.6-sol, medium/medium, 5000, non-streaming, strict schema)', () => {
    const body = buildInvestmentRequestBody(SAMPLE_INPUT);
    assertCommonShape(body, { model: 'gpt-5.6-sol', effort: 'medium', verbosity: 'medium', ceiling: 5000, stream: false });
    assert.equal(INVESTMENT_MODEL, 'gpt-5.6-sol');
    assert.equal(INVESTMENT_MAX_OUTPUT_TOKENS, 5000);
    const format = body.text.format;
    assert.equal(format.type, 'json_schema');
    assert.equal(format.name, INVESTMENT_SCHEMA_NAME);
    assert.equal(format.strict, true);
    assert.equal(format.schema.additionalProperties, false);
    assert.ok(Array.isArray(format.schema.required));
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Transport shape via the real handler — URL, auth header placement, one
//    call per accepted operation, zero calls after rejection.
// ─────────────────────────────────────────────────────────────────────────

function validCashflowBody() {
    const month = (i) => ({ month: `M${i}`, revenue: 100, costs: 50, net: 50, cumulative: 1000 + i * 50 });
    return {
        initialCash: 1000,
        baseProjection: Array.from({ length: 12 }, (_, i) => month(i)),
        scenarios: ['late_payment', 'churn_spike', 'cost_shock'].map((type) => ({
            type, title: type, monthlyData: Array.from({ length: 12 }, (_, i) => month(i)),
        })),
    };
}
function validInvestmentBody() {
    return {
        initialInvestment: 1000,
        returnMetrics: { roi: 0.1, cagr: 0.05, irr: 0.05, npv: 100, paybackYear: 2 },
        riskMetrics: { sharpeRatio: 1, sortinoRatio: 1, maxDrawdown: 0.1, annualizedVolatility: 0.2, var95: 10, var99: 20 },
    };
}
function validCompassBody() {
    return { answers: Array.from({ length: 12 }, (_, i) => ({ dimension: `dim-${i}`, selectedKey: 'a', selectedLabel: 'L', customText: '' })) };
}
function structuredCompletedResponse(data) {
    return jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }] });
}
function ssePayload(events) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            for (const evt of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
            controller.close();
        },
    });
}

test('cashflow-scenario: exactly one call, hits /v1/responses, Authorization carries the key and only there', async () => {
    const { fetchImpl, calls } = createFetchRouter([
        ['api.openai.com', () => structuredCompletedResponse({ scenarios: [{ type: 'late_payment', narrative: 'n' }] })],
    ]);
    const handler = createCashflowHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/cashflow-scenario', { body: validCashflowBody() }), { OPENAI_API_KEY: 'sk-secret-test' }));
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, RESPONSES_API_URL);
    assert.equal(calls[0].init.headers.Authorization, 'Bearer sk-secret-test');
    const body = await res.json();
    assert.doesNotMatch(JSON.stringify(body), /sk-secret-test/);
});

test('investment-analysis: exactly one call, hits /v1/responses, Authorization carries the key and only there', async () => {
    const { fetchImpl, calls } = createFetchRouter([
        ['api.openai.com', () => structuredCompletedResponse({ summary: 's', strengths: 'st', risks: 'r', recommendation: 'rec' })],
    ]);
    const handler = createInvestmentHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/investment-analysis', { body: validInvestmentBody() }), { OPENAI_API_KEY: 'sk-secret-test' }));
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, RESPONSES_API_URL);
    assert.equal(calls[0].init.headers.Authorization, 'Bearer sk-secret-test');
});

test('compass: exactly one call, hits /v1/responses with stream:true in the request body', async () => {
    const { fetchImpl, calls } = createFetchRouter([
        ['api.openai.com', () => new Response(ssePayload([{ type: 'response.output_text.delta', delta: 'Hi' }, { type: 'response.completed' }]), {
            status: 200, headers: { 'Content-Type': 'text/event-stream' },
        })],
    ]);
    const handler = createCompassHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/compass', { body: validCompassBody() }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, RESPONSES_API_URL);
    const sentBody = JSON.parse(calls[0].init.body);
    assert.equal(sentBody.stream, true);
    assert.equal(sentBody.store, false);
});

test('chat: exactly one call for a streaming turn, hits /v1/responses with stream:true and store:false', async () => {
    const { fetchImpl, calls } = createFetchRouter([
        ['/corpus.jsonl', () => new Response('', { status: 200 })],
        ['api.openai.com', () => new Response(ssePayload([{ type: 'response.output_text.delta', delta: 'Hi' }, { type: 'response.completed' }]), {
            status: 200, headers: { 'Content-Type': 'text/event-stream' },
        })],
    ]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', { body: { message: 'What is your current role?' } }), { OPENAI_API_KEY: 'test-key' }));
    assert.equal(res.status, 200);
    const providerCalls = calls.filter((c) => c.url === RESPONSES_API_URL);
    assert.equal(providerCalls.length, 1);
    const sentBody = JSON.parse(providerCalls[0].init.body);
    assert.equal(sentBody.stream, true);
    assert.equal(sentBody.store, false);
});

// ─────────────────────────────────────────────────────────────────────────
// 3. No fallback, no retry — a provider rejection results in exactly one
//    outbound call, never a second attempt against a different model.
// ─────────────────────────────────────────────────────────────────────────

for (const [name, makeHandler, makeReq, env] of [
    ['cashflow-scenario', createCashflowHandler, () => jsonRequest('/api/cashflow-scenario', { body: validCashflowBody() }), { OPENAI_API_KEY: 'k' }],
    ['investment-analysis', createInvestmentHandler, () => jsonRequest('/api/investment-analysis', { body: validInvestmentBody() }), { OPENAI_API_KEY: 'k' }],
]) {
    test(`${name}: a provider 5xx results in exactly one call — no automatic retry or fallback model`, async () => {
        const { fetchImpl, calls } = createFetchRouter([['api.openai.com', () => new Response('boom', { status: 500 })]]);
        const handler = makeHandler({ fetchImpl });
        const res = await handler(ctx(makeReq(), env));
        assert.equal(res.status, 502);
        assert.equal(calls.length, 1);
    });

    test(`${name}: a malformed structured-output body fails safely as 502, still exactly one call`, async () => {
        const { fetchImpl, calls } = createFetchRouter([['api.openai.com', () => jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'not-json' }] }] })]]);
        const handler = makeHandler({ fetchImpl });
        const res = await handler(ctx(makeReq(), env));
        assert.equal(res.status, 502);
        assert.equal(calls.length, 1);
    });

    test(`${name}: a refusal outcome fails safely as 502, never as a 200 with the refusal text as data`, async () => {
        const { fetchImpl, calls } = createFetchRouter([['api.openai.com', () => jsonResponse({
            status: 'completed',
            output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'I cannot help with that.' }] }],
        })]]);
        const handler = makeHandler({ fetchImpl });
        const res = await handler(ctx(makeReq(), env));
        assert.equal(res.status, 502);
        const body = await res.json();
        assert.doesNotMatch(JSON.stringify(body), /I cannot help with that/);
        assert.equal(calls.length, 1);
    });

    test(`${name}: an incomplete outcome (max_output_tokens reached) fails safely as 502, not as a truncated 200`, async () => {
        const { fetchImpl, calls } = createFetchRouter([['api.openai.com', () => jsonResponse({
            status: 'incomplete',
            incomplete_details: { reason: 'max_output_tokens' },
            output: [],
        })]]);
        const handler = makeHandler({ fetchImpl });
        const res = await handler(ctx(makeReq(), env));
        assert.equal(res.status, 502);
        assert.equal(calls.length, 1);
    });

    test(`${name}: provider timeout maps to 504 with exactly one attempt`, async () => {
        const { fetchImpl, calls } = createFetchRouter([['api.openai.com', () => abortError()]]);
        const handler = makeHandler({ fetchImpl });
        const res = await handler(ctx(makeReq(), env));
        assert.equal(res.status, 504);
        assert.equal(calls.length, 1);
    });
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Responses SSE decoder — unit tests against synthetic byte chunks only.
// ─────────────────────────────────────────────────────────────────────────

const enc = new TextEncoder();

test('SSE decoder: a single event split across multiple chunks is reassembled correctly', () => {
    const decoder = new ResponsesSSEDecoder();
    const full = `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'Hello world' })}\n\n`;
    const mid = Math.floor(full.length / 2);
    const events1 = decoder.push(enc.encode(full.slice(0, mid)));
    assert.deepEqual(events1, []);
    const events2 = decoder.push(enc.encode(full.slice(mid)));
    assert.deepEqual(events2, [{ type: 'delta', text: 'Hello world' }]);
});

test('SSE decoder: multiple events in a single chunk are all emitted, in order', () => {
    const decoder = new ResponsesSSEDecoder();
    const chunk =
        `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'A' })}\n\n` +
        `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'B' })}\n\n` +
        `data: ${JSON.stringify({ type: 'response.completed' })}\n\n`;
    const events = decoder.push(enc.encode(chunk));
    assert.deepEqual(events, [{ type: 'delta', text: 'A' }, { type: 'delta', text: 'B' }, { type: 'completed' }]);
});

test('SSE decoder: CRLF line endings are handled identically to LF', () => {
    const decoder = new ResponsesSSEDecoder();
    const chunk = `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'X' })}\r\n\r\n`;
    assert.deepEqual(decoder.push(enc.encode(chunk)), [{ type: 'delta', text: 'X' }]);
});

test('SSE decoder: UTF-8 multi-byte characters split across chunk boundaries decode correctly', () => {
    const decoder = new ResponsesSSEDecoder();
    const full = `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'Grüße 你好 €' })}\n\n`;
    const bytes = enc.encode(full);
    const splitPoint = Math.floor(bytes.length / 2);
    const events1 = decoder.push(bytes.slice(0, splitPoint));
    const events2 = decoder.push(bytes.slice(splitPoint));
    assert.deepEqual([...events1, ...events2], [{ type: 'delta', text: 'Grüße 你好 €' }]);
});

test('SSE decoder: blank lines and comment/keepalive lines are ignored', () => {
    const decoder = new ResponsesSSEDecoder();
    const chunk = `: keepalive\n\n\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'Y' })}\n\n`;
    assert.deepEqual(decoder.push(enc.encode(chunk)), [{ type: 'delta', text: 'Y' }]);
});

test('SSE decoder: an `event:` metadata line alongside `data:` does not produce a duplicate or spurious event', () => {
    const decoder = new ResponsesSSEDecoder();
    const chunk = `event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'Z' })}\n\n`;
    assert.deepEqual(decoder.push(enc.encode(chunk)), [{ type: 'delta', text: 'Z' }]);
});

test('SSE decoder: malformed JSON in a data line is skipped without breaking the stream', () => {
    const decoder = new ResponsesSSEDecoder();
    const chunk = `data: {not valid json\n\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'ok' })}\n\n`;
    assert.deepEqual(decoder.push(enc.encode(chunk)), [{ type: 'delta', text: 'ok' }]);
});

test('SSE decoder: an unknown non-terminal event type is ignored safely', () => {
    const decoder = new ResponsesSSEDecoder();
    const chunk =
        `data: ${JSON.stringify({ type: 'response.in_progress' })}\n\n` +
        `data: ${JSON.stringify({ type: 'response.output_item.added' })}\n\n` +
        `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'ok' })}\n\n`;
    assert.deepEqual(decoder.push(enc.encode(chunk)), [{ type: 'delta', text: 'ok' }]);
});

test('SSE decoder: response.failed, response.incomplete, refusal and error are classified as terminal, distinct kinds', () => {
    const decoder = new ResponsesSSEDecoder();
    assert.deepEqual(
        decoder.push(enc.encode(`data: ${JSON.stringify({ type: 'response.failed', response: { error: { message: 'boom' } } })}\n\n`)),
        [{ type: 'failed', reason: 'boom' }],
    );
    const decoder2 = new ResponsesSSEDecoder();
    assert.deepEqual(
        decoder2.push(enc.encode(`data: ${JSON.stringify({ type: 'response.incomplete', response: { incomplete_details: { reason: 'max_output_tokens' } } })}\n\n`)),
        [{ type: 'incomplete', reason: 'max_output_tokens' }],
    );
    const decoder3 = new ResponsesSSEDecoder();
    assert.deepEqual(decoder3.push(enc.encode(`data: ${JSON.stringify({ type: 'response.refusal.done' })}\n\n`)), [{ type: 'refusal' }]);
    const decoder4 = new ResponsesSSEDecoder();
    assert.deepEqual(decoder4.push(enc.encode(`data: ${JSON.stringify({ type: 'error', message: 'upstream broke' })}\n\n`)), [{ type: 'failed', reason: 'upstream broke' }]);
});

test('SSE decoder: a final unterminated buffer (no trailing newline) is still parsed on flush()', () => {
    const decoder = new ResponsesSSEDecoder();
    const noTrailingNewline = `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'tail' })}`;
    assert.deepEqual(decoder.push(enc.encode(noTrailingNewline)), []);
    assert.deepEqual(decoder.flush(), [{ type: 'delta', text: 'tail' }]);
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Chat/Compass streaming behavior at the handler level — truncation,
//    refusal and failure must never surface as a silent client-facing success.
// ─────────────────────────────────────────────────────────────────────────

test('compass: a stream that ends without response.completed fails as event: error, not event: done', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => new Response(ssePayload([{ type: 'response.output_text.delta', delta: 'partial' }]), {
            status: 200, headers: { 'Content-Type': 'text/event-stream' },
        })],
    ]);
    const handler = createCompassHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/compass', { body: validCompassBody() }), { OPENAI_API_KEY: 'test-key' }));
    const text = await res.text();
    assert.match(text, /event: error/);
    assert.doesNotMatch(text, /event: done/);
});

test('compass: a refusal event during streaming fails as event: error and never leaks provider text', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => new Response(ssePayload([{ type: 'response.refusal.done' }]), {
            status: 200, headers: { 'Content-Type': 'text/event-stream' },
        })],
    ]);
    const handler = createCompassHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/compass', { body: validCompassBody() }), { OPENAI_API_KEY: 'test-key' }));
    const text = await res.text();
    assert.match(text, /event: error/);
});

test('compass: a normal multi-delta stream reconstructs to the concatenated text and ends with event: done', async () => {
    const { fetchImpl } = createFetchRouter([
        ['api.openai.com', () => new Response(ssePayload([
            { type: 'response.output_text.delta', delta: 'Der ' },
            { type: 'response.output_text.delta', delta: 'Gründer-Archetyp' },
            { type: 'response.completed' },
        ]), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })],
    ]);
    const handler = createCompassHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/compass', { body: validCompassBody() }), { OPENAI_API_KEY: 'test-key' }));
    const text = await res.text();
    const deltas = [...text.matchAll(/event: delta\ndata: (\{.*\})/g)].map((m) => JSON.parse(m[1]).text);
    assert.equal(deltas.join(''), 'Der Gründer-Archetyp');
    assert.match(text, /event: done/);
    assert.doesNotMatch(text, /response\.output_text|response\.completed/, 'no raw OpenAI event name should reach the client');
});

test('chat: no OpenAI response ID, reasoning item or provider object ever reaches the SSE stream', async () => {
    const { fetchImpl } = createFetchRouter([
        ['/corpus.jsonl', () => new Response('', { status: 200 })],
        ['api.openai.com', () => new Response(ssePayload([
            { type: 'response.created', response: { id: 'resp_secret_internal_id' } },
            { type: 'response.output_text.delta', delta: 'Hi there' },
            { type: 'response.completed' },
        ]), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })],
    ]);
    const handler = createChatHandler({ fetchImpl });
    const res = await handler(ctx(jsonRequest('/api/chat', { body: { message: 'What is your current role?' } }), { OPENAI_API_KEY: 'test-key' }));
    const text = await res.text();
    assert.doesNotMatch(text, /resp_secret_internal_id/);
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Structured-output extraction helpers — direct unit coverage.
// ─────────────────────────────────────────────────────────────────────────

test('extractResponsesOutcome: classifies completed, refusal, incomplete, failed and malformed shapes', () => {
    assert.deepEqual(
        extractResponsesOutcome({ output: [{ type: 'message', content: [{ type: 'output_text', text: '{"a":1}' }] }] }),
        { kind: 'completed', text: '{"a":1}' },
    );
    assert.deepEqual(
        extractResponsesOutcome({ output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }),
        { kind: 'refusal', refusal: 'no' },
    );
    assert.deepEqual(
        extractResponsesOutcome({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [] }),
        { kind: 'incomplete', reason: 'max_output_tokens' },
    );
    assert.deepEqual(
        extractResponsesOutcome({ status: 'failed', error: { message: 'nope' } }),
        { kind: 'failed', reason: 'nope' },
    );
    assert.deepEqual(extractResponsesOutcome({ output: [] }), { kind: 'malformed' });
    assert.deepEqual(extractResponsesOutcome(null), { kind: 'malformed' });
    assert.deepEqual(extractResponsesOutcome('a string'), { kind: 'malformed' });
});

test('parseStructuredJSON: accepts a JSON object, rejects arrays/primitives/invalid JSON', () => {
    assert.deepEqual(parseStructuredJSON('{"a":1}'), { ok: true, data: { a: 1 } });
    assert.deepEqual(parseStructuredJSON('[1,2,3]'), { ok: false });
    assert.deepEqual(parseStructuredJSON('null'), { ok: false });
    assert.deepEqual(parseStructuredJSON('not json'), { ok: false });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Architecture regression guard — inspects production source, not fixtures.
// ─────────────────────────────────────────────────────────────────────────

const PRODUCTION_FILES = [
    '../functions/api/chat.ts',
    '../functions/api/compass.ts',
    '../functions/api/cashflow-scenario.ts',
    '../functions/api/investment-analysis.ts',
    '../functions/_lib/responses.ts',
];

function readProdSource(relPath) {
    return readFileSync(new URL(relPath, import.meta.url), 'utf8');
}

test('architecture guard: no production Function references a legacy Chat/Completions URL', () => {
    for (const file of PRODUCTION_FILES) {
        const source = readProdSource(file);
        assert.doesNotMatch(source, /\/v1\/chat\/completions/, `${file} must not reference Chat Completions`);
        assert.doesNotMatch(source, /\/v1\/completions[^/]/, `${file} must not reference legacy Completions`);
    }
});

test('architecture guard: no production Function parses a legacy `choices[...]` shape', () => {
    for (const file of PRODUCTION_FILES) {
        const source = readProdSource(file);
        assert.doesNotMatch(source, /choices\s*[?.]?\[/, `${file} must not parse Chat Completions choices[]`);
        assert.doesNotMatch(source, /\.choices\./, `${file} must not parse Chat Completions choices.`);
    }
});

test('architecture guard: no production Function references an unapproved or unsuffixed model', () => {
    for (const file of PRODUCTION_FILES) {
        const source = readProdSource(file);
        assert.doesNotMatch(source, /gpt-4\.1-mini/i, `${file} must not reference gpt-4.1-mini`);
        assert.doesNotMatch(source, /\bo4-mini\b/, `${file} must not reference o4-mini`);
        // An unsuffixed "gpt-5.6" (not followed by -terra/-sol/-luna) would be the bare alias.
        assert.doesNotMatch(source, /gpt-5\.6(?!-(terra|sol|luna))/, `${file} must not use the unsuffixed gpt-5.6 alias`);
    }
});

test('architecture guard: no production Function references Conversations state or previous_response_id', () => {
    for (const file of PRODUCTION_FILES) {
        const source = readProdSource(file);
        assert.doesNotMatch(source, /previous_response_id/, `${file} must not use previous_response_id`);
        assert.doesNotMatch(source, /\/v1\/conversations/, `${file} must not use the Conversations API`);
    }
});

test('architecture guard: the shared transport unconditionally sets store:false and never reads a caller-supplied store field', () => {
    const source = readProdSource('../functions/_lib/responses.ts');
    assert.match(source, /store:\s*false/, 'store: false must be present as a literal');
    assert.doesNotMatch(source, /params\.store/, 'store must not be settable from the request params');
});

test('architecture guard: every endpoint model matches the approved matrix exactly', () => {
    assert.equal(CHAT_MODEL, 'gpt-5.6-terra');
    assert.equal(COMPASS_MODEL, 'gpt-5.6-sol');
    assert.equal(CASHFLOW_MODEL, 'gpt-5.6-terra');
    assert.equal(INVESTMENT_MODEL, 'gpt-5.6-sol');
});

test('architecture guard: every endpoint calls exactly the approved Responses API URL', () => {
    assert.equal(RESPONSES_API_URL, 'https://api.openai.com/v1/responses');
});
