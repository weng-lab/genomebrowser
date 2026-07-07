import { useCallback, useMemo, useRef, useState } from "react";
import type { AnyTrackInstance } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
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

export function createRenderWindowSignature(region: BrowserRegion, tracks: AnyTrackInstance[]) {
  return JSON.stringify({ region, trackIds: createTrackIdsSignature(tracks) });
}

function createTrackIdsSignature(tracks: AnyTrackInstance[]) {
  return JSON.stringify(tracks.map((track) => track.base.id).sort());
}

export function useRenderWindow({
  region,
  tracks,
  trackWidth,
  overscanMultiplier,
}: {
  region: BrowserRegion;
  tracks: AnyTrackInstance[];
  trackWidth: number;
  overscanMultiplier: number;
}) {
  const { targetRenderRegion, renderWidth } = useMemo(
    () => getRenderWindow(region, trackWidth, overscanMultiplier),
    [overscanMultiplier, region, trackWidth],
  );
  const [displayedRenderRegion, setDisplayedRenderRegion] =
    useState<BrowserRegion>(targetRenderRegion);
  const dataKey = useMemo(
    () => createRenderWindowSignature(targetRenderRegion, tracks),
    [targetRenderRegion, tracks],
  );
  const dataKeyRef = useRef(dataKey);
  dataKeyRef.current = dataKey;

  const settleData = useCallback(
    (key: string) => {
      if (key !== dataKeyRef.current) return false;
      setDisplayedRenderRegion(targetRenderRegion);
      return true;
    },
    [targetRenderRegion],
  );

  return {
    targetRenderRegion,
    displayedRenderRegion,
    renderWidth,
    dataKey,
    settleData,
  };
}
