// ============================================================
// HAND-VERIFIED from docs/Lohnsteuer2026.xml (PAP: Lohnsteuer2026 v1.0)
// Regeneration tool: npx tsx scripts/parse-bmf-pap.ts
// DO NOT EDIT — re-run the script when BMF publishes a new PAP
// ============================================================
// Implements the BMF Programmablaufplan (PAP) for German wage tax.
// All monetary inputs/outputs are in EUROCENTS (integer).
// Arithmetic mirrors Java BigDecimal: ROUND_DOWN = truncation toward zero,
// ROUND_UP = away from zero.

// ── Arithmetic helpers ─────────────────────────────────────────────────────

/** Divide a/b, round result to `scale` decimal places.
 *  mode 'DOWN' = truncation toward zero (Java ROUND_DOWN).
 *  mode 'UP'   = away from zero        (Java ROUND_UP). */
function _div(a: number, b: number, scale: number, mode: 'DOWN' | 'UP' = 'DOWN'): number {
  const raw = a / b;
  const factor = 10 ** scale;
  if (mode === 'DOWN') return Math.trunc(raw * factor) / factor;
  const t = raw * factor;
  return (t >= 0 ? Math.ceil(t) : Math.floor(t)) / factor;
}

/** setScale(n, mode): same as _div(a, 1, n, mode) */
function _scale(a: number, scale: number, mode: 'DOWN' | 'UP' = 'DOWN'): number {
  return _div(a, 1, scale, mode);
}

// ── Lookup tables (§ 19 Abs. 2 EStG / § 24a EStG) ─────────────────────────
// TAB1: Prozentsätze Versorgungsfreibetrag
const TAB1 = [0,0.4,0.384,0.368,0.352,0.336,0.32,0.304,0.288,0.272,0.256,0.24,0.224,0.208,0.192,0.176,0.16,0.152,0.144,0.14,0.136,0.132,0.128,0.124,0.12,0.116,0.112,0.108,0.104,0.1,0.096,0.092,0.088,0.084,0.08,0.076,0.072,0.068,0.064,0.06,0.056,0.052,0.048,0.044,0.04,0.036,0.032,0.028,0.024,0.02,0.016,0.012,0.008,0.004,0];
// TAB2: Höchstbeträge Versorgungsfreibetrag (€)
const TAB2 = [0,3000,2880,2760,2640,2520,2400,2280,2160,2040,1920,1800,1680,1560,1440,1320,1200,1140,1080,1050,1020,990,960,930,900,870,840,810,780,750,720,690,660,630,600,570,540,510,480,450,420,390,360,330,300,270,240,210,180,150,120,90,60,30,0];
// TAB3: Zuschläge zum Versorgungsfreibetrag (€)
const TAB3 = [0,900,864,828,792,756,720,684,648,612,576,540,504,468,432,396,360,342,324,315,306,297,288,279,270,261,252,243,234,225,216,207,198,189,180,171,162,153,144,135,126,117,108,99,90,81,72,63,54,45,36,27,18,9,0];
// TAB4: Prozentsätze Altersentlastungsbetrag
const TAB4 = [0,0.4,0.384,0.368,0.352,0.336,0.32,0.304,0.288,0.272,0.256,0.24,0.224,0.208,0.192,0.176,0.16,0.152,0.144,0.14,0.136,0.132,0.128,0.124,0.12,0.116,0.112,0.108,0.104,0.1,0.096,0.092,0.088,0.084,0.08,0.076,0.072,0.068,0.064,0.06,0.056,0.052,0.048,0.044,0.04,0.036,0.032,0.028,0.024,0.02,0.016,0.012,0.008,0.004,0];
// TAB5: Höchstbeträge Altersentlastungsbetrag (€)
const TAB5 = [0,1900,1824,1748,1672,1596,1520,1444,1368,1292,1216,1140,1064,988,912,836,760,722,684,665,646,627,608,589,570,551,532,513,494,475,456,437,418,399,380,361,342,323,304,285,266,247,228,209,190,171,152,133,114,95,76,57,38,19,0];

