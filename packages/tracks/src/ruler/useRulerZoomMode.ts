import { useEffect, useEffectEvent, useRef } from "react";
import { useBrowserStore } from "@weng-lab/genomebrowser";

export function useRulerZoomMode(onMove: (event: PointerEvent, bounds: DOMRect | null) => void) {
  const reportMove = useEffectEvent(onMove);
  const areaRef = useRef<SVGRectElement>(null);
  const inside = useRef(false);
  const switchedFromPan = useRef(false);
  const mode = useBrowserStore((state) => state.selectionMode);
  const setMode = useBrowserStore((state) => state.setSelectionMode);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!areaRef.current) return;
      const bounds = areaRef.current.getBoundingClientRect();
      const hovered =
        bounds.width > 0 &&
        bounds.height > 0 &&
        event.clientX >= bounds.left &&
        event.clientX < bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY < bounds.bottom;
      reportMove(event, hovered ? bounds : null);
      if (event.buttons !== 0 || hovered === inside.current) return;
      inside.current = hovered;
      if (hovered) {
        switchedFromPan.current = mode === "pan";
        if (switchedFromPan.current) setMode("zoom");
      } else {
        if (switchedFromPan.current && mode === "zoom") setMode("pan");
        switchedFromPan.current = false;
      }
    };
    const finish = () => {
      if (!switchedFromPan.current || mode !== "zoom") return;
      switchedFromPan.current = false;
      // Let core finish its pointer-up selection before changing the mode.
      // This also survives the ruler unmounting for the resulting data load.
      queueMicrotask(() => setMode("pan"));
    };
    // Zoom's selection overlay covers tracks, so use bounds instead of hit-target events.
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", finish);
    };
  }, [mode, setMode]);

  return areaRef;
}
