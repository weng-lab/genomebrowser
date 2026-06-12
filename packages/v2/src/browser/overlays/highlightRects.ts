import type { Highlight } from "../../stores/browserStore";
import type { BrowserRegion } from "../../utils/region";
import { createXScale } from "../../utils/scale";

export type HighlightRect = {
  id: string;
  x: number;
  width: number;
  color: string;
  opacity: number;
};

export function getHighlightRects({
  highlights,
  region,
  width,
}: {
  highlights: Highlight[];
  region: BrowserRegion;
  width: number;
}): HighlightRect[] {
  const xScale = createXScale(region, width);

  return highlights.flatMap((highlight) => {
    const chromosome = highlight.region.chromosome ?? region.chromosome;
    if (chromosome !== region.chromosome) return [];

    const start = xScale(highlight.region.start);
    const end = xScale(highlight.region.end);
    return [
      {
        id: highlight.id,
        x: start,
        width: end - start,
        color: highlight.color,
        opacity: highlight.opacity ?? 0.2,
      },
    ];
  });
}
