import { describe, expect, it, vi } from "vitest";
import type { QuoteResult } from "./types";

// combined.ts reaches builders.ts, which imports icon components; stub them for Node.
vi.mock("lucide-solid", () => new Proxy({}, { get: () => () => null }));

const { combine } = await import("./combined");

const result = (r: Partial<QuoteResult>): QuoteResult => ({
  baseLines: [],
  baseCost: 0,
  materialLines: [],
  materialsCost: 0,
  overheadLines: [],
  overheadsCost: 0,
  costPerUnit: 0,
  profitPerUnit: 0,
  priceBeforeRounding: 0,
  pricePerUnit: 0,
  markupPercent: 0,
  marginPercent: 0,
  quantity: 1,
  subtotal: 0,
  discount: 0,
  taxable: 0,
  tax: 0,
  total: 0,
  orderCost: 0,
  orderProfit: 0,
  warnings: [],
  ...r,
});

const line = (label: string, r: Partial<QuoteResult>, taxPercent: number) => ({
  id: label,
  label,
  // combine() only reads the result and tax rate.
  quote: {} as never,
  result: result(r),
  taxPercent,
});

// Black + Red: 8 × ₹50, own 10% discount, 18% tax. Blue + Black: 8 × ₹60, no discount, 12% tax.
const lines = [
  line(
    "Black + Red",
    { subtotal: 400, discount: 40, tax: 64.8, orderCost: 200 },
    18,
  ),
  line(
    "Blue + Black",
    { subtotal: 480, tax: 57.6, orderCost: 240, warnings: ["Below cost"] },
    12,
  ),
];

describe("combine", () => {
  it("applies one discount and tax rate to the combined subtotal", () => {
    const c = combine(lines, {
      mode: "order",
      discount: { mode: "percent", value: 5 },
      taxPercent: 18,
    });
    expect(c.subtotal).toBe(880);
    expect(c.discount).toBeCloseTo(44, 9);
    expect(c.taxes).toEqual([{ percent: 18, amount: (880 - 44) * 0.18 }]);
    expect(c.total).toBeCloseTo(836 * 1.18, 9);
    expect(c.orderProfit).toBeCloseTo(836 - 440, 9);
    expect(c.warnings).toEqual(["Blue + Black: Below cost"]);
  });

  it("caps a fixed order discount at the subtotal", () => {
    const c = combine(lines, {
      mode: "order",
      discount: { mode: "fixed", value: 5000 },
      taxPercent: 18,
    });
    expect(c.discount).toBe(880);
    expect(c.total).toBe(0);
  });

  it("keeps each quote's own discount and tax, grouped by rate", () => {
    const c = combine(lines, {
      mode: "each",
      discount: { mode: "percent", value: 50 }, // ignored in this mode
      taxPercent: 0,
    });
    expect(c.discount).toBe(40);
    expect(c.taxes).toEqual([
      { percent: 18, amount: 64.8 },
      { percent: 12, amount: 57.6 },
    ]);
    expect(c.total).toBeCloseTo(880 - 40 + 64.8 + 57.6, 9);
  });
});
