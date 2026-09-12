import { useEffect } from "react";
import { svgPoint } from "../../modules/utils/svg";

const WHEEL_SETTLE_MS = 120;
const LINE_HEIGHT_PX = 16;

/** Preview a horizontal gesture immediately and commit once its wheel events settle. */
export function usePanWheel({
  svg,
  disabled,
  trackWidth,
  isDragging,
  setContentOffset,
  onCommit,
}: {
  svg: SVGSVGElement | null;
  disabled: boolean;
  trackWidth: number;
  isDragging: () => boolean;
  setContentOffset: (deltaPx: number) => void;
  onCommit: (deltaPx: number) => void;
}) {
  useEffect(() => {
    if (!svg || disabled) return;
    let delta = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cancel = () => {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      delta = 0;
      setContentOffset(0);
    };
    const onWheel = (event: WheelEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isDragging() ||
        !Number.isFinite(event.deltaX) ||
        event.deltaX === 0 ||
        Math.abs(event.deltaX) <= Math.abs(event.deltaY)
      ) {
        return;
      }

      let distance: number;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        distance = event.deltaX * trackWidth;
      } else {
        const pixels =
          event.deltaX * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_HEIGHT_PX : 1);
        const start = svgPoint(svg, event.clientX, event.clientY);
        const end = svgPoint(svg, event.clientX + pixels, event.clientY);
        if (!start || !end) return;
        distance = end.x - start.x;
      }
      if (!Number.isFinite(distance) || distance === 0) return;

      event.preventDefault();
      delta -= distance;
      setContentOffset(delta);
      clearTimeout(timer);
      timer = setTimeout(() => {
        const committedDelta = delta;
        timer = undefined;
        delta = 0;
        onCommit(committedDelta);
      }, WHEEL_SETTLE_MS);
    };

    // React's delegated wheel listener is passive; cancelling horizontal page
    // scrolling requires a native, non-passive listener on this browser only.
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", cancel);
    return () => {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("pointerdown", cancel);
      clearTimeout(timer);
      if (timer !== undefined) setContentOffset(0);
    };
  }, [disabled, isDragging, onCommit, setContentOffset, svg, trackWidth]);
}
