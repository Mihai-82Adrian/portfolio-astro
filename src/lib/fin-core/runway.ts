// ─── Constants ─────────────────────────────────────────────────────────────
/** Lohnnebenkosten DE: KV + PV + RV + AV (Arbeitgeberanteil) ≈ 20 % des Bruttolohns */
export const EMPLOYER_OVERHEAD_DE = 0.2;

/** Death Valley threshold: weniger als 3 Monate Runway = Fundraising-Alarm */
export const DEATH_VALLEY_THRESHOLD_MONTHS = 3;

// ─── Primitives ────────────────────────────────────────────────────────────

export type RoleStatus = 'active' | 'frozen';
// 'frozen' = geplant, aber im pessimistischen Szenario nicht besetzt

export interface Role {
  id: string;
  title: string;        // z. B. "Lead Dev", "Marketing Manager"
  monthlyCost: number;  // Bruttolohn monatlich (EUR) — Lohnnebenkosten werden automatisch addiert
  startMonth: number;   // Monat-Index, ab dem die Stelle besetzt ist (0 = Monat 1)
  status: RoleStatus;
}

export type OpexType = 'recurring' | 'one-off';

export interface OpexItem {
  id: string;
  label: string;       // z. B. "AWS / Infra", "MacBooks ×3", "GmbH Notarkosten"
  amount: number;      // monatlich bei recurring, einmalig bei one-off (EUR)
  type: OpexType;
  month?: number;      // Pflichtfeld wenn type === 'one-off' (Monat-Index)
}

export interface RevenueModel {
  initialMRR: number;    // MRR im Startmonat (EUR); 0 = Pre-Revenue
  momGrowthRate: number; // Month-over-Month-Wachstum in % (z. B. 15 = 15 %)
}

export interface CapitalInjection {
  id: string;
  label: string;  // z. B. "Seed Round", "EXIST-Gründerstipendium Tranche 2"
  amount: number; // EUR
  month: number;  // Monat-Index des Geldzuflusses (0 = Monat 1)
}

// ─── Szenario ──────────────────────────────────────────────────────────────

export interface RunwayScenario {
  id: string;
  name: string;         // "Pessimistisch" | "Realistisch" | "Optimistisch"
  initialCash: number;  // verfügbares Kapital zu Beginn (EUR)
  startDate: Date;
  headcount: Role[];
  opex: OpexItem[];
  revenue: RevenueModel;
  injections: CapitalInjection[];
}

// ─── Berechnetes Ergebnis (abgeleitet, nicht gespeichert) ──────────────────

export interface MonthlySnapshot {
  month: number;
  label: string;           // "Feb. 2026" — für Chart-Achse
  openingBalance: number;
  headcountBurn: number;   // Bruttolöhne inkl. Lohnnebenkosten
  opexBurn: number;        // recurring + ggf. one-off in diesem Monat
  totalBurn: number;
  mrr: number;             // Einnahmen nach Compound-Wachstum
  injections: number;      // Kapitalzuflüsse in diesem Monat
  netCashFlow: number;     // mrr + injections − totalBurn
  closingBalance: number;
  runwayRemaining: number; // Monate verbleibend beim aktuellen Netto-Burn
  isDeathValley: boolean;  // runwayRemaining < 3 → rote Zone im Chart
  isBankrupt: boolean;     // closingBalance ≤ 0
}

export interface RunwayProjection {
  scenarioId: string;
  snapshots: MonthlySnapshot[];
  runwayMonths: number;
  deathValleyMonth: number | null;
  bankruptMonth: number | null;
  totalInjections: number;
  peakBurn: number;
}

// ─── Hilfsfunktionen ───────────────────────────────────────────────────────

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
}

// ─── Berechnungsmotor ──────────────────────────────────────────────────────

