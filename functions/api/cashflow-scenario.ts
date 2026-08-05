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
    AI_CASHFLOW_ENABLED?: string;
}

// ─── Transport limits ───────────────────────────────────────────────────────
const MAX_BODY_BYTES = 24 * 1024;
// Non-streaming: the full generation must complete before headers return, so this bound
// covers the whole medium-reasoning turn, not just time-to-first-byte.
const PROVIDER_TIMEOUT_MS = 35_000;

// ─── Model policy (R10.3b/R7.2 — approved, do not drift silently) ──
export const CASHFLOW_MODEL = 'gpt-5.6-terra';
export const CASHFLOW_REASONING_EFFORT = 'medium' as const;
export const CASHFLOW_TEXT_VERBOSITY = 'medium' as const;
export const CASHFLOW_MAX_OUTPUT_TOKENS = 4500;
export const CASHFLOW_SCHEMA_NAME = 'scenario_narratives';

export function buildCashflowRequestBody(input: ResponsesInputItem[]) {
    return buildResponsesBody({
        model: CASHFLOW_MODEL,
        input,
        reasoning: { effort: CASHFLOW_REASONING_EFFORT },
        text: {
            verbosity: CASHFLOW_TEXT_VERBOSITY,
            format: { type: 'json_schema', name: CASHFLOW_SCHEMA_NAME, strict: true, schema: NARRATIVE_SCHEMA },
        },
        max_output_tokens: CASHFLOW_MAX_OUTPUT_TOKENS,
    });
}

// ─── Rate limiting (burst protection) ──────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW       = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

// ─── Weekly quota (1 per 7 days, GDPR-compliant via Cache API) ─────────────
const WEEKLY_TTL = 604800;

async function hashIP(ip: string): Promise<string> {
    const data = new TextEncoder().encode(`cashflow-scenario:${ip}:salt_7d`);
    const buf  = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hasWeeklyQuota(ipHash: string, requestUrl: string): Promise<boolean> {
    const cache    = await caches.open('cashflow-scenario-weekly');
    const cacheKey = new Request(new URL(`/__cashflow_quota/${ipHash}`, requestUrl).toString());
    return (await cache.match(cacheKey)) !== undefined;
}

async function setWeeklyQuota(ipHash: string, requestUrl: string): Promise<void> {
    const cache    = await caches.open('cashflow-scenario-weekly');
    const cacheKey = new Request(new URL(`/__cashflow_quota/${ipHash}`, requestUrl).toString());
    await cache.put(cacheKey, new Response('1', {
        headers: { 'Cache-Control': `public, max-age=${WEEKLY_TTL}` },
    }));
}

// ─── Types (mirrors frontend types) ───────────────────────────────────────
interface MonthlyDataPoint {
    month: string;
    revenue: number;
    costs: number;
    net: number;
    cumulative: number;
}

interface ScenarioPayload {
    type: 'late_payment' | 'churn_spike' | 'cost_shock';
    title: string;
    monthlyData: MonthlyDataPoint[];
}

interface RequestPayload {
    initialCash:    number;
    baseProjection: MonthlyDataPoint[];
    scenarios:      ScenarioPayload[];
}

// ─── JSON Schema for narratives only ──────────────────────────────────────
// We send the calculated numbers; LLM writes the analysis. No math from LLM.
const NARRATIVE_SCHEMA = {
    type: 'object',
    properties: {
        scenarios: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type:      { type: 'string', enum: ['late_payment', 'churn_spike', 'cost_shock'] },
                    narrative: { type: 'string' },
                },
                required: ['type', 'narrative'],
                additionalProperties: false,
            },
        },
    },
    required: ['scenarios'],
    additionalProperties: false,
};

// ─── System prompt ─────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
    return `Du bist ein erfahrener CFO-Berater für DACH-Startups und KMUs.

Du erhältst berechnete Cashflow-Krisenszenarien (Zahlen bereits vom System berechnet).
Deine Aufgabe: Schreibe für jedes Szenario eine präzise, handlungsorientierte Analyse auf Deutsch.

Für jedes Szenario:
- Erkläre die konkrete finanzielle Auswirkung anhand der Zahlen (Liquiditätsveränderung, kritische Monate)
- Nenne 1-2 konkrete Gegenmaßnahmen, die das Unternehmen sofort ergreifen kann
- Ton: direkt, professionell, keine Panik — aber klar über die Risiken

Maximale Länge pro narrative: 3 Sätze.
Keine generischen Ratschläge — beziehe dich auf die konkreten Zahlen.`;
}

