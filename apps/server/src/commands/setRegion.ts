import { z } from "zod";
import { regionSchema } from "../protocol.ts";
import { defineCommand } from "./command.ts";

export const setRegion = defineCommand({
  name: "set_region",
  description:
    "Move the genome browser to a region. Coordinates are zero-based and half-open; the browser clamps them to the chromosome.",
  params: z.strictObject({ region: regionSchema }),
  run: (stores, { region }) => stores.useBrowserStore.getState().setRegion(region),
});
