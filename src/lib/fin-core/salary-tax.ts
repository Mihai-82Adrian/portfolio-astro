/**
 * salary-tax.ts — Clean public API for the German Brutto-Netto calculator.
 *
 * Wraps the BMF Programmablaufplan engine (bmf-engine-2026.generated.ts) and
 * adds Sozialabgaben (KV / RV / PV / AV) for both employee (AN) and employer
 * (AG) based on 2026 BBG thresholds from BMAS Sozialversicherungsrechengrößen
 * 2026 and §55 / §58 SGB XI (confirmed via GKV-Spitzenverband, lohn-info.de).
 *
 * All monetary input/output values are in EUROS (floating-point), NOT cents.
 * The PAP engine works in cents internally — conversion is handled here.
 */

import { calculateLohnsteuerPAP } from './bmf-engine-2026.generated';

// ── 2026 Sozialabgaben constants ───────────────────────────────────────────
// Sources:
//   BMAS Sozialversicherungsrechengrößen-Verordnung 2026
//   §55 SGB XI (PV Grundbeitrag + Kinderlosenzuschlag)
//   §58 SGB XI (Sachsen Sonderregelung)
//   GKV-Spitzenverband, Orientierungswert BMG 2026

/** Beitragsbemessungsgrenze KV + PV (monatlich, €). */
const BBG_KV_PV_MONTHLY = 69_750 / 12;  // = 5 812.50 €

/** Beitragsbemessungsgrenze RV + AV (monatlich, €). Ost/West vereinheitlicht ab 2026. */
const BBG_RV_AV_MONTHLY = 101_400 / 12; // = 8 450.00 €

/**
 * Jahresarbeitsentgeltgrenze — ab diesem Jahresbruttogehalt kann der AN in die
 * PKV wechseln (§ 6 Abs. 1 Nr. 1 SGB V). Als monatlicher Schwellenwert.
 */
const VERSICHERUNGSPFLICHTGRENZE_MONTHLY = 77_400 / 12; // = 6 450.00 €

/** Allgemeiner KV-Beitragssatz AN/AG (allgemeiner Beitragssatz, § 241 SGB V). */
const KV_BASE_RATE = 0.073;

/** RV-Beitragssatz je Seite (§ 158 SGB VI). */
const RV_RATE = 0.093;

/** Basis-PV-Beitragssatz AG-Seite (§ 55 SGB XI, Regelfall außer Sachsen). */
const PV_BASE_AG = 0.018;

/** Basis-PV-Beitragssatz AN-Seite (§ 55 SGB XI, Regelfall ohne Sachsen + ohne Kinderlosenzuschlag). */
const PV_BASE_AN = 0.018;

/**
 * PV-Sonderregelung Sachsen AN (§ 58 SGB XI):
 * AN trägt 0,5 % mehr, AG entsprechend weniger. Grund: Sachsen hat den
 * Buß- und Bettag 1995 nicht abgeschafft.
 * Bestätigt: GKV-Spitzenverband 2025-03-31, lohn-info.de/pflegeversicherung_sachsen.html
 */
const PV_SACHSEN_SHIFT = 0.005;

/** PV-Kinderlos-Zuschlag AN (§ 55 Abs. 3 SGB XI). Gilt ab 23 Jahren ohne Kinder. */
const PV_KINDERLOS_ZUSCHLAG = 0.006;

/**
 * PV-Abschlag pro Kind über das erste hinaus (§ 55 Abs. 3a SGB XI).
 * Gilt ab dem 2. Kind, max. 4 Kinder berücksichtigbar (= 1,0 % max. Abschlag).
 */
const PV_CHILD_REBATE = 0.0025;

/** AV-Beitragssatz je Seite (§ 341 SGB III). */
const AV_RATE = 0.013;

// ── GKV-Kassenanbieter 2026 ────────────────────────────────────────────────

/**
 * Bekannte GKV-Anbieter-IDs.
 * "orientierungswert" = offizieller Durchschnittswert des BMG für 2026.
 */
export type KvProviderId =
  | 'orientierungswert'
  | 'tk'
  | 'barmer'
  | 'dak'
  | 'aok_nordost';

