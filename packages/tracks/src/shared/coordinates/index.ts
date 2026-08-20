import type { GenomicRegion } from "@weng-lab/genomebrowser";

export function createGenomicXScale(
  region: GenomicRegion,
  width: number,
): (position: number) => number {
  const span = region.end - region.start;
  return (position) => ((position - region.start) * width) / span;
}

export function clientXToTrackX(
  clientX: number,
  bounds: Readonly<{ left: number; width: number }>,
  trackWidth: number,
): number {
  return bounds.width <= 0 ? 0 : ((clientX - bounds.left) / bounds.width) * trackWidth;
}
