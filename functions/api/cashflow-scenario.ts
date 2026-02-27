interface Env {
    OPENAI_API_KEY: string;
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
export const onRequestPost = async (context: any) => {
    const request = context.request as Request;
    const env     = context.env as Env;

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');

    // ── Burst rate limit (skipped on localhost for development) ─────────────
    const clientIP  = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!isLocal) {
        const now       = Date.now();
        const rateEntry = rateLimitMap.get(clientIP);

        if (rateEntry) {
            if (now < rateEntry.resetTime) {
                if (rateEntry.count >= MAX_REQUESTS_PER_WINDOW) {
                    return new Response(JSON.stringify({ message: 'Zu viele Anfragen. Bitte warten Sie kurz.' }), {
                        status: 429, headers: { 'Content-Type': 'application/json' },
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
            return new Response(JSON.stringify({ message: 'Wochenlimit erreicht. Nächste Auswertung in 7 Tagen verfügbar.' }), {
                status: 429, headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    // ── Parse & validate ────────────────────────────────────────────────────
    let body: unknown;
    try { body = await request.json(); }
    catch {
        return new Response(JSON.stringify({ message: 'Ungültiger JSON-Body.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const validated = validateInput(body);
    if (!validated) {
        return new Response(JSON.stringify({ message: 'Ungültige Eingabedaten.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
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

    // ── Call o4-mini with structured output for narratives ──────────────────
    try {
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({
                model:            'o4-mini',
                reasoning_effort: 'low',              // minimize reasoning token overhead
                messages: [
                    { role: 'developer', content: buildSystemPrompt() },  // o4-mini uses 'developer' not 'system'
                    { role: 'user',      content: userMessage },
                ],
                response_format: {
                    type:        'json_schema',
                    json_schema: {
                        name:   'scenario_narratives',
                        strict: true,
                        schema: NARRATIVE_SCHEMA,
                    },
                },
                max_completion_tokens: 2000,           // budget for reasoning (~500) + response (~300)
            }),
        });

        if (!openAIResponse.ok) {
            const errText = await openAIResponse.text();
            console.error('OpenAI HTTP error:', openAIResponse.status, errText);
            return new Response(JSON.stringify({ message: 'KI-Analyse fehlgeschlagen. Bitte später erneut versuchen.' }), {
                status: 502, headers: { 'Content-Type': 'application/json' },
            });
        }

        const data       = await openAIResponse.json() as any;
        const choice     = data.choices?.[0];
        const content    = choice?.message?.content;
        const refusal    = choice?.message?.refusal;
        const finishReason = choice?.finish_reason;

        console.log('[cashflow-scenario] finish_reason:', finishReason, '| has_content:', !!content, '| has_refusal:', !!refusal);

        if (!content) {
            console.error('[cashflow-scenario] null content — refusal:', refusal, '| full choice:', JSON.stringify(choice));
            return new Response(JSON.stringify({ message: 'Keine Antwort vom KI-Modell erhalten.' }), {
                status: 502, headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = JSON.parse(content);

        if (!isLocal) {
            const ipHash = await hashIP(clientIP);
            await setWeeklyQuota(ipHash, request.url);
        }

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });

    } catch (e) {
        console.error('Cashflow scenario error:', e);
        return new Response(JSON.stringify({ message: 'Interner Serverfehler.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
