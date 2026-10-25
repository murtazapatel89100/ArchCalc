import type { QuoteBuilder } from "./builders";
import { computeQuote, num } from "./engine";
import type { QuoteInputs } from "./types";

/** Price a quote with its builder's base-cost formula. */
export const resultFor = (builder: QuoteBuilder, inputs: QuoteInputs) =>
  computeQuote(inputs, {
    baseLines: builder.baseCost(inputs.fields),
    materialsDivisor: builder.materialsDivisorField
      ? num(inputs.fields[builder.materialsDivisorField])
      : undefined,
  });
