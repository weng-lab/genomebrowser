import { use, useEffect, useLayoutEffect, useRef, useState, type ErrorInfo } from "react";
import { createPortal } from "react-dom";
import { BrowserSvgContext } from "../svg/browserSvgState";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import { useTooltipStore } from "../state/browserContextState";

const TOOLTIP_OFFSET = 10;
const VIEWPORT_MARGIN = 4;
const tooltipRenderErrorPrefix = "[genomebrowser] Tooltip render error";

export function TooltipOverlay({ width, height }: { width: number; height: number }) {
  const svg = use(BrowserSvgContext);
  const hide = useTooltipStore((state) => state.hide);
  const content = useTooltipStore((state) => state.content);
  const isVisible = useTooltipStore((state) => state.isVisible);
  const anchor = useTooltipStore((state) => state.anchor);
  const owner = useTooltipStore((state) => state.owner);
  const ref = useRef<SVGGElement>(null);
  const [box, setBox] = useState<TooltipBox>(emptyBox);

  // Read content bounds and the hosting SVG transform together. Placement is
  // derived from this DOM measurement rather than synchronized through another effect.
  useLayoutEffect(() => {
    if (!isVisible || !content || !ref.current) return;
    const next = measureTooltip(ref.current, svg);
    setBox((previous) =>
      (Object.keys(next) as (keyof typeof next)[]).every((key) => previous[key] === next[key])
        ? previous
        : next,
    );
  }, [content, isVisible, svg, anchor, width, height]);

  // The fixed overlay does not follow the browser, so moving the page dismisses it.
  useEffect(() => {
    if (!owner) return;
    const view = svg?.ownerDocument.defaultView;
    if (!view) return;
    const dismiss = () => hide(owner);
    view.addEventListener("scroll", dismiss, true);
    view.addEventListener("resize", dismiss);
    return () => {
      view.removeEventListener("scroll", dismiss, true);
      view.removeEventListener("resize", dismiss);
    };
  }, [owner, svg, hide]);

  if (!isVisible || !content || !svg) return null;

  // Always render in the same portal so content keeps its state and styling
  // whether it fits inside the browser or extends past it.
  const { left, top } = getTooltipPlacement(box, anchor, width, height);
  return createPortal(
    <svg
      data-genomebrowser-tooltip-overlay=""
      width={box.width * box.scale}
      height={box.height * box.scale}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      style={{
        position: "fixed",
        left,
        top,
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 1500,
      }}
    >
      <g ref={ref} style={{ pointerEvents: "none" }}>
        <RenderErrorBoundary
          key={owner}
          fallback={<TooltipErrorFallback />}
          onError={reportTooltipRenderError}
        >
          {content}
        </RenderErrorBoundary>
      </g>
    </svg>,
    svg.ownerDocument.body,
  );
}

type TooltipBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Screen scale and origin of the browser SVG. */
  scale: number;
  originX: number;
  originY: number;
  viewportWidth: number;
  viewportHeight: number;
};
type TooltipAnchor = { x: number; y: number };

const emptyBox: TooltipBox = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  scale: 1,
  originX: 0,
  originY: 0,
  viewportWidth: 0,
  viewportHeight: 0,
};

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
  const x = anchor.x + (useRightCorner ? -TOOLTIP_OFFSET - box.width : TOOLTIP_OFFSET);
  const y = anchor.y + (useBottomCorner ? -TOOLTIP_OFFSET - box.height : TOOLTIP_OFFSET);
  const fits = x >= 0 && y >= 0 && x + box.width <= width && y + box.height <= height;
  if (fits) return { left: box.originX + x * box.scale, top: box.originY + y * box.scale };

  // Outside the browser, place against the window instead. Content larger than
  // the window keeps its size and starts at the top-left margin.
  const gap = TOOLTIP_OFFSET * box.scale;
  const screenX = box.originX + anchor.x * box.scale;
  const screenY = box.originY + anchor.y * box.scale;
  return {
    left: placeOnAxis(screenX, gap, box.width * box.scale, box.viewportWidth),
    top: placeOnAxis(screenY, gap, box.height * box.scale, box.viewportHeight),
  };
}

function placeOnAxis(pointer: number, gap: number, size: number, viewport: number) {
  const start = pointer + gap + size <= viewport ? pointer + gap : pointer - gap - size;
  return Math.max(VIEWPORT_MARGIN, Math.min(start, viewport - size - VIEWPORT_MARGIN));
}

function measureTooltip(element: SVGGElement, svg: SVGSVGElement | null | undefined): TooltipBox {
  const { x, y, width, height } = element.getBBox();
  const matrix = svg?.getScreenCTM?.();
  const view = svg?.ownerDocument.defaultView;
  return {
    x,
    y,
    width,
    height,
    scale: matrix ? Math.hypot(matrix.a, matrix.b) : 1,
    originX: matrix?.e ?? 0,
    originY: matrix?.f ?? 0,
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
