import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { installFakeCaches } from './helpers/fake-caches.mjs';
import { createFetchRouter } from './helpers/fetch-router.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
installFakeCaches();

const loadContext = () => import('../functions/_lib/operational-context.ts');
const loadErrors = () => import('../functions/_lib/operational-errors.ts');
const loadFeatures = () => import('../functions/_lib/feature-controls.ts');
const loadLogger = () => import('../functions/_lib/operational-logger.ts');
const loadHttp = () => import('../functions/_lib/http.ts');

test('request context uses one generated ID, stable route/method values, release identity, and no request data', async () => {
  const { createOperationalRequestContext } = await loadContext();
  const request = new Request('https://example.test/api/chat?secret=QUERY_CANARY', {
    method: 'POST',
    headers: {
      'CF-Ray': 'CLOUD_REQUEST_CANARY',
      'X-Request-ID': 'SPOOFED_REQUEST_CANARY',
      Cookie: 'COOKIE_CANARY',
      Authorization: 'AUTH_CANARY',
    },
    body: 'BODY_CANARY',
  });
  const context = createOperationalRequestContext(request, '/api/chat', {
    releaseId: 'git-0123456789abcdef',
    requestIdFactory: () => '11111111-1111-4111-8111-111111111111',
    monotonicNow: () => 42.25,
  });

  assert.deepEqual(context, {
    requestId: '11111111-1111-4111-8111-111111111111',
    route: '/api/chat',
    method: 'POST',
    releaseId: 'git-0123456789abcdef',
    startedAtMonotonicMs: 42.25,
  });
  assert.doesNotMatch(JSON.stringify(context), /CANARY|example\.test|secret=/);
});

test('operational failure taxonomy is complete, explicit, and exposes only safe static mappings', async () => {
  const { OPERATIONAL_FAILURES } = await loadErrors();
  const expected = [
    'CLIENT_INPUT',
    'INVALID_JSON',
    'METHOD_NOT_ALLOWED',
    'ORIGIN_REJECTED',
    'PRIVACY_CONSENT_REQUIRED',
    'BODY_TOO_LARGE',
    'UNSUPPORTED_MEDIA_TYPE',
    'QUOTA_REJECTED',
    'FEATURE_DISABLED',
    'CONFIGURATION_MISSING',
    'CONFIGURATION_INVALID',
    'PROVIDER_TIMEOUT',
    'PROVIDER_RATE_LIMITED',
    'PROVIDER_REFUSED',
    'PROVIDER_MALFORMED',
    'PROVIDER_UNAVAILABLE',
    'CLIENT_ABORTED',
    'INTERNAL_FAILURE',
  ];
  assert.deepEqual(Object.keys(OPERATIONAL_FAILURES).sort(), expected.sort());
  for (const [errorClass, mapping] of Object.entries(OPERATIONAL_FAILURES)) {
    assert.ok(Number.isInteger(mapping.publicStatus), `${errorClass} status`);
    assert.match(mapping.publicCode, /^[A-Z_]+$/);
    assert.equal(mapping.messagePolicy, 'SAFE_STATIC');
    assert.ok(['info', 'warn', 'error'].includes(mapping.level));
    assert.equal(typeof mapping.retryable, 'boolean');
    assert.equal(typeof mapping.providerCalled, 'boolean');
    assert.match(mapping.providerOutcome, /^[A-Z_]+$/);
    assert.match(mapping.quotaDecision, /^[A-Z_]+$/);
    assert.equal(Object.hasOwn(mapping, 'message'), false);
    assert.equal(Object.hasOwn(mapping, 'stack'), false);
    assert.equal(Object.hasOwn(mapping, 'cause'), false);
  }
});