export interface KvProvider {
  id: KvProviderId;
  /** Anzeigename für die UI. */
  name: string;
  /** Kassenindividueller Zusatzbeitragssatz 2026 in Prozent. */
  zusatzbeitragPercent: number;
  /** Gesamter KV-Beitragssatz 2026 (allgemeiner Beitragssatz + Zusatzbeitrag). */
  gesamtbeitragPercent: number;
  /** Bundesweit verfügbar? */
  nationwide: boolean;
}

/**
 * Offizielle GKV-Zusatzbeitragssätze 2026.
 * Quellen: Kassenindividuelle Bekanntmachungen Dezember 2025,
 * BMG Orientierungswert Januar 2026.
 */
export const GKV_PROVIDERS: KvProvider[] = [
  {
    id: 'orientierungswert',
    name: 'Durchschnitt (Orientierungswert BMG)',
    zusatzbeitragPercent: 2.9,
    gesamtbeitragPercent: 17.5,
    nationwide: true,
  },
  {
    id: 'tk',
    name: 'Techniker Krankenkasse (TK)',
    zusatzbeitragPercent: 2.69,
    gesamtbeitragPercent: 17.29,
    nationwide: true,
  },
  {
    id: 'dak',
    name: 'DAK-Gesundheit',
    zusatzbeitragPercent: 3.2,
    gesamtbeitragPercent: 17.8,
    nationwide: true,
  },
  {
    id: 'barmer',
    name: 'Barmer',
    zusatzbeitragPercent: 3.29,
    gesamtbeitragPercent: 17.89,
    nationwide: true,
  },
  {
    id: 'aok_nordost',
    name: 'AOK Nordost',
    zusatzbeitragPercent: 3.5,
    gesamtbeitragPercent: 18.1,
    nationwide: false,
  },
];

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
   * GKV-Kassenanbieter (nur bei healthInsurance='gkv').
   * Wenn angegeben, setzt kvZusatzbeitragPercent automatisch auf den
   * kassenspezifischen Wert. Hat Vorrang vor kvZusatzbeitragPercent.
   */
  kvProvider?: KvProviderId;
  /**
   * Kassenindividueller KV-Zusatzbeitragssatz in Prozent (z. B. 2.9 für 2,9 %).
   * Wird ignoriert, wenn kvProvider gesetzt ist.
   * Default: 2.9 % (Orientierungswert BMG 2026).
   */
  kvZusatzbeitragPercent?: number;
  /** true = Beschäftigungsort in Sachsen (§ 58 SGB XI Sonderregelung). */
  inSachsen?: boolean;
  /** true = pflichtversicherter AN ≥ 23 Jahre ohne Kinder (§ 55 Abs. 3 SGB XI). */
  kinderlosZuschlag?: boolean;
  /**
   * Anzahl der über das erste Kind hinaus berücksichtigten Kinder (0–4).
   * Jedes Kind reduziert den AN-PV-Satz um 0,25 % (§ 55 Abs. 3a SGB XI).
   */
  pvChildrenRebates?: 0 | 1 | 2 | 3 | 4;
  /** Kinderfreibeträge (PAP: ZKF, eine Dezimalstelle; z. B. 2.0 für zwei Kinder). */
  kinderfreibetraege?: number;
  /** Jährlicher Steuerfreibetrag in Euro (PAP: JFREIB). */
  jahresfreibetragEuro?: number;
  /**
   * Kirchensteuersatz in Dezimalform (z. B. 0.09 für 9 %).
   * BY/BW: 8 %, übrige Bundesländer: 9 %. Default: 0.09.
   */
  kirchensteuerSatz?: number;
  /**
   * Monatlicher PKV-Beitrag AN-Anteil in Euro (nur PKV-Versicherte).
   * Fließt in die Vorsorgepauschale ein (PAP: PKPV).
   */
  pkpvMonthlyEuro?: number;
  /**
   * AG-Zuschuss zur privaten Basiskrankenversicherung in Euro/Monat (PAP: PKPVAGZ).
   */
  pkpvAgZuschussEuro?: number;
}

export interface BruttoNettoResult {
  // ── Bruttowerte ──────────────────────────────────────────────────────────
  grossMonthly: number;

  // ── Steuern AN ───────────────────────────────────────────────────────────
  lohnsteuer: number;
  solidaritaetszuschlag: number;
  kirchensteuer: number;

