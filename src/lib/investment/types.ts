// ─── Storage & Constants ───────────────────────────────────────────────────
export const STORAGE_KEY = 'tools.investment-analytics.state.v1';
export const WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const RISK_FREE_RATE = 0.025;        // German Bundesanleihe 10Y ~2.5%
export const TAX_RATE = 0.26375;            // Abgeltungsteuer 25% + 1.375% Soli
export const FREISTELLUNGSAUFTRAG = 1000;   // EUR/year per person
export const VORABPAUSCHALE_RATE_2026 = 0.0224; // Basiszins × 0.7 × TER correction

// ─── Interfaces ────────────────────────────────────────────────────────────
export interface CashFlowEntry {
  year: number;   // 1-based (year 1 = first year after investment)
  amount: number; // EUR (positive = inflow, negative = additional outlay)
}

export interface InvestmentInput {
  initialInvestment: number;   // EUR (always positive — absolute outlay)
  cashFlows: CashFlowEntry[];  // 1–30 years
  discountRate: number;        // % for NPV / IRR benchmark
  isFund: boolean;             // true → Vorabpauschale applies
  isAccumulating: boolean;     // true → accumulating fund (Thesaurierer)
  ter: number;                 // Total Expense Ratio % (only for funds)
  personalFreibetrag: number;  // EUR (default 1000, max 2000 for married)
}

export interface ReturnMetrics {
  roi: number;               // %
  cagr: number;              // % annualized
  irr: number | null;        // % (null if Newton-Raphson fails)
  npv: number;               // EUR
  paybackYear: number | null; // 1-based year index (null if not recovered)
}

export interface RiskMetrics {
  annualizedReturn: number;     // μ from period returns (%)
  annualizedVolatility: number; // σ (%)
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;          // % (negative value)
  var95: number;                // EUR loss at 95% confidence (negative)
  var99: number;                // EUR loss at 99% confidence (negative)
}

export interface MonteCarloResult {
  paths: number[][];         // [nSims][nYears+1] cumulative values
  percentile5: number[];     // per-year P5 values
  percentile50: number[];    // per-year P50 (median)
  percentile95: number[];    // per-year P95 values
  probPositive: number;      // % of paths ending in profit
  expectedFinalValue: number; // mean of final year across all paths
}

export interface TaxResult {
  grossGain: number;
  taxableGain: number;       // after Freistellungsauftrag
  taxAmount: number;
  netGain: number;
  vorabpauschale?: number;   // only for accumulating funds (per year)
  effectiveTaxRate: number;  // % of gross gain
}

export interface InvestmentState {
  input: InvestmentInput;
  aiNarrative: string | null;
  lastAiAt: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
export function isWeeklyCooldownActive(lastAt: number | null): boolean {
  if (lastAt === null) return false;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return false;
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

export const DEFAULT_INPUT: InvestmentInput = {
  initialInvestment: 10000,
  cashFlows: [
    { year: 1, amount: 2500 },
    { year: 2, amount: 2500 },
    { year: 3, amount: 2500 },
    { year: 4, amount: 2500 },
    { year: 5, amount: 2500 },
  ],
  discountRate: 8,
  isFund: false,
  isAccumulating: false,
  ter: 0.2,
  personalFreibetrag: 1000,
};
