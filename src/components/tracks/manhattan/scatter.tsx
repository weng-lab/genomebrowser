import { useMemo } from "react";
import { useXTransform } from "../../../hooks/useXTransform";
import { useTheme } from "../../../store/themeStore";
import useInteraction from "../../../hooks/useInteraction";
import { ManhattanPoint, ManhattanProps } from "./types";
import { linearScale } from "../../../utils/coordinates";
import { useBrowserStore } from "../../../store/BrowserContext";

export default function Scatter({
  id,
  data,
  cutoffValue,
  cutoffLabel,
  associatedSnps,
  height,
  color,
  dimensions,
  onClick,
  onHover,
  onLeave,
  tooltip,
}: ManhattanProps) {
  const { totalWidth, sideWidth } = dimensions;
  const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);
  const getDomain = useBrowserStore((state) => state.getExpandedDomain);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const { x } = useXTransform(totalWidth);
  const radius = 4; // Constant radius for visibility

  const { handleHover } = useInteraction({
    onClick,
    onHover,
    onLeave,
    tooltip: tooltip || Tooltip,
  });

  const yRange = useMemo(() => {
    const min = data
      .map((point: ManhattanPoint) => point.value)
      .reduce((a: number, b: number) => Math.min(a, b), Infinity);
    const max = data
      .map((point: ManhattanPoint) => point.value)
      .reduce((a: number, b: number) => Math.max(a, b), -Infinity);
    return {
      min,
      max,
    };
  }, [data]);

  const transformedData = useMemo(() => {
    const domain = getDomain();
    const withinDomain = data.filter((snp: ManhattanPoint) => {
      return snp.chr === domain.chromosome && snp.start <= domain.end && snp.end >= domain.start;
    });

    return (
      withinDomain.map((snp: ManhattanPoint) => {
        const pixelStart = x(snp.start);
        const pixelEnd = x(snp.end);
        const xPosition = (pixelStart + pixelEnd) / 2;
        const yPosition = linearScale(snp.value, yRange, { min: height, max: 0 });
        const isAssociatedSnp = associatedSnps?.includes(snp.snpId);
        const opacity = isAssociatedSnp ? 1.0 : snp.value >= (cutoffValue || 7.3) ? 1.0 : 0.1;
        return {
          ...snp,
          pixelStart,
          pixelEnd,
          xPosition,
          yPosition,
          isAssociatedSnp,
          opacity,
        };
      }) || []
    );
  }, [data, x, getDomain, yRange, associatedSnps]);

  const cutoffY = useMemo(() => linearScale(cutoffValue || 7.3, yRange, { min: height, max: 0 }), [yRange]);

  return (
    <g id={id} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />

      {cutoffY > 0 && (
        <>
          <text x={sideWidth + marginWidth} y={cutoffY} textAnchor="middle" fill={text}>
            P {">="} {cutoffLabel || cutoffValue}
          </text>

          <line
            x1={0}
            y1={cutoffY}
            x2={totalWidth}
            y2={cutoffY}
            stroke={text}
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.6}
          />
        </>
      )}

      {transformedData.map(
        (
          snp: {
            pixelStart: number;
            pixelEnd: number;
            snpId: string;
            xPosition: number;
            yPosition: number;
            opacity: number;
          } & ManhattanPoint,
          index: number
        ) => {
          return (
            <circle
              key={`${snp.snpId}-${index}`}
              cx={snp.xPosition}
              cy={snp.yPosition}
              r={radius}
              fill={color}
              opacity={snp.opacity}
              // onClick={() => handleClick(snp)}
              onMouseOver={(e) => {
                handleHover(snp, "", e);
              }}
              // onMouseOut={() => {
              //   handleLeave(snp);
              //   setHoveredSnp(null);
              // }}
              style={{ cursor: onClick ? "pointer" : "default" }}
            />
          );
        }
      )}
    </g>
  );
}

function Tooltip(snp: ManhattanPoint) {
  const text = useTheme((state) => state.text);
  const background = useTheme((state) => state.background);

  return (
    <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
      <rect width={180} height={50} y={0} fill={background} />
      <text fontSize={14} x={8} y={16}>
        {snp.snpId}
      </text>
      <text fontSize={14} x={8} y={32}>
        {snp.chr}:{snp.start}-{snp.end}
      </text>
      <text fontSize={14} x={8} y={48}>
        r² = {Number(snp.value).toFixed(3)}
      </text>
    </g>
  );
}
