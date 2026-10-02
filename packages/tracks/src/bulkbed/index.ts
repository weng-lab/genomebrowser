import { configSchema } from "./schema";
import type { ModuleCreateInput } from "@weng-lab/genomebrowser";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { fetchBulkBed } from "./fetch";
import { FullBulkBed } from "./render";
import { BulkBedSettings } from "./settings";
import { BulkBedTooltip } from "./tooltip";
import type { BulkBedRect } from "./types";

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
export type { BulkBedData, BulkBedInteraction, BulkBedRect } from "./types";

export type BulkBedDisplay = (typeof bulkBedModule)["displays"][number];
export type { BulkBedConfig, BulkBedDataset } from "./schema";
