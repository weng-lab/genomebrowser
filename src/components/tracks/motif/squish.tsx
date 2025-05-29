import { createElement, useMemo } from "react";
import { useRowHeight } from "../../../hooks/useRowHeight";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTooltipStore } from "../../../store/tooltipStore";
import ClipPath from "../../svg/clipPath";
import DefaultTooltip from "../../tooltip/defaultTooltip";
import { renderSquishMotifData } from "./helpers";
import { MotifRect, SquishMotifProps } from "./types";

export default function SquishMotif({
  id,
  data,
  height,
  dimensions,
  peakColor,
  color,
  onHover,
  onLeave,
  tooltip,
}: SquishMotifProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x } = useXTransform(totalWidth);

  const rendered: MotifRect[][] = useMemo(() => renderSquishMotifData(data.occurrenceRect, x), [data, x]);
  const renderedPeaks: MotifRect[][] = useMemo(() => renderSquishMotifData(data.peaks, x), [data, x]);

  const rowHeight = useRowHeight(rendered.length, id);

  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);
  const handleMouseOver = (rect: MotifRect, e: React.MouseEvent<SVGGElement>) => {
    if (onHover) {
      onHover(rect);
    }
    let content = <DefaultTooltip value={rect.start.toString()} />;
    if (tooltip) {
      content = createElement(tooltip, rect);
    }
    showTooltip(content, e.clientX, e.clientY);
  };

  const handleMouseOut = (rect: MotifRect) => {
    if (onLeave) {
      onLeave(rect);
    }
    hideTooltip();
  };

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill="white" />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {renderedPeaks.map((group, i) => (
        <g transform={`translate(0, ${i * rowHeight})`} key={`group_peak_${i}`}>
          {group.map((rect, j) => (
            <rect
              key={`${id}_peak_${i}_${j}`}
              height={rowHeight * 0.6}
              width={rect.end - rect.start < 1 ? 1 : rect.end - rect.start}
              x={rect.start}
              y={rowHeight * 0.2}
              fill={peakColor || "#3287a8"}
              style={{ cursor: "pointer" }}
            />
          ))}
        </g>
      ))}
      {rendered.map((group, i) => (
        <g transform={`translate(0, ${i * rowHeight})`} key={`group_${i}`}>
          {group.map((rect, j) => (
            <rect
              key={`${id}_${i}_${j}`}
              height={rowHeight * 0.6}
              width={rect.end - rect.start < 1 ? 1 : rect.end - rect.start}
              x={rect.start}
              y={rowHeight * 0.2}
              fill={color || "#000088"}
              style={{ cursor: "pointer" }}
              onMouseOut={() => handleMouseOut(rect)}
              onMouseOver={(e: React.MouseEvent<SVGRectElement>) => {
                e.persist();
                if (rect.pwm) handleMouseOver(rect, e);
              }}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
