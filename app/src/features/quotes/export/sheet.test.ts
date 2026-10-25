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
const { buildSheet, renderCsv } = await import("./sheet");
const { buildExportDoc } = await import("./document");
const { resultFor } = await import("../result");
const { defaultInputs, defaultQuoteSettings } = await import("../store");
const { markdownToLines } = await import("./markdown-plain");

/**
 * Evaluate the small subset of Excel used by the sheet: cell refs, + - * / ( ),
 * IFERROR, IF, MIN, MAX, INT, CEILING and SUM over a single column range.
 */
function evaluate(formula: string, cells: Map<string, number>): number {
  const expr = formula
    .replace(/SUM\(([A-D])(\d+):\1(\d+)\)/g, (_, col, a, b) => {
      const refs: string[] = [];
      for (let r = Number(a); r <= Number(b); r++) refs.push(`${col}${r}`);
      return `(${refs.join("+") || "0"})`;
    })
    .replace(/>=/g, ">=")
    .replace(/<>/g, "!=")
    .replace(/(?<![<>!=])=(?!=)/g, "==")
    .replace(/\b([A-D])(\d+)\b/g, (ref) => {
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
function recalc(rows: ReturnType<typeof buildSheet>["rows"]) {
  const cells = new Map<string, number>();
  const formulas: [string, string][] = [];
  for (const [i, row] of rows.entries()) {
    for (const [c, cell] of row.cells.entries()) {
      if (!cell) continue;
      const ref = `${"ABCD"[c]}${i + 1}`;
      if (cell.formula) formulas.push([ref, cell.formula]);
      else if (typeof cell.value === "number") cells.set(ref, cell.value);
    }
  }
  for (const [ref, f] of formulas) cells.set(ref, evaluate(f, cells));
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
    it(`${builder.id}: every formula recalculates to the engine's value`, () => {
      const { model } = sheetFor(builder);
      const cells = recalc(model.rows);
      for (const [i, row] of model.rows.entries()) {
        for (const [c, cell] of row.cells.entries()) {
          if (!cell?.formula) continue;
          const ref = `${"ABCD"[c]}${i + 1}`;
          expect(
            cells.get(ref),
            `${builder.id} ${ref} =${cell.formula}`,
          ).toBeCloseTo(cell.value as number, 6);
        }
      }
    });
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
              expect(cells.get(`${"ABCD"[c]}${i + 1}`)).toBeCloseTo(
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
          expect(cells.get(`${"ABCD"[c]}${i + 1}`)).toBeCloseTo(
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
