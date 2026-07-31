// Deterministic financial-correctness suite: Startup Runway projection engine.
// Phase 2D-C Wave 2 (launch-critical, Section 14): this tool had zero permanent test
// coverage before this suite. All expected values below are hand-derived independently
// from the model description in src/lib/fin-core/runway.ts (fixed inputs, closed-form
// compounding/geometric-series formulas), not copied from running the implementation.
//
// RUNWAY-01 (PHASE_2D_C_WAVE2_FIN_TOOLS_REGISTER.md) is resolved per owner decision: a
// scenario with zero opening cash, zero burn, and zero revenue is a no-cash-consumption
// state, not bankruptcy. `isBankrupt` distinguishes a zero balance reached with no negative
// net cash flow (not bankrupt) from a zero or negative balance reached through actual
// negative net cash flow (bankrupt) — see the "zero opening cash + zero burn + zero
// revenue" test below.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { projectRunway, EMPLOYER_OVERHEAD_DE, DEATH_VALLEY_THRESHOLD_MONTHS } from '../../src/lib/fin-core/runway.ts';

assert.equal(EMPLOYER_OVERHEAD_DE, 0.2, 'these tests assume the documented 20% DE employer-overhead constant');
assert.equal(DEATH_VALLEY_THRESHOLD_MONTHS, 3, 'these tests assume the documented 3-month death-valley threshold');

function scenario(overrides = {}) {
  return {
    id: 's1',
    name: 'Test',
    initialCash: 0,
    startDate: new Date(2026, 0, 1), // Jan 2026
    headcount: [],
    opex: [],
    revenue: { initialMRR: 0, momGrowthRate: 0 },
    injections: [],
    ...overrides,
  };
}

function role(overrides) {
  return { id: 'r', title: 'Role', monthlyCost: 0, startMonth: 0, status: 'active', ...overrides };
}

function opexItem(overrides) {
  return { id: 'o', label: 'Opex', amount: 0, type: 'recurring', ...overrides };
}

// ─── Zero and positive opening cash ────────────────────────────────────────────

test('zero opening cash + zero burn + zero revenue: no-cash-consumption state, not bankrupt', () => {
  const { snapshots, runwayMonths, bankruptMonth, deathValleyMonth } = projectRunway(scenario({ initialCash: 0 }), 6);
  assert.equal(snapshots.length, 6, 'nothing is being spent, so the projection runs the full horizon instead of stopping');
  for (const s of snapshots) {
    assert.equal(s.isBankrupt, false);
    assert.equal(s.closingBalance, 0);
    assert.equal(s.runwayRemaining, Infinity, 'netBurn is 0, so runwayRemaining is infinite at the model level');
  }
  assert.equal(bankruptMonth, null);
  assert.equal(runwayMonths, 6);
  assert.equal(deathValleyMonth, null, 'isDeathValley requires closingBalance > 0');
});

test('zero opening cash reached by an exact burn/revenue offset (net cash flow of zero) is not bankrupt', () => {
  // burn 500/mo exactly offset by 500 MRR -> netCashFlow 0 every month, balance stays at 0.
  const { snapshots, bankruptMonth } = projectRunway(scenario({
    initialCash: 0,
    opex: [opexItem({ amount: 500, type: 'recurring' })],
    revenue: { initialMRR: 500, momGrowthRate: 0 },
  }), 4);
  assert.equal(snapshots.length, 4);
  for (const s of snapshots) {
    assert.equal(s.netCashFlow, 0);
    assert.equal(s.closingBalance, 0);
    assert.equal(s.isBankrupt, false, 'a zero balance reached with zero net cash flow is not liquidity exhaustion');
  }
  assert.equal(bankruptMonth, null);
});

test('positive opening cash + zero burn + zero revenue: balance stays flat forever, never bankrupt', () => {
  const { snapshots, runwayMonths, bankruptMonth, deathValleyMonth } = projectRunway(scenario({ initialCash: 10_000 }), 12);
  assert.equal(snapshots.length, 12);
  for (const s of snapshots) {
    assert.equal(s.closingBalance, 10_000);
    assert.equal(s.isBankrupt, false);
    assert.equal(s.runwayRemaining, Infinity);
  }
  assert.equal(runwayMonths, 12);
  assert.equal(bankruptMonth, null);
  assert.equal(deathValleyMonth, null);
});

