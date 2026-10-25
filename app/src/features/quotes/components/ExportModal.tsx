import { Check, FileText, FileType, LoaderCircle } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import { Button, Modal } from "../../../components/ui";
import { cn } from "../../../utils/cn";
import type { QuoteBuilder } from "../builders";
import {
  buildExportDoc,
  type ExportDoc,
  exportFileName,
} from "../export/document";
import { quoteToMarkdown } from "../export/markdown";
import { markdownToHtml } from "../export/pdf";
import { type ExportFormat, saveExport } from "../export/save";
import { getTemplate, templates } from "../export/templates";
import type { Product, Quote, QuoteResult, QuoteSettings } from "../types";

const formats: { id: ExportFormat; label: string; icon: typeof FileText }[] = [
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "docx", label: "Word (.docx)", icon: FileType },
  { id: "md", label: "Markdown", icon: FileText },
];

async function render(
  format: ExportFormat,
  doc: ExportDoc,
  templateId: string,
): Promise<Uint8Array> {
  const t = getTemplate(templateId);
  if (format === "pdf") {
    const { renderPdf } = await import("../export/pdf");
    return renderPdf(doc, t);
  }
  if (format === "docx") {
    const { renderDocx } = await import("../export/docx");
    return renderDocx(doc, t);
  }
  return new TextEncoder().encode(quoteToMarkdown(doc));
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
}) {
  const [includeBreakdown, setIncludeBreakdown] = createSignal(true);
  const [busy, setBusy] = createSignal<ExportFormat | null>(null);
  const [status, setStatus] = createSignal<{
    ok: boolean;
    text: string;
  } | null>(null);

  const template = () => getTemplate(props.settings.templateId);
  const doc = createMemo(() =>
    buildExportDoc(
      props.product,
      props.quote,
      props.result,
      props.builder,
      props.settings,
      { includeBreakdown: includeBreakdown() },
    ),
  );
  const previewHtml = () => markdownToHtml(quoteToMarkdown(doc(), false));

  const runExport = async (format: ExportFormat) => {
    setBusy(format);
    setStatus(null);
    try {
      const bytes = await render(format, doc(), props.settings.templateId);
      const path = await saveExport(bytes, exportFileName(doc()), format);
      if (path) setStatus({ ok: true, text: `Saved ${path}` });
    } catch (error) {
      console.error("Export failed:", error);
      setStatus({ ok: false, text: `Export failed: ${String(error)}` });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Export quote"
      class="max-w-4xl h-[85vh]"
    >
      <div class="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-5 h-full">
        <div class="flex flex-col gap-5">
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

          <div class="flex flex-col gap-2 mt-auto">
            <For each={formats}>
              {(f) => (
                <Button
                  variant={f.id === "pdf" ? "primary" : "secondary"}
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

        <div class="rounded-lg overflow-y-auto bg-neutral-200 p-4 min-h-0">
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
            {/* Content is generated from our own markdown; user text is escaped in quoteToMarkdown. */}
            <div class="qp-body" innerHTML={previewHtml()} />
            <p class="qp-footer">Generated with ArchCalc Quote Studio</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
