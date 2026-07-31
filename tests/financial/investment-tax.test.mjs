// Deterministic financial-correctness suite: German investment tax
// (Kapitalertragsteuer / Solidaritätszuschlag / Kirchensteuer / Vorabpauschale).
//
// Fixture provenance:
//   - mathematical-reference: § 32d Abs. 1 Satz 3–5 EStG and § 18 InvStG give exact
//     closed-form arithmetic, independently derivable without running the engine.
//   - regression-case: pins current verified behavior against future changes.
import assert from 'node:assert/strict';
import test from 'node:test';

import { calcTax, calcKESt, calcVorabpauschale } from '../../src/lib/investment/analytics.ts';
import { TAX_RATE, BASISZINS_2026 } from '../../src/lib/investment/types.ts';

// ─── calcKESt: § 32d Abs. 1 Satz 3–5 EStG ─────────────────────────────────────

test('calcKESt: no Kirchensteuer reduces to the flat 26.375% (TAX_RATE)', () => {
  const r = calcKESt(10000, 0);
  assert.equal(round(r.total / 10000, 6), TAX_RATE);
  assert.equal(r.kirchensteuer, 0);
});

test('calcKESt: 9% Kirchensteuer — KESt reduces to 25/(4.09) = 24.4499...%', () => {
  const r = calcKESt(10000, 9);
  assert.equal(round(r.kest / 10000, 6), round(1 / 4.09, 6));
  // KiSt = 9% of the reduced KESt, not of the flat 25% KESt.
  assert.equal(round(r.kirchensteuer, 6), round(0.09 * r.kest, 6));
  // Soli = 5.5% of the reduced KESt.
  assert.equal(round(r.soli, 6), round(0.055 * r.kest, 6));
});

test('calcKESt: 8% Kirchensteuer — KESt reduces to 25/4.08 = 24.5098...%', () => {
  const r = calcKESt(10000, 8);
  assert.equal(round(r.kest / 10000, 6), round(1 / 4.08, 6));
});

test('calcKESt: total tax burden strictly increases with Kirchensteuer rate for a fixed base', () => {
  const at0 = calcKESt(10000, 0);
  const at8 = calcKESt(10000, 8);
  const at9 = calcKESt(10000, 9);
  assert.ok(at0.total < at8.total);
  assert.ok(at8.total < at9.total);
});

test('calcKESt: zero or negative taxable amount produces zero tax (no negative tax)', () => {
  assert.deepEqual(calcKESt(0, 9), { kest: 0, soli: 0, kirchensteuer: 0, total: 0 });
  assert.deepEqual(calcKESt(-500, 9), { kest: 0, soli: 0, kirchensteuer: 0, total: 0 });
});

// ─── calcVorabpauschale: § 18 InvStG ───────────────────────────────────────────

test('calcVorabpauschale: flat value (no appreciation) yields zero Vorabpauschale every year', () => {
  const { total, perYear } = calcVorabpauschale(10000, 3, 10000, BASISZINS_2026, false);
  assert.equal(total, 0);
  assert.deepEqual(perYear, [0, 0, 0]);
});

test('calcVorabpauschale: negative appreciation (loss) yields zero Vorabpauschale', () => {
  const { total } = calcVorabpauschale(10000, 1, 9000, BASISZINS_2026, false);
  assert.equal(total, 0);
});

test('calcVorabpauschale: appreciation above Basisertrag is capped at Basisertrag (not the full gain)', () => {
  // Basisertrag for year 1 = 10000 × 3.2% × 0.7 = 224. Actual increase far exceeds that.
  const { total, perYear } = calcVorabpauschale(10000, 1, 15000, BASISZINS_2026, false);
  assert.equal(perYear[0], 224);
  assert.equal(total, 224);
});

test('calcVorabpauschale: appreciation below Basisertrag caps at the actual (smaller) increase', () => {
  // Basisertrag would be 224, but the fund only grew by 100 this year.
  const { total, perYear } = calcVorabpauschale(10000, 1, 10100, BASISZINS_2026, false);
  assert.equal(perYear[0], 100);
  assert.equal(total, 100);
});

test('calcVorabpauschale: Teilfreistellung reduces the taxable Vorabpauschale by 30%', () => {
  const without = calcVorabpauschale(10000, 1, 15000, BASISZINS_2026, false);
  const withTFS = calcVorabpauschale(10000, 1, 15000, BASISZINS_2026, true);
  assert.equal(round(withTFS.total, 6), round(without.total * 0.7, 6));
});

