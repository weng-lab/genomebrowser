import { useEffect } from "react";
import { useGenomeBrowser } from "../state/browserContextState";

export type AutoTrackHeightOptions = {
  rowHeight?: number;
  minHeight?: number;
};

export function useAutoTrackHeight(
  trackId: string,
  rowCount: number,
  { rowHeight = 12, minHeight = 30 }: AutoTrackHeightOptions = {},
) {
  const { useTrackStore } = useGenomeBrowser();
  const currentHeight = useTrackStore((state) => state.getTrack(trackId)?.base.height);
  const updateTrack = useTrackStore((state) => state.updateTrack);

  useEffect(() => {
    if (currentHeight === undefined) return;

    const nextHeight = Math.max(minHeight, Math.max(1, rowCount) * rowHeight);
    if (currentHeight !== nextHeight) {
      updateTrack(trackId, { base: { height: nextHeight } });
    }
  }, [currentHeight, minHeight, rowCount, rowHeight, trackId, updateTrack]);

  return rowHeight;
}
