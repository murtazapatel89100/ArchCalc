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

  out.push(rowsTable(["Quotation", ""], doc.details));

  out.push("## Summary");
  out.push(
    [
      "| Item | Qty | Unit price | Amount |",
      "| :--- | ---: | ---: | ---: |",
      ...doc.lineItems.map(
        (li) =>
          `| ${esc(li.item)} | ${li.qty} | ${esc(li.unitPrice)} | ${esc(li.amount)} |`,
      ),
      ...doc.totals.map(
        (t) =>
          `| ${bold(esc(t.label), t.strong)} | | | ${bold(esc(t.value), t.strong)} |`,
      ),
    ].join("\n"),
  );

  for (const t of doc.breakdowns ?? []) {
    out.push(`## ${esc(t.title)}`);
    out.push(rowsTable(["Component", "Amount"], t.rows));
  }
  for (const t of doc.inputs ?? []) {
    if (!t.rows.length) continue;
    out.push(`## ${esc(t.title)}`);
    out.push(rowsTable(["Parameter", "Value"], t.rows));
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
