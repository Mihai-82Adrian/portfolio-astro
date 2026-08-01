// Narrow, Responses-API-only provider boundary shared by every OpenAI-backed Function.
// Owns: the single /v1/responses URL, auth headers, unconditional `store: false`, timeout
// integration, SSE decoding, and non-streaming output/structured-output extraction.
// Does NOT own: model choice, reasoning effort, verbosity, prompts/instructions, trusted
// context, untrusted input, endpoint-specific JSON Schemas, or output-token limits — those
// stay in each functions/api/*.ts file as explicit, auditable constants and request builders.
import { fetchWithTimeout, ProviderTimeoutError, type FetchLike } from './http.ts';
import {
    recordFirstProviderOutput,
    recordProviderHttpResponse,
    recordProviderOutcome,
    recordProviderUsage,
    startProviderCall,
    type OperationalState,
} from './operational-context.ts';
import type { ModelTier } from './operational-logger.ts';

export const RESPONSES_API_URL = 'https://api.openai.com/v1/responses';

export type ReasoningEffort = 'low' | 'medium' | 'high';
export type TextVerbosity = 'low' | 'medium' | 'high';

export interface ResponsesInputItem {
    role: 'developer' | 'user';
    content: string;
}

export interface StructuredFormat {
    type: 'json_schema';
    name: string;
    strict: true;
    schema: Record<string, unknown>;
}

export interface ResponsesRequestParams {
    model: string;
    input: ResponsesInputItem[];
    reasoning: { effort: ReasoningEffort };
    text: { verbosity: TextVerbosity; format?: StructuredFormat };
    max_output_tokens: number;
    stream?: boolean;
}

// The one place `store: false` is set. Every request body assembled here is stateless by
// construction — no caller can omit or silently drift it, and no prior-response reference or
// Conversations field is ever accepted as input here.
export function buildResponsesBody(params: ResponsesRequestParams): Record<string, unknown> {
    const body: Record<string, unknown> = {
        model: params.model,
        input: params.input,
        reasoning: params.reasoning,
        text: params.text,
        max_output_tokens: params.max_output_tokens,
        store: false,
    };
    if (params.stream) body.stream = true;
    return body;
}

export async function callResponses(
    fetchImpl: FetchLike,
    apiKey: string,
    body: Record<string, unknown>,
    timeoutMs: number,
    operational?: { state: OperationalState; modelTier: ModelTier },
): Promise<Response> {
    if (operational) startProviderCall(operational.state, operational.modelTier);
    try {
        const response = await fetchWithTimeout(
            RESPONSES_API_URL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
            },
            timeoutMs,
            fetchImpl,
        );
        if (operational) recordProviderHttpResponse(operational.state, response.status);
        return response;
    } catch (error) {
        if (operational) {
            recordProviderOutcome(operational.state, {
                providerOutcome: error instanceof ProviderTimeoutError
                    ? 'TIMED_OUT'
                    : 'FAILED',
            });
        }
        throw error;
    }
}

// ─── Non-streaming output extraction ────────────────────────────────────────

export type ResponsesOutcome =
    | { kind: 'completed'; text: string }
    | { kind: 'refusal'; refusal: string }
    | { kind: 'incomplete'; reason: string | null }
    | { kind: 'failed'; reason: string | null }
    | { kind: 'malformed' };

// Reads a completed (non-streaming) Responses API JSON body. Never throws — every shape
// the provider can plausibly return, including ones this code doesn't recognize, resolves
// to a typed outcome so the caller can fail safely instead of crashing into a raw 500.
export function extractResponsesOutcome(data: unknown, state?: OperationalState): ResponsesOutcome {
    if (typeof data !== 'object' || data === null) {
        if (state) recordProviderOutcome(state, { providerOutcome: 'MALFORMED' });
        return { kind: 'malformed' };
    }
    const d = data as Record<string, unknown>;
    if (state) recordUsage(state, d.usage);

    if (d.status === 'failed') {
        const err = d.error as Record<string, unknown> | undefined;
        if (state) recordProviderOutcome(state, { providerOutcome: 'FAILED' });
        return { kind: 'failed', reason: typeof err?.message === 'string' ? err.message : null };
    }

    const output = Array.isArray(d.output) ? d.output : [];
    const message = output.find((o: any) => o && o.type === 'message');
    const content = Array.isArray(message?.content) ? message.content : [];

    const refusalItem = content.find((c: any) => c && c.type === 'refusal');
    if (refusalItem && typeof refusalItem.refusal === 'string') {
        if (state) recordProviderOutcome(state, { providerOutcome: 'REFUSED' });
        return { kind: 'refusal', refusal: refusalItem.refusal };
    }

    if (d.status === 'incomplete') {
        const details = d.incomplete_details as Record<string, unknown> | undefined;
        if (state) recordProviderOutcome(state, { providerOutcome: 'FAILED' });
        return { kind: 'incomplete', reason: typeof details?.reason === 'string' ? details.reason : null };
    }

    const textItem = content.find((c: any) => c && c.type === 'output_text' && typeof c.text === 'string');
    if (textItem) {
        if (state) recordProviderOutcome(state, { providerOutcome: 'SUCCEEDED' });
        return { kind: 'completed', text: textItem.text };
    }

    if (state) recordProviderOutcome(state, { providerOutcome: 'MALFORMED' });
    return { kind: 'malformed' };
}

