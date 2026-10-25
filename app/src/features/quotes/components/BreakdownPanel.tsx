import { FileDown, TriangleAlert } from "lucide-solid";
import { For, type JSX, Show } from "solid-js";
import { Button } from "../../../components/ui";
import { cn } from "../../../utils/cn";
import { formatMoney, formatPercent } from "../format";
import type { CostLine, QuoteResult } from "../types";

export function BreakdownPanel(props: {
  result: QuoteResult;
  currency: string;
  unitLabel: string;
  onExport: () => void;
}) {
  const money = (v: number) => formatMoney(v, props.currency);
  const r = () => props.result;

  return (
    <aside class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl overflow-hidden">
      <div class="p-5 bg-gradient-to-br from-[var(--color-app-accent)]/15 to-transparent border-b border-[var(--color-app-border)]">
        <p class="text-xs uppercase tracking-wider text-[var(--color-app-text-secondary)]">
          Price per {props.unitLabel}
        </p>
        <p
          class="text-3xl font-semibold font-mono mt-1"
          data-testid="price-per-unit"
        >
          {money(r().pricePerUnit)}
        </p>
        <div class="flex gap-4 mt-3 text-xs">
          <Stat label="Cost" value={money(r().costPerUnit)} />
          <Stat
            label="Profit"
            value={money(r().profitPerUnit)}
            tone={r().profitPerUnit < 0 ? "bad" : "good"}
          />
          <Stat label="Margin" value={formatPercent(r().marginPercent)} />
        </div>
      </div>

      <div class="p-5 space-y-4 text-sm">
        <Section title="Base cost" lines={r().baseLines} money={money} />
        <Section title="Materials" lines={r().materialLines} money={money} />
        <Section title="Overheads" lines={r().overheadLines} money={money} />

        <div class="border-t border-[var(--color-app-border)] pt-3 space-y-1.5">
          <Line
            label={`Cost per ${props.unitLabel}`}
            value={money(r().costPerUnit)}
            strong
          />
          <Line
            label={`Markup ${formatPercent(r().markupPercent)}`}
            value={money(r().profitPerUnit)}
          />
          <Line
            label={`Price per ${props.unitLabel}`}
            value={money(r().pricePerUnit)}
            strong
          />
        </div>

        <div class="border-t border-[var(--color-app-border)] pt-3 space-y-1.5">
          <Line
            label={`Subtotal (${r().quantity} × ${money(r().pricePerUnit)})`}
            value={money(r().subtotal)}
          />
          <Show when={r().discount > 0}>
            <Line label="Discount" value={`− ${money(r().discount)}`} />
          </Show>
          <Show when={r().tax > 0}>
            <Line label="Tax" value={money(r().tax)} />
          </Show>
          <Line label="Order total" value={money(r().total)} strong big />
          <Line label="Order profit" value={money(r().orderProfit)} muted />
        </div>

        <Show when={r().warnings.length > 0}>
          <div class="rounded-lg border border-[var(--color-app-warning)]/40 bg-[var(--color-app-warning)]/10 p-3 space-y-1">
            <For each={r().warnings}>
              {(w) => (
                <p class="flex gap-2 text-xs text-[var(--color-app-warning)]">
                  <TriangleAlert size={14} class="shrink-0 mt-px" /> {w}
                </p>
              )}
            </For>
          </div>
        </Show>

        <Button variant="primary" class="w-full" onClick={props.onExport}>
          <FileDown size={16} /> Export quote
        </Button>
      </div>
    </aside>
  );
}

function Stat(props: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <p class="text-[var(--color-app-text-secondary)]">{props.label}</p>
      <p
        class={cn(
          "font-mono font-medium",
          props.tone === "good" && "text-[var(--color-app-success)]",
          props.tone === "bad" && "text-[var(--color-app-error)]",
        )}
      >
        {props.value}
      </p>
    </div>
  );
}

function Section(props: {
  title: string;
  lines: CostLine[];
  money: (v: number) => string;
}): JSX.Element {
  const visible = () => props.lines.filter((l) => l.amount !== 0);
  return (
    <Show when={visible().length > 0}>
      <div class="space-y-1.5">
        <p class="text-[11px] uppercase tracking-wider text-[var(--color-app-text-secondary)]">
          {props.title}
        </p>
        <For each={visible()}>
          {(l) => <Line label={l.label} value={props.money(l.amount)} muted />}
        </For>
      </div>
    </Show>
  );
}

function Line(props: {
  label: string;
  value: string;
  strong?: boolean;
  big?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      class={cn(
        "flex justify-between gap-3",
        props.muted && "text-[var(--color-app-text-secondary)]",
        props.strong && "font-medium",
        props.big && "text-base",
      )}
    >
      <span class="truncate">{props.label}</span>
      <span class="font-mono shrink-0">{props.value}</span>
    </div>
  );
}
