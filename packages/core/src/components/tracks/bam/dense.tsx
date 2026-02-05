import { useMemo } from "react";
import useInteraction from "../../../hooks/useInteraction";
import { useXTransform } from "../../../hooks/useXTransform";
import ClipPath from "../../svg/clipPath";
import { getRealBamRect, getStrandColor } from "./helpers";
import { renderDenseBamData } from "./render";
import { BamRect, DenseBamProps } from "./types";

function DenseBam({
  id,
  data,
  height,
  color = "#000000",
  dimensions,
  verticalPadding = 0.2,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: DenseBamProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);

  const rendered: BamRect[] = useMemo(() => {
    if (!data) return [];
    return renderDenseBamData([...data], x);
  }, [data, x]);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip,
  });

  const rectHeight = height * (1 - 2 * verticalPadding);
  const rectY = height * verticalPadding;

  return (
    <g width={totalWidth} height={height} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill="transparent" />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      <g clipPath={`url(#${id})`}>
        {rendered.map((rect, i) => {
          const realRect = getRealBamRect(rect, reverseX);
          const rectWidth = rect.end - rect.start;
          return (
            <rect
              key={`${id}_${i}`}
              height={rectHeight}
              width={rectWidth < 1 ? 1 : rectWidth}
              x={rect.start}
              y={rectY}
              fill={getStrandColor(rect, color)}
              style={{ cursor: onClick ? "pointer" : "default" }}
              onClick={() => handleClick(realRect)}
              onMouseOver={(e) => handleHover(realRect, realRect.name || "", e)}
              onMouseOut={() => handleLeave(realRect)}
            />
          );
        })}
      </g>
    </g>
  );
}

export default DenseBam;
