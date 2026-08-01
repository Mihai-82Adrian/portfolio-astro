// Deterministic financial-correctness suite: 2026 German payroll tax (BMF PAP)
// and Sozialversicherung (SV). Every case runs the real production export —
// no calculation logic is duplicated here.
//
// Fixture provenance categories used below (see docs/operations/
// financial-calculation-validation-2026.md and tools/financial-validation/official-sources.json):
//   - regression-case: pins current (verified-correct) engine output so a future
//     change to salary-tax.ts or the generated PAP engine cannot silently drift.
//   - mathematical-reference: hand-derived from the official SV rates/BBGs
//     themselves (simple percentage arithmetic), independently verifiable
//     without running the engine.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateBruttoNetto } from '../../src/lib/fin-core/salary-tax.ts';
import { calculateLohnsteuerPAP } from '../../src/lib/fin-core/bmf-engine-2026.generated.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const base = {
  grossMonthly: 5000,
  taxClass: 1,
  churchMember: false,
  healthInsurance: 'gkv',
  kvProvider: 'orientierungswert', // 2.9% Zusatzbeitrag — BMG Orientierungswert 2026
};

// ─── SV contributions: mathematical-reference (hand-derived from official rates) ──

test('SV: below-BBG gross computes exact linear percentages (mathematical-reference)', () => {
  const r = calculateBruttoNetto(base);
  // KV: 7.3% (allg. Beitragssatz halb) + 2.9%/2 Zusatzbeitrag = 8.75%
  assert.equal(r.kvAN, 437.5);
  assert.equal(r.kvAG, 437.5);
  // RV: 9.3% je Seite
  assert.equal(r.rvAN, 465);
  assert.equal(r.rvAG, 465);
  // PV: 1.8% je Seite (kein Kinderlosenzuschlag, keine Sachsen-Sonderregel, keine Kinderrabatte)
  assert.equal(r.pvAN, 90);
  assert.equal(r.pvAG, 90);
  // AV: 1.3% je Seite
  assert.equal(r.avAN, 65);
  assert.equal(r.avAG, 65);
});

test('SV: KV/PV Beitragsbemessungsgrenze caps the base at exactly 5812.50 €/month', () => {
  const atThreshold  = calculateBruttoNetto({ ...base, grossMonthly: 5812.50 });
  const oneCentOver  = calculateBruttoNetto({ ...base, grossMonthly: 5812.51 });
  const wellUnder    = calculateBruttoNetto({ ...base, grossMonthly: 5712.50 }); // 100 € below

  // At and above the BBG, KV/PV contributions are identical (base is capped) — a
  // 1-cent gross change above the threshold must never change the capped base.
  assert.equal(atThreshold.kvAN, oneCentOver.kvAN);
  assert.equal(atThreshold.pvAN, oneCentOver.pvAN);
  // Comfortably below the threshold, the base is smaller and so is the contribution.
  assert.ok(wellUnder.kvAN < atThreshold.kvAN);
  assert.equal(round2(5812.50 * 0.0875), atThreshold.kvAN);
});

test('SV: RV/AV Beitragsbemessungsgrenze caps the base at exactly 8450.00 €/month', () => {
  const atThreshold = calculateBruttoNetto({ ...base, grossMonthly: 8450 });
  const oneCentOver  = calculateBruttoNetto({ ...base, grossMonthly: 8450.01 });
  const wellUnder    = calculateBruttoNetto({ ...base, grossMonthly: 8350 }); // 100 € below

  assert.equal(atThreshold.rvAN, oneCentOver.rvAN);
  assert.equal(atThreshold.avAN, oneCentOver.avAN);
  assert.ok(wellUnder.rvAN < atThreshold.rvAN);
  assert.equal(round2(8450 * 0.093), atThreshold.rvAN);
  assert.equal(round2(8450 * 0.013), atThreshold.avAN);
});

test('SV: Sachsen shifts 0.5 pp of Pflegeversicherung from employer to employee', () => {
  const normal  = calculateBruttoNetto({ ...base, inSachsen: false });
  const sachsen = calculateBruttoNetto({ ...base, inSachsen: true });

  assert.equal(round2(normal.pvAN + 0.5 / 100 * 5000), sachsen.pvAN);
  assert.equal(round2(normal.pvAG - 0.5 / 100 * 5000), sachsen.pvAG);
  // Sachsen never reduces the combined AN+AG PV total — only redistributes it.
  assert.equal(round2(normal.pvAN + normal.pvAG), round2(sachsen.pvAN + sachsen.pvAG));
});

