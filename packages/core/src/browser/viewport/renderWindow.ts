import type { AssemblyDefinition } from "../../genome/assembly";
import type { GenomicRegion } from "../../genome/region";
import { normalizeRegion } from "../../genome/region";
import { expandRegion } from "./usePanController";

/**
 * The window a request loads: the visible region widened by `overscanMultiplier`
 * and clipped to the chromosome, with the pixel width it covers at the visible
 * scale.
 */
export function getRenderWindow(
  region: GenomicRegion,
  assembly: AssemblyDefinition,
  trackWidth: number,
  overscanMultiplier: number,
): { targetRenderRegion: GenomicRegion; renderWidth: number } | null {
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return null;
  const expandedRegion = expandRegion(region, overscanMultiplier);
  if (!expandedRegion) return null;
  const normalizedRegion = normalizeRegion(expandedRegion, assembly);
  if (!normalizedRegion.ok) return null;
  const visibleSpan = region.end - region.start;
  const targetRegion = normalizedRegion.region;
  const renderWidth = (trackWidth * (targetRegion.end - targetRegion.start)) / visibleSpan;
  if (!Number.isFinite(renderWidth) || renderWidth <= 0) return null;

  return { targetRenderRegion: targetRegion, renderWidth };
}

/**
 * Where a track's content group sits and how wide it draws. Content covering
 * `region` is positioned relative to the visible region, so each track can
 * show data fetched for a different window than its neighbours.
 */
export function getContentPlacement(
  region: GenomicRegion,
  visibleRegion: GenomicRegion,
  trackWidth: number,
  marginWidth: number,
) {
  const visibleSpan = visibleRegion.end - visibleRegion.start;
  const pxPerBase = visibleSpan > 0 && trackWidth > 0 ? trackWidth / visibleSpan : 0;
  return {
    x: marginWidth + (region.start - visibleRegion.start) * pxPerBase,
    width: (region.end - region.start) * pxPerBase,
  };
}
