import { useCallback, useMemo, useRef, useState } from "react";
import { createTrackIdsSignature } from "../modules/dataController";
import type { TrackConfigBase } from "../modules/types";
import type { BrowserRegion } from "../utils/region";
import { expandRegion } from "./usePanController";

export function getRenderWindow(
  region: BrowserRegion,
  trackWidth: number,
  overscanMultiplier: number,
) {
  return {
    targetRenderRegion: expandRegion(region, overscanMultiplier),
    renderWidth: trackWidth * overscanMultiplier,
  };
}

export function createRenderWindowSignature(
  region: BrowserRegion,
  tracks: TrackConfigBase[],
  width: number,
) {
  return JSON.stringify({ region, trackIds: createTrackIdsSignature(tracks), width });
}

export function useRenderWindow({
  region,
  tracks,
  trackWidth,
  overscanMultiplier,
}: {
  region: BrowserRegion;
  tracks: TrackConfigBase[];
  trackWidth: number;
  overscanMultiplier: number;
}) {
  const { targetRenderRegion, renderWidth } = useMemo(
    () => getRenderWindow(region, trackWidth, overscanMultiplier),
    [overscanMultiplier, region, trackWidth],
  );
  const [displayedRenderRegion, setDisplayedRenderRegion] =
    useState<BrowserRegion>(targetRenderRegion);
  const dataSignature = useMemo(
    () => createRenderWindowSignature(targetRenderRegion, tracks, renderWidth),
    [targetRenderRegion, tracks, renderWidth],
  );
  const dataSignatureRef = useRef(dataSignature);
  dataSignatureRef.current = dataSignature;

  const settleData = useCallback(
    (signature: string) => {
      if (signature !== dataSignatureRef.current) return false;
      setDisplayedRenderRegion(targetRenderRegion);
      return true;
    },
    [targetRenderRegion],
  );

  return {
    targetRenderRegion,
    displayedRenderRegion,
    renderWidth,
    dataSignature,
    settleData,
  };
}
