import { describe, expect, it, vi } from "vitest";

// builders.ts imports icon components and store.ts touches browser storage at import time;
// stub both so the modules load in Node.
vi.mock("lucide-solid", () => {
  const icon = () => null;
  return {
    Box: icon,
    CakeSlice: icon,
    Flame: icon,
    Laptop: icon,
    PaintRoller: icon,
    Printer: icon,
    Scissors: icon,
    UtensilsCrossed: icon,
  };
});
const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => memory.set(k, v),
  removeItem: (k: string) => memory.delete(k),
});
vi.stubGlobal("window", {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  localStorage: globalThis.localStorage,
});

const { builders } = await import("../builders");
const { buildSheet, buildCombinedSheet, renderCsv } = await import("./sheet");
const { buildExportDoc, buildCombinedDoc } = await import("./document");
const { resultFor } = await import("../result");
const {
  defaultInputs,
  defaultQuoteSettings,
  draftOrder,
  products,
  quoteActions,
} = await import("../store");
const { orderResult } = await import("../combined");
const { quoteToMarkdown } = await import("./markdown");
const { markdownToLines } = await import("./markdown-plain");
const { normalizeInputs, productionFor } = await import("../groups");

/**
 * Evaluate the small subset of Excel used by the sheet: cell refs, + - * / ( ),
 * IFERROR, IF, MIN, MAX, INT, CEILING and SUM over a single column range.
 */
function evaluate(
  formula: string,
  cells: Map<string, number>,
  sheets: Map<string, Map<string, number>> = new Map(),
): number {
  const expr = formula
    .replace(/'([^']+)'!([A-F]\d+)/g, (_, name, ref) => {
      const v = sheets.get(name)?.get(ref);
      if (v === undefined) throw new Error(`Missing '${name}'!${ref}`);
      return `(${v})`;
    })
    .replace(/SUM\(([A-F])(\d+):\1(\d+)\)/g, (_, col, a, b) => {
      const refs: string[] = [];
      for (let r = Number(a); r <= Number(b); r++) refs.push(`${col}${r}`);
      return `(${refs.join("+") || "0"})`;
    })
    .replace(/>=/g, ">=")
    .replace(/<>/g, "!=")
    .replace(/(?<![<>!=])=(?!=)/g, "==")
    .replace(/\b([A-F])(\d+)\b/g, (ref) => {
      if (!cells.has(ref)) throw new Error(`Missing ${ref}`);
      return `(${cells.get(ref)})`;
    });
  const fns = {
    IFERROR: (v: number, d: number) => (Number.isFinite(v) ? v : d),
    IF: (c: boolean, a: number, b: number) => (c ? a : b),
    MIN: Math.min,
    MAX: Math.max,
    INT: Math.floor,
    CEILING: (v: number, s: number) => Math.ceil(v / s - 1e-9) * s,
  };
  return Function(
    ...Object.keys(fns),
    `return (${expr});`,
  )(...Object.values(fns));
}

/** Recalculate every formula cell top-down, like a spreadsheet would. */
function recalc(
  rows: ReturnType<typeof buildSheet>["rows"],
  sheets: Map<string, Map<string, number>> = new Map(),
) {
  const cells = new Map<string, number>();
  const formulas: [string, string][] = [];
  for (const [i, row] of rows.entries()) {
    for (const [c, cell] of row.cells.entries()) {
      if (!cell) continue;
      const ref = `${"ABCDEF"[c]}${i + 1}`;
      if (cell.formula) formulas.push([ref, cell.formula]);
      else if (typeof cell.value === "number") cells.set(ref, cell.value);
    }
  }
  for (const [ref, f] of formulas) cells.set(ref, evaluate(f, cells, sheets));
  return cells;
}

