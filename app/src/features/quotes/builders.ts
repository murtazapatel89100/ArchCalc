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

export interface QuoteBuilder {
  id: string;
  name: string;
  desc: string;
  icon: Component<{ size?: number; class?: string }>;
  /** What one unit of the quote is, e.g. "item", "plate", "project". */
  unitLabel: string;
  /** Starting order quantity for new quotes (defaults to 1). */
  defaultQuantity?: number;
  fields: FieldDef[];
  baseCost: (f: Fields) => CostLine[];
  /**
   * The same base cost as spreadsheet formulas, one per `baseCost` line and in the same order,
   * so exported sheets stay live. `r(key)` is the cell holding a field; `line(i)` an earlier line.
   */
  baseFormulas: (
    r: (key: string) => string,
    line: (i: number) => string,
  ) => string[];
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

export const builders: QuoteBuilder[] = [
  {
    id: "print3d",
    name: "3D Print Costing",
    desc: "Filament per plate, items per plate, machine time",
    icon: Box,
    unitLabel: "item",
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
        key: "plateGrams",
        label: "Filament used per plate",
        kind: "number",
        suffix: "g",
        default: 80,
        hint: "Total grams for the whole plate, from your slicer.",
      },
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
    baseCost: (x) => {
      const items = f(x, "itemsPerPlate");
      const perGram = safeDiv(f(x, "spoolPrice"), f(x, "spoolWeight"));
      const filament = safeDiv(f(x, "plateGrams") * perGram, items);
      const power = safeDiv(
        ((f(x, "printHours") * f(x, "printerWatts")) / 1000) *
          f(x, "electricityRate"),
        items,
      );
      return [
        { label: "Filament", amount: filament },
        { label: "Printer electricity", amount: power },
        {
          label: "Failure allowance",
          amount: ((filament + power) * f(x, "failureRate")) / 100,
        },
      ];
    },
    baseFormulas: (r, line) => [
      `IFERROR(${r("plateGrams")}*${r("spoolPrice")}/${r("spoolWeight")}/${r("itemsPerPlate")},0)`,
      `IFERROR(${r("printHours")}*${r("printerWatts")}/1000*${r("electricityRate")}/${r("itemsPerPlate")},0)`,
      `(${line(0)}+${line(1)})*${r("failureRate")}/100`,
    ],
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
    desc: "Hourly rate, estimated hours, revisions",
    icon: Laptop,
    unitLabel: "project",
    fields: [
      {
        key: "hourlyRate",
        label: "Hourly rate",
        kind: "currency",
        default: 800,
      },
      {
        key: "hours",
        label: "Estimated hours",
        kind: "number",
        suffix: "hrs",
        default: 20,
      },
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
    ],
    baseCost: (x) => [
      { label: "Work hours", amount: f(x, "hourlyRate") * f(x, "hours") },
      {
        label: "Revisions",
        amount:
          f(x, "hourlyRate") * f(x, "revisions") * f(x, "hoursPerRevision"),
      },
    ],
    baseFormulas: (r) => [
      `${r("hourlyRate")}*${r("hours")}`,
      `${r("hourlyRate")}*${r("revisions")}*${r("hoursPerRevision")}`,
    ],
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
    desc: "Fabric metres, lining, stitching labour",
    icon: Scissors,
    unitLabel: "garment",
    fields: [
      {
        key: "fabricMetres",
        label: "Fabric required",
        kind: "number",
        suffix: "m",
        default: 2.5,
      },
      {
        key: "fabricRate",
        label: "Fabric price per metre",
        kind: "currency",
        default: 250,
      },
      { key: "liningCost", label: "Lining", kind: "currency", default: 120 },
      {
        key: "stitching",
        label: "Stitching labour",
        kind: "currency",
        default: 400,
      },
    ],
    baseCost: (x) => [
      { label: "Fabric", amount: f(x, "fabricMetres") * f(x, "fabricRate") },
      { label: "Lining", amount: f(x, "liningCost") },
      { label: "Stitching", amount: f(x, "stitching") },
    ],
    baseFormulas: (r) => [
      `${r("fabricMetres")}*${r("fabricRate")}`,
      r("liningCost"),
      r("stitching"),
    ],
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
    desc: "Candles, resin, soap — material by weight",
    icon: Flame,
    unitLabel: "piece",
    fields: [
      {
        key: "grams",
        label: "Base material per piece",
        kind: "number",
        suffix: "g",
        default: 150,
      },
      {
        key: "pricePerKg",
        label: "Base material price per kg",
        kind: "currency",
        default: 400,
      },
      {
        key: "additivePercent",
        label: "Fragrance / colour load",
        kind: "percent",
        default: 8,
      },
      {
        key: "additivePerKg",
        label: "Additive price per kg",
        kind: "currency",
        default: 2500,
      },
    ],
    baseCost: (x) => {
      const kg = f(x, "grams") / 1000;
      return [
        { label: "Base material", amount: kg * f(x, "pricePerKg") },
        {
          label: "Fragrance / colour",
          amount:
            ((kg * f(x, "additivePercent")) / 100) * f(x, "additivePerKg"),
        },
      ];
    },
    baseFormulas: (r) => [
      `${r("grams")}/1000*${r("pricePerKg")}`,
      `${r("grams")}/1000*${r("additivePercent")}/100*${r("additivePerKg")}`,
    ],
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
    desc: "Cost per plate × guests, setup charges",
    icon: UtensilsCrossed,
    unitLabel: "plate",
    defaultQuantity: 100,
    fields: [
      {
        key: "foodPerPlate",
        label: "Food cost per plate",
        kind: "currency",
        default: 220,
      },
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
      { label: "Food", amount: f(x, "foodPerPlate") },
      { label: "Disposables", amount: f(x, "disposablesPerPlate") },
      { label: "Serving staff", amount: f(x, "staffPerPlate") },
    ],
    baseFormulas: (r) => [
      r("foodPerPlate"),
      r("disposablesPerPlate"),
      r("staffPerPlate"),
    ],
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
    desc: "Area × coats, paint, labour days",
    icon: PaintRoller,
    unitLabel: "job",
    fields: [
      {
        key: "area",
        label: "Area to paint",
        kind: "number",
        suffix: "sq ft",
        default: 1200,
      },
      { key: "coats", label: "Coats", kind: "number", default: 2 },
      {
        key: "coverage",
        label: "Coverage per litre per coat",
        kind: "number",
        suffix: "sq ft",
        default: 100,
      },
      {
        key: "paintPerLitre",
        label: "Paint price per litre",
        kind: "currency",
        default: 350,
      },
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
      {
        label: "Paint",
        amount:
          safeDiv(f(x, "area") * f(x, "coats"), f(x, "coverage")) *
          f(x, "paintPerLitre"),
      },
      { label: "Labour", amount: f(x, "labourDays") * f(x, "dayRate") },
    ],
    baseFormulas: (r) => [
      `IFERROR(${r("area")}*${r("coats")}/${r("coverage")},0)*${r("paintPerLitre")}`,
      `${r("labourDays")}*${r("dayRate")}`,
    ],
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
