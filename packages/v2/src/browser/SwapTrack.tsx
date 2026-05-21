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

export function SwapTrack({
  svg,
  track,
  tracks,
  trackStore,
  titleSize,
  disabled = false,
  children,
}: {
  svg: SVGSVGElement | null;
  track: TrackConfigBase;
  tracks: TrackConfigBase[];
  trackStore: TrackStoreInstance;
  titleSize: number;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [deltaY, setDeltaY] = useState<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  const handleSwapMouseDown = (event: MouseEvent<SVGRectElement>) => {
    if (disabled || event.button !== 0) return;
    if (!svg || tracks.length < 2) return;
    const startPoint = svgPoint(svg, event.clientX, event.clientY);
    if (!startPoint) return;

    event.preventDefault();
    event.stopPropagation();

    const startY = startPoint.y;
    let latestDeltaY = 0;

    const handleMove = (event: globalThis.MouseEvent) => {
      event.preventDefault();
      const point = svgPoint(svg, event.clientX, event.clientY);
      if (!point) return;
      latestDeltaY = point.y - startY;
      setDeltaY(latestDeltaY);
    };

    const handleUp = (event: globalThis.MouseEvent) => {
      event.preventDefault();
      cleanupRef.current?.();
      cleanupRef.current = null;
      setDeltaY(null);

      if (Math.abs(latestDeltaY) <= 5) return;
      reorderToClosestTrack(track.id, tracks, titleSize, latestDeltaY, trackStore);
    };

    cleanupRef.current?.();
    cleanupRef.current = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    setDeltaY(0);
  };

  const swapping = deltaY !== null;
  const onSwapMouseDown = disabled ? undefined : handleSwapMouseDown;

  return (
    <>
      <g opacity={swapping ? 0.35 : 1}>
        {withSwapProps(children, onSwapMouseDown, swapping, false)}
      </g>
      {swapping &&
        svg &&
        createPortal(
          <g
            transform={`translate(0,${deltaY})`}
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

function reorderToClosestTrack(
  id: string,
  tracks: TrackConfigBase[],
  titleSize: number,
  deltaY: number,
  trackStore: TrackStoreInstance,
) {
  const currentIndex = tracks.findIndex((track) => track.id === id);
  if (currentIndex < 0) return;

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

  if (targetIndex === currentIndex) return;
  const nextOrder = tracks.map((track) => track.id);
  const [movedId] = nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, movedId);
  trackStore.getState().reorderTracks(nextOrder);
}