test('calcVorabpauschale: multi-year compounds the Basisertrag on the growing (not flat) value', () => {
  // 10 % smooth annual growth over 2 years, well above Basisertrag each year (uncapped).
  const { perYear } = calcVorabpauschale(10000, 2, 12100, BASISZINS_2026, false);
  const year1Basisertrag = 10000 * BASISZINS_2026 * 0.7;
  const year2Basisertrag = 11000 * BASISZINS_2026 * 0.7; // value after year 1 = 10000 * 1.1
  assert.equal(round(perYear[0], 4), round(year1Basisertrag, 4));
  assert.equal(round(perYear[1], 4), round(year2Basisertrag, 4));
});

test('calcVorabpauschale: zero or negative initial investment yields zero for every year', () => {
  assert.deepEqual(calcVorabpauschale(0, 3, 5000, BASISZINS_2026, false), { total: 0, perYear: [0, 0, 0] });
});

// ─── calcTax: end-to-end integration ──────────────────────────────────────────

test('calcTax: no fund, no Kirchensteuer — plain Abgeltungsteuer at 26.375% above Freibetrag', () => {
  const r = calcTax(10000, [{ year: 1, amount: 15000 }], false, false, 0, 1000, false, 0);
  assert.equal(r.grossGain, 5000);
  assert.equal(r.taxableGain, 4000); // 5000 - 1000 Freibetrag
  assert.equal(round(r.taxAmount, 6), round(4000 * TAX_RATE, 6));
  assert.equal(r.netGain, round(5000 - r.taxAmount, 6));
  assert.equal(r.kirchensteuerAmount, 0);
});

test('calcTax: Teilfreistellung reduces the taxable gain by 30% before the Freibetrag is applied', () => {
  const r = calcTax(10000, [{ year: 1, amount: 15000 }], true, false, 0, 1000, true, 0);
  assert.equal(r.teilfreistellungReduction, 1500); // 30% of 5000
  assert.equal(r.taxableGain, 5000 * 0.7 - 1000);
});

test('calcTax: zero or negative gain produces zero tax and zero effective rate', () => {
  const zero = calcTax(10000, [{ year: 1, amount: 10000 }], false, false, 0, 1000, false, 9);
  assert.equal(zero.taxAmount, 0);
  assert.equal(zero.effectiveTaxRate, 0);

  const loss = calcTax(10000, [{ year: 1, amount: 8000 }], false, false, 0, 1000, false, 9);
  assert.equal(loss.grossGain, -2000);
  assert.equal(loss.taxAmount, 0);
  assert.equal(loss.netGain, -2000);
});

test('calcTax: accumulating fund produces a Vorabpauschale; non-accumulating does not', () => {
  const accumulating = calcTax(10000, [{ year: 3, amount: 13000 }], true, true, 0.2, 1000, false, 0);
  const distributing  = calcTax(10000, [{ year: 3, amount: 13000 }], true, false, 0.2, 1000, false, 0);
  assert.ok(accumulating.vorabpauschale !== undefined && accumulating.vorabpauschale > 0);
  assert.equal(distributing.vorabpauschale, undefined);
});

test('calcTax: Kirchensteuer on the sale gain uses the reduced-KESt formula, not a flat surcharge', () => {
  const r = calcTax(10000, [{ year: 1, amount: 15000 }], false, false, 0, 0, false, 9);
  const expected = calcKESt(5000, 9);
  assert.equal(round(r.taxAmount, 6), round(expected.kest + expected.soli, 6));
  assert.equal(round(r.kirchensteuerAmount, 6), round(expected.kirchensteuer, 6));
  // A naive flat surcharge (taxAmount × 9%) would be strictly larger than the correct KiSt —
  // confirm the fix actually changed behavior, not just re-labeled the same number.
  const naiveSurcharge = round(4000 * TAX_RATE, 6) * 0.09;
  assert.notEqual(round(r.kirchensteuerAmount, 4), round(naiveSurcharge, 4));
});

test('calcTax: is deterministic — identical inputs always yield identical outputs', () => {
  const args = [10000, [{ year: 1, amount: 11000 }, { year: 2, amount: 500 }], true, true, 0.2, 1000, true, 9];
  assert.deepEqual(calcTax(...args), calcTax(...args));
});

test('calcTax: no NaN/Infinity leaks for a zero-duration (single-year) or zero-initial edge case', () => {
  const r1 = calcTax(0, [{ year: 1, amount: 0 }], true, true, 0, 1000, false, 9);
  for (const v of Object.values(r1)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v));
  }
});

function round(v, digits) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
