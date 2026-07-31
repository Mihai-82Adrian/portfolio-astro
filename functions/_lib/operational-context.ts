import { RELEASE_IDENTITY } from '../_generated/release-identity.ts';
import { BASE_JSON_HEADERS } from './contracts.ts';
import {
    OPERATIONAL_FAILURES,
    type OperationalErrorClass,
    type ProviderOutcome,
    type QuotaDecision,
} from './operational-errors.ts';
import {
    emitOperationalEvent,
    type ModelTier,
    type OperationalLogSink,
    type OperationalRoute,
    type StreamOutcome,
} from './operational-logger.ts';

export interface OperationalRequestContext {
    requestId: string;
    route: OperationalRoute;
    method: string;
    releaseId: string;
    startedAtMonotonicMs: number;
}

interface ProviderState {
    called: boolean;
    modelTier: ModelTier;
    providerOutcome: ProviderOutcome;
    startedAtMs?: number;
    providerDurationMs?: number;
    timeToFirstOutputMs?: number;
    streamOutcome: StreamOutcome;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}

export interface OperationalState {
    context: OperationalRequestContext;
    quotaDecision: QuotaDecision;
    errorClass?: OperationalErrorClass;
    provider: ProviderState;
    monotonicNow: () => number;
    logSink?: OperationalLogSink;
    finalized: boolean;
}

interface RequestContextOptions {
    releaseId?: string;
    requestIdFactory?: () => string;
    monotonicNow?: () => number;
}

export interface OperationalHandlerOptions extends RequestContextOptions {
    logSink?: OperationalLogSink;
}

const REQUEST_STATES = new WeakMap<Request, OperationalState>();
const RESPONSE_FAILURES = new WeakMap<Response, OperationalErrorClass>();
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

export function createOperationalRequestContext(
    request: Request,
    route: OperationalRoute,
    options: RequestContextOptions = {},
): OperationalRequestContext {
    const monotonicNow = options.monotonicNow ?? (() => performance.now());
    const method = request.method.toUpperCase();
    return {
        requestId: (options.requestIdFactory ?? (() => crypto.randomUUID()))(),
        route,
        method: METHODS.has(method) ? method : 'OTHER',
        releaseId: options.releaseId ?? RELEASE_IDENTITY.releaseId,
        startedAtMonotonicMs: monotonicNow(),
    };
}

export function getOperationalState(request: Request): OperationalState {
    const state = REQUEST_STATES.get(request);
    if (!state) throw new Error('Operational request context is unavailable.');
    return state;
}

export function recordResponseFailure(response: Response, errorClass: OperationalErrorClass): void {
    RESPONSE_FAILURES.set(response, errorClass);
}

export function recordFailure(state: OperationalState, errorClass: OperationalErrorClass): void {
    state.errorClass = errorClass;
}

export function recordQuotaDecision(state: OperationalState, quotaDecision: QuotaDecision): void {
    state.quotaDecision = quotaDecision;
}

export function startProviderCall(state: OperationalState, modelTier: ModelTier): void {
    state.provider.called = true;
    state.provider.modelTier = modelTier;
    state.provider.providerOutcome = 'FAILED';
    state.provider.startedAtMs = state.monotonicNow();
}

export function recordProviderHttpResponse(state: OperationalState, status: number): void {
    if (state.provider.startedAtMs !== undefined) {
        state.provider.providerDurationMs = state.monotonicNow() - state.provider.startedAtMs;
    }
    if (status === 429) {
        state.provider.providerOutcome = 'RATE_LIMITED';
        state.errorClass = 'PROVIDER_RATE_LIMITED';
    } else if (status < 200 || status >= 300) {
        state.provider.providerOutcome = 'FAILED';
        state.errorClass = 'PROVIDER_UNAVAILABLE';
    }
}

export function recordProviderOutcome(
    state: OperationalState,
    outcome: {
        modelTier?: ModelTier;
        providerOutcome: ProviderOutcome;
        providerDurationMs?: number;
        timeToFirstOutputMs?: number;
        streamOutcome?: StreamOutcome;
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
    },
): void {
    if (state.finalized) return;
    state.provider.called = outcome.providerOutcome !== 'NOT_CALLED';
    if (outcome.modelTier) state.provider.modelTier = outcome.modelTier;
    state.provider.providerOutcome = outcome.providerOutcome;
    if (outcome.providerDurationMs !== undefined) {
        state.provider.providerDurationMs = outcome.providerDurationMs;
    } else if (state.provider.startedAtMs !== undefined && outcome.providerOutcome !== 'NOT_CALLED') {
        state.provider.providerDurationMs = state.monotonicNow() - state.provider.startedAtMs;
    }
    if (outcome.timeToFirstOutputMs !== undefined) state.provider.timeToFirstOutputMs = outcome.timeToFirstOutputMs;
    if (outcome.streamOutcome) state.provider.streamOutcome = outcome.streamOutcome;
    for (const field of ['inputTokens', 'outputTokens', 'totalTokens'] as const) {
        const value = outcome[field];
        if (Number.isSafeInteger(value) && value! >= 0) state.provider[field] = value;
    }
    const errorByOutcome: Partial<Record<ProviderOutcome, OperationalErrorClass>> = {
        TIMED_OUT: 'PROVIDER_TIMEOUT',
        RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
        REFUSED: 'PROVIDER_REFUSED',
        MALFORMED: 'PROVIDER_MALFORMED',
        ABORTED: 'CLIENT_ABORTED',
        FAILED: 'PROVIDER_UNAVAILABLE',
    };
    if (errorByOutcome[outcome.providerOutcome]) state.errorClass = errorByOutcome[outcome.providerOutcome];
}

