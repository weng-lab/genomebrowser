import type { GenomicRegion } from "../../genome/region";
import { createXScale } from "../../modules/utils/scale";
import type { Highlight } from "../state/browserStore";
import { resolveHighlight, type HighlightType } from "./resolveHighlight";

export type HighlightRect = {
  id: string;
  x: number;
  width: number;
  color: string;
  opacity: number;
  type: HighlightType;
};

export function getHighlightRects({
  highlights,
  region,
  width,
}: {
  highlights: Highlight[];
  region: GenomicRegion;
  width: number;
}): HighlightRect[] {
  const xScale = createXScale(region, width);

  return highlights.flatMap((highlight) => {
    const resolved = resolveHighlight(highlight, region.chromosome);
    if (resolved.region.chromosome !== region.chromosome) return [];

    const start = xScale(resolved.region.start);
    const end = xScale(resolved.region.end);
    return [
      {
        id: highlight.id,
        x: start,
        width: end - start,
        color: highlight.color,
        opacity: resolved.opacity,
        type: resolved.type,
      },
    ];
  });
}
