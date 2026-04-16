import { useMemo } from "react";
import useInteraction from "../../../hooks/useInteraction";
import { useXTransform } from "../../../hooks/useXTransform";
// import { useTheme } from "../../../store/BrowserContext";
import ClipPath from "../../svg/clipPath";
import { getRealRect, renderDenseBigBedData } from "./helpers";
import { DenseBigBedProps, RenderableBigBedRow, RenderedRect } from "./types";

function DenseBigBed<Row extends RenderableBigBedRow = RenderableBigBedRow>({
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
}: DenseBigBedProps<Row>) {
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);

  const rendered: RenderedRect<Row>[] = useMemo(() => {
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
      <rect width={totalWidth} height={height} fill={"transparent"} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {rendered.map((rect, i) => {
        const realRect = getRealRect({ ...rect.row, start: rect.start, end: rect.end }, reverseX);
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
