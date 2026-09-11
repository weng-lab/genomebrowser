import { useEffect, useEffectEvent, useRef } from "react";
import { useBrowserStore } from "@weng-lab/genomebrowser";

export function useRulerZoomMode(onMove: (event: PointerEvent, bounds: DOMRect | null) => void) {
  const reportMove = useEffectEvent(onMove);
  const areaRef = useRef<SVGRectElement>(null);
  const inside = useRef(false);
  const switchedFromPan = useRef(false);
  const mode = useBrowserStore((state) => state.selectionMode);
  const setMode = useBrowserStore((state) => state.setSelectionMode);

  // The deferred pan reset must survive ruler unmount after selection.
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!areaRef.current) return;
      const bounds = areaRef.current.getBoundingClientRect();
      const svg = areaRef.current.ownerSVGElement;
      const target = event.target;
      const hovered =
        target instanceof SVGElement &&
        (target === svg || target.ownerSVGElement === svg) &&
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
      // Wait for the entire event dispatch: microtasks can run between native
      // listeners and cancel core's selection before its pointer-up handler.
      // Keep this reset even if the resulting data load unmounts the ruler.
      setTimeout(() => setMode("pan"), 0);
    };
    // Zoom's selection overlay covers tracks, so accept targets in the same SVG
    // and use bounds to locate the ruler. Ignore dialogs and other browser instances.
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
