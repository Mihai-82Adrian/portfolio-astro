/**
 * salary-tax.ts — Clean public API for the German Brutto-Netto calculator.
 *
 * Wraps the BMF Programmablaufplan engine (bmf-engine-2026.generated.ts) and
 * adds Sozialabgaben (KV / RV / PV / AV) for both employee (AN) and employer
 * (AG) based on 2026 BBG thresholds published in the PAP MPARA method.
 *
 * All monetary input/output values are in EUROS (floating-point), NOT cents.
 * The PAP engine works in cents internally — conversion is handled here.
 */

import { calculateLohnsteuerPAP } from './bmf-engine-2026.generated';

// ── 2026 Sozialabgaben constants ───────────────────────────────────────────
// Source: PAP Lohnsteuer2026 MPARA + BMAS/GKV-Spitzenverband 2026

/** Beitragsbemessungsgrenze KV + PV (monatlich, €) */
const BBG_KV_PV_MONTHLY = 69_750 / 12;   // ≈ 5 812.50

/** Beitragsbemessungsgrenze RV + AV (monatlich, €) */
const BBG_RV_AV_MONTHLY = 101_400 / 12;  // ≈ 8 450.00

/** Allgemeiner KV-Beitragssatz AN/AG (ohne kassenindividuellen Zusatzbeitrag) */
const KV_BASE_RATE = 0.073;

/** RV-Beitragssatz (je Seite) */
const RV_RATE = 0.093;

/** Basis-PV-Beitragssatz AG-Seite (gilt bundesweit außer Sachsen) */
const PV_BASE_AG = 0.018;

/** Basis-PV-Beitragssatz AN-Seite (Regelfall, ohne Sach­sen, ohne Kinderlos-Zuschlag) */
const PV_BASE_AN = 0.018;

/** PV-Zusatzbeitrag Sachsen AN (AN trägt mehr, AG entsprechend weniger) */
const PV_SACHSEN_ADDITIONAL_AN = 0.005;

/** PV-Kinderlos-Zuschlag AN (§ 55 Abs. 3 SGB XI) */
const PV_KINDERLOS_ZUSCHLAG = 0.006;

/** PV-Abschlag pro Kinderfreibetrag über 1 (§ 55 Abs. 3a SGB XI) */
const PV_CHILD_REBATE = 0.0025;

/** AV-Beitragssatz (je Seite) */
const AV_RATE = 0.013;

// ── Domain types ───────────────────────────────────────────────────────────

export interface SalaryTaxInput {
  /** Monatliches Bruttogehalt in Euro. */
  grossMonthly: number;
  /** Steuerklasse 1–6. */
  taxClass: 1 | 2 | 3 | 4 | 5 | 6;
  /** Kirchenmitglied (true = Kirchensteuer wird berechnet). */
  churchMember: boolean;
  /** Krankenversicherungsart. */
  healthInsurance: 'gkv' | 'pkv';
  /**
   * Kassenindividueller KV-Zusatzbeitragssatz in Prozent (z. B. 2.45 für 2,45 %).
   * Relevant nur bei GKV. Default: 2.45 % (Durchschnittswert 2026).
   */
  kvZusatzbeitragPercent?: number;
  /** true = Beschäftigungsort in Sachsen (abweichender PV-Beitragssatz). */
  inSachsen?: boolean;
  /** true = pflichtversicherter AN ≥25 Jahre ohne Kinder (PV-Kinderlos-Zuschlag). */
  kinderlosZuschlag?: boolean;
  /**
   * Anzahl der berücksichtigten Kinder über das erste Kind hinaus
   * für den PV-Abschlag (0–4, § 55 Abs. 3a SGB XI).
   * 0 = kein Abschlag / nur ein Kind.
   */
  pvChildrenRebates?: 0 | 1 | 2 | 3 | 4;
  /** Kinderfreibeträge (PAP: ZKF, eine Dezimalstelle; z. B. 2.0 für zwei Kinder). */
  kinderfreibetraege?: number;
  /** Jährlicher Steuerfreibetrag in Euro (PAP: JFREIB). */
  jahresfreibetragEuro?: number;
  /**
   * Kirchensteuersatz in Dezimalform (z. B. 0.09 für 9 %).
   * Standard-Hebesatz: Bayern/Baden-Württemberg 8 %, übrige Länder 9 %.
   * Default: 0.09.
   */
  kirchensteuerSatz?: number;
  /**
   * Monatlicher PKV-Beitrag AN-Anteil in Euro (nur PKV-Versicherte).
   * Fließt in die Vorsorgepauschale ein (PAP: PKPV).
   */
  pkpvMonthlyCents?: number;
  /**
   * AG-Zuschuss zur PKV-Basiskrankenversicherung in Euro/Monat (PAP: PKPVAGZ).
   */
  pkpvAgZuschussCents?: number;
}

