import {
  Box,
  CakeSlice,
  Flame,
  Laptop,
  PaintRoller,
  Printer,
  Scissors,
  UtensilsCrossed,
} from "lucide-solid";
import type { Component } from "solid-js";
import { num, safeDiv } from "./engine";
import type { CostLine, MaterialLine, OverheadLine, ProfitMode } from "./types";

export type FieldKind = "currency" | "number" | "percent";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** Unit shown after the input for `number` fields, e.g. "g" or "hrs". */
  suffix?: string;
  default: number;
  hint?: string;
}

type Fields = Record<string, number>;

export interface GroupRowInit {
  name: string;
  values: Fields;
}

/**
 * A repeatable list of rows that make up the base cost, e.g. several filament spools or fabrics.
 * Each row has a name and its own fields, and contributes `rowCost` per unit.
 */
export interface GroupDef {
  key: string;
  /** Section title, e.g. "Filaments". */
  title: string;
  /** One row, e.g. "Filament" (used for "Add filament" and cost-line labels). */
  itemLabel: string;
  hint?: string;
  fields: FieldDef[];
  defaults: GroupRowInit[];
  /** Cost of one row per unit; `f` holds the builder's single-value fields. */
  rowCost: (row: Fields, f: Fields) => number;
  /** The same as a spreadsheet formula: `c(key)` is this row's cell, `r(key)` a single-value field. */
  rowFormula: (
    c: (key: string) => string,
    r: (key: string) => string,
  ) => string;
}

export interface MigratedInputs {
  fields?: Fields;
  groups: Record<string, GroupRowInit[]>;
}

/** Helpers a builder's extra cost lines can use to refer to its groups. */
export interface GroupTotals {
  /** Total `rowCost` of a group, per unit. */
  cost: (group: string) => number;
  /** Sum of one field across a group's rows. */
  sum: (group: string, field: string) => number;
}
export interface GroupRefs {
  cost: (group: string) => string;
  sum: (group: string, field: string) => string;
}

export interface QuoteBuilder {
  id: string;
  name: string;
  desc: string;
  icon: Component<{ size?: number; class?: string }>;
  /** What one unit of the quote is, e.g. "item", "plate", "project". */
  unitLabel: string;
  /** Starting order quantity for new quotes (defaults to 1). */
  defaultQuantity?: number;
  /** Single-value inputs. */
  fields: FieldDef[];
  /** Repeatable rows (spools, fabrics, surfaces…). Their row costs are added to the base cost. */
  groups?: GroupDef[];
  /** Base-cost lines other than group rows (e.g. electricity, labour). */
  baseCost: (f: Fields, g: GroupTotals) => CostLine[];
  /**
   * The same lines as spreadsheet formulas, one per `baseCost` line and in the same order, so
   * exported sheets stay live. `r(key)` is a field's cell; `line(i)` an earlier extra line.
   */
  baseFormulas: (
    r: (key: string) => string,
    line: (i: number) => string,
    g: GroupRefs,
  ) => string[];
  /**
   * Convert inputs saved before this builder had groups (single-value fields only) into
   * group rows plus any new single-value fields.
   */
  migrate?: (legacy: Fields) => MigratedInputs | undefined;
  /** Field whose value spreads per-batch materials across units (e.g. pieces per batch). */
  materialsDivisorField?: string;
  materialsHint: string;
  defaults: {
    materials: Omit<MaterialLine, "id">[];
    overheads: Omit<OverheadLine, "id">[];
    profit: { mode: ProfitMode; value: number };
  };
}

const f = (fields: Fields, key: string) => num(fields[key]);
// Saved inputs are plain JSON objects, so `in` is a safe own-property check here.
const has = (fields: Fields, key: string) =>
  key in fields && Number.isFinite(fields[key]);

