// Models Cloudflare Pages/Workers-static-assets `_headers` effective matching, per
// developers.cloudflare.com/workers/static-assets/headers/: a splat (`*`) greedily
// matches all characters including path separators; a request matching multiple
// rules' URL patterns inherits all of those rules' headers; a repeated header's
// values are joined with a comma; `! Header-Name` detaches an inherited header for
// requests matching that rule. This exists because a literal-text/regex check on
// the _headers source (grepping for a `/_astro/*` line) cannot detect that an
// unrelated `/*.js` rule effectively also applies to `/_astro/foo.js` — only
// modeling the real matching semantics can.
//
// Resolution is SEQUENTIAL and file-order dependent, confirmed empirically against
// a real Cloudflare Pages preview (see Phase 5-D1A-R1/R2 evidence): for a given
// header, whichever operation (set or detach) occurs LAST among matching rules, in
// file order, determines the effective outcome. An earlier `! Header-Name` does
// NOT defeat a later rule that sets the same header — "any detach anywhere wins"
// is not how Cloudflare Pages actually behaves, and was R1's root-cause defect.

function splatToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

export function parseHeadersFile(source) {
  const lines = source.split('\n');
  const rules = [];
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      current = { pattern: trimmed, matcher: splatToRegExp(trimmed), headers: [] };
      rules.push(current);
      continue;
    }
    if (!current) continue;
    if (trimmed.startsWith('!')) {
      const name = trimmed.slice(1).trim();
      current.headers.push({ name, detach: true });
    } else {
      const sep = trimmed.indexOf(':');
      if (sep === -1) continue;
      const name = trimmed.slice(0, sep).trim();
      const value = trimmed.slice(sep + 1).trim();
      current.headers.push({ name, value, detach: false });
    }
  }
  return rules;
}

export function effectiveHeaders(rules, requestPath) {
  const matching = rules.filter((rule) => rule.matcher.test(requestPath));
  const effective = new Map();
  for (const rule of matching) {
    for (const header of rule.headers) {
      const key = header.name.toLowerCase();
      if (header.detach) {
        effective.delete(key);
        continue;
      }
      const existing = effective.get(key);
      effective.set(key, existing ? { name: header.name, value: `${existing.value}, ${header.value}` } : { name: header.name, value: header.value });
    }
  }
  const result = {};
  for (const { name, value } of effective.values()) {
    result[name] = value;
  }
  return result;
}

export function effectiveCacheControl(headersSource, requestPath) {
  const rules = parseHeadersFile(headersSource);
  const headers = effectiveHeaders(rules, requestPath);
  const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === 'cache-control');
  return entry ? entry[1] : undefined;
}
