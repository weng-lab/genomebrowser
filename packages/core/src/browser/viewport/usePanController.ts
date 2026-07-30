import { useCallback, useState } from "react";
import type { GenomicRegion } from "../../genome/region";
import { usePanDrag } from "./usePanDrag";

export function expandRegion(region: GenomicRegion, multiplier: number): GenomicRegion {
  const span = region.end - region.start;
  const sideBases = Math.floor((span * (multiplier - 1)) / 2);

  return {
    chromosome: region.chromosome,
    start: region.start - sideBases,
    end: region.end + sideBases,
  };
}

export function getPanCommitRegion(
  region: GenomicRegion,
  width: number,
  deltaPx: number,
): GenomicRegion {
  const span = region.end - region.start;
  const shiftBases = Math.floor((deltaPx / width) * span);

  return {
    chromosome: region.chromosome,
    start: region.start - shiftBases,
    end: region.end - shiftBases,
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
  setRegion: (region: GenomicRegion) => void;
  onPanStart: () => void;
}) {
  const [isPanLocked, setIsPanLocked] = useState(false);

  const unlockPan = useCallback(() => {
    setIsPanLocked(false);
  }, []);

  const panDrag = usePanDrag({
    disabled: isPanLocked,
    svg,
    getCurrentDelta: getContentOffset,
    setDelta: setContentOffset,
    onCancel: () => setContentOffset(0),
    onStart: onPanStart,
    onCommit: (committedDeltaPx) => {
      setIsPanLocked(true);
      setRegion(getPanCommitRegion(region, trackWidth, committedDeltaPx));
    },
  });

  return {
    isPanLocked,
    panDrag,
    unlockPan,
  };
}
