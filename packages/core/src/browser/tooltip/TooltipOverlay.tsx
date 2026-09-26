import { use, useEffect, useLayoutEffect, useRef, useState, type ErrorInfo } from "react";
import { createPortal } from "react-dom";
import { BrowserSvgContext } from "../svg/browserSvgState";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import { useInternalTooltipStore } from "./tooltipContextState";

const TOOLTIP_OFFSET = 10;
const tooltipRenderErrorPrefix = "[genomebrowser] Tooltip render error";

export function TooltipOverlay({ width, height }: { width: number; height: number }) {
  const svg = use(BrowserSvgContext);
  const hide = useInternalTooltipStore((state) => state.hide);
  const content = useInternalTooltipStore((state) => state.content);
  const isVisible = useInternalTooltipStore((state) => state.isVisible);
  const anchor = useInternalTooltipStore((state) => state.anchor);
  const owner = useInternalTooltipStore((state) => state.owner);
  const ref = useRef<SVGGElement>(null);
  const [box, setBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    screenX: 0,
    screenY: 0,
    sourceScale: 0,
    viewportWidth: 0,
    viewportHeight: 0,
  });

  const { x, y, escaped, portal } = getTooltipPlacement(box, anchor, width, height);

  // Read content bounds and the hosting SVG transform together. Placement is
  // derived from this DOM measurement rather than synchronized through another effect.
  useLayoutEffect(() => {
    if (!isVisible || !content || !ref.current) return;
    const next = measureTooltip(ref.current, svg, anchor);
    setBox((previous) =>
      (Object.keys(next) as (keyof typeof next)[]).every((key) => previous[key] === next[key])
        ? previous
        : next,
    );
  }, [content, isVisible, escaped, svg, anchor, width, height]);

  useEffect(() => {
    if (!escaped || !owner) return;
    const view = svg?.ownerDocument.defaultView;
    if (!view) return;
    const dismiss = () => hide(owner);
    view.addEventListener("scroll", dismiss, true);
    view.addEventListener("resize", dismiss);
    return () => {
      view.removeEventListener("scroll", dismiss, true);
      view.removeEventListener("resize", dismiss);
    };
  }, [escaped, owner, svg, hide]);

  if (!isVisible || !content) return null;

  const tooltip = (
    <g
      ref={ref}
      transform={portal ? undefined : `translate(${x},${y})`}
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
  if (portal && svg) {
    return createPortal(
      <svg
        data-genomebrowser-tooltip-overlay=""
        width={box.width * portal.scale}
        height={box.height * portal.scale}
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        style={{
          position: "fixed",
          left: portal.left,
          top: portal.top,
          overflow: "visible",
          pointerEvents: "none",
          zIndex: 1500,
        }}
      >
        {tooltip}
      </svg>,
      svg.ownerDocument.body,
    );
  }
  return tooltip;
}

type TooltipBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  screenX: number;
  screenY: number;
  sourceScale: number;
  viewportWidth: number;
  viewportHeight: number;
};
type TooltipAnchor = { x: number; y: number };

function getTooltipPlacement(
  box: TooltipBox,
  anchor: TooltipAnchor,
  width: number,
  height: number,
) {
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

  const overflows =
    x + box.x < 0 ||
    y + box.y < 0 ||
    x + box.x + box.width > width ||
    y + box.y + box.height > height;
  const escaped = overflows && box.sourceScale > 0 && box.width > 0 && box.height > 0;
  const scale = escaped
    ? Math.min(
        box.sourceScale,
        Math.max(1, box.viewportWidth - 8) / box.width,
        Math.max(1, box.viewportHeight - 8) / box.height,
      )
    : 1;
  const gap = TOOLTIP_OFFSET * box.sourceScale;
  const tooltipWidth = box.width * scale;
  const tooltipHeight = box.height * scale;
  const screenLeft =
    box.screenX + gap + tooltipWidth <= box.viewportWidth
      ? box.screenX + gap
      : box.screenX - gap - tooltipWidth;
  const screenTop =
    box.screenY + gap + tooltipHeight <= box.viewportHeight
      ? box.screenY + gap
      : box.screenY - gap - tooltipHeight;
  const portal = escaped
    ? {
        left: Math.max(4, Math.min(screenLeft, box.viewportWidth - tooltipWidth - 4)),
        top: Math.max(4, Math.min(screenTop, box.viewportHeight - tooltipHeight - 4)),
        scale,
      }
    : null;

  return { x, y, escaped, portal };
}

function measureTooltip(
  element: SVGGElement,
  svg: SVGSVGElement | null | undefined,
  anchor: TooltipAnchor,
): TooltipBox {
  const { x, y, width: boxWidth, height: boxHeight } = element.getBBox();
  const matrix = svg?.getScreenCTM?.();
  const view = svg?.ownerDocument.defaultView;
  return {
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    screenX: matrix ? anchor.x * matrix.a + anchor.y * matrix.c + matrix.e : 0,
    screenY: matrix ? anchor.x * matrix.b + anchor.y * matrix.d + matrix.f : 0,
    sourceScale: matrix && view ? Math.hypot(matrix.a, matrix.b) : 0,
    viewportWidth: view?.innerWidth ?? 0,
    viewportHeight: view?.innerHeight ?? 0,
  };
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
