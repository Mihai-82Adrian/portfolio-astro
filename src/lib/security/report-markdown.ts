import createDOMPurify, { type Config, type DOMPurify } from 'dompurify';
import { Marked } from 'marked';

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const ALLOWED_TAGS = [
  'p',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'blockquote',
  'code',
  'pre',
  'a',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'br',
];
const ALLOWED_ATTRIBUTES = ['href', 'title', 'target', 'rel', 'colspan', 'rowspan'];
const SANITIZER_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
  ALLOWED_NAMESPACES: [HTML_NAMESPACE],
  NAMESPACE: HTML_NAMESPACE,
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  CUSTOM_ELEMENT_HANDLING: {
    tagNameCheck: null,
    attributeNameCheck: null,
    allowCustomizedBuiltInElements: false,
  },
  RETURN_TRUSTED_TYPE: false,
};

let purifier: DOMPurify | undefined;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeMarkdown(value: unknown): string {
  return typeof value === 'string' ? value.replace(/^[\uFEFF\u200B-\u200D\u2060]+/, '') : '';
}

function decodeUrl(value: string): string | null {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = value;
  let decoded = decoder.value.trim();

  for (let pass = 0; pass < 4; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }

  return decoded;
}

function safeLink(href: string): { href: string; external: boolean } | null {
  const decoded = decodeUrl(href);
  if (!decoded) return null;

  const compact = decoded.replace(/[\u0000-\u0020\u007F]+/g, '');
  if (compact.startsWith('//') || compact.startsWith('\\\\')) return null;

  try {
    const url = new URL(compact, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const external = url.origin !== window.location.origin;
    const absolute = /^[a-z][a-z\d+.-]*:/i.test(compact);
    return { href: absolute ? url.href : decoded, external };
  } catch {
    return null;
  }
}

const markdown = new Marked({
  async: false,
  breaks: true,
  gfm: true,
  renderer: {
    html() {
      return '';
    },
    heading({ tokens, depth }) {
      const level = depth === 1 ? 2 : depth === 2 ? 3 : 4;
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    image({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      const link = safeLink(href);
      if (!link) return label;

      const safeTitle = title ? ` title="${escapeHtml(title)}"` : '';
      const externalAttributes = link.external
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';
      return `<a href="${escapeHtml(link.href)}"${safeTitle}${externalAttributes}>${label}</a>`;
    },
  },
});

export type SanitizedReportHtml = string & { readonly __sanitizedReportHtml: unique symbol };

export function renderReportMarkdown(value: unknown): SanitizedReportHtml {
  const normalized = normalizeMarkdown(value);
  if (!normalized) return '' as SanitizedReportHtml;

  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return escapeHtml(normalized) as SanitizedReportHtml;
    }

    const parsed = markdown.parse(normalized, { async: false });
    if (typeof parsed !== 'string') return escapeHtml(normalized) as SanitizedReportHtml;

    purifier ??= createDOMPurify(window);
    return purifier.sanitize(parsed, SANITIZER_CONFIG) as SanitizedReportHtml;
  } catch {
    return escapeHtml(normalized) as SanitizedReportHtml;
  }
}
