import {
  Check,
  FileSpreadsheet,
  FileText,
  FileType,
  LoaderCircle,
  Sheet,
} from "lucide-solid";
import { createMemo, createSignal, For, type JSX, Show } from "solid-js";
import { Button, Modal } from "../../../components/ui";
import { cn } from "../../../utils/cn";
import type { QuoteBuilder } from "../builders";
import {
  buildExportDoc,
  type ExportDoc,
  exportFileName,
} from "../export/document";
import { quoteToMarkdown } from "../export/markdown";
import { markdownToHtml } from "../export/markdown-render";
import { type ExportFormat, saveExport } from "../export/save";
import { buildSheet, type SheetCell, type SheetModel } from "../export/sheet";
import {
  type ExportTemplate,
  getTemplate,
  templates,
} from "../export/templates";
import { formatMoney, formatNumber } from "../format";
import type {
  ExportKind,
  Product,
  Quote,
  QuoteResult,
  QuoteSettings,
} from "../types";

type FormatOption = { id: ExportFormat; label: string; icon: typeof FileText };

const formatsByKind: Record<ExportKind, FormatOption[]> = {
  document: [
    { id: "pdf", label: "PDF", icon: FileText },
    { id: "docx", label: "Word (.docx)", icon: FileType },
    { id: "md", label: "Markdown", icon: FileText },
  ],
  spreadsheet: [
    { id: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet },
    { id: "csv", label: "CSV", icon: Sheet },
  ],
};

async function render(
  format: ExportFormat,
  doc: ExportDoc,
  sheet: () => SheetModel,
  t: ExportTemplate,
): Promise<Uint8Array> {
  switch (format) {
    case "pdf": {
      const { renderPdf } = await import("../export/pdf");
      return renderPdf(doc, t);
    }
    case "docx": {
      const { renderDocx } = await import("../export/docx");
      return renderDocx(doc, t);
    }
    case "xlsx": {
      const { renderXlsx } = await import("../export/sheet");
      return renderXlsx(sheet(), t);
    }
    case "csv": {
      const { renderCsv } = await import("../export/sheet");
      return renderCsv(sheet());
    }
    default:
      return new TextEncoder().encode(quoteToMarkdown(doc));
  }
}

