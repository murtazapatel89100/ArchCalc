import { v4 as uuidv4 } from "uuid";
import type {
  GroupDef,
  GroupRowInit,
  GroupTotals,
  QuoteBuilder,
} from "./builders";
import { num } from "./engine";
import type { CostLine, GroupRow, QuoteInputs } from "./types";

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
    ...builder.baseCost(inputs.fields, groupTotals(builder, inputs)),
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

  const migrated = missingGroup
    ? builder.migrate?.(inputs.fields ?? {})
    : undefined;
  // Saved values win, then values derived from old fields, then defaults.
  const fields = {
    ...Object.fromEntries(builder.fields.map((fd) => [fd.key, fd.default])),
    ...migrated?.fields,
    ...inputs.fields,
  };
  const groups: Record<string, GroupRow[]> = { ...inputs.groups };
  for (const g of builder.groups ?? []) {
    if (groups[g.key]) continue;
    const fromOld = migrated?.groups[g.key];
    groups[g.key] = toRows(fromOld?.length ? fromOld : g.defaults);
  }
  return { ...inputs, fields, groups };
}
