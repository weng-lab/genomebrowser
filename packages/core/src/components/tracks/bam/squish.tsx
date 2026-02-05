import { useMemo } from "react";
import useInteraction from "../../../hooks/useInteraction";
import { useRowHeight } from "../../../hooks/useRowHeight";
import { useXTransform } from "../../../hooks/useXTransform";
import ClipPath from "../../svg/clipPath";
import { CIGAR_COLORS, getRealBamRect, getStrandColor } from "./helpers";
import { renderSquishBamData } from "./render";
import { BamRect, SquishBamProps } from "./types";

function SquishBam({
  id,
  data,
  height,
  color = "#000000",
  dimensions,
  verticalPadding = 0.2,
  rowHeight: defaultRowHeight = 12,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: SquishBamProps) {
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);

  const rendered: BamRect[][] = useMemo(() => {
    if (!data) return [];
    return renderSquishBamData([...data], x);
  }, [data, x]);

  const rowHeight = useRowHeight(rendered.length, id, defaultRowHeight);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip,
  });

  const rectHeight = rowHeight * (1 - 2 * verticalPadding);
  const rectY = rowHeight * verticalPadding;

  return (
    <g width={totalWidth} height={height} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill="transparent" />
      <defs>
        <ClipPath id={id} width={totalWidth} height={rendered.length * rowHeight} />
      </defs>
      <g clipPath={`url(#${id})`}>
        {rendered.map((group, rowIndex) => (
          <g transform={`translate(0, ${rowIndex * rowHeight})`} key={`row_${rowIndex}`}>
            {group.map((rect, rectIndex) => {
              const realRect = getRealBamRect(rect, reverseX);

              return (
                <g key={`${id}_${rowIndex}_${rectIndex}`}>
                  {rect.cigarOps.map((cg, cgIndex) => {
                    const opWidth = cg.opEnd - cg.opStart;
                    const minWidth = opWidth < 1 ? 1 : opWidth;

                    if (cg.op === "S") {
                      return (
                        <rect
                          key={`cg_${cgIndex}`}
                          height={rectHeight}
                          width={minWidth}
                          x={cg.opStart}
                          y={rectY}
                          style={{
                            fill: "none",
                            strokeDasharray: "2,2",
                            stroke: "black",
                            strokeWidth: 0.5,
                          }}
                        />
                      );
                    }

                    if (cg.op === "I") {
                      return (
                        <rect
                          key={`cg_${cgIndex}`}
                          height={rectHeight}
                          width={minWidth}
                          x={cg.opStart}
                          y={rectY}
                          fill={CIGAR_COLORS.insertion}
                          style={{ cursor: onClick ? "pointer" : "default" }}
                          onClick={() => handleClick(realRect)}
                          onMouseOver={(e) => handleHover(realRect, "Insertion", e)}
                          onMouseOut={() => handleLeave(realRect)}
                        >
                          <title>Insertion</title>
                        </rect>
                      );
                    }

                    if (cg.op === "D" || cg.op === "N") {
                      const lineY = rectY + rectHeight / 2;
                      return (
                        <line
                          key={`cg_${cgIndex}`}
                          x1={cg.opStart}
                          y1={lineY}
                          x2={cg.opEnd}
                          y2={lineY}
                          stroke={CIGAR_COLORS.deletion}
                        />
                      );
                    }

                    return (
                      <rect
                        key={`cg_${cgIndex}`}
                        height={rectHeight}
                        width={minWidth}
                        x={cg.opStart}
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
              );
            })}
          </g>
        ))}
      </g>
    </g>
  );
}

export default SquishBam;
