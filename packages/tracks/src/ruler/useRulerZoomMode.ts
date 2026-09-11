import { useEffect, useRef, type PointerEvent } from "react";
import { useBrowserStore } from "@weng-lab/genomebrowser";

export function useRulerZoomMode() {
  const switchedFromPan = useRef(false);
  const mode = useBrowserStore((state) => state.selectionMode);
  const setMode = useBrowserStore((state) => state.setSelectionMode);

  const enter = (event: PointerEvent<SVGRectElement>) => {
    if (event.buttons !== 0 || mode !== "pan") return;
    switchedFromPan.current = true;
    setMode("zoom");
  };
  const leave = (event: PointerEvent<SVGRectElement>) => {
    if (event.buttons !== 0) return;
    if (switchedFromPan.current && mode === "zoom") setMode("pan");
    switchedFromPan.current = false;
  };

  // The deferred pan reset must survive ruler unmount after selection.
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    const finish = () => {
      if (!switchedFromPan.current || mode !== "zoom") return;
      switchedFromPan.current = false;
      // Let core finish the selection before restoring Pan, including when
      // the selection causes the ruler to unmount while loading new data.
      setTimeout(() => setMode("pan"), 0);
    };
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
    return () => {
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", finish);
    };
  }, [mode, setMode]);

  return { onPointerEnter: enter, onPointerMove: enter, onPointerLeave: leave };
}
