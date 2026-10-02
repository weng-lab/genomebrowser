import { configSchema } from "./schema";
import type { ModuleCreateInput, TrackFetchContext } from "@weng-lab/genomebrowser";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { readCachedBigBedRows } from "../shared/cachedFiles";
import { DenseBigBed, SquishBigBed } from "../bigbed/render";
import { BigBedSettings } from "../bigbed/settings";
import type { BigBedConfig } from "../bigbed/schema";
import { bedSchemas } from "../shared/bedSchemas";
import type { CcreBigBedRow } from "./types";
import { CcreBigBedTooltip } from "./tooltip";

async function fetchCcreBigBed({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BigBedConfig>): Promise<CcreBigBedRow[]> {
  return readCachedBigBedRows(resources, config.url, bedSchemas.ccre, region);
}

export const ccreBigBedModule = defineTrackModule<CcreBigBedRow>()({
  type: "ccre-bigbed",
  defaults: { height: 12, color: "#4b9560" },
  configSchema,
  fetch: fetchCcreBigBed,
  render: { dense: DenseBigBed, squish: SquishBigBed },
  settingsComponent: BigBedSettings,
  tooltipComponent: CcreBigBedTooltip,
});

export type CcreBigBedCreateInput = ModuleCreateInput<typeof ccreBigBedModule>;
export type { CcreBigBedRow } from "./types";
export type { CcreBigBedConfig } from "./schema";
