import { createElement } from "react";
import type { GenomicRegion } from "../../genome/region";
import {
  useGenomeBrowser,
  useIsInteractionBlocked,
  usePanDragStatus,
} from "../state/browserContextState";
import type { BrowserStore } from "../state/browserStore";
import { useContentTransform } from "./useContentTransform";
import { usePanController } from "./usePanController";
import { usePanWheel } from "./usePanWheel";

/** Owns content movement and the pointer and wheel gestures that commit it. */
export function usePanning({
  svg,
  region,
  marginWidth,
  trackWidth,
  setRegion,
}: {
  svg: SVGSVGElement | null;
  region: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
  setRegion: BrowserStore["setRegion"];
}) {
  const panDragStatus = usePanDragStatus();
  const { getContentOffset, registerContentGroup, setContentOffset } = useContentTransform({
    region,
    marginWidth,
    trackWidth,
  });
  const { commitPan, panDrag } = usePanController({
    svg,
    region,
    trackWidth,
    getContentOffset,
    setContentOffset,
    setRegion,
    panDragStatus,
  });

  return {
    panDrag,
    registerContentGroup,
    wheel: createElement(PanWheelBinding, {
      svg,
      trackWidth,
      isDragging: panDrag.isDragging,
      setContentOffset,
      onCommit: commitPan,
    }),
  };
}

// Keep gate subscriptions below the canvas so loading and mode changes do not
// render the track tree. The wheel effect cancels a pending preview on disable.
function PanWheelBinding({
  svg,
  trackWidth,
  isDragging,
  setContentOffset,
  onCommit,
}: {
  svg: SVGSVGElement | null;
  trackWidth: number;
  isDragging: () => boolean;
  setContentOffset: (deltaPx: number) => number;
  onCommit: (deltaPx: number) => void;
}) {
  const isInteractionBlocked = useIsInteractionBlocked();
  const { useBrowserStore } = useGenomeBrowser();
  const selectionMode = useBrowserStore((state) => state.selectionMode);
  usePanWheel({
    svg,
    disabled: isInteractionBlocked || selectionMode !== "pan",
    trackWidth,
    isDragging,
    setContentOffset,
    onCommit,
  });
  return null;
}