// ── Public interface types ─────────────────────────────────────────────────
export interface PAP2026Inputs {
  /** Faktorverfahren aktiv (1=ja). Default 1. */              af: number;
  /** Auf Vollendung 64. Lj folgendes Kalenderjahr.*/          AJAHR: number;
  /** 1 wenn 64. Lebensjahr zu Beginn vollendet. */            ALTER1: number;
  /** Merker Arbeitslosenversicherung (0=pflichtvers.) */      ALV: number;
  /** Eingetragener Faktor (3 Nachkommastellen). */            f: number;
  /** Jahresfreibetrag in Cent. */                             JFREIB: number;
  /** Jahreshinzurechnungsbetrag in Cent. */                   JHINZU: number;
  /** Voraussichtlicher Jahresarbeitslohn in Cent. */          JRE4: number;
  /** In JRE4 enthaltene Entschädigungen in Cent. */           JRE4ENT: number;
  /** In JRE4 enthaltene Versorgungsbezüge in Cent. */         JVBEZ: number;
  /** Merker Rentenversicherung (0=pflichtvers.). */           KRV: number;
  /** Kassenindividueller Zusatzbeitragssatz KV in %. */       KVZ: number;
  /** Lohnzahlungszeitraum: 1=Jahr, 2=Monat, 3=Woche, 4=Tag*/ LZZ: number;
  /** Freibetrag für LZZ in Cent. */                           LZZFREIB: number;
  /** Hinzurechnungsbetrag für LZZ in Cent. */                 LZZHINZU: number;
  /** Nicht zu besteuernde Vorteile Vermögensbeteilig. Cent.*/ MBV: number;
  /** Private Basiskranken-/Pflegeversicherung AN in Cent/Mo.*/PKPV: number;
  /** AG-Zuschuss private Basiskrankenversicherung Cent/Mo. */ PKPVAGZ: number;
  /** 0=gesetzlich KV, 1=ausschl. privat KV. */               PKV: number;
  /** Beitragsabschläge PV für mehr als 1 Kind (0-4). */       PVA: number;
  /** 1 wenn Sachsen. */                                       PVS: number;
  /** 1 wenn Pflegezuschlag zu zahlen (kinderlos ≥25). */      PVZ: number;
  /** Religionszugehörigkeit (0=keine). */                     R: number;
  /** Brutto-Arbeitslohn LZZ in Cent. */                       RE4: number;
  /** Sonstige Bezüge in Cent. */                              SONSTB: number;
  /** Entschädigungen in SONSTB in Cent. */                    SONSTENT: number;
  /** Sterbegeld/Kapitalabfindungen in SONSTB Cent. */         STERBE: number;
  /** Steuerklasse 1–6. */                                     STKL: number;
  /** In RE4 enthaltene Versorgungsbezüge Cent. */             VBEZ: number;
  /** Versorgungsbezug Januar 2005 (od. Erstmonat) Cent. */    VBEZM: number;
  /** Sonderzahlungen Versorgungsbezüge im Kj. Cent. */        VBEZS: number;
  /** In SONSTB enthaltene Versorgungsbezüge Cent. */          VBS: number;
  /** Jahr des erstmaligen Versorgungsbezugs. */               VJAHR: number;
  /** Kinderfreibeträge (1 Dezimalstelle). */                  ZKF: number;
  /** Monate für Versorgungsbezüge (nur LZZ=1). */             ZMVB: number;
}

export interface PAP2026Outputs {
  /** Kirchenlohnsteuer-Bemessungsgrundlage in Cent. */        BK: number;
  /** Kirchensteuer-BMG sonstige Bezüge in Cent. */            BKS: number;
  /** Lohnsteuer für LZZ in Cent. */                           LSTLZZ: number;
  /** Solidaritätszuschlag für LZZ in Cent. */                 SOLZLZZ: number;
  /** SolZ auf sonstige Bezüge in Cent. */                     SOLZS: number;
  /** Lohnsteuer sonstige Bezüge in Cent. */                   STS: number;
  /** Verbrauchter Freibetrag lfd. Arbeitslohn Cent. */        VFRB: number;
  /** Verbrauchter Freibetrag Jahresarbeitslohn Cent. */       VFRBS1: number;
  /** Verbrauchter Freibetrag sonstige Bezüge Cent. */         VFRBS2: number;
  /** Verfügbares ZVE über GFB (lfd.) in Cent. */             WVFRB: number;
  /** Verfügbares ZVE über GFB (Jahresarb.) in Cent. */       WVFRBO: number;
  /** Verfügbares ZVE über GFB (sonstige Bez.) in Cent. */    WVFRBM: number;
}

