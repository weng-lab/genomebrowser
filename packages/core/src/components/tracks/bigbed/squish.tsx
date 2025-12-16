import { useMemo } from "react";
import useInteraction from "../../../hooks/useInteraction";
import { useRowHeight } from "../../../hooks/useRowHeight";
import { useXTransform } from "../../../hooks/useXTransform";
// import { useTheme } from "../../../store/BrowserContext";
import ClipPath from "../../svg/clipPath";
import { getRealRect, renderSquishBigBedData } from "./helpers";
import { SquishBigBedProps, SquishRect } from "./types";

export default function SquishBigBed({
  id,
  data,
  height,
  dimensions,
  color,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: SquishBigBedProps) {
  const { totalWidth, sideWidth } = dimensions;
  // const background = useTheme((state) => state.background);

  const { x, reverseX } = useXTransform(totalWidth);

  const rendered: SquishRect[][] = useMemo(() => {
    const d = data ? [...data] : [];
    return renderSquishBigBedData(d, x);
  }, [data, x]);

  const rowHeight = useRowHeight(rendered.length, id);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip,
  });

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={"transparent"} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {rendered.map((group, i) => (
        <g transform={`translate(0, ${i * rowHeight})`} key={`group_${i}`}>
          {group.map((rect, j) => {
            const realRect = getRealRect(rect, reverseX);
            return (
              <rect
                style={{ cursor: onClick ? "pointer" : "default" }}
                key={`${id}_${j}`}
                height={rowHeight * 0.6}
                width={rect.end - rect.start < 1 ? 1 : rect.end - rect.start}
                x={rect.start}
                y={rowHeight * 0.2}
                fill={rect.color || color}
                onClick={() => handleClick(realRect)}
                onMouseOver={(e) => handleHover(realRect, realRect.name || "", e)}
                onMouseOut={() => handleLeave(realRect)}
              />
            );
          })}
        </g>
      ))}
    </g>
  );
}
