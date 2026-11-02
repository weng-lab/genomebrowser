import { z } from "zod";
import { regionSchema } from "../../browser/region";
import { defineCommand } from "./define";

export const setRegion = defineCommand({
  name: "set_region",
  description:
    "Move the genome browser to a region. Coordinates are zero-based and half-open; the browser clamps them to the chromosome. Returns the region shown and whether it was clamped.",
  params: z.strictObject({ region: regionSchema }),
  result: z.strictObject({ region: regionSchema, clamped: z.boolean() }),
  run({ stores }, { region }) {
    const outcome = stores.useBrowserStore.getState().setRegion(region);
    if (!outcome.ok) return outcome;
    return { ok: true, value: { region: outcome.region, clamped: outcome.clamped } };
  },
});
