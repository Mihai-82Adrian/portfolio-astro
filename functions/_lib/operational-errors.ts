import type { ErrorCode } from './contracts.ts';

export type OperationalLevel = 'info' | 'warn' | 'error';
export type ProviderOutcome =
    | 'NOT_CALLED'
    | 'SUCCEEDED'
    | 'TIMED_OUT'
    | 'RATE_LIMITED'
    | 'REFUSED'
    | 'MALFORMED'
    | 'ABORTED'
    | 'FAILED';
export type QuotaDecision =
    | 'NOT_APPLICABLE'
    | 'ALLOWED'
    | 'REJECTED_LIMIT'
    | 'REJECTED_COOLDOWN'
    | 'BYPASSED_LOCAL'
    | 'STATE_UNAVAILABLE_FAIL_OPEN';

export type OperationalErrorClass =
    | 'CLIENT_INPUT'
    | 'INVALID_JSON'
    | 'METHOD_NOT_ALLOWED'
    | 'ORIGIN_REJECTED'
    | 'PRIVACY_CONSENT_REQUIRED'
    | 'BODY_TOO_LARGE'
    | 'UNSUPPORTED_MEDIA_TYPE'
    | 'QUOTA_REJECTED'
    | 'FEATURE_DISABLED'
    | 'CONFIGURATION_MISSING'
    | 'CONFIGURATION_INVALID'
    | 'PROVIDER_TIMEOUT'
    | 'PROVIDER_RATE_LIMITED'
    | 'PROVIDER_REFUSED'
    | 'PROVIDER_MALFORMED'
    | 'PROVIDER_UNAVAILABLE'
    | 'CLIENT_ABORTED'
    | 'INTERNAL_FAILURE';

interface OperationalFailure {
    publicStatus: number;
    publicCode: ErrorCode;
    messagePolicy: 'SAFE_STATIC';
    level: OperationalLevel;
    retryable: boolean;
    providerOutcome: ProviderOutcome;
    quotaDecision: QuotaDecision;
    providerCalled: boolean;
}
const failure = (
    publicStatus: number,
    publicCode: ErrorCode,
    level: OperationalLevel,
    retryable: boolean,
    providerOutcome: ProviderOutcome = 'NOT_CALLED',
    quotaDecision: QuotaDecision = 'NOT_APPLICABLE',
    providerCalled = false,
): OperationalFailure => ({
    publicStatus,
    publicCode,
    messagePolicy: 'SAFE_STATIC',
    level,
    retryable,
    providerOutcome,
    quotaDecision,
    providerCalled,
});

export const OPERATIONAL_FAILURES: Record<OperationalErrorClass, OperationalFailure> = {
    CLIENT_INPUT: failure(422, 'VALIDATION_FAILED', 'warn', false),
    INVALID_JSON: failure(400, 'MALFORMED_JSON', 'warn', false),
    METHOD_NOT_ALLOWED: failure(405, 'METHOD_NOT_ALLOWED', 'warn', false),
    ORIGIN_REJECTED: failure(403, 'ORIGIN_REJECTED', 'warn', false),
    PRIVACY_CONSENT_REQUIRED: failure(400, 'PRIVACY_CONSENT_REQUIRED', 'warn', false),
    BODY_TOO_LARGE: failure(413, 'PAYLOAD_TOO_LARGE', 'warn', false),
    UNSUPPORTED_MEDIA_TYPE: failure(415, 'UNSUPPORTED_MEDIA_TYPE', 'warn', false),
    QUOTA_REJECTED: failure(429, 'QUOTA_EXCEEDED', 'warn', false, 'NOT_CALLED', 'REJECTED_LIMIT'),
    FEATURE_DISABLED: failure(503, 'FEATURE_DISABLED', 'warn', false),
    CONFIGURATION_MISSING: failure(503, 'FEATURE_NOT_CONFIGURED', 'error', false),
    CONFIGURATION_INVALID: failure(503, 'CONFIGURATION_INVALID', 'error', false),
    PROVIDER_TIMEOUT: failure(504, 'PROVIDER_TIMEOUT', 'error', true, 'TIMED_OUT', 'NOT_APPLICABLE', true),
    PROVIDER_RATE_LIMITED: failure(429, 'RATE_LIMITED', 'warn', true, 'RATE_LIMITED', 'NOT_APPLICABLE', true),
    PROVIDER_REFUSED: failure(502, 'PROVIDER_REJECTED', 'warn', false, 'REFUSED', 'NOT_APPLICABLE', true),
    PROVIDER_MALFORMED: failure(502, 'PROVIDER_REJECTED', 'error', true, 'MALFORMED', 'NOT_APPLICABLE', true),
    PROVIDER_UNAVAILABLE: failure(502, 'PROVIDER_UNAVAILABLE', 'error', true, 'FAILED', 'NOT_APPLICABLE', true),
    CLIENT_ABORTED: failure(499, 'INTERNAL_ERROR', 'warn', false, 'ABORTED', 'NOT_APPLICABLE', true),
    INTERNAL_FAILURE: failure(500, 'INTERNAL_ERROR', 'error', true),
};

const PUBLIC_CODE_TO_CLASS: Record<ErrorCode, OperationalErrorClass> = {
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
    MALFORMED_JSON: 'INVALID_JSON',
    PAYLOAD_TOO_LARGE: 'BODY_TOO_LARGE',
    VALIDATION_FAILED: 'CLIENT_INPUT',
    ORIGIN_REJECTED: 'ORIGIN_REJECTED',
    PRIVACY_CONSENT_REQUIRED: 'PRIVACY_CONSENT_REQUIRED',
    FEATURE_DISABLED: 'FEATURE_DISABLED',
    FEATURE_NOT_CONFIGURED: 'CONFIGURATION_MISSING',
    CONFIGURATION_INVALID: 'CONFIGURATION_INVALID',
    RATE_LIMITED: 'QUOTA_REJECTED',
    QUOTA_EXCEEDED: 'QUOTA_REJECTED',
    PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
    PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
    PROVIDER_REJECTED: 'PROVIDER_UNAVAILABLE',
    INTERNAL_ERROR: 'INTERNAL_FAILURE',
};

export function operationalClassForPublicCode(code: ErrorCode): OperationalErrorClass {
    return PUBLIC_CODE_TO_CLASS[code];
}
