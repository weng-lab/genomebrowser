import { useMemo } from "react";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTheme } from "../../../store/themeStore";
import { TrackDimensions } from "../types";
import useInteraction from "../../../hooks/useInteraction";
import { darken, isDark, lighten } from "../../../utils/color";
import { getWidth } from "./helpers";

type GenericLDProps = {
  id: string;
  data: any[];
  height: number;
  color: string;
  dimensions: TrackDimensions;
  lead: string;
  associatedSnps: string[];
  onClick?: (data: any) => void;
  onHover?: (data: any) => void;
  onLeave?: (data: any) => void;
  tooltip?: React.FC<any>;
};

export default function GenericLD({
  id,
  data,
  lead,
  associatedSnps,
  height,
  color,
  dimensions,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: GenericLDProps) {
  const { totalWidth, sideWidth } = dimensions;
  // const background = useTheme((state) => state.background);
  const { x } = useXTransform(totalWidth);

  // must add up to height
  const snpHeight = height / 3;
  const padding = 2;

  const processedData = useMemo(() => {
    return data.map((snp) => ({
      ...snp,
      pixelStart: x(snp.start),
      pixelEnd: x(snp.end),
    }));
  }, [data, x]);

  const { handleClick, handleHover, handleLeave } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip: tooltip || Tooltip,
  });

  return (
    <g transform={`translate(-${sideWidth}, 0)`}>
      {/*<rect width={totalWidth} height={height} fill={background} />*/}
      {associatedSnps?.map((snp, i) => {
        const targetSnp = processedData.find((s) => s.snpId === snp);
        const sourceSnp = processedData.find((s) => s.snpId === lead);
        if (!targetSnp || !sourceSnp) return null;
        const targetX = targetSnp.pixelStart + (targetSnp.pixelEnd - targetSnp.pixelStart) / 2;
        const sourceX = sourceSnp.pixelStart + (sourceSnp.pixelEnd - sourceSnp.pixelStart) / 2;
        const targetY = height - snpHeight;
        const sourceY = height - snpHeight;
        const controlX = targetX + (sourceX - targetX) * 0.5;
        const controlY = Math.min(targetY, sourceY) - height * 1;
        const path = `M ${targetX} ${targetY} Q ${controlX} ${controlY} ${sourceX} ${sourceY}`;

        return (
          <path
            key={`reference-arc-${i}`}
            d={path}
            stroke={isDark(color) ? lighten(color, 0.5) : darken(color, 0.2)}
            strokeWidth={getWidth(snp)}
            fill="none"
            opacity={0.5}
          />
        );
      })}
      <g transform={`translate(0, ${height - snpHeight})`}>
        {processedData.map((snp, i) => {
          return (
            <rect
              key={`${id}_${i}`}
              height={snpHeight}
              width={snp.pixelEnd - snp.pixelStart + padding}
              x={snp.pixelStart - padding / 2}
              y={0}
              fill={color}
              onClick={() => handleClick(snp)}
              onMouseOver={(e) => handleHover(snp, "", e)}
              onMouseOut={() => handleLeave(snp)}
            />
          );
        })}
      </g>
    </g>
  );
}

function Tooltip(snp: any) {
  const text = useTheme((state) => state.text);
  const background = useTheme((state) => state.background);
  return (
    <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
      <rect width={180} height={50} y={0} fill={background} />
      <text fontSize={14} x={5} y={16}>
        {snp.snpId}
      </text>
      <text fontSize={14} x={5} y={32}>
        {snp.chr}:{snp.start}-{snp.end}
      </text>
      <text fontSize={14} x={5} y={48}>
        {Number(snp.value).toFixed(3)}
      </text>
    </g>
  );
}