// ── Internal state ─────────────────────────────────────────────────────────
interface S extends PAP2026Inputs, PAP2026Outputs {
  ALTE: number; ANP: number; ANTEIL1: number; AVSATZAN: number; BBGKVPV: number;
  BBGRVALV: number; BMG: number; DIFF: number; EFA: number; FVB: number;
  FVBSO: number; FVBZ: number; FVBZSO: number; GFB: number; HBALTE: number;
  HFVB: number; HFVBZ: number; HFVBZSO: number; HOCH: number; J: number;
  JBMG: number; JLFREIB: number; JLHINZU: number; JW: number; K: number;
  KFB: number; KVSATZAN: number; KZTAB: number; LSTJAHR: number; LSTOSO: number;
  LSTSO: number; MIST: number; PKPVAGZJ: number; PVSATZAN: number;
  RVSATZAN: number; RW: number; SAP: number; SOLZFREI: number; SOLZJ: number;
  SOLZMIN: number; SOLZSBMG: number; SOLZSZVE: number; ST: number; ST1: number;
  ST2: number; VBEZB: number; VBEZBSO: number; VERGL: number; VSPALV: number;
  VSPKVPV: number; VSPHB: number; VSPR: number; VSP: number; VSPN: number;
  W1STKL5: number; W2STKL5: number; W3STKL5: number; X: number; Y: number;
  ZRE4: number; ZRE4J: number; ZRE4VP: number; ZRE4VPR: number; ZTABFB: number;
  ZVBEZ: number; ZVBEZJ: number; ZVE: number; ZX: number; ZZX: number;
}

// ── PAP Methods ────────────────────────────────────────────────────────────
// Seite 14: Sozialversicherungs-Parameter 2026
function MPARA(s: S): void {
  s.BBGRVALV = 101400;               // BBG RV + AV (€/Jahr)
  s.AVSATZAN = 0.013;                // AV AN-Anteil 1.3%
  s.RVSATZAN = 0.093;                // RV AN-Anteil 9.3%
  s.BBGKVPV  = 69750;                // BBG KV + PV (€/Jahr)
  s.KVSATZAN = s.KVZ / 2 / 100 + 0.07;  // KV AN: Grundbeitrag 7% + Zusatz/2
  s.PVSATZAN = s.PVS === 1 ? 0.023 : 0.018;
  if (s.PVZ === 1) {
    s.PVSATZAN += 0.006;
  } else {
    s.PVSATZAN -= s.PVA * 0.0025;
  }
  s.W1STKL5 = 14071;
  s.W2STKL5 = 34939;
  s.W3STKL5 = 222260;
  s.GFB      = 12348;   // Grundfreibetrag 2026
  s.SOLZFREI = 20350;   // SolZ-Freigrenze 2026
}

// Seite 15: Jahresarbeitslohn aus RE4
function MRE4JL(s: S): void {
  if (s.LZZ === 1) {
    s.ZRE4J  = _div(s.RE4, 100, 2);
    s.ZVBEZJ = _div(s.VBEZ, 100, 2);
    s.JLFREIB = _div(s.LZZFREIB, 100, 2);
    s.JLHINZU = _div(s.LZZHINZU, 100, 2);
  } else if (s.LZZ === 2) {
    s.ZRE4J  = _div(s.RE4 * 12, 100, 2);
    s.ZVBEZJ = _div(s.VBEZ * 12, 100, 2);
    s.JLFREIB = _div(s.LZZFREIB * 12, 100, 2);
    s.JLHINZU = _div(s.LZZHINZU * 12, 100, 2);
  } else if (s.LZZ === 3) {
    s.ZRE4J  = _div(s.RE4 * 360, 700, 2);
    s.ZVBEZJ = _div(s.VBEZ * 360, 700, 2);
    s.JLFREIB = _div(s.LZZFREIB * 360, 700, 2);
    s.JLHINZU = _div(s.LZZHINZU * 360, 700, 2);
  } else {  // LZZ === 4 (täglich)
    s.ZRE4J  = _div(s.RE4 * 360, 100, 2);
    s.ZVBEZJ = _div(s.VBEZ * 360, 100, 2);
    s.JLFREIB = _div(s.LZZFREIB * 360, 100, 2);
    s.JLHINZU = _div(s.LZZHINZU * 360, 100, 2);
  }
  if (s.af === 0) s.f = 1;
}

