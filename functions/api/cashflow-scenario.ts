interface Env {
    OPENAI_API_KEY: string;
}

// ─── Rate limiting (burst protection) ──────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW   = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

// ─── Weekly quota (1 per 7 days, GDPR-compliant via Cache API) ─────────────
const WEEKLY_TTL = 604800; // 7 days in seconds

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

// ─── JSON Schema for OpenAI Structured Outputs ─────────────────────────────
const SCENARIO_SCHEMA = {
    type: 'object',
    properties: {
        scenarios: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type:  { type: 'string', enum: ['late_payment', 'churn_spike', 'cost_shock'] },
                    title: { type: 'string' },
                    parameters: {
                        type: 'object',
                        properties: {
                            percentAffected:        { type: 'number' },
                            delayDays:              { type: 'number' },
                            costIncreasePercent:    { type: 'number' },
                            additionalOneTimeCost:  { type: 'number' },
                        },
                        required: ['percentAffected', 'delayDays', 'costIncreasePercent', 'additionalOneTimeCost'],
                        additionalProperties: false,
                    },
                    narrative:   { type: 'string' },
                    monthlyData: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                month:      { type: 'string' },
                                revenue:    { type: 'number' },
                                costs:      { type: 'number' },
                                net:        { type: 'number' },
                                cumulative: { type: 'number' },
                            },
                            required: ['month', 'revenue', 'costs', 'net', 'cumulative'],
                            additionalProperties: false,
                        },
                    },
                },
                required: ['type', 'title', 'parameters', 'narrative', 'monthlyData'],
                additionalProperties: false,
            },
        },
    },
    required: ['scenarios'],
    additionalProperties: false,
};

// ─── System prompt ─────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
    return `Du bist ein erfahrener CFO-Berater für DACH-Startups und KMUs mit 15 Jahren Erfahrung in Liquiditätsplanung und Krisenmanagement.

Du erhältst das Cashflow-Modell eines Unternehmens: Startkapital, monatliche Finanzpositionen und eine 12-Monats-Basisprognose.

Deine Aufgabe: Generiere EXAKT 3 Krisenszenarien mit realistischen, modellspezifischen Parametern.

SZENARIO 1 — late_payment (Zahlungsverzug):
- Analysiere die Einnahmequellen des Modells
- Bestimme einen realistischen Prozentsatz betroffener B2B-Forderungen (percentAffected) und Verzugstage (delayDays)
- Berechne neue monatliche Einnahmen unter Berücksichtigung der Verschiebung
- Schreibe eine präzise 1-2-Satz-Beschreibung auf Deutsch

SZENARIO 2 — churn_spike (Kundenverlust):
- Fokussiere auf MRR/Abonnement-Einnahmen; wenn keine vorhanden, adaptiere auf Projektabbrüche
- Bestimme realistischen Churn (percentAffected) basierend auf der Branchenstruktur des Modells
- delayDays = 0 für dieses Szenario
- Berechne die monatlichen Auswirkungen kumulativ

SZENARIO 3 — cost_shock (Kostenschock):
- Analysiere die Kostenbasis des Modells
- Bestimme realistischen Kostenanstieg (costIncreasePercent) und eine einmalige Zusatzbelastung (additionalOneTimeCost) in Monat 3
- percentAffected = 0, delayDays = 0 für dieses Szenario

WICHTIG:
- monthlyData muss EXAKT 12 Einträge haben (Monat 1 bis 12)
- Alle Zahlen in EUR, gerundet auf ganze Zahlen
- cumulative = kumulierter Kassenbestand unter dem Szenario, beginnend mit dem übergebenen initialCash
- Die narrative muss das konkrete Modell referenzieren, nicht generisch sein
- Setze unrelevante Parameter auf 0`;
}

// ─── Input validation ───────────────────────────────────────────────────────
interface BlockPayload {
    id: string;
    category: string;
    subcategory: string;
    label: string;
    amount: number;
    growthRate?: number;
    variablePercent?: number;
    oneTimeMonth?: number;
}