export function ExportModal(props: {
  open: boolean;
  onClose: () => void;
  product: Product;
  quote: Quote;
  result: QuoteResult;
  builder: QuoteBuilder;
  settings: QuoteSettings;
  onTemplateChange: (id: string) => void;
  onKindChange: (kind: ExportKind) => void;
}) {
  const [includeBreakdown, setIncludeBreakdown] = createSignal(true);
  const [busy, setBusy] = createSignal<ExportFormat | null>(null);
  const [status, setStatus] = createSignal<{
    ok: boolean;
    text: string;
  } | null>(null);

  const kind = () => props.settings.exportKind ?? "document";
  const template = () => getTemplate(props.settings.templateId);
  const doc = createMemo(() =>
    buildExportDoc(
      props.product,
      props.quote,
      props.result,
      props.builder,
      props.settings,
      // The spreadsheet always carries the full breakdown (it's what the formulas use).
      { includeBreakdown: includeBreakdown() || kind() === "spreadsheet" },
    ),
  );
  const sheet = createMemo(() =>
    buildSheet(
      props.product,
      props.quote,
      props.result,
      props.builder,
      props.settings,
      doc(),
    ),
  );
  const previewHtml = () => markdownToHtml(quoteToMarkdown(doc(), false));

  const runExport = async (format: ExportFormat) => {
    setBusy(format);
    setStatus(null);
    try {
      const bytes = await render(format, doc(), sheet, template());
      const path = await saveExport(bytes, exportFileName(doc()), format);
      if (path) setStatus({ ok: true, text: `Saved ${path}` });
    } catch (error) {
      console.error("Export failed:", error);
      setStatus({ ok: false, text: `Export failed: ${String(error)}` });
    } finally {
      setBusy(null);
    }
  };

  const kindButton = (k: ExportKind, label: string, icon: JSX.Element) => (
    <button
      onClick={() => {
        setStatus(null);
        props.onKindChange(k);
      }}
      aria-pressed={kind() === k}
      class={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors",
        kind() === k
          ? "bg-[var(--color-app-accent)] text-white shadow-sm"
          : "text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)]",
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Export quote"
      class="max-w-5xl h-[85vh]"
    >
      <div class="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-5 h-full">
        <div class="flex flex-col gap-5 min-h-0">
          <fieldset class="m-0 min-w-0 flex gap-1 p-1 rounded-lg bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)]">
            <legend class="sr-only">Export type</legend>
            {kindButton("document", "Document", <FileText size={14} />)}
            {kindButton(
              "spreadsheet",
              "Spreadsheet",
              <FileSpreadsheet size={14} />,
            )}
          </fieldset>

          <div>
            <p class="text-xs font-medium text-[var(--color-app-text-secondary)] mb-2">
              Template
            </p>
            <div class="flex flex-col gap-1.5">
              <For each={templates}>
                {(t) => (
                  <button
                    onClick={() => props.onTemplateChange(t.id)}
                    class={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border text-sm text-left transition-colors",
                      t.id === template().id
                        ? "border-[var(--color-app-accent)] bg-[var(--color-app-accent)]/10"
                        : "border-[var(--color-app-border)] hover:bg-[var(--color-app-surface-secondary)]",
                    )}
                  >
                    <span class="flex shrink-0 rounded overflow-hidden border border-black/10">
                      <span class="w-3 h-5" style={{ background: t.bandBg }} />
                      <span class="w-3 h-5" style={{ background: t.accent }} />
                      <span class="w-3 h-5" style={{ background: t.stripe }} />
                    </span>
                    <span class="flex-1">{t.name}</span>
                    <Show when={t.id === template().id}>
                      <Check size={14} class="text-[var(--color-app-accent)]" />
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </div>

          <Show
            when={kind() === "document"}
            fallback={
              <p class="text-xs text-[var(--color-app-text-secondary)] leading-relaxed">
                The Excel file keeps live formulas: change any{" "}
                <span class="px-1 rounded bg-[#FFF4D6] text-neutral-800">
                  highlighted input
                </span>{" "}
                and every total recalculates. Notes go on a second sheet.
              </p>
            }
          >
            <label class="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeBreakdown()}
                onChange={(e) => setIncludeBreakdown(e.currentTarget.checked)}
                class="mt-0.5 accent-[var(--color-app-accent)]"
              />
              <span>
                Include cost breakdown
                <span class="block text-xs text-[var(--color-app-text-secondary)]">
                  Turn off for a customer-facing quote.
                </span>
              </span>
            </label>
          </Show>

          <div class="flex flex-col gap-2 mt-auto">
            <For each={formatsByKind[kind()]}>
              {(f, i) => (
                <Button
                  variant={i() === 0 ? "primary" : "secondary"}
                  disabled={busy() !== null}
                  onClick={() => runExport(f.id)}
                >
                  <Show when={busy() === f.id} fallback={<f.icon size={16} />}>
                    <LoaderCircle size={16} class="animate-spin" />
                  </Show>
                  Export {f.label}
                </Button>
              )}
            </For>
            <Show when={status()}>
              {(s) => (
                <p
                  class={cn(
                    "text-xs break-all",
                    s().ok
                      ? "text-[var(--color-app-success)]"
                      : "text-[var(--color-app-error)]",
                  )}
                >
                  {s().text}
                </p>
              )}
            </Show>
          </div>
        </div>

        <div class="rounded-lg overflow-auto bg-neutral-200 p-4 min-h-0">
          <Show
            when={kind() === "document"}
            fallback={
              <SheetPreview
                model={sheet()}
                template={template()}
                currency={props.settings.currency}
              />
            }
          >
            <div
              class="quote-preview bg-white shadow-lg mx-auto max-w-[595px] min-h-full"
              style={{
                "--qp-band": template().bandBg,
                "--qp-band-text": template().bandText,
                "--qp-accent": template().accent,
                "--qp-accent-text": template().accentText,
                "--qp-stripe": template().stripe,
                "--qp-border": template().border,
                "--qp-text": template().text,
                "--qp-muted": template().muted,
              }}
            >
              <div class="qp-band">
                <div>
                  <p class="qp-business">{doc().businessName || "Quotation"}</p>
                  <Show when={doc().contact}>
                    <p class="qp-contact">{doc().contact}</p>
                  </Show>
                </div>
                <div class="text-right">
                  <p class="qp-label">QUOTATION</p>
                  <p class="qp-contact">{doc().reference}</p>
                </div>
              </div>
              {/* Generated markdown; raw HTML in user notes is escaped by markdownToHtml. */}
              <div class="qp-body" innerHTML={previewHtml()} />
              <p class="qp-footer">Generated with ArchCalc Quote Studio</p>
            </div>
          </Show>
        </div>
      </div>
    </Modal>
  );
}

/** Spreadsheet-style preview of the "Quote" sheet, with column letters and row numbers. */
function SheetPreview(props: {
  model: SheetModel;
  template: ExportTemplate;
  currency: string;
}) {
  const show = (cell: SheetCell | null) => {
    if (!cell) return "";
    if (typeof cell.value === "string") return cell.value;
    switch (cell.format) {
      case "money":
        return formatMoney(cell.value, props.currency);
      case "percent":
        return `${formatNumber(cell.value)}%`;
      case "fraction":
        return `${(cell.value * 100).toFixed(1)}%`;
      default:
        return formatNumber(cell.value);
    }
  };
  const t = () => props.template;
  const rowStyle = (kind: string): JSX.CSSProperties => {
    switch (kind) {
      case "section":
        return {
          background: t().accent,
          color: t().accentText,
          "font-weight": 700,
        };
      case "header":
        return { background: t().stripe, "font-weight": 600 };
      case "subtotal":
        return {
          "font-weight": 700,
          "border-top": `1px solid ${t().border}`,
        };
      case "total": {
        const light = t().bandBg.toUpperCase() === "#FFFFFF";
        return {
          background: light ? t().accent : t().bandBg,
          color: light ? t().accentText : t().bandText,
          "font-weight": 700,
        };
      }
      default:
        return {};
    }
  };

  return (
    <div class="bg-white shadow-lg mx-auto w-fit text-[11px] text-neutral-800 font-sans">
      <table class="border-collapse">
        <thead>
          <tr class="bg-neutral-100 text-neutral-500">
            <th class="w-8 border border-neutral-300" />
            <For each={["A", "B", "C", "D"]}>
              {(c) => (
                <th class="border border-neutral-300 font-normal px-2 py-0.5">
                  {c}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.model.rows}>
            {(row, i) => (
              <tr style={rowStyle(row.kind)}>
                <td class="bg-neutral-100 text-neutral-500 text-center border border-neutral-300 px-1">
                  {i() + 1}
                </td>
                <For each={[0, 1, 2, 3]}>
                  {(c) => {
                    const cell = row.cells[c] ?? null;
                    return (
                      <td
                        class={cn(
                          "border border-neutral-200 px-2 py-1 whitespace-nowrap",
                          c === 0 ? "min-w-[230px]" : "min-w-[92px]",
                          cell &&
                            (typeof cell.value === "number" ||
                              (row.kind === "header" && c > 0)) &&
                            "text-right",
                          row.kind === "title" && "text-base font-bold",
                          row.kind === "hint" && "italic text-neutral-500",
                          (cell?.bold || cell?.input) && "font-semibold",
                        )}
                        style={{
                          ...(cell?.input ? { background: "#FFF4D6" } : {}),
                          ...(row.kind === "title"
                            ? { color: t().accent }
                            : {}),
                        }}
                        title={cell?.formula ? `=${cell.formula}` : undefined}
                      >
                        <Show when={cell?.formula}>
                          <span class="mr-1 text-[9px] italic opacity-50">
                            ƒx
                          </span>
                        </Show>
                        {show(cell)}
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={props.model.notes.length}>
        <p class="px-3 py-2 text-[10px] text-neutral-500 border-t border-neutral-200">
          + “Notes” sheet with {props.model.notes.length} section
          {props.model.notes.length === 1 ? "" : "s"}
        </p>
      </Show>
    </div>
  );
}
