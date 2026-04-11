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
