import type { Highlight } from "@weng-lab/genomebrowser";
import {
  useId,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { CytobandsProps } from "./cytobandsTypes";
import {
  formatHighlightCoordinates,
  highlightTooltip as HighlightTooltip,
} from "./highlightTooltip";

const minimumHighlightTargetWidth = 12;
const narrowHighlightWidth = 2;

export type renderedHighlight = {
  highlight: Highlight;
  chromosome: string;
  start: number;
  end: number;
  x: number;
  width: number;
  canvasWidth: number;
  center: number;
  narrow: boolean;
};

type highlightLayerProps = {
  chromosome: string;
  extentStart: number;
  extentEnd: number;
  width: number;
  height: number;
  clipId: string;
  highlights: readonly Highlight[];
  renderHighlightTooltip?: CytobandsProps["renderHighlightTooltip"];
  onHighlightClick?: CytobandsProps["onHighlightClick"];
  onHighlightPointerEnter?: CytobandsProps["onHighlightPointerEnter"];
  onHighlightPointerLeave?: CytobandsProps["onHighlightPointerLeave"];
};

export function highlightLayer(props: highlightLayerProps) {
  const renderedHighlights = getRenderedHighlights(props);
  const renderedHighlightIds = JSON.stringify(
    renderedHighlights.map(({ highlight }) => highlight.id),
  );

  return (
    <HighlightInteractions
      key={`${props.chromosome}:${renderedHighlightIds}`}
      {...props}
      renderedHighlights={renderedHighlights}
    />
  );
}

function HighlightInteractions({
  renderedHighlights,
  height,
  clipId,
  renderHighlightTooltip,
  onHighlightClick,
  onHighlightPointerEnter,
  onHighlightPointerLeave,
}: highlightLayerProps & { renderedHighlights: renderedHighlight[] }) {
  const tooltipId = `cytobands-highlight-tooltip-${useId().replaceAll(":", "")}`;
  const [pointerTooltip, setPointerTooltip] = useState<{
    highlightId: string;
    anchor: { x: number; y: number };
  }>();
  const [focusTooltip, setFocusTooltip] = useState<{
    highlightId: string;
    anchor: { x: number; y: number };
  }>();
  const activeTooltip = pointerTooltip ?? focusTooltip;
  const hoveredHighlight = renderedHighlights.find(
    ({ highlight }) => highlight.id === activeTooltip?.highlightId,
  );

  return (
    <>
      <g clipPath={`url(#${clipId})`} data-testid="highlights">
        {renderedHighlights.map((rendered) => {
          const handleClick = (event: MouseEvent<SVGGElement>) => {
            setPointerTooltip((current) =>
              current?.highlightId === rendered.highlight.id ? undefined : current,
            );
            setFocusTooltip((current) =>
              current?.highlightId === rendered.highlight.id ? undefined : current,
            );
            onHighlightClick?.(rendered.highlight, event);
          };
          const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
            if (event.key === "Escape") {
              setPointerTooltip(undefined);
              setFocusTooltip(undefined);
              return;
            }
            if (
              onHighlightClick === undefined ||
              event.repeat ||
              (event.key !== "Enter" && event.key !== " ")
            ) {
              return;
            }
            event.preventDefault();
            setPointerTooltip((current) =>
              current?.highlightId === rendered.highlight.id ? undefined : current,
            );
            setFocusTooltip((current) =>
              current?.highlightId === rendered.highlight.id ? undefined : current,
            );
            onHighlightClick(rendered.highlight, event);
          };
          const handleFocus = (event: FocusEvent<SVGGElement>) => {
            if (onHighlightClick === undefined) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setFocusTooltip({
              highlightId: rendered.highlight.id,
              anchor: {
                x: finiteOrZero(bounds.left + bounds.width / 2),
                y: finiteOrZero(bounds.bottom),
              },
            });
          };
          const handleBlur = () => {
            setFocusTooltip((current) =>
              current?.highlightId === rendered.highlight.id ? undefined : current,
            );
          };
          const handlePointerEnter = (event: PointerEvent<SVGGElement>) => {
            setPointerTooltip({
              highlightId: rendered.highlight.id,
              anchor: {
                x: finiteOrZero(event.clientX),
                y: finiteOrZero(event.clientY),
              },
            });
            onHighlightPointerEnter?.(rendered.highlight, event);
          };
          const handlePointerLeave = (event: PointerEvent<SVGGElement>) => {
            setPointerTooltip((current) =>
              current?.highlightId === rendered.highlight.id ? undefined : current,
            );
            onHighlightPointerLeave?.(rendered.highlight, event);
          };

          return (
            <HighlightGlyph
              ariaDescribedBy={
                activeTooltip?.highlightId === rendered.highlight.id ? tooltipId : undefined
              }
              clickable={onHighlightClick !== undefined}
              key={rendered.highlight.id}
              onBlur={handleBlur}
              onClick={handleClick}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
              rendered={rendered}
              height={height}
            />
          );
        })}
      </g>
      {hoveredHighlight && activeTooltip ? (
        <HighlightTooltip
          anchor={activeTooltip.anchor}
          id={tooltipId}
          key={hoveredHighlight.highlight.id}
          rendered={hoveredHighlight}
          renderHighlightTooltip={renderHighlightTooltip}
        />
      ) : null}
    </>
  );
}