// Seite 16-17: Versorgungsfreibetrag + Altersentlastungsbetrag
function MRE4(s: S): void {
  if (s.ZVBEZJ === 0) {
    s.FVBZ = 0; s.FVB = 0; s.FVBZSO = 0; s.FVBSO = 0;
  } else {
    // Tabellen-Index J (PAP Seite 16)
    if (s.VJAHR < 2006) { s.J = 1; }
    else if (s.VJAHR < 2058) { s.J = s.VJAHR - 2004; }
    else { s.J = 54; }

    if (s.LZZ === 1) {
      s.VBEZB = s.VBEZM * s.ZMVB + s.VBEZS;
      s.HFVB  = _scale(TAB2[s.J] / 12 * s.ZMVB, 0, 'UP');
      s.FVBZ  = _scale(TAB3[s.J] / 12 * s.ZMVB, 0, 'UP');
    } else {
      s.VBEZB = _scale(s.VBEZM * 12 + s.VBEZS, 2);
      s.HFVB  = TAB2[s.J];
      s.FVBZ  = TAB3[s.J];
    }

    s.FVB = _scale(s.VBEZB * TAB1[s.J] / 100, 2, 'UP');
    if (s.FVB > s.HFVB)  s.FVB = s.HFVB;
    if (s.FVB > s.ZVBEZJ) s.FVB = s.ZVBEZJ;

    s.FVBSO = _scale(s.FVB + s.VBEZBSO * TAB1[s.J] / 100, 2, 'UP');
    if (s.FVBSO > TAB2[s.J]) s.FVBSO = TAB2[s.J];

    s.HFVBZSO = _scale((s.VBEZB + s.VBEZBSO) / 100 - s.FVBSO, 2);
    s.FVBZSO  = _scale(s.FVBZ + s.VBEZBSO / 100, 0, 'UP');
    if (s.FVBZSO > s.HFVBZSO) s.FVBZSO = _scale(s.HFVBZSO, 0, 'UP');
    if (s.FVBZSO > TAB3[s.J]) s.FVBZSO = TAB3[s.J];

    s.HFVBZ = _scale(s.VBEZB / 100 - s.FVB, 2);
    if (s.FVBZ > s.HFVBZ) s.FVBZ = _scale(s.HFVBZ, 0, 'UP');
  }
  MRE4ALTE(s);
}

// Seite 17: Altersentlastungsbetrag
function MRE4ALTE(s: S): void {
  if (s.ALTER1 === 0) {
    s.ALTE = 0;
  } else {
    if (s.AJAHR < 2006) { s.K = 1; }
    else if (s.AJAHR < 2058) { s.K = s.AJAHR - 2004; }
    else { s.K = 54; }

    s.BMG    = s.ZRE4J - s.ZVBEZJ;
    s.ALTE   = _scale(s.BMG * TAB4[s.K], 0, 'UP');
    s.HBALTE = TAB5[s.K];
    if (s.ALTE > s.HBALTE) s.ALTE = s.HBALTE;
  }
}

// Seite 20: Jahresarbeitslohn nach Freibetragsabzug
function MRE4ABZ(s: S): void {
  s.ZRE4 = _scale(s.ZRE4J - s.FVB - s.ALTE - s.JLFREIB + s.JLHINZU, 2);
  if (s.ZRE4 < 0) s.ZRE4 = 0;
  s.ZRE4VP = s.ZRE4J;
  s.ZVBEZ  = _scale(s.ZVBEZJ - s.FVB, 2);
  if (s.ZVBEZ < 0) s.ZVBEZ = 0;
}

// Seite 21: Hauptberechnung laufender LZZ
function MBERECH(s: S): void {
  MZTABFB(s);
  s.VFRB = _scale((s.ANP + s.FVB + s.FVBZ) * 100, 0);
  MLSTJAHR(s);
  s.WVFRB = _scale((s.ZVE - s.GFB) * 100, 0);
  if (s.WVFRB < 0) s.WVFRB = 0;
  s.LSTJAHR = _scale(s.ST * s.f, 0);
  UPLSTLZZ(s);
  if (s.ZKF > 0) {
    s.ZTABFB += s.KFB;
    MRE4ABZ(s);
    MLSTJAHR(s);
    s.JBMG = _scale(s.ST * s.f, 0);
  } else {
    s.JBMG = s.LSTJAHR;
  }
  MSOLZ(s);
}