export interface BruttoNettoResult {
  // ── Bruttowerte ─────────────────────────────────────────────
  grossMonthly: number;

  // ── Steuern AN ──────────────────────────────────────────────
  lohnsteuer: number;
  solidaritaetszuschlag: number;
  kirchensteuer: number;

  // ── Sozialabgaben AN ────────────────────────────────────────
  kvAN: number;
  rvAN: number;
  pvAN: number;
  avAN: number;

  // ── Sozialabgaben AG ────────────────────────────────────────
  kvAG: number;
  rvAG: number;
  pvAG: number;
  avAG: number;

  // ── Summenwerte ─────────────────────────────────────────────
  /** Alle Abzüge des AN (Steuern + Sozialabgaben). */
  totalEmployeeDeductions: number;
  /** Netto-Auszahlbetrag. */
  netMonthly: number;
  /** Gesamtkosten AG (Brutto + AG-Sozialabgaben). */
  employerTotalCost: number;

  // ── Kennzahlen ───────────────────────────────────────────────
  /**
   * Steuerbelastungsquote AN (Steuern ÷ Brutto).
   * Zeigt rein die Steuerquote ohne Sozialabgaben.
   */
  effectiveTaxRatePercent: number;
  /**
   * Tax Wedge: (Steuern_AN + Sozialabg_AN + Sozialabg_AG) ÷ Arbeitgeberkosten × 100.
   * OECD-Definition — misst den Abstand zwischen Arbeitskosten und Nettolohn.
   */
  taxWedgePercent: number;
}

// ── Main calculation ───────────────────────────────────────────────────────

