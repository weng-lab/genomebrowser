import type { AnyTrackInstance } from "../../modules/types";

export function getTrackWrapperHeight(track: AnyTrackInstance, titleSize: number) {
  return track.base.height + (track.base.title ? titleSize + 5 : 0);
}

export function getTrackTitleMargin(track: AnyTrackInstance, titleSize: number) {
  return track.base.title ? titleSize + 5 : 0;
}

export type TrackLayout = {
  id: string;
  index: number;
  y: number;
  wrapperHeight: number;
};

export function createTrackLayouts(ids: string[], wrapperHeights: number[], startY: number) {
  let y = startY;
  return ids.map((id, index): TrackLayout => {
    const wrapperHeight = wrapperHeights[index] ?? 0;
    const layout = { id, index, y, wrapperHeight };
    y += wrapperHeight;
    return layout;
  });
}
