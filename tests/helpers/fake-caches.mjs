// Minimal in-memory stand-in for the Cloudflare Workers Cache API (`caches.open`/`.match`/`.put`),
// which Node does not implement. Cloudflare's actual runtime supplies the real thing; this only
// needs to satisfy the subset the Functions under test call (open/match/put, keyed by request URL).
class FakeCache {
    #store = new Map();

    async match(request) {
        return this.#store.get(String(request.url ?? request));
    }

    async put(request, response) {
        this.#store.set(String(request.url ?? request), response);
    }
}

class FakeCacheStorage {
    #caches = new Map();

    async open(name) {
        if (!this.#caches.has(name)) this.#caches.set(name, new FakeCache());
        return this.#caches.get(name);
    }
}

export function installFakeCaches() {
    globalThis.caches = new FakeCacheStorage();
}
