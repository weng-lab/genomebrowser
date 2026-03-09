import type { TrackInstance } from "../types";

export interface TrackFrameLayout {
  id: string;
  y: number;
  titleHeight: number;
  contentHeight: number;
  height: number;
}

export function buildTrackFrameLayoutData(tracks: TrackInstance[], browserTitleSize: number) {
  let y = 0;
  const layouts: TrackFrameLayout[] = [];

  for (const track of tracks) {
    const titleSize = track.titleSize || browserTitleSize;
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
