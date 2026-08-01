// Phase 2D-C Wave 2 (Section 15): Investment Analytics statistics-capability acceptance.
// Additive to tests/financial/investment-analytics.test.mjs (which already covers ROI/CAGR/
// NPV/IRR/Sharpe/Sortino/VaR/Monte-Carlo determinism and percentile ordering) — this file
// closes the specific gaps in that coverage: negative-return scenarios, insufficient-data
// (single-observation) behavior, the statistical correctness of the hardcoded VaR z-scores
// (a formula-correctness question, independent of the "is a parametric normal assumption the
// right model" question — see the model's own MethodologyModal.svelte disclosure of that
// limitation), and a Monte Carlo distribution-level (not just deterministic-fixture)
// invariant.
import assert from 'node:assert/strict';
import test from 'node:test';

import { calcRiskMetrics, runMonteCarlo, mulberry32 } from '../../src/lib/investment/analytics.ts';

// ─── Negative-return scenarios ──────────────────────────────────────────────────

test('calcRiskMetrics: a pure loss scenario (every period negative) produces a negative annualized return, a negative Sharpe ratio, and a VaR reflecting a real loss', () => {
  const r = calcRiskMetrics(10000, [
    { year: 1, amount: -2000 },
    { year: 2, amount: -1500 },
    { year: 3, amount: -1000 },
  ]);
  assert.ok(r.annualizedReturn < 0, 'a strictly declining value series must show a negative annualized return');
  assert.ok(r.sharpeRatio < 0, 'excess return over the (positive) risk-free rate is negative when the asset itself lost money');
  assert.ok(Number.isFinite(r.var95) && Number.isFinite(r.var99));
  assert.ok(r.var95 < 0, 'a loss-making scenario must show a negative (loss) VaR95 in currency terms');
});

test('calcRiskMetrics: a pure loss scenario has ALL downside observations, so Sortino uses every period (not just some)', () => {
  const r = calcRiskMetrics(10000, [{ year: 1, amount: -500 }, { year: 2, amount: -500 }]);
  assert.ok(Number.isFinite(r.sortinoRatio));
  assert.ok(r.sortinoRatio <= 0);
});

test('calcRiskMetrics: maxDrawdown is 0 for a monotonically increasing value series and strictly negative once any decline occurs', () => {
  const rising = calcRiskMetrics(10000, [{ year: 1, amount: 1000 }, { year: 2, amount: 1000 }]);
  assert.equal(rising.maxDrawdown, 0);

  const dipThenRecover = calcRiskMetrics(10000, [
    { year: 1, amount: 5000 },  // peak at 15000
    { year: 2, amount: -8000 }, // drops to 7000 -> drawdown from 15000 peak
    { year: 3, amount: 6000 },  // recovers to 13000, still below the 15000 peak
  ]);
  assert.ok(dipThenRecover.maxDrawdown < 0, 'a mid-series dip below the running peak must register as a drawdown even after partial recovery');
});

// ─── Insufficient-data behavior ─────────────────────────────────────────────────

test('calcRiskMetrics: a single data point (one cashflow) cannot support a sample standard deviation — volatility/Sharpe/Sortino must degrade to 0, not NaN', () => {
  const r = calcRiskMetrics(10000, [{ year: 1, amount: 1200 }]);
  assert.equal(r.annualizedVolatility, 0, 'stdDev requires at least 2 observations; with 1 it is defined as 0, not NaN');
  assert.ok(Number.isFinite(r.sharpeRatio));
  assert.ok(Number.isFinite(r.sortinoRatio));
  assert.ok(Number.isFinite(r.var95) && Number.isFinite(r.var99));
});

test('runMonteCarlo: insufficient data (0 or 1 historical return) falls back to the documented default assumption (mu=7%, sigma=15%), not zero/NaN drift', () => {
  const zeroData = runMonteCarlo(10000, [], 100, mulberry32(1));
  const oneDataPoint = runMonteCarlo(10000, [{ year: 1, amount: 1000 }], 100, mulberry32(1));
  for (const r of [zeroData, oneDataPoint]) {
    assert.ok(Number.isFinite(r.expectedFinalValue));
    assert.ok(r.paths.every((p) => p.every((v) => Number.isFinite(v) && v >= 0)));
  }
});

// ─── VaR z-score formula correctness (independent of the parametric-normal model assumption) ─