function HighlightGlyph({
  rendered,
  height,
  clickable,
  ariaDescribedBy,
  onPointerEnter,
  onPointerLeave,
  onBlur,
  onClick,
  onFocus,
  onKeyDown,
}: {
  rendered: renderedHighlight;
  height: number;
  clickable: boolean;
  ariaDescribedBy?: string;
  onPointerEnter: (event: PointerEvent<SVGGElement>) => void;
  onPointerLeave: (event: PointerEvent<SVGGElement>) => void;
  onBlur: (event: FocusEvent<SVGGElement>) => void;
  onClick: (event: MouseEvent<SVGGElement>) => void;
  onFocus: (event: FocusEvent<SVGGElement>) => void;
  onKeyDown: (event: KeyboardEvent<SVGGElement>) => void;
}) {
  const { highlight } = rendered;
  const hitX = Math.max(
    0,
    Math.min(
      rendered.center - minimumHighlightTargetWidth / 2,
      rendered.canvasWidth - minimumHighlightTargetWidth,
    ),
  );

  return (
    <g
      aria-describedby={ariaDescribedBy}
      aria-label={formatHighlightCoordinates(rendered)}
      data-highlight-id={highlight.id}
      data-highlight-shape={rendered.narrow ? "marker" : "interval"}
      onBlur={onBlur}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {rendered.narrow ? (
        <>
          <rect
            data-testid="highlight-hit-target"
            fill="transparent"
            height={height}
            width={minimumHighlightTargetWidth}
            x={hitX}
            y={0}
          />
          <rect
            data-testid="highlight-visual"
            fill={highlight.color}
            fillOpacity={highlight.opacity ?? 0.2}
            height={height}
            pointerEvents="none"
            width={narrowHighlightWidth}
            x={rendered.center - narrowHighlightWidth / 2}
            y={0}
          />
        </>
      ) : (
        <rect
          data-testid="highlight-visual"
          fill={highlight.color}
          fillOpacity={highlight.opacity ?? 0.2}
          height={height}
          width={rendered.width}
          x={rendered.x}
          y={0}
        />
      )}
    </g>
  );
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function getRenderedHighlights({
  chromosome,
  extentStart,
  extentEnd,
  width,
  highlights,
}: Pick<highlightLayerProps, "chromosome" | "extentStart" | "extentEnd" | "width" | "highlights">) {
  const span = extentEnd - extentStart;
  if (span <= 0 || width <= 0) return [];

  return highlights
    .flatMap((highlight): renderedHighlight[] => {
      const highlightChromosome = highlight.region.chromosome ?? chromosome;
      const { start, end } = highlight.region;
      if (
        highlightChromosome !== chromosome ||
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start >= end ||
        end <= extentStart ||
        start >= extentEnd
      ) {
        return [];
      }
      const clippedStart = Math.max(start, extentStart);
      const clippedEnd = Math.min(end, extentEnd);
      const x = ((clippedStart - extentStart) / span) * width;
      const renderedWidth = ((clippedEnd - clippedStart) / span) * width;
      return [
        {
          highlight,
          chromosome: highlightChromosome,
          start: clippedStart,
          end: clippedEnd,
          x,
          width: renderedWidth,
          canvasWidth: width,
          center: x + renderedWidth / 2,
          narrow: renderedWidth < minimumHighlightTargetWidth,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.start - right.start ||
        left.end - right.end ||
        left.highlight.id.localeCompare(right.highlight.id),
    );
}