export function calculateBruttoNetto(input: SalaryTaxInput): BruttoNettoResult {
  const {
    grossMonthly,
    taxClass,
    churchMember,
    healthInsurance,
    kvZusatzbeitragPercent = 2.45,
    inSachsen = false,
    kinderlosZuschlag = false,
    pvChildrenRebates = 0,
    kinderfreibetraege = 0,
    jahresfreibetragEuro = 0,
    kirchensteuerSatz = 0.09,
    pkpvMonthlyCents = 0,
    pkpvAgZuschussCents = 0,
  } = input;

  const grossMonthlyCents = Math.round(grossMonthly * 100);

  // ── Step 1: PAP inputs ──────────────────────────────────────────────────
  const papResult = calculateLohnsteuerPAP({
    RE4: grossMonthlyCents,
    LZZ: 2,                                       // Monat
    STKL: taxClass,
    R: churchMember ? 1 : 0,
    KVZ: kvZusatzbeitragPercent,
    PKV: healthInsurance === 'pkv' ? 1 : 0,
    PVS: inSachsen ? 1 : 0,
    PVZ: kinderlosZuschlag ? 1 : 0,
    PVA: pvChildrenRebates,
    ZKF: kinderfreibetraege,
    JFREIB: Math.round(jahresfreibetragEuro * 100),
    PKPV: pkpvMonthlyCents,
    PKPVAGZ: pkpvAgZuschussCents,
  });

  // PAP outputs are in cents — convert to euros
  const lohnsteuer           = papResult.LSTLZZ / 100;
  const solidaritaetszuschlag = papResult.SOLZLZZ / 100;

  // Kirchensteuer: PAP gives Bemessungsgrundlage (BK) in cents
  const kirchensteuer = churchMember
    ? Math.round(papResult.BK * kirchensteuerSatz) / 100
    : 0;

  // ── Step 2: Sozialabgaben ───────────────────────────────────────────────

  // Berechnungsgrundlage: monatliches Bruttogehalt, gekürzt auf BBG
  const baseKvPv = Math.min(grossMonthly, BBG_KV_PV_MONTHLY);
  const baseRvAv = Math.min(grossMonthly, BBG_RV_AV_MONTHLY);

  // KV
  const kvHalfRate   = KV_BASE_RATE + kvZusatzbeitragPercent / 2 / 100;
  const kvAN = healthInsurance === 'gkv' ? round2(baseKvPv * kvHalfRate) : 0;
  const kvAG = healthInsurance === 'gkv' ? round2(baseKvPv * kvHalfRate) : 0;

  // RV
  const rvAN = round2(baseRvAv * RV_RATE);
  const rvAG = round2(baseRvAv * RV_RATE);

  // PV (Pflegeversicherung — komplex wegen Sachsen + Kinderlos + Kinderrabatt)
  // AN-Satz:
  let pvRateAN = PV_BASE_AN;
  if (kinderlosZuschlag) pvRateAN += PV_KINDERLOS_ZUSCHLAG;
  if (pvChildrenRebates > 0) pvRateAN -= pvChildrenRebates * PV_CHILD_REBATE;
  if (inSachsen) pvRateAN += PV_SACHSEN_ADDITIONAL_AN;
  pvRateAN = Math.max(0, pvRateAN);

  // AG-Satz: in Sachsen trägt AG weniger (0,5 % wird auf AN verlagert)
  const pvRateAG = inSachsen ? PV_BASE_AG - PV_SACHSEN_ADDITIONAL_AN : PV_BASE_AG;

  const pvAN = healthInsurance === 'gkv' ? round2(baseKvPv * pvRateAN) : 0;
  const pvAG = healthInsurance === 'gkv' ? round2(baseKvPv * Math.max(0, pvRateAG)) : 0;

  // AV
  const avAN = round2(baseRvAv * AV_RATE);
  const avAG = round2(baseRvAv * AV_RATE);

  // ── Step 3: Summen ──────────────────────────────────────────────────────
  const totalEmployeeDeductions = round2(
    lohnsteuer + solidaritaetszuschlag + kirchensteuer +
    kvAN + rvAN + pvAN + avAN
  );
  const netMonthly       = round2(grossMonthly - totalEmployeeDeductions);
  const employerTotalCost = round2(grossMonthly + kvAG + rvAG + pvAG + avAG);

  // ── Step 4: Kennzahlen ──────────────────────────────────────────────────
  const totalTaxes = lohnsteuer + solidaritaetszuschlag + kirchensteuer;
  const effectiveTaxRatePercent = grossMonthly > 0
    ? round2((totalTaxes / grossMonthly) * 100)
    : 0;

  const totalWedge = totalTaxes + (kvAN + rvAN + pvAN + avAN) + (kvAG + rvAG + pvAG + avAG);
  const taxWedgePercent = employerTotalCost > 0
    ? round2((totalWedge / employerTotalCost) * 100)
    : 0;

  return {
    grossMonthly,
    lohnsteuer,
    solidaritaetszuschlag,
    kirchensteuer,
    kvAN, rvAN, pvAN, avAN,
    kvAG, rvAG, pvAG, avAG,
    totalEmployeeDeductions,
    netMonthly,
    employerTotalCost,
    effectiveTaxRatePercent,
    taxWedgePercent,
  };
}

// ── Helper ─────────────────────────────────────────────────────────────────

/** Round to 2 decimal places (standard monetary rounding). */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
