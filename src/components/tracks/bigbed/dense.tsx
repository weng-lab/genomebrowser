import { useMemo } from "react";
import useInteraction from "../../../hooks/useInteraction";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTheme } from "../../../store/themeStore";
import ClipPath from "../../svg/clipPath";
import { getRealRect, renderDenseBigBedData } from "./helpers";
import { DenseBigBedProps, Rect } from "./types";

function DenseBigBed({ id, data, height, color, dimensions, onClick, onHover, onLeave, tooltip }: DenseBigBedProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);

  const rendered: Rect[] = useMemo(() => {
    return renderDenseBigBedData(data || [], x);
  }, [data, x]);

  const { background } = useTheme();

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip,
  });

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {rendered.map((rect, i) => {
        const realRect = getRealRect(rect, reverseX);
        return (
          <rect
            style={{ cursor: onClick ? "pointer" : "default" }}
            key={`${id}_${i}`}
            height={height * 0.6}
            width={rect.end - rect.start}
            x={rect.start}
            y={height * 0.2}
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