  // ── Sozialabgaben AN ─────────────────────────────────────────────────────
  kvAN: number;
  rvAN: number;
  pvAN: number;
  avAN: number;

  // ── Sozialabgaben AG ─────────────────────────────────────────────────────
  kvAG: number;
  rvAG: number;
  pvAG: number;
  avAG: number;

  // ── Summenwerte ──────────────────────────────────────────────────────────
  /** Alle Abzüge des AN (Steuern + Sozialabgaben AN). */
  totalEmployeeDeductions: number;
  /** Netto-Auszahlbetrag (Brutto − Abzüge AN). */
  netMonthly: number;
  /** Gesamtarbeitskosten AG (Brutto + Sozialabgaben AG). */
  employerTotalCost: number;

  // ── Kennzahlen ───────────────────────────────────────────────────────────
  /**
   * Effektive Steuerquote AN: (LSt + SolZ + KiSt) ÷ Brutto × 100.
   * Nur Steuern, keine Sozialabgaben.
   */
  effectiveTaxRatePercent: number;
  /**
   * Tax Wedge (OECD): (Steuern_AN + Sozialabg_AN + Sozialabg_AG) ÷ AG-Kosten × 100.
   * Misst den Keil zwischen Arbeitskosten und Nettolohn.
   */
  taxWedgePercent: number;

  // ── Versicherungspflichtgrenze ────────────────────────────────────────────
  /**
   * true, wenn das monatliche Bruttogehalt die Jahresarbeitsentgeltgrenze
   * (6 450 €/Monat = 77 400 €/Jahr, § 6 SGB V) überschreitet.
   * In diesem Fall kann der AN in die PKV wechseln.
   */
  exceedsVersicherungspflichtgrenze: boolean;
  /** Monatlicher Schwellenwert (6 450 €) — für die UI-Anzeige. */
  versicherungspflichtgrenzeMonthly: number;

  // ── Verwendeter KV-Zusatzbeitragssatz ────────────────────────────────────
  /** Der effektiv verwendete KV-Zusatzbeitragssatz in Prozent. */
  effectiveKvZusatzbeitragPercent: number;
}

// ── Main calculation ───────────────────────────────────────────────────────

