import type { CashFlowEntry, ReturnMetrics, RiskMetrics, MonteCarloResult, TaxResult } from './types';
import { RISK_FREE_RATE, TAX_RATE, VORABPAUSCHALE_RATE_2026 } from './types';

// ─── Box-Muller Gaussian RNG ───────────────────────────────────────────────
function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// ─── Return Metrics ────────────────────────────────────────────────────────

/** ROI = (sum(CF) - initial) / initial × 100 */
export function calcROI(initial: number, cashFlows: CashFlowEntry[]): number {
  if (initial === 0) return 0;
  const totalReturn = cashFlows.reduce((s, cf) => s + cf.amount, 0);
  return ((totalReturn - initial) / initial) * 100;
}

/** CAGR = (finalValue / initial)^(1/years) - 1, result in % */
export function calcCAGR(initial: number, finalValue: number, years: number): number {
  if (initial <= 0 || finalValue <= 0 || years <= 0) return 0;
  return (Math.pow(finalValue / initial, 1 / years) - 1) * 100;
}

/** NPV = -initial + Σ[CF_t / (1 + rate)^t] */
export function calcNPV(initial: number, cashFlows: CashFlowEntry[], rate: number): number {
  const r = rate / 100;
  const pv = cashFlows.reduce((s, cf) => s + cf.amount / Math.pow(1 + r, cf.year), 0);
  return pv - initial;
}

/** IRR via Newton-Raphson (seed 10%, tolerance 1e-6, max 100 iterations) */
export function calcIRR(initial: number, cashFlows: CashFlowEntry[]): number | null {
  const allCFs = [{ year: 0, amount: -initial }, ...cashFlows];

  function npv(rate: number): number {
    return allCFs.reduce((s, cf) => s + cf.amount / Math.pow(1 + rate, cf.year), 0);
  }

  function npvPrime(rate: number): number {
    return allCFs.reduce((s, cf) => s - cf.year * cf.amount / Math.pow(1 + rate, cf.year + 1), 0);
  }

  let r = 0.1;
  for (let i = 0; i < 100; i++) {
    const f  = npv(r);
    const fp = npvPrime(r);
    if (Math.abs(fp) < 1e-12) break;
    const delta = f / fp;
    r -= delta;
    if (Math.abs(delta) < 1e-6) return r * 100;
    if (r < -0.9999) return null; // prevent divergence
  }
  return null;
}

/** Find first year where cumulative CF ≥ initial outlay (1-based, or null) */
export function calcPayback(initial: number, cashFlows: CashFlowEntry[]): number | null {
  let cumulative = 0;
  const sorted = [...cashFlows].sort((a, b) => a.year - b.year);
  for (const cf of sorted) {
    cumulative += cf.amount;
    if (cumulative >= initial) return cf.year;
  }
  return null;
}

export function calcReturnMetrics(
  initial: number,
  cashFlows: CashFlowEntry[],
  discountRate: number
): ReturnMetrics {
  const sorted = [...cashFlows].sort((a, b) => a.year - b.year);
  const totalCF = sorted.reduce((s, cf) => s + cf.amount, 0);
  const years = sorted.length > 0 ? sorted[sorted.length - 1].year : 1;

  return {
    roi:         calcROI(initial, sorted),
    // CAGR is only valid for a single exit cashflow — with multiple cashflows use IRR
    cagr:        sorted.length === 1
      ? calcCAGR(initial, sorted[0].amount, sorted[0].year)
      : null,
    irr:         calcIRR(initial, sorted),
    npv:         calcNPV(initial, sorted, discountRate),
    paybackYear: calcPayback(initial, sorted),
  };
}

// ─── Risk Metrics ──────────────────────────────────────────────────────────

