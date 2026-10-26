import type {
  CostLine,
  DiscountMode,
  QuoteInputs,
  QuoteResult,
  RoundingMode,
} from "./types";

/** Treat NaN, Infinity and missing values as zero so a half-filled form never breaks the totals. */
export const num = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Divide, returning 0 instead of Infinity/NaN when the divisor is not positive. */
export const safeDiv = (a: number, b: number): number => (b > 0 ? a / b : 0);

const sum = (lines: CostLine[]) =>
  lines.reduce((acc, line) => acc + line.amount, 0);

/** Rounds a price up, since rounding a quote down silently eats into the margin. */
export function roundPrice(price: number, mode: RoundingMode): number {
  if (price <= 0) return price;
  switch (mode) {
    case "1":
    case "5":
    case "10": {
      const step = Number(mode);
      return Math.ceil(price / step - 1e-9) * step;
    }
    case "end9": {
      const candidate = Math.ceil(price / 10 - 1e-9) * 10 - 1;
      return candidate >= price ? candidate : candidate + 10;
    }
    default:
      return price;
  }
}

/** A discount on `subtotal`, as % or a fixed amount, never negative or above the subtotal. */
export function discountAmount(
  subtotal: number,
  discount: { mode: DiscountMode; value: number },
): number {
  const value = num(discount.value);
  return Math.min(
    subtotal,
    Math.max(0, discount.mode === "percent" ? (subtotal * value) / 100 : value),
  );
}

export interface ComputeOptions {
  baseLines: CostLine[];
  /** Materials are entered per batch for some builders (e.g. bakery); this spreads them per unit. */
  materialsDivisor?: number;
}

export function computeQuote(
  inputs: QuoteInputs,
  options: ComputeOptions,
): QuoteResult {
  const warnings: string[] = [];
  const quantity = Math.max(1, Math.floor(num(inputs.quantity)) || 1);

  const baseLines = options.baseLines.map((l) => ({
    label: l.label,
    amount: num(l.amount),
  }));
  const baseCost = sum(baseLines);

  const divisor = options.materialsDivisor ?? 1;
  if (divisor <= 0) {
    warnings.push("Batch yield must be greater than zero.");
  }
  const materialLines = inputs.materials.map((m) => ({
    label: m.name || "Material",
    amount: safeDiv(num(m.unitCost) * num(m.qty), divisor),
  }));
  const materialsCost = sum(materialLines);

  const directCost = baseCost + materialsCost;
  const overheadLines = inputs.overheads.map((o) => {
    const value = num(o.value);
    let amount: number;
    switch (o.mode) {
      case "percent":
        amount = (directCost * value) / 100;
        break;
      case "per_order":
        amount = value / quantity;
        break;
      default:
        amount = value;
    }
    return { label: o.name || "Overhead", amount };
  });
  const overheadsCost = sum(overheadLines);
  const costPerUnit = directCost + overheadsCost;

  const profitValue = num(inputs.profit.value);
  let rawPrice: number;
  switch (inputs.profit.mode) {
    case "markup":
      rawPrice = costPerUnit * (1 + profitValue / 100);
      break;
    case "margin":
      if (profitValue >= 100) {
        warnings.push("Margin must be below 100% of the selling price.");
        rawPrice = costPerUnit;
      } else {
        rawPrice = costPerUnit / (1 - profitValue / 100);
      }
      break;
    case "fixed":
      rawPrice = costPerUnit + profitValue;
      break;
    case "multiplier":
      rawPrice = costPerUnit * profitValue;
      break;
    case "target":
      rawPrice = profitValue;
      break;
    default:
      rawPrice = costPerUnit;
  }

  const pricePerUnit = roundPrice(rawPrice, inputs.rounding);
  const profitPerUnit = pricePerUnit - costPerUnit;
  if (profitPerUnit < 0) {
    warnings.push("Selling price is below cost — this quote loses money.");
  }

  const subtotal = pricePerUnit * quantity;
  const discount = discountAmount(subtotal, inputs.discount);
  const taxable = subtotal - discount;
  const tax = (taxable * num(inputs.taxPercent)) / 100;
  const orderCost = costPerUnit * quantity;

  return {
    baseLines,
    baseCost,
    materialLines,
    materialsCost,
    overheadLines,
    overheadsCost,
    costPerUnit,
    profitPerUnit,
    priceBeforeRounding: rawPrice,
    pricePerUnit,
    markupPercent: safeDiv(profitPerUnit, costPerUnit) * 100,
    marginPercent: safeDiv(profitPerUnit, pricePerUnit) * 100,
    quantity,
    subtotal,
    discount,
    taxable,
    tax,
    total: taxable + tax,
    orderCost,
    orderProfit: taxable - orderCost,
    warnings,
  };
}
