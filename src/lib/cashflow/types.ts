// ─── Storage ───────────────────────────────────────────────────────────────
export const STORAGE_KEY = 'tools.cashflow-forecast.state.v1';
export const WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Block taxonomy ────────────────────────────────────────────────────────
export type BlockCategory = 'revenue' | 'fixed_cost' | 'variable_cost' | 'one_time';

export const SUBCATEGORIES: Record<BlockCategory, { value: string; label: string }[]> = {
  revenue: [
    { value: 'mrr',             label: 'SaaS / Abonnement (MRR)' },
    { value: 'consulting',      label: 'Beratung / Projekte' },
    { value: 'product',         label: 'Produktverkauf' },
    { value: 'other_revenue',   label: 'Sonstige Einnahmen' },
  ],
  fixed_cost: [
    { value: 'payroll',         label: 'Personalkosten' },
    { value: 'rent',            label: 'Miete / Coworking' },
    { value: 'saas_tools',      label: 'Software-Abos' },
    { value: 'insurance',       label: 'Versicherungen' },
    { value: 'other_fixed',     label: 'Sonstige Fixkosten' },
  ],
  variable_cost: [
    { value: 'marketing',       label: 'Marketing / Ads' },
    { value: 'cogs',            label: 'Wareneinsatz (COGS)' },
    { value: 'commissions',     label: 'Provisionen' },
    { value: 'other_variable',  label: 'Sonstige variable Kosten' },
  ],
  one_time: [
    { value: 'equipment',       label: 'Anschaffung / Investition' },
    { value: 'tax_payment',     label: 'Steuerzahlung' },
    { value: 'legal',           label: 'Rechts- / Beratungskosten' },
    { value: 'other_one_time',  label: 'Sonstiger Einmalposten' },
  ],
};

export const CATEGORY_LABELS: Record<BlockCategory, string> = {
  revenue:       'Einnahmen',
  fixed_cost:    'Fixkosten',
  variable_cost: 'Variable Kosten',
  one_time:      'Einmalposten',
};

// ─── Core interfaces ───────────────────────────────────────────────────────
export interface CashflowBlock {
  id: string;
  category: BlockCategory;
  subcategory: string;
  label: string;
  amount: number;              // EUR/month base amount
  growthRate?: number;         // % per month compounding (revenue only)
  variablePercent?: number;    // % of gross revenue (variable_cost only)
  oneTimeMonth?: number;       // 0–11 index (one_time only)
}

export interface MonthlyDataPoint {
  month: string;               // e.g. 'Mär 2026'
  revenue: number;
  costs: number;
  net: number;
  cumulative: number;          // Running cash balance
}

export interface StressScenario {
  type: 'late_payment' | 'churn_spike' | 'cost_shock';
  title: string;
  parameters: {
    percentAffected: number;
    delayDays: number;
    costIncreasePercent: number;
    additionalOneTimeCost: number;
  };
  narrative: string;
  monthlyData: MonthlyDataPoint[];
}

export interface StressScenarioResult {
  scenarios: StressScenario[];
  generatedAt: number;
}

export interface CashflowState {
  initialCash: number;
  blocks: CashflowBlock[];
  scenarioResult: StressScenarioResult | null;
  lastScenarioAt: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
export function isWeeklyCooldownActive(lastAt: number | null): boolean {
  if (lastAt === null) return false;
  return Date.now() - lastAt < WEEKLY_COOLDOWN_MS;
}

export function cooldownRemainingLabel(lastAt: number | null): string {
  if (!isWeeklyCooldownActive(lastAt)) return '';
  const ms = WEEKLY_COOLDOWN_MS - (Date.now() - (lastAt ?? 0));
  const days  = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

/** Find first month index (0-based) where cumulative < 0. Returns -1 if none. */
export function findInsolvencyMonth(data: MonthlyDataPoint[]): number {
  return data.findIndex(d => d.cumulative < 0);
}

/** Additional capital needed = abs(minimum cumulative balance). */
export function additionalCapitalNeeded(data: MonthlyDataPoint[]): number {
  const min = Math.min(...data.map(d => d.cumulative));
  return min < 0 ? Math.abs(min) : 0;
}