// Strict Structured Outputs still arrive as a JSON *string* in output_text — the strictness
// guarantee is that the string parses to the schema, not that transport hands back an object.
export function parseStructuredJSON(
    text: string,
    state?: OperationalState,
): { ok: true; data: Record<string, unknown> } | { ok: false } {
    try {
        const parsed = JSON.parse(text);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            if (state) recordProviderOutcome(state, { providerOutcome: 'MALFORMED' });
            return { ok: false };
        }
        return { ok: true, data: parsed as Record<string, unknown> };
    } catch {
        if (state) recordProviderOutcome(state, { providerOutcome: 'MALFORMED' });
        return { ok: false };
    }
}

function recordUsage(state: OperationalState, raw: unknown): void {
    if (typeof raw !== 'object' || raw === null) return;
    const usage = raw as Record<string, unknown>;
    const candidate = {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        totalTokens: usage.total_tokens,
    };
    recordProviderUsage(state, Object.fromEntries(
        Object.entries(candidate).filter(([, value]) => Number.isSafeInteger(value) && (value as number) >= 0),
    ));
}

// ─── Streaming SSE decoding ──────────────────────────────────────────────────

export type ResponsesStreamEvent =
    | { type: 'delta'; text: string }
    | { type: 'completed' }
    | { type: 'refusal' }
    | { type: 'incomplete'; reason: string | null }
    | { type: 'failed'; reason: string | null };

// Incrementally decodes a Responses API SSE stream into a small, closed set of normalized
// events. Only inspects `data: ` lines and switches on the JSON payload's own `type` field —
// robust whether or not a parallel `event: ...` line is present. Unknown/non-terminal event
// types (response.created, response.in_progress, output_item.added, …) are silently ignored
// so a future OpenAI metadata event can never break an otherwise-valid stream. Handles a
// single event split across chunks, multiple events per chunk, CRLF/LF, blank/comment lines,
// UTF-8 split across chunk boundaries, and a final unterminated buffer via flush().
export class ResponsesSSEDecoder {
    #decoder = new TextDecoder();
    #buffer = '';
    #state?: OperationalState;

    constructor(state?: OperationalState) {
        this.#state = state;
    }

    push(chunk: Uint8Array): ResponsesStreamEvent[] {
        this.#buffer += this.#decoder.decode(chunk, { stream: true });
        return this.#drainCompleteLines();
    }

    flush(): ResponsesStreamEvent[] {
        this.#buffer += this.#decoder.decode();
        const events = this.#drainCompleteLines();
        if (this.#buffer.length > 0) {
            const last = this.#parseLine(this.#buffer);
            this.#buffer = '';
            if (last) events.push(last);
        }
        return events;
    }

    #drainCompleteLines(): ResponsesStreamEvent[] {
        const events: ResponsesStreamEvent[] = [];
        let newlineIndex: number;
        while ((newlineIndex = this.#buffer.indexOf('\n')) !== -1) {
            const rawLine = this.#buffer.slice(0, newlineIndex);
            this.#buffer = this.#buffer.slice(newlineIndex + 1);
            const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
            const event = this.#parseLine(line);
            if (event) events.push(event);
        }
        return events;
    }

    #parseLine(line: string): ResponsesStreamEvent | null {
        // Covers blank frame-separator lines, `event: ...` lines and `:comment`/keepalive lines.
        if (!line.startsWith('data:')) return null;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') return null;

        let event: any;
        try {
            event = JSON.parse(payload);
        } catch {
            return null; // malformed JSON event — skip, do not break the stream
        }

        switch (event?.type) {
            case 'response.output_text.delta':
                if (typeof event.delta !== 'string') return null;
                if (this.#state) recordFirstProviderOutput(this.#state);
                return { type: 'delta', text: event.delta };
            case 'response.completed':
                if (this.#state) {
                    recordUsage(this.#state, event.response?.usage);
                    recordProviderOutcome(this.#state, {
                        providerOutcome: 'SUCCEEDED',
                        streamOutcome: 'COMPLETED',
                        providerDurationMs: this.#state.provider.startedAtMs === undefined
                            ? undefined
                            : this.#state.monotonicNow() - this.#state.provider.startedAtMs,
                    });
                }
                return { type: 'completed' };
            case 'response.refusal.done':
                if (this.#state) recordProviderOutcome(this.#state, { providerOutcome: 'REFUSED', streamOutcome: 'FAILED' });
                return { type: 'refusal' };
            case 'response.incomplete':
                if (this.#state) recordProviderOutcome(this.#state, { providerOutcome: 'FAILED', streamOutcome: 'FAILED' });
                return { type: 'incomplete', reason: event.response?.incomplete_details?.reason ?? null };
            case 'response.failed':
                if (this.#state) recordProviderOutcome(this.#state, { providerOutcome: 'FAILED', streamOutcome: 'FAILED' });
                return { type: 'failed', reason: event.response?.error?.message ?? null };
            case 'error':
                if (this.#state) recordProviderOutcome(this.#state, { providerOutcome: 'FAILED', streamOutcome: 'FAILED' });
                return { type: 'failed', reason: typeof event.message === 'string' ? event.message : null };
            default:
                return null;
        }
    }
}
