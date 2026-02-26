import type { CashflowBlock, MonthlyDataPoint } from './types';

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
