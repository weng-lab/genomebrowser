import type { GenomicRegion } from "../../genome/region";
import type { Highlight } from "../state/browserStore";

export type HighlightType = NonNullable<Highlight["type"]>;

export type ResolvedHighlight = {
  region: GenomicRegion;
  opacity: number;
  type: HighlightType;
};

/** Opacity of a highlight that does not set one: outlines draw at full strength, fills are translucent. */
export function getDefaultHighlightOpacity(type: HighlightType = "filled"): number {
  return type === "outlined" ? 1 : 0.2;
}

/**
 * Fills in what a stored highlight leaves out: a missing chromosome means the
 * chromosome currently shown, and missing opacity and type take their defaults.
 */
export function resolveHighlight(
  highlight: Pick<Highlight, "region" | "opacity" | "type">,
  currentChromosome: string,
): ResolvedHighlight {
  const type = highlight.type ?? "filled";
  return {
    region: {
      chromosome: highlight.region.chromosome ?? currentChromosome,
      start: highlight.region.start,
      end: highlight.region.end,
    },
    opacity: highlight.opacity ?? getDefaultHighlightOpacity(type),
    type,
  };
}
