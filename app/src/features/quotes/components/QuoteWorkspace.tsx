import {
  ChevronRight,
  Columns3,
  CopyPlus,
  FileText,
  Layers,
  Package,
  Plus,
  Trash2,
  Users,
} from "lucide-solid";
import { createMemo, createSignal, For, type JSX, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Button, Card, inputClass } from "../../../components/ui";
import { cn } from "../../../utils/cn";
import type { QuoteBuilder } from "../builders";
import { orderResult } from "../combined";
import { buildExportDoc } from "../export/document";
import { buildSheet } from "../export/sheet";
import { currencySymbol, formatMoney, formatPercent } from "../format";
import { resultFor } from "../result";
import { draftOrder, products, quoteActions, useQuoteSettings } from "../store";
import type { ClientOrder, Product, Quote } from "../types";
import { BreakdownPanel } from "./BreakdownPanel";
import { CombinedView } from "./CombinedView";
import { CompareView } from "./CompareView";
import { ExportModal } from "./ExportModal";
import { QuoteEditor } from "./QuoteEditor";

const lastUpdated = (p: Product) =>
  Math.max(p.createdAt, ...p.quotes.map((q) => q.updatedAt));

const timeAgo = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString();
};

/**
 * Products → quotes → editor. Picking a builder tile lists its products; a product lists its
 * quotes; a quote opens the editor. Breadcrumbs step back up.
 */
