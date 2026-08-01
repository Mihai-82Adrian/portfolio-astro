// Shared HTTP/JSON transport contract for all Cloudflare Pages Functions under functions/api/.
// See docs/operations/pages-functions-contracts.md for the full rationale.

export type ErrorCode =
    | 'METHOD_NOT_ALLOWED'
    | 'UNSUPPORTED_MEDIA_TYPE'
    | 'MALFORMED_JSON'
    | 'PAYLOAD_TOO_LARGE'
    | 'VALIDATION_FAILED'
    | 'ORIGIN_REJECTED'
    | 'FEATURE_DISABLED'
    | 'FEATURE_NOT_CONFIGURED'
    | 'CONFIGURATION_INVALID'
    | 'RATE_LIMITED'
    | 'QUOTA_EXCEEDED'
    | 'PROVIDER_TIMEOUT'
    | 'PROVIDER_UNAVAILABLE'
    | 'PROVIDER_REJECTED'
    | 'INTERNAL_ERROR';

export interface ErrorBody {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    fields?: string[];
}

export interface SuccessEnvelope<T> {
    ok: true;
    data: T;
    requestId: string;
}

export interface ErrorEnvelope {
    ok: false;
    error: ErrorBody;
    requestId: string;
}

export const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

export const BASE_JSON_HEADERS: Record<string, string> = {
    'Content-Type': JSON_CONTENT_TYPE,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
};
