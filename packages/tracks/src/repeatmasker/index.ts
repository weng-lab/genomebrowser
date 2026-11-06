import { defineTrackModule, type ModuleCreateInput } from "@weng-lab/genomebrowser";
import { configSchema } from "./schema";
import { fetchRepeatMasker } from "./fetch";
import { FullRepeatMasker, PackedRepeatMasker, DenseRepeatMasker } from "./render";
import { RepeatMaskerSettings } from "./settings";
import { RepeatMaskerTooltip } from "./tooltip";
import type { RepeatMaskerItem } from "./types";

export const repeatMaskerModule = defineTrackModule<RepeatMaskerItem>()({
  type: "repeatmasker",
  defaults: { height: 240, color: "#333333" },
  configSchema,
  fetch: fetchRepeatMasker,
  render: {
    full: FullRepeatMasker,
    pack: PackedRepeatMasker,
    dense: DenseRepeatMasker,
  },
  settingsComponent: RepeatMaskerSettings,
  tooltipComponent: RepeatMaskerTooltip,
});
export type RepeatMaskerCreateInput = ModuleCreateInput<typeof repeatMaskerModule>;
export type RepeatMaskerDisplay = (typeof repeatMaskerModule)["displays"][number];
export type { RepeatMaskerConfig } from "./schema";
export type { RepeatMaskerData, RepeatMaskerItem } from "./types";