interface DataPointPayload {
    month: string;
    revenue: number;
    costs: number;
    net: number;
    cumulative: number;
}

function validateInput(raw: unknown): { initialCash: number; blocks: BlockPayload[]; baseProjection: DataPointPayload[] } | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;

    if (typeof r.initialCash !== 'number' || r.initialCash < 0) return null;
    if (!Array.isArray(r.blocks) || r.blocks.length === 0 || r.blocks.length > 50) return null;
    if (!Array.isArray(r.baseProjection) || r.baseProjection.length !== 12) return null;

    for (const b of r.blocks) {
        if (typeof b !== 'object' || b === null) return null;
        const block = b as Record<string, unknown>;
        if (typeof block.category !== 'string') return null;
        if (typeof block.amount !== 'number' || block.amount < 0) return null;
    }

    return {
        initialCash:    r.initialCash as number,
        blocks:         r.blocks as BlockPayload[],
        baseProjection: r.baseProjection as DataPointPayload[],
    };
}

// ─── Request handler ────────────────────────────────────────────────────────
export const onRequestPost = async (context: any) => {
    const request = context.request as Request;
    const env     = context.env as Env;

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');

    // ── CORS preflight ──────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // ── Burst rate limit ────────────────────────────────────────────────────
    const clientIP   = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const now        = Date.now();
    const rateEntry  = rateLimitMap.get(clientIP);

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

    // ── Weekly quota ────────────────────────────────────────────────────────
    if (!isLocal) {
        const ipHash = await hashIP(clientIP);
        if (await hasWeeklyQuota(ipHash, request.url)) {
            return new Response(JSON.stringify({ message: 'Wochenlimit erreicht. Nächste Auswertung in 7 Tagen verfügbar.' }), {
                status: 429, headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    // ── Parse & validate body ───────────────────────────────────────────────
    let body: unknown;
    try {
        body = await request.json();
    } catch {
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

    // ── Build user message ──────────────────────────────────────────────────
    const blocksText = validated.blocks.map(b => {
        const suffix = b.variablePercent ? ` (${b.variablePercent}% Umsatz)`
                     : b.growthRate      ? ` (+${b.growthRate}%/Monat Wachstum)`
                     : b.oneTimeMonth !== undefined ? ` (einmalig Monat ${b.oneTimeMonth + 1})`
                     : '';
        return `  - [${b.category}] ${b.label}: ${b.amount}€${suffix}`;
    }).join('\n');

    const projText = validated.baseProjection.map((p, i) =>
        `  Monat ${i + 1} (${p.month}): Einnahmen ${p.revenue}€, Kosten ${p.costs}€, Netto ${p.net}€, Kasse ${p.cumulative}€`
    ).join('\n');

    const userMessage = `Cashflow-Modell:
Startkapital: ${validated.initialCash}€

Finanzpositionen:
${blocksText}

Basisprognose (12 Monate):
${projText}

Bitte generiere die 3 Krisenszenarien für dieses spezifische Modell.`;

    // ── Call OpenAI Chat Completions with Structured Outputs ────────────────
    try {
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({
                model: 'o4-mini',
                messages: [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user',   content: userMessage },
                ],
                response_format: {
                    type:        'json_schema',
                    json_schema: {
                        name:   'cashflow_scenarios',
                        strict: true,
                        schema: SCENARIO_SCHEMA,
                    },
                },
                max_completion_tokens: 4000,
            }),
        });

        if (!openAIResponse.ok) {
            const errText = await openAIResponse.text();
            console.error('OpenAI error:', errText);
            return new Response(JSON.stringify({ message: 'KI-Analyse fehlgeschlagen. Bitte später erneut versuchen.' }), {
                status: 502, headers: { 'Content-Type': 'application/json' },
            });
        }

        const data   = await openAIResponse.json() as any;
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            return new Response(JSON.stringify({ message: 'Keine Antwort vom KI-Modell erhalten.' }), {
                status: 502, headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = JSON.parse(content);

        // ── Set weekly quota on success ─────────────────────────────────────
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
