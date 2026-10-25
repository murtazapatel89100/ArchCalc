import { Marked } from "marked";

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Markdown renderer for quotes. Raw HTML in user-written notes is shown as text rather than
 * interpreted, since the output is injected into the preview and the PDF converter.
 */
const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
  },
});

/** marked emits `align="right"` on table cells; html-to-pdfmake only understands inline styles. */
export const markdownToHtml = (md: string) =>
  (marked.parse(md, { async: false }) as string).replace(
    / align="(left|right|center)"/g,
    ' style="text-align:$1"',
  );

/**
 * Push user headings down so they nest under the section heading they're written in
 * (`# Payment` inside a note becomes `### Payment`). Fenced code blocks are left alone.
 */
export function demoteHeadings(md: string, by = 2): string {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      if (inFence) return line;
      return line.replace(
        /^(#{1,6})(\s)/,
        (_, hashes: string, space: string) =>
          `${"#".repeat(Math.min(6, hashes.length + by))}${space}`,
      );
    })
    .join("\n");
}
