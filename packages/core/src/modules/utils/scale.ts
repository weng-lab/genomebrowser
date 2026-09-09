import type { GenomicRegion } from "../../genome/region";

export function createXScale(region: GenomicRegion, width: number) {
  const span = region.end - region.start;
  return (value: number) => ((value - region.start) * width) / span;
}
