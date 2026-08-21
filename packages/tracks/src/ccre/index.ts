import type { ModuleCreateInput, ModuleInstance, TrackFetchContext } from "@weng-lab/genomebrowser";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { fetchBigBedRows } from "../bigbed/fetch";
import { DenseBigBed, SquishBigBed } from "../bigbed/render";
import { BigBedSettings } from "../bigbed/settings";
import type { BigBedConfig } from "../bigbed/types";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";
import { ccreBigBedSchema, type CcreBigBedRow } from "./schema";
import { CcreBigBedTooltip } from "./tooltip";

const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

async function fetchCcreBigBed({
  track: { config },
  demand: { region },
}: TrackFetchContext<BigBedConfig>): Promise<CcreBigBedRow[]> {
  return fetchBigBedRows({ url: config.url, region, schema: ccreBigBedSchema });
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
export type CcreBigBedConfig = ModuleInstance<typeof ccreBigBedModule>["config"];
export { ccreBigBedSchema } from "./schema";
export type { CcreBigBedRow } from "./schema";
