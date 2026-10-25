import { Lexer, type Token, type Tokens } from "marked";

const decode = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const inlineText = (tokens: Token[] | undefined): string =>
  (tokens ?? [])
    .map((tok) => {
      if (tok.type === "br") return " ";
      if ("tokens" in tok && tok.tokens?.length) return inlineText(tok.tokens);
      return "text" in tok ? decode(String(tok.text)) : tok.raw;
    })
    .join("");

/** Flatten markdown into readable plain-text lines (for spreadsheet cells and CSV). */
export function markdownToLines(md: string): string[] {
  const lines: string[] = [];
  const walk = (tokens: Token[], prefix: string) => {
    for (const tok of tokens) {
      switch (tok.type) {
        case "space":
          break;
        case "heading":
        case "paragraph":
          lines.push(prefix + inlineText(tok.tokens));
          break;
        case "list": {
          const list = tok as Tokens.List;
          const start = typeof list.start === "number" ? list.start : 1;
          list.items.forEach((item, i) => {
            const marker = item.task
              ? item.checked
                ? "☑ "
                : "☐ "
              : list.ordered
                ? `${start + i}. `
                : "• ";
            const [first, ...rest] = item.tokens;
            lines.push(
              `${prefix}${marker}${first && "tokens" in first ? inlineText(first.tokens) : ""}`,
            );
            walk(
              rest.filter((x) => x.type !== "checkbox"),
              `${prefix}    `,
            );
          });
          break;
        }
        case "blockquote":
          walk((tok as Tokens.Blockquote).tokens, `${prefix}> `);
          break;
        case "code":
          for (const line of tok.text.split("\n")) lines.push(prefix + line);
          break;
        case "table": {
          const table = tok as Tokens.Table;
          lines.push(
            prefix + table.header.map((c) => inlineText(c.tokens)).join(" | "),
          );
          for (const row of table.rows) {
            lines.push(
              prefix + row.map((c) => inlineText(c.tokens)).join(" | "),
            );
          }
          break;
        }
        case "hr":
          lines.push(`${prefix}—`);
          break;
        default:
          if (tok.raw.trim()) lines.push(prefix + tok.raw.trim());
      }
    }
  };
  walk(new Lexer({ gfm: true, breaks: true }).lex(md), "");
  return lines;
}