const sheetFor = (
  builder: (typeof builders)[number],
  tweak?: (i: ReturnType<typeof defaultInputs>) => void,
) => {
  const inputs = defaultInputs(builder, 18);
  inputs.quantity = 7;
  inputs.discount = { mode: "percent", value: 5 };
  tweak?.(inputs);
  const quote = {
    id: "q1",
    label: "Test",
    inputs,
    notes: "",
    createdAt: 0,
    updatedAt: 0,
  };
  const product = {
    id: "p1",
    name: "Thing",
    builderId: builder.id,
    quotes: [quote],
    createdAt: 0,
  };
  const result = resultFor(builder, inputs);
  const doc = buildExportDoc(
    product,
    quote,
    result,
    builder,
    defaultQuoteSettings,
    {
      includeBreakdown: true,
    },
  );
  return {
    model: buildSheet(
      product,
      quote,
      result,
      builder,
      defaultQuoteSettings,
      doc,
    ),
    result,
  };
};

describe("spreadsheet formulas match the pricing engine", () => {
  for (const builder of builders) {
    for (const simple of [false, true]) {
      const kind = simple ? "simple" : "detailed";
      it(`${builder.id} (${kind}): every formula recalculates to the engine's value`, () => {
        const { model } = sheetFor(builder, (inp) => {
          inp.simple = simple;
        });
        const cells = recalc(model.rows);
        for (const [i, row] of model.rows.entries()) {
          for (const [c, cell] of row.cells.entries()) {
            if (!cell?.formula) continue;
            const ref = `${"ABCDEF"[c]}${i + 1}`;
            expect(
              cells.get(ref),
              `${builder.id} ${ref} =${cell.formula}`,
            ).toBeCloseTo(cell.value as number, 6);
          }
        }
      });
    }
  }

  it("covers every profit mode, rounding mode and per-order overheads", () => {
    const builder = builders[0];
    for (const mode of [
      "markup",
      "margin",
      "fixed",
      "multiplier",
      "target",
    ] as const) {
      for (const rounding of ["none", "1", "5", "10", "end9"] as const) {
        const { model } = sheetFor(builder, (inp) => {
          inp.profit = {
            mode,
            value: mode === "multiplier" ? 2.5 : mode === "target" ? 140 : 35,
          };
          inp.rounding = rounding;
          inp.discount = { mode: "fixed", value: 25 };
          inp.overheads.push({
            id: "o",
            name: "Setup",
            mode: "per_order",
            value: 300,
          });
        });
        const cells = recalc(model.rows);
        for (const [i, row] of model.rows.entries()) {
          for (const [c, cell] of row.cells.entries()) {
            if (cell?.formula) {
              expect(cells.get(`${"ABCDEF"[c]}${i + 1}`)).toBeCloseTo(
                cell.value as number,
                6,
              );
            }
          }
        }
      }
    }
  });

  it("guards zero divisors the same way the engine does", () => {
    const bakery = builders.find((b) => b.id === "bakery");
    if (!bakery) throw new Error("bakery builder missing");
    const { model, result } = sheetFor(bakery, (inp) => {
      inp.fields.batchYield = 0;
    });
    const cells = recalc(model.rows);
    expect(result.materialsCost).toBe(0);
    for (const [i, row] of model.rows.entries()) {
      for (const [c, cell] of row.cells.entries()) {
        if (cell?.formula) {
          expect(cells.get(`${"ABCDEF"[c]}${i + 1}`)).toBeCloseTo(
            cell.value as number,
            6,
          );
        }
      }
    }
  });
});

