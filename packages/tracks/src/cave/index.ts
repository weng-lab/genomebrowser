import { configSchema } from "./schema";
import type { ModuleCreateInput } from "@weng-lab/genomebrowser";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { fetchCave } from "./fetch";
import { FullCave } from "./render";
import { CaveSettings } from "./settings";
import { CaveTooltip } from "./tooltip";
import type { CaveTooltipItem } from "./types";

export const caveModule = defineTrackModule<CaveTooltipItem>()({
  type: "cave",
  defaults: { height: 35, color: "#3333ff" },
  configSchema,
  fetch: fetchCave,
  render: { full: FullCave },
  settingsComponent: CaveSettings,
  tooltipComponent: CaveTooltip,
});

export type CaveCreateInput = ModuleCreateInput<typeof caveModule>;
export type { CaveData, CaveInteraction, CaveTooltipItem } from "./types";

export type CaveDisplay = (typeof caveModule)["displays"][number];
export type { CaveConfig, CaveAge, CaveNeurotransmitter } from "./schema";
