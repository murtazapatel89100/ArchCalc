import { describe, expect, it } from "vitest";
import { computeQuote, roundPrice } from "./engine";
import type { QuoteInputs } from "./types";

const inputs = (overrides: Partial<QuoteInputs> = {}): QuoteInputs => ({
  fields: {},
  materials: [],
  overheads: [],
  profit: { mode: "markup", value: 0 },
  quantity: 1,
  discount: { mode: "percent", value: 0 },
  taxPercent: 0,
  rounding: "none",
  ...overrides,
});

const base = (amount: number) => ({
  baseLines: [{ label: "Base", amount }],
});

describe("computeQuote", () => {
  it("prices a 3D print plate per item", () => {
    // ₹1200 / 1000 g spool, 80 g plate, 4 items → ₹24 filament per item
    const filament = (80 * 1200) / 1000 / 4;
    const r = computeQuote(
      inputs({
        materials: [{ id: "1", name: "Keyring", unitCost: 4, qty: 1 }],
      }),
      base(filament),
    );
    expect(filament).toBe(24);
    expect(r.costPerUnit).toBe(28);
  });

  it("applies each overhead mode", () => {
    const r = computeQuote(
      inputs({
        quantity: 10,
        overheads: [
          { id: "a", name: "Power", mode: "percent", value: 10 },
          { id: "b", name: "Labour", mode: "per_item", value: 5 },
          { id: "c", name: "Setup", mode: "per_order", value: 50 },
        ],
      }),
      base(100),
    );
    expect(r.overheadLines.map((l) => l.amount)).toEqual([10, 5, 5]);
    expect(r.costPerUnit).toBe(120);
  });

  it.each([
    ["markup", 50, 150],
    ["margin", 50, 200],
    ["fixed", 30, 130],
    ["multiplier", 2.5, 250],
    ["target", 180, 180],
  ] as const)("profit mode %s", (mode, value, price) => {
    const r = computeQuote(inputs({ profit: { mode, value } }), base(100));
    expect(r.pricePerUnit).toBeCloseTo(price);
    expect(r.profitPerUnit).toBeCloseTo(price - 100);
  });

  it("guards margin of 100% or more", () => {
    const r = computeQuote(
      inputs({ profit: { mode: "margin", value: 100 } }),
      base(100),
    );
    expect(r.pricePerUnit).toBe(100);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("warns when the price is below cost", () => {
    const r = computeQuote(
      inputs({ profit: { mode: "target", value: 80 } }),
      base(100),
    );
    expect(r.profitPerUnit).toBe(-20);
    expect(r.warnings.some((w) => w.includes("below cost"))).toBe(true);
  });

  it("applies discount then tax across the order", () => {
    const r = computeQuote(
      inputs({
        quantity: 4,
        profit: { mode: "fixed", value: 0 },
        discount: { mode: "percent", value: 10 },
        taxPercent: 18,
      }),
      base(100),
    );
    expect(r.subtotal).toBe(400);
    expect(r.discount).toBe(40);
    expect(r.tax).toBeCloseTo(64.8);
    expect(r.total).toBeCloseTo(424.8);
  });

  it("caps a fixed discount at the subtotal", () => {
    const r = computeQuote(
      inputs({ discount: { mode: "fixed", value: 500 } }),
      base(100),
    );
    expect(r.discount).toBe(100);
    expect(r.total).toBe(0);
  });

  it("spreads per-batch materials by the divisor and survives a zero divisor", () => {
    const material = [{ id: "1", name: "Flour", unitCost: 60, qty: 2 }];
    expect(
      computeQuote(inputs({ materials: material }), {
        baseLines: [],
        materialsDivisor: 12,
      }).materialsCost,
    ).toBe(10);
    const zero = computeQuote(inputs({ materials: material }), {
      baseLines: [],
      materialsDivisor: 0,
    });
    expect(zero.materialsCost).toBe(0);
    expect(zero.warnings.length).toBeGreaterThan(0);
  });

  it("treats invalid numbers and quantity as safe defaults", () => {
    const r = computeQuote(inputs({ quantity: 0 }), base(Number.NaN));
    expect(r.quantity).toBe(1);
    expect(r.costPerUnit).toBe(0);
    expect(r.marginPercent).toBe(0);
  });
});

describe("roundPrice", () => {
  it.each([
    ["none", 123.4, 123.4],
    ["1", 123.4, 124],
    ["5", 121, 125],
    ["10", 121, 130],
    ["10", 120, 120],
    ["end9", 121, 129],
    ["end9", 129, 129],
    ["end9", 129.5, 139],
  ] as const)("%s rounds %d to %d", (mode, price, expected) => {
    expect(roundPrice(price, mode)).toBe(expected);
  });
});
