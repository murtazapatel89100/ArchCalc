import type { FieldKind, QuoteBuilder } from "../builders";
import { num } from "../engine";
import { currencySymbol } from "../format";
import {
  extraLinesFor,
  fieldsFor,
  groupRows,
  groupTotals,
  pricedInputs,
  rowCost,
} from "../groups";
import type { Product, Quote, QuoteResult, QuoteSettings } from "../types";
import type { ExportDoc } from "./document";
import { markdownToLines } from "./markdown-plain";
import type { ExportTemplate } from "./templates";

export type CellFormat = "money" | "percent" | "fraction" | "number" | "text";

export interface SheetCell {
  /** Display / cached value (what the engine computed). */
  value: string | number;
  /** Excel formula without the leading "=", for live cells. */
  formula?: string;
  format?: CellFormat;
  /** Inputs the user can change in the spreadsheet; highlighted. */
  input?: boolean;
  bold?: boolean;
}

export type RowKind =
  | "title"
  | "subtitle"
  | "hint"
  | "section"
  | "header"
  | "row"
  | "subtotal"
  | "total"
  | "blank";

export interface SheetRow {
  kind: RowKind;
  /** Columns A–F. */
  cells: (SheetCell | null)[];
}

export interface SheetModel {
  name: string;
  rows: SheetRow[];
  notes: { title: string; lines: string[] }[];
  currencySymbol: string;
}

const COLS = ["A", "B", "C", "D", "E", "F"] as const;
/** Amounts always go in the last column. */
const AMT = "F";
const text = (value: string, extra: Partial<SheetCell> = {}): SheetCell => ({
  value,
  format: "text",
  ...extra,
});

const fieldFormat = (kind: FieldKind): CellFormat =>
  kind === "currency" ? "money" : kind === "percent" ? "percent" : "number";

const roundingLabels: Record<string, string> = {
  none: "No rounding",
  "1": "Round up to 1",
  "5": "Round up to 5",
  "10": "Round up to 10",
  end9: "Charm price (…9)",
};
const profitLabels: Record<string, string> = {
  markup: "Markup % on cost",
  margin: "Margin % of price",
  fixed: "Fixed profit per unit",
  multiplier: "Multiplier (×)",
  target: "Target selling price",
};

/**
 * Lay the quote out as a spreadsheet: inputs at the top (highlighted, editable), then every cost
 * as a formula referencing them, so changing a quantity or rate in Excel recalculates the quote.
 */