test('feature controls preserve approved defaults, normalize narrow booleans, and fail closed on invalid values', async () => {
  const { FEATURE_CONTROLS, readFeatureControl } = await loadFeatures();
  assert.deepEqual(FEATURE_CONTROLS, {
    AI_CHAT_ENABLED: true,
    AI_COMPASS_ENABLED: true,
    AI_CASHFLOW_ENABLED: true,
    AI_INVESTMENT_ENABLED: true,
    SAMPLE_REVIEW_ENABLED: false,
  });
  for (const name of Object.keys(FEATURE_CONTROLS)) {
    assert.equal(readFeatureControl({}, name).enabled, FEATURE_CONTROLS[name]);
    for (const value of ['true', '1', 'on', ' TRUE ', 'On']) {
      assert.deepEqual(readFeatureControl({ [name]: value }, name), { enabled: true, state: 'ENABLED' });
    }
    for (const value of ['false', '0', 'off', ' FALSE ', 'Off']) {
      assert.deepEqual(readFeatureControl({ [name]: value }, name), { enabled: false, state: 'DISABLED' });
    }
    assert.deepEqual(readFeatureControl({ [name]: 'yes-please' }, name), {
      enabled: false,
      state: 'INVALID',
    });
  }
});

test('logger emits one-line JSON rebuilt from the allowlist and omits arbitrary or sensitive values', async () => {
  const { emitOperationalEvent, OPERATIONAL_LOG_FIELDS } = await loadLogger();
  const lines = [];
  const canaries = [
    'PROMPT_CANARY',
    'OUTPUT_CANARY',
    'EMAIL_CANARY@example.invalid',
    '+49-PHONE-CANARY',
    'CV_JD_CANARY',
    'SALARY_123456_CANARY',
    'INVESTMENT_987654_CANARY',
    '203.0.113.77',
    'HASHED_IDENTIFIER_CANARY',
    'COOKIE_CANARY',
    'AUTHORIZATION_CANARY',
    'PROVIDER_ERROR_CANARY',
    'resp_PROVIDER_ID_CANARY',
    '/home/USER/PATH_CANARY',
  ];
  const event = {
    event: 'request.completed',
    level: 'info',
    requestId: '11111111-1111-4111-8111-111111111111',
    route: '/api/chat',
    method: 'POST',
    status: 200,
    durationMs: 12,
    releaseId: 'git-0123456789abcdef',
    quotaDecision: 'ALLOWED',
    providerOutcome: 'SUCCEEDED',
    prompt: canaries[0],
    nested: Object.fromEntries(canaries.map((value, index) => [`x${index}`, value])),
    error: new Error(canaries[11]),
  };

  assert.doesNotThrow(() => emitOperationalEvent(event, (_level, line) => lines.push(line)));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].split('\n').length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(parsed).filter((key) => !OPERATIONAL_LOG_FIELDS.includes(key)), []);
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.event, 'request.completed');
  assert.equal(parsed.requestId, event.requestId);
  for (const canary of canaries) assert.doesNotMatch(lines[0], new RegExp(canary.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('logger failure is swallowed and never recursively serializes the original event', async () => {
  const { emitOperationalEvent } = await loadLogger();
  const event = {
    event: 'request.completed',
    level: 'error',
    requestId: '11111111-1111-4111-8111-111111111111',
    route: '/api/health',
    method: 'GET',
    status: 500,
    durationMs: 1,
    releaseId: 'git-0123456789abcdef',
    errorClass: 'INTERNAL_FAILURE',
  };
  let calls = 0;
  assert.doesNotThrow(() => emitOperationalEvent(event, () => {
    calls += 1;
    throw new Error('LOGGER_FAILURE_CANARY');
  }));
  assert.equal(calls, 1);
});

test('malformed telemetry uses bounded unknowns and never attributes failure to a real route', async () => {
  const { emitOperationalEvent } = await loadLogger();
  const lines = [];
  const malformed = {
    event: 'EVENT_CANARY',
    level: 'LEVEL_CANARY',
    requestId: 'REQUEST_ID_CANARY',
    route: '/api/health?ROUTE_CANARY',
    method: 'METHOD_CANARY',
    durationMs: Number.NaN,
    releaseId: 'RELEASE_CANARY',
    unknownField: 'UNKNOWN_FIELD_CANARY',
  };
  assert.doesNotThrow(() => emitOperationalEvent(malformed, (_level, line) => lines.push(JSON.parse(line))));
  assert.equal(lines.length, 1);
  assert.deepEqual(
    {
      event: lines[0].event,
      level: lines[0].level,
      requestId: lines[0].requestId,
      route: lines[0].route,
      method: lines[0].method,
      releaseId: lines[0].releaseId,
      durationMs: lines[0].durationMs,
      unknownField: lines[0].unknownField,
    },
    {
      event: 'telemetry.invalid',
      level: 'error',
      requestId: 'unknown',
      route: 'unknown',
      method: 'OTHER',
      releaseId: 'unknown',
      durationMs: undefined,
      unknownField: undefined,
    },
  );
  assert.doesNotMatch(JSON.stringify(lines), /CANARY|\/api\/health/);
});

test('invalid numeric telemetry becomes one fixed marker while unknown keys are ignored', async () => {
  const { emitOperationalEvent } = await loadLogger();
  const base = {
    event: 'request.completed',
    level: 'info',
    requestId: '123e4567-e89b-42d3-a456-426614174000',
    route: '/api/health',
    method: 'GET',
    releaseId: 'git-0123456789abcdef',
  };
  const lines = [];
  emitOperationalEvent({ ...base, durationMs: Number.POSITIVE_INFINITY }, (_level, line) => lines.push(JSON.parse(line)));
  emitOperationalEvent({ ...base, unknownField: 'CANARY' }, (_level, line) => lines.push(JSON.parse(line)));
  assert.equal(lines[0].event, 'telemetry.invalid');
  assert.equal(lines[0].route, 'unknown');
  assert.equal(lines[1].event, 'request.completed');
  assert.equal(lines[1].unknownField, undefined);
  assert.doesNotMatch(JSON.stringify(lines), /CANARY|Infinity/);
});

test('application quota and provider 429 remain operationally distinct', async () => {
  const { OPERATIONAL_FAILURES } = await loadErrors();
  assert.deepEqual(
    {
      errorClass: 'QUOTA_REJECTED',
      providerOutcome: OPERATIONAL_FAILURES.QUOTA_REJECTED.providerOutcome,
      providerCalled: OPERATIONAL_FAILURES.QUOTA_REJECTED.providerCalled,
      quotaDecision: OPERATIONAL_FAILURES.QUOTA_REJECTED.quotaDecision,
    },
    {
      errorClass: 'QUOTA_REJECTED',
      providerOutcome: 'NOT_CALLED',
      providerCalled: false,
      quotaDecision: 'REJECTED_LIMIT',
    },
  );
  assert.deepEqual(
    {
      errorClass: 'PROVIDER_RATE_LIMITED',
      providerOutcome: OPERATIONAL_FAILURES.PROVIDER_RATE_LIMITED.providerOutcome,
      providerCalled: OPERATIONAL_FAILURES.PROVIDER_RATE_LIMITED.providerCalled,
      quotaDecision: OPERATIONAL_FAILURES.PROVIDER_RATE_LIMITED.quotaDecision,
    },
    {
      errorClass: 'PROVIDER_RATE_LIMITED',
      providerOutcome: 'RATE_LIMITED',
      providerCalled: true,
      quotaDecision: 'NOT_APPLICABLE',
    },
  );
});

test('completion wrapper shares the response request ID and emits exactly one terminal event', async () => {
  const { createOperationalHandler, getOperationalState } = await loadContext();
  const { jsonSuccess } = await loadHttp();
  const lines = [];
  const handler = createOperationalHandler('/api/health', async ({ request }) => {
    const state = getOperationalState(request);
    return jsonSuccess({ status: 'ok' }, state.context.requestId);
  }, {
    releaseId: 'git-0123456789abcdef',
    requestIdFactory: () => '11111111-1111-4111-8111-111111111111',
    monotonicNow: (() => {
      const values = [10, 14];
      return () => values.shift() ?? 14;
    })(),
    logSink: (_level, line) => lines.push(JSON.parse(line)),
  });

  const response = await handler({ request: new Request('https://example.test/api/health'), env: {} });
  const body = await response.json();
  assert.equal(body.requestId, '11111111-1111-4111-8111-111111111111');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].event, 'request.completed');
  assert.equal(lines[0].requestId, body.requestId);
  assert.equal(lines[0].releaseId, 'git-0123456789abcdef');
  assert.equal(lines[0].status, 200);
  assert.equal(lines[0].durationMs, 4);
});

