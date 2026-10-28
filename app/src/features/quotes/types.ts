export type OverheadMode = "percent" | "per_item" | "per_order";
export type ProfitMode =
  | "markup"
  | "margin"
  | "fixed"
  | "multiplier"
  | "target";
export type DiscountMode = "percent" | "fixed";
export type RoundingMode = "none" | "1" | "5" | "10" | "end9";

export interface MaterialLine {
  id: string;
  name: string;
  unitCost: number;
  qty: number;
}

export interface OverheadLine {
  id: string;
  name: string;
  mode: OverheadMode;
  value: number;
}

/** One row of a builder's repeatable group, e.g. one filament spool. */
export interface GroupRow {
  id: string;
  name: string;
  values: Record<string, number>;
}

export interface QuoteInputs {
  /**
   * Simple quote: only the core costs (group rows, materials and the builder's basic fields),
   * leaving out detailed fields such as power draw and all overheads. Saved overheads are kept,
   * so switching back restores them. Optional: older quotes are detailed.
   */
  simple?: boolean;
  /**
   * Simple quotes only: every utility and overhead cost in one value, as a % of cost or a fixed
   * amount for the whole order. Detailed quotes itemise them as `overheads` instead.
   * Optional: quotes saved before it existed have none.
   */
  utilities?: { mode: DiscountMode; value: number };
  fields: Record<string, number>;
  /** Rows per builder group key. Optional: quotes saved before groups existed don't have it. */
  groups?: Record<string, GroupRow[]>;
  materials: MaterialLine[];
  overheads: OverheadLine[];
  profit: { mode: ProfitMode; value: number };
  quantity: number;
  discount: { mode: DiscountMode; value: number };
  taxPercent: number;
  rounding: RoundingMode;
}

/** An extra titled block of markdown on a quote, e.g. terms or payment details. */
export interface NoteSection {
  id: string;
  title: string;
  body: string;
}

export interface Quote {
  id: string;
  label: string;
  inputs: QuoteInputs;
  /** Markdown, shown under "Notes" on the exported quote. */
  notes: string;
  /** Extra markdown sections. Optional: quotes saved before sections existed don't have it. */
  sections?: NoteSection[];
  createdAt: number;
  updatedAt: number;
}

/** How a combined quote applies discount and tax. */
export type TaxMode = "order" | "each";

/**
 * Several quotes of one product (e.g. one per colourway) combined into a single quote for a
 * client. Prices are read live from the quotes, so editing a quote updates the order.
 */
export interface ClientOrder {
  id: string;
  label: string;
  client: string;
  quoteIds: string[];
  /** "order": one discount and tax on the combined subtotal; "each": every quote's own. */
  taxMode: TaxMode;
  /** Used when `taxMode` is "order". */
  discount: { mode: DiscountMode; value: number };
  taxPercent: number;
  notes: string;
  sections?: NoteSection[];
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: string;
  name: string;
  builderId: string;
  quotes: Quote[];
  /** Saved client orders. Optional: products saved before orders existed don't have it. */
  orders?: ClientOrder[];
  createdAt: number;
}

/** A single line of the builder-specific base cost, per unit. */
export interface CostLine {
  label: string;
  amount: number;
}

export interface QuoteResult {
  baseLines: CostLine[];
  baseCost: number;
  materialLines: CostLine[];
  materialsCost: number;
  overheadLines: CostLine[];
  overheadsCost: number;
  costPerUnit: number;
  profitPerUnit: number;
  priceBeforeRounding: number;
  pricePerUnit: number;
  markupPercent: number;
  marginPercent: number;
  quantity: number;
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
  orderCost: number;
  orderProfit: number;
  warnings: string[];
}

export interface QuoteSettings {
  businessName: string;
  contact: string;
  currency: string;
  templateId: string;
  defaultTaxPercent: number;
  /** Last export kind chosen in the export window. */
  exportKind: ExportKind;
}

export type ExportKind = "document" | "spreadsheet";
