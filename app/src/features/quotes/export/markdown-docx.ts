import { Lexer, type Token, type Tokens } from "marked";
import type { ExportTemplate } from "./templates";

type Docx = typeof import("docx");
type Block = InstanceType<Docx["Paragraph"]> | InstanceType<Docx["Table"]>;
type Inline =
  | InstanceType<Docx["TextRun"]>
  | InstanceType<Docx["ExternalHyperlink"]>;

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: boolean;
}

interface BlockContext {
  /** Left indent in twips (blockquotes and nested lists). */
  indent: number;
  quote: boolean;
}

const hex = (color: string) => color.replace("#", "");

const decode = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Convert user-written markdown (notes, terms…) into native Word paragraphs and tables. */
export function markdownToDocx(
  md: string,
  docx: Docx,
  t: ExportTemplate,
): Block[] {
  const {
    AlignmentType,
    BorderStyle,
    ExternalHyperlink,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = docx;

  const run = (text: string, s: RunStyle, quote = false) =>
    new TextRun({
      text: decode(text),
      bold: s.bold,
      italics: s.italics || quote,
      strike: s.strike,
      font: s.code ? "Consolas" : undefined,
      shading: s.code
        ? { type: ShadingType.CLEAR, color: "auto", fill: hex(t.stripe) }
        : undefined,
      color: s.link ? hex(t.accent) : quote ? hex(t.muted) : hex(t.text),
      underline: s.link ? {} : undefined,
      size: 20,
    });

  const inline = (
    tokens: Token[] | undefined,
    s: RunStyle,
    quote: boolean,
  ): Inline[] =>
    (tokens ?? []).flatMap((tok): Inline[] => {
      switch (tok.type) {
        case "strong":
          return inline(tok.tokens, { ...s, bold: true }, quote);
        case "em":
          return inline(tok.tokens, { ...s, italics: true }, quote);
        case "del":
          return inline(tok.tokens, { ...s, strike: true }, quote);
        case "codespan":
          return [run(tok.text, { ...s, code: true }, quote)];
        case "br":
          return [new TextRun({ text: "", break: 1 })];
        case "link":
          return [
            new ExternalHyperlink({
              link: (tok as Tokens.Link).href,
              children: inline(tok.tokens, { ...s, link: true }, quote).filter(
                (c): c is InstanceType<Docx["TextRun"]> => c instanceof TextRun,
              ),
            }),
          ];
        case "text":
          return "tokens" in tok && tok.tokens?.length
            ? inline(tok.tokens, s, quote)
            : [run(tok.text, s, quote)];
        default:
          return [run("text" in tok ? String(tok.text) : tok.raw, s, quote)];
      }
    });

  const paragraph = (children: Inline[], ctx: BlockContext, extra = {}) =>
    new Paragraph({
      children,
      indent: ctx.indent ? { left: ctx.indent } : undefined,
      border: ctx.quote
        ? {
            left: {
              style: BorderStyle.SINGLE,
              size: 12,
              color: hex(t.border),
              space: 8,
            },
          }
        : undefined,
      spacing: { after: 100 },
      ...extra,
    });

  const blocks = (tokens: Token[], ctx: BlockContext): Block[] =>
    tokens.flatMap((tok): Block[] => {
      switch (tok.type) {
        case "space":
          return [];
        case "heading": {
          const { depth } = tok as Tokens.Heading;
          return [
            paragraph(
              [
                new TextRun({
                  text: decode(tok.text),
                  bold: true,
                  size: depth <= 3 ? 22 : 20,
                  color: hex(depth <= 4 ? t.text : t.muted),
                }),
              ],
              ctx,
              { spacing: { before: 160, after: 80 } },
            ),
          ];
        }
        case "paragraph":
          return [paragraph(inline(tok.tokens, {}, ctx.quote), ctx)];
        case "blockquote":
          return blocks((tok as Tokens.Blockquote).tokens, {
            indent: ctx.indent + 240,
            quote: true,
          });
        case "code":
          return tok.text.split("\n").map((line: string) =>
            paragraph([run(line || " ", { code: true })], ctx, {
              spacing: { after: 0 },
            }),
          );
        case "hr":
          return [
            new Paragraph({
              children: [],
              border: {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: hex(t.border),
                  space: 4,
                },
              },
              spacing: { after: 160 },
            }),
          ];
        case "list": {
          const list = tok as Tokens.List;
          const start = typeof list.start === "number" ? list.start : 1;
          return list.items.flatMap((item, i) => {
            const marker = item.task
              ? item.checked
                ? "☑ "
                : "☐ "
              : list.ordered
                ? `${start + i}. `
                : "• ";
            const [first, ...rest] = item.tokens;
            const firstRuns =
              first && (first.type === "text" || first.type === "paragraph")
                ? inline(first.tokens, {}, ctx.quote)
                : [];
            const head = paragraph(
              [run(marker, { bold: list.ordered }, ctx.quote), ...firstRuns],
              { ...ctx, indent: ctx.indent + 360 },
              { spacing: { after: 40 } },
            );
            const tail = first && firstRuns.length ? rest : item.tokens;
            return [
              head,
              ...blocks(
                tail.filter((x) => x.type !== "checkbox"),
                { ...ctx, indent: ctx.indent + 360 },
              ),
            ];
          });
        }
        case "table": {
          const table = tok as Tokens.Table;
          const align = (a: Tokens.TableCell["align"]) =>
            a === "right"
              ? AlignmentType.RIGHT
              : a === "center"
                ? AlignmentType.CENTER
                : AlignmentType.LEFT;
          const cell = (
            c: Tokens.TableCell,
            header: boolean,
            stripe: boolean,
          ) =>
            new TableCell({
              shading: header
                ? {
                    type: ShadingType.CLEAR,
                    color: "auto",
                    fill: hex(t.accent),
                  }
                : stripe
                  ? {
                      type: ShadingType.CLEAR,
                      color: "auto",
                      fill: hex(t.stripe),
                    }
                  : undefined,
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: align(c.align),
                  children: header
                    ? [
                        new TextRun({
                          text: decode(c.text),
                          bold: true,
                          color: hex(t.accentText),
                          size: 20,
                        }),
                      ]
                    : inline(c.tokens, {}, false),
                }),
              ],
            });
          return [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: hex(t.border),
                },
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: hex(t.border),
                },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                insideHorizontal: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: hex(t.border),
                },
                insideVertical: {
                  style: BorderStyle.NONE,
                  size: 0,
                  color: "FFFFFF",
                },
              },
              rows: [
                new TableRow({
                  tableHeader: true,
                  children: table.header.map((c) => cell(c, true, false)),
                }),
                ...table.rows.map(
                  (r, i) =>
                    new TableRow({
                      children: r.map((c) => cell(c, false, i % 2 === 1)),
                    }),
                ),
              ],
            }),
            new Paragraph({ children: [] }),
          ];
        }
        default:
          return "raw" in tok && tok.raw.trim()
            ? [paragraph([run(tok.raw.trim(), {}, ctx.quote)], ctx)]
            : [];
      }
    });

  return blocks(new Lexer({ gfm: true, breaks: true }).lex(md), {
    indent: 0,
    quote: false,
  });
}
