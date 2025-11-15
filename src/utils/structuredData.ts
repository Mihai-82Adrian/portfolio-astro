/**
 * Structured Data (Schema.org JSON-LD) Generator
 * Generates SEO-optimized structured data for different page types
 */

import type { Position } from '@data/experience';
import type { CollectionEntry } from 'astro:content';

const SITE_URL = 'https://me-mateescu.de';
const SITE_NAME = 'Mihai Adrian Mateescu Portfolio';

interface PersonSchema {
  '@context': string;
  '@type': string;
  name: string;
  givenName: string;
  familyName: string;
  jobTitle: string | string[];
  description?: string;
  url: string;
  image?: string;
  email: string;
  telephone: string;
  address: {
    '@type': string;
    addressLocality: string;
    postalCode: string;
    streetAddress: string;
    addressCountry: string;
  };
  sameAs: string[];
  knowsLanguage: string[];
  alumniOf?: {
    '@type': string;
    name: string;
  }[];
  hasCredential?: {
    '@type': string;
    name: string;
    credentialCategory: string;
  }[];
}

interface WebSiteSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  description: string;
  inLanguage: string[];
  potentialAction?: {
    '@type': string;
    target: {
      '@type': string;
      urlTemplate: string;
    };
    'query-input': string;
  };
}

interface BreadcrumbSchema {
  '@context': string;
  '@type': string;
  itemListElement: {
    '@type': string;
    position: number;
    name: string;
    item: string;
  }[];
}

interface BlogPostingSchema {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: {
    '@type': string;
    name: string;
    url: string;
  };
  publisher: {
    '@type': string;
    name: string;
    logo: {
      '@type': string;
      url: string;
    };
  };
  mainEntityOfPage: string;
  inLanguage: string;
  keywords?: string[];
}

interface WorkExperienceSchema {
  '@context': string;
  '@type': string;
  startDate: string;
  endDate?: string;
  name: string;
  description: string;
  jobTitle: string;
  employer: {
    '@type': string;
    name: string;
  };
}

/**
 * Generate Person structured data (for homepage and about page)
 */
export function generatePersonSchema(lang: 'de' | 'en' | 'ro' = 'de'): PersonSchema {
  const jobTitles = {
    de: ['Finanzbuchhalter', 'AI/ML Enthusiast'],
    en: ['Financial Accountant', 'AI/ML Enthusiast'],
    ro: ['Contabil Financiar', 'Entuziast AI/ML']
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Mihai Adrian Mateescu',
    givenName: 'Mihai Adrian',
    familyName: 'Mateescu',
    jobTitle: jobTitles[lang],
    url: SITE_URL,
    image: `${SITE_URL}/images/me.webp`,
    email: 'mihai.mateescu@web.de',
    telephone: '+491704740121',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Seevetal',
      postalCode: '21218',
      streetAddress: 'Bahnhofstraße 65b',
      addressCountry: 'DE'
    },
    sameAs: [
      'https://www.linkedin.com/in/mateescu-mihai-922b3169',
      'https://github.com/Mihai-82Adrian',
      'https://profit-minds.de'
    ],
    knowsLanguage: ['de', 'en', 'ro'],
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: 'IHK Nord-Westfalen'
      }
    ],
    hasCredential: [
      {
        '@type': 'EducationalOccupationalCredential',
        name: 'Fachkraft für Buchführung (IHK)',
        credentialCategory: 'certificate'
      },
      {
        '@type': 'EducationalOccupationalCredential',
        name: 'telc Deutsch B2',
        credentialCategory: 'certificate'
      }
    ]
  };
}

/**
 * Generate WebSite structured data
 */
export function generateWebSiteSchema(lang: 'de' | 'en' | 'ro' = 'de'): WebSiteSchema {
  const descriptions = {
    de: 'Portfolio von Mihai Adrian Mateescu - Finanzbuchhalter mit Interesse für AI/ML und moderne Technologien',
    en: 'Portfolio of Mihai Adrian Mateescu - Financial Accountant with interests in AI/ML and modern technologies',
    ro: 'Portofoliu Mihai Adrian Mateescu - Contabil Financiar cu interes pentru AI/ML și tehnologii moderne'
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: descriptions[lang],
    inLanguage: ['de', 'en', 'ro'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blog/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Generate Breadcrumb structured data
 */
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`
    }))
  };
}

/**
 * Generate BlogPosting structured data
 */
export function generateBlogPostingSchema(
  post: CollectionEntry<'blog'>,
  url: string
): BlogPostingSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.data.title,
    description: post.data.description,
    image: post.data.heroImage ? `${SITE_URL}${post.data.heroImage}` : undefined,
    datePublished: post.data.pubDate.toISOString(),
    dateModified: post.data.updatedDate?.toISOString() || post.data.pubDate.toISOString(),
    author: {
      '@type': 'Person',
      name: 'Mihai Adrian Mateescu',
      url: SITE_URL
    },
    publisher: {
      '@type': 'Person',
      name: 'Mihai Adrian Mateescu',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/me.webp`
      }
    },
    mainEntityOfPage: url, // URL already contains full path
    inLanguage: 'en',
    keywords: post.data.tags
  };
}

/**
 * Generate WorkExperience structured data from Position data
 */
export function generateWorkExperienceSchema(
  experience: Position
): WorkExperienceSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WorkExperience',
    startDate: experience.startDate,
    endDate: experience.endDate === 'present' ? undefined : experience.endDate,
    name: experience.role.de, // Use German as default
    description: experience.description.de.join(' '),
    jobTitle: experience.role.de,
    employer: {
      '@type': 'Organization',
      name: experience.company
    }
  };
}

/**
 * Converts structured data object to JSON-LD string for embedding in HTML
 */
export function toJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 0); // Minified for production
}

/**
 * Generate multiple structured data schemas for a page
 */
export function generateMultipleSchemas(schemas: Record<string, unknown>[]): string {
  return JSON.stringify(schemas, null, 0);
}