// ─── Zero and positive initial MRR + monthly compounding ───────────────────────

test('zero initial MRR: revenue stays exactly zero for every month regardless of growth rate', () => {
  const { snapshots } = projectRunway(scenario({ initialCash: 100_000, revenue: { initialMRR: 0, momGrowthRate: 25 } }), 12);
  for (const s of snapshots) assert.equal(s.mrr, 0);
});

test('positive initial MRR with 0% growth stays flat every month', () => {
  const { snapshots } = projectRunway(scenario({ initialCash: 100_000, revenue: { initialMRR: 750, momGrowthRate: 0 } }), 8);
  for (const s of snapshots) assert.equal(s.mrr, 750);
});

test('monthly MRR compounding matches hand-derived values for 10% MoM growth on 1000 initial MRR', () => {
  // Hand-derived (not run through the implementation): 1000, 1100, 1210, 1331, 1464.1, 1610.51
  const expected = [1000, 1100, 1210, 1331, 1464.1, 1610.51];
  const { snapshots } = projectRunway(scenario({ initialCash: 1_000_000, revenue: { initialMRR: 1000, momGrowthRate: 10 } }), expected.length);
  expected.forEach((value, m) => {
    assert.ok(Math.abs(snapshots[m].mrr - value) < 1e-9, `month ${m}: expected ${value}, got ${snapshots[m].mrr}`);
  });
});

test('revenue reconciliation: the sum of all monthly MRR over the horizon matches the closed-form geometric-series total', () => {
  const initialMRR = 500;
  const growthPct = 5;
  const horizon = 24;
  const { snapshots } = projectRunway(scenario({ initialCash: 10_000_000, revenue: { initialMRR, momGrowthRate: growthPct } }), horizon);
  const g = growthPct / 100;
  // Closed-form sum of a geometric series: MRR0 * ((1+g)^T - 1) / g — independent of the
  // per-month iterative-multiplication code path used inside projectRunway.
  const expectedTotal = initialMRR * (Math.pow(1 + g, horizon) - 1) / g;
  const actualTotal = snapshots.reduce((sum, s) => sum + s.mrr, 0);
  assert.ok(Math.abs(actualTotal - expectedTotal) < 1e-6, `expected total ${expectedTotal}, got ${actualTotal}`);
});

// ─── Fixed and variable (one-off) OPEX ──────────────────────────────────────────

test('fixed recurring OPEX applies identically every month regardless of month index', () => {
  const { snapshots } = projectRunway(scenario({
    initialCash: 1_000_000,
    opex: [opexItem({ amount: 800, type: 'recurring' })],
  }), 10);
  for (const s of snapshots) {
    assert.equal(s.opexBurn, 800);
    assert.equal(s.totalBurn, 800);
  }
});

test('one-off OPEX applies exactly once, only in its specified month', () => {
  const { snapshots } = projectRunway(scenario({
    initialCash: 1_000_000,
    opex: [opexItem({ amount: 3500, type: 'one-off', month: 5 })],
  }), 10);
  snapshots.forEach((s, m) => {
    assert.equal(s.opexBurn, m === 5 ? 3500 : 0, `month ${m}`);
  });
});

test('fixed and one-off OPEX combine additively in the month they overlap', () => {
  const { snapshots } = projectRunway(scenario({
    initialCash: 1_000_000,
    opex: [
      opexItem({ id: 'a', amount: 500, type: 'recurring' }),
      opexItem({ id: 'b', amount: 3000, type: 'one-off', month: 2 }),
    ],
  }), 5);
  assert.equal(snapshots[0].opexBurn, 500);
  assert.equal(snapshots[2].opexBurn, 3500);
  assert.equal(snapshots[4].opexBurn, 500);
});

// ─── Headcount cost, hiring timing, and the DE employer-overhead multiplier ────

