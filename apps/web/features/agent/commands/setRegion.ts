import { z } from "zod";
import { regionSchema } from "../../browser/region";
import { defineStateCommand } from "./define";

export const setRegion = defineStateCommand({
  name: "set_region",
  description:
    "Move the genome browser to a region. Coordinates are zero-based and half-open; out-of-bounds coordinates are clamped to the chromosome. Returns the region shown and whether it was clamped.",
  params: z.strictObject({ region: regionSchema }),
  result: z.strictObject({ region: regionSchema, clamped: z.boolean() }),
  run(snapshot, { region }, { normalizeRegion }) {
    const outcome = normalizeRegion(snapshot.browser.assembly, region);
    if (!outcome.ok) return outcome;
    return {
      ok: true,
      value: { region: outcome.region, clamped: outcome.clamped },
      snapshot: {
        ...snapshot,
        browser: { ...snapshot.browser, region: outcome.region },
      },
    };
  },
});
