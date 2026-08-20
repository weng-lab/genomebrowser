import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";
import { fetchBigBed } from "./fetch";
import { DenseBigBed, SquishBigBed } from "./render";
import { BigBedSettings } from "./settings";
import { BigBedTooltip } from "./tooltip";
import type { BigBedRow } from "./types";

const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

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
export type BigBedConfig = ModuleInstance<typeof bigBedModule>["config"];
export type {
  BigBedData,
  BigBedDisplay,
  BigBedInteraction,
  BigBedRow,
  RenderedBigBedRect,
} from "./types";
