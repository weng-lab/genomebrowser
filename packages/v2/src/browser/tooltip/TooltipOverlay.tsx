import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useInternalTooltipStore } from "./tooltipContextState";

const TOOLTIP_OFFSET = 10;

export function TooltipOverlay({ width, height }: { width: number; height: number }) {
  const content = useInternalTooltipStore((state) => state.content);
  const isVisible = useInternalTooltipStore((state) => state.isVisible);
  const anchor = useInternalTooltipStore((state) => state.anchor);
  const ref = useRef<SVGGElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const calculatePosition = useCallback(() => {
    if (!ref.current) return;
    const box = ref.current.getBBox();
    let nextX = anchor.x + TOOLTIP_OFFSET;
    let nextY = anchor.y + TOOLTIP_OFFSET;

    if (nextX + box.width > width) nextX = anchor.x - box.width - TOOLTIP_OFFSET;
    if (nextY + box.height > height) nextY = anchor.y - box.height - TOOLTIP_OFFSET;
    if (nextX < 0) nextX = Math.max(0, width - box.width);
    if (nextY < 0) nextY = Math.max(0, height - box.height);

    setPosition({ x: nextX, y: nextY });
  }, [anchor.x, anchor.y, height, width]);

  useLayoutEffect(() => {
    if (!isVisible || !content) return;
    calculatePosition();
  }, [calculatePosition, content, isVisible]);

  if (!isVisible || !content) return null;

  return (
    <g
      ref={ref}
      transform={`translate(${position.x},${position.y})`}
      style={{ pointerEvents: "none" }}
    >
      {content}
    </g>
  );
}
