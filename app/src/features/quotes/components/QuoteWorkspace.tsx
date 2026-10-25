import { Columns3, CopyPlus, Package, Plus, Trash2 } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import { Button, Card, inputClass, Select } from "../../../components/ui";
import { cn } from "../../../utils/cn";
import type { QuoteBuilder } from "../builders";
import { currencySymbol } from "../format";
import { resultFor } from "../result";
import { products, quoteActions, useQuoteSettings } from "../store";
import { BreakdownPanel } from "./BreakdownPanel";
import { CompareView } from "./CompareView";
import { ExportModal } from "./ExportModal";
import { QuoteEditor } from "./QuoteEditor";

const COMPARE = "__compare__";

export function QuoteWorkspace(props: { builder: QuoteBuilder }) {
  const [settings, updateSettings] = useQuoteSettings();
  const builderProducts = createMemo(() =>
    products.filter((p) => p.builderId === props.builder.id),
  );

  const [productId, setProductId] = createSignal<string | null>(
    builderProducts()[0]?.id ?? null,
  );
  const product = () =>
    builderProducts().find((p) => p.id === productId()) ?? builderProducts()[0];

  const [quoteId, setQuoteId] = createSignal<string | null>(null);
  const quote = () => {
    const p = product();
    if (!p) return undefined;
    return p.quotes.find((q) => q.id === quoteId()) ?? p.quotes[0];
  };
  const comparing = () => quoteId() === COMPARE;

  const result = createMemo(() => {
    const q = quote();
    return q ? resultFor(props.builder, q.inputs) : undefined;
  });

  const [newName, setNewName] = createSignal("");
  const [addingProduct, setAddingProduct] = createSignal(false);
  const [exportOpen, setExportOpen] = createSignal(false);

  const createProduct = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const p = quoteActions.createProduct(
      trimmed,
      props.builder,
      settings().defaultTaxPercent,
    );
    setProductId(p.id);
    setQuoteId(null);
    setNewName("");
  };

  const deleteProduct = () => {
    const p = product();
    if (!p || !confirm(`Delete "${p.name}" and all its quotes?`)) return;
    quoteActions.deleteProduct(p.id);
    setProductId(builderProducts()[0]?.id ?? null);
    setQuoteId(null);
  };

  const deleteQuote = () => {
    const p = product();
    const q = quote();
    if (!p || !q) return;
    if (p.quotes.length === 1) {
      alert("A product needs at least one quote.");
      return;
    }
    if (!confirm(`Delete quote "${q.label}"?`)) return;
    quoteActions.deleteQuote(p.id, q.id);
    setQuoteId(null);
  };

  return (
    <Show
      when={product()}
      fallback={
        <Card class="max-w-lg mx-auto mt-10 text-center">
          <div class="flex flex-col items-center gap-3 py-4">
            <div class="w-12 h-12 rounded-xl bg-[var(--color-app-accent)]/15 text-[var(--color-app-accent)] flex items-center justify-center">
              <Package size={22} />
            </div>
            <h2 class="font-semibold">Create your first product</h2>
            <p class="text-sm text-[var(--color-app-text-secondary)]">
              A product holds one or more quotes — e.g. one per filament or
              material — so you can compare them side by side.
            </p>
            <form
              class="flex gap-2 w-full mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                createProduct(newName());
              }}
            >
              <input
                value={newName()}
                onInput={(e) => setNewName(e.currentTarget.value)}
                placeholder="Product name, e.g. Dragon keychain"
                aria-label="Product name"
                class={cn(inputClass, "flex-1")}
                autofocus
              />
              <Button type="submit" variant="primary">
                Create
              </Button>
            </form>
          </div>
        </Card>
      }
    >
      {(p) => (
        <div class="flex flex-col gap-4">
          {/* Product bar */}
          <div class="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Product"
              class="min-w-48"
              value={p().id}
              options={builderProducts().map((bp) => ({
                value: bp.id,
                label: bp.name,
              }))}
              onChange={(id) => {
                setProductId(id);
                setQuoteId(null);
              }}
            />
            <input
              value={p().name}
              aria-label="Rename product"
              class={cn(inputClass, "w-48")}
              onChange={(e) =>
                quoteActions.renameProduct(
                  p().id,
                  e.currentTarget.value.trim() || p().name,
                )
              }
            />
            <Button variant="danger" size="sm" onClick={deleteProduct}>
              <Trash2 size={14} /> Delete product
            </Button>
            <div class="flex-1" />
            <Show
              when={addingProduct()}
              fallback={
                <Button size="sm" onClick={() => setAddingProduct(true)}>
                  <Plus size={14} /> New product
                </Button>
              }
            >
              <form
                class="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createProduct(newName());
                  setAddingProduct(false);
                }}
              >
                <input
                  value={newName()}
                  onInput={(e) => setNewName(e.currentTarget.value)}
                  onKeyDown={(e) =>
                    e.key === "Escape" && setAddingProduct(false)
                  }
                  placeholder="New product name"
                  aria-label="New product name"
                  class={cn(inputClass, "w-48")}
                  autofocus
                />
                <Button type="submit" size="sm" variant="primary">
                  Add
                </Button>
              </form>
            </Show>
          </div>

          {/* Quote tabs */}
          <div class="flex items-center gap-1 border-b border-[var(--color-app-border)] overflow-x-auto">
            <For each={p().quotes}>
              {(q) => (
                <TabButton
                  active={!comparing() && quote()?.id === q.id}
                  onClick={() => setQuoteId(q.id)}
                >
                  {q.label}
                </TabButton>
              )}
            </For>
            <button
              aria-label="Add quote"
              title="Add quote"
              class="p-2 mb-px text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)]"
              onClick={() => {
                const q = quoteActions.addQuote(
                  p().id,
                  props.builder,
                  settings().defaultTaxPercent,
                );
                if (q) setQuoteId(q.id);
              }}
            >
              <Plus size={16} />
            </button>
            <div class="flex-1" />
            <TabButton active={comparing()} onClick={() => setQuoteId(COMPARE)}>
              <Columns3 size={14} /> Compare
            </TabButton>
          </div>

          <Show
            when={!comparing() && quote()}
            fallback={
              <CompareView
                product={p()}
                builder={props.builder}
                currency={settings().currency}
                onOpen={setQuoteId}
              />
            }
          >
            {(q) => (
              <>
                <div class="flex flex-wrap items-center gap-2">
                  <input
                    value={q().label}
                    aria-label="Quote name"
                    placeholder="Quote name, e.g. PLA Basic"
                    class={cn(inputClass, "w-56")}
                    onInput={(e) => {
                      const v = e.currentTarget.value;
                      quoteActions.updateQuote(p().id, q().id, (draft) => {
                        draft.label = v;
                      });
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const copy = quoteActions.duplicateQuote(p().id, q().id);
                      if (copy) setQuoteId(copy.id);
                    }}
                  >
                    <CopyPlus size={14} /> Duplicate
                  </Button>
                  <Button variant="danger" size="sm" onClick={deleteQuote}>
                    <Trash2 size={14} /> Delete quote
                  </Button>
                  <span class="text-xs text-[var(--color-app-text-secondary)] ml-auto">
                    Saved {new Date(q().updatedAt).toLocaleString()}
                  </span>
                </div>

                {/* Container queries: the sidebar eats viewport width, so size by the content area. */}
                <div class="@container">
                  <div class="grid grid-cols-1 @2xl:grid-cols-[minmax(0,1fr)_260px] @4xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                    <div class="@2xl:order-2 @2xl:sticky @2xl:top-0">
                      <Show when={result()}>
                        {(r) => (
                          <BreakdownPanel
                            result={r()}
                            currency={settings().currency}
                            unitLabel={props.builder.unitLabel}
                            onExport={() => setExportOpen(true)}
                          />
                        )}
                      </Show>
                    </div>
                    <div class="@2xl:order-1">
                      <QuoteEditor
                        productId={p().id}
                        quote={q()}
                        builder={props.builder}
                        currencySymbol={currencySymbol(settings().currency)}
                      />
                    </div>
                  </div>
                </div>

                <Show when={result()}>
                  {(r) => (
                    <ExportModal
                      open={exportOpen()}
                      onClose={() => setExportOpen(false)}
                      product={p()}
                      quote={q()}
                      result={r()}
                      builder={props.builder}
                      settings={settings()}
                      onTemplateChange={(templateId) =>
                        updateSettings({ templateId })
                      }
                      onKindChange={(exportKind) =>
                        updateSettings({ exportKind })
                      }
                    />
                  )}
                </Show>
              </>
            )}
          </Show>
        </div>
      )}
    </Show>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: import("solid-js").JSX.Element;
}) {
  return (
    <button
      onClick={props.onClick}
      class={cn(
        "flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
        props.active
          ? "border-[var(--color-app-accent)] text-[var(--color-app-text-primary)]"
          : "border-transparent text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)]",
      )}
    >
      {props.children}
    </button>
  );
}