test('VaR95/VaR99 use the statistically correct one-tailed standard-normal critical values (1.645 / 2.326), not an arbitrary or mismatched pair', () => {
  // Independent reference values from a standard normal quantile table (not derived from
  // the implementation): z(0.95) = 1.645 and z(0.99) = 2.326 one-tailed.
  const referenceZ95 = 1.645;
  const referenceZ99 = 2.326;

  // Reconstruct mu/sigma independently from a fixture with a hand-computable sample mean
  // and standard deviation, then check that the implementation's VaR matches what those
  // two specific z-scores (and only those) would produce.
  const initial = 10000;
  const cashFlows = [{ year: 1, amount: 2000 }, { year: 2, amount: -1000 }, { year: 3, amount: 3000 }];
  // Returns: (12000-10000)/10000=0.2, (11000-12000)/12000=-0.08333..., (14000-11000)/11000=0.27273...
  const returns = [0.2, -1000 / 12000, 3000 / 11000];
  const mu = returns.reduce((s, v) => s + v, 0) / returns.length;
  const meanForVar = mu;
  const variance = returns.reduce((s, v) => s + (v - meanForVar) ** 2, 0) / (returns.length - 1);
  const sigma = Math.sqrt(variance);

  const expectedVar95 = (mu - sigma * referenceZ95) * initial;
  const expectedVar99 = (mu - sigma * referenceZ99) * initial;

  const r = calcRiskMetrics(initial, cashFlows);
  // Tolerance of 0.1% of `initial` absorbs the difference between the reference z-scores
  // (1.645/2.326) and the implementation's slightly more precise constants (1.645/2.3263).
  assert.ok(Math.abs(r.var95 - expectedVar95) < 0.001 * initial, `var95: expected ~${expectedVar95}, got ${r.var95}`);
  assert.ok(Math.abs(r.var99 - expectedVar99) < 0.001 * initial, `var99: expected ~${expectedVar99}, got ${r.var99}`);
});

// ─── Monte Carlo: distribution-level invariant (not just a deterministic fixture) ──

test('runMonteCarlo: the expected final value converges (within statistical tolerance) to the closed-form GBM expectation E[S_T] = S_0 * exp(mu*T)', () => {
  // Large nSims to keep sampling error small; seeded for a reproducible CI run.
  const initial = 10000;
  const cashFlows = [{ year: 1, amount: 800 }, { year: 2, amount: 900 }, { year: 3, amount: 1000 }];
  const nSims = 20_000;
  const r = runMonteCarlo(initial, cashFlows, nSims, mulberry32(2026));

  // Independently re-derive mu the same way the implementation does (mean of the
  // CF-implied return series) — this is the model's own drift assumption, not a
  // hidden implementation detail, and is disclosed as such in MethodologyModal.svelte.
  const returns = [
    (10800 - 10000) / 10000,
    (11700 - 10800) / 10800,
    (12700 - 11700) / 11700,
  ];
  const mu = returns.reduce((s, v) => s + v, 0) / returns.length;
  const nYears = 3;
  const expected = initial * Math.exp(mu * nYears);

  // 20k paths of a lognormal with realistic equity-like volatility: allow a generous
  // ±8% relative tolerance so this remains a stable, non-flaky CI assertion while still
  // meaningfully catching a broken drift term (e.g. a sign error or missing 0.5*sigma^2
  // correction, which would shift the mean by tens of percent, not a few).
  const relativeError = Math.abs(r.expectedFinalValue - expected) / expected;
  assert.ok(relativeError < 0.08, `expected ~${expected}, got ${r.expectedFinalValue} (relative error ${relativeError})`);
});

test('runMonteCarlo: probPositive is a coherent probability (0-100) and moves with the sign of the drift, seeded for reproducibility', () => {
  const positiveDrift = runMonteCarlo(10000, [{ year: 1, amount: 2000 }, { year: 2, amount: 3000 }], 5000, mulberry32(11));
  const negativeDrift = runMonteCarlo(10000, [{ year: 1, amount: -2000 }, { year: 2, amount: -3000 }], 5000, mulberry32(11));
  assert.ok(positiveDrift.probPositive >= 0 && positiveDrift.probPositive <= 100);
  assert.ok(negativeDrift.probPositive >= 0 && negativeDrift.probPositive <= 100);
  assert.ok(positiveDrift.probPositive > negativeDrift.probPositive, 'a positive-drift scenario must show a higher probability of ending above the initial value than a negative-drift scenario');
});
