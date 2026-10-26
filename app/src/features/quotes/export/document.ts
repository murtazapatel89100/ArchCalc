import type { FieldDef, QuoteBuilder } from "../builders";
import type { CombinedResult } from "../combined";
import { num } from "../engine";
import { formatMoney, formatNumber, formatPercent } from "../format";
import { fieldsFor, groupRows, rowLabel } from "../groups";
import type {
  ClientOrder,
  NoteSection,
  Product,
  Quote,
  QuoteResult,
  QuoteSettings,
} from "../types";

export interface Row {
  label: string;
  value: string;
  strong?: boolean;
}

export interface LineItem {
  item: string;
  qty: string;
  unitPrice: string;
  amount: string;
}

/** A titled table of label/value rows, e.g. one quote's cost breakdown. */
export interface DocTable {
  title: string;
  rows: Row[];
}

/** Everything an exporter needs, already formatted. Markdown, PDF and DOCX all render from this. */
export interface ExportDoc {
  businessName: string;
  contact: string;
  reference: string;
  date: string;
  productName: string;
  /** The quote's label, or the client order's. */
  quoteLabel: string;
  builderName: string;
  unitLabel: string;
  /** Reference, date, client, product… shown at the top. */
  details: Row[];
  /** One per quote; a combined quote has several. */
  lineItems: LineItem[];
  totals: Row[];
  /** Cost breakdown per line item, when included. */
  breakdowns?: DocTable[];
  /** Builder inputs per line item, when included. */
  inputs?: DocTable[];
  /** Markdown. */
  notes: string;
  /** Extra markdown sections, in order. */
  sections: { title: string; body: string }[];
}

export interface ExportOptions {
  includeBreakdown: boolean;
}

type Money = (v: number) => string;