test('headcount burn: overhead multiplier is exact, hires start on their exact startMonth (not before), and frozen roles never contribute', () => {
  const headcount = [
    role({ id: 'a', monthlyCost: 1000, startMonth: 0, status: 'active' }),
    role({ id: 'b', monthlyCost: 2000, startMonth: 3, status: 'active' }),
    role({ id: 'c', monthlyCost: 5000, startMonth: 0, status: 'frozen' }),
  ];
  const { snapshots } = projectRunway(scenario({ initialCash: 10_000_000, headcount }), 6);

  // Months 0-2: only role "a" is active. 1000 * 1.2 = 1200.
  assert.equal(snapshots[0].headcountBurn, 1200);
  assert.equal(snapshots[2].headcountBurn, 1200);
  // Months 3+: "a" + "b". (1000 + 2000) * 1.2 = 3600.
  assert.equal(snapshots[3].headcountBurn, 3600);
  assert.equal(snapshots[5].headcountBurn, 3600);
  // Frozen role "c" (5000/mo) never appears, at any month, despite startMonth 0.
  for (const s of snapshots) assert.ok(s.headcountBurn < 5000 * (1 + EMPLOYER_OVERHEAD_DE));
});

// ─── Cash-injection timing ──────────────────────────────────────────────────────

test('capital injections land exactly in their specified month and nowhere else, and are totalled correctly', () => {
  const { snapshots, totalInjections } = projectRunway(scenario({
    initialCash: 1000,
    opex: [opexItem({ amount: 100, type: 'recurring' })],
    injections: [{ id: 'i1', label: 'Seed', amount: 50_000, month: 4 }],
  }), 8);
  snapshots.forEach((s, m) => {
    assert.equal(s.injections, m === 4 ? 50_000 : 0, `month ${m}`);
  });
  assert.equal(totalInjections, 50_000);
  assert.equal(snapshots[4].netCashFlow, 50_000 - 100);
});

test('an injection scheduled BEFORE the exhaustion month it would otherwise hit extends the runway past that month', () => {
  const withoutInjection = projectRunway(scenario({
    initialCash: 5000,
    opex: [opexItem({ amount: 1000, type: 'recurring' })],
  }), 12);
  // Hand-derived: closingBalance(m) = 5000 - 1000*(m+1); reaches 0 at m=4.
  assert.equal(withoutInjection.bankruptMonth, 4);

  const withInjection = projectRunway(scenario({
    initialCash: 5000,
    opex: [opexItem({ amount: 1000, type: 'recurring' })],
    injections: [{ id: 'i1', label: 'Bridge', amount: 10_000, month: 2 }],
  }), 12);
  assert.equal(withInjection.bankruptMonth, null, 'a 10k injection at month 2 must prevent the month-4 exhaustion within a 12-month horizon');
  assert.equal(withInjection.snapshots[2].closingBalance, 12_000, '3000 opening at month 2 + 10000 injection - 1000 burn = 12000');
});

test('an injection scheduled AFTER a bankruptcy the model already reached is never applied — the projection stops at first bankruptcy', () => {
  const base = { initialCash: 5000, opex: [opexItem({ amount: 1000, type: 'recurring' })] };
  const withoutInjection = projectRunway(scenario(base), 12);
  assert.equal(withoutInjection.bankruptMonth, 4);

  const withLateInjection = projectRunway(scenario({
    ...base,
    injections: [{ id: 'i1', label: 'Too late', amount: 1_000_000, month: 6 }],
  }), 12);
  assert.equal(withLateInjection.bankruptMonth, 4, 'bankruptcy at month 4 is unchanged — the month-6 injection is never reached');
  assert.equal(withLateInjection.snapshots.length, 5, 'the projection must stop at the bankrupt month (0..4), never reaching month 6');
  assert.equal(withLateInjection.totalInjections, 0, 'an injection past the point of bankruptcy is never counted');
});

// ─── Exact runway exhaustion month ──────────────────────────────────────────────

