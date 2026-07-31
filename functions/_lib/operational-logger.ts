import type {
    OperationalErrorClass,
    OperationalLevel,
    ProviderOutcome,
    QuotaDecision,
} from './operational-errors.ts';

export type OperationalRoute =
    | '/api/chat'
    | '/api/compass'
    | '/api/cashflow-scenario'
    | '/api/investment-analysis'
    | '/api/sample-review'
    | '/api/health'
    | '/api/csp-report';
export type ModelTier = 'terra' | 'sol' | 'none';
export type StreamOutcome = 'NOT_APPLICABLE' | 'COMPLETED' | 'FAILED' | 'CLIENT_ABORTED';
export type OperationalLogSink = (level: OperationalLevel, line: string) => void;
export type CspDirectiveClass =
    | 'base' | 'connect' | 'font' | 'form' | 'frame' | 'image' | 'manifest'
    | 'media' | 'object' | 'script' | 'style' | 'worker' | 'other' | 'unknown';
export type CspResourceClass =
    | 'self' | 'inline' | 'eval' | 'data' | 'blob' | 'ahrefs' | 'github'
    | 'giscus' | 'youtube' | 'spotify' | 'other-external' | 'unknown';
export type CspDisposition = 'report' | 'unknown';

interface BaseEvent {
    event: 'request.completed' | 'provider.completed' | 'csp.summary' | 'telemetry.invalid';
    level: OperationalLevel;
    requestId: string;
    route: OperationalRoute;
    method: string;
    status?: number;
    durationMs?: number;
    releaseId: string;
    modelTier?: ModelTier;
    providerOutcome?: ProviderOutcome;
    quotaDecision?: QuotaDecision;
    errorClass?: OperationalErrorClass;
    retryable?: boolean;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    timeToFirstOutputMs?: number;
    providerDurationMs?: number;
    streamOutcome?: StreamOutcome;
    acceptedReportCount?: number;
    droppedReportCount?: number;
    cspDirectiveClasses?: CspDirectiveClass[];
    cspResourceClasses?: CspResourceClass[];
    cspDispositions?: CspDisposition[];
}
export type OperationalEvent = BaseEvent;

export const OPERATIONAL_LOG_FIELDS = [
    'schemaVersion',
    'timestamp',
    'level',
    'event',
    'requestId',
    'route',
    'method',
    'status',
    'durationMs',
    'releaseId',
    'modelTier',
    'providerOutcome',
    'quotaDecision',
    'errorClass',
    'retryable',
    'inputTokens',
    'outputTokens',
    'totalTokens',
    'timeToFirstOutputMs',
    'providerDurationMs',
    'streamOutcome',
    'acceptedReportCount',
    'droppedReportCount',
    'cspDirectiveClasses',
    'cspResourceClasses',
    'cspDispositions',
] as const;

const ROUTES = new Set<OperationalRoute>([
    '/api/chat',
    '/api/compass',
    '/api/cashflow-scenario',
    '/api/investment-analysis',
    '/api/sample-review',
    '/api/health',
    '/api/csp-report',
]);
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'OTHER']);
const LEVELS = new Set<OperationalLevel>(['info', 'warn', 'error']);
const EVENTS = new Set(['request.completed', 'provider.completed', 'csp.summary', 'telemetry.invalid']);
const MODEL_TIERS = new Set<ModelTier>(['terra', 'sol', 'none']);
const PROVIDER_OUTCOMES = new Set<ProviderOutcome>([
    'NOT_CALLED', 'SUCCEEDED', 'TIMED_OUT', 'RATE_LIMITED', 'REFUSED', 'MALFORMED', 'ABORTED', 'FAILED',
]);
const QUOTA_DECISIONS = new Set<QuotaDecision>([
    'NOT_APPLICABLE', 'ALLOWED', 'REJECTED_LIMIT', 'REJECTED_COOLDOWN', 'BYPASSED_LOCAL',
    'STATE_UNAVAILABLE_FAIL_OPEN',
]);
const STREAM_OUTCOMES = new Set<StreamOutcome>(['NOT_APPLICABLE', 'COMPLETED', 'FAILED', 'CLIENT_ABORTED']);
const CSP_DIRECTIVE_CLASSES = new Set<CspDirectiveClass>([
    'base', 'connect', 'font', 'form', 'frame', 'image', 'manifest', 'media', 'object',
    'script', 'style', 'worker', 'other', 'unknown',
]);
const CSP_RESOURCE_CLASSES = new Set<CspResourceClass>([
    'self', 'inline', 'eval', 'data', 'blob', 'ahrefs', 'github', 'giscus',
    'youtube', 'spotify', 'other-external', 'unknown',
]);
const CSP_DISPOSITIONS = new Set<CspDisposition>(['report', 'unknown']);
const ERROR_CLASSES = new Set<OperationalErrorClass>([
    'CLIENT_INPUT', 'INVALID_JSON', 'METHOD_NOT_ALLOWED', 'ORIGIN_REJECTED', 'BODY_TOO_LARGE',
    'UNSUPPORTED_MEDIA_TYPE', 'QUOTA_REJECTED', 'FEATURE_DISABLED', 'CONFIGURATION_MISSING',
    'CONFIGURATION_INVALID', 'PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMITED', 'PROVIDER_REFUSED',
    'PROVIDER_MALFORMED', 'PROVIDER_UNAVAILABLE', 'CLIENT_ABORTED', 'INTERNAL_FAILURE',
]);

function nonNegativeNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.round(value)
        : undefined;
}

function tokenCount(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function defaultSink(level: OperationalLevel, line: string): void {
    if (level === 'info') console.info(line);
    else if (level === 'warn') console.warn(line);
    else console.error(line);
}

function boundedEnums<T extends string>(value: unknown, allowed: Set<T>): T[] | undefined {
    if (!Array.isArray(value) || value.length > 16) return undefined;
    const normalized = [...new Set(value.filter((item): item is T =>
        typeof item === 'string' && allowed.has(item as T)
    ))].sort();
    return normalized.length > 0 ? normalized : undefined;
}

export function emitOperationalEvent(event: OperationalEvent, sink: OperationalLogSink = defaultSink): void {
    try {
        const validNumbers = (event.status === undefined
            || (Number.isInteger(event.status) && event.status >= 100 && event.status <= 599))
            && ['durationMs', 'timeToFirstOutputMs', 'providerDurationMs'].every((field) =>
                event[field as keyof OperationalEvent] === undefined
                || nonNegativeNumber(event[field as keyof OperationalEvent]) !== undefined
            )
            && ['inputTokens', 'outputTokens', 'totalTokens', 'acceptedReportCount', 'droppedReportCount'].every((field) =>
                event[field as keyof OperationalEvent] === undefined
                || tokenCount(event[field as keyof OperationalEvent]) !== undefined
            );
        const validIdentity = EVENTS.has(event.event)
            && LEVELS.has(event.level)
            && /^[a-f0-9-]{36}$/i.test(event.requestId)
            && ROUTES.has(event.route)
            && METHODS.has(event.method)
            && /^git-[a-f0-9]{16}$/.test(event.releaseId)
            && validNumbers;
        const output: Record<string, unknown> = {
            schemaVersion: 1,
            timestamp: new Date().toISOString(),
            level: validIdentity ? event.level : 'error',
            event: validIdentity ? event.event : 'telemetry.invalid',
            requestId: validIdentity ? event.requestId : 'unknown',
            route: validIdentity ? event.route : 'unknown',
            method: validIdentity ? event.method : 'OTHER',
            releaseId: validIdentity ? event.releaseId : 'unknown',
        };
        if (!validIdentity) {
            sink('error', JSON.stringify(output));
            return;
        }
        if (Number.isInteger(event.status) && event.status! >= 100 && event.status! <= 599) output.status = event.status;
        const durationMs = nonNegativeNumber(event.durationMs);
        if (durationMs !== undefined) output.durationMs = durationMs;
        if (event.modelTier && MODEL_TIERS.has(event.modelTier)) output.modelTier = event.modelTier;
        if (event.providerOutcome && PROVIDER_OUTCOMES.has(event.providerOutcome)) {
            output.providerOutcome = event.providerOutcome;
        }
        if (event.quotaDecision && QUOTA_DECISIONS.has(event.quotaDecision)) output.quotaDecision = event.quotaDecision;
        if (event.errorClass && ERROR_CLASSES.has(event.errorClass)) output.errorClass = event.errorClass;
        if (typeof event.retryable === 'boolean') output.retryable = event.retryable;
        for (const field of ['inputTokens', 'outputTokens', 'totalTokens'] as const) {
            const value = tokenCount(event[field]);
            if (value !== undefined) output[field] = value;
        }
        for (const field of ['timeToFirstOutputMs', 'providerDurationMs'] as const) {
            const value = nonNegativeNumber(event[field]);
            if (value !== undefined) output[field] = value;
        }
        if (event.streamOutcome && STREAM_OUTCOMES.has(event.streamOutcome)) {
            output.streamOutcome = event.streamOutcome;
        }
        for (const field of ['acceptedReportCount', 'droppedReportCount'] as const) {
            const value = tokenCount(event[field]);
            if (value !== undefined) output[field] = value;
        }
        const directiveClasses = boundedEnums(event.cspDirectiveClasses, CSP_DIRECTIVE_CLASSES);
        if (directiveClasses) output.cspDirectiveClasses = directiveClasses;
        const resourceClasses = boundedEnums(event.cspResourceClasses, CSP_RESOURCE_CLASSES);
        if (resourceClasses) output.cspResourceClasses = resourceClasses;
        const dispositions = boundedEnums(event.cspDispositions, CSP_DISPOSITIONS);
        if (dispositions) output.cspDispositions = dispositions;
        sink(output.level as OperationalLevel, JSON.stringify(output));
    } catch {
        // Logging is best-effort and must never affect the request or recursively log caller data.
    }
}
