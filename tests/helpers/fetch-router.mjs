// Tiny outbound-fetch stub for provider isolation tests. Routes are matched in order against the
// request URL (string.includes or RegExp.test); the matching entry's value is returned as-is if
// it is a Response, thrown if it is an Error (simulating a network failure), or invoked if it is a
// function. Every call is recorded so tests can assert exactly which URLs were (or were not) hit.
export function createFetchRouter(routes) {
    const calls = [];

    const fetchImpl = async (input, init) => {
        calls.push({ url: input, init });
        for (const [match, handler] of routes) {
            const matches = typeof match === 'string' ? input.includes(match) : match.test(input);
            if (!matches) continue;
            const result = typeof handler === 'function' ? await handler(input, init) : handler;
            if (result instanceof Error) throw result;
            return result;
        }
        throw new Error(`fetch-router: no route matched for ${input}`);
    };

    return { fetchImpl, calls };
}

export function jsonResponse(body, init = {}) {
    return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
}

export function abortError() {
    return Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
}
