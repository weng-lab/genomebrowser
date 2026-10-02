import { configSchema } from "./schema";
import type { ModuleCreateInput } from "@weng-lab/genomebrowser";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { fetchBigBed } from "./fetch";
import { DenseBigBed, SquishBigBed } from "./render";
import { BigBedSettings } from "./settings";
import { BigBedTooltip } from "./tooltip";
import type { BigBedRow } from "./types";

export const bigBedModule = defineTrackModule<BigBedRow>()({
  type: "bigbed",
  defaults: { height: 12, color: "#4b9560" },
  configSchema,
  fetch: fetchBigBed,
  render: { dense: DenseBigBed, squish: SquishBigBed },
  settingsComponent: BigBedSettings,
  tooltipComponent: BigBedTooltip,
});

export type BigBedCreateInput = ModuleCreateInput<typeof bigBedModule>;
export { fetchBigBedRows } from "./fetch";
export type { BigBedData, BigBedInteraction, BigBedRow } from "./types";

export type BigBedDisplay = (typeof bigBedModule)["displays"][number];
export type { BigBedConfig } from "./schema";
