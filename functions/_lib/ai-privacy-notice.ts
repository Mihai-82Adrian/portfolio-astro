// Single authoritative contract for AI contextual consent. Imported directly by both Pages
// Functions (relative './ai-privacy-notice.ts') and client components (relative path into
// functions/_lib, same cross-tree pattern already used by
// src/components/services/data-prep/SampleReviewForm.astro for feature-controls.ts). Kept
// dependency-free so it is safe to bundle into the client build.
//
// Renamed from privacy-consent.ts (Phase 5-D1A-R1): the old filename's built client chunk,
// /_astro/privacy-consent.DMSTLOq8.js, was found permanently stuck at a stale HTML response
// in a subset of Cloudflare's edge cache under a one-year immutable Cache-Control (see
// public/_headers' /_astro/* detach rule, added the same phase, for the root cause). A CDN
// purge cannot evict copies already cached in end-user browsers either, so the fix requires
// this file to build under a new URL, not just a cache-policy correction going forward.

export const AI_PRIVACY_NOTICE_VERSION = 'ai-openai-v2';

export interface AiConsentFields {
    privacyConsent?: unknown;
    privacyNoticeVersion?: unknown;
}

export function hasValidAiPrivacyConsent(body: AiConsentFields): boolean {
    return body.privacyConsent === true && body.privacyNoticeVersion === AI_PRIVACY_NOTICE_VERSION;
}
