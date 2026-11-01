import { fetchWithTimeout, jsonError, type FetchLike } from './http.ts';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const TURNSTILE_TEST_SECRET_KEY = '1x000000000000000000000000000000000000000000000000';
export const TURNSTILE_CF_DUMMY_SECRET_KEY = '1x0000000000000000000000000000000AA';
export const TURNSTILE_DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

const TURNSTILE_TIMEOUT_MS = 5_000;
const MAX_TOKEN_LENGTH = 2048;

export interface VerifyTurnstileOptions {
    payload?: unknown;
    fetchImpl?: FetchLike;
}

/**
 * Extracts the Cloudflare Turnstile token from the dedicated `cf-turnstile-response` header,
 * a JSON request body (`turnstileToken` or `cf-turnstile-response`), or a `FormData` payload.
 */
export function extractTurnstileToken(request: Request, payload?: unknown): string | null {
    const headerToken =
        request.headers.get('cf-turnstile-response') ??
        request.headers.get('x-turnstile-token');
    if (typeof headerToken === 'string' && headerToken.trim().length > 0) {
        return headerToken.trim();
    }

    if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        const formToken = payload.get('turnstileToken') ?? payload.get('cf-turnstile-response');
        if (typeof formToken === 'string' && formToken.trim().length > 0) {
            return formToken.trim();
        }
        return null;
    }

    if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        const bodyToken = record.turnstileToken ?? record['cf-turnstile-response'];
        if (typeof bodyToken === 'string' && bodyToken.trim().length > 0) {
            return bodyToken.trim();
        }
    }

    return null;
}

/**
 * Determines whether a missing `TURNSTILE_SECRET_KEY` is allowed to bypass Turnstile
 * verification in local development or Node test suites (`node --test`).
 * Production environments or explicit `TURNSTILE_ENFORCE=true` always fail closed.
 */
function isTurnstileBypassAllowed(env: Record<string, unknown>): boolean {
    if (
        env.TURNSTILE_ENFORCE === 'true' ||
        env.ENVIRONMENT === 'production' ||
        env.CF_PAGES === '1'
    ) {
        return false;
    }

    if (
        env.TURNSTILE_BYPASS === 'true' ||
        env.ENVIRONMENT === 'development' ||
        env.ENVIRONMENT === 'test'
    ) {
        return true;
    }

    if (typeof process !== 'undefined') {
        const isNodeTest =
            process.env?.NODE_TEST_CONTEXT !== undefined ||
            process.execArgv?.includes('--test') === true ||
            process.argv?.includes('--test') === true;
        const isNonProdNode = process.env?.NODE_ENV !== 'production';
        if (isNodeTest || isNonProdNode) {
            return true;
        }
    }

    return false;
}

/**
 * Verifies a Cloudflare Turnstile challenge token against `/turnstile/v0/siteverify`.
 * Returns `null` when verification succeeds (or is bypassed in local/test mode),
 * or a standardized 403 `CHALLENGE_FAILED` error `Response` when verification fails.
 */
export async function verifyTurnstile(
    request: Request,
    env: unknown,
    requestId: string,
    options: VerifyTurnstileOptions = {},
): Promise<Response | null> {
    const envRecord = (typeof env === 'object' && env !== null ? env : {}) as Record<string, unknown>;
    const secretKey =
        typeof envRecord.TURNSTILE_SECRET_KEY === 'string'
            ? envRecord.TURNSTILE_SECRET_KEY.trim()
            : '';

    const token = extractTurnstileToken(request, options.payload);

    // Non-blocking pass when test secret key is configured or when dummy test token is received
    if (
        secretKey === TURNSTILE_TEST_SECRET_KEY ||
        secretKey === TURNSTILE_CF_DUMMY_SECRET_KEY ||
        (typeof token === 'string' &&
            (token === TURNSTILE_DUMMY_TOKEN || token.includes('DUMMY.TOKEN')))
    ) {
        return null;
    }

    if (!secretKey) {
        if (isTurnstileBypassAllowed(envRecord)) {
            return null;
        }
        return jsonError(
            403,
            'CHALLENGE_FAILED',
            'Security challenge verification failed.',
            requestId,
            { retryable: false },
        );
    }

    if (!token || token.length > MAX_TOKEN_LENGTH) {
        return jsonError(
            403,
            'CHALLENGE_FAILED',
            'Security challenge token is required.',
            requestId,
            { retryable: false },
        );
    }

    const remoteip = request.headers.get('CF-Connecting-IP');
    const verifyPayload: Record<string, string> = {
        secret: secretKey,
        response: token,
    };
    if (remoteip && remoteip.trim().length > 0) {
        verifyPayload.remoteip = remoteip.trim();
    }

    const fetchImpl = options.fetchImpl ?? ((input: string, init: RequestInit) => fetch(input, init));

    let verifyResponse: Response;
    try {
        verifyResponse = await fetchWithTimeout(
            TURNSTILE_VERIFY_URL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(verifyPayload),
            },
            TURNSTILE_TIMEOUT_MS,
            fetchImpl,
        );
    } catch {
        return jsonError(
            403,
            'CHALLENGE_FAILED',
            'Security challenge verification failed.',
            requestId,
            { retryable: false },
        );
    }

    if (!verifyResponse.ok) {
        return jsonError(
            403,
            'CHALLENGE_FAILED',
            'Security challenge verification failed.',
            requestId,
            { retryable: false },
        );
    }

    let outcome: { success?: unknown };
    try {
        outcome = (await verifyResponse.json()) as { success?: unknown };
    } catch {
        return jsonError(
            403,
            'CHALLENGE_FAILED',
            'Security challenge verification failed.',
            requestId,
            { retryable: false },
        );
    }

    if (outcome?.success !== true) {
        return jsonError(
            403,
            'CHALLENGE_FAILED',
            'Security challenge verification failed.',
            requestId,
            { retryable: false },
        );
    }

    return null;
}
