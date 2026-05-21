import { useCallback, useRef, useState } from "react";
import type { BrowserRegion } from "../utils/region";
import { usePanDrag } from "./usePanDrag";

export function expandRegion(region: BrowserRegion, multiplier: number): BrowserRegion {
  const span = region.end - region.start;
  const sideBases = Math.floor((span * (multiplier - 1)) / 2);

  return {
    chromosome: region.chromosome,
    start: region.start - sideBases,
    end: region.end + sideBases,
  };
}

export function getPanCommitRegion(
  region: BrowserRegion,
  width: number,
  deltaPx: number,
): BrowserRegion {
  const span = region.end - region.start;
  const shiftBases = Math.floor((deltaPx / width) * span);

  return {
    chromosome: region.chromosome,
    start: region.start - shiftBases,
    end: region.end - shiftBases,
  };
}

export function usePanController({
  region,
  trackWidth,
  getContentOffset,
  setContentOffset,
  setRegion,
}: {
  region: BrowserRegion;
  trackWidth: number;
  getContentOffset: () => number;
  setContentOffset: (deltaPx: number) => void;
  setRegion: (region: BrowserRegion) => void;
}) {
  const [isPanLocked, setIsPanLocked] = useState(false);
  const regionRef = useRef(region);
  const trackWidthRef = useRef(trackWidth);

  regionRef.current = region;
  trackWidthRef.current = trackWidth;

  const unlockPan = useCallback(() => {
    setIsPanLocked(false);
  }, []);

  const panDrag = usePanDrag({
    disabled: isPanLocked,
    getCurrentDelta: getContentOffset,
    setDelta: setContentOffset,
    onCancel: () => setContentOffset(0),
    onCommit: (committedDeltaPx) => {
      setIsPanLocked(true);
      setRegion(getPanCommitRegion(regionRef.current, trackWidthRef.current, committedDeltaPx));
    },
  });

  return {
    isPanLocked,
    panDrag,
    unlockPan,
  };
}
