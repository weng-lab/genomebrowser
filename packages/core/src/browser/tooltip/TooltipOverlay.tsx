import { useLayoutEffect, useRef, useState, type ErrorInfo } from "react";
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
  const [box, setBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!isVisible || !content || !ref.current) return;
    const { x, y, width: boxWidth, height: boxHeight } = ref.current.getBBox();
    setBox((previous) =>
      previous.x === x &&
      previous.y === y &&
      previous.width === boxWidth &&
      previous.height === boxHeight
        ? previous
        : { x, y, width: boxWidth, height: boxHeight },
    );
  }, [content, isVisible]);

  // Prefer the top-left corner. Flip each axis when the opposite side fits,
  // or offers more room if the tooltip cannot fit on either side.
  const roomRight = width - anchor.x - TOOLTIP_OFFSET;
  const roomLeft = anchor.x - TOOLTIP_OFFSET;
  const roomBelow = height - anchor.y - TOOLTIP_OFFSET;
  const roomAbove = anchor.y - TOOLTIP_OFFSET;
  const useRightCorner = box.width > roomRight && roomLeft > roomRight;
  const useBottomCorner = box.height > roomBelow && roomAbove > roomBelow;
  const cornerX = box.x + (useRightCorner ? box.width : 0);
  const cornerY = box.y + (useBottomCorner ? box.height : 0);
  const x = anchor.x + (useRightCorner ? -TOOLTIP_OFFSET : TOOLTIP_OFFSET) - cornerX;
  const y = anchor.y + (useBottomCorner ? -TOOLTIP_OFFSET : TOOLTIP_OFFSET) - cornerY;

  if (!isVisible || !content) return null;

  return (
    <g ref={ref} transform={`translate(${x},${y})`} style={{ pointerEvents: "none" }}>
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
