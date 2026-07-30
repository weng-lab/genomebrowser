import { useCallback, useState } from "react";
import type { GenomicRegion } from "../../genome/region";
import type { BrowserRegionMutationResult } from "../state/browserStore";
import { usePanDrag } from "./usePanDrag";

export function expandRegion(region: GenomicRegion, multiplier: number): GenomicRegion | null {
  const span = region.end - region.start;
  if (!Number.isSafeInteger(span) || span <= 0 || !Number.isFinite(multiplier) || multiplier < 1) {
    return null;
  }
  const sideBases = Math.floor((span * (multiplier - 1)) / 2);
  const start = region.start - sideBases;
  const end = region.end + sideBases;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;

  return {
    chromosome: region.chromosome,
    start,
    end,
  };
}

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
  onPanStart,
}: {
  svg: SVGSVGElement | null;
  region: GenomicRegion;
  trackWidth: number;
  getContentOffset: () => number;
  setContentOffset: (deltaPx: number) => void;
  setRegion: (region: GenomicRegion) => BrowserRegionMutationResult;
  onPanStart: () => void;
}) {
  const [isPanLocked, setIsPanLocked] = useState(false);
  const hasValidTrackWidth = Number.isFinite(trackWidth) && trackWidth > 0;

  const unlockPan = useCallback(() => {
    setIsPanLocked(false);
  }, []);

  const panDrag = usePanDrag({
    disabled: isPanLocked || !hasValidTrackWidth,
    svg,
    getCurrentDelta: getContentOffset,
    setDelta: setContentOffset,
    onCancel: () => setContentOffset(0),
    onStart: onPanStart,
    onCommit: (committedDeltaPx) => {
      const candidate = getPanCommitRegion(region, trackWidth, committedDeltaPx);
      if (!candidate) {
        setContentOffset(0);
        return;
      }
      const result = setRegion(candidate);
      if (!result.ok) {
        setContentOffset(0);
        return;
      }
      setContentOffset(0);
      setIsPanLocked(true);
    },
  });

  return {
    isPanLocked,
    panDrag,
    unlockPan,
  };
}
