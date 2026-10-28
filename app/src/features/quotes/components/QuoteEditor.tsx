import { Plus } from "lucide-solid";
import { For, Show } from "solid-js";
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
import { fieldsFor, productionFor } from "../groups";
import { quoteActions } from "../store";
import type {
  DiscountMode,
  OverheadMode,
  ProfitMode,
  Quote,
  RoundingMode,
} from "../types";
import { NotesCard } from "./NotesCard";
import { EmptyRows, RemoveButton } from "./RowControls";

export const overheadModes: { value: OverheadMode; label: string }[] = [
  { value: "percent", label: "% of cost" },
  { value: "per_item", label: "Fixed per item" },
  { value: "per_order", label: "Fixed per order" },
];

export const profitModes: { value: ProfitMode; label: string; hint: string }[] =
  [
    {
      value: "markup",
      label: "Markup % on cost",
      hint: "Price = cost × (1 + markup%)",
    },
    {
      value: "margin",
      label: "Margin % of price",
      hint: "Profit is this share of the selling price",
    },
    {
      value: "fixed",
      label: "Fixed profit per item",
      hint: "Add a flat amount on top of cost",
    },
    {
      value: "multiplier",
      label: "Multiplier (×)",
      hint: "Price = cost × multiplier, e.g. 2.5×",
    },
    {
      value: "target",
      label: "Target selling price",
      hint: "Set the price; see the margin it gives",
    },
  ];

const roundingModes: { value: RoundingMode; label: string }[] = [
  { value: "none", label: "No rounding" },
  { value: "1", label: "Round up to 1" },
  { value: "5", label: "Round up to 5" },
  { value: "10", label: "Round up to 10" },
  { value: "end9", label: "Charm price (…9)" },
];