// Seite 22: Feste Tabellenfreibeträge (ohne Vorsorgepauschale)
function MZTABFB(s: S): void {
  s.ANP = 0;
  s.EFA = 0;
  s.SAP = 0;

  // Versorgungsfreibetrag-Zuschlag auf ZVBEZ begrenzen
  if (s.ZVBEZ >= 0 && s.ZVBEZ < s.FVBZ) {
    s.FVBZ = Math.trunc(s.ZVBEZ);
  }

  if (s.STKL < 6) {
    // Arbeitnehmer-Pauschbetrag für Versorgungsbezüge (max. 102 €)
    if (s.ZVBEZ > 0) {
      s.ANP = s.ZVBEZ - s.FVBZ < 102
        ? _scale(s.ZVBEZ - s.FVBZ, 0, 'UP')
        : 102;
    }
    // Werbungskosten-Pauschbetrag für Arbeitslohn (max. 1.230 €)
    if (s.ZRE4 > s.ZVBEZ) {
      const diff = s.ZRE4 - s.ZVBEZ;
      s.ANP = diff < 1230
        ? _scale(s.ANP + diff, 0, 'UP')
        : s.ANP + 1230;
    }
  } else {
    s.FVBZ   = 0;
    s.FVBZSO = 0;
  }

  // Steuerklassen-spezifische Parameter
  s.KZTAB = 1;
  if (s.STKL === 1) {
    s.SAP = 36; s.KFB = _scale(s.ZKF * 9756, 0);
  } else if (s.STKL === 2) {
    s.EFA = 4260; s.SAP = 36; s.KFB = _scale(s.ZKF * 9756, 0);
  } else if (s.STKL === 3) {
    s.KZTAB = 2; s.SAP = 36; s.KFB = _scale(s.ZKF * 9756, 0);
  } else if (s.STKL === 4) {
    s.SAP = 36; s.KFB = _scale(s.ZKF * 4878, 0);
  } else if (s.STKL === 5) {
    s.SAP = 36; s.KFB = 0;
  } else {  // STKL 6
    s.KFB = 0;
  }
  s.ZTABFB = _scale(s.EFA + s.ANP + s.SAP + s.FVBZ, 2);
}

// Seite 23: Jahreslohnsteuer
function MLSTJAHR(s: S): void {
  UPEVP(s);
  s.ZVE = s.ZRE4 - s.ZTABFB - s.VSP;
  UPMLST(s);
}

// Seite 24: Lohnsteuer für LZZ aus Jahreslohnsteuer
function UPLSTLZZ(s: S): void {
  s.JW = s.LSTJAHR * 100;
  UPANTEIL(s);
  s.LSTLZZ = s.ANTEIL1;
}

// Seite 25: Tarifliche Einkommensteuer ermitteln
function UPMLST(s: S): void {
  if (s.ZVE < 1) {
    s.ZVE = 0; s.X = 0;
  } else {
    s.X = _scale(s.ZVE / s.KZTAB, 0);
  }
  if (s.STKL < 5) { UPTAB26(s); } else { MST5_6(s); }
}

// Seite 26: Vorsorgepauschale
function UPEVP(s: S): void {
  if (s.KRV === 1) {
    s.VSPR = 0;
  } else {
    s.ZRE4VPR = s.ZRE4VP > s.BBGRVALV ? s.BBGRVALV : s.ZRE4VP;
    s.VSPR    = _scale(s.ZRE4VPR * s.RVSATZAN, 2);
  }
  MVSPKVPV(s);
  if (s.ALV !== 1 && s.STKL !== 6) MVSPHB(s);
}

