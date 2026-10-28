import { v4 as uuidv4 } from "uuid";
import type {
  BaseLine,
  FieldDef,
  GroupDef,
  GroupRowInit,
  GroupTotals,
  QuoteBuilder,
} from "./builders";
import { num } from "./engine";
import type { CostLine, GroupRow, OverheadLine, QuoteInputs } from "./types";

// Saved inputs are plain JSON objects, so `in` is a safe own-property check here.
const hasKey = (obj: object | undefined, key: string) => !!obj && key in obj;

export const toRows = (inits: GroupRowInit[]): GroupRow[] =>
  inits.map((r) => ({ id: uuidv4(), name: r.name, values: { ...r.values } }));

/** Rows of one group (empty if the quote has none). */
export const groupRows = (inputs: QuoteInputs, key: string): GroupRow[] =>
  inputs.groups?.[key] ?? [];

/** Label for a row's cost line, e.g. "Filament: Silk Gold". */
export const rowLabel = (group: GroupDef, row: GroupRow) =>
  row.name.trim() ? `${group.itemLabel}: ${row.name.trim()}` : group.itemLabel;

export const rowCost = (
  group: GroupDef,
  row: GroupRow,
  inputs: QuoteInputs,
): number => num(group.rowCost(row.values, inputs.fields));

export function groupTotals(
  builder: QuoteBuilder,
  inputs: QuoteInputs,
): GroupTotals {
  const groupDef = (key: string) => builder.groups?.find((g) => g.key === key);
  return {
    cost: (key) => {
      const g = groupDef(key);
      return g
        ? groupRows(inputs, key).reduce(
            (acc, row) => acc + rowCost(g, row, inputs),
            0,
          )
        : 0;
    },
    sum: (key, field) =>
      groupRows(inputs, key).reduce(
        (acc, row) => acc + num(row.values[field]),
        0,
      ),
  };
}

/** The builder's single-value fields this quote uses: simple quotes hide detailed ones. */
export const fieldsFor = (
  builder: QuoteBuilder,
  inputs: QuoteInputs,
): FieldDef[] =>
  inputs.simple ? builder.fields.filter((fd) => !fd.detailed) : builder.fields;

/**
 * The builder's extra base-cost lines this quote prices, each with its index in `baseCost`
 * (and so in `baseFormulas`). Simple quotes leave out detailed lines.
 */
export function extraLinesFor(
  builder: QuoteBuilder,
  inputs: QuoteInputs,
): { line: BaseLine; index: number }[] {
  return builder
    .baseCost(inputs.fields, groupTotals(builder, inputs))
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => !(inputs.simple && line.detailed));
}

/** The one overhead line a simple quote prices: its combined utilities, if any. */
export function simpleOverheads(inputs: QuoteInputs): OverheadLine[] {
  const u = inputs.utilities;
  if (!u || !num(u.value)) return [];
  return [
    {
      id: "utilities",
      name: "Utilities & overheads",
      mode: u.mode === "percent" ? "percent" : "per_order",
      value: u.value,
    },
  ];
}

/**
 * Inputs as priced: simple quotes swap their (kept) overheads for the one combined utilities
 * value and, when the builder makes a
 * known number of units (plates × items per plate), order exactly that many.
 */
export function pricedInputs(
  builder: QuoteBuilder,
  inputs: QuoteInputs,
): QuoteInputs {
  if (!inputs.simple) return inputs;
  return {
    ...inputs,
    overheads: simpleOverheads(inputs),
    quantity: builder.produces
      ? Math.max(1, Math.floor(num(builder.produces.units(inputs.fields))))
      : inputs.quantity,
  };
}

/**
 * Units the inputs make against the order quantity, for builders that know it: how many spare
 * units a detailed quote will have, or how many it is short.
 */
export function productionFor(builder: QuoteBuilder, inputs: QuoteInputs) {
  if (!builder.produces) return undefined;
  const made = Math.floor(num(builder.produces.units(inputs.fields)));
  const ordered = pricedInputs(builder, inputs).quantity;
  return {
    made,
    explain: builder.produces.explain(inputs.fields),
    spare: Math.max(0, made - ordered),
    short: Math.max(0, ordered - made),
  };
}

/** One base-cost line per group row, followed by the builder's other lines. */
export function baseLinesFor(
  builder: QuoteBuilder,
  inputs: QuoteInputs,
): CostLine[] {
  const rows = (builder.groups ?? []).flatMap((g) =>
    groupRows(inputs, g.key).map((row) => ({
      label: rowLabel(g, row),
      amount: rowCost(g, row, inputs),
    })),
  );
  return [
    ...rows,
    ...extraLinesFor(builder, inputs).map(({ line }) => ({
      label: line.label,
      amount: line.amount,
    })),
  ];
}

/**
 * Bring a saved quote up to date with its builder: fill in any single-value fields added since
 * it was saved, and give every group rows — converted from the old single-value fields where
 * possible (e.g. one spool → one filament row), otherwise the builder's defaults.
 * Returns the same object when nothing needs changing.
 */
export function normalizeInputs(
  builder: QuoteBuilder,
  inputs: QuoteInputs,
): QuoteInputs {
  const missingField = builder.fields.some(
    (fd) => !hasKey(inputs.fields, fd.key),
  );
  const missingGroup = (builder.groups ?? []).some(
    (g) => !inputs.groups?.[g.key],
  );
  if (!missingField && !missingGroup) return inputs;

  const migrated = builder.migrate?.(inputs.fields ?? {}, num(inputs.quantity));
  // Saved values win, then values derived from old fields, then defaults.
  const fields = {
    ...Object.fromEntries(builder.fields.map((fd) => [fd.key, fd.default])),
    ...migrated?.fields,
    ...inputs.fields,
  };
  const groups: Record<string, GroupRow[]> = { ...inputs.groups };
  for (const g of builder.groups ?? []) {
    if (groups[g.key]) continue;
    const fromOld = migrated?.groups?.[g.key];
    groups[g.key] = toRows(fromOld?.length ? fromOld : g.defaults);
  }
  return { ...inputs, fields, groups };
}