export function QuoteEditor(props: {
  productId: string;
  quote: Quote;
  builder: QuoteBuilder;
  currencySymbol: string;
}) {
  const update = (fn: (q: Quote) => void) =>
    quoteActions.updateQuote(props.productId, props.quote.id, fn);
  const inputs = () => props.quote.inputs;
  const cur = () => props.currencySymbol;

  const profitHint = () =>
    profitModes.find((m) => m.value === inputs().profit.mode)?.hint;
  const profitAffix = () => {
    switch (inputs().profit.mode) {
      case "markup":
      case "margin":
        return { suffix: "%" };
      case "multiplier":
        return { suffix: "×" };
      default:
        return { prefix: cur() };
    }
  };

  const fields = () => fieldsFor(props.builder, inputs());
  const production = () => productionFor(props.builder, inputs());
  const unit = () => props.builder.unitLabel;
  const quantityHint = () => {
    const p = production();
    if (!p) return undefined;
    if (inputs().simple) return `${p.explain}.`;
    if (p.short) return `${p.explain} makes ${p.made} — ${p.short} short.`;
    return p.spare
      ? `${p.explain} makes ${p.made} — ${p.spare} extra ${unit()}${p.spare === 1 ? "" : "s"} (spare or waste).`
      : `${p.explain} makes exactly ${p.made}.`;
  };
  const typeButton = (simple: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={!!inputs().simple === simple}
      onClick={() =>
        update((q) => {
          q.inputs.simple = simple;
        })
      }
      class={cn(
        "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors",
        !!inputs().simple === simple
          ? "bg-[var(--color-app-accent)] text-white shadow-sm"
          : "text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)]",
      )}
    >
      {label}
    </button>
  );

  return (
    <div class="@container flex flex-col gap-4 min-w-0">
      <section class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold">Quote type</h3>
          <p class="text-xs text-[var(--color-app-text-secondary)] mt-0.5">
            {inputs().simple
              ? "Simple: just the core costs, with utilities and overheads as one amount."
              : "Detailed: utilities, labour and overheads on top of the core costs."}
          </p>
        </div>
        <fieldset class="m-0 min-w-0 flex gap-1 p-1 rounded-lg bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] shrink-0">
          <legend class="sr-only">Quote type</legend>
          {typeButton(true, "Simple")}
          {typeButton(false, "Detailed")}
        </fieldset>
      </section>

      <For each={props.builder.groups ?? []}>
        {(group) => (
          <Card
            title={group.title}
            description={group.hint}
            actions={
              <Button
                size="sm"
                onClick={() =>
                  update((q) => {
                    q.inputs.groups ??= {};
                    q.inputs.groups[group.key] ??= [];
                    const rows = q.inputs.groups[group.key];
                    // New rows start from the last row's values, which is usually closest.
                    const last = rows[rows.length - 1];
                    rows.push({
                      id: quoteActions.newLineId(),
                      name: "",
                      values: last
                        ? { ...last.values }
                        : Object.fromEntries(
                            group.fields.map((fd) => [fd.key, fd.default]),
                          ),
                    });
                  })
                }
              >
                <Plus size={14} /> Add {group.itemLabel.toLowerCase()}
              </Button>
            }
          >
            <Show
              when={(inputs().groups?.[group.key] ?? []).length > 0}
              fallback={
                <EmptyRows text={`No ${group.title.toLowerCase()} yet.`} />
              }
            >
              <div class="flex flex-col gap-2.5">
                <For each={inputs().groups?.[group.key] ?? []}>
                  {(row, i) => (
                    <div class="rounded-lg border border-[var(--color-app-border)] p-3 flex flex-col gap-2.5">
                      <div class="flex items-center gap-2">
                        <span class="text-[11px] font-mono text-[var(--color-app-text-secondary)] w-5 text-center shrink-0">
                          {i() + 1}
                        </span>
                        <input
                          value={row.name}
                          placeholder={`${group.itemLabel} name, e.g. ${group.defaults[0]?.name ?? ""}`}
                          aria-label={`${group.itemLabel} name`}
                          class={cn(inputClass, "flex-1")}
                          onInput={(e) => {
                            const v = e.currentTarget.value;
                            update((q) => {
                              const r = q.inputs.groups?.[group.key]?.[i()];
                              if (r) r.name = v;
                            });
                          }}
                        />
                        <RemoveButton
                          onClick={() =>
                            update((q) => {
                              q.inputs.groups?.[group.key]?.splice(i(), 1);
                            })
                          }
                        />
                      </div>
                      <div
                        class={cn(
                          "grid grid-cols-1 gap-2.5 pl-7",
                          {
                            1: "",
                            2: "@md:grid-cols-2",
                            3: "@md:grid-cols-3",
                          }[group.fields.length] ??
                            "@md:grid-cols-2 @3xl:grid-cols-4",
                        )}
                      >
                        <For each={group.fields}>
                          {(fd) => (
                            <Field label={fd.label}>
                              <NumberInput
                                aria-label={`${group.itemLabel} ${i() + 1} ${fd.label}`}
                                value={row.values[fd.key] ?? fd.default}
                                prefix={
                                  fd.kind === "currency" ? cur() : undefined
                                }
                                suffix={fd.kind === "percent" ? "%" : fd.suffix}
                                onChange={(v) =>
                                  update((q) => {
                                    const r =
                                      q.inputs.groups?.[group.key]?.[i()];
                                    if (r) r.values[fd.key] = v;
                                  })
                                }
                              />
                            </Field>
                          )}
                        </For>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Card>
        )}
      </For>

      <Show when={fields().length > 0}>
        <Card
          title={props.builder.groups?.length ? "Settings" : props.builder.name}
          description={
            props.builder.groups?.length
              ? "Values that apply to the whole quote."
              : "Base cost inputs"
          }
        >
          <div class="grid grid-cols-1 @md:grid-cols-2 gap-3">
            <For each={fields()}>
              {(fd) => (
                <Field label={fd.label} hint={fd.hint}>
                  <NumberInput
                    value={inputs().fields[fd.key] ?? fd.default}
                    prefix={fd.kind === "currency" ? cur() : undefined}
                    suffix={fd.kind === "percent" ? "%" : fd.suffix}
                    onChange={(v) =>
                      update((q) => {
                        q.inputs.fields[fd.key] = v;
                      })
                    }
                  />
                </Field>
              )}
            </For>
          </div>
        </Card>
      </Show>

      <Card
        title="Raw materials"
        description={props.builder.materialsHint}
        actions={
          <Button
            size="sm"
            onClick={() =>
              update((q) => {
                q.inputs.materials.push({
                  id: quoteActions.newLineId(),
                  name: "",
                  unitCost: 0,
                  qty: 1,
                });
              })
            }
          >
            <Plus size={14} /> Add material
          </Button>
        }
      >
        <Show
          when={inputs().materials.length > 0}
          fallback={<EmptyRows text="No extra materials." />}
        >
          <div class="grid grid-cols-[minmax(0,1fr)_7rem_5.5rem_2rem] gap-2 text-[11px] uppercase tracking-wider text-[var(--color-app-text-secondary)] mb-1.5 px-0.5">
            <span>Name</span>
            <span>Unit cost</span>
            <span>Qty</span>
            <span />
          </div>
          <div class="flex flex-col gap-2">
            <For each={inputs().materials}>
              {(m, i) => (
                <div class="grid grid-cols-[minmax(0,1fr)_7rem_5.5rem_2rem] gap-2 items-center">
                  <input
                    value={m.name}
                    placeholder="e.g. Keyring"
                    aria-label="Material name"
                    class={inputClass}
                    onInput={(e) => {
                      const v = e.currentTarget.value;
                      update((q) => {
                        q.inputs.materials[i()].name = v;
                      });
                    }}
                  />
                  <NumberInput
                    aria-label="Unit cost"
                    value={m.unitCost}
                    prefix={cur()}
                    onChange={(v) =>
                      update((q) => {
                        q.inputs.materials[i()].unitCost = v;
                      })
                    }
                  />
                  <NumberInput
                    aria-label="Quantity"
                    value={m.qty}
                    onChange={(v) =>
                      update((q) => {
                        q.inputs.materials[i()].qty = v;
                      })
                    }
                  />
                  <RemoveButton
                    onClick={() =>
                      update((q) => {
                        q.inputs.materials.splice(i(), 1);
                      })
                    }
                  />
                </div>
              )}
            </For>
          </div>
        </Show>
      </Card>

      <Show when={inputs().simple}>
        <Card
          title="Utilities & overheads"
          description="Electricity, manpower, packaging, rent — all in one, as a % of cost or a fixed amount for the whole order. Detailed quotes list them one by one."
        >
          <Field label="Utilities & overheads">
            <div class="flex gap-2">
              <Select<DiscountMode>
                class="w-20 shrink-0"
                aria-label="Utilities type"
                value={inputs().utilities?.mode ?? "percent"}
                options={[
                  { value: "percent", label: "%" },
                  { value: "fixed", label: cur() },
                ]}
                onChange={(v) =>
                  update((q) => {
                    q.inputs.utilities = {
                      mode: v,
                      value: q.inputs.utilities?.value ?? 0,
                    };
                  })
                }
              />
              <NumberInput
                class="flex-1"
                aria-label="Utilities value"
                value={inputs().utilities?.value ?? 0}
                onChange={(v) =>
                  update((q) => {
                    q.inputs.utilities = {
                      mode: q.inputs.utilities?.mode ?? "percent",
                      value: v,
                    };
                  })
                }
              />
            </div>
          </Field>
        </Card>
      </Show>

      <Show when={!inputs().simple}>
        <Card
          title="Overheads & utilities"
          description="Electricity, manpower, packaging, rent — as a % of cost or a fixed amount."
          actions={
            <Button
              size="sm"
              onClick={() =>
                update((q) => {
                  q.inputs.overheads.push({
                    id: quoteActions.newLineId(),
                    name: "",
                    mode: "percent",
                    value: 0,
                  });
                })
              }
            >
              <Plus size={14} /> Add overhead
            </Button>
          }
        >
          <Show
            when={inputs().overheads.length > 0}
            fallback={<EmptyRows text="No overheads." />}
          >
            <div class="flex flex-col gap-2">
              <For each={inputs().overheads}>
                {(o, i) => (
                  <div class="grid grid-cols-[minmax(0,1fr)_8.5rem_7rem_2rem] gap-2 items-center">
                    <input
                      value={o.name}
                      placeholder="e.g. Electricity"
                      aria-label="Overhead name"
                      class={inputClass}
                      onInput={(e) => {
                        const v = e.currentTarget.value;
                        update((q) => {
                          q.inputs.overheads[i()].name = v;
                        });
                      }}
                    />
                    <Select
                      aria-label="Overhead type"
                      value={o.mode}
                      options={overheadModes}
                      onChange={(v) =>
                        update((q) => {
                          q.inputs.overheads[i()].mode = v;
                        })
                      }
                    />
                    <NumberInput
                      aria-label="Overhead value"
                      value={o.value}
                      prefix={o.mode === "percent" ? undefined : cur()}
                      suffix={o.mode === "percent" ? "%" : undefined}
                      onChange={(v) =>
                        update((q) => {
                          q.inputs.overheads[i()].value = v;
                        })
                      }
                    />
                    <RemoveButton
                      onClick={() =>
                        update((q) => {
                          q.inputs.overheads.splice(i(), 1);
                        })
                      }
                    />
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Card>
      </Show>

      <Card title="Pricing" description="Profit, order size, discount and tax.">
        <div class="grid grid-cols-1 @md:grid-cols-2 gap-3">
          <Field label="Profit method" hint={profitHint()}>
            <Select
              value={inputs().profit.mode}
              options={profitModes}
              onChange={(v) =>
                update((q) => {
                  q.inputs.profit.mode = v;
                })
              }
            />
          </Field>
          <Field
            label={
              inputs().profit.mode === "target" ? "Selling price" : "Profit"
            }
          >
            <NumberInput
              value={inputs().profit.value}
              {...profitAffix()}
              onChange={(v) =>
                update((q) => {
                  q.inputs.profit.value = v;
                })
              }
            />
          </Field>
          <Field label={`Order quantity (${unit()}s)`} hint={quantityHint()}>
            <Show
              when={!(inputs().simple && production())}
              fallback={
                <output
                  aria-label="Order quantity"
                  class={cn(inputClass, "block tabular-nums opacity-80")}
                >
                  {Math.max(1, production()?.made ?? 1)}
                </output>
              }
            >
              <NumberInput
                value={inputs().quantity}
                onChange={(v) =>
                  update((q) => {
                    q.inputs.quantity = v;
                  })
                }
              />
            </Show>
          </Field>
          <Field label="Price rounding">
            <Select
              value={inputs().rounding}
              options={roundingModes}
              onChange={(v) =>
                update((q) => {
                  q.inputs.rounding = v;
                })
              }
            />
          </Field>
          <Field label="Discount">
            <div class="flex gap-2">
              <Select<DiscountMode>
                class="w-20 shrink-0"
                aria-label="Discount type"
                value={inputs().discount.mode}
                options={[
                  { value: "percent", label: "%" },
                  { value: "fixed", label: cur() },
                ]}
                onChange={(v) =>
                  update((q) => {
                    q.inputs.discount.mode = v;
                  })
                }
              />
              <NumberInput
                class="flex-1"
                aria-label="Discount value"
                value={inputs().discount.value}
                onChange={(v) =>
                  update((q) => {
                    q.inputs.discount.value = v;
                  })
                }
              />
            </div>
          </Field>
          <Field label="Tax / GST">
            <NumberInput
              value={inputs().taxPercent}
              suffix="%"
              onChange={(v) =>
                update((q) => {
                  q.inputs.taxPercent = v;
                })
              }
            />
          </Field>
        </div>
      </Card>

      <NotesCard
        notes={props.quote.notes}
        sections={props.quote.sections}
        update={update}
      />
    </div>
  );
}