test('exact bankruptcy month matches a hand-derived linear-burn calculation', () => {
  // initialCash 10000, one active role costing 1000/mo (burn incl. 20% overhead = 1200/mo),
  // no opex, no revenue, no injections.
  // closingBalance(m) = 10000 - 1200*(m+1); first m with closingBalance <= 0 is m=8
  // (10000 - 1200*9 = -800), since m=7 gives 10000 - 1200*8 = 400 > 0.
  const { snapshots, bankruptMonth, runwayMonths } = projectRunway(scenario({
    initialCash: 10_000,
    headcount: [role({ monthlyCost: 1000, startMonth: 0, status: 'active' })],
  }), 20);
  assert.equal(bankruptMonth, 8);
  assert.equal(runwayMonths, 8, 'months 0-7 survived (8 months), month 8 itself is the bankrupt month');
  assert.equal(snapshots.length, 9);
  assert.ok(Math.abs(snapshots[7].closingBalance - 400) < 1e-9);
  assert.ok(Math.abs(snapshots[8].closingBalance - -800) < 1e-9);
});

// ─── No-exhaustion / infinite-runway condition ──────────────────────────────────

test('no-exhaustion condition: revenue exceeding burn every month yields infinite runway for the entire horizon', () => {
  const { snapshots, runwayMonths, bankruptMonth, deathValleyMonth } = projectRunway(scenario({
    initialCash: 1000,
    opex: [opexItem({ amount: 1000, type: 'recurring' })],
    revenue: { initialMRR: 2000, momGrowthRate: 0 },
  }), 36);
  for (const s of snapshots) {
    assert.equal(s.runwayRemaining, Infinity);
    assert.equal(s.isBankrupt, false);
  }
  assert.equal(snapshots.length, 36, 'the default 36-month horizon must run to completion when the company never goes bankrupt');
  assert.equal(runwayMonths, 36);
  assert.equal(bankruptMonth, null);
  assert.equal(deathValleyMonth, null);
});

// ─── Death-valley and bankruptcy boundaries ─────────────────────────────────────

test('death-valley boundary is a strict "<" — exactly 3.0 months of runway does NOT count as death valley', () => {
  // opex 1000/mo, no revenue -> netBurn = 1000. Want closingBalance = 3000 at month 0
  // exactly, so initialCash - 1000 = 3000 -> initialCash = 4000.
  const { snapshots } = projectRunway(scenario({ initialCash: 4000, opex: [opexItem({ amount: 1000, type: 'recurring' })] }), 1);
  assert.ok(Math.abs(snapshots[0].closingBalance - 3000) < 1e-9);
  assert.ok(Math.abs(snapshots[0].runwayRemaining - 3) < 1e-9);
  assert.equal(snapshots[0].isDeathValley, false, 'runwayRemaining === 3.0 must NOT trigger death valley (strict <)');
});

test('death-valley boundary: just under 3.0 months of runway DOES count as death valley', () => {
  // initialCash 3999 -> closingBalance 2999 -> runwayRemaining 2.999 < 3.
  const { snapshots } = projectRunway(scenario({ initialCash: 3999, opex: [opexItem({ amount: 1000, type: 'recurring' })] }), 1);
  assert.ok(Math.abs(snapshots[0].runwayRemaining - 2.999) < 1e-9);
  assert.equal(snapshots[0].isDeathValley, true);
  assert.equal(snapshots[0].isBankrupt, false, 'death valley and bankruptcy are distinct: 2999 > 0');
});

test('bankruptcy boundary: closingBalance of exactly 0 counts as bankrupt', () => {
  const { snapshots } = projectRunway(scenario({ initialCash: 1200, headcount: [role({ monthlyCost: 1000, startMonth: 0 })] }), 1);
  assert.ok(Math.abs(snapshots[0].closingBalance) < 1e-9);
  assert.equal(snapshots[0].isBankrupt, true);
});

// ─── Zero burn ───────────────────────────────────────────────────────────────────

test('zero burn with positive revenue and zero starting cash: the company is never bankrupt as soon as any positive cash flow occurs', () => {
  const { snapshots } = projectRunway(scenario({ initialCash: 0, revenue: { initialMRR: 100, momGrowthRate: 5 } }), 6);
  assert.equal(snapshots[0].totalBurn, 0);
  assert.equal(snapshots[0].closingBalance, 100);
  assert.equal(snapshots[0].isBankrupt, false, 'unlike the all-zero case, a positive month-0 cash flow keeps the company solvent');
  assert.equal(snapshots[0].runwayRemaining, Infinity, 'netBurn is clamped to 0 when burn does not exceed revenue');
});

