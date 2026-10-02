import type { BamConfig } from "./schema";
import type { BamData, BamDisplay } from "./types";
import {
  defineTrackModule,
  type TrackRenderer,
  type ModuleCreateInput,
} from "@weng-lab/genomebrowser";
import type { BamRecord } from "@weng-lab/genomic-reader";
import { configSchema } from "./schema";
import { fetchBam } from "./fetch";
import { DenseBam, SquishBam, PackBam, FullBam } from "./render";
import { BamSettings } from "./settings";
import { BamTooltip } from "./tooltip";

export const bamModule = defineTrackModule<BamRecord>()({
  type: "bam",
  defaults: { display: "pack", height: 14, color: "#3366cc" },
  configSchema,
  fetch: fetchBam,
  render: { dense: DenseBam, squish: SquishBam, pack: PackBam, full: FullBam } satisfies Record<
    BamDisplay,
    TrackRenderer<BamConfig, BamData>
  >,
  settingsComponent: BamSettings,
  tooltipComponent: BamTooltip,
});

export type BamCreateInput = ModuleCreateInput<typeof bamModule>;
export type { BamData, BamDisplay, BamInteraction, BamRecord } from "./types";
export type { BamConfig, BamConfigInput, BamCoverageScale } from "./schema";
