import { useCallback, useLayoutEffect, useRef, useState, type ErrorInfo } from "react";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import { useInternalTooltipStore } from "./tooltipContextState";

const TOOLTIP_OFFSET = 10;
const tooltipRenderErrorPrefix = "[genomebrowser] Tooltip render error";

export function TooltipOverlay({ width, height }: { width: number; height: number }) {
  const content = useInternalTooltipStore((state) => state.content);
  const isVisible = useInternalTooltipStore((state) => state.isVisible);
  const anchor = useInternalTooltipStore((state) => state.anchor);
  const owner = useInternalTooltipStore((state) => state.owner);
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
      <RenderErrorBoundary
        key={owner}
        fallback={<TooltipErrorFallback />}
        onError={reportTooltipRenderError}
      >
        {content}
      </RenderErrorBoundary>
    </g>
  );
}

function TooltipErrorFallback() {
  return (
    <g>
      <rect width={144} height={30} rx={2} fill="#ffffff" stroke="#cccccc" />
      <text
        x={72}
        y={15}
        fill="#000000"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12px"
      >
        Tooltip unavailable
      </text>
    </g>
  );
}

function reportTooltipRenderError(error: unknown, info: ErrorInfo) {
  console.error(tooltipRenderErrorPrefix, {
    extensionPoint: "tooltip content",
    error,
    ...(info.componentStack ? { componentStack: info.componentStack } : {}),
  });
}
