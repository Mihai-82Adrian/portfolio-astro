// Deterministic financial-correctness suite: cashflow projection engine.
//
// Fixture provenance:
//   - mathematical-reference: hand-derivable from the block definitions (fixed
//     amounts, percentages) with no external oracle needed.
//   - regression-case: the three fixed defects (rounding invariant, break-even
//     off-by-one, unbounded growthRate/variablePercent) are pinned so they can't
//     silently regress.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectCashflow, applyLatePayment, applyChurnSpike, applyCostShock,
} from '../../src/lib/cashflow/projectionEngine.ts';
import { findInsolvencyMonth, additionalCapitalNeeded } from '../../src/lib/cashflow/types.ts';

function block(overrides) {
  return {
    id: 'b1', category: 'revenue', subcategory: 'mrr', label: 'Test', amount: 1000,
    ...overrides,
  };
}

// ─── Base projection ───────────────────────────────────────────────────────────

test('projectCashflow: no blocks — balance stays flat at initialCash for the whole horizon', () => {
  const points = projectCashflow(5000, [], 6);
  for (const p of points) {
    assert.equal(p.revenue, 0);
    assert.equal(p.costs, 0);
    assert.equal(p.net, 0);
    assert.equal(p.cumulative, 5000);
  }
});

test('projectCashflow: flat revenue minus flat fixed cost reconciles every month (revenue - costs === net)', () => {
  const blocks = [
    block({ category: 'revenue', amount: 3000 }),
    block({ id: 'b2', category: 'fixed_cost', amount: 1200 }),
  ];
  const points = projectCashflow(10000, blocks, 12);
  for (const p of points) {
    assert.equal(p.revenue - p.costs, p.net);
  }
});

test('projectCashflow: balance progression invariant — cumulative[i] === cumulative[i-1] + net[i]', () => {
  const blocks = [
    block({ category: 'revenue', amount: 2000, growthRate: 3 }),
    block({ id: 'b2', category: 'variable_cost', amount: 0, variablePercent: 17.5 }),
    block({ id: 'b3', category: 'fixed_cost', amount: 800 }),
  ];
  const points = projectCashflow(5000, blocks, 12);
  let expected = 5000;
  for (const p of points) {
    expected += p.net;
    assert.equal(p.cumulative, expected);
  }
});

test('projectCashflow: fractional growthRate/variablePercent still reconciles exactly (regression for independent per-field rounding)', () => {
  const blocks = [
    block({ category: 'revenue', amount: 1111, growthRate: 2.5 }),
    block({ id: 'b2', category: 'variable_cost', amount: 0, variablePercent: 33.3 }),
  ];
  const points = projectCashflow(0, blocks, 12);
  for (const p of points) {
    assert.equal(p.revenue - p.costs, p.net, `month ${p.month}: revenue-costs != net`);
  }
});

test('projectCashflow: identical inputs always yield identical output (determinism)', () => {
  const blocks = [block({ category: 'revenue', amount: 1500, growthRate: 1.2 })];
  const start = new Date(2026, 0, 1);
  assert.deepEqual(projectCashflow(1000, blocks, 6, start), projectCashflow(1000, blocks, 6, start));
});

test('projectCashflow: the omitted-startDate default is a fixed epoch, not wall-clock time', () => {
  // This function also runs during Astro's static build/SSR pass (CashflowApp's
  // baseProjection $derived). A `new Date()` default would bake the build
  // machine's current date into deployed HTML, breaking build reproducibility.
  const [p] = projectCashflow(1000, [], 1);
  assert.equal(p.month, 'Jan 1970');
});

test('projectCashflow: variable cost is a percentage of that same month\'s revenue', () => {
  const blocks = [
    block({ category: 'revenue', amount: 4000 }),
    block({ id: 'b2', category: 'variable_cost', amount: 0, variablePercent: 25 }),
  ];
  const [p] = projectCashflow(0, blocks, 1);
  assert.equal(p.costs, 1000); // 25% of 4000
  assert.equal(p.net, 3000);
});

test('projectCashflow: one-time event applies exactly once, in its target month, as an expense', () => {
  const blocks = [block({ category: 'one_time', amount: 5000, oneTimeMonth: 2 })];
  const points = projectCashflow(10000, blocks, 5);
  assert.deepEqual(points.map(p => p.costs), [0, 0, 5000, 0, 0]);
});

test('projectCashflow: negative cumulative balance (insolvency) is represented, not clamped to zero', () => {
  const blocks = [block({ category: 'fixed_cost', amount: 2000 })];
  const points = projectCashflow(1000, blocks, 3);
  assert.ok(points.some(p => p.cumulative < 0));
});

