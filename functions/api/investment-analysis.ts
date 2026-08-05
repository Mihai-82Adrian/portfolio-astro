import {
    classifyProviderFailure,
    jsonError,
    jsonSuccess,
    methodGuard,
    originGuard,
    readJsonBody,
    type FetchLike,
} from '../_lib/http.ts';
import {
    buildResponsesBody,
    callResponses,
    extractResponsesOutcome,
    parseStructuredJSON,
    type ResponsesInputItem,
} from '../_lib/responses.ts';
import { readFeatureControl } from '../_lib/feature-controls.ts';
import { hasValidAiPrivacyConsent } from '../_lib/privacy-consent.ts';
import {
    createOperationalHandler,
    getOperationalState,
    recordQuotaDecision,
    type OperationalHandlerOptions,
} from '../_lib/operational-context.ts';

interface Env {
    OPENAI_API_KEY: string;
    AI_INVESTMENT_ENABLED?: string;
}

// ─── Transport limits ───────────────────────────────────────────────────────
const MAX_BODY_BYTES = 8 * 1024;
// Non-streaming: the full generation must complete before headers return, so this bound
// covers the whole medium-reasoning turn, not just time-to-first-byte.
const PROVIDER_TIMEOUT_MS = 35_000;

// ─── Model policy (R10.3b/R7.2 — approved, do not drift silently) ──
export const INVESTMENT_MODEL = 'gpt-5.6-sol';
export const INVESTMENT_REASONING_EFFORT = 'medium' as const;
export const INVESTMENT_TEXT_VERBOSITY = 'medium' as const;
export const INVESTMENT_MAX_OUTPUT_TOKENS = 5000;
export const INVESTMENT_SCHEMA_NAME = 'investment_analysis';

export function buildInvestmentRequestBody(input: ResponsesInputItem[]) {
    return buildResponsesBody({
        model: INVESTMENT_MODEL,
        input,
        reasoning: { effort: INVESTMENT_REASONING_EFFORT },
        text: {
            verbosity: INVESTMENT_TEXT_VERBOSITY,
            format: { type: 'json_schema', name: INVESTMENT_SCHEMA_NAME, strict: true, schema: ANALYSIS_SCHEMA },
        },
        max_output_tokens: INVESTMENT_MAX_OUTPUT_TOKENS,
    });
}

// ─── Rate limiting (burst protection) ──────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW       = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

// ─── Weekly quota (1 per 7 days, GDPR-compliant via Cache API) ─────────────
const WEEKLY_TTL = 604800;

async function hashIP(ip: string): Promise<string> {
    const data = new TextEncoder().encode(`investment-analysis:${ip}:salt_7d`);
    const buf  = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hasWeeklyQuota(ipHash: string, requestUrl: string): Promise<boolean> {
    const cache    = await caches.open('investment-analysis-weekly');
    const cacheKey = new Request(new URL(`/__investment_quota/${ipHash}`, requestUrl).toString());
    return (await cache.match(cacheKey)) !== undefined;
}

async function setWeeklyQuota(ipHash: string, requestUrl: string): Promise<void> {
    const cache    = await caches.open('investment-analysis-weekly');
    const cacheKey = new Request(new URL(`/__investment_quota/${ipHash}`, requestUrl).toString());
    await cache.put(cacheKey, new Response('1', {
        headers: { 'Cache-Control': `public, max-age=${WEEKLY_TTL}` },
    }));
}

// ─── Structured output schema ──────────────────────────────────────────────
const ANALYSIS_SCHEMA = {
    type: 'object',
    properties: {
        summary:        { type: 'string' },
        strengths:      { type: 'string' },
        risks:          { type: 'string' },
        recommendation: { type: 'string' },
    },
    required: ['summary', 'strengths', 'risks', 'recommendation'],
    additionalProperties: false,
};

// ─── System prompt ─────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
    return `Du bist ein erfahrener CFO-Berater und Portfoliomanager mit Expertise im DACH-Raum.

Du erhältst berechnete Investitionskennzahlen (Zahlen bereits vom System berechnet).
Deine Aufgabe: Analysiere die Kennzahlen und gib eine strukturierte, handlungsorientierte Bewertung auf Deutsch.

Anforderungen:
- Beziehe dich auf konkrete Zahlen aus den berechneten Metriken
- summary: 2-3 Sätze — Gesamtbild der Investition (Rendite-Risiko-Profil)
- strengths: 1-2 Sätze — Was spricht für diese Investition (konkrete Zahlen nennen)
- risks: 1-2 Sätze — Wichtigste Risiken und Warnsignale (z.B. hoher Drawdown, niedriger Sharpe)
- recommendation: 1 Satz — Konkrete Handlungsempfehlung

Ton: direkt, professionell, faktenbasiert. Keine Allgemeinplätze.`;
}

