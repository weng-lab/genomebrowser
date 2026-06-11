import { useEffect, useRef, useState } from "react";
import type { MouseEvent, RefObject } from "react";
import type { TrackConfigBase } from "../../modules/types";
import { useBrowserSvg, useTrackStore } from "../../stores/BrowserContext";
import { svgPoint } from "../../utils/svg";
import { getSwapOrder, getSwapPreview, isSameSwapPreview } from "./trackSwapMath";
import type { SwapPreview, TrackFrameSwapProps } from "./types";

type DragSession = {
  didEnd: () => boolean;
  handleMove: (event: globalThis.MouseEvent) => void;
  handleUp: (event: globalThis.MouseEvent) => void;
};

export function useTrackSwap({
  track,
  titleSize,
  disabled = false,
  onPreviewChange,
  onPreviewEnd,
  cloneRef,
}: {
  track: TrackConfigBase;
  titleSize: number;
  disabled?: boolean;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
  cloneRef: RefObject<SVGGElement | null>;
}) {
  const svg = useBrowserSvg();
  const tracks = useTrackStore((state) => state.tracks);
  const reorderTracks = useTrackStore((state) => state.reorderTracks);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const isSwapping = dragSession !== null;
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
      if (!preview || isSameSwapPreview(previewRef.current, preview)) return;
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
        const nextOrder = getSwapOrder(track.id, tracks, titleSize, latestDeltaY);
        if (nextOrder) reorderTracks(nextOrder);
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
  const swapProps: TrackFrameSwapProps = {
    onSwapMouseDown,
    swapping: isSwapping,
    isDragClone: false,
  };
  const cloneSwapProps: TrackFrameSwapProps = {
    onSwapMouseDown,
    swapping: true,
    isDragClone: true,
  };

  return { svg, isSwapping, swapProps, cloneSwapProps };
}
