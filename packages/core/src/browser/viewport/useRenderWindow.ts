import { useCallback, useMemo, useState } from "react";
import type { AnyTrackInstance } from "../../modules/types";
import type { AssemblyDefinition } from "../../genome/assembly";
import type { GenomicRegion } from "../../genome/region";
import { normalizeRegion } from "../../genome/region";
import { expandRegion } from "./usePanController";

type RenderWindow = {
  targetRenderRegion: GenomicRegion;
  renderWidth: number;
  renderStartOffset: number;
};

type RenderGeometry = Pick<RenderWindow, "renderWidth" | "renderStartOffset">;

export function getRenderGeometry(
  displayedRegion: GenomicRegion,
  visibleRegion: GenomicRegion,
  trackWidth: number,
): RenderGeometry | null {
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return null;
  const visibleSpan = visibleRegion.end - visibleRegion.start;
  const displayedSpan = displayedRegion.end - displayedRegion.start;
  if (visibleSpan <= 0 || displayedSpan <= 0) return null;

  const renderWidth = (trackWidth * displayedSpan) / visibleSpan;
  const renderStartOffset =
    displayedRegion.chromosome === visibleRegion.chromosome
      ? (trackWidth * (visibleRegion.start - displayedRegion.start)) / visibleSpan
      : 0;
  if (!Number.isFinite(renderWidth) || renderWidth <= 0 || !Number.isFinite(renderStartOffset)) {
    return null;
  }
  return { renderWidth, renderStartOffset };
}

export function getRenderWindow(
  region: GenomicRegion,
  assembly: AssemblyDefinition,
  trackWidth: number,
  overscanMultiplier: number,
): RenderWindow | null {
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return null;
  const expandedRegion = expandRegion(region, overscanMultiplier);
  if (!expandedRegion) return null;
  const normalizedRegion = normalizeRegion(expandedRegion, assembly);
  if (!normalizedRegion.ok) return null;
  const geometry = getRenderGeometry(normalizedRegion.region, region, trackWidth);
  if (!geometry) return null;

  return {
    targetRenderRegion: normalizedRegion.region,
    ...geometry,
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
  assembly,
  tracks,
  trackWidth,
  overscanMultiplier,
}: {
  region: GenomicRegion;
  assembly: AssemblyDefinition;
  tracks: AnyTrackInstance[];
  trackWidth: number;
  overscanMultiplier: number;
}) {
  const targetRenderWindow = useMemo(
    () =>
      getRenderWindow(region, assembly, trackWidth, overscanMultiplier) ?? {
        targetRenderRegion: region,
        renderWidth: Number.isFinite(trackWidth) && trackWidth > 0 ? trackWidth : 0,
        renderStartOffset: 0,
      },
    [assembly, overscanMultiplier, region, trackWidth],
  );
  const dataKey = useMemo(
    () => createRenderWindowSignature(targetRenderWindow.targetRenderRegion, tracks),
    [targetRenderWindow.targetRenderRegion, tracks],
  );
  const [displayedData, setDisplayedData] = useState(() => ({
    region: targetRenderWindow.targetRenderRegion,
    key: dataKey,
  }));
  const displayedGeometry = useMemo(
    () =>
      getRenderGeometry(displayedData.region, region, trackWidth) ?? {
        renderWidth: Number.isFinite(trackWidth) && trackWidth > 0 ? trackWidth : 0,
        renderStartOffset: 0,
      },
    [displayedData.region, region, trackWidth],
  );
  const settleData = useCallback(
    (key: string) => {
      if (key !== dataKey) return false;
      setDisplayedData({ region: targetRenderWindow.targetRenderRegion, key });
      return true;
    },
    [dataKey, targetRenderWindow],
  );

  return {
    targetRenderRegion: targetRenderWindow.targetRenderRegion,
    displayedRenderRegion: displayedData.region,
    renderWidth: displayedGeometry.renderWidth,
    renderStartOffset: displayedGeometry.renderStartOffset,
    isDataSettled: displayedData.key === dataKey,
    dataKey,
    settleData,
  };
}
