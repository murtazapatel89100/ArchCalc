import { createEffect, createRoot, on } from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { v4 as uuidv4 } from "uuid";
import { createLocalStorage } from "../../utils/createLocalStorage";
import type { QuoteBuilder } from "./builders";
import type { Product, Quote, QuoteInputs, QuoteSettings } from "./types";

export const QUOTES_KEY = "archcalc_quotes";
export const QUOTE_SETTINGS_KEY = "archcalc_quote_settings";

export const defaultQuoteSettings: QuoteSettings = {
  businessName: "",
  contact: "",
  currency: "INR",
  templateId: "classic",
  defaultTaxPercent: 0,
};

const readProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Error reading localStorage key "${QUOTES_KEY}":`, error);
    return [];
  }
};

/**
 * Products live in a fine-grained store rather than `createLocalStorage`, so editing a field
 * updates only that field instead of replacing the whole list (which would remount the inputs).
 * External changes (Settings import / clear) are merged back in with `reconcile`.
 */
const store = createRoot(() => {
  const [products, setProducts] = createStore<Product[]>(readProducts());

  createEffect(
    on(
      () => JSON.stringify(products),
      (json) => {
        try {
          localStorage.setItem(QUOTES_KEY, json);
        } catch (error) {
          console.warn(
            `Error setting localStorage key "${QUOTES_KEY}":`,
            error,
          );
        }
      },
      { defer: true },
    ),
  );

  window.addEventListener("local-storage", () => {
    setProducts(reconcile(readProducts(), { key: "id" }));
  });

  return { products, setProducts };
});

export const products = store.products;

export function defaultInputs(
  builder: QuoteBuilder,
  taxPercent: number,
): QuoteInputs {
  return {
    fields: Object.fromEntries(
      builder.fields.map((fd) => [fd.key, fd.default]),
    ),
    materials: builder.defaults.materials.map((m) => ({ ...m, id: uuidv4() })),
    overheads: builder.defaults.overheads.map((o) => ({ ...o, id: uuidv4() })),
    profit: { ...builder.defaults.profit },
    quantity: builder.defaultQuantity ?? 1,
    discount: { mode: "percent", value: 0 },
    taxPercent,
    rounding: "1",
  };
}

const newQuote = (label: string, inputs: QuoteInputs): Quote => {
  const now = Date.now();
  return {
    id: uuidv4(),
    label,
    inputs,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
};

const indexOf = (productId: string) =>
  store.products.findIndex((p) => p.id === productId);

export const quoteActions = {
  createProduct(name: string, builder: QuoteBuilder, taxPercent: number) {
    const product: Product = {
      id: uuidv4(),
      name,
      builderId: builder.id,
      quotes: [newQuote("Quote 1", defaultInputs(builder, taxPercent))],
      createdAt: Date.now(),
    };
    store.setProducts(store.products.length, product);
    return product;
  },

  renameProduct(productId: string, name: string) {
    store.setProducts((p) => p.id === productId, "name", name);
  },

  deleteProduct(productId: string) {
    store.setProducts((list) => list.filter((p) => p.id !== productId));
  },

  addQuote(productId: string, builder: QuoteBuilder, taxPercent: number) {
    const i = indexOf(productId);
    if (i < 0) return undefined;
    const quote = newQuote(
      `Quote ${store.products[i].quotes.length + 1}`,
      defaultInputs(builder, taxPercent),
    );
    store.setProducts(i, "quotes", (qs) => [...qs, quote]);
    return quote;
  },

  duplicateQuote(productId: string, quoteId: string) {
    const i = indexOf(productId);
    const source = store.products[i]?.quotes.find((q) => q.id === quoteId);
    if (!source) return undefined;
    const copy = newQuote(
      `${source.label} (copy)`,
      JSON.parse(JSON.stringify(source.inputs)),
    );
    copy.notes = source.notes;
    store.setProducts(i, "quotes", (qs) => [...qs, copy]);
    return copy;
  },

  deleteQuote(productId: string, quoteId: string) {
    store.setProducts(
      (p) => p.id === productId,
      "quotes",
      (qs) => qs.filter((q) => q.id !== quoteId),
    );
  },

  /** Mutate one quote in place; bumps `updatedAt`. */
  updateQuote(productId: string, quoteId: string, fn: (q: Quote) => void) {
    store.setProducts(
      (p) => p.id === productId,
      "quotes",
      (q) => q.id === quoteId,
      produce((q) => {
        fn(q);
        q.updatedAt = Date.now();
      }),
    );
  },

  newLineId: () => uuidv4(),
};

export function useQuoteSettings() {
  const [settings, setSettings] = createLocalStorage<QuoteSettings>(
    QUOTE_SETTINGS_KEY,
    defaultQuoteSettings,
  );
  const merged = () => ({ ...defaultQuoteSettings, ...settings() });
  const update = (patch: Partial<QuoteSettings>) =>
    setSettings({ ...merged(), ...patch });
  return [merged, update] as const;
}
