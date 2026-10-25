import type { QuoteBuilder } from "./builders";
import { computeQuote, num } from "./engine";
import { baseLinesFor } from "./groups";
import type { QuoteInputs } from "./types";

/** Price a quote with its builder's base-cost formula (group rows + other lines). */
export const resultFor = (builder: QuoteBuilder, inputs: QuoteInputs) =>
  computeQuote(inputs, {
    baseLines: baseLinesFor(builder, inputs),
    materialsDivisor: builder.materialsDivisorField
      ? num(inputs.fields[builder.materialsDivisorField])
      : undefined,
  });
