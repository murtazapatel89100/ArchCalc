import type { ExportDoc, Row } from "./document";
import { demoteHeadings } from "./markdown-render";

/** Escape characters that would otherwise be parsed as markdown or break a table cell. */
const esc = (text: string) =>
  text.replace(/([\\`*_{}[\]<>#|])/g, "\\$1").replace(/\n/g, " ");

const bold = (text: string, strong?: boolean) =>
  strong ? `**${text}**` : text;

const rowsTable = (head: [string, string], rows: Row[]) =>
  [
    `| ${head[0]} | ${head[1]} |`,
    "| :--- | ---: |",
    ...rows.map(
      (r) =>
        `| ${bold(esc(r.label), r.strong)} | ${bold(esc(r.value), r.strong)} |`,
    ),
  ].join("\n");

/**
 * `standalone: false` drops the title and footer, for renderers (PDF, preview) that draw
 * their own branded header band and page footer.
 */
export function quoteToMarkdown(doc: ExportDoc, standalone = true): string {
  const out: string[] = [];
  if (standalone) {
    out.push(`# ${esc(doc.businessName || "Quotation")}`);
    if (doc.contact) out.push(esc(doc.contact));
  }

  out.push(
    rowsTable(
      ["Quotation", ""],
      [
        { label: "Reference", value: doc.reference },
        { label: "Date", value: doc.date },
        { label: "Product", value: doc.productName },
        { label: "Variant", value: doc.quoteLabel },
      ],
    ),
  );

  out.push("## Summary");
  out.push(
    [
      "| Item | Qty | Unit price | Amount |",
      "| :--- | ---: | ---: | ---: |",
      `| ${esc(doc.lineItem.item)} | ${doc.lineItem.qty} | ${esc(doc.lineItem.unitPrice)} | ${esc(doc.lineItem.amount)} |`,
      ...doc.totals.map(
        (t) =>
          `| ${bold(esc(t.label), t.strong)} | | | ${bold(esc(t.value), t.strong)} |`,
      ),
    ].join("\n"),
  );

  if (doc.breakdown) {
    out.push(`## Cost breakdown (per ${doc.unitLabel})`);
    out.push(rowsTable(["Component", "Amount"], doc.breakdown));
  }
  if (doc.inputs?.length) {
    out.push(`## ${esc(doc.builderName)} inputs`);
    out.push(rowsTable(["Parameter", "Value"], doc.inputs));
  }
  // Notes and extra sections are user-written markdown, so they're kept as-is (headings are
  // demoted to nest under the section title).
  if (doc.notes) {
    out.push("## Notes");
    out.push(demoteHeadings(doc.notes));
  }
  for (const sec of doc.sections) {
    out.push(`## ${esc(sec.title || "Additional notes")}`);
    out.push(demoteHeadings(sec.body));
  }
  if (standalone) {
    out.push("---");
    out.push("_Generated with ArchCalc Quote Studio_");
  }
  return `${out.join("\n\n")}\n`;
}
