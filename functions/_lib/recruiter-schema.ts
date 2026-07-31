// Canonical recruiter/job-fit result contract, shared by the JD analysis request builder
// (strict provider-side json_schema) and the mandatory server-side re-validation that runs
// regardless of whether the provider actually honored that schema. Represents the existing
// product concepts already defined by JOB_MATCH_PROMPT and rendered by
// ChatWidget.renderJdResult() — this file does not invent a second scoring model.
import { recordProviderOutcome, type OperationalState } from './operational-context.ts';

export const RECRUITER_RESULT_SCHEMA_NAME = 'recruiter_fit_result';

const VERDICTS = ['Strong Match', 'Good Match', 'Partial Match', 'Not Aligned'] as const;

// OpenAI Responses strict structured-output schema: every property must appear in `required`,
// and every object level must set `additionalProperties: false`.
export const RECRUITER_RESULT_SCHEMA = {
    type: 'object',
    properties: {
        verdict: { type: 'string', enum: [...VERDICTS] },
        score: { type: 'number' },
        summary: { type: 'string' },
        matches: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    skill: { type: 'string' },
                    detail: { type: 'string' },
                    source: { type: 'string' },
                },
                required: ['skill', 'detail', 'source'],
                additionalProperties: false,
            },
        },
        transferable: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    skill: { type: 'string' },
                    detail: { type: 'string' },
                },
                required: ['skill', 'detail'],
                additionalProperties: false,
            },
        },
        gaps: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    requirement: { type: 'string' },
                    detail: { type: 'string' },
                },
                required: ['requirement', 'detail'],
                additionalProperties: false,
            },
        },
        recommendation: { type: 'string' },
    },
    required: ['verdict', 'score', 'summary', 'matches', 'transferable', 'gaps', 'recommendation'],
    additionalProperties: false,
} as const;

export interface RecruiterMatch { skill: string; detail: string; source: string; }
export interface RecruiterTransferable { skill: string; detail: string; }
export interface RecruiterGap { requirement: string; detail: string; }
export interface RecruiterResult {
    verdict: string;
    score: number;
    summary: string;
    matches: RecruiterMatch[];
    transferable: RecruiterTransferable[];
    gaps: RecruiterGap[];
    recommendation: string;
}

const TOP_LEVEL_KEYS = ['verdict', 'score', 'summary', 'matches', 'transferable', 'gaps', 'recommendation'];

// Rejects anything that looks like an HTML/XML tag so no structured field can smuggle
// markup into a DOM insertion point, independent of the client already using textContent.
const HTML_TAG = /<\/?[a-z!][^>]*>/i;

function isCleanString(value: unknown): value is string {
    return typeof value === 'string' && !HTML_TAG.test(value);
}

function isNonEmptyCleanString(value: unknown): value is string {
    return isCleanString(value) && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateItems<T>(
    value: unknown,
    allowedKeys: string[],
    build: (o: Record<string, unknown>) => T | null,
): T[] | null {
    if (!Array.isArray(value)) return null;
    const out: T[] = [];
    for (const raw of value) {
        if (!isPlainObject(raw)) return null;
        if (Object.keys(raw).some((k) => !allowedKeys.includes(k))) return null;
        const built = build(raw);
        if (built === null) return null;
        out.push(built);
    }
    return out;
}

// Independent of provider-side structured output: parses/validates the complete recruiter
// result shape so a schema-noncompliant, incomplete, or HTML-bearing provider payload is
// rejected via the existing PROVIDER_MALFORMED telemetry contract rather than ever reaching
// the client as a 200 response.
export function validateRecruiterResult(value: unknown, state?: OperationalState): RecruiterResult | null {
    const fail = (): null => {
        if (state) recordProviderOutcome(state, { providerOutcome: 'MALFORMED' });
        return null;
    };

    if (!isPlainObject(value)) return fail();
    if (Object.keys(value).some((k) => !TOP_LEVEL_KEYS.includes(k))) return fail();

    if (!isCleanString(value.verdict) || !(VERDICTS as readonly string[]).includes(value.verdict)) return fail();
    if (typeof value.score !== 'number' || !Number.isFinite(value.score) || value.score < 0 || value.score > 100) {
        return fail();
    }
    if (!isNonEmptyCleanString(value.summary)) return fail();
    if (!isNonEmptyCleanString(value.recommendation)) return fail();

    const matches = validateItems<RecruiterMatch>(value.matches, ['skill', 'detail', 'source'], (o) => {
        if (!isNonEmptyCleanString(o.skill) || !isNonEmptyCleanString(o.detail) || !isCleanString(o.source)) return null;
        return { skill: o.skill, detail: o.detail, source: o.source };
    });
    if (!matches) return fail();

    const transferable = validateItems<RecruiterTransferable>(value.transferable, ['skill', 'detail'], (o) => {
        if (!isNonEmptyCleanString(o.skill) || !isNonEmptyCleanString(o.detail)) return null;
        return { skill: o.skill, detail: o.detail };
    });
    if (!transferable) return fail();

    const gaps = validateItems<RecruiterGap>(value.gaps, ['requirement', 'detail'], (o) => {
        if (!isNonEmptyCleanString(o.requirement) || !isNonEmptyCleanString(o.detail)) return null;
        return { requirement: o.requirement, detail: o.detail };
    });
    if (!gaps) return fail();

    return {
        verdict: value.verdict,
        score: value.score,
        summary: value.summary,
        matches,
        transferable,
        gaps,
        recommendation: value.recommendation,
    };
}
