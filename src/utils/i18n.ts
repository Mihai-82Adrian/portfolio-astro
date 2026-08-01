/**
 * Internationalization (i18n) Utility
 *
 * Provides translation support for DE (German), EN (English), and RO (Romanian)
 * Default language is German (DE)
 */

export type Language = 'de' | 'en' | 'ro';

export const languages: Language[] = ['de', 'en', 'ro'];

export const defaultLanguage: Language = 'de';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const languageInfo: Record<Language, LanguageInfo> = {
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: 'DE'
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: 'EN'
  },
  ro: {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română',
    flag: 'RO'
  }
};

// Helper to determine if a language code is valid
export const isValidLanguage = (lang: string): lang is Language => {
  return languages.includes(lang as Language);
};

const FILE_LIKE_PATH_RE = /\/[^/]+\.[^/]+$/;

export const normalizeSitePath = (path: string): string => {
  if (!path) return '/';

  const [pathnameWithMaybeQuery, hash = ''] = path.split('#');
  const [pathnameRaw, query = ''] = pathnameWithMaybeQuery.split('?');

  let pathname = pathnameRaw || '/';
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;

  if (pathname !== '/' && !FILE_LIKE_PATH_RE.test(pathname) && !pathname.endsWith('/')) {
    pathname = `${pathname}/`;
  }

  const queryPart = query ? `?${query}` : '';
  const hashPart = hash ? `#${hash}` : '';
  return `${pathname}${queryPart}${hashPart}`;
};

export const normalizeSiteUrl = (url: string): string => {
  const parsed = new URL(url);
  parsed.pathname = normalizeSitePath(parsed.pathname);
  return parsed.toString();
};

// Get language from URL path
export const getLanguageFromPath = (path: string): Language => {
  const match = path.match(/^\/(en|ro)\//);
  if (match && isValidLanguage(match[1])) {
    return match[1] as Language;
  }
  return defaultLanguage;
};

// Generate language-specific URL
export const getLocalizedPath = (path: string, lang: Language): string => {
  // Remove any existing language prefix
  const cleanPath = path.replace(/^\/(en|ro)\//, '/');

  // Add language prefix for non-default languages
  if (lang === defaultLanguage) {
    return normalizeSitePath(cleanPath);
  }

  return normalizeSitePath(`/${lang}${cleanPath}`);
};

// Get alternate language URLs for hreflang tags
export const getAlternateUrls = (path: string, siteUrl: string): Record<Language | 'x-default', string> => {
  const urls: Record<string, string> = {};

  languages.forEach(lang => {
    const localizedPath = getLocalizedPath(path, lang);
    urls[lang] = normalizeSiteUrl(`${siteUrl}${localizedPath}`);
  });

  // Add x-default (usually points to default language)
  urls['x-default'] = normalizeSiteUrl(`${siteUrl}${getLocalizedPath(path, defaultLanguage)}`);

  return urls;
};

/**
 * Route-language policy (Phase 2D-C Wave 1)
 *
 * Owner-locked policy: a page that exists intentionally in one language must not be
 * translated merely to create artificial localization symmetry, and must never emit
 * hreflang/canonical/lang metadata claiming a translation that does not exist.
 *
 * This is the single source of truth for every intentionally single-language route
 * family. Genuine DE/EN/RO route families (home, about, experience, education,
 * certifications, services, legal pages, the discovery-call/data-prep/sample-review
 * funnel) are NOT listed here — they fall through to the default path-substitution
 * behavior in `getAlternateUrls`, unchanged.
 */
const SINGLE_LANGUAGE_ROUTES: ReadonlyArray<{ prefix: string; lang: Language }> = [
  { prefix: '/blog', lang: 'en' },
  { prefix: '/tools', lang: 'de' },
  { prefix: '/now', lang: 'en' },
  { prefix: '/ai', lang: 'en' },
  { prefix: '/projects', lang: 'en' },
  { prefix: '/404', lang: 'de' },
];

// Returns the locked language for an intentionally single-language route, or null
// if the path belongs to a genuine DE/EN/RO route family.
export const getSingleLanguageRoute = (path: string): Language | null => {
  for (const { prefix, lang } of SINGLE_LANGUAGE_ROUTES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return lang;
  }
  return null;
};

// Route-aware alternate-URL resolver: narrows hreflang to the real single language
// (+ x-default, self-referencing) for locked single-language routes, and falls
// through to full DE/EN/RO path-substitution for every other route.
export const getRouteAlternateUrls = (path: string, siteUrl: string): Record<string, string> => {
  const singleLang = getSingleLanguageRoute(path);
  if (singleLang) {
    const href = normalizeSiteUrl(`${siteUrl}${path}`);
    return { [singleLang]: href, 'x-default': href };
  }
  return getAlternateUrls(path, siteUrl);
};