export function QuoteWorkspace(props: { builder: QuoteBuilder }) {
  const [settings, updateSettings] = useQuoteSettings();
  const builderProducts = createMemo(() =>
    products
      .filter((p) => p.builderId === props.builder.id)
      .slice()
      .sort((a, b) => lastUpdated(b) - lastUpdated(a)),
  );

  const [productId, setProductId] = createSignal<string | null>(null);
  const [quoteId, setQuoteId] = createSignal<string | null>(null);
  const [comparing, setComparing] = createSignal(false);
  const [orderId, setOrderId] = createSignal<string | null>(null);
  // An unsaved combined quote, from ticking quotes and pressing Combine.
  const [draft, setDraft] = createStore<{ order: ClientOrder | null }>({
    order: null,
  });

  const product = () => builderProducts().find((p) => p.id === productId());
  const quote = () => product()?.quotes.find((q) => q.id === quoteId());
  const savedOrder = () => product()?.orders?.find((o) => o.id === orderId());

  const reset = () => {
    setQuoteId(null);
    setComparing(false);
    setOrderId(null);
    setDraft("order", null);
  };
  const openProducts = () => {
    reset();
    setProductId(null);
  };
  const openProduct = (id: string) => {
    reset();
    setProductId(id);
  };
  const openQuote = (pid: string, qid: string) => {
    reset();
    setProductId(pid);
    setQuoteId(qid);
  };
  const openOrder = (oid: string) => {
    reset();
    setOrderId(oid);
  };
  const combine = (p: Product, quoteIds: string[]) => {
    reset();
    setDraft(
      "order",
      draftOrder(
        quoteIds,
        settings().defaultTaxPercent,
        `Order ${(p.orders?.length ?? 0) + 1}`,
      ),
    );
  };
  const deleteOrder = (p: Product, o: ClientOrder) => {
    if (!confirm(`Delete client order "${o.label}"? Its quotes are kept.`))
      return;
    quoteActions.deleteOrder(p.id, o.id);
    if (orderId() === o.id) openProduct(p.id);
  };

  const priceOf = (q: Quote) => resultFor(props.builder, q.inputs);
  const money = (v: number) => formatMoney(v, settings().currency);

  const createProduct = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const p = quoteActions.createProduct(
      trimmed,
      props.builder,
      settings().defaultTaxPercent,
    );
    // Straight into the first quote: the usual next step is filling it in.
    openQuote(p.id, p.quotes[0].id);
    return true;
  };

  const deleteProduct = (p: Product) => {
    if (!confirm(`Delete "${p.name}" and all its quotes?`)) return;
    quoteActions.deleteProduct(p.id);
    if (productId() === p.id) openProducts();
  };

  const deleteQuote = (p: Product, q: Quote) => {
    if (p.quotes.length === 1) {
      alert("A product needs at least one quote.");
      return;
    }
    if (!confirm(`Delete quote "${q.label}"?`)) return;
    quoteActions.deleteQuote(p.id, q.id);
    if (quoteId() === q.id) openProduct(p.id);
  };

  return (
    <div class="flex flex-col gap-4">
      <Show when={product()}>
        {(p) => (
          <nav
            aria-label="Breadcrumb"
            class="flex items-center gap-1 text-sm text-[var(--color-app-text-secondary)] min-w-0"
          >
            <Crumb onClick={openProducts}>All products</Crumb>
            <ChevronRight size={14} class="shrink-0 opacity-60" />
            <Show
              when={quote() || comparing() || savedOrder() || draft.order}
              fallback={<CrumbCurrent>{p().name}</CrumbCurrent>}
            >
              <Crumb onClick={() => openProduct(p().id)}>{p().name}</Crumb>
              <ChevronRight size={14} class="shrink-0 opacity-60" />
              <CrumbCurrent>
                {comparing()
                  ? "Compare"
                  : (quote()?.label ??
                    savedOrder()?.label ??
                    draft.order?.label ??
                    "")}
              </CrumbCurrent>
            </Show>
          </nav>
        )}
      </Show>

      <Show
        when={product()}
        fallback={
          <ProductList
            builder={props.builder}
            products={builderProducts()}
            money={money}
            priceOf={priceOf}
            onOpen={openProduct}
            onCreate={createProduct}
            onDelete={deleteProduct}
          />
        }
      >
        {(p) => (
          <Show
            when={quote()}
            fallback={
              <Show
                when={comparing()}
                fallback={
                  <Show
                    when={savedOrder() ?? draft.order}
                    fallback={
                      <QuoteList
                        product={p()}
                        builder={props.builder}
                        money={money}
                        priceOf={priceOf}
                        onOpen={(qid) => openQuote(p().id, qid)}
                        onCompare={() => setComparing(true)}
                        onNew={() => {
                          const q = quoteActions.addQuote(
                            p().id,
                            props.builder,
                            settings().defaultTaxPercent,
                          );
                          if (q) openQuote(p().id, q.id);
                        }}
                        onDuplicate={(qid) =>
                          quoteActions.duplicateQuote(p().id, qid)
                        }
                        onDeleteQuote={(q) => deleteQuote(p(), q)}
                        onDeleteProduct={() => deleteProduct(p())}
                        onCombine={(ids) => combine(p(), ids)}
                        onOpenOrder={openOrder}
                        onDeleteOrder={(o) => deleteOrder(p(), o)}
                      />
                    }
                  >
                    {(o) => (
                      <CombinedView
                        product={p()}
                        builder={props.builder}
                        order={o()}
                        saved={!!savedOrder()}
                        settings={settings()}
                        onUpdate={(fn) => {
                          const saved = savedOrder();
                          if (saved)
                            quoteActions.updateOrder(p().id, saved.id, fn);
                          else
                            setDraft(
                              "order",
                              produce((d) => d && fn(d)),
                            );
                        }}
                        onSave={() => {
                          if (!draft.order) return;
                          const saved = quoteActions.saveOrder(
                            p().id,
                            draft.order,
                          );
                          if (saved) openOrder(saved.id);
                        }}
                        onDelete={() => {
                          const saved = savedOrder();
                          if (saved) deleteOrder(p(), saved);
                        }}
                        onOpenQuote={(qid) => openQuote(p().id, qid)}
                        onTemplateChange={(templateId) =>
                          updateSettings({ templateId })
                        }
                        onKindChange={(exportKind) =>
                          updateSettings({ exportKind })
                        }
                      />
                    )}
                  </Show>
                }
              >
                <CompareView
                  product={p()}
                  builder={props.builder}
                  currency={settings().currency}
                  onOpen={(qid) => openQuote(p().id, qid)}
                />
              </Show>
            }
          >
            {(q) => (
              <QuoteEditorView
                product={p()}
                quote={q()}
                builder={props.builder}
                onDuplicate={() => {
                  const copy = quoteActions.duplicateQuote(p().id, q().id);
                  if (copy) openQuote(p().id, copy.id);
                }}
                onDelete={() => deleteQuote(p(), q())}
                settings={settings()}
                onTemplateChange={(templateId) =>
                  updateSettings({ templateId })
                }
                onKindChange={(exportKind) => updateSettings({ exportKind })}
              />
            )}
          </Show>
        )}
      </Show>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Products list
// ------------------------------------------------------------------------------------------------

function ProductList(props: {
  builder: QuoteBuilder;
  products: Product[];
  money: (v: number) => string;
  priceOf: (q: Quote) => ReturnType<typeof resultFor>;
  onOpen: (id: string) => void;
  onCreate: (name: string) => boolean;
  onDelete: (p: Product) => void;
}) {
  const [newName, setNewName] = createSignal("");
  const submit = (e: Event) => {
    e.preventDefault();
    if (props.onCreate(newName())) setNewName("");
  };
  const newProductForm = (big: boolean) => (
    <form class={cn("flex gap-2", big && "w-full mt-2")} onSubmit={submit}>
      <input
        value={newName()}
        onInput={(e) => setNewName(e.currentTarget.value)}
        placeholder="Product name, e.g. Dragon keychain"
        aria-label="Product name"
        class={cn(inputClass, big ? "flex-1" : "w-64")}
        autofocus={big}
      />
      <Button type="submit" variant="primary" size={big ? "md" : "sm"}>
        {big ? (
          "Create"
        ) : (
          <>
            <Plus size={14} /> New product
          </>
        )}
      </Button>
    </form>
  );

  return (
    <Show
      when={props.products.length > 0}
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
            {newProductForm(true)}
          </div>
        </Card>
      }
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-semibold">
            Products{" "}
            <span class="text-[var(--color-app-text-secondary)] font-normal">
              ({props.products.length})
            </span>
          </h2>
          {newProductForm(false)}
        </div>
        <ul class="flex flex-col gap-2">
          <For each={props.products}>
            {(p) => {
              const prices = () => p.quotes.map((q) => props.priceOf(q));
              const from = () =>
                Math.min(...prices().map((r) => r.pricePerUnit));
              return (
                <li>
                  <ListRow
                    onClick={() => props.onOpen(p.id)}
                    icon={<Package size={18} />}
                    title={p.name}
                    subtitle={`${p.quotes.length} ${p.quotes.length === 1 ? "quote" : "quotes"} · updated ${timeAgo(lastUpdated(p))}`}
                    meta={
                      <>
                        <span class="text-[11px] text-[var(--color-app-text-secondary)]">
                          {p.quotes.length > 1 ? "Lowest price" : "Price"} per{" "}
                          {props.builder.unitLabel}
                        </span>
                        <span class="font-mono font-semibold">
                          {props.money(from())}
                        </span>
                      </>
                    }
                    actions={
                      <IconButton
                        label={`Delete ${p.name}`}
                        danger
                        onClick={() => props.onDelete(p)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    }
                  />
                </li>
              );
            }}
          </For>
        </ul>
      </div>
    </Show>
  );
}

// ------------------------------------------------------------------------------------------------
// Quotes list for one product
// ------------------------------------------------------------------------------------------------

function QuoteList(props: {
  product: Product;
  builder: QuoteBuilder;
  money: (v: number) => string;
  priceOf: (q: Quote) => ReturnType<typeof resultFor>;
  onOpen: (quoteId: string) => void;
  onCompare: () => void;
  onNew: () => void;
  onDuplicate: (quoteId: string) => void;
  onDeleteQuote: (q: Quote) => void;
  onDeleteProduct: () => void;
  onCombine: (quoteIds: string[]) => void;
  onOpenOrder: (orderId: string) => void;
  onDeleteOrder: (o: ClientOrder) => void;
}) {
  const [picked, setPicked] = createSignal<string[]>([]);
  // Ticked quotes that still exist, in the product's quote order.
  const selection = () =>
    props.product.quotes.map((q) => q.id).filter((id) => picked().includes(id));
  const toggle = (id: string, on: boolean) =>
    setPicked((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)));

  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <input
          value={props.product.name}
          aria-label="Product name"
          class={cn(inputClass, "w-64 font-medium")}
          onChange={(e) =>
            quoteActions.renameProduct(
              props.product.id,
              e.currentTarget.value.trim() || props.product.name,
            )
          }
        />
        <Button variant="danger" size="sm" onClick={props.onDeleteProduct}>
          <Trash2 size={14} /> Delete product
        </Button>
        <div class="flex-1" />
        <Show when={props.product.quotes.length > 1}>
          <Button size="sm" onClick={props.onCompare}>
            <Columns3 size={14} /> Compare
          </Button>
          <Button
            size="sm"
            disabled={selection().length < 2}
            title="Tick two or more quotes to combine them into one quote for a client"
            onClick={() => props.onCombine(selection())}
          >
            <Layers size={14} /> Combine
            {selection().length ? ` (${selection().length})` : ""}
          </Button>
        </Show>
        <Button size="sm" variant="primary" onClick={props.onNew}>
          <Plus size={14} /> New quote
        </Button>
      </div>

      <ul class="flex flex-col gap-2">
        <For each={props.product.quotes}>
          {(q) => {
            const r = () => props.priceOf(q);
            return (
              <li>
                <ListRow
                  leading={
                    <Show when={props.product.quotes.length > 1}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${q.label} to combine`}
                        checked={selection().includes(q.id)}
                        onChange={(e) => toggle(q.id, e.currentTarget.checked)}
                        class="ml-4 accent-[var(--color-app-accent)]"
                      />
                    </Show>
                  }
                  onClick={() => props.onOpen(q.id)}
                  icon={<FileText size={18} />}
                  title={q.label || "Untitled quote"}
                  subtitle={`${r().quantity} × ${props.money(r().pricePerUnit)} · ${formatPercent(r().marginPercent)} margin · updated ${timeAgo(q.updatedAt)}`}
                  meta={
                    <>
                      <span class="text-[11px] text-[var(--color-app-text-secondary)]">
                        Order total
                      </span>
                      <span class="font-mono font-semibold">
                        {props.money(r().total)}
                      </span>
                    </>
                  }
                  actions={
                    <>
                      <IconButton
                        label={`Duplicate ${q.label}`}
                        onClick={() => props.onDuplicate(q.id)}
                      >
                        <CopyPlus size={15} />
                      </IconButton>
                      <IconButton
                        label={`Delete ${q.label}`}
                        danger
                        onClick={() => props.onDeleteQuote(q)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </>
                  }
                />
              </li>
            );
          }}
        </For>
      </ul>

      <Show when={props.product.orders?.length}>
        <h2 class="text-sm font-semibold mt-3">
          Client orders{" "}
          <span class="text-[var(--color-app-text-secondary)] font-normal">
            ({props.product.orders?.length})
          </span>
        </h2>
        <ul class="flex flex-col gap-2">
          <For each={props.product.orders}>
            {(o) => {
              const r = () => orderResult(props.builder, props.product, o);
              return (
                <li>
                  <ListRow
                    onClick={() => props.onOpenOrder(o.id)}
                    icon={<Users size={18} />}
                    title={o.label || "Client order"}
                    subtitle={`${o.client.trim() || "No client"} · ${r().lines.length} ${r().lines.length === 1 ? "quote" : "quotes"} · updated ${timeAgo(o.updatedAt)}`}
                    meta={
                      <>
                        <span class="text-[11px] text-[var(--color-app-text-secondary)]">
                          Order total
                        </span>
                        <span class="font-mono font-semibold">
                          {props.money(r().total)}
                        </span>
                      </>
                    }
                    actions={
                      <IconButton
                        label={`Delete ${o.label}`}
                        danger
                        onClick={() => props.onDeleteOrder(o)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    }
                  />
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Editor for one quote
// ------------------------------------------------------------------------------------------------

function QuoteEditorView(props: {
  product: Product;
  quote: Quote;
  builder: QuoteBuilder;
  settings: ReturnType<ReturnType<typeof useQuoteSettings>[0]>;
  onDuplicate: () => void;
  onDelete: () => void;
  onTemplateChange: (id: string) => void;
  onKindChange: (
    kind: ReturnType<ReturnType<typeof useQuoteSettings>[0]>["exportKind"],
  ) => void;
}) {
  const [exportOpen, setExportOpen] = createSignal(false);
  const result = createMemo(() => resultFor(props.builder, props.quote.inputs));

  return (
    <>
      <div class="flex flex-wrap items-center gap-2">
        <input
          value={props.quote.label}
          aria-label="Quote name"
          placeholder="Quote name, e.g. PLA Basic"
          class={cn(inputClass, "w-56")}
          onInput={(e) => {
            const v = e.currentTarget.value;
            quoteActions.updateQuote(props.product.id, props.quote.id, (d) => {
              d.label = v;
            });
          }}
        />
        <Button size="sm" onClick={props.onDuplicate}>
          <CopyPlus size={14} /> Duplicate
        </Button>
        <Button variant="danger" size="sm" onClick={props.onDelete}>
          <Trash2 size={14} /> Delete quote
        </Button>
        <span class="text-xs text-[var(--color-app-text-secondary)] ml-auto">
          Saved {new Date(props.quote.updatedAt).toLocaleString()}
        </span>
      </div>

      {/* Container queries: the sidebar eats viewport width, so size by the content area. */}
      <div class="@container">
        <div class="grid grid-cols-1 @2xl:grid-cols-[minmax(0,1fr)_260px] @4xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
          <div class="@2xl:order-2 @2xl:sticky @2xl:top-0">
            <BreakdownPanel
              result={result()}
              currency={props.settings.currency}
              unitLabel={props.builder.unitLabel}
              onExport={() => setExportOpen(true)}
            />
          </div>
          <div class="@2xl:order-1">
            <QuoteEditor
              productId={props.product.id}
              quote={props.quote}
              builder={props.builder}
              currencySymbol={currencySymbol(props.settings.currency)}
            />
          </div>
        </div>
      </div>

      <ExportModal
        open={exportOpen()}
        onClose={() => setExportOpen(false)}
        source={{
          doc: (options) =>
            buildExportDoc(
              props.product,
              props.quote,
              result(),
              props.builder,
              props.settings,
              options,
            ),
          sheet: (doc) =>
            buildSheet(
              props.product,
              props.quote,
              result(),
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

// ------------------------------------------------------------------------------------------------
// Small pieces
// ------------------------------------------------------------------------------------------------

function ListRow(props: {
  /** Shown before the row's button, e.g. a selection checkbox. */
  leading?: JSX.Element;
  onClick: () => void;
  icon: JSX.Element;
  title: string;
  subtitle: string;
  meta: JSX.Element;
  actions: JSX.Element;
}) {
  return (
    <div class="group flex items-center gap-2 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] hover:border-[var(--color-app-accent)]/50 transition-colors pr-2">
      {props.leading}
      <button
        onClick={props.onClick}
        class="flex flex-1 min-w-0 items-center gap-4 p-4 text-left"
      >
        <span class="w-10 h-10 shrink-0 rounded-lg bg-[var(--color-app-surface-secondary)] flex items-center justify-center text-[var(--color-app-text-secondary)] group-hover:bg-[var(--color-app-accent)]/20 group-hover:text-[var(--color-app-accent)] transition-colors">
          {props.icon}
        </span>
        <span class="flex-1 min-w-0">
          <span class="block font-medium truncate">{props.title}</span>
          <span class="block text-xs text-[var(--color-app-text-secondary)] truncate">
            {props.subtitle}
          </span>
        </span>
        <span class="flex flex-col items-end shrink-0">{props.meta}</span>
        <ChevronRight
          size={16}
          class="shrink-0 text-[var(--color-app-text-secondary)] group-hover:text-[var(--color-app-accent)]"
        />
      </button>
      <div class="flex items-center gap-1 shrink-0">{props.actions}</div>
    </div>
  );
}

function IconButton(props: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: JSX.Element;
}) {
  return (
    <button
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      class={cn(
        "h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-app-text-secondary)] transition-colors",
        props.danger
          ? "hover:text-[var(--color-app-error)] hover:bg-[var(--color-app-error)]/10"
          : "hover:text-[var(--color-app-text-primary)] hover:bg-[var(--color-app-surface-secondary)]",
      )}
    >
      {props.children}
    </button>
  );
}

function Crumb(props: { onClick: () => void; children: JSX.Element }) {
  return (
    <button
      onClick={props.onClick}
      class="px-1.5 py-0.5 rounded hover:text-[var(--color-app-text-primary)] hover:bg-[var(--color-app-surface-secondary)] truncate max-w-56"
    >
      {props.children}
    </button>
  );
}

function CrumbCurrent(props: { children: JSX.Element }) {
  return (
    <span
      aria-current="page"
      class="px-1.5 py-0.5 text-[var(--color-app-text-primary)] font-medium truncate max-w-56"
    >
      {props.children}
    </span>
  );
}
