import {
    checkContentLength,
    classifyProviderFailure,
    fetchWithTimeout,
    jsonError,
    jsonSuccess,
    methodGuard,
    originGuard,
    requireContentType,
    type FetchLike,
} from '../_lib/http.ts';
import { readFeatureControl } from '../_lib/feature-controls.ts';
import {
    createOperationalHandler,
    getOperationalState,
    recordFailure,
    recordProviderOutcome,
    recordQuotaDecision,
    startProviderCall,
    type OperationalHandlerOptions,
    type OperationalState,
} from '../_lib/operational-context.ts';
import { operationalClassForPublicCode } from '../_lib/operational-errors.ts';

interface Env {
    RESEND_API_KEY: string;
    SAMPLE_REVIEW_EMAIL_FROM: string;
    SAMPLE_REVIEW_EMAIL_TO: string;
    SAMPLE_REVIEW_ENABLED?: string;
}

interface SampleReviewEmail {
    subject: string;
    text: string;
    html: string;
    replyTo: string;
}

interface SampleReviewSubmission {
    name: string;
    company: string;
    workEmail: string;
    dataType: string;
    targetUseCase: string;
    estimatedVolume: string;
    notes: string;
    consent: string;
    website: string;
    submittedAt: string;
    successRedirect: string;
    formPath: string;
}

// ─── Transport limits ──────────────────────────────────────────────
const MAX_BODY_BYTES = 32 * 1024;
const PROVIDER_TIMEOUT_MS = 10_000;

const THROTTLE_WINDOW_MS = 60 * 1000;
const MIN_SUBMISSION_AGE_MS = 1500;
const MAX_SUBMISSION_AGE_MS = 24 * 60 * 60 * 1000;
const THROTTLE_CACHE_NAME = 'sample-review-throttle';
const THROTTLE_KEY_PREFIX = '/__sample_review_throttle/';

const ALLOWED_DATA_TYPES = new Set([
    'PDF / Scan-Dokumente',
    'PDF / scanned documents',
    'PDF / documente scanate',
    'DOCX / Policies / Handbücher',
    'DOCX / policies / manuals',
    'DOCX / politici / manuale',
    'ERP-Export / FiBu-Daten',
    'ERP export / accounting data',
    'Export ERP / date contabile',
    'XRechnung / XML / strukturierte Business-Dokumente',
    'XRechnung / XML / structured business documents',
    'XRechnung / XML / documente business structurate',
    'Andere',
    'Other',
    'Altul',
]);

const ALLOWED_TARGET_USE_CASES = new Set([
    'RAG / Knowledge Base',
    'RAG / knowledge base',
    'Document AI',
    'ERP & FiBu Cleanup',
    'ERP & accounting cleanup',
    'Compliance Transformation',
    'Compliance transformation',
    'Noch unklar',
    'Still unclear',
    'Încă neclar',
]);

const ALLOWED_VOLUMES = new Set([
    'Einzelnes Dokument / kleiner Beispieldatensatz',
    'Single document / small sample dataset',
    'Document unic / eșantion mic',
    'Kleines Paket',
    'Small package',
    'Pachet mic',
    'Mittlerer Bestand',
    'Medium inventory',
    'Inventar mediu',
    'Größerer Bestand / noch unklar',
    'Larger inventory / still unclear',
    'Inventar mare / încă neclar',
]);

const ALLOWED_SUCCESS_REDIRECTS = new Set([
    '/sample-struktur-pruefen/danke',
    '/en/sample-structure-review/thank-you',
    '/ro/revizuire-structura-esantion/multumesc',
]);

const ALLOWED_FORM_PATHS = new Set([
    '/sample-struktur-pruefen',
    '/en/sample-structure-review',
    '/ro/revizuire-structura-esantion',
]);

function normalize(value: FormDataEntryValue | null): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatValue(value: string): string {
    return value || '—';
}

