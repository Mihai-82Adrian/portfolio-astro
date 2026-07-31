// Deterministic financial-correctness suite: investment analytics metrics
// (ROI, CAGR, NPV, IRR, Sharpe, Sortino, VaR, Monte Carlo).
//
// Fixture provenance:
//   - mathematical-reference: known closed-form examples independently computable
//     by hand (e.g. CAGR of a simple lump-sum, NPV of a single cashflow).
//   - regression-case: pins current verified behavior.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calcROI, calcCAGR, calcNPV, calcIRR, calcPayback,
  calcReturnMetrics, calcRiskMetrics, runMonteCarlo, mulberry32,
} from '../../src/lib/investment/analytics.ts';

// ─── ROI ───────────────────────────────────────────────────────────────────────

test('calcROI: known example — 10000 initial, 12000 total returned = 20% ROI', () => {
  assert.equal(calcROI(10000, [{ year: 1, amount: 12000 }]), 20);
});

test('calcROI: zero initial investment does not throw or return Infinity/NaN', () => {
  assert.equal(calcROI(0, [{ year: 1, amount: 1000 }]), 0);
});

test('calcROI: all-negative cashflows produce ROI of -100% or worse', () => {
  const roi = calcROI(10000, [{ year: 1, amount: -500 }]);
  assert.ok(roi <= -100);
});

// ─── CAGR ──────────────────────────────────────────────────────────────────────

test('calcCAGR: known example — doubling over 1 year is exactly 100%', () => {
  assert.equal(calcCAGR(10000, 20000, 1), 100);
});

test('calcCAGR: known example — 10000 → 12100 over 2 years is exactly 10% (compounding)', () => {
  assert.equal(round(calcCAGR(10000, 12100, 2), 6), 10);
});

test('calcCAGR: zero or negative duration/values return 0, never NaN/Infinity', () => {
  assert.equal(calcCAGR(10000, 12000, 0), 0);
  assert.equal(calcCAGR(0, 12000, 3), 0);
  assert.equal(calcCAGR(10000, -500, 3), 0);
});

// ─── NPV ───────────────────────────────────────────────────────────────────────

test('calcNPV: known example — single cashflow discounted by exactly the discount rate', () => {
  // 11000 in year 1 discounted at 10% = 10000 exactly; NPV of a 10000 outlay = 0.
  assert.equal(round(calcNPV(10000, [{ year: 1, amount: 11000 }], 10), 6), 0);
});

test('calcNPV: zero discount rate is a plain sum of cashflows minus initial', () => {
  const cfs = [{ year: 1, amount: 500 }, { year: 2, amount: 500 }];
  assert.equal(calcNPV(1000, cfs, 0), 0);
});

// ─── IRR ───────────────────────────────────────────────────────────────────────

test('calcIRR: known example — 10000 → 11000 in year 1 has IRR of exactly 10%', () => {
  const irr = calcIRR(10000, [{ year: 1, amount: 11000 }]);
  assert.equal(round(irr, 4), 10);
});

test('calcIRR: all-negative cashflows (total loss) return null (no positive root, and diverges past -100%)', () => {
  const irr = calcIRR(10000, [{ year: 1, amount: 0 }, { year: 2, amount: 0 }]);
  assert.equal(irr, null);
});

test('calcIRR: multiple-sign-change cashflows still converge to a finite value or null, never NaN', () => {
  const irr = calcIRR(10000, [{ year: 1, amount: -5000 }, { year: 2, amount: 20000 }, { year: 3, amount: -8000 }]);
  assert.ok(irr === null || Number.isFinite(irr));
});

test('calcIRR: is deterministic for identical inputs', () => {
  const cfs = [{ year: 1, amount: 3000 }, { year: 2, amount: 4000 }, { year: 3, amount: 6000 }];
  assert.equal(calcIRR(10000, cfs), calcIRR(10000, cfs));
});

// ─── Payback ───────────────────────────────────────────────────────────────────

test('calcPayback: finds the first year cumulative cashflow recovers the initial outlay', () => {
  const year = calcPayback(10000, [{ year: 1, amount: 4000 }, { year: 2, amount: 4000 }, { year: 3, amount: 4000 }]);
  assert.equal(year, 3);
});

test('calcPayback: returns null when the outlay is never recovered', () => {
  assert.equal(calcPayback(10000, [{ year: 1, amount: 1000 }]), null);
});

// ─── calcReturnMetrics: CAGR/IRR division of labor ────────────────────────────

