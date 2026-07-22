import type { Highlight } from "@weng-lab/genomebrowser-v2";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { renderedHighlight } from "./highlightLayer";

const tooltipPadding = 6;
const fallbackTextHeight = 14;
const fallbackCharacterWidth = 7;

type tooltipBounds = { x: number; y: number; width: number; height: number };

type highlightTooltipProps = {
  rendered: renderedHighlight;
  width: number;
  height: number;
  renderHighlightTooltip?: (highlight: Highlight) => ReactNode;
};

export function highlightTooltip(props: highlightTooltipProps) {
  return <HighlightTooltip {...props} />;
}

function HighlightTooltip({
  rendered,
  width,
  height,
  renderHighlightTooltip,
}: highlightTooltipProps) {
  const contentRef = useRef<SVGGElement>(null);
  const [contentBounds, setContentBounds] = useState<tooltipBounds>({
    x: 0,
    y: 0,
    width: 0,
    height: fallbackTextHeight,
  });
  const label = formatHighlightCoordinates(rendered);

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

  const tooltipWidth = Math.min(width, contentBounds.width + tooltipPadding * 2);
  const tooltipHeight = contentBounds.height + tooltipPadding * 2;
  const x = Math.max(0, Math.min(rendered.center - tooltipWidth / 2, width - tooltipWidth));

  return (
    <g pointerEvents="none" role="tooltip" transform={`translate(${x} ${height})`}>
      <rect fill="#f5f5f5" height={tooltipHeight} rx={3} stroke="#777777" width={tooltipWidth} />
      <g
        fill="#111111"
        fontFamily="sans-serif"
        fontSize={12}
        ref={contentRef}
        transform={`translate(${tooltipPadding - contentBounds.x} ${tooltipPadding - contentBounds.y})`}
      >
        {renderHighlightTooltip ? (
          renderHighlightTooltip(rendered.highlight)
        ) : (
          <text dominantBaseline="hanging">{label}</text>
        )}
      </g>
    </g>
  );
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
