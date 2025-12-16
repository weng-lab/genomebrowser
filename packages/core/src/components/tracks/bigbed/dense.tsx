import { useMemo } from "react";
import useInteraction from "../../../hooks/useInteraction";
import { useXTransform } from "../../../hooks/useXTransform";
// import { useTheme } from "../../../store/BrowserContext";
import ClipPath from "../../svg/clipPath";
import { getRealRect, renderDenseBigBedData } from "./helpers";
import { DenseBigBedProps, Rect } from "./types";

function DenseBigBed({
  id,
  data,
  height,
  color,
  dimensions,
  verticalPadding = 0.2,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: DenseBigBedProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);

  const rendered: Rect[] = useMemo(() => {
    return renderDenseBigBedData(data || [], x);
  }, [data, x]);

  // const background = useTheme((state) => state.background);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip,
  });

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      {/*<rect width={totalWidth} height={height} fill={background} />*/}
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {rendered.map((rect, i) => {
        const realRect = getRealRect(rect, reverseX);
        const rectHeight = height * (1 - 2 * verticalPadding);
        const yOffset = height * verticalPadding;
        return (
          <rect
            style={{ cursor: onClick ? "pointer" : "default" }}
            key={`${id}_${i}`}
            height={rectHeight}
            width={rect.end - rect.start}
            x={rect.start}
            y={yOffset}
            fill={rect.color || color}
            onClick={() => handleClick(realRect)}
            onMouseOver={(e) => handleHover(realRect, rect.name || "", e)}
            onMouseOut={() => handleLeave(realRect)}
          />
        );
      })}
    </g>
  );
}
export default DenseBigBed;