describe("CSV and notes", () => {
  it("writes a UTF-8 BOM, quotes commas and appends notes", () => {
    const { model } = sheetFor(builders[0]);
    model.notes = [{ title: "Terms", lines: ["Pay 50%, then the rest"] }];
    const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(
      renderCsv(model),
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Pay 50%, then the rest"');
    expect(csv).toContain("Order total");
  });

  it("flattens markdown notes into readable lines", () => {
    expect(
      markdownToLines("**Bold** text\n\n- one\n- two\n\n1. first\n\n> quoted"),
    ).toEqual(["Bold text", "• one", "• two", "1. first", "> quoted"]);
  });
});

describe("dynamic groups", () => {
  const print3d = () => {
    const b = builders.find((x) => x.id === "print3d");
    if (!b) throw new Error("print3d builder missing");
    return b;
  };

  it("adds every filament spool on the plate", () => {
    const { model, result } = sheetFor(print3d(), (inp) => {
      inp.groups = {
        filaments: [
          {
            id: "a",
            name: "Black",
            values: { spoolPrice: 1200, spoolWeight: 1000, grams: 60 },
          },
          {
            id: "b",
            name: "Silk Gold",
            values: { spoolPrice: 1600, spoolWeight: 1000, grams: 20 },
          },
        ],
      };
    });
    // (60 × 1.2 + 20 × 1.6) / 4 items = (72 + 32) / 4 = 26
    const filament = result.baseLines
      .filter((l) => l.label.startsWith("Filament"))
      .map((l) => l.amount);
    expect(filament).toEqual([18, 8]);
    expect(result.baseLines.map((l) => l.label)).toContain(
      "Filament: Silk Gold",
    );
    const cells = recalc(model.rows);
    for (const [i, row] of model.rows.entries()) {
      for (const [c, cell] of row.cells.entries()) {
        if (cell?.formula) {
          expect(cells.get(`${"ABCDEF"[c]}${i + 1}`)).toBeCloseTo(
            cell.value as number,
            6,
          );
        }
      }
    }
  });

  it("upgrades a single-spool quote saved before groups to the same price", () => {
    const legacy = {
      fields: {
        spoolPrice: 1200,
        spoolWeight: 1000,
        plateGrams: 80,
        itemsPerPlate: 4,
        printHours: 3,
        printerWatts: 150,
        electricityRate: 8,
        failureRate: 5,
      },
      materials: [{ id: "m", name: "Keyring", unitCost: 4, qty: 1 }],
      overheads: [],
      profit: { mode: "markup" as const, value: 60 },
      quantity: 1,
      discount: { mode: "percent" as const, value: 0 },
      taxPercent: 0,
      rounding: "none" as const,
    };
    const upgraded = normalizeInputs(print3d(), legacy);
    expect(upgraded.groups?.filaments).toHaveLength(1);
    expect(upgraded.groups?.filaments[0].values).toEqual({
      spoolPrice: 1200,
      spoolWeight: 1000,
      grams: 80,
    });
    // Old engine: filament 24 + power 0.9 + 5% failure = 26.145 base cost.
    expect(resultFor(print3d(), upgraded).baseCost).toBeCloseTo(26.145, 9);
    // Already-current inputs are returned untouched.
    expect(normalizeInputs(print3d(), upgraded)).toBe(upgraded);
  });

  it("upgrades freelance hours into a work item and keeps the revision rate", () => {
    const b = builders.find((x) => x.id === "freelance");
    if (!b) throw new Error("freelance builder missing");
    const upgraded = normalizeInputs(b, {
      ...defaultInputs(b, 0),
      fields: { hourlyRate: 900, hours: 10, revisions: 1, hoursPerRevision: 3 },
      groups: undefined,
    });
    expect(upgraded.groups?.work[0].values).toEqual({ hours: 10, rate: 900 });
    expect(upgraded.fields.revisionRate).toBe(900);
    expect(resultFor(b, upgraded).baseCost).toBe(10 * 900 + 3 * 900);
  });

  it("sums a field across rows for crafts additives", () => {
    const b = builders.find((x) => x.id === "crafts");
    if (!b) throw new Error("crafts builder missing");
    const { model, result } = sheetFor(b, (inp) => {
      inp.groups = {
        materials: [
          { id: "a", name: "Soy wax", values: { grams: 120, pricePerKg: 400 } },
          {
            id: "b",
            name: "Coconut wax",
            values: { grams: 30, pricePerKg: 900 },
          },
        ],
      };
    });
    const additive = result.baseLines.find(
      (l) => l.label === "Fragrance / colour",
    );
    // 150 g total × 8% × ₹2500/kg = ₹30
    expect(additive?.amount).toBeCloseTo(30, 9);
    const cells = recalc(model.rows);
    for (const [i, row] of model.rows.entries()) {
      for (const [c, cell] of row.cells.entries()) {
        if (cell?.formula) {
          expect(cells.get(`${"ABCDEF"[c]}${i + 1}`)).toBeCloseTo(
            cell.value as number,
            6,
          );
        }
      }
    }
  });
});

describe("simple quotes, plates and batches", () => {
  const print3d = () => {
    const b = builders.find((x) => x.id === "print3d");
    if (!b) throw new Error("print3d builder missing");
    return b;
  };
  const onePlate = (inp: ReturnType<typeof defaultInputs>) => {
    inp.groups = {
      filaments: [
        {
          id: "a",
          name: "Black",
          values: { spoolPrice: 1200, spoolWeight: 1000, grams: 80 },
        },
      ],
    };
  };
  const cellText = (model: ReturnType<typeof buildSheet>) =>
    model.rows.flatMap((r) => r.cells.map((c) => String(c?.value ?? "")));

  it("leaves out power, failure and overheads but keeps their values", () => {
    const { model, result } = sheetFor(print3d(), (inp) => {
      onePlate(inp);
      inp.simple = true;
    });
    // 80 g × ₹1.2 / 4 items = ₹24 filament + ₹4 keyring, nothing else.
    expect(result.baseLines.map((l) => l.label)).toEqual(["Filament: Black"]);
    expect(result.overheadLines).toEqual([]);
    expect(result.costPerUnit).toBeCloseTo(28, 9);
    const labels = cellText(model);
    expect(labels).not.toContain("Printer power draw (W)");
    expect(labels).not.toContain("Overheads (per item)");
    expect(labels).toContain("Plates");

    // Switching back prices the kept overheads again.
    const detailed = sheetFor(print3d(), onePlate).result;
    expect(detailed.overheadLines.length).toBeGreaterThan(0);
    expect(detailed.costPerUnit).toBeGreaterThan(result.costPerUnit);
  });

  it("orders plates × items per plate in a simple quote", () => {
    const { model, result } = sheetFor(print3d(), (inp) => {
      onePlate(inp);
      inp.simple = true;
      inp.quantity = 99; // ignored: a simple quote orders what the plates make
      inp.fields.plates = 3;
    });
    expect(result.quantity).toBe(12);
    // Plates don't change the price per item, only how many are ordered.
    expect(result.costPerUnit).toBeCloseTo(28, 9);
    const cells = recalc(model.rows);
    const qtyRow = model.rows.findIndex((r) =>
      String(r.cells[0]?.value).startsWith("Order quantity"),
    );
    expect(model.rows[qtyRow].cells[1]?.formula).toBeTruthy();
    expect(cells.get(`B${qtyRow + 1}`)).toBe(12);
    for (const [i, row] of model.rows.entries()) {
      for (const [c, cell] of row.cells.entries()) {
        if (cell?.formula) {
          expect(cells.get(`${"ABCDEF"[c]}${i + 1}`)).toBeCloseTo(
            cell.value as number,
            6,
          );
        }
      }
    }
  });

  it("adds a partly filled last plate in both quote types", () => {
    const inputs = defaultInputs(print3d(), 0);
    Object.assign(inputs.fields, {
      itemsPerPlate: 3,
      plates: 4,
      partialPlate: 2,
    });
    inputs.quantity = 14;
    // Detailed: 4 × 3 + 2 = 14 covers the order exactly.
    expect(productionFor(print3d(), inputs)).toMatchObject({
      made: 14,
      spare: 0,
      short: 0,
      explain: "4 plates × 3 per plate + 1 plate of 2",
    });
    // Simple: the partial plate is part of the order quantity, and the sheet agrees.
    const { model, result } = sheetFor(print3d(), (inp) => {
      inp.simple = true;
      Object.assign(inp.fields, inputs.fields);
    });
    expect(result.quantity).toBe(14);
    const cells = recalc(model.rows);
    for (const [i, row] of model.rows.entries()) {
      for (const [c, cell] of row.cells.entries()) {
        if (cell?.formula) {
          expect(cells.get(`${"ABCDEF"[c]}${i + 1}`)).toBeCloseTo(
            cell.value as number,
            6,
          );
        }
      }
    }
  });

  it("shows spare items or a shortfall in a detailed quote", () => {
    const inputs = defaultInputs(print3d(), 0);
    inputs.fields.plates = 3;
    inputs.quantity = 10;
    expect(productionFor(print3d(), inputs)).toMatchObject({
      made: 12,
      spare: 2,
      short: 0,
    });
    expect(resultFor(print3d(), inputs).quantity).toBe(10);
    expect(resultFor(print3d(), inputs).warnings).toEqual([]);

    inputs.quantity = 14;
    expect(productionFor(print3d(), inputs)?.short).toBe(2);
    expect(resultFor(print3d(), inputs).warnings).toContain(
      "3 plates × 4 per plate makes 12 — 2 short of the order.",
    );
  });

  it("gives older quotes enough plates or batches for their order, at the same price", () => {
    for (const [id, key, quantity, expected] of [
      ["print3d", "plates", 10, 3],
      ["bakery", "batches", 30, 3],
    ] as const) {
      const b = builders.find((x) => x.id === id);
      if (!b) throw new Error(`${id} builder missing`);
      const inputs = defaultInputs(b, 0);
      inputs.quantity = quantity;
      const before = resultFor(b, inputs).total;
      delete inputs.fields[key];
      const upgraded = normalizeInputs(b, inputs);
      expect(upgraded.fields[key]).toBe(expected);
      expect(resultFor(b, upgraded).total).toBeCloseTo(before, 9);
      expect(resultFor(b, upgraded).warnings).toEqual([]);
    }
  });
});

describe("client orders", () => {
  const print3d = () => {
    const b = builders.find((x) => x.id === "print3d");
    if (!b) throw new Error("print3d builder missing");
    return b;
  };
  const colourways = () => {
    const b = print3d();
    const product = quoteActions.createProduct("Keychain", b, 18);
    const quotes = [
      ["Black + Red", 1200],
      ["Blue + Black", 1500],
      ["Black + White", 1300],
    ] as const;
    product.quotes.length = 0;
    for (const [label, spoolPrice] of quotes) {
      const inputs = defaultInputs(b, 18);
      inputs.groups = {
        filaments: [
          {
            id: label,
            name: label,
            values: { spoolPrice, spoolWeight: 1000, grams: 80 },
          },
        ],
      };
      inputs.fields.plates = 2;
      inputs.quantity = 8;
      product.quotes.push({
        id: label,
        label,
        inputs,
        notes: "",
        createdAt: 0,
        updatedAt: 0,
      });
    }
    return product;
  };

  for (const taxMode of ["order", "each"] as const) {
    it(`builds a live workbook for a ${taxMode}-level discount and tax`, () => {
      const b = print3d();
      const product = colourways();
      // Make the quotes' own discounts and tax rates differ.
      product.quotes[0].inputs.discount = { mode: "percent", value: 10 };
      product.quotes[1].inputs.taxPercent = 12;
      const order = {
        ...draftOrder(
          product.quotes.map((q) => q.id),
          18,
          "Diwali order",
        ),
        taxMode,
        client: "Asha Traders",
        discount: { mode: "fixed" as const, value: 100 },
      };
      const combined = orderResult(b, product, order);
      expect(combined.lines.map((l) => l.label)).toEqual([
        "Black + Red",
        "Blue + Black",
        "Black + White",
      ]);
      const doc = buildCombinedDoc(
        product,
        order,
        combined,
        b,
        defaultQuoteSettings,
        { includeBreakdown: true },
      );
      const model = buildCombinedSheet(
        product,
        order,
        combined,
        b,
        defaultQuoteSettings,
        doc,
      );
      expect(model.sheetName).toBe("Summary");
      expect(model.extraSheets.map((x) => x.name)).toEqual([
        "Black + Red",
        "Blue + Black",
        "Black + White",
      ]);
      const sheets = new Map(
        model.extraSheets.map((x) => [x.name, recalc(x.rows)]),
      );
      const cells = recalc(model.rows, sheets);
      for (const [i, row] of model.rows.entries()) {
        for (const [c, cell] of row.cells.entries()) {
          if (cell?.formula) {
            expect(
              cells.get(`${"ABCDEF"[c]}${i + 1}`),
              `Summary ${"ABCDEF"[c]}${i + 1} =${cell.formula}`,
            ).toBeCloseTo(cell.value as number, 6);
          }
        }
      }
      const totalRow = model.rows.findIndex((r) => r.kind === "total");
      expect(cells.get(`F${totalRow + 1}`)).toBeCloseTo(combined.total, 6);
    });
  }

  it("writes a real workbook with a summary and a sheet per quote", async () => {
    const b = print3d();
    const product = colourways();
    const order = draftOrder(
      product.quotes.map((q) => q.id),
      18,
      "Diwali order",
    );
    const combined = orderResult(b, product, order);
    const doc = buildCombinedDoc(
      product,
      order,
      combined,
      b,
      defaultQuoteSettings,
      { includeBreakdown: true },
    );
    const model = buildCombinedSheet(
      product,
      order,
      combined,
      b,
      defaultQuoteSettings,
      doc,
    );
    const { renderXlsx } = await import("./sheet");
    const { getTemplate } = await import("./templates");
    const bytes = await renderXlsx(model, getTemplate("classic"));
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Summary",
      "Black + Red",
      "Blue + Black",
      "Black + White",
    ]);
    const lineRow = model.rows.findIndex((r) =>
      String(r.cells[0]?.value).endsWith("Black + Red"),
    );
    const price = wb.getWorksheet("Summary")?.getCell(`C${lineRow + 1}`).value;
    expect(price).toMatchObject({
      formula: expect.stringMatching(/^'Black \+ Red'!F\d+$/),
    });
  });

  it("puts every quote's sheet in the CSV after the summary", () => {
    const b = print3d();
    const product = colourways();
    const order = draftOrder(
      product.quotes.map((q) => q.id),
      18,
      "Diwali order",
    );
    const combined = orderResult(b, product, order);
    const doc = buildCombinedDoc(
      product,
      order,
      combined,
      b,
      defaultQuoteSettings,
      { includeBreakdown: true },
    );
    const csv = new TextDecoder().decode(
      renderCsv(
        buildCombinedSheet(
          product,
          order,
          combined,
          b,
          defaultQuoteSettings,
          doc,
        ),
      ),
    );
    const summaryAt = csv.indexOf("Order total");
    for (const label of ["Black + Red", "Blue + Black", "Black + White"]) {
      // The sheet's own heading line, then its filament breakdown.
      const at = csv.indexOf(`\r\n${label}\r\n`);
      expect(at).toBeGreaterThan(summaryAt);
      expect(csv.indexOf("Filaments (per item)", at)).toBeGreaterThan(at);
    }
  });

  it("writes one line per quote and a breakdown for each", () => {
    const b = print3d();
    const product = colourways();
    const order = {
      ...draftOrder(
        product.quotes.map((q) => q.id),
        18,
        "Diwali order",
      ),
      client: "Asha Traders",
    };
    const combined = orderResult(b, product, order);
    const md = quoteToMarkdown(
      buildCombinedDoc(product, order, combined, b, defaultQuoteSettings, {
        includeBreakdown: true,
      }),
    );
    expect(md).toContain("| Client | Asha Traders |");
    for (const label of ["Black + Red", "Blue + Black", "Black + White"]) {
      expect(md).toContain(`| Keychain — ${label} | 8 |`);
      expect(md).toContain(`## Cost breakdown — ${label} (per item)`);
    }
    expect(md.match(/\*\*Total\*\*/g)).toHaveLength(1);
  });

  it("drops a deleted quote from its client orders", () => {
    const b = print3d();
    const created = quoteActions.createProduct("Coaster", b, 0);
    const second = quoteActions.addQuote(created.id, b, 0);
    if (!second) throw new Error("addQuote failed");
    const ids = [created.quotes[0].id, second.id];
    const saved = quoteActions.saveOrder(
      created.id,
      draftOrder(ids, 0, "Order 1"),
    );
    if (!saved) throw new Error("saveOrder failed");
    quoteActions.deleteQuote(created.id, second.id);
    const product = products.find((p) => p.id === created.id);
    expect(product?.orders?.[0].quoteIds).toEqual([created.quotes[0].id]);
  });
});