export function buildSheet(
  product: Product,
  quote: Quote,
  result: QuoteResult,
  builder: QuoteBuilder,
  settings: QuoteSettings,
  doc: ExportDoc,
): SheetModel {
  const rows: SheetRow[] = [];
  /** All six columns (A–F). Returns the 1-based Excel row number. */
  const pushWide = (kind: RowKind, ...cells: (SheetCell | null)[]) => {
    rows.push({ kind, cells });
    return rows.length;
  };
  /** Columns A, B, C and the amount column (F) — the common layout. */
  const push = (
    kind: RowKind,
    a: SheetCell | null = null,
    b: SheetCell | null = null,
    c: SheetCell | null = null,
    amount: SheetCell | null = null,
  ) => pushWide(kind, a, b, c, null, null, amount);
  const ref = (col: (typeof COLS)[number], row: number) => `${col}${row}`;
  const inputs = pricedInputs(builder, quote.inputs);
  const unit = builder.unitLabel;
  const totals = groupTotals(builder, inputs);

  push("title", text(doc.businessName || "Quotation"));
  push("subtitle", text(doc.contact || `${builder.name} quote`));
  push(
    "hint",
    text("Yellow cells are inputs — change them and every total recalculates."),
  );
  push("blank");

  push("section", text("Quotation"));
  push("row", text("Reference"), text(doc.reference));
  push("row", text("Date"), text(doc.date));
  push("row", text("Product"), text(product.name));
  push("row", text("Variant"), text(quote.label));
  push("blank");

  // --- Pricing inputs -------------------------------------------------------------------------
  push("section", text("Pricing inputs"));
  const qtyRow = push("row", text(`Order quantity (${unit}s)`), {
    value: result.quantity,
    format: "number",
    input: true,
  });
  const qty = `MAX(1,INT(${ref("B", qtyRow)}))`;
  const profitIsPct =
    inputs.profit.mode === "markup" || inputs.profit.mode === "margin";
  const profitRow = push(
    "row",
    text(`Profit — ${profitLabels[inputs.profit.mode]}`),
    {
      value: inputs.profit.value,
      format: profitIsPct
        ? "percent"
        : inputs.profit.mode === "multiplier"
          ? "number"
          : "money",
      input: true,
    },
  );
  const discountRow = push(
    "row",
    text(
      inputs.discount.mode === "percent" ? "Discount (%)" : "Discount (fixed)",
    ),
    {
      value: inputs.discount.value,
      format: inputs.discount.mode === "percent" ? "percent" : "money",
      input: true,
    },
  );
  const taxRow = push("row", text("Tax / GST (%)"), {
    value: inputs.taxPercent,
    format: "percent",
    input: true,
  });
  push("row", text("Price rounding"), text(roundingLabels[inputs.rounding]));
  push("blank");

  // --- Builder inputs -------------------------------------------------------------------------
  push("section", text(`${builder.name} settings`));
  const fieldRow = new Map<string, number>();
  for (const fd of fieldsFor(builder, inputs)) {
    const label = fd.suffix ? `${fd.label} (${fd.suffix})` : fd.label;
    fieldRow.set(
      fd.key,
      push("row", text(label), {
        value: inputs.fields[fd.key] ?? fd.default,
        format: fieldFormat(fd.kind),
        input: true,
      }),
    );
  }
  push("blank");

  // --- Groups (spools, fabrics, surfaces…) ----------------------------------------------------
  // Formulas of lines a simple quote drops still get built; they may name hidden detailed
  // fields and lines, which must never reach a priced cell.
  const HIDDEN = "#HIDDEN";
  const fieldRef = (key: string) => {
    const r = fieldRow.get(key);
    if (r) return ref("B", r);
    if (builder.fields.some((fd) => fd.key === key && fd.detailed)) {
      return HIDDEN;
    }
    throw new Error(`Unknown field ${key} in ${builder.id} formulas`);
  };
  // Simple quotes order exactly what the inputs make, so the quantity follows them live.
  if (inputs.simple && builder.produces) {
    rows[qtyRow - 1].cells[1] = {
      value: result.quantity,
      formula: builder.produces.formula(fieldRef),
      format: "number",
    };
  }
  const groupCostRef = new Map<string, string>();
  const groupRange = new Map<string, { start: number; end: number }>();
  const groupCols = new Map<string, Map<string, (typeof COLS)[number]>>();
  for (const g of builder.groups ?? []) {
    const cols = new Map(
      g.fields.map((fd, i) => [fd.key, COLS[i + 1]] as const),
    );
    groupCols.set(g.key, cols);
    push("section", text(`${g.title} (per ${unit})`));
    pushWide(
      "header",
      text(g.itemLabel),
      ...g.fields.map((fd) =>
        text(fd.suffix ? `${fd.label} (${fd.suffix})` : fd.label),
      ),
      ...Array(4 - g.fields.length).fill(null),
      text("Amount"),
    );
    const start = rows.length + 1;
    for (const row of groupRows(inputs, g.key)) {
      const r = rows.length + 1;
      pushWide(
        "row",
        text(row.name || g.itemLabel),
        ...g.fields.map((fd) => ({
          value: num(row.values[fd.key]),
          format: fieldFormat(fd.kind),
          input: true,
        })),
        ...Array(4 - g.fields.length).fill(null),
        {
          value: rowCost(g, row, inputs),
          formula: g.rowFormula((key) => `${cols.get(key)}${r}`, fieldRef),
          format: "money",
        },
      );
    }
    const end = rows.length;
    groupRange.set(g.key, { start, end });
    const sub = push("subtotal", text(g.title), null, null, {
      value: totals.cost(g.key),
      formula: end >= start ? `SUM(F${start}:F${end})` : "0",
      format: "money",
    });
    groupCostRef.set(g.key, ref(AMT, sub));
    push("blank");
  }

  // --- Base cost --------------------------------------------------------------------------------
  push("section", text(`Base cost (per ${unit})`));
  push("header", text("Component"), null, null, text("Amount"));
  const baseStart = rows.length + 1;
  for (const g of builder.groups ?? []) {
    push("row", text(g.title), null, null, {
      value: totals.cost(g.key),
      formula: groupCostRef.get(g.key),
      format: "money",
    });
  }
  const extraStart = rows.length + 1;
  const extraLines = extraLinesFor(builder, inputs);
  // Row of each priced line by its `baseCost` index; simple quotes skip detailed lines.
  const lineRow = new Map(
    extraLines.map(({ index }, i) => [index, extraStart + i]),
  );
  const formulas = builder.baseFormulas(
    fieldRef,
    // Extra lines are laid out consecutively from extraStart, so later lines can refer back.
    (i) => {
      const r = lineRow.get(i);
      return r ? ref(AMT, r) : HIDDEN;
    },
    {
      cost: (key) => groupCostRef.get(key) ?? "0",
      sum: (key, field) => {
        const range = groupRange.get(key);
        const col = groupCols.get(key)?.get(field);
        return range && col && range.end >= range.start
          ? `SUM(${col}${range.start}:${col}${range.end})`
          : "0";
      },
    },
  );
  for (const { line, index } of extraLines) {
    if (formulas[index].includes(HIDDEN)) {
      throw new Error(
        `${builder.id} line "${line.label}" uses a detailed field or line`,
      );
    }
    push("row", text(line.label), null, null, {
      value: line.amount,
      formula: formulas[index],
      format: "money",
    });
  }
  const baseSub = push("subtotal", text("Base cost"), null, null, {
    value: result.baseCost,
    formula:
      rows.length >= baseStart ? `SUM(F${baseStart}:F${rows.length})` : "0",
    format: "money",
  });
  push("blank");

  // --- Materials -------------------------------------------------------------------------------
  const divisorRow = builder.materialsDivisorField
    ? fieldRow.get(builder.materialsDivisorField)
    : undefined;
  push(
    "section",
    text(
      divisorRow
        ? `Raw materials (per batch, spread across ${unit}s)`
        : `Raw materials (per ${unit})`,
    ),
  );
  push("header", text("Name"), text("Qty"), text("Unit cost"), text("Amount"));
  const matStart = rows.length + 1;
  inputs.materials.forEach((m, i) => {
    const r = rows.length + 1;
    const amount = `${ref("B", r)}*${ref("C", r)}`;
    push(
      "row",
      text(m.name || "Material"),
      { value: m.qty, format: "number", input: true },
      { value: m.unitCost, format: "money", input: true },
      {
        value: result.materialLines[i]?.amount ?? 0,
        formula: divisorRow
          ? `IFERROR(${amount}/${ref("B", divisorRow)},0)`
          : amount,
        format: "money",
      },
    );
  });
  const matSub = push("subtotal", text("Materials"), null, null, {
    value: result.materialsCost,
    formula: inputs.materials.length
      ? `SUM(F${matStart}:F${rows.length})`
      : "0",
    format: "money",
  });
  push("blank");

  // --- Overheads (left out of simple quotes) ---------------------------------------------------
  let ovSub: number | undefined;
  if (!inputs.simple) {
    push("section", text(`Overheads (per ${unit})`));
    push("header", text("Name"), text("Type"), text("Value"), text("Amount"));
    const ovStart = rows.length + 1;
    inputs.overheads.forEach((o, i) => {
      const r = rows.length + 1;
      const v = ref("C", r);
      const formula =
        o.mode === "percent"
          ? `${v}/100*(${ref(AMT, baseSub)}+${ref(AMT, matSub)})`
          : o.mode === "per_order"
            ? `${v}/${qty}`
            : v;
      push(
        "row",
        text(o.name || "Overhead"),
        text(
          o.mode === "percent"
            ? "% of cost"
            : o.mode === "per_order"
              ? "Fixed per order"
              : "Fixed per item",
        ),
        {
          value: o.value,
          format: o.mode === "percent" ? "percent" : "money",
          input: true,
        },
        {
          value: result.overheadLines[i]?.amount ?? 0,
          formula,
          format: "money",
        },
      );
    });
    ovSub = push("subtotal", text("Overheads"), null, null, {
      value: result.overheadsCost,
      formula: inputs.overheads.length
        ? `SUM(F${ovStart}:F${rows.length})`
        : "0",
      format: "money",
    });
    push("blank");
  }

  // --- Summary --------------------------------------------------------------------------------
  push("section", text("Summary"));
  const C = (r: number) => ref(AMT, r);
  const costRow = push(
    "row",
    text(`Cost per ${unit}`, { bold: true }),
    null,
    null,
    {
      value: result.costPerUnit,
      formula: [baseSub, matSub, ovSub]
        .filter((r) => r !== undefined)
        .map(C)
        .join("+"),
      format: "money",
      bold: true,
    },
  );
  const cost = C(costRow);
  const pv = ref("B", profitRow);
  const rawFormula = {
    markup: `${cost}*(1+${pv}/100)`,
    margin: `IF(${pv}>=100,${cost},${cost}/(1-${pv}/100))`,
    fixed: `${cost}+${pv}`,
    multiplier: `${cost}*${pv}`,
    target: pv,
  }[inputs.profit.mode];
  const rawRow = push("row", text("Price before rounding"), null, null, {
    value: result.priceBeforeRounding,
    formula: rawFormula,
    format: "money",
  });
  const raw = C(rawRow);
  const roundFormula =
    inputs.rounding === "none"
      ? raw
      : inputs.rounding === "end9"
        ? `IF(${raw}<=0,${raw},IF(CEILING(${raw},10)-1>=${raw},CEILING(${raw},10)-1,CEILING(${raw},10)+9))`
        : `IF(${raw}<=0,${raw},CEILING(${raw},${inputs.rounding}))`;
  const priceRow = push(
    "row",
    text(`Price per ${unit}`, { bold: true }),
    null,
    null,
    {
      value: result.pricePerUnit,
      formula: roundFormula,
      format: "money",
      bold: true,
    },
  );
  const price = C(priceRow);
  const profitPerUnitRow = push("row", text(`Profit per ${unit}`), null, null, {
    value: result.profitPerUnit,
    formula: `${price}-${cost}`,
    format: "money",
  });
  push("row", text("Margin"), null, null, {
    value: result.marginPercent / 100,
    formula: `IF(${price}>0,${C(profitPerUnitRow)}/${price},0)`,
    format: "fraction",
  });
  const subtotalRow = push("row", text("Subtotal"), null, null, {
    value: result.subtotal,
    formula: `${price}*${qty}`,
    format: "money",
  });
  const sub = C(subtotalRow);
  const dv = ref("B", discountRow);
  const discountRowOut = push("row", text("Discount"), null, null, {
    value: result.discount,
    formula:
      inputs.discount.mode === "percent"
        ? `MIN(${sub},MAX(0,${sub}*${dv}/100))`
        : `MIN(${sub},MAX(0,${dv}))`,
    format: "money",
  });
  const taxOut = push("row", text("Tax / GST"), null, null, {
    value: result.tax,
    formula: `(${sub}-${C(discountRowOut)})*${ref("B", taxRow)}/100`,
    format: "money",
  });
  push("total", text("Order total"), null, null, {
    value: result.total,
    formula: `${sub}-${C(discountRowOut)}+${C(taxOut)}`,
    format: "money",
    bold: true,
  });
  push("row", text("Order profit"), null, null, {
    value: result.orderProfit,
    formula: `${sub}-${C(discountRowOut)}-${cost}*${qty}`,
    format: "money",
  });

  const notes = [
    ...(doc.notes
      ? [{ title: "Notes", lines: markdownToLines(doc.notes) }]
      : []),
    ...doc.sections.map((sec) => ({
      title: sec.title || "Additional notes",
      lines: markdownToLines(sec.body),
    })),
  ];

  return {
    name: `${product.name} — ${quote.label}`,
    rows,
    notes,
    currencySymbol: currencySymbol(settings.currency),
  };
}

