// Shared, anchored replacements for the naive `.includes()`/`.startsWith()` substring
// checks CodeQL flags as js/incomplete-url-substring-sanitization: a bare substring or
// prefix match on a hostname can also match an attacker-controlled superstring
// (e.g. "api.openai.com.attacker.example" or "https://me-mateescu.de.attacker.example").

const HOST_CHAR = /[A-Za-z0-9.-]/;

// True if `host` appears in `text` as a real hostname token, not merely as a substring
// of a longer label (e.g. "evil-api.openai.com" or "api.openai.com.attacker.example").
// Deliberately does not build a RegExp out of `host`: plain indexOf plus a boundary
// check on the fixed, static HOST_CHAR class avoids relying on manual escaping.
export function textMentionsHost(text, host) {
  for (let from = 0; ; ) {
    const index = text.indexOf(host, from);
    if (index === -1) return false;
    const before = index === 0 ? '' : text[index - 1];
    const after = text[index + host.length] ?? '';
    if (!HOST_CHAR.test(before) && !HOST_CHAR.test(after)) return true;
    from = index + 1;
  }
}

// True if `url` is exactly `origin`, or a path/query/fragment under it — not merely
// prefixed by it (e.g. "https://me-mateescu.de.attacker.example" must not match).
export function startsWithOrigin(url, origin) {
  return url === origin || ['/', '?', '#'].some((sep) => url.startsWith(origin + sep));
}
