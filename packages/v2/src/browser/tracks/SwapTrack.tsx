import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import type { TrackConfigBase } from "../../modules/types";
import { useBrowserSvg, useTrackStore } from "../../stores/BrowserContext";
import { svgPoint } from "../../utils/svg";
import { getTrackWrapperHeight } from "./trackLayout";

type TrackFrameProps = {
  onSwapMouseDown?: (event: MouseEvent<SVGRectElement>) => void;
  swapping?: boolean;
  isDragClone?: boolean;
};

type DragSession = {
  didEnd: () => boolean;
  handleMove: (event: globalThis.MouseEvent) => void;
  handleUp: (event: globalThis.MouseEvent) => void;
};

export type SwapPreview = {
  draggedId: string;
  currentIndex: number;
  targetIndex: number;
};

export function SwapTrack({
  track,
  titleSize,
  disabled = false,
  onPreviewChange,
  onPreviewEnd,
  children,
}: {
  track: TrackConfigBase;
  titleSize: number;
  disabled?: boolean;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
  children: ReactNode;
}) {
  const svg = useBrowserSvg();
  const tracks = useTrackStore((state) => state.tracks);
  const reorderTracks = useTrackStore((state) => state.reorderTracks);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const isSwapping = dragSession !== null;
  const cloneRef = useRef<SVGGElement>(null);
  const previewRef = useRef<SwapPreview | null>(null);

  useEffect(() => {
    if (!dragSession) return;
    document.addEventListener("mousemove", dragSession.handleMove);
    document.addEventListener("mouseup", dragSession.handleUp);
    return () => {
      document.removeEventListener("mousemove", dragSession.handleMove);
      document.removeEventListener("mouseup", dragSession.handleUp);
      if (!dragSession.didEnd()) onPreviewEnd();
    };
  }, [dragSession, onPreviewEnd]);

  const handleSwapMouseDown = (event: MouseEvent<SVGRectElement>) => {
    if (disabled || event.button !== 0) return;
    if (!svg || tracks.length < 2) return;
    const startPoint = svgPoint(svg, event.clientX, event.clientY);
    if (!startPoint) return;

    event.preventDefault();
    event.stopPropagation();

    const startY = startPoint.y;
    let latestDeltaY = 0;
    let isEnded = false;

    const updatePreview = (deltaY: number) => {
      const preview = getSwapPreview(track.id, tracks, titleSize, deltaY);
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
        reorderToClosestTrack(track.id, tracks, titleSize, latestDeltaY, reorderTracks);
      }

      isEnded = true;
      setDragSession(null);
      previewRef.current = null;
      onPreviewEnd();
    };

    previewRef.current = null;
    setDragSession({
      didEnd: () => isEnded,
      handleMove,
      handleUp,
    });
    updatePreview(0);
  };

  const onSwapMouseDown = disabled ? undefined : handleSwapMouseDown;

  return (
    <>
      <g opacity={isSwapping ? 0 : 1} pointerEvents={isSwapping ? "none" : undefined}>
        {withSwapProps(children, onSwapMouseDown, isSwapping, false)}
      </g>
      {isSwapping &&
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
  reorderTracks: (ids: string[]) => void,
) {
  const preview = getSwapPreview(id, tracks, titleSize, deltaY);
  if (!preview) return;

  const { currentIndex, targetIndex } = preview;

  if (targetIndex === currentIndex) return;
  const nextOrder = tracks.map((track) => track.id);
  const [movedId] = nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, movedId);
  reorderTracks(nextOrder);
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
