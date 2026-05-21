import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import type { TrackConfigBase } from "../modules/types";
import type { TrackStoreInstance } from "../stores/trackStore";
import { svgPoint } from "../utils/svg";
import { getTrackWrapperHeight } from "./TrackFrame";

type TrackFrameProps = {
  onSwapMouseDown?: (event: MouseEvent<SVGRectElement>) => void;
  swapping?: boolean;
  isDragClone?: boolean;
};

export type SwapPreview = {
  draggedId: string;
  currentIndex: number;
  targetIndex: number;
};

export function SwapTrack({
  svg,
  track,
  trackStore,
  titleSize,
  disabled = false,
  onPreviewChange,
  onPreviewEnd,
  children,
}: {
  svg: SVGSVGElement | null;
  track: TrackConfigBase;
  trackStore: TrackStoreInstance;
  titleSize: number;
  disabled?: boolean;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
  children: ReactNode;
}) {
  const [swapping, setSwapping] = useState(false);
  const cloneRef = useRef<SVGGElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isDraggingRef = useRef(false);
  const previewRef = useRef<SwapPreview | null>(null);
  const onPreviewEndRef = useRef(onPreviewEnd);

  onPreviewEndRef.current = onPreviewEnd;

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      if (isDraggingRef.current) onPreviewEndRef.current();
    };
  }, []);

  const handleSwapMouseDown = (event: MouseEvent<SVGRectElement>) => {
    if (disabled || event.button !== 0) return;
    if (!svg || trackStore.getState().tracks.length < 2) return;
    const startPoint = svgPoint(svg, event.clientX, event.clientY);
    if (!startPoint) return;

    event.preventDefault();
    event.stopPropagation();

    const startY = startPoint.y;
    let latestDeltaY = 0;

    const updatePreview = (deltaY: number) => {
      const preview = getSwapPreview(track.id, trackStore.getState().tracks, titleSize, deltaY);
      if (!preview || isSamePreview(previewRef.current, preview)) return;
      previewRef.current = preview;
      onPreviewChange(preview);
    };

    const moveClone = (deltaY: number) => {
      cloneRef.current?.setAttribute("transform", `translate(0,${deltaY})`);
    };

    const handleMove = (event: globalThis.MouseEvent) => {
      event.preventDefault();
      const point = svgPoint(svg, event.clientX, event.clientY);
      if (!point) return;
      latestDeltaY = point.y - startY;
      moveClone(latestDeltaY);
      updatePreview(latestDeltaY);
    };

    const handleUp = (event: globalThis.MouseEvent) => {
      event.preventDefault();
      if (Math.abs(latestDeltaY) > 5) {
        reorderToClosestTrack(
          track.id,
          trackStore.getState().tracks,
          titleSize,
          latestDeltaY,
          trackStore,
        );
      }

      cleanupRef.current?.();
      cleanupRef.current = null;
      isDraggingRef.current = false;
      setSwapping(false);
      previewRef.current = null;
      onPreviewEnd();
    };

    cleanupRef.current?.();
    isDraggingRef.current = true;
    previewRef.current = null;
    cleanupRef.current = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    setSwapping(true);
    updatePreview(0);
  };

  const onSwapMouseDown = disabled ? undefined : handleSwapMouseDown;

  return (
    <>
      <g opacity={swapping ? 0 : 1} pointerEvents={swapping ? "none" : undefined}>
        {withSwapProps(children, onSwapMouseDown, swapping, false)}
      </g>
      {swapping &&
        svg &&
        createPortal(
          <g
            ref={cloneRef}
            transform="translate(0,0)"
            style={{
              cursor: "grabbing",
              filter: "drop-shadow(2px 2px 2px gray)",
              pointerEvents: "none",
            }}
          >
            {withSwapProps(children, onSwapMouseDown, true, true)}
          </g>,
          svg,
        )}
    </>
  );
}

function withSwapProps(
  children: ReactNode,
  onSwapMouseDown: ((event: MouseEvent<SVGRectElement>) => void) | undefined,
  swapping: boolean,
  isDragClone: boolean,
) {
  if (!isValidElement(children)) return children;
  return cloneElement(children as ReactElement<TrackFrameProps>, {
    onSwapMouseDown,
    swapping,
    isDragClone,
  });
}

function isSamePreview(a: SwapPreview | null, b: SwapPreview) {
  return (
    a?.draggedId === b.draggedId &&
    a.currentIndex === b.currentIndex &&
    a.targetIndex === b.targetIndex
  );
}

function reorderToClosestTrack(
  id: string,
  tracks: TrackConfigBase[],
  titleSize: number,
  deltaY: number,
  trackStore: TrackStoreInstance,
) {
  const preview = getSwapPreview(id, tracks, titleSize, deltaY);
  if (!preview) return;

  const { currentIndex, targetIndex } = preview;

  if (targetIndex === currentIndex) return;
  const nextOrder = tracks.map((track) => track.id);
  const [movedId] = nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, movedId);
  trackStore.getState().reorderTracks(nextOrder);
}

function getSwapPreview(
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
