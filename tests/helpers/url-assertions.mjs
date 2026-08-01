// Shared, anchored replacements for the naive `.includes()`/`.startsWith()` substring
// checks CodeQL flags as js/incomplete-url-substring-sanitization: a bare substring or
// prefix match on a hostname can also match an attacker-controlled superstring
// (e.g. "api.openai.com.attacker.example" or "https://me-mateescu.de.attacker.example").

// True if `host` appears in `text` as a real hostname token, not merely as a substring
// of a longer label (e.g. "evil-api.openai.com" or "api.openai.com.attacker.example").
export function textMentionsHost(text, host) {
  const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9.-])${escaped}([^A-Za-z0-9.-]|$)`).test(text);
}

// True if `url` is exactly `origin`, or a path/query/fragment under it — not merely
// prefixed by it (e.g. "https://me-mateescu.de.attacker.example" must not match).
export function startsWithOrigin(url, origin) {
  return url === origin || ['/', '?', '#'].some((sep) => url.startsWith(origin + sep));
}
