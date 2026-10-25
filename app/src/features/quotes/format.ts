export const currencies = [
  { code: "INR", locale: "en-IN", label: "Indian Rupee (₹)" },
  { code: "USD", locale: "en-US", label: "US Dollar ($)" },
  { code: "EUR", locale: "de-DE", label: "Euro (€)" },
  { code: "GBP", locale: "en-GB", label: "British Pound (£)" },
  { code: "AED", locale: "en-AE", label: "UAE Dirham (AED)" },
  { code: "AUD", locale: "en-AU", label: "Australian Dollar (A$)" },
  { code: "CAD", locale: "en-CA", label: "Canadian Dollar (C$)" },
  { code: "JPY", locale: "ja-JP", label: "Japanese Yen (¥)" },
];

const localeFor = (code: string) =>
  currencies.find((c) => c.code === code)?.locale ?? "en-US";

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(localeFor(currency), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return value.toFixed(2);
  }
}

export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(localeFor(currency), {
      style: "currency",
      currency,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

export const formatPercent = (value: number) =>
  `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
    Number.isFinite(value) ? value : 0,
  );