// ─── Finite-number guarantees ────────────────────────────────────────────────────

test('finite-number guarantee: every non-runwayRemaining numeric field stays finite across a large-growth, full-horizon scenario', () => {
  const { snapshots } = projectRunway(scenario({
    initialCash: 500_000,
    headcount: [role({ monthlyCost: 8000, startMonth: 0 })],
    opex: [opexItem({ amount: 2000, type: 'recurring' }), opexItem({ amount: 20_000, type: 'one-off', month: 10 })],
    revenue: { initialMRR: 1000, momGrowthRate: 200 }, // the UI-declared maximum growth rate
    injections: [{ id: 'i1', label: 'Series A', amount: 2_000_000, month: 20 }],
  }), 36);
  for (const s of snapshots) {
    for (const field of ['openingBalance', 'headcountBurn', 'opexBurn', 'totalBurn', 'mrr', 'injections', 'netCashFlow', 'closingBalance']) {
      assert.ok(Number.isFinite(s[field]), `${field} must be finite, got ${s[field]}`);
    }
    // runwayRemaining is intentionally Infinity (a documented sentinel) whenever netBurn is 0.
    assert.ok(Number.isFinite(s.runwayRemaining) || s.runwayRemaining === Infinity);
  }
});

test('documented boundary behavior: the calculation engine itself does not clamp a negative monthlyCost (input clamping is a UI-layer responsibility, fixed in the Svelte editors per Register RUNWAY-02)', () => {
  // projectRunway() trusts its input and does not reject an out-of-contract negative
  // cost — it stays finite and mathematically well-defined (reduces burn). The UI-layer
  // gap this used to expose (oninput handlers not clamping to their declared min/max)
  // was closed directly in ScenarioEditor/HiringPlanEditor/RevenueEditor/OpexEditor.svelte;
  // this test pins the engine's own trust-the-input behavior, not a defect.
  const { snapshots } = projectRunway(scenario({
    initialCash: 10_000,
    headcount: [role({ monthlyCost: -500, startMonth: 0 })],
  }), 3);
  assert.ok(Number.isFinite(snapshots[0].headcountBurn));
  assert.equal(snapshots[0].headcountBurn, -500 * (1 + EMPLOYER_OVERHEAD_DE));
});

// ─── Month-index and displayed-date consistency ─────────────────────────────────

test('snapshot.month matches its array index exactly (chart and metrics components index into snapshots by position)', () => {
  const { snapshots } = projectRunway(scenario({ initialCash: 1_000_000 }), 24);
  snapshots.forEach((s, i) => assert.equal(s.month, i));
});

test('displayed month labels roll over the calendar year correctly across a 13+ month horizon', () => {
  const { snapshots } = projectRunway(scenario({ initialCash: 1_000_000, startDate: new Date(2026, 0, 1) }), 13);
  assert.match(snapshots[0].label, /2026/, 'month 0 (Jan 2026) must display 2026');
  assert.match(snapshots[11].label, /2026/, 'month 11 (Dec 2026) must still display 2026');
  assert.match(snapshots[12].label, /2027/, 'month 12 (Jan 2027) must roll over to 2027');
});

// ─── Chart-series reconciliation (source-level; Chart.js rendering itself is exercised in the browser acceptance pass) ─

test('chart-series reconciliation: RunwayChart clamps only its rendered line to >= 0, never the underlying model result', () => {
  const source = readFileSync(fileURLToPath(new URL('../../src/components/tools/runway/RunwayChart.svelte', import.meta.url)), 'utf8');
  // The rendered dataset intentionally floors the visual line at 0 so a bankrupt month
  // does not draw below the x-axis; the underlying snapshot.closingBalance (used for
  // isBankrupt/isDeathValley and the tooltip) is never itself clamped.
  assert.match(source, /data:\s*snaps\.map\(s\s*=>\s*Math\.max\(s\.closingBalance,\s*0\)\)/);
  assert.match(source, /Cash:\s*\$\{eur\(snap\.closingBalance\)\}/, 'the tooltip must show the true (unclamped) closing balance, not the floored display value');
});