// Seite 27: Vorsorgepauschale KV+PV
function MVSPKVPV(s: S): void {
  s.ZRE4VPR = s.ZRE4VP > s.BBGKVPV ? s.BBGKVPV : s.ZRE4VP;
  if (s.PKV > 0) {
    if (s.STKL === 6) {
      s.VSPKVPV = 0;
    } else {
      s.PKPVAGZJ = _scale(s.PKPVAGZ * 12 / 100, 2);
      s.VSPKVPV  = _scale(s.PKPV * 12 / 100, 2) - s.PKPVAGZJ;
      if (s.VSPKVPV < 0) s.VSPKVPV = 0;
    }
  } else {
    s.VSPKVPV = _scale(s.ZRE4VPR * (s.KVSATZAN + s.PVSATZAN), 2);
  }
  s.VSP = _scale(s.VSPKVPV + s.VSPR, 0, 'UP');
}

// Seite 28: Höchstbetragsberechnung AV
function MVSPHB(s: S): void {
  s.ZRE4VPR = s.ZRE4VP > s.BBGRVALV ? s.BBGRVALV : s.ZRE4VP;
  s.VSPALV  = _scale(s.AVSATZAN * s.ZRE4VPR, 2);
  s.VSPHB   = _scale(s.VSPALV + s.VSPKVPV, 2);
  if (s.VSPHB > 1900) s.VSPHB = 1900;
  s.VSPN = _scale(s.VSPR + s.VSPHB, 0, 'UP');
  if (s.VSPN > s.VSP) s.VSP = s.VSPN;
}

// Seite 29: Lohnsteuer Steuerklassen V+VI
function MST5_6(s: S): void {
  s.ZZX = s.X;
  if (s.ZZX > s.W2STKL5) {
    s.ZX = s.W2STKL5; UP5_6(s);
    if (s.ZZX > s.W3STKL5) {
      s.ST = _scale(s.ST + (s.W3STKL5 - s.W2STKL5) * 0.42, 0);
      s.ST = _scale(s.ST + (s.ZZX - s.W3STKL5) * 0.45, 0);
    } else {
      s.ST = _scale(s.ST + (s.ZZX - s.W2STKL5) * 0.42, 0);
    }
  } else {
    s.ZX = s.ZZX; UP5_6(s);
    if (s.ZZX > s.W1STKL5) {
      s.VERGL = s.ST;
      s.ZX    = s.W1STKL5; UP5_6(s);
      s.HOCH  = _scale(s.ST + (s.ZZX - s.W1STKL5) * 0.42, 0);
      s.ST    = s.HOCH < s.VERGL ? s.HOCH : s.VERGL;
    }
  }
}

// Seite 30: Unterprogramm zu MST5_6
function UP5_6(s: S): void {
  s.X = _scale(s.ZX * 1.25, 0); UPTAB26(s); s.ST1 = s.ST;
  s.X = _scale(s.ZX * 0.75, 0); UPTAB26(s); s.ST2 = s.ST;
  s.DIFF = (s.ST1 - s.ST2) * 2;
  s.MIST = _scale(s.ZX * 0.14, 0);
  s.ST   = s.MIST > s.DIFF ? s.MIST : s.DIFF;
}

// Seite 31: Solidaritätszuschlag
function MSOLZ(s: S): void {
  s.SOLZFREI *= s.KZTAB;
  if (s.JBMG > s.SOLZFREI) {
    s.SOLZJ   = _scale(s.JBMG * 5.5 / 100, 2);
    s.SOLZMIN = _scale((s.JBMG - s.SOLZFREI) * 11.9 / 100, 2);
    if (s.SOLZMIN < s.SOLZJ) s.SOLZJ = s.SOLZMIN;
    s.JW = _scale(s.SOLZJ * 100, 0);
    UPANTEIL(s);
    s.SOLZLZZ = s.ANTEIL1;
  } else {
    s.SOLZLZZ = 0;
  }
  if (s.R > 0) {
    s.JW = s.JBMG * 100; UPANTEIL(s); s.BK = s.ANTEIL1;
  } else {
    s.BK = 0;
  }
}

// Seite 32: Anteil Jahresbetrag für LZZ
function UPANTEIL(s: S): void {
  if      (s.LZZ === 1) { s.ANTEIL1 = s.JW; }
  else if (s.LZZ === 2) { s.ANTEIL1 = _div(s.JW, 12, 0); }
  else if (s.LZZ === 3) { s.ANTEIL1 = _div(s.JW * 7, 360, 0); }
  else                  { s.ANTEIL1 = _div(s.JW, 360, 0); }
}

