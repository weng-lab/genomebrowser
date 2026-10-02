import type { ModuleCreateInput } from "@weng-lab/genomebrowser";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { configSchema } from "./schema";
import { fetchBigWig } from "./fetch";
import { DenseBigWig, FullBigWig } from "./render";
import { BigWigSettings } from "./settings";
import { BigWigTooltip } from "./tooltip";
import type { SignalPoint } from "../shared/signal";

export const bigWigModule = defineTrackModule<SignalPoint>()({
  type: "bigwig",
  defaults: { height: 80, color: "#2266aa" },
  configSchema,
  fetch: fetchBigWig,
  render: { full: FullBigWig, dense: DenseBigWig },
  settingsComponent: BigWigSettings,
  tooltipComponent: BigWigTooltip,
});

export type BigWigCreateInput = ModuleCreateInput<typeof bigWigModule>;
export type { BigWigData, BigWigInteraction, YRange } from "./types";

export type BigWigDisplay = (typeof bigWigModule)["displays"][number];
export type { BigWigConfig, YRangeOverride } from "./schema";
