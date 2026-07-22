import { use, useEffect } from "react";
import { TrackHeightContext } from "./trackHeightContext";

export type AutoTrackHeightOptions = {
  rowHeight?: number;
  minHeight?: number;
};

export function useAutoTrackHeight(
  trackId: string,
  rowCount: number,
  { rowHeight = 12, minHeight = 30 }: AutoTrackHeightOptions = {},
) {
  const controller = use(TrackHeightContext);
  if (!controller) throw new Error("useAutoTrackHeight must be used within a GenomeBrowser");

  const { getTrackHeight, updateHeight } = controller;

  const currentHeight = getTrackHeight(trackId);

  useEffect(() => {
    if (currentHeight === undefined) return;

    const nextHeight = Math.max(minHeight, Math.max(1, rowCount) * rowHeight);
    if (currentHeight !== nextHeight) {
      updateHeight(trackId, nextHeight);
    }
  }, [currentHeight, minHeight, rowCount, rowHeight, trackId, updateHeight]);

  return rowHeight;
}
