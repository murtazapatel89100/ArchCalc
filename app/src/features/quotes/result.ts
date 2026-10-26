import type { QuoteBuilder } from "./builders";
import { computeQuote, num } from "./engine";
import { baseLinesFor, pricedInputs, productionFor } from "./groups";
import type { QuoteInputs } from "./types";

/** Price a quote with its builder's base-cost formula (group rows + other lines). */
export function resultFor(builder: QuoteBuilder, inputs: QuoteInputs) {
  const result = computeQuote(pricedInputs(builder, inputs), {
    baseLines: baseLinesFor(builder, inputs),
    materialsDivisor: builder.materialsDivisorField
      ? num(inputs.fields[builder.materialsDivisorField])
      : undefined,
  });
  const production = productionFor(builder, inputs);
  if (production?.short) {
    result.warnings.push(
      `${production.explain} makes ${production.made} — ${production.short} short of the order.`,
    );
  }
  return result;
}
