import { Plus, Trash2 } from "lucide-solid";
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
import { quoteActions } from "../store";
import type {
  DiscountMode,
  OverheadMode,
  ProfitMode,
  Quote,
  RoundingMode,
} from "../types";
import { MarkdownField } from "./MarkdownField";

/** Starting points for extra note sections; users edit them freely after adding. */
const sectionPresets = [
  {
    label: "Terms",
    title: "Terms & conditions",
    body: "- Prices are valid for **15 days** from the quote date.\n- **50% advance** to start; balance before delivery.\n- Colours may vary slightly between material batches.",
  },
  {
    label: "Payment",
    title: "Payment details",
    body: "**UPI:** yourname@upi  \n**Bank transfer:** Account name · A/C 0000000000 · IFSC XXXX0000000",
  },
  {
    label: "Delivery",
    title: "Delivery",
    body: "- Ready in **3–5 working days** after the advance payment.\n- Local pickup is free; shipping is charged at actuals.",
  },
  { label: "Custom", title: "", body: "" },
];

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

  return (
    <div class="@container flex flex-col gap-4 min-w-0">
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

      <Card
        title={props.builder.groups?.length ? "Settings" : props.builder.name}
        description={
          props.builder.groups?.length
            ? "Values that apply to the whole quote."
            : "Base cost inputs"
        }
      >
        <div class="grid grid-cols-1 @md:grid-cols-2 gap-3">
          <For each={props.builder.fields}>
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
          <Field label={`Order quantity (${props.builder.unitLabel}s)`}>
            <NumberInput
              value={inputs().quantity}
              onChange={(v) =>
                update((q) => {
                  q.inputs.quantity = v;
                })
              }
            />
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

      <Card
        title="Notes & terms"
        description="Markdown, rendered on the exported quote. Add sections for terms, payment or delivery details."
      >
        <div class="flex flex-col gap-4">
          {/* Not a <label>/Field: clicks inside a label re-target its first button (Write). */}
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-[var(--color-app-text-secondary)]">
              Notes
            </span>
            <MarkdownField
              aria-label="Notes"
              value={props.quote.notes}
              placeholder={
                "e.g. Includes **2 colour options**.\n- Matte finish\n- Gift box on request"
              }
              onInput={(v) =>
                update((q) => {
                  q.notes = v;
                })
              }
            />
          </div>

          <For each={props.quote.sections ?? []}>
            {(sec, i) => (
              <div class="rounded-lg border border-[var(--color-app-border)] p-3 flex flex-col gap-2.5">
                <div class="flex items-center gap-2">
                  <input
                    value={sec.title}
                    placeholder="Section title, e.g. Warranty"
                    aria-label="Section title"
                    class={cn(inputClass, "flex-1 font-medium")}
                    onInput={(e) => {
                      const v = e.currentTarget.value;
                      update((q) => {
                        if (q.sections) q.sections[i()].title = v;
                      });
                    }}
                  />
                  <RemoveButton
                    onClick={() =>
                      update((q) => {
                        q.sections?.splice(i(), 1);
                      })
                    }
                  />
                </div>
                <MarkdownField
                  aria-label={`${sec.title || "Section"} content`}
                  value={sec.body}
                  onInput={(v) =>
                    update((q) => {
                      if (q.sections) q.sections[i()].body = v;
                    })
                  }
                />
              </div>
            )}
          </For>

          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-[var(--color-app-text-secondary)]">
              Add section:
            </span>
            <For each={sectionPresets}>
              {(preset) => (
                <Button
                  size="sm"
                  onClick={() =>
                    update((q) => {
                      q.sections ??= [];
                      q.sections.push({
                        id: quoteActions.newLineId(),
                        title: preset.title,
                        body: preset.body,
                      });
                    })
                  }
                >
                  <Plus size={14} /> {preset.label}
                </Button>
              )}
            </For>
          </div>
        </div>
      </Card>
    </div>
  );
}

function EmptyRows(props: { text: string }) {
  return (
    <p class="text-xs text-[var(--color-app-text-secondary)] py-3 text-center border border-dashed border-[var(--color-app-border)] rounded-lg">
      {props.text}
    </p>
  );
}

function RemoveButton(props: { onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      aria-label="Remove row"
      class="h-9 w-8 flex items-center justify-center rounded-lg text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-error)] hover:bg-[var(--color-app-error)]/10 transition-colors"
    >
      <Trash2 size={15} />
    </button>
  );
}
