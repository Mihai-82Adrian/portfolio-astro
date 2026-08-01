import {
    createOperationalHandler,
    getOperationalState,
    recordFailure,
    type OperationalHandlerOptions,
} from '../_lib/operational-context.ts';
import {
    emitOperationalEvent,
    type CspDirectiveClass,
    type CspDisposition,
    type CspResourceClass,
} from '../_lib/operational-logger.ts';

export const CSP_MAX_BODY_BYTES = 4_096;
export const CSP_MAX_REPORTS = 8;
const MAX_DEPTH = 4;
const MAX_STRING_LENGTH = 256;
const RESPONSE_HEADERS = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
};
const ACCEPTED_MEDIA_TYPES = new Set(['application/csp-report', 'application/reports+json']);

type UnknownRecord = Record<string, unknown>;

interface MinimizedReport {
    directiveClass: CspDirectiveClass;
    resourceClass: CspResourceClass;
    disposition: CspDisposition;
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasUnsafeStructure(value: unknown, depth = 0): boolean {
    if (depth > MAX_DEPTH) return true;
    if (typeof value === 'string') return value.length > MAX_STRING_LENGTH * 8;
    if (Array.isArray(value)) {
        return value.length > 64 || value.some((item) => hasUnsafeStructure(item, depth + 1));
    }
    if (!isRecord(value)) return false;
    const entries = Object.entries(value);
    return entries.length > 64 || entries.some(([key, item]) =>
        key.length > 64 || hasUnsafeStructure(item, depth + 1)
    );
}

function boundedString(value: unknown): string {
    return typeof value === 'string'
        && value.length <= MAX_STRING_LENGTH
        && !/[\u0000-\u001f\u007f]/.test(value)
        ? value
        : '';
}

function validOptionalInteger(value: unknown): boolean {
    return value === undefined || (Number.isSafeInteger(value) && Number(value) >= 0);
}

function directiveClass(value: unknown): CspDirectiveClass {
    const directive = boundedString(value).toLowerCase();
    if (!directive) return 'unknown';
    if (directive.startsWith('script-src')) return 'script';
    if (directive.startsWith('style-src')) return 'style';
    if (directive.startsWith('img-src')) return 'image';
    if (directive.startsWith('font-src')) return 'font';
    if (directive.startsWith('connect-src')) return 'connect';
    if (directive.startsWith('frame-src') || directive.startsWith('child-src')) return 'frame';
    if (directive.startsWith('media-src')) return 'media';
    if (directive.startsWith('worker-src')) return 'worker';
    if (directive.startsWith('manifest-src')) return 'manifest';
    if (directive.startsWith('object-src')) return 'object';
    if (directive.startsWith('form-action')) return 'form';
    if (directive.startsWith('base-uri')) return 'base';
    return 'other';
}

function resourceClass(value: unknown, documentUrl: unknown): CspResourceClass {
    const blocked = boundedString(value);
    if (!blocked) return 'unknown';
    const keyword = blocked.toLowerCase();
    if (keyword === 'inline') return 'inline';
    if (keyword === 'eval') return 'eval';
    if (keyword === 'data') return 'data';
    if (keyword === 'blob') return 'blob';
    if (keyword === 'self') return 'self';
    if (keyword.startsWith('data:')) return 'data';
    if (keyword.startsWith('blob:')) return 'blob';
    try {
        const url = new URL(blocked);
        const document = boundedString(documentUrl);
        if (document && new URL(document).origin === url.origin) return 'self';
        const known: Record<string, CspResourceClass> = {
            'analytics.ahrefs.com': 'ahrefs',
            'api.github.com': 'github',
            'giscus.app': 'giscus',
            'www.youtube.com': 'youtube',
            'open.spotify.com': 'spotify',
        };
        return known[url.hostname] ?? 'other-external';
    } catch {
        return 'unknown';
    }
}

function dispositionClass(value: unknown): CspDisposition {
    return value === 'report' ? value : 'unknown';
}

function minimizeLegacy(value: unknown): MinimizedReport | null {
    if (!isRecord(value)) return null;
    if (
        !validOptionalInteger(value['line-number'])
        || !validOptionalInteger(value['column-number'])
        || !validOptionalInteger(value['status-code'])
    ) return null;
    return {
        directiveClass: directiveClass(value['effective-directive'] ?? value['violated-directive']),
        resourceClass: resourceClass(value['blocked-uri'], value['document-uri']),
        disposition: dispositionClass(value.disposition),
    };
}

function minimizeModern(value: unknown): MinimizedReport | null {
    if (!isRecord(value) || value.type !== 'csp-violation' || !isRecord(value.body)) return null;
    if (
        !validOptionalInteger(value.age)
        || !validOptionalInteger(value.body.lineNumber)
        || !validOptionalInteger(value.body.columnNumber)
        || !validOptionalInteger(value.body.statusCode)
    ) return null;
    return {
        directiveClass: directiveClass(value.body.effectiveDirective),
        resourceClass: resourceClass(value.body.blockedURL, value.body.documentURL),
        disposition: dispositionClass(value.body.disposition),
    };
}

async function readBoundedBody(request: Request): Promise<string | null> {
    const declared = request.headers.get('Content-Length');
    if (declared !== null) {
        const size = Number(declared);
        if (!Number.isSafeInteger(size) || size < 0 || size > CSP_MAX_BODY_BYTES) return null;
    }
    if (!request.body) return '';
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > CSP_MAX_BODY_BYTES) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function emptyResponse(status: number, extraHeaders: Record<string, string> = {}): Response {
    return new Response(null, { status, headers: { ...RESPONSE_HEADERS, ...extraHeaders } });
}

export function createHandler(options: OperationalHandlerOptions = {}) {
    return createOperationalHandler('/api/csp-report', async ({ request }: { request: Request }) => {
        const operational = getOperationalState(request);
        if (request.method !== 'POST') {
            recordFailure(operational, 'METHOD_NOT_ALLOWED');
            return emptyResponse(405, { Allow: 'POST' });
        }
        const encoding = request.headers.get('Content-Encoding');
        const mediaType = request.headers.get('Content-Type')?.trim().toLowerCase() ?? '';
        if ((encoding && encoding !== 'identity') || !ACCEPTED_MEDIA_TYPES.has(mediaType)) {
            recordFailure(operational, 'UNSUPPORTED_MEDIA_TYPE');
            return emptyResponse(415);
        }

        let source: string | null;
        try {
            source = await readBoundedBody(request);
        } catch {
            recordFailure(operational, 'CLIENT_INPUT');
            return emptyResponse(400);
        }
        if (source === null) {
            recordFailure(operational, 'BODY_TOO_LARGE');
            return emptyResponse(413);
        }
        if (source === '') return emptyResponse(204);

        let payload: unknown;
        try {
            payload = JSON.parse(source);
        } catch {
            recordFailure(operational, 'INVALID_JSON');
            return emptyResponse(400);
        }
        if (hasUnsafeStructure(payload)) {
            recordFailure(operational, 'CLIENT_INPUT');
            return emptyResponse(400);
        }

        const legacy = isRecord(payload) ? payload['csp-report'] : null;
        if (
            (mediaType === 'application/csp-report' && !isRecord(legacy))
            || (mediaType === 'application/reports+json' && !Array.isArray(payload))
        ) {
            recordFailure(operational, 'CLIENT_INPUT');
            return emptyResponse(400);
        }
        const candidates = mediaType === 'application/csp-report' ? [legacy] : payload as unknown[];
        const droppedForLimit = Math.max(0, candidates.length - CSP_MAX_REPORTS);
        const minimized = candidates
            .slice(0, CSP_MAX_REPORTS)
            .map(mediaType === 'application/csp-report' ? minimizeLegacy : minimizeModern);
        const reports = minimized.filter((value): value is MinimizedReport => value !== null);
        const droppedReportCount = droppedForLimit + minimized.length - reports.length;

        if (reports.length > 0 || droppedReportCount > 0) {
            emitOperationalEvent({
                event: 'csp.summary',
                level: 'info',
                requestId: operational.context.requestId,
                route: operational.context.route,
                method: operational.context.method,
                releaseId: operational.context.releaseId,
                acceptedReportCount: reports.length,
                droppedReportCount,
                cspDirectiveClasses: reports.map((report) => report.directiveClass),
                cspResourceClasses: reports.map((report) => report.resourceClass),
                cspDispositions: reports.map((report) => report.disposition),
            }, operational.logSink);
        }
        return emptyResponse(204);
    }, options);
}

export const onRequest = createHandler();
