/**
 * Versioned privacy-preference state for optional analytics consent.
 *
 * Two independent channels, each opt-in and independently withdrawable:
 *   - performanceAnalytics.cloudflareRum (Cloudflare Web Analytics / RUM)
 *   - acquisitionAnalytics.ahrefs (Ahrefs Web Analytics)
 *
 * This module is storage-agnostic (the caller passes a Storage instance) so the
 * consent logic itself is unit-testable without a DOM/browser environment.
 */

export const CONSENT_VERSION = 3 as const;
export const CONSENT_STORAGE_KEY = 'privacy-preferences';
export const CONSENT_CHANGE_EVENT = 'privacy-preferences-change';

/** Pre-v2 key: a plain 'true' string that only meant "dismissed the banner". */
const LEGACY_STORAGE_KEY = 'cookie-consent';

export type PrivacyPreferences = {
  version: typeof CONSENT_VERSION;
  decided: boolean;
  performanceAnalytics: { cloudflareRum: boolean };
  acquisitionAnalytics: { ahrefs: boolean };
  updatedAt: string;
};

/** Shape of the superseded v2 record, kept only to detect and migrate it. */
type PrivacyPreferencesV2 = {
  version: 2;
  analytics: boolean;
  decided: boolean;
  updatedAt: string;
};

function defaults(): PrivacyPreferences {
  return {
    version: CONSENT_VERSION,
    decided: false,
    performanceAnalytics: { cloudflareRum: false },
    acquisitionAnalytics: { ahrefs: false },
    updatedAt: new Date(0).toISOString(),
  };
}

const V3_KEYS = ['version', 'decided', 'performanceAnalytics', 'acquisitionAnalytics', 'updatedAt'];

function sameKeys(value: object, expected: string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

/** Requires an exactly-closed shape, matching what writePreferences always produces —
 *  a record with an extra or missing field is treated as unrecognized, not "close enough". */
function isValidV3(value: unknown): value is PrivacyPreferences {
  if (!value || typeof value !== 'object' || !sameKeys(value, V3_KEYS)) return false;
  const v = value as Record<string, unknown>;
  const perf = v.performanceAnalytics as Record<string, unknown> | undefined;
  const acq = v.acquisitionAnalytics as Record<string, unknown> | undefined;
  return (
    v.version === CONSENT_VERSION &&
    typeof v.decided === 'boolean' &&
    typeof v.updatedAt === 'string' &&
    !!perf &&
    typeof perf === 'object' &&
    sameKeys(perf, ['cloudflareRum']) &&
    typeof perf.cloudflareRum === 'boolean' &&
    !!acq &&
    typeof acq === 'object' &&
    sameKeys(acq, ['ahrefs']) &&
    typeof acq.ahrefs === 'boolean'
  );
}

function isValidV2(value: unknown): value is PrivacyPreferencesV2 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 2 &&
    typeof v.analytics === 'boolean' &&
    typeof v.decided === 'boolean' &&
    typeof v.updatedAt === 'string'
  );
}

/**
 * Migrates a valid v2 record. The v2 `analytics` boolean only ever gated
 * Ahrefs — it never disclosed Cloudflare or Core Web Vitals to the visitor —
 * so it is mapped exclusively to `acquisitionAnalytics.ahrefs`.
 * `performanceAnalytics.cloudflareRum` is a newly introduced, previously
 * undisclosed purpose and is never inherited from an old decision.
 */
function migrateV2(v2: PrivacyPreferencesV2): PrivacyPreferences {
  return {
    version: CONSENT_VERSION,
    decided: v2.decided,
    performanceAnalytics: { cloudflareRum: false },
    acquisitionAnalytics: { ahrefs: v2.analytics },
    updatedAt: v2.updatedAt,
  };
}

/**
 * Reads the current preferences. A legacy `cookie-consent=true` value is never
 * treated as analytics opt-in — the old banner never named a specific
 * analytics purpose, so it cannot satisfy GDPR Art. 7(2) informed consent for
 * that processing. It is removed so it stops being read anywhere.
 *
 * A malformed or structurally unrecognized stored value is treated exactly
 * like a first-time visitor (`decided: false`, both channels off) rather than
 * assuming any prior decision — silently defaulting `decided` to `true` on
 * data we cannot interpret would risk permanently suppressing a real opt-in
 * opportunity without the visitor's awareness. Reappearing the banner is the
 * safe outcome: no data is collected either way, and the visitor gets to
 * confirm their choice again.
 */
export function readPreferences(storage: Storage): PrivacyPreferences {
  const raw = storage.getItem(CONSENT_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (isValidV3(parsed)) return parsed;
      if (isValidV2(parsed)) return migrateV2(parsed);
    } catch {
      // malformed value — fall through to defaults below
    }
  }
  storage.removeItem(LEGACY_STORAGE_KEY);
  return defaults();
}

/**
 * Persists an explicit decision for both channels and notifies any listeners
 * in the current document (e.g. the Cloudflare RUM and Ahrefs loaders in
 * BaseLayout) so a newly granted channel can start immediately. A channel
 * that goes from on to off is a separate concern for the caller: this
 * function only persists and announces the change — it does not reload the
 * page, and an already-executing script cannot be stopped by this event
 * alone (see CookieConsent.astro's withdrawal contract). Callers that only
 * change one channel must read the current preferences first and pass the
 * other channel's existing value through unchanged.
 */
export function writePreferences(
  preferences: { cloudflareRum: boolean; ahrefs: boolean },
  storage: Storage
): PrivacyPreferences {
  const next: PrivacyPreferences = {
    version: CONSENT_VERSION,
    decided: true,
    performanceAnalytics: { cloudflareRum: preferences.cloudflareRum },
    acquisitionAnalytics: { ahrefs: preferences.ahrefs },
    updatedAt: new Date().toISOString(),
  };
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: next }));
  }
  return next;
}
