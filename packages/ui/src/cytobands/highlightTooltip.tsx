import type { Highlight } from "@weng-lab/genomebrowser";
import { useTheme } from "@mui/material/styles";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { renderedHighlight } from "./highlightLayer";

const tooltipPaddingX = 10;
const tooltipPaddingY = 8;
const tooltipOffset = 8;
const viewportMargin = 8;
const fallbackTextHeight = 14;
const fallbackCharacterWidth = 7;

type tooltipBounds = { x: number; y: number; width: number; height: number };
type viewportSize = { width: number; height: number };

type highlightTooltipProps = {
  id: string;
  rendered: renderedHighlight;
  anchor: { x: number; y: number };
  renderHighlightTooltip?: (highlight: Highlight) => ReactNode;
};

export function highlightTooltip(props: highlightTooltipProps) {
  return <HighlightTooltip {...props} />;
}

function HighlightTooltip({ id, rendered, anchor, renderHighlightTooltip }: highlightTooltipProps) {
  const theme = useTheme();
  const contentRef = useRef<SVGGElement>(null);
  const [viewport, setViewport] = useState<viewportSize>(getViewportSize);
  const [contentBounds, setContentBounds] = useState<tooltipBounds>({
    x: 0,
    y: 0,
    width: 0,
    height: fallbackTextHeight,
  });
  const label = formatHighlightCoordinates(rendered);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewport = () => setViewport(getViewportSize());
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measure = () => {
      const fallback: tooltipBounds = {
        x: 0,
        y: 0,
        width: (content.textContent ?? "").length * fallbackCharacterWidth,
        height: fallbackTextHeight,
      };
      let next = fallback;
      try {
        const measured = content.getBBox?.();
        if (
          measured &&
          Number.isFinite(measured.x) &&
          Number.isFinite(measured.y) &&
          Number.isFinite(measured.width) &&
          Number.isFinite(measured.height) &&
          (measured.width > 0 || measured.height > 0)
        ) {
          next = measured;
        }
      } catch {
        // Some non-browser SVG implementations expose getBBox but cannot measure.
      }
      setContentBounds((current) => (sameBounds(current, next) ? current : next));
    };

    measure();
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resizeObserver?.observe(content);
    const mutationObserver =
      typeof MutationObserver === "undefined" ? undefined : new MutationObserver(measure);
    mutationObserver?.observe(content, { childList: true, characterData: true, subtree: true });
    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [label, rendered.highlight, renderHighlightTooltip]);

  if (typeof document === "undefined" || !document.body) return null;

  const maximumWidth = Math.max(0, viewport.width - viewportMargin * 2);
  const maximumHeight = Math.max(0, viewport.height - viewportMargin * 2);
  const tooltipWidth = Math.min(contentBounds.width + tooltipPaddingX * 2, maximumWidth);
  const tooltipHeight = Math.min(contentBounds.height + tooltipPaddingY * 2, maximumHeight);
  const contentWidth = Math.max(0, tooltipWidth - tooltipPaddingX * 2);
  const contentHeight = Math.max(0, tooltipHeight - tooltipPaddingY * 2);
  const x = positionAxis(anchor.x, tooltipWidth, viewport.width);
  const y = positionAxis(anchor.y, tooltipHeight, viewport.height);
  const contentClipId = `${id}-content-clip`;
  const palette = theme.vars?.palette ?? theme.palette;
  const caption = theme.typography.caption;
  const typographyStyle = theme.vars
    ? { font: theme.vars.font.caption, letterSpacing: caption.letterSpacing }
    : {
        fontFamily: caption.fontFamily,
        fontSize: caption.fontSize,
        fontWeight: caption.fontWeight,
        letterSpacing: caption.letterSpacing,
        lineHeight: caption.lineHeight,
      };

  return createPortal(
    <svg
      data-testid="highlight-tooltip-portal"
      height={viewport.height}
      pointerEvents="none"
      style={{
        height: "100vh",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        position: "fixed",
        width: "100vw",
        zIndex: theme.zIndex.tooltip,
      }}
      width={viewport.width}
    >
      <defs>
        <clipPath
          clipPathUnits="userSpaceOnUse"
          data-testid="highlight-tooltip-content-clip"
          id={contentClipId}
        >
          <rect
            height={contentHeight}
            width={contentWidth}
            x={tooltipPaddingX}
            y={tooltipPaddingY}
          />
        </clipPath>
      </defs>
      <g id={id} pointerEvents="none" role="tooltip" transform={`translate(${x} ${y})`}>
        <rect
          fill={palette.background.paper}
          height={tooltipHeight}
          rx={theme.shape.borderRadius}
          stroke={palette.divider}
          style={{ filter: "drop-shadow(0 2px 4px rgb(0 0 0 / 0.18))" }}
          width={tooltipWidth}
        />
        <g clipPath={`url(#${contentClipId})`} data-testid="highlight-tooltip-content">
          <g
            fill={palette.text.primary}
            ref={contentRef}
            style={typographyStyle}
            transform={`translate(${tooltipPaddingX - contentBounds.x} ${tooltipPaddingY - contentBounds.y})`}
          >
            {renderHighlightTooltip ? (
              renderHighlightTooltip(rendered.highlight)
            ) : (
              <text dominantBaseline="hanging">{label}</text>
            )}
          </g>
        </g>
      </g>
    </svg>,
    document.body,
  );
}

function getViewportSize(): viewportSize {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return {
    width: Math.max(0, window.innerWidth),
    height: Math.max(0, window.innerHeight),
  };
}

function positionAxis(anchor: number, tooltipSize: number, viewportSize: number) {
  const after = anchor + tooltipOffset;
  const before = anchor - tooltipOffset - tooltipSize;
  const preferred = after + tooltipSize <= viewportSize - viewportMargin ? after : before;
  const maximum = Math.max(viewportMargin, viewportSize - viewportMargin - tooltipSize);
  return Math.max(viewportMargin, Math.min(preferred, maximum));
}

function sameBounds(left: tooltipBounds, right: tooltipBounds) {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

const coordinateFormatter = new Intl.NumberFormat("en-US");

export function formatHighlightCoordinates({ chromosome, highlight }: renderedHighlight) {
  return `${chromosome}: ${coordinateFormatter.format(highlight.region.start)}–${coordinateFormatter.format(highlight.region.end)}`;
}
