import type { QuoteBuilder } from "./builders";
import { discountAmount } from "./engine";
import { resultFor } from "./result";
import type {
  ClientOrder,
  DiscountMode,
  Product,
  Quote,
  QuoteResult,
  TaxMode,
} from "./types";

/** One line of a combined quote: a quote (or variant) at its own price and quantity. */
export interface CombinedLine {
  id: string;
  label: string;
  quote: Quote;
  result: QuoteResult;
  /** The quote's own tax rate, used when each line keeps its own tax. */
  taxPercent: number;
}

export interface CombinedTotals {
  mode: TaxMode;
  discount: { mode: DiscountMode; value: number };
  taxPercent: number;
}

export interface CombinedResult {
  lines: CombinedLine[];
  subtotal: number;
  discount: number;
  taxable: number;
  /** Tax per rate, highest first; one entry in "order" mode. */
  taxes: { percent: number; amount: number }[];
  tax: number;
  total: number;
  orderCost: number;
  orderProfit: number;
  warnings: string[];
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/**
 * Add lines up into one quote. In "order" mode the combined subtotal gets a single discount and
 * tax rate; in "each" mode every line keeps the discount and tax its own quote worked out.
 */
export function combine(
  lines: CombinedLine[],
  totals: CombinedTotals,
): CombinedResult {
  const subtotal = sum(lines.map((l) => l.result.subtotal));
  const orderCost = sum(lines.map((l) => l.result.orderCost));
  const warnings = lines.flatMap((l) =>
    l.result.warnings.map((w) => `${l.label}: ${w}`),
  );

  let discount: number;
  let taxes: CombinedResult["taxes"];
  if (totals.mode === "order") {
    discount = discountAmount(subtotal, totals.discount);
    const percent = Number.isFinite(totals.taxPercent) ? totals.taxPercent : 0;
    taxes = [{ percent, amount: ((subtotal - discount) * percent) / 100 }];
  } else {
    discount = sum(lines.map((l) => l.result.discount));
    const byRate = new Map<number, number>();
    for (const l of lines) {
      byRate.set(l.taxPercent, (byRate.get(l.taxPercent) ?? 0) + l.result.tax);
    }
    taxes = [...byRate]
      .map(([percent, amount]) => ({ percent, amount }))
      .sort((a, b) => b.percent - a.percent);
  }
  const taxable = subtotal - discount;
  const tax = sum(taxes.map((t) => t.amount));
  return {
    lines,
    subtotal,
    discount,
    taxable,
    taxes: taxes.filter((t) => t.percent !== 0 || t.amount !== 0),
    tax,
    total: taxable + tax,
    orderCost,
    orderProfit: taxable - orderCost,
    warnings,
  };
}

/** Lines for some of a product's quotes, in the product's quote order. */
export function linesFor(
  builder: QuoteBuilder,
  product: Product,
  quoteIds: string[],
): CombinedLine[] {
  const wanted = new Set(quoteIds);
  return product.quotes
    .filter((q) => wanted.has(q.id))
    .map((q) => ({
      id: q.id,
      label: q.label,
      quote: q,
      result: resultFor(builder, q.inputs),
      taxPercent: q.inputs.taxPercent,
    }));
}

/** Price a client order from its product's current quotes. */
export const orderResult = (
  builder: QuoteBuilder,
  product: Product,
  order: ClientOrder,
) =>
  combine(linesFor(builder, product, order.quoteIds), {
    mode: order.taxMode,
    discount: order.discount,
    taxPercent: order.taxPercent,
  });