export const builders: QuoteBuilder[] = [
  {
    id: "print3d",
    name: "3D Print Costing",
    desc: "Multiple filaments per plate, items per plate, machine time",
    icon: Box,
    unitLabel: "item",
    groups: [
      {
        key: "filaments",
        title: "Filaments",
        itemLabel: "Filament",
        hint: "One row per spool used on the plate — e.g. each colour of a multi-colour print. Grams come from your slicer.",
        fields: [
          {
            key: "spoolPrice",
            label: "Spool price",
            kind: "currency",
            default: 1200,
          },
          {
            key: "spoolWeight",
            label: "Spool weight",
            kind: "number",
            suffix: "g",
            default: 1000,
          },
          {
            key: "grams",
            label: "Used per plate",
            kind: "number",
            suffix: "g",
            default: 80,
          },
        ],
        defaults: [
          {
            name: "PLA Basic — Black",
            values: { spoolPrice: 1200, spoolWeight: 1000, grams: 80 },
          },
        ],
        rowCost: (row, x) =>
          safeDiv(
            f(row, "grams") *
              safeDiv(f(row, "spoolPrice"), f(row, "spoolWeight")),
            f(x, "itemsPerPlate"),
          ),
        rowFormula: (c, r) =>
          `IFERROR(${c("grams")}*${c("spoolPrice")}/${c("spoolWeight")}/${r("itemsPerPlate")},0)`,
      },
    ],
    fields: [
      {
        key: "itemsPerPlate",
        label: "Items per plate",
        kind: "number",
        suffix: "pcs",
        default: 4,
      },
      {
        key: "printHours",
        label: "Print time per plate",
        kind: "number",
        suffix: "hrs",
        default: 3,
      },
      {
        key: "printerWatts",
        label: "Printer power draw",
        kind: "number",
        suffix: "W",
        default: 150,
      },
      {
        key: "electricityRate",
        label: "Electricity rate (per kWh)",
        kind: "currency",
        default: 8,
      },
      {
        key: "failureRate",
        label: "Failure allowance",
        kind: "percent",
        default: 5,
        hint: "Extra filament & power to cover failed prints.",
      },
    ],
    baseCost: (x, g) => {
      const power = safeDiv(
        ((f(x, "printHours") * f(x, "printerWatts")) / 1000) *
          f(x, "electricityRate"),
        f(x, "itemsPerPlate"),
      );
      return [
        { label: "Printer electricity", amount: power },
        {
          label: "Failure allowance",
          amount: ((g.cost("filaments") + power) * f(x, "failureRate")) / 100,
        },
      ];
    },
    baseFormulas: (r, line, g) => [
      `IFERROR(${r("printHours")}*${r("printerWatts")}/1000*${r("electricityRate")}/${r("itemsPerPlate")},0)`,
      `(${g.cost("filaments")}+${line(0)})*${r("failureRate")}/100`,
    ],
    migrate: (old) =>
      has(old, "spoolPrice") || has(old, "plateGrams")
        ? {
            groups: {
              filaments: [
                {
                  name: "Filament",
                  values: {
                    spoolPrice: f(old, "spoolPrice"),
                    spoolWeight: f(old, "spoolWeight"),
                    grams: f(old, "plateGrams"),
                  },
                },
              ],
            },
          }
        : undefined,
    materialsHint: "Add-ons per item, e.g. keyring, magnet, insert nut.",
    defaults: {
      materials: [{ name: "Keyring", unitCost: 4, qty: 1 }],
      overheads: [
        { name: "Labour & post-processing", mode: "per_item", value: 10 },
        { name: "Packaging", mode: "per_item", value: 5 },
      ],
      profit: { mode: "markup", value: 60 },
    },
  },
  {
    id: "freelance",
    name: "Freelance / Services",
    desc: "Work items at their own rates, revisions",
    icon: Laptop,
    unitLabel: "project",
    groups: [
      {
        key: "work",
        title: "Work items",
        itemLabel: "Task",
        hint: "Break the project into tasks, each with its own hours and rate.",
        fields: [
          {
            key: "hours",
            label: "Hours",
            kind: "number",
            suffix: "hrs",
            default: 10,
          },
          {
            key: "rate",
            label: "Hourly rate",
            kind: "currency",
            default: 800,
          },
        ],
        defaults: [
          { name: "Design", values: { hours: 8, rate: 800 } },
          { name: "Development", values: { hours: 12, rate: 800 } },
        ],
        rowCost: (row) => f(row, "hours") * f(row, "rate"),
        rowFormula: (c) => `${c("hours")}*${c("rate")}`,
      },
    ],
    fields: [
      {
        key: "revisions",
        label: "Revision rounds",
        kind: "number",
        default: 2,
      },
      {
        key: "hoursPerRevision",
        label: "Hours per revision",
        kind: "number",
        suffix: "hrs",
        default: 2,
      },
      {
        key: "revisionRate",
        label: "Revision hourly rate",
        kind: "currency",
        default: 800,
      },
    ],
    baseCost: (x) => [
      {
        label: "Revisions",
        amount:
          f(x, "revisions") * f(x, "hoursPerRevision") * f(x, "revisionRate"),
      },
    ],
    baseFormulas: (r) => [
      `${r("revisions")}*${r("hoursPerRevision")}*${r("revisionRate")}`,
    ],
    migrate: (old) =>
      has(old, "hourlyRate")
        ? {
            fields: { revisionRate: f(old, "hourlyRate") },
            groups: {
              work: [
                {
                  name: "Work",
                  values: {
                    hours: f(old, "hours"),
                    rate: f(old, "hourlyRate"),
                  },
                },
              ],
            },
          }
        : undefined,
    materialsHint: "Software licences, stock assets, travel…",
    defaults: {
      materials: [],
      overheads: [{ name: "Tools & subscriptions", mode: "percent", value: 5 }],
      profit: { mode: "markup", value: 20 },
    },
  },
  {
    id: "bakery",
    name: "Home Bakery & Food",
    desc: "Ingredients per batch, yield, oven/gas cost",
    icon: CakeSlice,
    unitLabel: "piece",
    fields: [
      {
        key: "batchYield",
        label: "Pieces per batch",
        kind: "number",
        suffix: "pcs",
        default: 12,
      },
      {
        key: "fuelCost",
        label: "Oven / gas cost per batch",
        kind: "currency",
        default: 30,
      },
      {
        key: "labourCost",
        label: "Labour per batch",
        kind: "currency",
        default: 100,
      },
    ],
    baseCost: (x) => [
      {
        label: "Oven / gas",
        amount: safeDiv(f(x, "fuelCost"), f(x, "batchYield")),
      },
      {
        label: "Labour",
        amount: safeDiv(f(x, "labourCost"), f(x, "batchYield")),
      },
    ],
    materialsDivisorField: "batchYield",
    baseFormulas: (r) => [
      `IFERROR(${r("fuelCost")}/${r("batchYield")},0)`,
      `IFERROR(${r("labourCost")}/${r("batchYield")},0)`,
    ],
    materialsHint:
      "Ingredients for the whole batch — spread across pieces automatically.",
    defaults: {
      materials: [
        { name: "Flour (kg)", unitCost: 60, qty: 0.5 },
        { name: "Butter (100 g)", unitCost: 55, qty: 2 },
        { name: "Sugar (kg)", unitCost: 50, qty: 0.25 },
      ],
      overheads: [{ name: "Box & ribbon", mode: "per_item", value: 8 }],
      profit: { mode: "margin", value: 40 },
    },
  },
  {
    id: "tailoring",
    name: "Tailoring & Stitching",
    desc: "Multiple fabrics, lining, stitching labour",
    icon: Scissors,
    unitLabel: "garment",
    groups: [
      {
        key: "fabrics",
        title: "Fabrics",
        itemLabel: "Fabric",
        hint: "Add each fabric the garment uses — main, contrast, trims.",
        fields: [
          {
            key: "metres",
            label: "Metres",
            kind: "number",
            suffix: "m",
            default: 1,
          },
          {
            key: "rate",
            label: "Price per metre",
            kind: "currency",
            default: 250,
          },
        ],
        defaults: [{ name: "Main fabric", values: { metres: 2.5, rate: 250 } }],
        rowCost: (row) => f(row, "metres") * f(row, "rate"),
        rowFormula: (c) => `${c("metres")}*${c("rate")}`,
      },
    ],
    fields: [
      { key: "liningCost", label: "Lining", kind: "currency", default: 120 },
      {
        key: "stitching",
        label: "Stitching labour",
        kind: "currency",
        default: 400,
      },
    ],
    baseCost: (x) => [
      { label: "Lining", amount: f(x, "liningCost") },
      { label: "Stitching", amount: f(x, "stitching") },
    ],
    baseFormulas: (r) => [r("liningCost"), r("stitching")],
    migrate: (old) =>
      has(old, "fabricMetres") || has(old, "fabricRate")
        ? {
            groups: {
              fabrics: [
                {
                  name: "Fabric",
                  values: {
                    metres: f(old, "fabricMetres"),
                    rate: f(old, "fabricRate"),
                  },
                },
              ],
            },
          }
        : undefined,
    materialsHint: "Buttons, zips, thread, embroidery…",
    defaults: {
      materials: [
        { name: "Buttons", unitCost: 5, qty: 6 },
        { name: "Zip", unitCost: 20, qty: 1 },
      ],
      overheads: [{ name: "Machine & electricity", mode: "percent", value: 5 }],
      profit: { mode: "markup", value: 30 },
    },
  },
  {
    id: "crafts",
    name: "Handmade Crafts",
    desc: "Candles, resin, soap — blend of materials by weight",
    icon: Flame,
    unitLabel: "piece",
    groups: [
      {
        key: "materials",
        title: "Base materials",
        itemLabel: "Material",
        hint: "Each wax, resin or oil in the blend, by weight per piece.",
        fields: [
          {
            key: "grams",
            label: "Per piece",
            kind: "number",
            suffix: "g",
            default: 100,
          },
          {
            key: "pricePerKg",
            label: "Price per kg",
            kind: "currency",
            default: 400,
          },
        ],
        defaults: [
          { name: "Soy wax", values: { grams: 150, pricePerKg: 400 } },
        ],
        rowCost: (row) => (f(row, "grams") / 1000) * f(row, "pricePerKg"),
        rowFormula: (c) => `${c("grams")}/1000*${c("pricePerKg")}`,
      },
    ],
    fields: [
      {
        key: "additivePercent",
        label: "Fragrance / colour load",
        kind: "percent",
        default: 8,
        hint: "As a share of the total base-material weight.",
      },
      {
        key: "additivePerKg",
        label: "Additive price per kg",
        kind: "currency",
        default: 2500,
      },
    ],
    baseCost: (x, g) => [
      {
        label: "Fragrance / colour",
        amount:
          (((g.sum("materials", "grams") / 1000) * f(x, "additivePercent")) /
            100) *
          f(x, "additivePerKg"),
      },
    ],
    baseFormulas: (r, _line, g) => [
      `${g.sum("materials", "grams")}/1000*${r("additivePercent")}/100*${r("additivePerKg")}`,
    ],
    migrate: (old) =>
      has(old, "grams") || has(old, "pricePerKg")
        ? {
            groups: {
              materials: [
                {
                  name: "Base material",
                  values: {
                    grams: f(old, "grams"),
                    pricePerKg: f(old, "pricePerKg"),
                  },
                },
              ],
            },
          }
        : undefined,
    materialsHint: "Jar, wick, mould wear, label…",
    defaults: {
      materials: [
        { name: "Glass jar", unitCost: 35, qty: 1 },
        { name: "Wick", unitCost: 4, qty: 1 },
        { name: "Label", unitCost: 3, qty: 1 },
      ],
      overheads: [{ name: "Labour", mode: "per_item", value: 20 }],
      profit: { mode: "multiplier", value: 2.5 },
    },
  },
  {
    id: "catering",
    name: "Events & Catering",
    desc: "Menu cost per plate × guests, setup charges",
    icon: UtensilsCrossed,
    unitLabel: "plate",
    defaultQuantity: 100,
    groups: [
      {
        key: "menu",
        title: "Menu (per plate)",
        itemLabel: "Dish",
        hint: "Each course or dish and what it costs per plate.",
        fields: [
          {
            key: "cost",
            label: "Cost per plate",
            kind: "currency",
            default: 50,
          },
        ],
        defaults: [
          { name: "Starters", values: { cost: 50 } },
          { name: "Main course", values: { cost: 140 } },
          { name: "Dessert", values: { cost: 30 } },
        ],
        rowCost: (row) => f(row, "cost"),
        rowFormula: (c) => c("cost"),
      },
    ],
    fields: [
      {
        key: "disposablesPerPlate",
        label: "Plates & cutlery",
        kind: "currency",
        default: 15,
      },
      {
        key: "staffPerPlate",
        label: "Serving staff per plate",
        kind: "currency",
        default: 25,
      },
    ],
    baseCost: (x) => [
      { label: "Disposables", amount: f(x, "disposablesPerPlate") },
      { label: "Serving staff", amount: f(x, "staffPerPlate") },
    ],
    baseFormulas: (r) => [r("disposablesPerPlate"), r("staffPerPlate")],
    migrate: (old) =>
      has(old, "foodPerPlate")
        ? {
            groups: {
              menu: [
                { name: "Food", values: { cost: f(old, "foodPerPlate") } },
              ],
            },
          }
        : undefined,
    materialsHint: "Extras per plate, e.g. welcome drink, dessert.",
    defaults: {
      materials: [],
      overheads: [
        { name: "Venue setup & transport", mode: "per_order", value: 5000 },
        { name: "Gas & equipment", mode: "percent", value: 4 },
      ],
      profit: { mode: "markup", value: 25 },
    },
  },
  {
    id: "printing",
    name: "Printing & Photocopy",
    desc: "Pages, colour vs B/W, binding, lamination",
    icon: Printer,
    unitLabel: "copy",
    defaultQuantity: 10,
    fields: [
      {
        key: "bwPages",
        label: "B/W pages per copy",
        kind: "number",
        default: 40,
      },
      {
        key: "bwRate",
        label: "Cost per B/W page",
        kind: "currency",
        default: 0.6,
      },
      {
        key: "colourPages",
        label: "Colour pages per copy",
        kind: "number",
        default: 4,
      },
      {
        key: "colourRate",
        label: "Cost per colour page",
        kind: "currency",
        default: 4,
      },
      {
        key: "binding",
        label: "Binding per copy",
        kind: "currency",
        default: 25,
      },
      {
        key: "lamination",
        label: "Lamination per copy",
        kind: "currency",
        default: 0,
      },
    ],
    baseCost: (x) => [
      { label: "B/W pages", amount: f(x, "bwPages") * f(x, "bwRate") },
      {
        label: "Colour pages",
        amount: f(x, "colourPages") * f(x, "colourRate"),
      },
      { label: "Binding", amount: f(x, "binding") },
      { label: "Lamination", amount: f(x, "lamination") },
    ],
    baseFormulas: (r) => [
      `${r("bwPages")}*${r("bwRate")}`,
      `${r("colourPages")}*${r("colourRate")}`,
      r("binding"),
      r("lamination"),
    ],
    materialsHint: "Covers, special paper, envelopes…",
    defaults: {
      materials: [],
      overheads: [{ name: "Machine upkeep", mode: "percent", value: 10 }],
      profit: { mode: "markup", value: 40 },
    },
  },
  {
    id: "painting",
    name: "Home Painting & Repair",
    desc: "Surfaces × coats, paint per surface, labour days",
    icon: PaintRoller,
    unitLabel: "job",
    groups: [
      {
        key: "surfaces",
        title: "Surfaces",
        itemLabel: "Surface",
        hint: "Walls, ceilings, doors… each with its own paint and number of coats.",
        fields: [
          {
            key: "area",
            label: "Area",
            kind: "number",
            suffix: "sq ft",
            default: 200,
          },
          { key: "coats", label: "Coats", kind: "number", default: 2 },
          {
            key: "coverage",
            label: "Coverage / litre / coat",
            kind: "number",
            suffix: "sq ft",
            default: 100,
          },
          {
            key: "paintPerLitre",
            label: "Paint per litre",
            kind: "currency",
            default: 350,
          },
        ],
        defaults: [
          {
            name: "Walls",
            values: { area: 1000, coats: 2, coverage: 100, paintPerLitre: 350 },
          },
          {
            name: "Ceiling",
            values: { area: 200, coats: 2, coverage: 110, paintPerLitre: 280 },
          },
        ],
        rowCost: (row) =>
          safeDiv(f(row, "area") * f(row, "coats"), f(row, "coverage")) *
          f(row, "paintPerLitre"),
        rowFormula: (c) =>
          `IFERROR(${c("area")}*${c("coats")}/${c("coverage")},0)*${c("paintPerLitre")}`,
      },
    ],
    fields: [
      {
        key: "labourDays",
        label: "Labour days",
        kind: "number",
        suffix: "days",
        default: 4,
      },
      {
        key: "dayRate",
        label: "Labour cost per day",
        kind: "currency",
        default: 1500,
      },
    ],
    baseCost: (x) => [
      { label: "Labour", amount: f(x, "labourDays") * f(x, "dayRate") },
    ],
    baseFormulas: (r) => [`${r("labourDays")}*${r("dayRate")}`],
    migrate: (old) =>
      has(old, "area")
        ? {
            groups: {
              surfaces: [
                {
                  name: "Paint",
                  values: {
                    area: f(old, "area"),
                    coats: f(old, "coats"),
                    coverage: f(old, "coverage"),
                    paintPerLitre: f(old, "paintPerLitre"),
                  },
                },
              ],
            },
          }
        : undefined,
    materialsHint: "Primer, putty, tape, sandpaper…",
    defaults: {
      materials: [
        { name: "Primer (litre)", unitCost: 220, qty: 6 },
        { name: "Masking tape", unitCost: 60, qty: 4 },
      ],
      overheads: [{ name: "Transport", mode: "per_order", value: 800 }],
      profit: { mode: "markup", value: 20 },
    },
  },
];

export const getBuilder = (id: string) => builders.find((b) => b.id === id);