test('completion wrapper normalizes an uncaught exception without logging its message or stack', async () => {
  const { createOperationalHandler } = await loadContext();
  const lines = [];
  const handler = createOperationalHandler('/api/health', async () => {
    throw new Error('THROWN_SECRET_CANARY');
  }, {
    releaseId: 'git-0123456789abcdef',
    requestIdFactory: () => '11111111-1111-4111-8111-111111111111',
    logSink: (_level, line) => lines.push(line),
  });
  const response = await handler({ request: new Request('https://example.test/api/health'), env: {} });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(body.requestId, '11111111-1111-4111-8111-111111111111');
  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /THROWN_SECRET_CANARY|stack|\/home\//);
});

test('stream completion is logged once after consumption without buffering or changing bytes', async () => {
  const { createOperationalHandler, getOperationalState, recordProviderOutcome } = await loadContext();
  const lines = [];
  const expected = 'event: delta\ndata: {"text":"hello"}\n\nevent: done\ndata: {}\n\n';
  const handler = createOperationalHandler('/api/chat', async ({ request }) => {
    const state = getOperationalState(request);
    recordProviderOutcome(state, {
      modelTier: 'terra',
      providerOutcome: 'SUCCEEDED',
      providerDurationMs: 3,
      timeToFirstOutputMs: 2,
      streamOutcome: 'COMPLETED',
    });
    return new Response(expected, { headers: { 'Content-Type': 'text/event-stream' } });
  }, {
    releaseId: 'git-0123456789abcdef',
    requestIdFactory: () => '11111111-1111-4111-8111-111111111111',
    logSink: (_level, line) => lines.push(JSON.parse(line)),
  });
  const response = await handler({
    request: new Request('https://example.test/api/chat', { method: 'POST', body: '{}' }),
    env: {},
  });
  assert.equal(lines.length, 0, 'stream must not be logged complete before consumption');
  assert.equal(await response.text(), expected);
  assert.equal(lines.filter((event) => event.event === 'request.completed').length, 1);
  assert.equal(lines.filter((event) => event.event === 'provider.completed').length, 1);
});

