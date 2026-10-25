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

export interface QuoteInputs {
  fields: Record<string, number>;
  materials: MaterialLine[];
  overheads: OverheadLine[];
  profit: { mode: ProfitMode; value: number };
  quantity: number;
  discount: { mode: DiscountMode; value: number };
  taxPercent: number;
  rounding: RoundingMode;
}

export interface Quote {
  id: string;
  label: string;
  inputs: QuoteInputs;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: string;
  name: string;
  builderId: string;
  quotes: Quote[];
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
}
