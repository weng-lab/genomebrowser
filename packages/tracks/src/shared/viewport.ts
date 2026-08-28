import type { GenomicRegion } from "@weng-lab/genomebrowser";

export function intersectsVisibleRegion(
  feature: { chromosome: string; start: number; end: number },
  visibleRegion: GenomicRegion,
) {
  return (
    feature.chromosome === visibleRegion.chromosome &&
    feature.end > visibleRegion.start &&
    feature.start < visibleRegion.end
  );
}