/** Build annual return series from cash flows */
function buildReturnSeries(initial: number, cashFlows: CashFlowEntry[]): number[] {
  const sorted = [...cashFlows].sort((a, b) => a.year - b.year);
  const returns: number[] = [];
  let prevValue = initial;

  for (const cf of sorted) {
    const newValue = prevValue + cf.amount;
    const r = (newValue - prevValue) / prevValue;
    returns.push(r);
    prevValue = newValue;
  }

  return returns;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function calcRiskMetrics(
  initial: number,
  cashFlows: CashFlowEntry[],
  riskFreeRate = RISK_FREE_RATE
): RiskMetrics {
  const returns = buildReturnSeries(initial, cashFlows);

  if (returns.length === 0) {
    return {
      annualizedReturn: 0,
      annualizedVolatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      var95: 0,
      var99: 0,
    };
  }

  const mu = mean(returns);
  const sigma = stdDev(returns);

  // Sharpe
  const sharpeRatio = sigma > 0 ? (mu - riskFreeRate) / sigma : 0;

  // Sortino — downside deviation
  const downsideReturns = returns.filter(r => r < riskFreeRate);
  const sigmaDown = downsideReturns.length > 0
    ? Math.sqrt(mean(downsideReturns.map(r => Math.pow(r - riskFreeRate, 2))))
    : 0;
  const sortinoRatio = sigmaDown > 0 ? (mu - riskFreeRate) / sigmaDown : 0;

  // Max Drawdown from cumulative value series
  const sorted = [...cashFlows].sort((a, b) => a.year - b.year);
  const values: number[] = [initial];
  let v = initial;
  for (const cf of sorted) {
    v += cf.amount;
    values.push(v);
  }

  let peak = values[0];
  let maxDD = 0;
  for (const val of values) {
    if (val > peak) peak = val;
    const dd = peak > 0 ? (val - peak) / peak : 0;
    if (dd < maxDD) maxDD = dd;
  }

  // Parametric VaR — 5th percentile of return distribution = loss at 95% confidence
  const var95 = (mu - sigma * 1.645) * initial;
  const var99 = (mu - sigma * 2.3263) * initial;

  return {
    annualizedReturn:     mu * 100,
    annualizedVolatility: sigma * 100,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown:          maxDD * 100,
    var95,
    var99,
  };
}

// ─── Monte Carlo ───────────────────────────────────────────────────────────

export function runMonteCarlo(
  initial: number,
  cashFlows: CashFlowEntry[],
  nSims = 1000
): MonteCarloResult {
  const sorted = [...cashFlows].sort((a, b) => a.year - b.year);
  const nYears = sorted.length > 0 ? sorted[sorted.length - 1].year : 1;

  // Estimate μ and σ from historical data
  const returns = buildReturnSeries(initial, cashFlows);
  const mu    = returns.length > 1 ? mean(returns) : 0.07;
  const sigma = returns.length > 1 ? stdDev(returns) : 0.15;

  // Build a map from year → scheduled CF
  const cfMap = new Map<number, number>();
  for (const cf of sorted) {
    cfMap.set(cf.year, (cfMap.get(cf.year) ?? 0) + cf.amount);
  }

  // Run simulations
  const paths: number[][] = [];

  for (let s = 0; s < nSims; s++) {
    const path: number[] = [initial];
    let value = initial;

    for (let t = 1; t <= nYears; t++) {
      const drift = mu - 0.5 * sigma * sigma;
      const shock = gaussianRandom(drift, sigma);
      value = value * Math.exp(shock) + (cfMap.get(t) ?? 0);
      path.push(value);
    }

    paths.push(path);
  }

  // Compute percentiles per year
  const percentile5: number[]  = [];
  const percentile50: number[] = [];
  const percentile95: number[] = [];

  for (let t = 0; t <= nYears; t++) {
    const col = paths.map(p => p[t]).sort((a, b) => a - b);
    percentile5.push(col[Math.floor(nSims * 0.05)]);
    percentile50.push(col[Math.floor(nSims * 0.50)]);
    percentile95.push(col[Math.floor(nSims * 0.95)]);
  }

  const finalValues = paths.map(p => p[nYears]);
  const probPositive = (finalValues.filter(v => v > initial).length / nSims) * 100;
  const expectedFinalValue = mean(finalValues);

  return { paths, percentile5, percentile50, percentile95, probPositive, expectedFinalValue };
}

// ─── DACH Tax ──────────────────────────────────────────────────────────────

export function calcTax(
  initial: number,
  cashFlows: CashFlowEntry[],
  isFund: boolean,
  isAccumulating: boolean,
  ter: number,
  personalFreibetrag: number,
  teilfreistellung: boolean,
  kirchensteuer: number
): TaxResult {
  const totalInflows = cashFlows.reduce((s, cf) => s + cf.amount, 0);
  const grossGain = totalInflows - initial;

  // Vorabpauschale (accumulating fund only)
  let vorabpauschale: number | undefined;
  if (isFund && isAccumulating) {
    vorabpauschale = initial * VORABPAUSCHALE_RATE_2026 * (1 - ter / 100);
  }

  // Apply Teilfreistellung (30% exemption for Aktienfonds, § 20 InvStG) BEFORE Freibetrag
  const adjustedGain = (isFund && teilfreistellung) ? grossGain * 0.7 : grossGain;
  const teilfreistellungReduction = grossGain - adjustedGain;

  const freibetrag  = Math.max(0, personalFreibetrag);
  const taxableGain = Math.max(0, adjustedGain - freibetrag);
  const taxAmount   = taxableGain * TAX_RATE;

  const kirchensteuerAmount = taxAmount * (kirchensteuer / 100);
  const netGain     = grossGain - taxAmount - kirchensteuerAmount;
  const effectiveTaxRate = grossGain > 0
    ? ((taxAmount + kirchensteuerAmount) / grossGain) * 100
    : 0;

  return {
    grossGain, taxableGain, taxAmount, netGain, vorabpauschale,
    effectiveTaxRate, teilfreistellungReduction, kirchensteuerAmount,
  };
}