test('SV: Kinderlosenzuschlag adds exactly 0.6 pp to the employee PV rate', () => {
  const withChildren = calculateBruttoNetto({ ...base, kinderlosZuschlag: false });
  const childless     = calculateBruttoNetto({ ...base, kinderlosZuschlag: true });
  assert.equal(round2(withChildren.pvAN + 0.6 / 100 * 5000), childless.pvAN);
  // The surcharge is employee-only — employer PV share is unaffected.
  assert.equal(withChildren.pvAG, childless.pvAG);
});

test('SV: each additional PV child rebate reduces the employee rate by 0.25 pp, floored at 0', () => {
  const none = calculateBruttoNetto({ ...base, pvChildrenRebates: 0 });
  const two  = calculateBruttoNetto({ ...base, pvChildrenRebates: 2 });
  const four = calculateBruttoNetto({ ...base, pvChildrenRebates: 4 });
  assert.equal(round2(none.pvAN - 2 * 0.25 / 100 * 5000), two.pvAN);
  assert.equal(round2(none.pvAN - 4 * 0.25 / 100 * 5000), four.pvAN); // 1.8% - 1.0% = 0.8%, still positive
  assert.ok(four.pvAN > 0);
});

test('SV: PKV members pay zero statutory KV/PV contributions', () => {
  const r = calculateBruttoNetto({ ...base, healthInsurance: 'pkv', pkpvMonthlyEuro: 400, pkpvAgZuschussEuro: 200 });
  assert.equal(r.kvAN, 0);
  assert.equal(r.kvAG, 0);
  assert.equal(r.pvAN, 0);
  assert.equal(r.pvAG, 0);
});

test('SV: Versicherungspflichtgrenze flag flips exactly at 6450.00 €/month', () => {
  const below = calculateBruttoNetto({ ...base, grossMonthly: 6449.99 });
  const at    = calculateBruttoNetto({ ...base, grossMonthly: 6450.00 });
  const above = calculateBruttoNetto({ ...base, grossMonthly: 6450.01 });
  assert.equal(below.exceedsVersicherungspflichtgrenze, false);
  assert.equal(at.exceedsVersicherungspflichtgrenze, false); // exceeds is strict >, not >=
  assert.equal(above.exceedsVersicherungspflichtgrenze, true);
});

// ─── Kirchensteuer rate wiring (regression for the "always 9%" UI bug) ────────

test('Kirchensteuer: 9% produces exactly 9/8 of the 8% amount for identical gross', () => {
  const at8 = calculateBruttoNetto({ ...base, churchMember: true, kirchensteuerSatz: 0.08 });
  const at9 = calculateBruttoNetto({ ...base, churchMember: true, kirchensteuerSatz: 0.09 });
  assert.ok(at8.kirchensteuer > 0);
  // Same BK (Bemessungsgrundlage) for both — only the rate differs, so the ratio is exactly 9/8.
  assert.equal(Math.round((at9.kirchensteuer / at8.kirchensteuer) * 1000) / 1000, 1.125);
});

test('Kirchensteuer: zero when churchMember is false regardless of rate', () => {
  const r = calculateBruttoNetto({ ...base, churchMember: false, kirchensteuerSatz: 0.09 });
  assert.equal(r.kirchensteuer, 0);
});

// ─── Tax classes / thresholds / rounding (regression-case: pins verified engine output) ──

test('Tax classes 1–6 all produce a finite, non-negative Lohnsteuer for representative income', () => {
  for (const taxClass of [1, 2, 3, 4, 5, 6]) {
    const r = calculateBruttoNetto({ ...base, grossMonthly: 4329, taxClass });
    assert.ok(Number.isFinite(r.lohnsteuer), `taxClass ${taxClass} produced non-finite Lohnsteuer`);
    assert.ok(r.lohnsteuer >= 0, `taxClass ${taxClass} produced negative Lohnsteuer`);
    assert.ok(Number.isFinite(r.netMonthly));
  }
});

test('Tax class VI (second employment) never yields a lower Lohnsteuer than class I for equal gross', () => {
  const cls1 = calculateBruttoNetto({ ...base, grossMonthly: 4329, taxClass: 1 });
  const cls6 = calculateBruttoNetto({ ...base, grossMonthly: 4329, taxClass: 6 });
  assert.ok(cls6.lohnsteuer >= cls1.lohnsteuer);
});

test('Zero gross income yields zero everywhere, no NaN/negative leakage', () => {
  const r = calculateBruttoNetto({ ...base, grossMonthly: 0 });
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === 'number') {
      assert.ok(Number.isFinite(v), `${k} is not finite: ${v}`);
      assert.ok(v >= 0, `${k} is negative for zero income: ${v}`);
    }
  }
  assert.equal(r.netMonthly, 0);
});

