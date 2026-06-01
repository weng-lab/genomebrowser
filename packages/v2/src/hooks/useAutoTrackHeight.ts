import { useEffect } from "react";
import type { TrackConfigBase } from "../modules/types";
import { useTrackStore } from "../stores/BrowserContext";

export type AutoTrackHeightOptions = {
  rowHeight?: number;
  minHeight?: number;
};

export function useAutoTrackHeight(
  trackId: string,
  rowCount: number,
  { rowHeight = 12, minHeight = 30 }: AutoTrackHeightOptions = {},
) {
  const currentHeight = useTrackStore((state) => state.getTrack(trackId)?.height);
  const updateTrack = useTrackStore((state) => state.updateTrack);

  useEffect(() => {
    if (currentHeight === undefined) return;

    const nextHeight = Math.max(minHeight, Math.max(1, rowCount) * rowHeight);
    if (currentHeight !== nextHeight) {
      updateTrack<TrackConfigBase>(trackId, { height: nextHeight });
    }
  }, [currentHeight, minHeight, rowCount, rowHeight, trackId, updateTrack]);

  return rowHeight;
}
