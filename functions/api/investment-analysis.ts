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
export const onRequestPost = async (context: any) => {
    const request = context.request as Request;
    const env     = context.env as Env;

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');

    // ── Burst rate limit ────────────────────────────────────────────────────
    const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
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

    // ── Call o4-mini ────────────────────────────────────────────────────────
    try {
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({
                model:            'o4-mini',
                reasoning_effort: 'low',
                messages: [
                    { role: 'developer', content: buildSystemPrompt() },
                    { role: 'user',      content: userMessage },
                ],
                response_format: {
                    type:        'json_schema',
                    json_schema: {
                        name:   'investment_analysis',
                        strict: true,
                        schema: ANALYSIS_SCHEMA,
                    },
                },
                max_completion_tokens: 2000,
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

        console.log('[investment-analysis] finish_reason:', finishReason, '| has_content:', !!content, '| has_refusal:', !!refusal);

        if (!content) {
            console.error('[investment-analysis] null content — refusal:', refusal, '| full choice:', JSON.stringify(choice));
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
        console.error('Investment analysis error:', e);
        return new Response(JSON.stringify({ message: 'Interner Serverfehler.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
};
