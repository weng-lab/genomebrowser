import { defineTrackModule, type ModuleCreateInput } from "@weng-lab/genomebrowser";
import type { BamRecord } from "@weng-lab/genomic-reader";
import { bamConfigSchema } from "./schema";
import { fetchBam } from "./fetch";
import { DenseBam, SquishBam, PackBam, FullBam } from "./render";
import { BamSettings } from "./settings";
import { BamTooltip } from "./tooltip";

export const bamModule = defineTrackModule<BamRecord>()({
  type: "bam",
  defaults: { display: "pack", height: 14, color: "#3366cc" },
  configSchema: bamConfigSchema,
  fetch: fetchBam,
  render: { dense: DenseBam, squish: SquishBam, pack: PackBam, full: FullBam },
  settingsComponent: BamSettings,
  tooltipComponent: BamTooltip,
});

export type BamCreateInput = ModuleCreateInput<typeof bamModule>;
export type {
  BamConfigInput,
  BamConfig,
  BamData,
  BamDisplay,
  BamInteraction,
  BamRecord,
} from "./types";
