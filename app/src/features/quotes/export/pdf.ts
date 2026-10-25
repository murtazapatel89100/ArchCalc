import type {
  Content,
  CustomTableLayout,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import type { ExportDoc } from "./document";
import { quoteToMarkdown } from "./markdown";
import { markdownToHtml } from "./markdown-render";
import type { ExportTemplate } from "./templates";

const PAGE_WIDTH = 595.28; // A4 in points
const BAND_HEIGHT = 96;

const tableLayout = (t: ExportTemplate): CustomTableLayout => ({
  fillColor: (row) => (row > 0 && row % 2 === 0 ? t.stripe : null),
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => t.border,
  paddingLeft: () => 8,
  paddingRight: () => 8,
  paddingTop: () => 5,
  paddingBottom: () => 5,
});

/** Walk the converted content and give every table the template layout and full width. */
function styleTables(node: unknown, t: ExportTemplate): void {
  if (Array.isArray(node)) {
    for (const child of node) styleTables(child, t);
    return;
  }
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, any>;
  if (n.table?.body) {
    const cols = n.table.body[0]?.length ?? 1;
    n.table.widths = ["*", ...Array(Math.max(0, cols - 1)).fill("auto")];
    n.table.headerRows = 1;
    n.layout = tableLayout(t);
    n.marginBottom = 8;
  }
  for (const key of ["stack", "columns", "text"]) {
    if (Array.isArray(n[key])) styleTables(n[key], t);
  }
}

export async function renderPdf(
  doc: ExportDoc,
  t: ExportTemplate,
): Promise<Uint8Array> {
  const [{ default: pdfMake }, vfsModule, { default: htmlToPdfmake }] =
    await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
      import("html-to-pdfmake"),
    ]);
  const vfs = (vfsModule as any).default ?? vfsModule;
  pdfMake.addVirtualFileSystem(vfs);

  // html-to-pdfmake turns whitespace inside <blockquote> into blank lines; trim it.
  const html = markdownToHtml(quoteToMarkdown(doc, false))
    .replace(/<blockquote>\s+/g, "<blockquote>")
    .replace(/\s+<\/blockquote>/g, "</blockquote>");
  const content = htmlToPdfmake(html, {
    window,
    removeExtraBlanks: true,
    defaultStyles: {
      h2: {
        fontSize: 13,
        bold: true,
        color: t.accent,
        marginTop: 14,
        marginBottom: 6,
      },
      p: { margin: [0, 2, 0, 6] },
      th: { bold: true, fillColor: t.accent, color: t.accentText },
      h3: {
        fontSize: 11.5,
        bold: true,
        color: t.text,
        marginTop: 8,
        marginBottom: 4,
      },
      h4: {
        fontSize: 10.5,
        bold: true,
        color: t.text,
        marginTop: 6,
        marginBottom: 3,
      },
      h5: {
        fontSize: 10,
        bold: true,
        color: t.muted,
        marginTop: 6,
        marginBottom: 3,
      },
      h6: {
        fontSize: 10,
        bold: true,
        color: t.muted,
        marginTop: 6,
        marginBottom: 3,
      },
      strong: { bold: true },
      em: { italics: true, color: t.muted },
      ul: { marginBottom: 6, marginLeft: 4 },
      ol: { marginBottom: 6, marginLeft: 4 },
      li: { marginBottom: 2 },
      a: { color: t.accent, decoration: "underline" },
      code: { background: t.stripe, color: t.text },
      pre: { background: t.stripe, margin: [0, 4, 0, 8] },
      blockquote: {
        color: t.muted,
        italics: true,
        marginLeft: 10,
        marginTop: 0,
        marginBottom: 6,
      },
    },
  }) as Content;
  styleTables(content, t);

  const isLightBand = t.bandBg.toUpperCase() === "#FFFFFF";
  const definition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, BAND_HEIGHT + 28, 40, 56],
    info: {
      title: `${doc.productName} — ${doc.quoteLabel}`,
      creator: "ArchCalc Quote Studio",
    },
    background: () => ({
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: PAGE_WIDTH,
          h: BAND_HEIGHT,
          color: t.bandBg,
        },
        ...(isLightBand
          ? [
              {
                type: "line" as const,
                x1: 40,
                y1: BAND_HEIGHT - 8,
                x2: PAGE_WIDTH - 40,
                y2: BAND_HEIGHT - 8,
                lineWidth: 1.5,
                lineColor: t.accent,
              },
            ]
          : []),
      ],
    }),
    header: () => ({
      margin: [40, 28, 40, 0],
      columns: [
        {
          width: "*",
          stack: [
            {
              text: doc.businessName || "Quotation",
              fontSize: 20,
              bold: true,
              color: t.bandText,
            },
            ...(doc.contact
              ? [
                  {
                    text: doc.contact,
                    fontSize: 9,
                    color: t.bandText,
                    opacity: 0.85,
                    margin: [0, 3, 0, 0] as [number, number, number, number],
                  },
                ]
              : []),
          ],
        },
        {
          width: "auto",
          stack: [
            {
              text: "QUOTATION",
              fontSize: 10,
              bold: true,
              characterSpacing: 2,
              color: t.bandText,
              alignment: "right",
            },
            {
              text: doc.reference,
              fontSize: 9,
              color: t.bandText,
              opacity: 0.85,
              alignment: "right",
              margin: [0, 3, 0, 0],
            },
          ],
        },
      ],
    }),
    footer: (page, pages) => ({
      margin: [40, 20, 40, 0],
      columns: [
        {
          text: "Generated with ArchCalc Quote Studio",
          fontSize: 8,
          color: t.muted,
        },
        {
          text: `${page} / ${pages}`,
          fontSize: 8,
          color: t.muted,
          alignment: "right",
        },
      ],
    }),
    content,
    defaultStyle: { fontSize: 10, color: t.text, lineHeight: 1.2 },
  };

  const buffer = await pdfMake.createPdf(definition).getBuffer();
  return new Uint8Array(buffer);
}
