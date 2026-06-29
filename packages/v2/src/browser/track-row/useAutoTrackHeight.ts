import { use, useEffect } from "react";
import type { TrackConfigBase } from "../../modules/types";
import { TrackHeightContext } from "./TrackHeightProvider";

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

  const { getTrackHeight, updateTrack } = controller;

  const currentHeight = getTrackHeight(trackId);

  useEffect(() => {
    if (currentHeight === undefined) return;

    const nextHeight = Math.max(minHeight, Math.max(1, rowCount) * rowHeight);
    if (currentHeight !== nextHeight) {
      updateTrack<TrackConfigBase>(trackId, { height: nextHeight });
    }
  }, [currentHeight, minHeight, rowCount, rowHeight, trackId, updateTrack]);

  return rowHeight;
}
