import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";
import { hexColorSchema } from "../shared/schemas";
import { fetchGene } from "./fetch";
import { PackGene, SquishGene } from "./render";
import { GeneSettings } from "./settings";
import { GeneTooltip } from "./tooltip";
import type { GeneFeature } from "./types";

const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  geneName: z.string().optional(),
  highlightColor: hexColorSchema.default("#000000"),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

export const geneModule = defineTrackModule<GeneFeature>()({
  type: "gene",
  defaults: { height: defaultRowHeight, color: "#4b9560" },
  configSchema,
  fetch: fetchGene,
  render: { pack: PackGene, squish: SquishGene },
  settingsComponent: GeneSettings,
  tooltipComponent: GeneTooltip,
});

export type GeneCreateInput = ModuleCreateInput<typeof geneModule>;
export type GeneConfig = ModuleInstance<typeof geneModule>["config"];
export type {
  BigGenePredCdsStatus,
  BigGenePredSource,
  GeneData,
  GeneDisplay,
  GeneExon,
  GeneFeature,
  GeneInteraction,
  GeneStrand,
  GeneTranscript,
  GroupedGene,
} from "./types";