// Seite 33: Sonstige Bezüge
function MSONST(s: S): void {
  s.LZZ = 1;
  if (s.ZMVB === 0) s.ZMVB = 12;
  if (s.SONSTB === 0 && s.MBV === 0) {
    s.LSTSO = 0; s.STS = 0; s.SOLZS = 0; s.BKS = 0;
    return;
  }
  MOSONST(s);
  s.ZRE4J  = _scale((s.JRE4 + s.SONSTB) / 100, 2);
  s.ZVBEZJ = _scale((s.JVBEZ + s.VBS) / 100, 2);
  s.VBEZBSO = s.STERBE;
  MRE4SONST(s);
  MLSTJAHR(s);
  s.WVFRBM = _scale((s.ZVE - s.GFB) * 100, 2);
  if (s.WVFRBM < 0) s.WVFRBM = 0;
  s.LSTSO = s.ST * 100;
  // Note: ROUND_DOWN auf negative Zahlen = truncation toward zero per PAP comment
  s.STS = Math.trunc((s.LSTSO - s.LSTOSO) * s.f / 100) * 100;
  STSMIN(s);
}

// Seite 34: Mindeststeuer STS
function STSMIN(s: S): void {
  if (s.STS < 0) {
    if (s.MBV !== 0) {
      s.LSTLZZ += s.STS;
      if (s.LSTLZZ < 0) s.LSTLZZ = 0;
      s.SOLZLZZ = _scale(s.SOLZLZZ + s.STS * 0.055, 0);
      if (s.SOLZLZZ < 0) s.SOLZLZZ = 0;
      s.BK += s.STS;
      if (s.BK < 0) s.BK = 0;
    }
    s.STS = 0; s.SOLZS = 0;
  } else {
    MSOLZSTS(s);
  }
  s.BKS = s.R > 0 ? s.STS : 0;
}

// Seite 35: SolZ auf sonstige Bezüge
function MSOLZSTS(s: S): void {
  s.SOLZSZVE = s.ZKF > 0 ? s.ZVE - s.KFB : s.ZVE;
  if (s.SOLZSZVE < 1) {
    s.SOLZSZVE = 0; s.X = 0;
  } else {
    s.X = _div(s.SOLZSZVE, s.KZTAB, 0);
  }
  if (s.STKL < 5) { UPTAB26(s); } else { MST5_6(s); }
  s.SOLZSBMG = _scale(s.ST * s.f, 0);
  s.SOLZS    = s.SOLZSBMG > s.SOLZFREI
    ? _div(s.STS * 5.5, 100, 0)
    : 0;
}

// Seite 36: Sonderberechnung ohne sonstige Bezüge
function MOSONST(s: S): void {
  s.ZRE4J   = _scale(s.JRE4 / 100, 2);
  s.ZVBEZJ  = _scale(s.JVBEZ / 100, 2);
  s.JLFREIB = _div(s.JFREIB, 100, 2);
  s.JLHINZU = _div(s.JHINZU, 100, 2);
  MRE4(s);
  MRE4ABZ(s);
  s.ZRE4VP -= s.JRE4ENT / 100;
  MZTABFB(s);
  s.VFRBS1 = _scale((s.ANP + s.FVB + s.FVBZ) * 100, 2);
  MLSTJAHR(s);
  s.WVFRBO = _scale((s.ZVE - s.GFB) * 100, 2);
  if (s.WVFRBO < 0) s.WVFRBO = 0;
  s.LSTOSO = s.ST * 100;
}

// Seite 37: Sonderberechnung mit sonstigen Bezügen
function MRE4SONST(s: S): void {
  MRE4(s);
  s.FVB = s.FVBSO;
  MRE4ABZ(s);
  s.ZRE4VP += s.MBV / 100 - s.JRE4ENT / 100 - s.SONSTENT / 100;
  s.FVBZ = s.FVBZSO;
  MZTABFB(s);
  s.VFRBS2 = (s.ANP + s.FVB + s.FVBZ) * 100 - s.VFRBS1;
}