// ------------------------------------------------------------------------------------------------
// Writers
// ------------------------------------------------------------------------------------------------

const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;
const INPUT_FILL = "FFFFF4D6";

export async function renderXlsx(
  model: SheetModel,
  t: ExportTemplate,
): Promise<Uint8Array> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "ArchCalc Quote Studio";
  wb.created = new Date();

  const ws = wb.addWorksheet("Quote", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  ws.columns = [
    { width: 40 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ];

  const sym = model.currencySymbol.replace(/"/g, "");
  const formats: Record<CellFormat, string | undefined> = {
    money: `"${sym}"#,##0.00;-"${sym}"#,##0.00`,
    percent: '0.##"%"',
    fraction: "0.0%",
    number: "#,##0.###",
    text: undefined,
  };
  const thin = { style: "thin" as const, color: { argb: argb(t.border) } };

  model.rows.forEach((row, i) => {
    const r = ws.getRow(i + 1);
    row.cells.forEach((cell, c) => {
      if (!cell) return;
      const target = r.getCell(c + 1);
      target.value = cell.formula
        ? { formula: cell.formula, result: cell.value as number }
        : cell.value;
      const fmt = cell.format ? formats[cell.format] : undefined;
      if (fmt) target.numFmt = fmt;
      if (cell.bold) target.font = { bold: true };
      if (cell.input) {
        target.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: INPUT_FILL },
        };
        target.border = { top: thin, bottom: thin, left: thin, right: thin };
      }
      if (c > 0 && (cell.format !== "text" || row.kind === "header"))
        target.alignment = { horizontal: "right" };
    });

    const fillRow = (
      color: string,
      fontColor: string,
      bold = true,
      size?: number,
    ) => {
      for (let c = 1; c <= 6; c++) {
        const cell = r.getCell(c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: argb(color) },
        };
        cell.font = { bold, color: { argb: argb(fontColor) }, size };
      }
    };
    switch (row.kind) {
      case "title":
        r.getCell(1).font = {
          bold: true,
          size: 18,
          color: { argb: argb(t.accent) },
        };
        r.height = 28;
        break;
      case "subtitle":
        r.getCell(1).font = { color: { argb: argb(t.muted) } };
        break;
      case "hint":
        r.getCell(1).font = {
          italic: true,
          size: 9,
          color: { argb: argb(t.muted) },
        };
        break;
      case "section":
        fillRow(t.accent, t.accentText, true, 12);
        r.height = 20;
        break;
      case "header":
        fillRow(t.stripe, t.text);
        break;
      case "subtotal":
        for (let c = 1; c <= 6; c++) {
          const cell = r.getCell(c);
          cell.border = { top: thin };
          cell.font = { bold: true, color: { argb: argb(t.text) } };
        }
        break;
      case "total":
        fillRow(
          t.bandBg === "#FFFFFF" ? t.accent : t.bandBg,
          t.bandBg === "#FFFFFF" ? t.accentText : t.bandText,
          true,
          12,
        );
        r.height = 22;
        break;
    }
  });

  if (model.notes.length) {
    const ns = wb.addWorksheet("Notes", { views: [{ showGridLines: false }] });
    ns.getColumn(1).width = 100;
    for (const sec of model.notes) {
      const head = ns.addRow([sec.title]);
      head.getCell(1).font = {
        bold: true,
        size: 12,
        color: { argb: argb(t.accentText) },
      };
      head.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: argb(t.accent) },
      };
      for (const line of sec.lines) {
        ns.addRow([line]).getCell(1).alignment = {
          wrapText: true,
          vertical: "top",
        };
      }
      ns.addRow([]);
    }
  }

  return new Uint8Array(await wb.xlsx.writeBuffer());
}

const csvCell = (cell: SheetCell | null) => {
  if (!cell) return "";
  const v =
    typeof cell.value === "number"
      ? cell.format === "fraction"
        ? `${(cell.value * 100).toFixed(2)}%`
        : String(Number.parseFloat(cell.value.toFixed(4)))
      : cell.value;
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

/** Values only (CSV has no formulas or styling); notes are appended at the end. */
export function renderCsv(model: SheetModel): Uint8Array {
  const lines = model.rows.map((row) =>
    [0, 1, 2, 3, 4, 5].map((c) => csvCell(row.cells[c] ?? null)).join(","),
  );
  for (const sec of model.notes) {
    lines.push("", csvCell(text(sec.title)));
    for (const line of sec.lines) lines.push(csvCell(text(line)));
  }
  // BOM so Excel opens UTF-8 (₹, —) correctly.
  return new TextEncoder().encode(`﻿${lines.join("\r\n")}\r\n`);
}
