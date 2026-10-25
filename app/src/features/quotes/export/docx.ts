import type { ExportDoc, Row } from "./document";
import type { ExportTemplate } from "./templates";

const hex = (color: string) => color.replace("#", "");

export async function renderDocx(
  doc: ExportDoc,
  t: ExportTemplate,
): Promise<Uint8Array> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");

  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const line = { style: BorderStyle.SINGLE, size: 4, color: hex(t.border) };
  const shade = (color: string) => ({
    type: ShadingType.CLEAR,
    color: "auto",
    fill: hex(color),
  });

  const cell = (
    text: string,
    opts: {
      header?: boolean;
      strong?: boolean;
      right?: boolean;
      fill?: string;
      width?: number;
    } = {},
  ) =>
    new TableCell({
      width: opts.width
        ? { size: opts.width, type: WidthType.PERCENTAGE }
        : undefined,
      shading: opts.header
        ? shade(t.accent)
        : opts.fill
          ? shade(opts.fill)
          : undefined,
      borders: { top: none, left: none, right: none, bottom: line },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [
            new TextRun({
              text,
              bold: opts.header || opts.strong,
              color: opts.header ? hex(t.accentText) : hex(t.text),
              size: 20,
            }),
          ],
        }),
      ],
    });

  type Cell = { text: string; strong?: boolean };
  const table = (head: string[], body: Cell[][], widths: number[]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: head.map((h, i) =>
            cell(h, { header: true, right: i > 0, width: widths[i] }),
          ),
        }),
        ...body.map(
          (cols, r) =>
            new TableRow({
              children: cols.map((c, i) =>
                cell(c.text, {
                  strong: c.strong,
                  right: i > 0,
                  width: widths[i],
                  fill: r % 2 === 1 ? t.stripe : undefined,
                }),
              ),
            }),
        ),
      ],
    });

  const pairTable = (head: [string, string], rows: Row[]) =>
    table(
      head,
      rows.map((r) => [
        { text: r.label, strong: r.strong },
        { text: r.value, strong: r.strong },
      ]),
      [65, 35],
    );

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 320, after: 120 },
      children: [
        new TextRun({ text, bold: true, size: 26, color: hex(t.accent) }),
      ],
    });

  const isLightBand = t.bandBg.toUpperCase() === "#FFFFFF";
  const band = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: shade(t.bandBg),
            borders: {
              top: none,
              left: none,
              right: none,
              bottom: isLightBand
                ? { style: BorderStyle.SINGLE, size: 12, color: hex(t.accent) }
                : none,
            },
            margins: { top: 240, bottom: 240, left: 240, right: 240 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: doc.businessName || "Quotation",
                    bold: true,
                    size: 40,
                    color: hex(t.bandText),
                  }),
                ],
              }),
              ...(doc.contact
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: doc.contact,
                          size: 18,
                          color: hex(t.bandText),
                        }),
                      ],
                    }),
                  ]
                : []),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `QUOTATION · ${doc.reference}`,
                    bold: true,
                    size: 18,
                    color: hex(t.bandText),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const children: (
    | InstanceType<typeof Paragraph>
    | InstanceType<typeof Table>
  )[] = [
    band,
    new Paragraph({ text: "" }),
    pairTable(
      ["Quotation", ""],
      [
        { label: "Reference", value: doc.reference },
        { label: "Date", value: doc.date },
        { label: "Product", value: doc.productName },
        { label: "Variant", value: doc.quoteLabel },
      ],
    ),
    heading("Summary"),
    table(
      ["Item", "Qty", "Unit price", "Amount"],
      [
        [
          { text: doc.lineItem.item },
          { text: doc.lineItem.qty },
          { text: doc.lineItem.unitPrice },
          { text: doc.lineItem.amount },
        ],
        ...doc.totals.map((r) => [
          { text: r.label, strong: r.strong },
          { text: "" },
          { text: "" },
          { text: r.value, strong: r.strong },
        ]),
      ],
      [46, 10, 22, 22],
    ),
  ];

  if (doc.breakdown) {
    children.push(heading(`Cost breakdown (per ${doc.unitLabel})`));
    children.push(pairTable(["Component", "Amount"], doc.breakdown));
  }
  if (doc.inputs?.length) {
    children.push(heading(`${doc.builderName} inputs`));
    children.push(pairTable(["Parameter", "Value"], doc.inputs));
  }
  if (doc.notes) {
    children.push(heading("Notes"));
    for (const para of doc.notes.split("\n")) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para, size: 20, color: hex(t.text) })],
        }),
      );
    }
  }
  children.push(
    new Paragraph({
      spacing: { before: 480 },
      children: [
        new TextRun({
          text: "Generated with ArchCalc Quote Studio",
          italics: true,
          size: 16,
          color: hex(t.muted),
        }),
      ],
    }),
  );

  const document = new Document({
    creator: "ArchCalc Quote Studio",
    title: `${doc.productName} — ${doc.quoteLabel}`,
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{ children }],
  });

  return new Uint8Array(await Packer.toArrayBuffer(document));
}