test('calcReturnMetrics: CAGR is only computed for a single exit cashflow, else null (IRR is used instead)', () => {
  const single = calcReturnMetrics(10000, [{ year: 3, amount: 15000 }], 8);
  const multi  = calcReturnMetrics(10000, [{ year: 1, amount: 3000 }, { year: 2, amount: 15000 }], 8);
  assert.ok(single.cagr !== null);
  assert.equal(multi.cagr, null);
  assert.ok(multi.irr !== null);
});

// ─── Risk metrics: zero-variance / no-downside / empty edge cases ────────────

test('calcRiskMetrics: no cashflows (empty series) returns all-zero, finite metrics', () => {
  const r = calcRiskMetrics(10000, []);
  for (const v of Object.values(r)) assert.ok(Number.isFinite(v));
  assert.equal(r.sharpeRatio, 0);
  assert.equal(r.sortinoRatio, 0);
});

test('calcRiskMetrics: zero volatility (identical returns) yields Sharpe = 0, not Infinity/NaN', () => {
  // Two identical-percentage periods → zero sample variance.
  const r = calcRiskMetrics(10000, [{ year: 1, amount: 1000 }, { year: 2, amount: 1100 }]);
  assert.equal(r.annualizedVolatility, 0);
  assert.ok(Number.isFinite(r.sharpeRatio));
});

test('calcRiskMetrics: no downside observations yields Sortino = 0 (no downside deviation), not Infinity', () => {
  const r = calcRiskMetrics(10000, [{ year: 1, amount: 5000 }, { year: 2, amount: 5000 }, { year: 3, amount: 5000 }]);
  assert.ok(Number.isFinite(r.sortinoRatio));
});

test('calcRiskMetrics: all-positive cashflows produce a non-negative annualized return', () => {
  const r = calcRiskMetrics(10000, [{ year: 1, amount: 2000 }, { year: 2, amount: 2000 }]);
  assert.ok(r.annualizedReturn >= 0);
});

test('calcRiskMetrics: VaR95/VaR99 are finite and VaR99 is never a smaller loss than VaR95', () => {
  const r = calcRiskMetrics(10000, [{ year: 1, amount: -1000 }, { year: 2, amount: 2000 }, { year: 3, amount: -500 }]);
  assert.ok(Number.isFinite(r.var95));
  assert.ok(Number.isFinite(r.var99));
  assert.ok(r.var99 <= r.var95); // 99% confidence loss is at least as large (more negative)
});

// ─── Monte Carlo: seeded determinism (§ task requirement — no nondeterministic test) ──

test('runMonteCarlo: identical seed produces byte-identical paths (reproducibility)', () => {
  const cashFlows = [{ year: 1, amount: 1000 }, { year: 2, amount: 1500 }];
  const a = runMonteCarlo(10000, cashFlows, 200, mulberry32(42));
  const b = runMonteCarlo(10000, cashFlows, 200, mulberry32(42));
  assert.deepEqual(a, b);
});

test('runMonteCarlo: different seeds produce different paths (not a hardcoded constant)', () => {
  const cashFlows = [{ year: 1, amount: 1000 }];
  const a = runMonteCarlo(10000, cashFlows, 200, mulberry32(1));
  const b = runMonteCarlo(10000, cashFlows, 200, mulberry32(2));
  assert.notDeepEqual(a.percentile50, b.percentile50);
});

test('runMonteCarlo: percentile ordering holds (P5 ≤ P50 ≤ P95) for every year, seeded', () => {
  const cashFlows = [{ year: 1, amount: 500 }, { year: 2, amount: 500 }, { year: 3, amount: 500 }];
  const r = runMonteCarlo(10000, cashFlows, 500, mulberry32(7));
  for (let t = 0; t < r.percentile5.length; t++) {
    assert.ok(r.percentile5[t] <= r.percentile50[t]);
    assert.ok(r.percentile50[t] <= r.percentile95[t]);
  }
});

test('runMonteCarlo: all simulated values are finite and non-negative (GBM never goes negative)', () => {
  const r = runMonteCarlo(10000, [{ year: 1, amount: 1000 }], 300, mulberry32(99));
  for (const path of r.paths) {
    for (const v of path) {
      assert.ok(Number.isFinite(v));
      assert.ok(v >= 0);
    }
  }
  assert.ok(Number.isFinite(r.expectedFinalValue));
  assert.ok(r.probPositive >= 0 && r.probPositive <= 100);
});

function round(v, digits) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
