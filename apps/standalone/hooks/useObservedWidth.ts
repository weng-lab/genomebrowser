import { useLayoutEffect, useRef, useState } from "react";

export function useObservedWidth<Element extends HTMLElement>() {
  const elementRef = useRef<Element>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const updateWidth = (nextWidth: number) => setWidth(Math.max(0, nextWidth));
    updateWidth(element.clientWidth);

    const observer = new ResizeObserver(([entry]) => {
      updateWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [elementRef, width] as const;
}
