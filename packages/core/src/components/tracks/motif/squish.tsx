import { useMemo } from "react";
import { useRowHeight } from "../../../hooks/useRowHeight";
import { useXTransform } from "../../../hooks/useXTransform";
import ClipPath from "../../svg/clipPath";
import { renderSquishMotifData } from "./helpers";
import { MotifRect, SquishMotifProps } from "./types";
import DefaultMotifTooltip from "./defaultMotifTooltip";
import useInteraction from "../../../hooks/useInteraction";

export default function SquishMotif({
  id,
  data,
  height,
  dimensions,
  peakColor,
  color,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: SquishMotifProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x } = useXTransform(totalWidth);

  const rendered: MotifRect[][] = useMemo(() => renderSquishMotifData(data.occurrenceRect, x), [data, x]);
  const renderedPeaks: MotifRect[][] = useMemo(() => renderSquishMotifData(data.peaks, x), [data, x]);

  const rowHeight = useRowHeight(rendered.length, id);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip: tooltip || DefaultMotifTooltip,
  });

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={"transparent"} />
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
              onClick={() => handleClick(rect)}
              onMouseOver={(e: React.MouseEvent<SVGRectElement>) => {
                e.persist();
                if (rect.pwm) handleHover(rect, "", e);
              }}
              onMouseOut={() => handleLeave(rect)}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
