import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { useLayoutEffect, useRef } from "react";

export function useBrowserContainer<Element extends HTMLElement>(
  browserStore: BrowserStoreInstance,
) {
  const containerRef = useRef<Element>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    function updateTrackWidth(containerWidth: number) {
      const { marginWidth, setTrackWidth } = browserStore.getState();
      setTrackWidth(Math.max(1, containerWidth - marginWidth));
    }

    updateTrackWidth(element.clientWidth);

    const observer = new ResizeObserver(([entry]) => {
      updateTrackWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [browserStore]);

  return containerRef;
}
