import { describe, expect, it } from "vitest";
import type { ExportDoc } from "./document";
import { quoteToMarkdown } from "./markdown";
import { demoteHeadings, markdownToHtml } from "./markdown-render";

const doc = (overrides: Partial<ExportDoc> = {}): ExportDoc => ({
  businessName: "Maniac Prints",
  contact: "",
  reference: "Q-1",
  date: "1 Jan 2026",
  productName: "Keychain",
  quoteLabel: "PLA",
  builderName: "3D Print Costing",
  unitLabel: "item",
  lineItem: {
    item: "Keychain — PLA",
    qty: "1",
    unitPrice: "₹10",
    amount: "₹10",
  },
  totals: [{ label: "Total", value: "₹10", strong: true }],
  notes: "",
  sections: [],
  ...overrides,
});

describe("demoteHeadings", () => {
  it("nests user headings under the section heading", () => {
    expect(demoteHeadings("# Big\n## Smaller\nplain #hashtag")).toBe(
      "### Big\n#### Smaller\nplain #hashtag",
    );
  });

  it("caps at h6 and leaves fenced code alone", () => {
    expect(demoteHeadings("##### Deep\n```\n# not a heading\n```")).toBe(
      "###### Deep\n```\n# not a heading\n```",
    );
  });
});

describe("quoteToMarkdown notes", () => {
  it("keeps notes as markdown instead of escaping them", () => {
    const md = quoteToMarkdown(doc({ notes: "**Bold** and\n- a list" }));
    expect(md).toContain("## Notes\n\n**Bold** and\n- a list");
  });

  it("renders extra sections in order with escaped titles", () => {
    const md = quoteToMarkdown(
      doc({
        sections: [
          { title: "Terms & *conditions*", body: "- 50% advance" },
          { title: "", body: "Thanks!" },
        ],
      }),
    );
    const terms = md.indexOf("## Terms & \\*conditions\\*");
    const extra = md.indexOf("## Additional notes");
    expect(terms).toBeGreaterThan(-1);
    expect(extra).toBeGreaterThan(terms);
    expect(md).toContain("- 50% advance");
  });
});

describe("markdownToHtml", () => {
  it("renders markdown but escapes raw HTML", () => {
    const html = markdownToHtml("**ok** <img src=x onerror=alert(1)>");
    expect(html).toContain("<strong>ok</strong>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("turns table alignment into inline styles for the PDF converter", () => {
    const html = markdownToHtml("| a | b |\n| :- | -: |\n| 1 | 2 |");
    expect(html).toContain('style="text-align:right"');
    expect(html).not.toContain("align=");
  });
});
