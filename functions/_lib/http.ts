// Shared request/response helpers for Cloudflare Pages Functions.
// Paired with ./contracts.ts (envelope + error-code types).
import { BASE_JSON_HEADERS, type ErrorCode, type ErrorEnvelope, type SuccessEnvelope } from './contracts.ts';
import { recordResponseFailure } from './operational-context.ts';
import { operationalClassForPublicCode } from './operational-errors.ts';

export function jsonSuccess<T>(
    data: T,
    requestId: string,
    init: { status?: number; headers?: Record<string, string> } = {},
): Response {
    const body: SuccessEnvelope<T> = { ok: true, data, requestId };
    return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { ...BASE_JSON_HEADERS, ...(init.headers ?? {}) },
    });
}

export function jsonError(
    status: number,
    code: ErrorCode,
    message: string,
    requestId: string,
    opts: { retryable?: boolean; fields?: string[]; headers?: Record<string, string> } = {},
): Response {
    const body: ErrorEnvelope = {
        ok: false,
        error: {
            code,
            message,
            retryable: opts.retryable ?? false,
            ...(opts.fields ? { fields: opts.fields } : {}),
        },
        requestId,
    };
    const response = new Response(JSON.stringify(body), {
        status,
        headers: { ...BASE_JSON_HEADERS, ...(opts.headers ?? {}) },
    });
    recordResponseFailure(response, operationalClassForPublicCode(code));
    return response;
}

export function methodGuard(request: Request, allowed: string[], requestId: string): Response | null {
    if (allowed.includes(request.method)) return null;
    return jsonError(
        405,
        'METHOD_NOT_ALLOWED',
        `Method ${request.method} is not supported on this endpoint.`,
        requestId,
        { headers: { Allow: allowed.join(', ') } },
    );
}

const LOCAL_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const ALLOWED_ORIGINS = new Set(['https://me-mateescu.de', 'https://portfolio-astro-2do.pages.dev']);
const ALLOWED_PREVIEW_SUFFIX = '.portfolio-astro-2do.pages.dev';

export function isAllowedOrigin(origin: string): boolean {
    if (ALLOWED_ORIGINS.has(origin)) return true;
    if (LOCAL_ORIGIN_PATTERN.test(origin)) return true;
    try {
        const url = new URL(origin);
        return url.protocol === 'https:' && url.host.endsWith(ALLOWED_PREVIEW_SUFFIX);
    } catch {
        return false;
    }
}

// These endpoints carry no session/cookie auth, so Origin checking is a defense-in-depth
// signal, not a CSRF guarantee. Requests without an Origin header (older browsers doing a
// same-origin form navigation, curl, non-browser assistive tooling) are let through rather
// than rejected, since there is nothing session-bound for a forged request to steal here.
export function originGuard(request: Request, requestId: string): Response | null {
    const origin = request.headers.get('Origin');
    if (!origin) return null;
    if (isAllowedOrigin(origin)) return null;
    return jsonError(403, 'ORIGIN_REJECTED', 'Request origin is not allowed.', requestId);
}

export function requireContentType(request: Request, expected: string, requestId: string): Response | null {
    const contentType = (request.headers.get('Content-Type') ?? '').toLowerCase();
    if (contentType.includes(expected)) return null;
    return jsonError(415, 'UNSUPPORTED_MEDIA_TYPE', `Expected ${expected}.`, requestId);
}

export function checkContentLength(request: Request, maxBytes: number, requestId: string): Response | null {
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && Number(contentLength) > maxBytes) {
        return jsonError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the allowed size.', requestId);
    }
    return null;
}

type JsonBodyResult<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function readJsonBody<T = unknown>(
    request: Request,
    requestId: string,
    maxBytes: number,
): Promise<JsonBodyResult<T>> {
    const mediaTypeError = requireContentType(request, 'application/json', requestId);
    if (mediaTypeError) return { ok: false, response: mediaTypeError };

    const lengthError = checkContentLength(request, maxBytes, requestId);
    if (lengthError) return { ok: false, response: lengthError };

    let raw: string;
    try {
        raw = await request.text();
    } catch {
        return { ok: false, response: jsonError(400, 'MALFORMED_JSON', 'Could not read request body.', requestId) };
    }

    if (new TextEncoder().encode(raw).length > maxBytes) {
        return {
            ok: false,
            response: jsonError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the allowed size.', requestId),
        };
    }

    try {
        return { ok: true, data: JSON.parse(raw) as T };
    } catch {
        return { ok: false, response: jsonError(400, 'MALFORMED_JSON', 'Request body is not valid JSON.', requestId) };
    }
}

export class ProviderTimeoutError extends Error {}

// Minimal fetch shape — lets tests inject a stub without pulling in a mocking dependency.
export interface FetchLike {
    (input: string, init: RequestInit): Promise<Response>;
}

export async function fetchWithTimeout(
    input: string,
    init: RequestInit,
    timeoutMs: number,
    fetchImpl: FetchLike = (i, n) => fetch(i, n),
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetchImpl(input, { ...init, signal: controller.signal });
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new ProviderTimeoutError('Provider request timed out.');
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

// Normalizes any thrown provider-adapter error into a safe, controlled envelope.
// Never forwards the raw error message/body — that may contain upstream implementation detail.
export function classifyProviderFailure(err: unknown, requestId: string): Response {
    if (err instanceof ProviderTimeoutError) {
        return jsonError(504, 'PROVIDER_TIMEOUT', 'The upstream service took too long to respond.', requestId, {
            retryable: true,
        });
    }
    return jsonError(502, 'PROVIDER_UNAVAILABLE', 'The upstream service is currently unavailable.', requestId, {
        retryable: true,
    });
}