export function recordProviderUsage(
    state: OperationalState,
    usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
): void {
    for (const field of ['inputTokens', 'outputTokens', 'totalTokens'] as const) {
        const value = usage[field];
        if (Number.isSafeInteger(value) && value! >= 0) state.provider[field] = value;
    }
}

export function recordFirstProviderOutput(state: OperationalState): void {
    if (state.finalized) return;
    if (state.provider.timeToFirstOutputMs === undefined) {
        state.provider.timeToFirstOutputMs = state.monotonicNow() - state.context.startedAtMonotonicMs;
    }
}

function internalFailureResponse(state: OperationalState): Response {
    state.errorClass = 'INTERNAL_FAILURE';
    return new Response(JSON.stringify({
        ok: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred.',
            retryable: true,
        },
        requestId: state.context.requestId,
    }), { status: 500, headers: BASE_JSON_HEADERS });
}

function finish(state: OperationalState, status: number): void {
    if (state.finalized) return;
    state.finalized = true;
    const failure = state.errorClass ? OPERATIONAL_FAILURES[state.errorClass] : undefined;
    const durationMs = state.monotonicNow() - state.context.startedAtMonotonicMs;
    const base = {
        requestId: state.context.requestId,
        route: state.context.route,
        method: state.context.method,
        releaseId: state.context.releaseId,
    };
    if (state.provider.called) {
        emitOperationalEvent({
            ...base,
            event: 'provider.completed',
            level: state.provider.providerOutcome === 'SUCCEEDED' ? 'info'
                : state.provider.providerOutcome === 'RATE_LIMITED' || state.provider.providerOutcome === 'REFUSED'
                    || state.provider.providerOutcome === 'ABORTED' ? 'warn' : 'error',
            modelTier: state.provider.modelTier,
            providerOutcome: state.provider.providerOutcome,
            providerDurationMs: state.provider.providerDurationMs,
            timeToFirstOutputMs: state.provider.timeToFirstOutputMs,
            streamOutcome: state.provider.streamOutcome,
            inputTokens: state.provider.inputTokens,
            outputTokens: state.provider.outputTokens,
            totalTokens: state.provider.totalTokens,
        }, state.logSink);
    }
    emitOperationalEvent({
        ...base,
        event: 'request.completed',
        level: failure?.level ?? (status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'),
        status,
        durationMs,
        modelTier: state.provider.modelTier,
        providerOutcome: state.provider.providerOutcome,
        quotaDecision: state.quotaDecision,
        errorClass: state.errorClass,
        retryable: failure?.retryable,
    }, state.logSink);
}

function wrapStream(response: Response, state: OperationalState): Response {
    const reader = response.body!.getReader();
    const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
            try {
                const result = await reader.read();
                if (result.done) {
                    finish(state, response.status);
                    controller.close();
                } else {
                    controller.enqueue(result.value);
                }
            } catch {
                recordProviderOutcome(state, { providerOutcome: 'FAILED', streamOutcome: 'FAILED' });
                finish(state, response.status);
                controller.error(new Error('Stream interrupted.'));
            }
        },
        async cancel(reason) {
            recordProviderOutcome(state, { providerOutcome: 'ABORTED', streamOutcome: 'CLIENT_ABORTED' });
            finish(state, response.status);
            await reader.cancel(reason);
        },
    });
    return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
}

export function createOperationalHandler(
    route: OperationalRoute,
    handler: (context: any) => Promise<Response>,
    options: OperationalHandlerOptions = {},
) {
    return async (cloudflareContext: any): Promise<Response> => {
        const request = cloudflareContext.request as Request;
        const monotonicNow = options.monotonicNow ?? (() => performance.now());
        const context = createOperationalRequestContext(request, route, { ...options, monotonicNow });
        const state: OperationalState = {
            context,
            quotaDecision: 'NOT_APPLICABLE',
            provider: {
                called: false,
                modelTier: 'none',
                providerOutcome: 'NOT_CALLED',
                streamOutcome: 'NOT_APPLICABLE',
            },
            monotonicNow,
            logSink: options.logSink,
            finalized: false,
        };
        REQUEST_STATES.set(request, state);

        let response: Response;
        try {
            response = await handler(cloudflareContext);
        } catch {
            response = internalFailureResponse(state);
        }
        state.errorClass ??= RESPONSE_FAILURES.get(response);
        if (response.body && response.headers.get('Content-Type')?.startsWith('text/event-stream')) {
            return wrapStream(response, state);
        }
        finish(state, response.status);
        return response;
    };
}
