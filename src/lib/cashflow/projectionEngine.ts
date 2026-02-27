import type { CashflowBlock, MonthlyDataPoint, StressScenario } from './types';

const DE_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function monthLabel(baseDate: Date, offset: number): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
  return `${DE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Pure projection function — no side effects.
 * Called via $derived in CashflowApp for real-time chart updates.
 */
export function projectCashflow(
  initialCash: number,
  blocks: CashflowBlock[],
  months = 12,
  startDate = new Date(),
): MonthlyDataPoint[] {
  const points: MonthlyDataPoint[] = [];
  let cumulative = initialCash;

  for (let i = 0; i < months; i++) {
    // ── Revenue ──────────────────────────────────────────────────────
    let revenue = 0;
    for (const b of blocks) {
      if (b.category !== 'revenue') continue;
      const growth = b.growthRate ? Math.pow(1 + b.growthRate / 100, i) : 1;
      revenue += b.amount * growth;
    }

    // ── Fixed costs ───────────────────────────────────────────────────
    let costs = 0;
    for (const b of blocks) {
      if (b.category === 'fixed_cost') costs += b.amount;
    }

    // ── Variable costs (% of gross revenue or fixed amount) ───────────
    for (const b of blocks) {
      if (b.category !== 'variable_cost') continue;
      if (b.variablePercent !== undefined && b.variablePercent > 0) {
        costs += revenue * (b.variablePercent / 100);
      } else {
        costs += b.amount;
      }
    }

    // ── One-time events (always expenses) ─────────────────────────────
    for (const b of blocks) {
      if (b.category === 'one_time' && b.oneTimeMonth === i) {
        costs += b.amount;
      }
    }

    const net = revenue - costs;
    cumulative += net;

    points.push({
      month: monthLabel(startDate, i),
      revenue: Math.round(revenue),
      costs:   Math.round(costs),
      net:     Math.round(net),
      cumulative: Math.round(cumulative),
    });
  }

  return points;
}

// ─── Stress scenario appliers ──────────────────────────────────────────────
// Each function takes the base projection + parameters and returns new monthly
// data. All math stays client-side; AI only returns parameters + narrative.

/**
 * Late payment: X% of revenue is delayed by N months.
 * Affected revenue "arrives" N months later; months 0..N-1 lose it.
 */
export function applyLatePayment(
  base: MonthlyDataPoint[],
  initialCash: number,
  percentAffected: number,
  delayDays: number,
): MonthlyDataPoint[] {
  const delayMonths = Math.max(1, Math.round(delayDays / 30));
  const factor = percentAffected / 100;
  let cumulative = initialCash;

  return base.map((p, i) => {
    // The portion that was delayed: received from (i - delayMonths), 0 if out of range
    const delayedIn  = i >= delayMonths ? base[i - delayMonths].revenue * factor : 0;
    const revenue    = Math.round(p.revenue * (1 - factor) + delayedIn);
    const net        = revenue - p.costs;
    cumulative      += net;
    return { month: p.month, revenue, costs: p.costs, net: Math.round(net), cumulative: Math.round(cumulative) };
  });
}

/**
 * Churn spike: starting month 1, revenue drops by X% permanently.
 */
export function applyChurnSpike(
  base: MonthlyDataPoint[],
  initialCash: number,
  percentAffected: number,
): MonthlyDataPoint[] {
  const factor = 1 - percentAffected / 100;
  let cumulative = initialCash;

  return base.map((p, i) => {
    const revenue   = i === 0 ? p.revenue : Math.round(p.revenue * factor);
    const net       = revenue - p.costs;
    cumulative     += net;
    return { month: p.month, revenue, costs: p.costs, net: Math.round(net), cumulative: Math.round(cumulative) };
  });
}

/**
 * Cost shock: monthly costs increase by X%, plus a one-time cost in month 3.
 */
export function applyCostShock(
  base: MonthlyDataPoint[],
  initialCash: number,
  costIncreasePercent: number,
  additionalOneTimeCost: number,
): MonthlyDataPoint[] {
  const factor = 1 + costIncreasePercent / 100;
  let cumulative = initialCash;

  return base.map((p, i) => {
    const extraOnce = i === 2 ? additionalOneTimeCost : 0;   // month index 2 = month 3
    const costs     = Math.round(p.costs * factor + extraOnce);
    const net       = p.revenue - costs;
    cumulative     += net;
    return { month: p.month, revenue: p.revenue, costs, net: Math.round(net), cumulative: Math.round(cumulative) };
  });
}

/**
 * Build full StressScenario objects from AI parameters + base projection.
 * Called in CashflowApp after receiving the AI response.
 */
export function buildScenariosFromParams(
  aiScenarios: Array<{
    type: 'late_payment' | 'churn_spike' | 'cost_shock';
    title: string;
    narrative: string;
    parameters: {
      percentAffected: number;
      delayDays: number;
      costIncreasePercent: number;
      additionalOneTimeCost: number;
    };
  }>,
  base: MonthlyDataPoint[],
  initialCash: number,
): StressScenario[] {
  return aiScenarios.map(sc => {
    let monthlyData: MonthlyDataPoint[];

    if (sc.type === 'late_payment') {
      monthlyData = applyLatePayment(base, initialCash, sc.parameters.percentAffected, sc.parameters.delayDays);
    } else if (sc.type === 'churn_spike') {
      monthlyData = applyChurnSpike(base, initialCash, sc.parameters.percentAffected);
    } else {
      monthlyData = applyCostShock(base, initialCash, sc.parameters.costIncreasePercent, sc.parameters.additionalOneTimeCost);
    }

    return { ...sc, monthlyData };
  });
}
