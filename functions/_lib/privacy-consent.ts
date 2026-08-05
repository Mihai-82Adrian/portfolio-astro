// Single authoritative contract for AI contextual consent. Imported directly by both Pages
// Functions (relative './privacy-consent.ts') and client components (relative path into
// functions/_lib, same cross-tree pattern already used by
// src/components/services/data-prep/SampleReviewForm.astro for feature-controls.ts). Kept
// dependency-free so it is safe to bundle into the client build.

export const AI_PRIVACY_NOTICE_VERSION = 'ai-openai-v2';

export interface AiConsentFields {
    privacyConsent?: unknown;
    privacyNoticeVersion?: unknown;
}

export function hasValidAiPrivacyConsent(body: AiConsentFields): boolean {
    return body.privacyConsent === true && body.privacyNoticeVersion === AI_PRIVACY_NOTICE_VERSION;
}
