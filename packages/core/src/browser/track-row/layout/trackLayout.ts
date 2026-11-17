import type { AnyTrackInstance } from "../../../modules/types";

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

export const TRACK_SET_HEADER_HEIGHT = 32;
export const TRACK_SET_TOGGLE_WIDTH = 32;
export const TRACK_SET_TITLE_X = TRACK_SET_TOGGLE_WIDTH + 4;
export type TrackSetLayout = { id: string; y: number; height: number };

/** Shared vertical geometry for rendering and event-time drag snapshots. */
export function createTrackStackLayouts(
  trackIds: readonly string[],
  wrapperHeights: readonly number[],
  trackSetIds: readonly (string | undefined)[],
  visible: readonly boolean[],
) {
  const trackLayouts: TrackLayout[] = [];
  const trackSetLayouts: TrackSetLayout[] = [];
  const layoutsBySetId = new Map<string, TrackSetLayout>();
  let y = 0;

  trackIds.forEach((id, index) => {
    const trackSetId = trackSetIds[index];
    let trackSetLayout = trackSetId ? layoutsBySetId.get(trackSetId) : undefined;
    if (trackSetId && !trackSetLayout) {
      trackSetLayout = { id: trackSetId, y, height: TRACK_SET_HEADER_HEIGHT };
      layoutsBySetId.set(trackSetId, trackSetLayout);
      trackSetLayouts.push(trackSetLayout);
      y += TRACK_SET_HEADER_HEIGHT;
    }
    if (!visible[index]) return;

    const wrapperHeight = wrapperHeights[index] ?? 0;
    trackLayouts.push({ id, index, y, wrapperHeight });
    y += wrapperHeight;
    if (trackSetLayout) trackSetLayout.height += wrapperHeight;
  });
  return { trackLayouts, trackSetLayouts, totalHeight: Math.max(1, y) };
}
