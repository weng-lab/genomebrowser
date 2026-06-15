import { z } from "zod";
import { fetchOnChange } from "../../src/data/fetchOnChange";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { fetchBulkBed } from "./fetch";
import { FullBulkBed } from "./render";
import { BulkBedSettings } from "./settings";

const bulkBedDatasetSchema = z.object({
  name: z.string().min(1),
  url: fetchOnChange(z.string().min(1)),
});

const bulkBedInputSchema = z.object({
  datasets: z.array(bulkBedDatasetSchema).min(1),
  gap: z.number().nonnegative().optional(),
});

export const bulkBedModule = defineTrackModule({
  type: "bulkbed",
  defaults: {
    height: 80,
    color: "#4b9560",
  },
  schema: bulkBedInputSchema,
  fetch: fetchBulkBed,
  render: {
    full: FullBulkBed,
  },
  settingsComponent: BulkBedSettings,
});