const today = () => {
  const date = new Date();
  return {
    ymd: date.toISOString().slice(0, 10).replace(/-/g, ""),
    long: date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
};

const reference = (ymd: string, id: string) =>
  `Q-${ymd}-${id.slice(0, 4).toUpperCase()}`;

const noteSections = (sections: NoteSection[] | undefined) =>
  (sections ?? [])
    .map((sec) => ({ title: sec.title.trim(), body: sec.body.trim() }))
    .filter((sec) => sec.body);

const lineItem = (
  product: Product,
  label: string,
  result: QuoteResult,
  money: Money,
): LineItem => ({
  item: `${product.name} — ${label}`,
  qty: String(result.quantity),
  unitPrice: money(result.pricePerUnit),
  amount: money(result.subtotal),
});

function breakdownRows(
  result: QuoteResult,
  builder: QuoteBuilder,
  money: Money,
): Row[] {
  const rows = (lines: { label: string; amount: number }[]) =>
    lines
      .filter((l) => l.amount !== 0)
      .map((l) => ({ label: l.label, value: money(l.amount) }));
  return [
    ...rows(result.baseLines),
    ...rows(result.materialLines),
    ...rows(result.overheadLines),
    {
      label: `Cost per ${builder.unitLabel}`,
      value: money(result.costPerUnit),
      strong: true,
    },
    {
      label: `Profit (${formatPercent(result.marginPercent)} margin)`,
      value: money(result.profitPerUnit),
    },
    {
      label: `Price per ${builder.unitLabel}`,
      value: money(result.pricePerUnit),
      strong: true,
    },
  ];
}

function inputRows(quote: Quote, builder: QuoteBuilder, money: Money): Row[] {
  const show = (fd: FieldDef, v: number) =>
    fd.kind === "currency"
      ? money(v)
      : fd.kind === "percent"
        ? `${formatNumber(v)}%`
        : `${formatNumber(v)}${fd.suffix ? ` ${fd.suffix}` : ""}`;
  const groupInputs = (builder.groups ?? []).flatMap((g) =>
    groupRows(quote.inputs, g.key).map((row) => ({
      label: rowLabel(g, row),
      value: g.fields
        .map((fd) => `${fd.label} ${show(fd, num(row.values[fd.key]))}`)
        .join(" · "),
    })),
  );
  return [
    ...groupInputs,
    ...fieldsFor(builder, quote.inputs).map((fd) => ({
      label: fd.label,
      value: show(fd, quote.inputs.fields[fd.key] ?? fd.default),
    })),
  ];
}

export function buildExportDoc(
  product: Product,
  quote: Quote,
  result: QuoteResult,
  builder: QuoteBuilder,
  settings: QuoteSettings,
  options: ExportOptions,
): ExportDoc {
  const money = (v: number) => formatMoney(v, settings.currency);
  const date = today();

  const totals: Row[] = [{ label: "Subtotal", value: money(result.subtotal) }];
  if (result.discount > 0) {
    totals.push({ label: "Discount", value: `− ${money(result.discount)}` });
  }
  if (quote.inputs.taxPercent > 0) {
    totals.push({
      label: `Tax (${formatNumber(quote.inputs.taxPercent)}%)`,
      value: money(result.tax),
    });
  }
  totals.push({ label: "Total", value: money(result.total), strong: true });

  const ref = reference(date.ymd, quote.id);
  const doc: ExportDoc = {
    businessName: settings.businessName.trim(),
    contact: settings.contact.trim(),
    reference: ref,
    date: date.long,
    productName: product.name,
    quoteLabel: quote.label,
    builderName: builder.name,
    unitLabel: builder.unitLabel,
    details: [
      { label: "Reference", value: ref },
      { label: "Date", value: date.long },
      { label: "Product", value: product.name },
      { label: "Variant", value: quote.label },
    ],
    lineItems: [lineItem(product, quote.label, result, money)],
    totals,
    notes: quote.notes.trim(),
    sections: noteSections(quote.sections),
  };

  if (options.includeBreakdown) {
    doc.breakdowns = [
      {
        title: `Cost breakdown (per ${builder.unitLabel})`,
        rows: breakdownRows(result, builder, money),
      },
    ];
    doc.inputs = [
      {
        title: `${builder.name} inputs`,
        rows: inputRows(quote, builder, money),
      },
    ];
  }

  return doc;
}

/** One document for a client order: a line per quote, then the combined totals. */
export function buildCombinedDoc(
  product: Product,
  order: ClientOrder,
  combined: CombinedResult,
  builder: QuoteBuilder,
  settings: QuoteSettings,
  options: ExportOptions,
): ExportDoc {
  const money = (v: number) => formatMoney(v, settings.currency);
  const date = today();
  const label = order.label.trim() || "Combined quote";
  const client = order.client.trim();

  const totals: Row[] = [
    { label: "Subtotal", value: money(combined.subtotal) },
  ];
  if (combined.discount > 0) {
    totals.push({ label: "Discount", value: `− ${money(combined.discount)}` });
  }
  for (const t of combined.taxes) {
    if (t.percent > 0) {
      totals.push({
        label: `Tax (${formatNumber(t.percent)}%)`,
        value: money(t.amount),
      });
    }
  }
  totals.push({ label: "Total", value: money(combined.total), strong: true });

  const ref = reference(date.ymd, order.id);
  const doc: ExportDoc = {
    businessName: settings.businessName.trim(),
    contact: settings.contact.trim(),
    reference: ref,
    date: date.long,
    productName: product.name,
    quoteLabel: label,
    builderName: builder.name,
    unitLabel: builder.unitLabel,
    details: [
      { label: "Reference", value: ref },
      { label: "Date", value: date.long },
      ...(client ? [{ label: "Client", value: client }] : []),
      { label: "Product", value: product.name },
      {
        label: "Variants",
        value: combined.lines.map((l) => l.label).join(", "),
      },
    ],
    lineItems: combined.lines.map((l) =>
      lineItem(product, l.label, l.result, money),
    ),
    totals,
    notes: order.notes.trim(),
    sections: noteSections(order.sections),
  };

  if (options.includeBreakdown) {
    doc.breakdowns = combined.lines.map((l) => ({
      title: `Cost breakdown — ${l.label} (per ${builder.unitLabel})`,
      rows: breakdownRows(l.result, builder, money),
    }));
    doc.inputs = combined.lines.map((l) => ({
      title: `${l.label} — ${builder.name} inputs`,
      rows: inputRows(l.quote, builder, money),
    }));
  }

  return doc;
}

export const exportFileName = (doc: ExportDoc) =>
  `${doc.productName}-${doc.quoteLabel}`
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "quote";
