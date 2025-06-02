import { createElement, useMemo } from "react";
import { useXTransform } from "../../../hooks/useXTransform";
import { DenseMotifProps, MotifRect } from "./types";
import { renderDenseMotifData } from "./helpers";
import ClipPath from "../../svg/clipPath";
import { useTooltipStore } from "../../../store/tooltipStore";
import DefaultMotifTooltip from "./defaultMotifTooltip";

export default function DenseMotif({
  id,
  data,
  height,
  dimensions,
  peakColor,
  color,
  onHover,
  onLeave,
  tooltip,
}: DenseMotifProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x } = useXTransform(totalWidth);
  const rendered: MotifRect[] = useMemo(() => renderDenseMotifData(data.occurrenceRect, x), [data]);
  const renderedPeaks: MotifRect[] = useMemo(() => renderDenseMotifData(data.peaks, x), [data]);

  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);
  const handleMouseOver = (rect: MotifRect, e: React.MouseEvent<SVGRectElement>) => {
    if (onHover) {
      onHover(rect);
    }
    let content = <DefaultMotifTooltip rect={rect} />;
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
    <g id={id} height={height} width={totalWidth} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill="white" />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {renderedPeaks.map((rect, i) => (
        <rect
          key={`${id}_peak_${i}`}
          height={height * 0.6}
          width={rect.end - rect.start}
          x={rect.start}
          y={height * 0.2}
          fill={peakColor || "#3287a8"}
          style={{ cursor: "pointer" }}
        />
      ))}
      {rendered.map((rect, i) => (
        <rect
          key={`${id}_${i}`}
          height={height * 0.6}
          width={rect.end - rect.start}
          x={rect.start}
          y={height * 0.2}
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
  );
}
