import type { Track } from "../types";

export interface TrackFrameLayout {
  id: string;
  y: number;
  titleHeight: number;
  contentHeight: number;
  height: number;
}

export function getTrackTitleSize(track: Track, browserTitleSize: number) {
  return track.titleSize ?? browserTitleSize;
}

export function buildTrackFrameLayoutData(tracks: Track[], browserTitleSize: number) {
  let y = 0;
  const layouts: TrackFrameLayout[] = [];

  for (const track of tracks) {
    const titleSize = getTrackTitleSize(track, browserTitleSize);
    const titleHeight = track.title ? titleSize + 5 : 0;
    const contentHeight = track.height;
    const height = titleHeight + contentHeight;

    layouts.push({
      id: track.id,
      y,
      titleHeight,
      contentHeight,
      height,
    });

    y += height;
  }

  const layoutById = Object.fromEntries(layouts.map((layout) => [layout.id, layout]));
  const reorderDistancesById = Object.fromEntries(
    layouts.map((layout) => [layout.id, layouts.map((candidate) => candidate.y - layout.y)])
  );

  return {
    layouts,
    layoutById,
    reorderDistancesById,
    totalHeight: y,
  };
}