// Seite 38: Einkommensteuertarif §32a EStG 2026
function UPTAB26(s: S): void {
  if (s.X < s.GFB + 1) {
    s.ST = 0;
  } else if (s.X < 17800) {
    s.Y  = _div(s.X - s.GFB, 10000, 6);
    s.RW = s.Y * 914.51 + 1400;
    s.ST = _scale(s.RW * s.Y, 0);
  } else if (s.X < 69879) {
    s.Y  = _div(s.X - 17799, 10000, 6);
    s.RW = (s.Y * 173.1 + 2397) * s.Y;
    s.ST = _scale(s.RW + 1034.87, 0);
  } else if (s.X < 277826) {
    s.ST = _scale(s.X * 0.42 - 11135.63, 0);
  } else {
    s.ST = _scale(s.X * 0.45 - 19470.38, 0);
  }
  s.ST *= s.KZTAB;
}

// ── Public API ─────────────────────────────────────────────────────────────
export function calculateLohnsteuerPAP(inputs: Partial<PAP2026Inputs>): PAP2026Outputs {
  const s: S = {
    // Input defaults (§ 39b EStG)
    af: 1, AJAHR: 0, ALTER1: 0, ALV: 0, f: 1.0,
    JFREIB: 0, JHINZU: 0, JRE4: 0, JRE4ENT: 0, JVBEZ: 0,
    KRV: 0, KVZ: 0, LZZ: 1, LZZFREIB: 0, LZZHINZU: 0,
    MBV: 0, PKPV: 0, PKPVAGZ: 0, PKV: 0, PVA: 0,
    PVS: 0, PVZ: 0, R: 0, RE4: 0, SONSTB: 0,
    SONSTENT: 0, STERBE: 0, STKL: 1, VBEZ: 0, VBEZM: 0,
    VBEZS: 0, VBS: 0, VJAHR: 0, ZKF: 0, ZMVB: 0,
    ...inputs,
    // All outputs + internals start at 0
    BK: 0, BKS: 0, LSTLZZ: 0, SOLZLZZ: 0, STS: 0, SOLZS: 0,
    VFRB: 0, VFRBS1: 0, VFRBS2: 0, WVFRB: 0, WVFRBO: 0, WVFRBM: 0,
    ALTE: 0, ANP: 0, ANTEIL1: 0, AVSATZAN: 0, BBGKVPV: 0,
    BBGRVALV: 0, BMG: 0, DIFF: 0, EFA: 0, FVB: 0,
    FVBSO: 0, FVBZ: 0, FVBZSO: 0, GFB: 0, HBALTE: 0,
    HFVB: 0, HFVBZ: 0, HFVBZSO: 0, HOCH: 0, J: 0,
    JBMG: 0, JLFREIB: 0, JLHINZU: 0, JW: 0, K: 0,
    KFB: 0, KVSATZAN: 0, KZTAB: 0, LSTJAHR: 0, LSTOSO: 0,
    LSTSO: 0, MIST: 0, PKPVAGZJ: 0, PVSATZAN: 0,
    RVSATZAN: 0, RW: 0, SAP: 0, SOLZFREI: 0, SOLZJ: 0,
    SOLZMIN: 0, SOLZSBMG: 0, SOLZSZVE: 0, ST: 0, ST1: 0,
    ST2: 0, VBEZB: 0, VBEZBSO: 0, VERGL: 0, VSPALV: 0,
    VSPKVPV: 0, VSPHB: 0, VSPR: 0, VSP: 0, VSPN: 0,
    W1STKL5: 0, W2STKL5: 0, W3STKL5: 0, X: 0, Y: 0,
    ZRE4: 0, ZRE4J: 0, ZRE4VP: 0, ZRE4VPR: 0, ZTABFB: 0,
    ZVBEZ: 0, ZVBEZJ: 0, ZVE: 0, ZX: 0, ZZX: 0,
  };

  // Main PAP flow (Seite 13)
  MPARA(s);
  MRE4JL(s);
  s.VBEZBSO = 0;
  MRE4(s);
  MRE4ABZ(s);
  MBERECH(s);
  MSONST(s);

  return {
    LSTLZZ: s.LSTLZZ, SOLZLZZ: s.SOLZLZZ,
    BK: s.BK, BKS: s.BKS, STS: s.STS, SOLZS: s.SOLZS,
    VFRB: s.VFRB, VFRBS1: s.VFRBS1, VFRBS2: s.VFRBS2,
    WVFRB: s.WVFRB, WVFRBO: s.WVFRBO, WVFRBM: s.WVFRBM,
  };
}
