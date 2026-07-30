import { useCallback, useMemo, useState } from "react";
import type { AnyTrackInstance } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import { expandRegion } from "./usePanController";

export function getRenderWindow(
  region: GenomicRegion,
  trackWidth: number,
  overscanMultiplier: number,
) {
  return {
    targetRenderRegion: expandRegion(region, overscanMultiplier),
    renderWidth: trackWidth * overscanMultiplier,
  };
}

export function createRenderWindowSignature(region: GenomicRegion, tracks: AnyTrackInstance[]) {
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
  region: GenomicRegion;
  tracks: AnyTrackInstance[];
  trackWidth: number;
  overscanMultiplier: number;
}) {
  const { targetRenderRegion, renderWidth } = useMemo(
    () => getRenderWindow(region, trackWidth, overscanMultiplier),
    [overscanMultiplier, region, trackWidth],
  );
  const [displayedRenderRegion, setDisplayedRenderRegion] =
    useState<GenomicRegion>(targetRenderRegion);
  const dataKey = useMemo(
    () => createRenderWindowSignature(targetRenderRegion, tracks),
    [targetRenderRegion, tracks],
  );
  const settleData = useCallback(
    (key: string) => {
      if (key !== dataKey) return false;
      setDisplayedRenderRegion(targetRenderRegion);
      return true;
    },
    [dataKey, targetRenderRegion],
  );

  return {
    targetRenderRegion,
    displayedRenderRegion,
    renderWidth,
    dataKey,
    settleData,
  };
}