export function projectRunway(
  scenario: RunwayScenario,
  horizonMonths = 36,
): RunwayProjection {
  const snapshots: MonthlySnapshot[] = [];
  let balance = scenario.initialCash;
  let totalInjections = 0;
  let peakBurn = 0;

  for (let m = 0; m < horizonMonths; m++) {
    // Headcount: nur aktive Rollen, die bereits begonnen haben
    const headcountBurn = scenario.headcount
      .filter(r => r.status === 'active' && r.startMonth <= m)
      .reduce((sum, r) => sum + r.monthlyCost * (1 + EMPLOYER_OVERHEAD_DE), 0);

    // Opex: recurring jeden Monat + one-off nur im spezifizierten Monat
    const opexBurn =
      scenario.opex
        .filter(i => i.type === 'recurring')
        .reduce((sum, i) => sum + i.amount, 0) +
      scenario.opex
        .filter(i => i.type === 'one-off' && i.month === m)
        .reduce((sum, i) => sum + i.amount, 0);

    const totalBurn = headcountBurn + opexBurn;
    if (totalBurn > peakBurn) peakBurn = totalBurn;

    // MRR: Compound-Wachstum monatlich
    const mrr =
      scenario.revenue.initialMRR *
      Math.pow(1 + scenario.revenue.momGrowthRate / 100, m);

    // Kapitalzuflüsse in diesem Monat
    const injectionTotal = scenario.injections
      .filter(i => i.month === m)
      .reduce((sum, i) => sum + i.amount, 0);
    totalInjections += injectionTotal;

    const netCashFlow = mrr + injectionTotal - totalBurn;
    const closingBalance = balance + netCashFlow;

    // Netto-Burn für Runway-Berechnung
    const netBurn = Math.max(totalBurn - mrr, 0);
    const runwayRemaining = netBurn > 0 ? closingBalance / netBurn : Infinity;

    snapshots.push({
      month: m,
      label: formatMonthLabel(addMonths(scenario.startDate, m)),
      openingBalance: balance,
      headcountBurn,
      opexBurn,
      totalBurn,
      mrr,
      injections: injectionTotal,
      netCashFlow,
      closingBalance,
      runwayRemaining,
      isDeathValley:
        runwayRemaining < DEATH_VALLEY_THRESHOLD_MONTHS && closingBalance > 0,
      isBankrupt: closingBalance <= 0,
    });

    balance = closingBalance;
    if (closingBalance <= 0) break;
  }

  return {
    scenarioId: scenario.id,
    snapshots,
    runwayMonths: snapshots.filter(s => !s.isBankrupt).length,
    deathValleyMonth: snapshots.find(s => s.isDeathValley)?.month ?? null,
    bankruptMonth: snapshots.find(s => s.isBankrupt)?.month ?? null,
    totalInjections,
    peakBurn,
  };
}

// ─── Default-Szenarien ─────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function createDefaultScenarios(): RunwayScenario[] {
  const startDate = new Date();
  startDate.setDate(1);

  const baseOpex: OpexItem[] = [
    { id: uid(), label: 'Cloud & Infra', amount: 500, type: 'recurring' },
    { id: uid(), label: 'SaaS Tools', amount: 300, type: 'recurring' },
    { id: uid(), label: 'GmbH Notarkosten', amount: 3500, type: 'one-off', month: 0 },
  ];

  return [
    {
      id: 'pessimistisch',
      name: 'Pessimistisch',
      initialCash: 150_000,
      startDate,
      headcount: [
        { id: uid(), title: 'Gründer (CEO)', monthlyCost: 3000, startMonth: 0, status: 'active' },
        { id: uid(), title: 'Lead Developer', monthlyCost: 5000, startMonth: 1, status: 'active' },
        { id: uid(), title: 'Marketing Manager', monthlyCost: 4000, startMonth: 2, status: 'frozen' },
      ],
      opex: baseOpex.map(o => ({ ...o, id: uid() })),
      revenue: { initialMRR: 0, momGrowthRate: 10 },
      injections: [],
    },
    {
      id: 'realistisch',
      name: 'Realistisch',
      initialCash: 200_000,
      startDate,
      headcount: [
        { id: uid(), title: 'Gründer (CEO)', monthlyCost: 3500, startMonth: 0, status: 'active' },
        { id: uid(), title: 'Lead Developer', monthlyCost: 5000, startMonth: 0, status: 'active' },
        { id: uid(), title: 'Marketing Manager', monthlyCost: 4000, startMonth: 2, status: 'active' },
      ],
      opex: baseOpex.map(o => ({ ...o, id: uid() })),
      revenue: { initialMRR: 500, momGrowthRate: 20 },
      injections: [
        { id: uid(), label: 'Seed Round', amount: 200_000, month: 8 },
      ],
    },
    {
      id: 'optimistisch',
      name: 'Optimistisch',
      initialCash: 200_000,
      startDate,
      headcount: [
        { id: uid(), title: 'Gründer (CEO)', monthlyCost: 4000, startMonth: 0, status: 'active' },
        { id: uid(), title: 'Lead Developer', monthlyCost: 5500, startMonth: 0, status: 'active' },
        { id: uid(), title: 'Marketing Manager', monthlyCost: 4500, startMonth: 1, status: 'active' },
        { id: uid(), title: 'Sales Executive', monthlyCost: 4000, startMonth: 3, status: 'active' },
      ],
      opex: baseOpex.map(o => ({ ...o, id: uid() })),
      revenue: { initialMRR: 1000, momGrowthRate: 30 },
      injections: [
        { id: uid(), label: 'Seed Round', amount: 300_000, month: 6 },
      ],
    },
  ];
}

// ─── Formatierung ──────────────────────────────────────────────────────────

export function formatEURCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return (value / 1_000_000).toFixed(1).replace('.', ',') + ' Mio. €';
  if (Math.abs(value) >= 1_000)
    return (value / 1_000).toFixed(1).replace('.', ',') + ' k€';
  return value.toFixed(0) + ' €';
}
