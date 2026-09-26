import { useEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import type { AnyTrackInstance } from "../../modules/types";
import { svgPoint } from "../../modules/utils/svg";
import { useTrackMutationGate, useGenomeBrowser } from "../state/browserContextState";
import { useBrowserSvg } from "../svg/browserSvgState";
import { getTrackWrapperHeight } from "./trackLayout";
import { useTrackStack } from "./trackStackContext";
import { getSwapOrder, getSwapPreview, isSameSwapPreview } from "./trackSwapMath";
import type { SwapPreview, TrackFrameSwapProps } from "./swapTypes";

type DragSession = {
  didEnd: () => boolean;
  handleMove: (event: globalThis.PointerEvent) => void;
  handleUp: (event: globalThis.PointerEvent) => void;
  handleCancel: (event: globalThis.PointerEvent) => void;
};

export function useTrackSwap({
  track,
  disabled = false,
  onPreviewChange,
  onPreviewEnd,
  cloneRef,
}: {
  track: AnyTrackInstance;
  disabled?: boolean;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
  cloneRef: RefObject<SVGGElement | null>;
}) {
  const svg = useBrowserSvg();
  const { titleSize } = useTrackStack();
  const { useTrackStore } = useGenomeBrowser();
  const { isInteractionBlocked, runTrackMutation } = useTrackMutationGate();
  const isPinned = useTrackStore((state) => state.pinnedTrackIds.includes(track.base.id));
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const isSwapping = dragSession !== null;
  const previewRef = useRef<SwapPreview | null>(null);

  useEffect(() => {
    if (!dragSession) return;
    document.addEventListener("pointermove", dragSession.handleMove);
    document.addEventListener("pointerup", dragSession.handleUp);
    document.addEventListener("pointercancel", dragSession.handleCancel);
    const cursorStyle = document.createElement("style");
    cursorStyle.textContent = "* { cursor: grabbing !important; }";
    document.head.appendChild(cursorStyle);
    return () => {
      document.removeEventListener("pointermove", dragSession.handleMove);
      document.removeEventListener("pointerup", dragSession.handleUp);
      document.removeEventListener("pointercancel", dragSession.handleCancel);
      cursorStyle.remove();
      if (!dragSession.didEnd()) onPreviewEnd();
    };
  }, [dragSession, onPreviewEnd]);

  const handleSwapPointerDown = (event: PointerEvent<SVGRectElement>) => {
    if (
      disabled ||
      isPinned ||
      isInteractionBlocked ||
      isSwapping ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    const pointerId = event.pointerId;
    const { tracks, pinnedTrackIds, reorderTracks } = useTrackStore.getState();
    if (!svg || tracks.length < 2) return;
    const startPoint = svgPoint(svg, event.clientX, event.clientY);
    if (!startPoint) return;

    event.preventDefault();
    event.stopPropagation();

    const currentIndex = tracks.findIndex((candidate) => candidate.base.id === track.base.id);
    const pinned = new Set(pinnedTrackIds);
    const minDeltaY = -tracks
      .slice(0, currentIndex)
      .filter((candidate) => !pinned.has(candidate.base.id))
      .reduce((height, candidate) => height + getTrackWrapperHeight(candidate, titleSize), 0);
    const isCurrent = () => {
      const state = useTrackStore.getState();
      return state.tracks === tracks && state.pinnedTrackIds === pinnedTrackIds;
    };
    const startY = startPoint.y;
    let latestDeltaY = 0;
    let isEnded = false;

    const updatePreview = (deltaY: number) => {
      const preview = getSwapPreview(track.base.id, tracks, titleSize, deltaY, pinnedTrackIds);
      if (!preview || isSameSwapPreview(previewRef.current, preview)) return;
      previewRef.current = preview;
      onPreviewChange(preview);
    };

    const moveClone = (deltaY: number) => {
      cloneRef.current?.setAttribute("transform", `translate(0,${deltaY})`);
    };

    const handleMove = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointerId || isEnded) return;
      event.preventDefault();
      const point = svgPoint(svg, event.clientX, event.clientY);
      if (!point) return;
      if (!isCurrent()) return;
      latestDeltaY = Math.max(minDeltaY, point.y - startY);
      moveClone(latestDeltaY);
      updatePreview(latestDeltaY);
    };

    const handleUp = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointerId || isEnded) return;
      event.preventDefault();
      if (isCurrent() && Math.abs(latestDeltaY) > 5) {
        const nextOrder = getSwapOrder(
          track.base.id,
          tracks,
          titleSize,
          latestDeltaY,
          pinnedTrackIds,
        );
        if (nextOrder) runTrackMutation(() => reorderTracks(nextOrder));
      }

      isEnded = true;
      setDragSession(null);
      previewRef.current = null;
      onPreviewEnd();
    };

    const handleCancel = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointerId || isEnded) return;
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
      handleCancel,
    });
    updatePreview(0);
  };

  const onSwapPointerDown =
    disabled || isPinned || isInteractionBlocked ? undefined : handleSwapPointerDown;
  const swapProps: TrackFrameSwapProps = {
    onSwapPointerDown,
    swapping: isSwapping,
    isDragClone: false,
  };
  const cloneSwapProps: TrackFrameSwapProps = {
    onSwapPointerDown,
    swapping: true,
    isDragClone: true,
  };

  return { svg, isSwapping, swapProps, cloneSwapProps };
}
