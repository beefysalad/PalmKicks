/**
 * Money helpers. All arithmetic on prices happens in integer centavos so that
 * totals never drift through floating-point error. Convert at the edges only.
 */

type MoneyInput = number | string | { toString(): string };

export function toCentavos(value: MoneyInput): number {
  const raw = typeof value === "number" ? null : String(value).trim();
  const n = raw === null ? (value as number) : raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(n)) {
    throw new TypeError(`Invalid money value: ${String(value)}`);
  }
  // Values are stored as Decimal(10,2), well inside the safe integer range, so
  // rounding the scaled float recovers the exact centavo amount.
  return Math.round(n * 100);
}

export function fromCentavos(c: number): string {
  if (!Number.isSafeInteger(c)) {
    throw new TypeError(`Invalid centavo amount: ${c}`);
  }
  const sign = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}