// ─── Format helpers ─────────────────────────────────────────────────────────
function eur(v: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

function pct(v: number): string {
    return `${v.toFixed(1).replace('.', ',')} %`;
}

// ─── Input validation ────────────────────────────────────────────────────────
function validateInput(raw: unknown): Record<string, any> | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.initialInvestment !== 'number') return null;
    if (typeof r.returnMetrics !== 'object' || r.returnMetrics === null) return null;
    if (typeof r.riskMetrics !== 'object' || r.riskMetrics === null) return null;
    return r as Record<string, any>;
}

// ─── Request handler ────────────────────────────────────────────────────────
export function createHandler(deps: { fetchImpl?: FetchLike } & OperationalHandlerOptions = {}) {
    const fetchImpl = deps.fetchImpl ?? ((input: string, init: RequestInit) => fetch(input, init));

    return createOperationalHandler('/api/investment-analysis', async (context: any) => {
        const request = context.request as Request;
        const env     = context.env as Env;
        const operational = getOperationalState(request);
        const requestId = operational.context.requestId;

        const methodError = methodGuard(request, ['POST'], requestId);
        if (methodError) return methodError;

        const originError = originGuard(request, requestId);
        if (originError) return originError;

        const feature = readFeatureControl(env, 'AI_INVESTMENT_ENABLED');
        if (!feature.enabled) {
            return jsonError(
                503,
                feature.state === 'INVALID' ? 'CONFIGURATION_INVALID' : 'FEATURE_DISABLED',
                'Investment analysis is temporarily unavailable.',
                requestId,
            );
        }

        if (!env.OPENAI_API_KEY) {
            return jsonError(503, 'FEATURE_NOT_CONFIGURED', 'Investment analysis is temporarily unavailable.', requestId);
        }

        const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
        recordQuotaDecision(operational, isLocal ? 'BYPASSED_LOCAL' : 'ALLOWED');

        try {
            // ── Parse body first — the AI contextual consent gate below depends on it and
            // must run before any quota lookup/write, rate limiting, or provider preparation.
            const bodyResult = await readJsonBody<unknown>(request, requestId, MAX_BODY_BYTES);
            if (!bodyResult.ok) return bodyResult.response;

            // ── AI contextual consent gate ───────────────────────────────────────────
            if (!hasValidAiPrivacyConsent(bodyResult.data as Record<string, unknown>)) {
                return jsonError(
                    400,
                    'PRIVACY_CONSENT_REQUIRED',
                    'Contextual confirmation is required before this request can be processed externally.',
                    requestId,
                );
            }

            // ── Burst rate limit ────────────────────────────────────────────────────
            const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
            if (!isLocal) {
                const now       = Date.now();
                const rateEntry = rateLimitMap.get(clientIP);
                if (rateEntry) {
                    if (now < rateEntry.resetTime) {
                        if (rateEntry.count >= MAX_REQUESTS_PER_WINDOW) {
                            recordQuotaDecision(operational, 'REJECTED_LIMIT');
                            return jsonError(429, 'RATE_LIMITED', 'Zu viele Anfragen. Bitte warten Sie kurz.', requestId, {
                                retryable: true,
                            });
                        }
                        rateEntry.count++;
                    } else {
                        rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
                    }
                } else {
                    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
                }
            }

            // ── Weekly quota ────────────────────────────────────────────────────────
            if (!isLocal) {
                const ipHash = await hashIP(clientIP);
                if (await hasWeeklyQuota(ipHash, request.url)) {
                    recordQuotaDecision(operational, 'REJECTED_COOLDOWN');
                    return jsonError(429, 'QUOTA_EXCEEDED', 'Wochenlimit erreicht. Nächste Auswertung in 7 Tagen verfügbar.', requestId, {
                        retryable: false,
                    });
                }
            }

            // ── Validate business payload (already parsed above) ────────────────────
            const validated = validateInput(bodyResult.data);
            if (!validated) {
                return jsonError(422, 'VALIDATION_FAILED', 'Ungültige Eingabedaten.', requestId);
            }

            const { initialInvestment, returnMetrics, riskMetrics, taxResult, mcResult } = validated;
            const rm = returnMetrics;
            const risk = riskMetrics;

            // ── Build context for LLM ───────────────────────────────────────────────
            const mcSummary = mcResult
                ? `\nMonte Carlo (1.000 Pfade): Gewinnwahrscheinlichkeit ${pct(mcResult.probPositive)}, Erwarteter Schlusswert ${eur(mcResult.expectedFinalValue)}, P5=${eur(mcResult.p5Final)}, P95=${eur(mcResult.p95Final)}`
                : '';

            const userMessage = `Investitionsbetrag: ${eur(initialInvestment)}

Rendite-Kennzahlen:
- ROI: ${pct(rm.roi)}
- CAGR: ${rm.cagr !== null ? pct(rm.cagr) + ' p.a.' : 'nicht anwendbar (mehrere Cashflows — siehe IRR)'}
- IRR: ${rm.irr !== null ? pct(rm.irr) : 'nicht konvergiert'}
- NPV: ${eur(rm.npv)}
- Amortisation: ${rm.paybackYear !== null ? `Jahr ${rm.paybackYear}` : 'nicht erreicht'}

Risiko-Kennzahlen:
- Sharpe Ratio: ${risk.sharpeRatio.toFixed(2)}
- Sortino Ratio: ${risk.sortinoRatio.toFixed(2)}
- Max. Drawdown: ${pct(risk.maxDrawdown)}
- Volatilität p.a.: ${pct(risk.annualizedVolatility)}
- VaR 95%: ${eur(risk.var95)}
- VaR 99%: ${eur(risk.var99)}

Steuer (Abgeltungsteuer): Bruttogewinn ${eur(taxResult?.grossGain ?? 0)}, Netto ${eur(taxResult?.netGain ?? 0)}, effektiv ${pct(taxResult?.effectiveTax ?? 0)}${mcSummary}

Bitte analysiere diese Investition und gib eine strukturierte Bewertung.`;

            // ── Call Responses API with strict structured output ─────────────────────
            const input: ResponsesInputItem[] = [
                { role: 'developer', content: buildSystemPrompt() },
                { role: 'user', content: userMessage },
            ];

            let openAIResponse: Response;
            try {
                openAIResponse = await callResponses(
                    fetchImpl,
                    env.OPENAI_API_KEY,
                    buildInvestmentRequestBody(input),
                    PROVIDER_TIMEOUT_MS,
                    { state: operational, modelTier: 'sol' },
                );
            } catch (err) {
                return classifyProviderFailure(err, requestId);
            }

            if (!openAIResponse.ok) {
                await openAIResponse.text();
                return jsonError(502, 'PROVIDER_REJECTED', 'KI-Analyse fehlgeschlagen. Bitte später erneut versuchen.', requestId, {
                    retryable: true,
                });
            }

            const data = await openAIResponse.json() as unknown;
            const outcome = extractResponsesOutcome(data, operational);

            if (outcome.kind !== 'completed') {
                return jsonError(502, 'PROVIDER_REJECTED', 'Keine Antwort vom KI-Modell erhalten.', requestId, { retryable: true });
            }

            const parsed = parseStructuredJSON(outcome.text, operational);
            if (!parsed.ok) {
                return jsonError(502, 'PROVIDER_REJECTED', 'Ungültige Antwort vom KI-Modell erhalten.', requestId, { retryable: true });
            }
            const result = parsed.data;

            if (!isLocal) {
                const ipHash = await hashIP(clientIP);
                await setWeeklyQuota(ipHash, request.url);
            }

            return jsonSuccess(result, requestId);

        } catch {
            return jsonError(500, 'INTERNAL_ERROR', 'Interner Serverfehler.', requestId, { retryable: true });
        }
    }, deps);
}

export const onRequest = createHandler();
