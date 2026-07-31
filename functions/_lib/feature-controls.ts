export const FEATURE_CONTROLS = {
    AI_CHAT_ENABLED: true,
    AI_COMPASS_ENABLED: true,
    AI_CASHFLOW_ENABLED: true,
    AI_INVESTMENT_ENABLED: true,
    SAMPLE_REVIEW_ENABLED: false,
} as const;

export type FeatureControlName = keyof typeof FEATURE_CONTROLS;
export type FeatureControlResult =
    | { enabled: true; state: 'ENABLED' }
    | { enabled: false; state: 'DISABLED' | 'INVALID' };

const ENABLED_VALUES = new Set(['true', '1', 'on']);
const DISABLED_VALUES = new Set(['false', '0', 'off']);

export function readFeatureControl(
    env: Partial<Record<FeatureControlName, unknown>>,
    name: FeatureControlName,
): FeatureControlResult {
    const raw = env[name];
    if (raw === undefined) {
        return FEATURE_CONTROLS[name]
            ? { enabled: true, state: 'ENABLED' }
            : { enabled: false, state: 'DISABLED' };
    }
    const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (ENABLED_VALUES.has(normalized)) return { enabled: true, state: 'ENABLED' };
    if (DISABLED_VALUES.has(normalized)) return { enabled: false, state: 'DISABLED' };
    return { enabled: false, state: 'INVALID' };
}