test('projectCashflow: non-finite initialCash is guarded to zero, never leaks NaN through the whole projection', () => {
  const points = projectCashflow(NaN, [block({ category: 'revenue', amount: 1000 })], 3);
  for (const p of points) {
    assert.ok(Number.isFinite(p.cumulative));
  }
  assert.equal(points[0].cumulative, 1000); // treated as starting from 0
});

test('projectCashflow: zero-length horizon returns an empty array without throwing', () => {
  assert.deepEqual(projectCashflow(1000, [block({})], 0), []);
});

// ─── findInsolvencyMonth / additionalCapitalNeeded ────────────────────────────

test('findInsolvencyMonth: returns -1 when the balance never goes negative', () => {
  const points = projectCashflow(10000, [block({ category: 'revenue', amount: 500 })], 6);
  assert.equal(findInsolvencyMonth(points), -1);
});

test('findInsolvencyMonth / additionalCapitalNeeded: agree on the same projection', () => {
  const points = projectCashflow(1000, [block({ category: 'fixed_cost', amount: 500 })], 6);
  const idx = findInsolvencyMonth(points);
  assert.ok(idx >= 0);
  assert.equal(additionalCapitalNeeded(points), Math.abs(Math.min(...points.map(p => p.cumulative))));
});

test('additionalCapitalNeeded: zero when the balance never dips below zero', () => {
  const points = projectCashflow(10000, [block({ category: 'revenue', amount: 500 })], 6);
  assert.equal(additionalCapitalNeeded(points), 0);
});

// ─── Stress scenarios: applyLatePayment / applyChurnSpike / applyCostShock ────

test('applyLatePayment: delays the affected revenue share by the requested number of months', () => {
  const base = projectCashflow(0, [block({ category: 'revenue', amount: 1000 })], 6);
  const scenario = applyLatePayment(base, 0, 50, 60); // 50% delayed by 2 months
  assert.equal(scenario[0].revenue, 500); // half arrives on time, half delayed away
  assert.equal(scenario[2].revenue, 1000); // its own on-time half (500) + month 0's delayed half (500)
});

test('applyLatePayment: preserves the revenue-costs=net and balance-progression invariants', () => {
  const base = projectCashflow(5000, [
    block({ category: 'revenue', amount: 2000 }),
    block({ id: 'b2', category: 'fixed_cost', amount: 800 }),
  ], 8);
  const scenario = applyLatePayment(base, 5000, 30, 60);
  let expected = 5000;
  for (const p of scenario) {
    assert.equal(p.revenue - p.costs, p.net);
    expected += p.net;
    assert.equal(p.cumulative, expected);
  }
});

test('applyChurnSpike: leaves month 0 untouched, reduces every subsequent month by the given percentage', () => {
  const base = projectCashflow(0, [block({ category: 'revenue', amount: 1000 })], 4);
  const scenario = applyChurnSpike(base, 0, 25);
  assert.equal(scenario[0].revenue, 1000);
  assert.equal(scenario[1].revenue, 750);
  assert.equal(scenario[3].revenue, 750);
});

test('applyCostShock: increases costs by the given percentage and adds the one-time cost in month index 2', () => {
  const base = projectCashflow(0, [block({ category: 'fixed_cost', amount: 1000 })], 4);
  const scenario = applyCostShock(base, 0, 20, 3000);
  assert.equal(scenario[0].costs, 1200);
  assert.equal(scenario[2].costs, 1200 + 3000);
});

test('applyCostShock/applyChurnSpike/applyLatePayment are deterministic for identical inputs', () => {
  const base = projectCashflow(1000, [block({ category: 'revenue', amount: 2000 })], 6);
  assert.deepEqual(applyLatePayment(base, 1000, 30, 60), applyLatePayment(base, 1000, 30, 60));
  assert.deepEqual(applyChurnSpike(base, 1000, 20), applyChurnSpike(base, 1000, 20));
  assert.deepEqual(applyCostShock(base, 1000, 10, 500), applyCostShock(base, 1000, 10, 500));
});

test('regression: late-payment revenue at the tail of the horizon is genuinely lost, not deferred past month 11 (documented horizon-truncation behavior)', () => {
  // With a fixed 12-month horizon, revenue delayed out of months 10-11 has nowhere to land.
  const base = projectCashflow(0, [block({ category: 'revenue', amount: 1000 })], 12);
  const scenario = applyLatePayment(base, 0, 100, 60); // 100% delayed by 2 months
  const totalBaseRevenue     = base.reduce((s, p) => s + p.revenue, 0);
  const totalScenarioRevenue = scenario.reduce((s, p) => s + p.revenue, 0);
  assert.ok(totalScenarioRevenue < totalBaseRevenue, 'the last delayMonths of revenue must be dropped, not deferred beyond the horizon');
});
