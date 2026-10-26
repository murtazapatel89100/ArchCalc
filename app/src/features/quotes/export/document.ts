import type { FieldDef, QuoteBuilder } from "../builders";
import { num } from "../engine";
import { formatMoney, formatNumber, formatPercent } from "../format";
import { fieldsFor, groupRows, rowLabel } from "../groups";
import type { Product, Quote, QuoteResult, QuoteSettings } from "../types";

export interface Row {
  label: string;
  value: string;
  strong?: boolean;
}

/** Everything an exporter needs, already formatted. Markdown, PDF and DOCX all render from this. */
export interface ExportDoc {
  businessName: string;
  contact: string;
  reference: string;
  date: string;
  productName: string;
  quoteLabel: string;
  builderName: string;
  unitLabel: string;
  lineItem: { item: string; qty: string; unitPrice: string; amount: string };
  totals: Row[];
  breakdown?: Row[];
  inputs?: Row[];
  /** Markdown. */
  notes: string;
  /** Extra markdown sections, in order. */
  sections: { title: string; body: string }[];
}

export interface ExportOptions {
  includeBreakdown: boolean;
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
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");

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

  const doc: ExportDoc = {
    businessName: settings.businessName.trim(),
    contact: settings.contact.trim(),
    reference: `Q-${ymd}-${quote.id.slice(0, 4).toUpperCase()}`,
    date: date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    productName: product.name,
    quoteLabel: quote.label,
    builderName: builder.name,
    unitLabel: builder.unitLabel,
    lineItem: {
      item: `${product.name} — ${quote.label}`,
      qty: String(result.quantity),
      unitPrice: money(result.pricePerUnit),
      amount: money(result.subtotal),
    },
    totals,
    notes: quote.notes.trim(),
    sections: (quote.sections ?? [])
      .map((sec) => ({ title: sec.title.trim(), body: sec.body.trim() }))
      .filter((sec) => sec.body),
  };

  if (options.includeBreakdown) {
    const rows = (lines: { label: string; amount: number }[]) =>
      lines
        .filter((l) => l.amount !== 0)
        .map((l) => ({ label: l.label, value: money(l.amount) }));
    doc.breakdown = [
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
    doc.inputs = [
      ...groupInputs,
      ...fieldsFor(builder, quote.inputs).map((fd) => ({
        label: fd.label,
        value: show(fd, quote.inputs.fields[fd.key] ?? fd.default),
      })),
    ];
  }

  return doc;
}

export const exportFileName = (doc: ExportDoc) =>
  `${doc.productName}-${doc.quoteLabel}`
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "quote";
