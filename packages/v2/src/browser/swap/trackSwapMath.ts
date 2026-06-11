import type { TrackConfigBase } from "../../modules/types";
import { getTrackWrapperHeight } from "../tracks/trackLayout";
import type { SwapPreview } from "./types";

export function isSameSwapPreview(a: SwapPreview | null, b: SwapPreview) {
  return (
    a?.draggedId === b.draggedId &&
    a.currentIndex === b.currentIndex &&
    a.targetIndex === b.targetIndex
  );
}

export function getSwapPreview(
  id: string,
  tracks: TrackConfigBase[],
  titleSize: number,
  deltaY: number,
): SwapPreview | null {
  const currentIndex = tracks.findIndex((track) => track.id === id);
  if (currentIndex < 0) return null;

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
    return Math.abs(distance - deltaY) < Math.abs(distances[bestIndex] - deltaY)
      ? index
      : bestIndex;
  }, 0);

  return { draggedId: id, currentIndex, targetIndex };
}

export function getSwapPreviewOffsetY(
  index: number,
  trackId: string,
  tracks: TrackConfigBase[],
  titleSize: number,
  preview: SwapPreview | null,
) {
  if (!preview || trackId === preview.draggedId) return 0;
  const draggedTrack = tracks[preview.currentIndex];
  if (!draggedTrack) return 0;
  const draggedHeight = getTrackWrapperHeight(draggedTrack, titleSize);

  if (preview.targetIndex > preview.currentIndex) {
    return index > preview.currentIndex && index <= preview.targetIndex ? -draggedHeight : 0;
  }
  if (preview.targetIndex < preview.currentIndex) {
    return index >= preview.targetIndex && index < preview.currentIndex ? draggedHeight : 0;
  }
  return 0;
}

export function getSwapOrder(
  id: string,
  tracks: TrackConfigBase[],
  titleSize: number,
  deltaY: number,
) {
  const preview = getSwapPreview(id, tracks, titleSize, deltaY);
  if (!preview) return null;

  const { currentIndex, targetIndex } = preview;

  if (targetIndex === currentIndex) return null;
  const nextOrder = tracks.map((track) => track.id);
  const [movedId] = nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, movedId);
  return nextOrder;
}