export function calculateBruttoNetto(input: SalaryTaxInput): BruttoNettoResult {
  const {
    grossMonthly,
    taxClass,
    churchMember,
    healthInsurance,
    kvProvider,
    inSachsen = false,
    kinderlosZuschlag = false,
    pvChildrenRebates = 0,
    kinderfreibetraege = 0,
    jahresfreibetragEuro = 0,
    kirchensteuerSatz = 0.09,
    pkpvMonthlyEuro = 0,
    pkpvAgZuschussEuro = 0,
  } = input;

  // Resolve KV Zusatzbeitragssatz: kvProvider hat Vorrang
  const effectiveKvZusatzbeitragPercent = resolveKvZusatzbeitrag(
    kvProvider,
    input.kvZusatzbeitragPercent,
  );

  const grossMonthlyCents = Math.round(grossMonthly * 100);

  // ── Step 1: PAP — Lohnsteuer / SolZ / Kirchensteuer-BMG ─────────────────
  const papResult = calculateLohnsteuerPAP({
    RE4: grossMonthlyCents,
    LZZ: 2,
    STKL: taxClass,
    R: churchMember ? 1 : 0,
    KVZ: effectiveKvZusatzbeitragPercent,
    PKV: healthInsurance === 'pkv' ? 1 : 0,
    PVS: inSachsen ? 1 : 0,
    PVZ: kinderlosZuschlag ? 1 : 0,
    PVA: pvChildrenRebates,
    ZKF: kinderfreibetraege,
    JFREIB: Math.round(jahresfreibetragEuro * 100),
    PKPV: Math.round(pkpvMonthlyEuro * 100),
    PKPVAGZ: Math.round(pkpvAgZuschussEuro * 100),
  });

  const lohnsteuer            = papResult.LSTLZZ / 100;
  const solidaritaetszuschlag = papResult.SOLZLZZ / 100;
  // Kirchensteuer: BK ist die Bemessungsgrundlage in Cents
  const kirchensteuer = churchMember
    ? Math.round(papResult.BK * kirchensteuerSatz) / 100
    : 0;

  // ── Step 2: Sozialabgaben ────────────────────────────────────────────────
  // Beitragsbemessungsgrundlage: auf BBG begrenzt
  const baseKvPv = Math.min(grossMonthly, BBG_KV_PV_MONTHLY);
  const baseRvAv = Math.min(grossMonthly, BBG_RV_AV_MONTHLY);

  // KV (nur GKV; PKV hat keine gesetzlichen Beitragssätze)
  const kvHalfRate = KV_BASE_RATE + effectiveKvZusatzbeitragPercent / 2 / 100;
  const kvAN = healthInsurance === 'gkv' ? round2(baseKvPv * kvHalfRate) : 0;
  const kvAG = healthInsurance === 'gkv' ? round2(baseKvPv * kvHalfRate) : 0;

  // RV
  const rvAN = round2(baseRvAv * RV_RATE);
  const rvAG = round2(baseRvAv * RV_RATE);

  // PV — §55 SGB XI + §58 SGB XI (Sachsen)
  // AN-Satz: Basis + ggf. Kinderlosenzuschlag − Kinderrabatte + ggf. Sachsen-Shift
  let pvRateAN = PV_BASE_AN;
  if (kinderlosZuschlag) pvRateAN += PV_KINDERLOS_ZUSCHLAG;
  if (pvChildrenRebates > 0) pvRateAN -= pvChildrenRebates * PV_CHILD_REBATE;
  if (inSachsen) pvRateAN += PV_SACHSEN_SHIFT;
  pvRateAN = Math.max(0, pvRateAN);

  // AG-Satz: in Sachsen trägt AG 0,5 % weniger als anderswo
  const pvRateAG = inSachsen
    ? Math.max(0, PV_BASE_AG - PV_SACHSEN_SHIFT)
    : PV_BASE_AG;

  const pvAN = healthInsurance === 'gkv' ? round2(baseKvPv * pvRateAN) : 0;
  const pvAG = healthInsurance === 'gkv' ? round2(baseKvPv * pvRateAG) : 0;

  // AV
  const avAN = round2(baseRvAv * AV_RATE);
  const avAG = round2(baseRvAv * AV_RATE);

  // ── Step 3: Summen ───────────────────────────────────────────────────────
  const totalEmployeeDeductions = round2(
    lohnsteuer + solidaritaetszuschlag + kirchensteuer +
    kvAN + rvAN + pvAN + avAN,
  );
  const netMonthly        = round2(grossMonthly - totalEmployeeDeductions);
  const employerTotalCost = round2(grossMonthly + kvAG + rvAG + pvAG + avAG);

  // ── Step 4: Kennzahlen ───────────────────────────────────────────────────
  const totalTaxes = lohnsteuer + solidaritaetszuschlag + kirchensteuer;
  const effectiveTaxRatePercent = grossMonthly > 0
    ? round2((totalTaxes / grossMonthly) * 100)
    : 0;

  const totalWedge =
    totalTaxes + (kvAN + rvAN + pvAN + avAN) + (kvAG + rvAG + pvAG + avAG);
  const taxWedgePercent = employerTotalCost > 0
    ? round2((totalWedge / employerTotalCost) * 100)
    : 0;

  // ── Step 5: Versicherungspflichtgrenze ───────────────────────────────────
  const exceedsVersicherungspflichtgrenze =
    grossMonthly > VERSICHERUNGSPFLICHTGRENZE_MONTHLY;

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
    exceedsVersicherungspflichtgrenze,
    versicherungspflichtgrenzeMonthly: VERSICHERUNGSPFLICHTGRENZE_MONTHLY,
    effectiveKvZusatzbeitragPercent,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Löst den effektiven KV-Zusatzbeitragssatz auf.
 * Priorität: kvProvider > kvZusatzbeitragPercent > Orientierungswert 2026 (2,9 %).
 */
function resolveKvZusatzbeitrag(
  providerId: KvProviderId | undefined,
  manualPercent: number | undefined,
): number {
  if (providerId) {
    const provider = GKV_PROVIDERS.find(p => p.id === providerId);
    if (provider) return provider.zusatzbeitragPercent;
  }
  return manualPercent ?? 2.9; // Orientierungswert BMG 2026
}

/** Rundet auf 2 Nachkommastellen (kaufmännische Rundung). */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
