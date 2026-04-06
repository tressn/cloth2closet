// cents-based (for quotes, payments, etc.)
export function formatMoney(
  amountInCents: number | null | undefined,
  currency = "USD",
  locale = "en-US"
): string {
  if (amountInCents == null) return "—";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
}

// display-only (for basePriceFrom, already in dollars)
export function formatDisplayPrice(
  amount: number | null | undefined,
  currency = "USD",
  locale = "en-US"
): string {
  if (amount == null) return "—";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// form helpers (optional but good to keep together)
export function dollarsInputToCents(input: string): number {
  const normalized = input.replace(/[^0-9.]/g, "");
  if (!normalized) throw new Error("Invalid amount");

  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) throw new Error("Invalid amount");

  return Math.round(value * 100);
}

export function centsToInputValue(amountInCents: number | null | undefined): string {
  if (amountInCents == null) return "";
  return (amountInCents / 100).toFixed(2);
}