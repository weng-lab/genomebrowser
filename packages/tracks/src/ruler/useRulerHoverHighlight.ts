import { useCallback, useEffect, useId, useRef } from "react";
import { useBrowserStore, type GenomicRegion } from "@weng-lab/genomebrowser";

export function useRulerHoverHighlight(
  visibleRegion: GenomicRegion,
  width: number,
  enabled: boolean,
  color: string,
) {
  const owner = useId();
  const highlightId = `ruler-hover-${owner}`;
  const activePosition = useRef<number | null>(null);
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const removeHighlight = useBrowserStore((state) => state.removeHighlight);
  const selectionMode = useBrowserStore((state) => state.selectionMode);
  const { chromosome, start, end } = visibleRegion;

  const clear = useCallback(() => {
    if (activePosition.current === null) return;
    activePosition.current = null;
    removeHighlight(highlightId);
  }, [highlightId, removeHighlight]);

  // A hover belongs to this view and mounted ruler, never to the next region.
  useEffect(() => clear, [clear, chromosome, start, end, width, enabled, selectionMode, color]);
  useEffect(() => {
    window.addEventListener("blur", clear);
    return () => window.removeEventListener("blur", clear);
  }, [clear]);

  const hover = (position: number, buttons: number) => {
    if (!enabled || buttons !== 0) {
      clear();
      return;
    }
    if (activePosition.current === position) return;
    clear();
    activePosition.current = position;
    addHighlight({
      id: highlightId,
      region: { chromosome, start: position, end: position + 1 },
      color,
      opacity: 0.2,
      type: "filled",
    });
  };

  return { hover, clear };
}
