interface Env {
    RESEND_API_KEY: string;
    SAMPLE_REVIEW_EMAIL_FROM: string;
    SAMPLE_REVIEW_EMAIL_TO: string;
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
}

const THROTTLE_WINDOW_MS = 60 * 1000;
const MIN_SUBMISSION_AGE_MS = 1500;
const MAX_SUBMISSION_AGE_MS = 24 * 60 * 60 * 1000;
const THROTTLE_CACHE_NAME = 'sample-review-throttle';
const THROTTLE_KEY_PREFIX = '/__sample_review_throttle/';

const ALLOWED_DATA_TYPES = new Set([
    'PDF / Scan-Dokumente',
    'DOCX / Policies / Handbücher',
    'ERP-Export / FiBu-Daten',
    'XRechnung / XML / strukturierte Business-Dokumente',
    'Andere',
]);

const ALLOWED_TARGET_USE_CASES = new Set([
    'RAG / Knowledge Base',
    'Document AI',
    'ERP & FiBu Cleanup',
    'Compliance Transformation',
    'Noch unklar',
]);

const ALLOWED_VOLUMES = new Set([
    'Einzelnes Dokument / kleiner Beispieldatensatz',
    'Kleines Paket',
    'Mittlerer Bestand',
    'Größerer Bestand / noch unklar',
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

function renderErrorHtml(message: string, status: number): Response {
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
        <a href="/sample-struktur-pruefen">Zurück zum Formular</a>
      </section>
    </main>
  </body>
</html>`;

    return new Response(html, {
        status,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}

function renderJsonError(message: string, status: number, fields?: string[]): Response {
    return new Response(JSON.stringify(fields ? { message, fields } : { message }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
    });
}

function errorResponse(request: Request, status: number, message: string, fields?: string[]): Response {
    return wantsHtmlResponse(request)
        ? renderErrorHtml(message, status)
        : renderJsonError(message, status, fields);
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

interface EmailDeliveryProvider {
    send(message: SampleReviewEmail): Promise<void>;
}

function createResendEmailProvider(env: Env): EmailDeliveryProvider {
    return {
        async send(message: SampleReviewEmail): Promise<void> {
            const recipients = parseRecipients(env.SAMPLE_REVIEW_EMAIL_TO);

            if (!env.RESEND_API_KEY || !env.SAMPLE_REVIEW_EMAIL_FROM || recipients.length === 0) {
                throw new Error('Missing email configuration.');
            }

            const response = await fetch('https://api.resend.com/emails', {
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
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Email provider error ${response.status}: ${errorText}`);
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

export const onRequest = async (context: any) => {
    const request = context.request as Request;
    const env = context.env as Env;

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: {
                Allow: 'POST',
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    }

    const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const ipHash = await hashIp(clientIP);

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return errorResponse(request, 400, 'Ungültige Formular-Daten.');
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
    };

    if (submission.website) {
        return errorResponse(request, 400, 'Anfrage abgelehnt.');
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
        return errorResponse(request, 400, 'Bitte füllen Sie alle Pflichtfelder aus.', missingFields);
    }

    if (!isValidEmail(submission.workEmail)) {
        return errorResponse(request, 400, 'Bitte geben Sie eine gültige Business-E-Mail an.');
    }

    if (!ALLOWED_DATA_TYPES.has(submission.dataType)) {
        return errorResponse(request, 400, 'Ungültiger Daten-/Dokumenttyp.');
    }

    if (!ALLOWED_TARGET_USE_CASES.has(submission.targetUseCase)) {
        return errorResponse(request, 400, 'Ungültiger Ziel-Use-Case.');
    }

    if (!ALLOWED_VOLUMES.has(submission.estimatedVolume)) {
        return errorResponse(request, 400, 'Ungültiger Umfang.');
    }

    if (submission.notes.length > 4000) {
        return errorResponse(request, 400, 'Zusätzliche Hinweise sind zu lang.');
    }

    if (submission.submittedAt && !parseSubmittedAt(submission.submittedAt)) {
        return errorResponse(request, 400, 'Anfrage wirkt automatisiert.');
    }

    if (await hasThrottleEntry(request.url, ipHash)) {
        return errorResponse(request, 429, 'Zu viele Anfragen. Bitte warten Sie kurz.');
    }

    const receivedAt = new Date().toISOString();

    try {
        await setThrottleEntry(request.url, ipHash);
        const emailDelivery = createResendEmailProvider(env);
        await emailDelivery.send(buildSampleReviewEmail(submission, receivedAt));
    } catch (error) {
        console.error('[sample-review] email delivery failed:', error);
        return errorResponse(request, 502, 'E-Mail-Versand fehlgeschlagen.');
    }

    return Response.redirect(new URL('/sample-struktur-pruefen/danke', request.url), 303);
};
