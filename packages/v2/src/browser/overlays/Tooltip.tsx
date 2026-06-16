import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useTooltipStore } from "../stores/BrowserContext";

const TOOLTIP_OFFSET = 6;

export function Tooltip({ width, height }: { width: number; height: number }) {
  const content = useTooltipStore((state) => state.content);
  const show = useTooltipStore((state) => state.show);
  const x = useTooltipStore((state) => state.x);
  const y = useTooltipStore((state) => state.y);
  const ref = useRef<SVGGElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const calculatePosition = useCallback(() => {
    if (!ref.current) return;
    const box = ref.current.getBBox();
    let nextX = x + TOOLTIP_OFFSET;
    let nextY = y + TOOLTIP_OFFSET;

    if (nextX + box.width > width) nextX = x - box.width - TOOLTIP_OFFSET;
    if (nextY + box.height > height) nextY = y - box.height - TOOLTIP_OFFSET;
    if (nextX < 0) nextX = Math.max(0, width - box.width);
    if (nextY < 0) nextY = Math.max(0, height - box.height);

    setPosition({ x: nextX, y: nextY });
  }, [height, width, x, y]);

  useLayoutEffect(() => {
    if (!show) return;
    calculatePosition();
  }, [calculatePosition, content, show]);

  if (!show || !content) return null;

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
