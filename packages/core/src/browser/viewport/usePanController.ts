import { useCallback } from "react";
import type { GenomicRegion } from "../../genome/region";
import type { BrowserRegionMutationResult } from "../state/browserStore";
import type { PanDragStatus } from "../state/browserContextState";
import { usePanDrag } from "./usePanDrag";

export function getPanCommitRegion(
  region: GenomicRegion,
  width: number,
  deltaPx: number,
): GenomicRegion | null {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(deltaPx)) return null;
  const span = region.end - region.start;
  if (!Number.isSafeInteger(span) || span <= 0) return null;
  const rawShiftBases = (deltaPx / width) * span;
  const shiftBases = rawShiftBases < 0 ? Math.ceil(rawShiftBases) : Math.floor(rawShiftBases);
  if (shiftBases === 0) return null;
  const start = region.start - shiftBases;
  const end = region.end - shiftBases;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;

  return {
    chromosome: region.chromosome,
    start,
    end,
  };
}

export function usePanController({
  svg,
  region,
  trackWidth,
  getContentOffset,
  setContentOffset,
  setRegion,
  panDragStatus,
}: {
  svg: SVGSVGElement | null;
  region: GenomicRegion;
  trackWidth: number;
  getContentOffset: () => number;
  setContentOffset: (deltaPx: number) => number;
  setRegion: (region: GenomicRegion) => BrowserRegionMutationResult;
  panDragStatus: PanDragStatus;
}) {
  const hasValidTrackWidth = Number.isFinite(trackWidth) && trackWidth > 0;

  // A successful commit leaves the drag offset in place; the content transform
  // resets it in the same frame as the new region renders.
  const commitPan = useCallback(
    (committedDeltaPx: number) => {
      const candidate = getPanCommitRegion(region, trackWidth, committedDeltaPx);
      if (!candidate || !setRegion(candidate).ok) setContentOffset(0);
    },
    [region, trackWidth, setRegion, setContentOffset],
  );

  const cancelPan = useCallback(() => setContentOffset(0), [setContentOffset]);

  const panDrag = usePanDrag({
    disabled: !hasValidTrackWidth,
    svg,
    getCurrentDelta: getContentOffset,
    setDelta: setContentOffset,
    onCancel: cancelPan,
    onCommit: commitPan,
    panDragStatus,
  });

  return {
    commitPan,
    panDrag,
  };
}