function parseRecipients(raw: string): string[] {
    return raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function wantsHtmlResponse(request: Request): boolean {
    const accept = request.headers.get('Accept') ?? '';
    return accept.includes('text/html') || accept.includes('application/xhtml+xml');
}

function renderErrorHtml(message: string, status: number, formPath = '/sample-struktur-pruefen'): Response {
    const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Anfrage konnte nicht gesendet werden</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8faf8;
        color: #0f172a;
      }
      main {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        max-width: 36rem;
        width: 100%;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 20px;
        background: #ffffff;
        padding: 28px;
        box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
      }
      h1 { margin: 0 0 12px; font-size: 1.5rem; }
      p { margin: 0 0 16px; line-height: 1.6; color: #334155; }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 999px;
        background: #1f6f54;
        color: #fff;
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card" role="alert" aria-live="polite">
        <h1>Anfrage konnte nicht gesendet werden</h1>
        <p>${escapeHtml(message)}</p>
        <a href="${escapeHtml(formPath)}">Zurück zum Formular</a>
      </section>
    </main>
  </body>
</html>`;

    return new Response(html, {
        status,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}

interface RespondErrorOptions {
    fields?: string[];
    retryable?: boolean;
    formPath?: string;
}

function respondError(
    request: Request,
    operational: OperationalState,
    requestId: string,
    status: number,
    code: Parameters<typeof jsonError>[1],
    message: string,
    opts: RespondErrorOptions = {},
): Response {
    recordFailure(operational, operationalClassForPublicCode(code));
    if (wantsHtmlResponse(request)) {
        return renderErrorHtml(message, status, opts.formPath);
    }
    return jsonError(status, code, message, requestId, { fields: opts.fields, retryable: opts.retryable });
}

function normalizeAllowedPath(value: string, allowedPaths: Set<string>, fallback: string): string {
    return allowedPaths.has(value) ? value : fallback;
}

function parseSubmittedAt(value: string): number | null {
    if (!value) return null;
    if (!/^\d{13}$/.test(value)) return null;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;

    const age = Date.now() - parsed;
    if (age < MIN_SUBMISSION_AGE_MS || age > MAX_SUBMISSION_AGE_MS) return null;

    return parsed;
}

async function hashIp(ip: string): Promise<string> {
    const data = new TextEncoder().encode(`sample-review:${ip}:throttle`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hasThrottleEntry(requestUrl: string, ipHash: string): Promise<boolean> {
    const cache = await caches.open(THROTTLE_CACHE_NAME);
    const cacheKey = new Request(new URL(`${THROTTLE_KEY_PREFIX}${ipHash}`, requestUrl).toString());
    return (await cache.match(cacheKey)) !== undefined;
}

async function setThrottleEntry(requestUrl: string, ipHash: string): Promise<void> {
    const cache = await caches.open(THROTTLE_CACHE_NAME);
    const cacheKey = new Request(new URL(`${THROTTLE_KEY_PREFIX}${ipHash}`, requestUrl).toString());
    await cache.put(cacheKey, new Response('1', {
        headers: {
            'Cache-Control': `public, max-age=${Math.floor(THROTTLE_WINDOW_MS / 1000)}`,
        },
    }));
}

export interface EmailDeliveryProvider {
    send(message: SampleReviewEmail): Promise<void>;
}

// Assumes the caller has already verified RESEND_API_KEY / SAMPLE_REVIEW_EMAIL_FROM / TO are
// present — see the env-readiness check in createHandler, which fails closed before this is
// ever constructed. No outbound fetch happens here unless configuration is already known-good.
export function createResendEmailProvider(env: Env, fetchImpl: FetchLike): EmailDeliveryProvider {
    return {
        async send(message: SampleReviewEmail): Promise<void> {
            const recipients = parseRecipients(env.SAMPLE_REVIEW_EMAIL_TO);

            const response = await fetchWithTimeout(
                'https://api.resend.com/emails',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: env.SAMPLE_REVIEW_EMAIL_FROM,
                        to: recipients,
                        subject: message.subject,
                        text: message.text,
                        html: message.html,
                        reply_to: message.replyTo,
                    }),
                },
                PROVIDER_TIMEOUT_MS,
                fetchImpl,
            );

            if (!response.ok) {
                throw new Error('Email provider rejected the request.');
            }
        },
    };
}

function buildEmailText(submission: SampleReviewSubmission, receivedAt: string): string {
    return [
        'Sample Review Anfrage',
        '',
        `Name: ${formatValue(submission.name)}`,
        `Unternehmen: ${formatValue(submission.company)}`,
        `Business E-Mail: ${formatValue(submission.workEmail)}`,
        `Daten-/Dokumenttyp: ${formatValue(submission.dataType)}`,
        `Ziel-Use-Case: ${formatValue(submission.targetUseCase)}`,
        `Umfang: ${formatValue(submission.estimatedVolume)}`,
        `Zusätzliche Hinweise: ${formatValue(submission.notes)}`,
        `Consent: ${submission.consent === 'on' ? 'Ja' : 'Nein'}`,
        '',
        'Hidden metadata',
        `website: ${formatValue(submission.website)}`,
        `submittedAt: ${formatValue(submission.submittedAt)}`,
    `receivedAt: ${receivedAt}`,
    ].join('\n');
}

function buildEmailHtml(submission: SampleReviewSubmission, receivedAt: string): string {
    const rows = [
        ['Name', submission.name],
        ['Unternehmen', submission.company],
        ['Business E-Mail', submission.workEmail],
        ['Daten-/Dokumenttyp', submission.dataType],
        ['Ziel-Use-Case', submission.targetUseCase],
        ['Umfang', submission.estimatedVolume],
        ['Zusätzliche Hinweise', submission.notes],
        ['Consent', submission.consent === 'on' ? 'Ja' : 'Nein'],
        ['website', submission.website],
        ['submittedAt', submission.submittedAt],
        ['receivedAt', receivedAt],
    ];

    const tableRows = rows.map(([label, value]) => `
        <tr>
          <th style="text-align:left;padding:10px 12px;border:1px solid #d4d4d4;background:#f5f5f5;vertical-align:top;width:220px;">${escapeHtml(label)}</th>
          <td style="padding:10px 12px;border:1px solid #d4d4d4;vertical-align:top;white-space:pre-wrap;">${escapeHtml(formatValue(value))}</td>
        </tr>
    `).join('');

    return `
      <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <h1 style="font-size:20px;margin:0 0 16px;">Sample Review Anfrage</h1>
        <p style="margin:0 0 16px;color:#334155;">Die Anfrage ist über das first-party Formular eingegangen. Bitte die folgenden Angaben prüfen und direkt beantworten.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #d4d4d4;">
          ${tableRows}
        </table>
        <p style="margin:16px 0 0;color:#475569;">Reply-to: ${escapeHtml(submission.workEmail)}</p>
      </div>
    `;
}

function buildSampleReviewEmail(submission: SampleReviewSubmission, receivedAt: string): SampleReviewEmail {
    return {
        subject: `Sample Review Anfrage – ${submission.company} – ${submission.dataType}`,
        text: buildEmailText(submission, receivedAt),
        html: buildEmailHtml(submission, receivedAt),
        replyTo: submission.workEmail,
    };
}

export function createHandler(
    deps: { fetchImpl?: FetchLike; emailProvider?: EmailDeliveryProvider } & OperationalHandlerOptions = {},
) {
    const fetchImpl = deps.fetchImpl ?? ((input: string, init: RequestInit) => fetch(input, init));

    return createOperationalHandler('/api/sample-review', async (context: any) => {
        const request = context.request as Request;
        const env = context.env as Env;
        const operational = getOperationalState(request);
        const requestId = operational.context.requestId;

        const methodError = methodGuard(request, ['POST', 'HEAD'], requestId);
        if (methodError) return methodError;

        const feature = readFeatureControl(env, 'SAMPLE_REVIEW_ENABLED');
        if (request.method === 'HEAD') {
            return new Response(null, {
                status: feature.state === 'DISABLED' ? 204 : 409,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const originError = originGuard(request, requestId);
        if (originError) return originError;

        if (!feature.enabled) {
            return respondError(
                request,
                operational,
                requestId,
                503,
                feature.state === 'INVALID' ? 'CONFIGURATION_INVALID' : 'FEATURE_DISABLED',
                'Die Sample-Review-Funktion ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns direkt per E-Mail.',
            );
        }

        const recipients = parseRecipients(env.SAMPLE_REVIEW_EMAIL_TO ?? '');
        const isConfigured = Boolean(env.RESEND_API_KEY) && Boolean(env.SAMPLE_REVIEW_EMAIL_FROM) && recipients.length > 0;

        if (!isConfigured) {
            // Fail closed before touching the request body: the feature is off regardless of
            // what the visitor submitted, so no form data is parsed or retained.
            return respondError(
                request,
                operational,
                requestId,
                503,
                'FEATURE_NOT_CONFIGURED',
                'Die Sample-Review-Funktion ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns direkt per E-Mail.',
            );
        }

        const contentTypeError = requireContentType(request, 'multipart/form-data', requestId);
        if (contentTypeError) {
            recordFailure(operational, 'UNSUPPORTED_MEDIA_TYPE');
            return wantsHtmlResponse(request)
                ? renderErrorHtml('Ungültiger Anfragetyp.', 415)
                : contentTypeError;
        }

        const lengthError = checkContentLength(request, MAX_BODY_BYTES, requestId);
        if (lengthError) {
            recordFailure(operational, 'BODY_TOO_LARGE');
            return wantsHtmlResponse(request)
                ? renderErrorHtml('Anfrage ist zu groß.', 413)
                : lengthError;
        }

        const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        const ipHash = await hashIp(clientIP);

        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return respondError(request, operational, requestId, 400, 'MALFORMED_JSON', 'Ungültige Formular-Daten.');
        }

        const submission: SampleReviewSubmission = {
            name: normalize(formData.get('name')),
            company: normalize(formData.get('company')),
            workEmail: normalize(formData.get('workEmail')),
            dataType: normalize(formData.get('dataType')),
            targetUseCase: normalize(formData.get('targetUseCase')),
            estimatedVolume: normalize(formData.get('estimatedVolume')),
            notes: normalize(formData.get('notes')),
            consent: normalize(formData.get('privacyConsent')),
            website: normalize(formData.get('website')),
            submittedAt: normalize(formData.get('submittedAt')),
            successRedirect: normalize(formData.get('successRedirect')),
            formPath: normalize(formData.get('formPath')),
        };

        const successRedirect = normalizeAllowedPath(
            submission.successRedirect,
            ALLOWED_SUCCESS_REDIRECTS,
            '/sample-struktur-pruefen/danke',
        );
        const formPath = normalizeAllowedPath(
            submission.formPath,
            ALLOWED_FORM_PATHS,
            '/sample-struktur-pruefen',
        );

        if (submission.website) {
            return respondError(request, operational, requestId, 422, 'VALIDATION_FAILED', 'Anfrage abgelehnt.', { formPath });
        }

        const missingFields = [
            !submission.name && 'name',
            !submission.company && 'company',
            !submission.workEmail && 'workEmail',
            !submission.dataType && 'dataType',
            !submission.targetUseCase && 'targetUseCase',
            !submission.estimatedVolume && 'estimatedVolume',
            submission.consent !== 'on' && 'privacyConsent',
        ].filter(Boolean) as string[];

        if (missingFields.length > 0) {
            return respondError(request, operational, requestId, 422, 'VALIDATION_FAILED', 'Bitte füllen Sie alle Pflichtfelder aus.', {
                fields: missingFields,
                formPath,
            });
        }

        if (!isValidEmail(submission.workEmail)) {
            return respondError(request, operational, requestId, 422, 'VALIDATION_FAILED', 'Bitte geben Sie eine gültige Business-E-Mail an.', {
                fields: ['workEmail'],
                formPath,
            });
        }

        if (!ALLOWED_DATA_TYPES.has(submission.dataType)) {
            return respondError(request, operational, requestId, 422, 'VALIDATION_FAILED', 'Ungültiger Daten-/Dokumenttyp.', {
                fields: ['dataType'],
                formPath,
            });
        }

        if (!ALLOWED_TARGET_USE_CASES.has(submission.targetUseCase)) {
            return respondError(request, operational, requestId, 422, 'VALIDATION_FAILED', 'Ungültiger Ziel-Use-Case.', {
                fields: ['targetUseCase'],
                formPath,
            });
        }

        if (!ALLOWED_VOLUMES.has(submission.estimatedVolume)) {
            return respondError(request, operational, requestId, 422, 'VALIDATION_FAILED', 'Ungültiger Umfang.', {
                fields: ['estimatedVolume'],
                formPath,
            });
        }

        if (submission.notes.length > 4000) {
            return respondError(request, operational, requestId, 422, 'VALIDATION_FAILED', 'Zusätzliche Hinweise sind zu lang.', {
                fields: ['notes'],
                formPath,
            });
        }

        if (submission.submittedAt && !parseSubmittedAt(submission.submittedAt)) {
            return respondError(request, operational, requestId, 422, 'VALIDATION_FAILED', 'Anfrage wirkt automatisiert.', { formPath });
        }

        recordQuotaDecision(operational, 'ALLOWED');
        if (await hasThrottleEntry(request.url, ipHash)) {
            recordQuotaDecision(operational, 'REJECTED_COOLDOWN');
            return respondError(request, operational, requestId, 429, 'RATE_LIMITED', 'Zu viele Anfragen. Bitte warten Sie kurz.', {
                retryable: true,
                formPath,
            });
        }

        const receivedAt = new Date().toISOString();
        const emailDelivery = deps.emailProvider ?? createResendEmailProvider(env, fetchImpl);

        try {
            await setThrottleEntry(request.url, ipHash);
            startProviderCall(operational, 'none');
            await emailDelivery.send(buildSampleReviewEmail(submission, receivedAt));
            recordProviderOutcome(operational, { providerOutcome: 'SUCCEEDED' });
        } catch (error) {
            const failure = classifyProviderFailure(error, requestId);
            recordProviderOutcome(operational, {
                providerOutcome: failure.status === 504 ? 'TIMED_OUT' : 'FAILED',
            });
            recordFailure(
                operational,
                failure.status === 504 ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
            );
            return wantsHtmlResponse(request)
                ? renderErrorHtml('E-Mail-Versand fehlgeschlagen. Bitte versuchen Sie es später erneut.', failure.status, formPath)
                : failure;
        }

        if (wantsHtmlResponse(request)) {
            return Response.redirect(new URL(successRedirect, request.url), 303);
        }
        return jsonSuccess({ redirectTo: successRedirect }, requestId);
    }, deps);
}

export const onRequest = createHandler();