test('all endpoint switches reject disabled and invalid values before provider or quota work', async () => {
  const endpointCases = [
    {
      path: '/api/chat',
      module: '../functions/api/chat.ts',
      flag: 'AI_CHAT_ENABLED',
      body: { message: 'PROMPT_CANARY' },
    },
    {
      path: '/api/compass',
      module: '../functions/api/compass.ts',
      flag: 'AI_COMPASS_ENABLED',
      body: {
        answers: Array.from({ length: 12 }, (_, index) => ({
          dimension: `d${index}`, selectedKey: 'a', selectedLabel: 'A', customText: 'CV_JD_CANARY',
        })),
      },
    },
    {
      path: '/api/cashflow-scenario',
      module: '../functions/api/cashflow-scenario.ts',
      flag: 'AI_CASHFLOW_ENABLED',
      body: { initialCash: 123456, baseProjection: [], scenarios: [] },
    },
    {
      path: '/api/investment-analysis',
      module: '../functions/api/investment-analysis.ts',
      flag: 'AI_INVESTMENT_ENABLED',
      body: { initialInvestment: 987654, returnMetrics: {}, riskMetrics: {} },
    },
  ];
  const originalCaches = globalThis.caches;
  globalThis.caches = { open: async () => { throw new Error('QUOTA_TOUCHED_CANARY'); } };
  try {
    for (const item of endpointCases) {
      const { createHandler } = await import(item.module);
      for (const [value, code] of [['false', 'FEATURE_DISABLED'], ['invalid-value', 'CONFIGURATION_INVALID']]) {
        const { fetchImpl, calls } = createFetchRouter([]);
        const logs = [];
        const handler = createHandler({
          fetchImpl,
          logSink: (_level, line) => logs.push(line),
          releaseId: 'git-0123456789abcdef',
        });
        const response = await handler({
          request: new Request(`https://example.test${item.path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.77' },
            body: JSON.stringify(item.body),
          }),
          env: { OPENAI_API_KEY: 'test-key', [item.flag]: value },
        });
        const body = await response.json();
        assert.equal(response.status, 503, `${item.path} ${value}`);
        assert.equal(body.error.code, code, `${item.path} ${value}`);
        assert.equal(calls.length, 0, `${item.path} ${value} provider calls`);
        assert.equal(logs.length, 1, `${item.path} ${value} terminal events`);
        assert.doesNotMatch(logs[0], /CANARY|AI_[A-Z_]+/);
      }
    }
  } finally {
    globalThis.caches = originalCaches;
  }
});

test('Sample Review defaults disabled; explicit enable without transport config stays controlled and no-egress', async () => {
  const { createHandler } = await import('../functions/api/sample-review.ts');
  for (const [env, code] of [
    [{}, 'FEATURE_DISABLED'],
    [{ SAMPLE_REVIEW_ENABLED: 'false' }, 'FEATURE_DISABLED'],
    [{ SAMPLE_REVIEW_ENABLED: 'not-valid' }, 'CONFIGURATION_INVALID'],
    [{ SAMPLE_REVIEW_ENABLED: 'true' }, 'FEATURE_NOT_CONFIGURED'],
  ]) {
    const { fetchImpl, calls } = createFetchRouter([]);
    const logs = [];
    const handler = createHandler({
      fetchImpl,
      logSink: (_level, line) => logs.push(line),
      releaseId: 'git-0123456789abcdef',
    });
    const response = await handler({
      request: new Request('https://example.test/api/sample-review', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(),
      }),
      env,
    });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.error.code, code);
    assert.equal(calls.length, 0);
    assert.equal(logs.length, 1);
  }
});

test('health remains operationally wrapped and never exposes feature-switch state', async () => {
  const { createHandler } = await import('../functions/api/health.ts');
  const logs = [];
  const handler = createHandler({
    releaseIdentity: {
      schemaVersion: 1,
      releaseId: 'git-0123456789abcdef',
      sourceRevision: 'a'.repeat(40),
    },
    logSink: (_level, line) => logs.push(line),
  });
  const response = await handler({
    request: new Request('https://example.test/api/health'),
    env: {
      AI_CHAT_ENABLED: 'false',
      AI_COMPASS_ENABLED: 'false',
      SAMPLE_REVIEW_ENABLED: 'true',
    },
  });
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(text, /AI_CHAT_ENABLED|AI_COMPASS_ENABLED|SAMPLE_REVIEW_ENABLED|feature/i);
  assert.equal(logs.length, 1);
});

test('shared provider boundary records safe outcomes and validated aggregate usage only', async () => {
  const { createOperationalHandler, getOperationalState } = await loadContext();
  const { jsonError, jsonSuccess } = await loadHttp();
  const { callResponses, extractResponsesOutcome } = await import('../functions/_lib/responses.ts');
  const cases = [
    {
      response: new Response(JSON.stringify({
        id: 'resp_PROVIDER_ID_CANARY',
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'OUTPUT_CANARY' }] }],
        usage: { input_tokens: 3, output_tokens: 4, total_tokens: 7 },
      }), { headers: { 'Content-Type': 'application/json' } }),
      outcome: 'SUCCEEDED',
      tokens: [3, 4, 7],
    },
    {
      response: new Response(JSON.stringify({
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'REFUSAL_CANARY' }] }],
      }), { headers: { 'Content-Type': 'application/json' } }),
      outcome: 'REFUSED',
    },
    {
      response: new Response(JSON.stringify({
        status: 'completed',
        output: [],
        usage: { input_tokens: -1, output_tokens: Number.NaN, total_tokens: 2.5 },
      }), { headers: { 'Content-Type': 'application/json' } }),
      outcome: 'MALFORMED',
    },
    {
      response: new Response('PROVIDER_ERROR_CANARY', { status: 429 }),
      outcome: 'RATE_LIMITED',
    },
  ];

  for (const item of cases) {
    const logs = [];
    const handler = createOperationalHandler('/api/cashflow-scenario', async ({ request }) => {
      const state = getOperationalState(request);
      const upstream = await callResponses(
        async () => item.response.clone(),
        'AUTHORIZATION_CANARY',
        { input: 'PROMPT_CANARY' },
        100,
        { state, modelTier: 'terra' },
      );
      if (!upstream.ok) {
        await upstream.text();
        return jsonError(502, 'PROVIDER_REJECTED', 'Provider unavailable.', state.context.requestId);
      }
      const outcome = extractResponsesOutcome(await upstream.json(), state);
      return outcome.kind === 'completed'
        ? jsonSuccess({ accepted: true }, state.context.requestId)
        : jsonError(502, 'PROVIDER_REJECTED', 'Provider unavailable.', state.context.requestId);
    }, {
      releaseId: 'git-0123456789abcdef',
      logSink: (_level, line) => logs.push(JSON.parse(line)),
    });
    const response = await handler({
      request: new Request('https://example.test/api/cashflow-scenario?query=QUERY_CANARY', {
        method: 'POST',
        headers: { Cookie: 'COOKIE_CANARY', Authorization: 'HEADER_AUTH_CANARY' },
        body: 'CV_JD_SALARY_INVESTMENT_PHONE_EMAIL_IP_HASH_CANARY',
      }),
      env: {},
    });
    await response.text();
    const provider = logs.find((event) => event.event === 'provider.completed');
    assert.equal(provider.providerOutcome, item.outcome);
    assert.equal(provider.modelTier, 'terra');
    assert.ok(Number.isInteger(provider.providerDurationMs));
    if (item.tokens) {
      assert.deepEqual(
        [provider.inputTokens, provider.outputTokens, provider.totalTokens],
        item.tokens,
      );
    } else {
      assert.equal(provider.inputTokens, undefined);
      assert.equal(provider.outputTokens, undefined);
      assert.equal(provider.totalTokens, undefined);
    }
    assert.equal(logs.filter((event) => event.event === 'request.completed').length, 1);
    assert.doesNotMatch(
      JSON.stringify(logs),
      /CANARY|example\.test|query=|output_text|response\.completed/i,
    );
  }
});

test('shared provider timeout is classified without logging the thrown error', async () => {
  const { createOperationalHandler, getOperationalState } = await loadContext();
  const { classifyProviderFailure } = await loadHttp();
  const { callResponses } = await import('../functions/_lib/responses.ts');
  const logs = [];
  const handler = createOperationalHandler('/api/investment-analysis', async ({ request }) => {
    const state = getOperationalState(request);
    try {
      await callResponses(
        async () => {
          throw Object.assign(new Error('PROVIDER_TIMEOUT_ERROR_CANARY'), { name: 'AbortError' });
        },
        'AUTHORIZATION_CANARY',
        { input: 'PROMPT_CANARY' },
        100,
        { state, modelTier: 'sol' },
      );
      throw new Error('unreachable');
    } catch (error) {
      return classifyProviderFailure(error, state.context.requestId);
    }
  }, {
    releaseId: 'git-0123456789abcdef',
    logSink: (_level, line) => logs.push(JSON.parse(line)),
  });
  const response = await handler({
    request: new Request('https://example.test/api/investment-analysis', { method: 'POST' }),
    env: {},
  });
  const body = await response.json();
  assert.equal(response.status, 504);
  assert.equal(body.error.code, 'PROVIDER_TIMEOUT');
  assert.equal(logs.find((event) => event.event === 'provider.completed').providerOutcome, 'TIMED_OUT');
  assert.equal(logs.find((event) => event.event === 'request.completed').errorClass, 'PROVIDER_TIMEOUT');
  assert.doesNotMatch(JSON.stringify(logs), /CANARY|stack|cause|message/);
});

test('every supported quota decision is terminal metadata without a subject identifier', async () => {
  const {
    createOperationalHandler,
    getOperationalState,
    recordQuotaDecision,
  } = await loadContext();
  const { jsonSuccess } = await loadHttp();
  for (const decision of [
    'NOT_APPLICABLE',
    'ALLOWED',
    'REJECTED_LIMIT',
    'REJECTED_COOLDOWN',
    'BYPASSED_LOCAL',
    'STATE_UNAVAILABLE_FAIL_OPEN',
  ]) {
    const logs = [];
    const handler = createOperationalHandler('/api/chat', async ({ request }) => {
      const state = getOperationalState(request);
      recordQuotaDecision(state, decision);
      return jsonSuccess({ accepted: true }, state.context.requestId);
    }, {
      releaseId: 'git-0123456789abcdef',
      logSink: (_level, line) => logs.push(JSON.parse(line)),
    });
    const response = await handler({
      request: new Request('https://example.test/api/chat', {
        method: 'POST',
        headers: { 'CF-Connecting-IP': '203.0.113.77', Cookie: 'QUOTA_SUBJECT_CANARY' },
      }),
      env: {},
    });
    await response.text();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].quotaDecision, decision);
    assert.doesNotMatch(JSON.stringify(logs), /203\.0\.113\.77|QUOTA_SUBJECT_CANARY|cacheKey|subject/i);
  }
});

test('stream instrumentation measures first output and completion without changing SSE bytes', async () => {
  const {
    createOperationalHandler,
    getOperationalState,
    startProviderCall,
  } = await loadContext();
  const { ResponsesSSEDecoder } = await import('../functions/_lib/responses.ts');
  const logs = [];
  const providerFrames = [
    'data: {"type":"response.output_text.delta","delta":"hello"}\n\n',
    'data: {"type":"response.completed","response":{"usage":{"input_tokens":2,"output_tokens":1,"total_tokens":3}}}\n\n',
  ].join('');
  const publicFrames = 'event: delta\ndata: {"text":"hello"}\n\nevent: done\ndata: {}\n\n';
  const monotonicNow = (() => {
    const values = [10, 12, 15, 18];
    return () => values.shift() ?? 18;
  })();
  const handler = createOperationalHandler('/api/chat', async ({ request }) => {
    const state = getOperationalState(request);
    startProviderCall(state, 'terra');
    const decoder = new ResponsesSSEDecoder(state);
    decoder.push(new TextEncoder().encode(providerFrames));
    return new Response(publicFrames, { headers: { 'Content-Type': 'text/event-stream' } });
  }, {
    releaseId: 'git-0123456789abcdef',
    monotonicNow,
    logSink: (_level, line) => logs.push(JSON.parse(line)),
  });
  const response = await handler({
    request: new Request('https://example.test/api/chat', { method: 'POST' }),
    env: {},
  });
  assert.equal(logs.length, 0);
  assert.equal(await response.text(), publicFrames);
  const provider = logs.find((event) => event.event === 'provider.completed');
  assert.equal(provider.providerOutcome, 'SUCCEEDED');
  assert.equal(provider.streamOutcome, 'COMPLETED');
  assert.equal(provider.timeToFirstOutputMs, 5);
  assert.equal(provider.providerDurationMs, 6);
  assert.deepEqual([provider.inputTokens, provider.outputTokens, provider.totalTokens], [2, 1, 3]);
  assert.equal(logs.filter((event) => event.event === 'request.completed').length, 1);
});

test('stream cancellation records one aborted provider and one terminal request event', async () => {
  const {
    createOperationalHandler,
    getOperationalState,
    startProviderCall,
  } = await loadContext();
  const logs = [];
  const handler = createOperationalHandler('/api/chat', async ({ request }) => {
    startProviderCall(getOperationalState(request), 'terra');
    return new Response(new ReadableStream({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode('event: delta\ndata: {"text":"x"}\n\n'));
      },
    }), { headers: { 'Content-Type': 'text/event-stream' } });
  }, {
    releaseId: 'git-0123456789abcdef',
    logSink: (_level, line) => logs.push(JSON.parse(line)),
  });
  const response = await handler({
    request: new Request('https://example.test/api/chat', { method: 'POST' }),
    env: {},
  });
  const reader = response.body.getReader();
  await reader.read();
  await reader.cancel();
  assert.equal(logs.filter((event) => event.event === 'provider.completed').length, 1);
  assert.equal(logs.find((event) => event.event === 'provider.completed').providerOutcome, 'ABORTED');
  assert.equal(logs.find((event) => event.event === 'provider.completed').streamOutcome, 'CLIENT_ABORTED');
  assert.equal(logs.filter((event) => event.event === 'request.completed').length, 1);
});

test('production Function source contains no unmanaged console calls outside the logger boundary', () => {
  const root = path.join(ROOT, 'functions');
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.name.endsWith('.ts')) files.push(absolute);
    }
  };
  visit(root);

  const violations = [];
  for (const file of files) {
    if (file.endsWith(`${path.sep}operational-logger.ts`)) continue;
    const source = readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const inspect = (node) => {
      if (
        ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && node.expression.expression.text === 'console'
        && ['log', 'info', 'warn', 'error', 'debug'].includes(node.expression.name.text)
      ) {
        violations.push(`${path.relative(ROOT, file)}:${ast.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
      ts.forEachChild(node, inspect);
    };
    inspect(ast);
  }
  assert.deepEqual(violations, []);
});
