export function escapeXml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function serializeAttrs(attrs: Record<string, string> = {}): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) {
    return '';
  }
  return ` ${entries
    .map(([key, value]) => `${key}="${escapeXml(value)}"`)
    .join(' ')}`;
}

export function tag(
  name: string,
  value: string | number,
  attrs: Record<string, string> = {}
): string {
  const attr = serializeAttrs(attrs);
  return `<${name}${attr}>${escapeXml(String(value))}</${name}>`;
}

export function wrap(
  name: string,
  innerXml: string,
  attrs: Record<string, string> = {}
): string {
  const attr = serializeAttrs(attrs);
  return `<${name}${attr}>${innerXml}</${name}>`;
}
