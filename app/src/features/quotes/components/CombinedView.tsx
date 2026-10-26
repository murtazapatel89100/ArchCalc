import { FileDown, Save, Trash2, TriangleAlert } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import {
  Button,
  Card,
  Field,
  inputClass,
  NumberInput,
  Select,
} from "../../../components/ui";
import { cn } from "../../../utils/cn";
import type { QuoteBuilder } from "../builders";
import { orderResult } from "../combined";
import { buildCombinedDoc } from "../export/document";
import { buildCombinedSheet } from "../export/sheet";
import {
  currencySymbol,
  formatMoney,
  formatNumber,
  formatPercent,
} from "../format";
import type {
  ClientOrder,
  DiscountMode,
  ExportKind,
  Product,
  QuoteSettings,
  TaxMode,
} from "../types";
import { Line, Stat } from "./BreakdownPanel";
import { ExportModal } from "./ExportModal";
import { NotesCard } from "./NotesCard";

/**
 * Several quotes of one product as one quote for a client. Works on a draft (from Combine) or
 * a saved client order; `onUpdate` writes to whichever it is.
 */
export function CombinedView(props: {
  product: Product;
  builder: QuoteBuilder;
  order: ClientOrder;
  /** False for a draft that hasn't been saved yet. */
  saved: boolean;
  settings: QuoteSettings;
  onUpdate: (fn: (o: ClientOrder) => void) => void;
  onSave: () => void;
  onDelete: () => void;
  onOpenQuote: (quoteId: string) => void;
  onTemplateChange: (id: string) => void;
  onKindChange: (kind: ExportKind) => void;
}) {
  const [exportOpen, setExportOpen] = createSignal(false);
  const combined = createMemo(() =>
    orderResult(props.builder, props.product, props.order),
  );
  const money = (v: number) => formatMoney(v, props.settings.currency);
  const unit = () => props.builder.unitLabel;
  const included = (id: string) => props.order.quoteIds.includes(id);

  const modeButton = (mode: TaxMode, label: string) => (
    <button
      type="button"
      aria-pressed={props.order.taxMode === mode}
      onClick={() =>
        props.onUpdate((o) => {
          o.taxMode = mode;
        })
      }
      class={cn(
        "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
        props.order.taxMode === mode
          ? "bg-[var(--color-app-accent)] text-white shadow-sm"
          : "text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)]",
      )}
    >
      {label}
    </button>
  );

  return (
    <>
      <div class="flex flex-wrap items-center gap-2">
        <input
          value={props.order.label}
          aria-label="Order name"
          placeholder="Order name, e.g. Diwali keychains"
          class={cn(inputClass, "w-56")}
          onInput={(e) => {
            const v = e.currentTarget.value;
            props.onUpdate((o) => {
              o.label = v;
            });
          }}
        />
        <input
          value={props.order.client}
          aria-label="Client"
          placeholder="Client name"
          class={cn(inputClass, "w-56")}
          onInput={(e) => {
            const v = e.currentTarget.value;
            props.onUpdate((o) => {
              o.client = v;
            });
          }}
        />
        <Show
          when={props.saved}
          fallback={
            <Button size="sm" variant="primary" onClick={props.onSave}>
              <Save size={14} /> Save as client order
            </Button>
          }
        >
          <Button variant="danger" size="sm" onClick={props.onDelete}>
            <Trash2 size={14} /> Delete order
          </Button>
          <span class="text-xs text-[var(--color-app-text-secondary)] ml-auto">
            Saved {new Date(props.order.updatedAt).toLocaleString()}
          </span>
        </Show>
      </div>

      <div class="@container">
        <div class="grid grid-cols-1 @2xl:grid-cols-[minmax(0,1fr)_260px] @4xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
          <div class="@2xl:order-2 @2xl:sticky @2xl:top-0">
            <aside class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl overflow-hidden">
              <div class="p-5 bg-gradient-to-br from-[var(--color-app-accent)]/15 to-transparent border-b border-[var(--color-app-border)]">
                <p class="text-xs uppercase tracking-wider text-[var(--color-app-text-secondary)]">
                  Order total
                </p>
                <p class="text-3xl font-semibold font-mono mt-1">
                  {money(combined().total)}
                </p>
                <div class="flex gap-4 mt-3 text-xs">
                  <Stat label="Lines" value={String(combined().lines.length)} />
                  <Stat
                    label={`${unit()[0].toUpperCase()}${unit().slice(1)}s`}
                    value={String(
                      combined().lines.reduce(
                        (n, l) => n + l.result.quantity,
                        0,
                      ),
                    )}
                  />
                  <Stat
                    label="Profit"
                    value={money(combined().orderProfit)}
                    tone={combined().orderProfit < 0 ? "bad" : "good"}
                  />
                </div>
              </div>
              <div class="p-5 space-y-4 text-sm">
                <div class="space-y-1.5">
                  <For each={combined().lines}>
                    {(l) => (
                      <Line
                        label={`${l.label} (${l.result.quantity} × ${money(l.result.pricePerUnit)})`}
                        value={money(l.result.subtotal)}
                        muted
                      />
                    )}
                  </For>
                </div>
                <div class="border-t border-[var(--color-app-border)] pt-3 space-y-1.5">
                  <Line label="Subtotal" value={money(combined().subtotal)} />
                  <Show when={combined().discount > 0}>
                    <Line
                      label="Discount"
                      value={`− ${money(combined().discount)}`}
                    />
                  </Show>
                  <For each={combined().taxes.filter((t) => t.percent > 0)}>
                    {(t) => (
                      <Line
                        label={`Tax (${formatNumber(t.percent)}%)`}
                        value={money(t.amount)}
                      />
                    )}
                  </For>
                  <Line
                    label="Order total"
                    value={money(combined().total)}
                    strong
                    big
                  />
                  <Line
                    label="Order profit"
                    value={money(combined().orderProfit)}
                    muted
                  />
                </div>
                <Show when={combined().warnings.length > 0}>
                  <div class="rounded-lg border border-[var(--color-app-warning)]/40 bg-[var(--color-app-warning)]/10 p-3 space-y-1">
                    <For each={combined().warnings}>
                      {(w) => (
                        <p class="flex gap-2 text-xs text-[var(--color-app-warning)]">
                          <TriangleAlert size={14} class="shrink-0 mt-px" /> {w}
                        </p>
                      )}
                    </For>
                  </div>
                </Show>
                <Button
                  variant="primary"
                  class="w-full"
                  disabled={combined().lines.length === 0}
                  onClick={() => setExportOpen(true)}
                >
                  <FileDown size={16} /> Export quote
                </Button>
              </div>
            </aside>
          </div>

          <div class="@2xl:order-1 flex flex-col gap-4 min-w-0">
            <Card
              title="Quotes in this order"
              description="Each quote is one line at its own price and quantity. Tick the ones to include."
            >
              <ul class="flex flex-col gap-1.5">
                <For each={props.product.quotes}>
                  {(q) => {
                    const line = () =>
                      combined().lines.find((l) => l.id === q.id);
                    return (
                      <li class="flex items-center gap-3 rounded-lg border border-[var(--color-app-border)] px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Include ${q.label}`}
                          checked={included(q.id)}
                          onChange={(e) => {
                            const on = e.currentTarget.checked;
                            props.onUpdate((o) => {
                              o.quoteIds = on
                                ? props.product.quotes
                                    .map((x) => x.id)
                                    .filter(
                                      (id) =>
                                        id === q.id || o.quoteIds.includes(id),
                                    )
                                : o.quoteIds.filter((id) => id !== q.id);
                            });
                          }}
                          class="accent-[var(--color-app-accent)]"
                        />
                        <button
                          type="button"
                          onClick={() => props.onOpenQuote(q.id)}
                          class="flex-1 min-w-0 text-left text-sm font-medium truncate hover:text-[var(--color-app-accent)]"
                          title="Open this quote"
                        >
                          {q.label || "Untitled quote"}
                        </button>
                        <Show
                          when={line()}
                          fallback={
                            <span class="text-xs text-[var(--color-app-text-secondary)]">
                              Not included
                            </span>
                          }
                        >
                          {(l) => (
                            <span class="text-xs font-mono text-[var(--color-app-text-secondary)] shrink-0">
                              {l().result.quantity} ×{" "}
                              {money(l().result.pricePerUnit)} ={" "}
                              <span class="text-[var(--color-app-text-primary)] font-semibold">
                                {money(l().result.subtotal)}
                              </span>
                            </span>
                          )}
                        </Show>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </Card>

            <Card
              title="Discount & tax"
              description={
                props.order.taxMode === "order"
                  ? "One discount and tax rate on the combined subtotal."
                  : "Each quote keeps its own discount and tax; the order adds them up."
              }
              actions={
                <fieldset class="m-0 min-w-0 flex gap-1 p-1 rounded-lg bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] shrink-0">
                  <legend class="sr-only">Discount and tax</legend>
                  {modeButton("order", "One for the order")}
                  {modeButton("each", "Each quote's own")}
                </fieldset>
              }
            >
              <Show
                when={props.order.taxMode === "order"}
                fallback={
                  <ul class="text-xs text-[var(--color-app-text-secondary)] space-y-1">
                    <For each={combined().lines}>
                      {(l) => (
                        <li class="flex justify-between gap-3">
                          <span class="truncate">{l.label}</span>
                          <span class="font-mono shrink-0">
                            {l.result.discount > 0
                              ? `− ${money(l.result.discount)} · `
                              : ""}
                            tax {formatPercent(l.taxPercent)}
                          </span>
                        </li>
                      )}
                    </For>
                  </ul>
                }
              >
                <div class="grid grid-cols-1 @md:grid-cols-2 gap-3">
                  <Field label="Discount">
                    <div class="flex gap-2">
                      <Select<DiscountMode>
                        class="w-20 shrink-0"
                        aria-label="Discount type"
                        value={props.order.discount.mode}
                        options={[
                          { value: "percent", label: "%" },
                          {
                            value: "fixed",
                            label: currencySymbol(props.settings.currency),
                          },
                        ]}
                        onChange={(v) =>
                          props.onUpdate((o) => {
                            o.discount.mode = v;
                          })
                        }
                      />
                      <NumberInput
                        aria-label="Discount value"
                        value={props.order.discount.value}
                        onChange={(v) =>
                          props.onUpdate((o) => {
                            o.discount.value = v;
                          })
                        }
                      />
                    </div>
                  </Field>
                  <Field label="Tax / GST">
                    <NumberInput
                      value={props.order.taxPercent}
                      suffix="%"
                      onChange={(v) =>
                        props.onUpdate((o) => {
                          o.taxPercent = v;
                        })
                      }
                    />
                  </Field>
                </div>
              </Show>
            </Card>

            <NotesCard
              notes={props.order.notes}
              sections={props.order.sections}
              description="Markdown, shown on the combined quote. Each quote's own notes aren't included."
              update={props.onUpdate}
            />
          </div>
        </div>
      </div>

      <ExportModal
        open={exportOpen()}
        onClose={() => setExportOpen(false)}
        source={{
          doc: (options) =>
            buildCombinedDoc(
              props.product,
              props.order,
              combined(),
              props.builder,
              props.settings,
              options,
            ),
          sheet: (doc) =>
            buildCombinedSheet(
              props.product,
              props.order,
              combined(),
              props.builder,
              props.settings,
              doc,
            ),
        }}
        settings={props.settings}
        onTemplateChange={props.onTemplateChange}
        onKindChange={props.onKindChange}
      />
    </>
  );
}
