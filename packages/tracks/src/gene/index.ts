import { defaultRowHeight } from "../shared/layout/rowLayout";
import { configSchema } from "./schema";
import type { ModuleCreateInput } from "@weng-lab/genomebrowser";
import { defineTrackModule } from "@weng-lab/genomebrowser";
import { fetchGene } from "./data/fetch";
import { FullGene, MergedGene, TaggedGene } from "./render/renderers";
import { GeneSettings } from "./settings/GeneSettings";
import { GeneTooltip } from "./tooltip";
import type { GeneInteractionTarget } from "./interactions";

export const geneModule = defineTrackModule<GeneInteractionTarget>()({
  type: "gene",
  defaults: { height: defaultRowHeight, color: "#4b9560" },
  configSchema,
  fetch: fetchGene,
  render: { full: FullGene, merged: MergedGene, tagged: TaggedGene },
  settingsComponent: GeneSettings,
  tooltipComponent: GeneTooltip,
});

export type GeneCreateInput = ModuleCreateInput<typeof geneModule>;
export type { GeneData, GeneTranscript, GroupedGene } from "./types";
export type { GeneInteraction, GeneInteractionTarget } from "./interactions";

export { getGeneDatasetsForAssembly, getGeneDatasetTitle } from "./data/datasets";
export type { GeneDataset } from "./data/datasets";

export type GeneDisplay = (typeof geneModule)["displays"][number];
export type { GeneConfig, GeneTagColor } from "./schema";
