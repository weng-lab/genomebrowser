import { defineTrackModule, type ModuleCreateInput } from "@weng-lab/genomebrowser";
import { rulerConfigSchema } from "./schema";
import { fetchRuler } from "./fetch";
import { Ruler } from "./render";
import { RulerSettings } from "./settings";

export const rulerModule = defineTrackModule({
  type: "ruler",
  defaults: { height: 64, color: "#475569" },
  configSchema: rulerConfigSchema,
  fetch: fetchRuler,
  render: { full: Ruler },
  settingsComponent: RulerSettings,
});
export type RulerCreateInput = ModuleCreateInput<typeof rulerModule>;
export type { RulerConfig } from "./schema";
export type { RulerData } from "./fetch";
