/**
 * Versioned privacy-preference state for optional analytics consent (Ahrefs).
 *
 * This module is storage-agnostic (the caller passes a Storage instance) so the
 * consent logic itself is unit-testable without a DOM/browser environment.
 */

export const CONSENT_VERSION = 2 as const;
export const CONSENT_STORAGE_KEY = 'privacy-preferences';
export const CONSENT_CHANGE_EVENT = 'privacy-preferences-change';

/** Pre-v2 key: a plain 'true' string that only meant "dismissed the banner". */
const LEGACY_STORAGE_KEY = 'cookie-consent';

export type PrivacyPreferences = {
  version: typeof CONSENT_VERSION;
  analytics: boolean;
  decided: boolean;
  updatedAt: string;
};

function defaults(): PrivacyPreferences {
  return {
    version: CONSENT_VERSION,
    analytics: false,
    decided: false,
    updatedAt: new Date(0).toISOString(),
  };
}

function isValid(value: unknown): value is PrivacyPreferences {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === CONSENT_VERSION &&
    typeof v.analytics === 'boolean' &&
    typeof v.decided === 'boolean' &&
    typeof v.updatedAt === 'string'
  );
}

/**
 * Reads the current preferences. A legacy `cookie-consent=true` value is never
 * treated as analytics opt-in — the old banner never named Ahrefs or an
 * analytics purpose, so it cannot satisfy GDPR Art. 7(2) informed consent for
 * that specific processing. It is removed so it stops being read anywhere.
 */
export function readPreferences(storage: Storage): PrivacyPreferences {
  const raw = storage.getItem(CONSENT_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (isValid(parsed)) return parsed;
    } catch {
      // malformed value — fall through to defaults below
    }
  }
  storage.removeItem(LEGACY_STORAGE_KEY);
  return defaults();
}

/**
 * Persists an explicit decision and notifies any listeners in the current
 * document (e.g. the Ahrefs loader in BaseLayout) so a live withdrawal takes
 * effect without a full page reload.
 */
export function writePreferences(analytics: boolean, storage: Storage): PrivacyPreferences {
  const next: PrivacyPreferences = {
    version: CONSENT_VERSION,
    analytics,
    decided: true,
    updatedAt: new Date().toISOString(),
  };
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: next }));
  }
  return next;
}
