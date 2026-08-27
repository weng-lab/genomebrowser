import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { defineTrackModule, fetchOnChange } from "@weng-lab/genomebrowser";
import { z } from "zod";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";
import { hexColorSchema } from "../shared/schemas";
import { fetchGene } from "./fetch";
import { FullGene, MergedGene, TaggedGene } from "./render";
import { GeneSettings } from "./settings";
import { GeneTooltip } from "./tooltip";
import type { GeneFeature } from "./types";

const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  geneName: z.string().optional(),
  tagColors: z
    .array(
      z.object({
        tag: z.string().trim().min(1),
        color: hexColorSchema,
      }),
    )
    .transform((tagColors) => {
      const seen = new Set<string>();
      return tagColors.filter(({ tag }) => {
        if (seen.has(tag)) return false;
        seen.add(tag);
        return true;
      });
    })
    .default([{ tag: "MANE_Select", color: "#000000" }]),
  highlightColor: hexColorSchema.default("#000000"),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

export const geneModule = defineTrackModule<GeneFeature>()({
  type: "gene",
  defaults: { height: defaultRowHeight, color: "#4b9560" },
  configSchema,
  fetch: fetchGene,
  render: { full: FullGene, merged: MergedGene, tagged: TaggedGene },
  settingsComponent: GeneSettings,
  tooltipComponent: GeneTooltip,
});

export type GeneCreateInput = ModuleCreateInput<typeof geneModule>;
export type GeneConfig = ModuleInstance<typeof geneModule>["config"];
export type {
  BigGenePredCdsStatus,
  BigGenePredPlusV1Source,
  BigGenePredSource,
  GeneAttributes,
  GeneAttributeValue,
  GeneData,
  GeneDisplay,
  GeneExon,
  GeneFeature,
  GeneInteraction,
  GeneStrand,
  GeneTagColor,
  GeneTranscript,
  GroupedGene,
} from "./types";
