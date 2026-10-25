import { For } from "solid-js";
import { cn } from "../../../utils/cn";
import type { QuoteBuilder } from "../builders";
import { formatMoney, formatPercent } from "../format";
import { resultFor } from "../result";
import type { Product, QuoteResult } from "../types";

const metrics: {
  label: string;
  value: (r: QuoteResult, money: (v: number) => string) => string;
  pick?: "min" | "max";
  raw?: (r: QuoteResult) => number;
}[] = [
  { label: "Base cost", value: (r, m) => m(r.baseCost) },
  { label: "Materials", value: (r, m) => m(r.materialsCost) },
  { label: "Overheads", value: (r, m) => m(r.overheadsCost) },
  {
    label: "Cost per unit",
    value: (r, m) => m(r.costPerUnit),
    pick: "min",
    raw: (r) => r.costPerUnit,
  },
  {
    label: "Price per unit",
    value: (r, m) => m(r.pricePerUnit),
    pick: "min",
    raw: (r) => r.pricePerUnit,
  },
  {
    label: "Profit per unit",
    value: (r, m) => m(r.profitPerUnit),
    pick: "max",
    raw: (r) => r.profitPerUnit,
  },
  {
    label: "Margin",
    value: (r) => formatPercent(r.marginPercent),
    pick: "max",
    raw: (r) => r.marginPercent,
  },
  { label: "Quantity", value: (r) => String(r.quantity) },
  { label: "Order total", value: (r, m) => m(r.total) },
];

export function CompareView(props: {
  product: Product;
  builder: QuoteBuilder;
  currency: string;
  onOpen: (quoteId: string) => void;
}) {
  const money = (v: number) => formatMoney(v, props.currency);
  const results = () =>
    props.product.quotes.map((q) => resultFor(props.builder, q.inputs));

  const isBest = (i: number, m: (typeof metrics)[number]) => {
    if (!m.pick || !m.raw || results().length < 2) return false;
    const values = results().map(m.raw);
    if (values.every((v) => v === values[0])) return false;
    const best = m.pick === "min" ? Math.min(...values) : Math.max(...values);
    return values[i] === best;
  };

  return (
    <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[var(--color-app-border)]">
            <th class="text-left font-medium text-[var(--color-app-text-secondary)] p-4 w-40">
              Metric
            </th>
            <For each={props.product.quotes}>
              {(q) => (
                <th class="text-right p-4">
                  <button
                    class="font-semibold hover:text-[var(--color-app-accent)] transition-colors"
                    onClick={() => props.onOpen(q.id)}
                  >
                    {q.label}
                  </button>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={metrics}>
            {(m) => (
              <tr class="border-b border-[var(--color-app-border)]/60 last:border-0">
                <td class="p-4 py-2.5 text-[var(--color-app-text-secondary)]">
                  {m.label}
                </td>
                <For each={results()}>
                  {(r, i) => (
                    <td
                      class={cn(
                        "p-4 py-2.5 text-right font-mono",
                        isBest(i(), m) &&
                          "text-[var(--color-app-success)] font-semibold",
                      )}
                    >
                      {m.value(r, money)}
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
