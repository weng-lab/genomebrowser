import type { AnyTrackInstance } from "../../../modules/types";
import { getTrackWrapperHeight } from "../layout/trackLayout";
import type { TrackLayout } from "../layout/trackLayout";

export type ReorderPreview = {
  draggedId: string;
  currentIndex: number;
  targetIndex: number;
};

export function isSameReorderPreview(a: ReorderPreview | null, b: ReorderPreview) {
  return (
    a?.draggedId === b.draggedId &&
    a.currentIndex === b.currentIndex &&
    a.targetIndex === b.targetIndex
  );
}

export function getReorderPreview(
  id: string,
  tracks: AnyTrackInstance[],
  titleSize: number,
  deltaY: number,
  pinnedTrackIds: readonly string[] = [],
): ReorderPreview | null {
  const currentIndex = tracks.findIndex((track) => track.base.id === id);
  if (currentIndex < 0 || pinnedTrackIds.includes(id)) return null;
  const pinned = new Set(pinnedTrackIds);

  const heights = tracks.map((track) => getTrackWrapperHeight(track, titleSize));
  const distances = heights.map((_, index) => {
    if (index < currentIndex) {
      return -heights.slice(index, currentIndex).reduce((sum, height) => sum + height, 0);
    }
    if (index > currentIndex) {
      return heights.slice(currentIndex + 1, index + 1).reduce((sum, height) => sum + height, 0);
    }
    return 0;
  });
  const targetIndex = distances.reduce((bestIndex, distance, index) => {
    if (pinned.has(tracks[index].base.id)) return bestIndex;
    return Math.abs(distance - deltaY) < Math.abs(distances[bestIndex] - deltaY)
      ? index
      : bestIndex;
  }, currentIndex);

  return { draggedId: id, currentIndex, targetIndex };
}

export function getReorderPreviewOffsetY(
  layout: TrackLayout,
  trackLayouts: TrackLayout[],
  preview: ReorderPreview | null,
) {
  if (!preview || layout.id === preview.draggedId) return 0;
  const draggedHeight = trackLayouts[preview.currentIndex]?.wrapperHeight;
  if (draggedHeight === undefined) return 0;

  if (preview.targetIndex > preview.currentIndex) {
    return layout.index > preview.currentIndex && layout.index <= preview.targetIndex
      ? -draggedHeight
      : 0;
  }
  if (preview.targetIndex < preview.currentIndex) {
    return layout.index >= preview.targetIndex && layout.index < preview.currentIndex
      ? draggedHeight
      : 0;
  }
  return 0;
}

export function getReorderedTrackIds(
  id: string,
  tracks: AnyTrackInstance[],
  titleSize: number,
  deltaY: number,
  pinnedTrackIds: readonly string[] = [],
) {
  const preview = getReorderPreview(id, tracks, titleSize, deltaY, pinnedTrackIds);
  if (!preview) return null;

  const { currentIndex, targetIndex } = preview;

  if (targetIndex === currentIndex) return null;
  const nextOrder = tracks.map((track) => track.base.id);
  const [movedId] = nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, movedId);
  return nextOrder;
}
