const EUR_FORMATTER = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function roundToCents(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function toMinorUnits(value: number): number {
  return Math.round(roundToCents(value) * 100);
}

export function fromMinorUnits(value: number): number {
  return roundToCents(value / 100);
}

export function formatEUR(value: number): string {
  return EUR_FORMATTER.format(roundToCents(value));
}
