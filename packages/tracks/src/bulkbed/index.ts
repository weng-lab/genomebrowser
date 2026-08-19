import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { fetchBulkBed } from "./fetch";
import { FullBulkBed } from "./render";
import { BulkBedSettings } from "./settings";
import { BulkBedTooltip } from "./tooltip";
import type { BulkBedRect } from "./types";

const datasetSchema = z.object({ name: z.string().min(1), url: fetchOnChange(z.string().min(1)) });
const configSchema = z.object({
  datasets: z.array(datasetSchema).min(1),
  gap: z.number().nonnegative().optional(),
});

export const bulkBedModule = defineTrackModule<BulkBedRect>()({
  type: "bulkbed",
  defaults: { height: 80, color: "#4b9560" },
  configSchema,
  fetch: fetchBulkBed,
  render: { full: FullBulkBed },
  settingsComponent: BulkBedSettings,
  tooltipComponent: BulkBedTooltip,
});

export type BulkBedCreateInput = ModuleCreateInput<typeof bulkBedModule>;
export type BulkBedConfig = ModuleInstance<typeof bulkBedModule>["config"];
export type {
  BulkBedData,
  BulkBedDataset,
  BulkBedDisplay,
  BulkBedInteraction,
  BulkBedRect,
} from "./types";
