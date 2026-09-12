import { useLayoutEffect, useRef, useState } from "react";

/** Observe the content box without feeding the SVG's intrinsic width back into layout. */
export function useContainerWidth(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!enabled || !element) return;

    let active = true;
    const updateWidth = (nextWidth: number) => {
      // Hidden tabs retain their last usable geometry until they become visible again.
      if (active && Number.isFinite(nextWidth) && nextWidth > 0) setWidth(nextWidth);
    };
    updateWidth(element.clientWidth);

    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [enabled]);

  return { containerRef, width };
}
