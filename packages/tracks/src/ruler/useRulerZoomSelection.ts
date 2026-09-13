import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useBrowserStore } from "@weng-lab/genomebrowser";

export function useRulerZoomSelection() {
  const mode = useBrowserStore((state) => state.selectionMode);
  const region = useBrowserStore((state) => state.region);
  const setRegion = useBrowserStore((state) => state.setRegion);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const cancel = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
    setSelection(null);
  }, []);

  useEffect(() => cancel, [cancel, mode, region]);

  const onPointerDown = (event: PointerEvent<SVGRectElement>) => {
    if (mode !== "pan" || event.button !== 0 || event.isPrimary === false) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
    const pointerId = event.pointerId;
    const fraction = (clientX: number) =>
      Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    const start = fraction(event.clientX);
    const startX = event.clientX;
    setSelection({ start, end: start });
    const move = (event: globalThis.PointerEvent) => {
      if (event.pointerId === pointerId) setSelection({ start, end: fraction(event.clientX) });
    };
    const up = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const end = fraction(event.clientX);
      cancel();
      if (Math.abs(event.clientX - startX) < 4) return;
      const span = region.end - region.start;
      const selectedStart = Math.min(
        region.end - 1,
        Math.floor(region.start + Math.min(start, end) * span),
      );
      setRegion({
        chromosome: region.chromosome,
        start: selectedStart,
        end: Math.min(
          region.end,
          Math.max(selectedStart + 1, Math.ceil(region.start + Math.max(start, end) * span)),
        ),
      });
    };
    const pointerCancel = (event: globalThis.PointerEvent) => {
      if (event.pointerId === pointerId) cancel();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", pointerCancel);
    document.addEventListener("keydown", keyDown);
    window.addEventListener("blur", cancel);
    cleanup.current = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", pointerCancel);
      document.removeEventListener("keydown", keyDown);
      window.removeEventListener("blur", cancel);
    };
  };

  return { onPointerDown, selection };
}