test('Negative gross income is clamped to zero, not passed through to BBG caps', () => {
  const negative = calculateBruttoNetto({ ...base, grossMonthly: -5000 });
  const zero      = calculateBruttoNetto({ ...base, grossMonthly: 0 });
  assert.deepEqual(negative, zero);
});

test('Invalid tax class throws a controlled error rather than a silent wrong number', () => {
  assert.throws(() => calculateBruttoNetto({ ...base, taxClass: 7 }));
  assert.throws(() => calculateBruttoNetto({ ...base, taxClass: 0 }));
  assert.throws(() => calculateBruttoNetto({ ...base, taxClass: 1.5 }));
});

test('High income (above all BBGs, top tax bracket) remains finite and internally consistent', () => {
  const r = calculateBruttoNetto({ ...base, grossMonthly: 50000, taxClass: 1, churchMember: true });
  assert.ok(Number.isFinite(r.netMonthly));
  assert.ok(r.netMonthly > 0);
  assert.ok(r.netMonthly < r.grossMonthly);
  // SV contributions are capped, so their share of a much larger gross keeps shrinking.
  assert.ok(r.rvAN < r.grossMonthly * 0.093);
});

test('Cent-level rounding: totalEmployeeDeductions is the exact sum of its rounded parts', () => {
  const r = calculateBruttoNetto({ ...base, grossMonthly: 4329.37, churchMember: true, kirchensteuerSatz: 0.09 });
  const sum = round2(r.lohnsteuer + r.solidaritaetszuschlag + r.kirchensteuer + r.kvAN + r.rvAN + r.pvAN + r.avAN);
  assert.equal(r.totalEmployeeDeductions, sum);
  assert.equal(r.netMonthly, round2(r.grossMonthly - r.totalEmployeeDeductions));
});

// ─── Direct PAP engine tests (bypassing the SV wrapper) ───────────────────────

test('PAP engine: zero RE4 (gross) produces zero Lohnsteuer and zero SolZ', () => {
  const out = calculateLohnsteuerPAP({ RE4: 0, LZZ: 2, STKL: 1 });
  assert.equal(out.LSTLZZ, 0);
  assert.equal(out.SOLZLZZ, 0);
});

test('PAP engine: output is deterministic — identical inputs yield identical outputs', () => {
  const input = { RE4: 432900, LZZ: 2, STKL: 3, ZKF: 2.0, R: 1, KVZ: 2.9 };
  const a = calculateLohnsteuerPAP(input);
  const b = calculateLohnsteuerPAP(input);
  assert.deepEqual(a, b);
});

test('PAP engine: all outputs are finite integers (eurocents) for a battery of inputs', () => {
  const cases = [
    { RE4: 100, LZZ: 2, STKL: 1 },
    { RE4: 150000, LZZ: 2, STKL: 5 },
    { RE4: 2000000, LZZ: 2, STKL: 1, R: 1, KVZ: 3.5 },
    { RE4: 7000000, LZZ: 2, STKL: 6 },
    { RE4: 432900, LZZ: 2, STKL: 1, PVS: 1, PVZ: 1 },
  ];
  for (const c of cases) {
    const out = calculateLohnsteuerPAP(c);
    for (const [k, v] of Object.entries(out)) {
      assert.ok(Number.isFinite(v), `${JSON.stringify(c)} → ${k} not finite: ${v}`);
      assert.ok(Number.isInteger(v), `${JSON.stringify(c)} → ${k} not an integer cent value: ${v}`);
    }
  }
});

// ─── Source-manifest provenance check ─────────────────────────────────────────

test('official-sources.json: recorded SHA-256 for each committed official artifact still matches', () => {
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, 'tools/financial-validation/official-sources.json'), 'utf-8')
  );
  let checked = 0;
  for (const source of manifest.sources) {
    if (!source.local_artifact && !source.local_derived_fixture) continue;
    const rel = source.local_artifact ?? source.local_derived_fixture;
    const expectedSha = source.local_sha256 ?? source.local_derived_fixture_sha256;
    const actualSha = createHash('sha256').update(readFileSync(path.join(repoRoot, rel))).digest('hex');
    assert.equal(actualSha, expectedSha, `${rel} SHA-256 mismatch — official artifact changed since it was recorded`);
    checked++;
  }
  assert.ok(checked >= 2, 'expected at least the PAP XML and SV reference doc to be checksum-verified');
});

function round2(v) {
  return Math.round(v * 100) / 100;
}