// ─── Input validation ───────────────────────────────────────────────────────
function validateInput(raw: unknown): RequestPayload | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;

    if (typeof r.initialCash !== 'number') return null;
    if (!Array.isArray(r.baseProjection) || r.baseProjection.length !== 12) return null;
    if (!Array.isArray(r.scenarios) || r.scenarios.length !== 3) return null;

    for (const sc of r.scenarios) {
        if (typeof sc !== 'object' || sc === null) return null;
        const s = sc as Record<string, unknown>;
        if (!['late_payment', 'churn_spike', 'cost_shock'].includes(s.type as string)) return null;
        if (!Array.isArray(s.monthlyData) || s.monthlyData.length !== 12) return null;
    }

    return r as unknown as RequestPayload;
}

// ─── Format numbers for LLM context ────────────────────────────────────────
function eur(v: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

function summarizeProjection(data: MonthlyDataPoint[]): string {
    const minMonth = data.reduce((a, b) => a.cumulative < b.cumulative ? a : b);
    const endBalance = data.at(-1)!.cumulative;
    const insolvencyMonth = data.findIndex(d => d.cumulative < 0);
    const insolvencyNote = insolvencyMonth >= 0
        ? ` INSOLVENZRISIKO in Monat ${insolvencyMonth + 1} (${data[insolvencyMonth].month}, Kasse: ${eur(data[insolvencyMonth].cumulative)}).`
        : ' Keine Insolvenz im Prognosezeitraum.';
    return `Endbestand M12: ${eur(endBalance)}, Tiefpunkt: ${eur(minMonth.cumulative)} (${minMonth.month}).${insolvencyNote}`;
}

// ─── Request handler ────────────────────────────────────────────────────────
export function createHandler(deps: { fetchImpl?: FetchLike } & OperationalHandlerOptions = {}) {
    const fetchImpl = deps.fetchImpl ?? ((input: string, init: RequestInit) => fetch(input, init));

    return createOperationalHandler('/api/cashflow-scenario', async (context: any) => {
        const request = context.request as Request;
        const env     = context.env as Env;
        const operational = getOperationalState(request);
        const requestId = operational.context.requestId;

        const methodError = methodGuard(request, ['POST'], requestId);
        if (methodError) return methodError;

        const originError = originGuard(request, requestId);
        if (originError) return originError;

        const feature = readFeatureControl(env, 'AI_CASHFLOW_ENABLED');
        if (!feature.enabled) {
            return jsonError(
                503,
                feature.state === 'INVALID' ? 'CONFIGURATION_INVALID' : 'FEATURE_DISABLED',
                'Scenario analysis is temporarily unavailable.',
                requestId,
            );
        }

        if (!env.OPENAI_API_KEY) {
            return jsonError(503, 'FEATURE_NOT_CONFIGURED', 'Scenario analysis is temporarily unavailable.', requestId);
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

            // ── Burst rate limit (skipped on localhost for development) ─────────────
            const clientIP  = request.headers.get('CF-Connecting-IP') ?? 'unknown';
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

            // ── Build context for LLM — numbers only, no calculations requested ─────
            const baseSum = summarizeProjection(validated.baseProjection);
            const scenarioSummaries = validated.scenarios.map(sc =>
                `${sc.title} (${sc.type}): ${summarizeProjection(sc.monthlyData)}`
            ).join('\n');

            const userMessage = `Startkapital: ${eur(validated.initialCash)}

Basis-Prognose: ${baseSum}

Krisenszenarien (berechnet):
${scenarioSummaries}

Bitte analysiere jedes Szenario und gib Handlungsempfehlungen.`;

            // ── Call Responses API with strict structured output for narratives ─────
            const input: ResponsesInputItem[] = [
                { role: 'developer', content: buildSystemPrompt() },
                { role: 'user', content: userMessage },
            ];

            let openAIResponse: Response;
            try {
                openAIResponse = await callResponses(
                    fetchImpl,
                    env.OPENAI_API_KEY,
                    buildCashflowRequestBody(input),
                    PROVIDER_TIMEOUT_MS,
                    { state: operational, modelTier: 'terra' },
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
