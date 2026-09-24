import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { fetchDynseq } from "./fetch";
import { FullDynseq } from "./render";
import { configSchema } from "./schema";
import { DynseqSettings } from "./settings";
import { DynseqTooltip } from "./tooltip";
import type { DynseqPoint } from "./types";

/**
 * A per-base score track after Kundaje et al.: a filled signal when zoomed out,
 * becoming reference nucleotides scaled by their score when zoomed in, with
 * negative scores below the axis. Suits conservation and model attribution
 * signals, where which base carries the score is the point.
 */
export const dynseqModule = defineTrackModule<DynseqPoint>()({
  type: "dynseq",
  defaults: { height: 100, color: "#3a6ea5" },
  configSchema,
  fetch: fetchDynseq,
  render: { full: FullDynseq },
  settingsComponent: DynseqSettings,
  tooltipComponent: DynseqTooltip,
});

export type DynseqCreateInput = ModuleCreateInput<typeof dynseqModule>;
export type DynseqConfig = ModuleInstance<typeof dynseqModule>["config"];
export { NUCLEOTIDE_COLORS, NUCLEOTIDE_GLYPHS } from "./glyphs";
export type { DynseqData, DynseqPoint } from "./types";
