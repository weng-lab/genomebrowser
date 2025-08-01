import { useMemo } from "react";
import { ValuedPoint, YRange } from "../bigwig/types";
import { MethylCProps } from "./types";
import { m, l } from "../../../utils/svg";
import { useBrowserStore, useTheme } from "../../../store/BrowserContext";
import { useMouseToIndex } from "../../../hooks/useMousePosition";

function MethylC({ id, height, colors, data, dimensions, tooltip, range }: MethylCProps) {
  const { sideWidth, totalWidth, viewWidth } = dimensions;
  const svgRef = useBrowserStore((state) => state.svgRef);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const text = useTheme((state) => state.text);

  // Signal svg paths generation
  const signals = useMemo(() => {
    const h = height / 2;
    return {
      cpgPlus: generateSignal(data[0], h, colors.cpg, false, range),
      chgPlus: generateSignal(data[1], h, colors.chg, false, range),
      chhPlus: generateSignal(data[2], h, colors.chh, false, range),
      depthPlus: generateLineGraph(data[3], h, colors.depth, false, range),
      cpgMinus: generateSignal(data[4], h, colors.cpg, true, range),
      chgMinus: generateSignal(data[5], h, colors.chg, true, range),
      chhMinus: generateSignal(data[6], h, colors.chh, true, range),
      depthMinus: generateLineGraph(data[7], h, colors.depth, true, range),
    };
  }, [data, height, colors, range]);

  const { mouseState, handleMouseMove, handleMouseOut } = useMouseToIndex(svgRef, totalWidth, marginWidth, sideWidth);

  // Line position
  const linePosition = useMemo(() => {
    return mouseState.pos?.x ? mouseState.pos.x - marginWidth + sideWidth : 0;
  }, [mouseState.pos?.x, marginWidth, sideWidth]);

  const allValues = useMemo(() => {
    const index = mouseState.index;
    if (index === null) return [];
    return data.map((dataset) => dataset[index]);
  }, [data, mouseState.index, sideWidth]);

  const textElements = useMemo(() => {
    return allValues.map((v, index) => (
      <text
        key={index}
        x={mouseState.pos?.x ? mouseState.pos.x - marginWidth + sideWidth + 5 : 0}
        y={20 * index}
        fill={text}
      >
        {v.max}
      </text>
    ));
  }, [allValues, mouseState.pos?.x, marginWidth, sideWidth, text]);

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={"transparent"} />
      <g id={`${id}-plusStrand`}>
        {signals.cpgPlus}
        {signals.chgPlus}
        {signals.chhPlus}
        {signals.depthPlus}
      </g>
      <g id={`${id}-minusStrand`} transform={`translate(0, ${height / 2})`}>
        {signals.cpgMinus}
        {signals.chgMinus}
        {signals.chhMinus}
        {signals.depthMinus}
      </g>
      {!delta && mouseState.pos?.x && (
        <>
          <line stroke={text} x1={linePosition} x2={linePosition} y1={0} y2={height} />
          {textElements}
        </>
      )}
      {/* Interactive overlay */}
      <rect
        width={viewWidth}
        height={height}
        transform={`translate(${sideWidth}, 0)`}
        fill={"transparent"}
        onMouseMove={handleMouseMove}
        onMouseOut={handleMouseOut}
      />
    </g>
  );
}

// Helper function to calculate max value for scaling
function getMaxValue(data: ValuedPoint[]): number {
  return Math.max(...data.map((point) => point.max));
}

function generateSignal(
  data: ValuedPoint[],
  height: number,
  color: string,
  inverted: boolean = false,
  customRange?: YRange
) {
  if (!data || data.length === 0) return null;

  // Determine range for scaling
  const range = customRange || { min: 0, max: getMaxValue(data) };
  const rangeSize = range.max - range.min;
  if (rangeSize <= 0) return null;

  // Generate path string for histogram
  const startY = inverted ? 0 : height;
  let pathString = m(0, startY);

  data.forEach((point) => {
    // Clamp value to custom range
    const clampedValue = Math.max(range.min, Math.min(range.max, point.max));
    const normalizedValue = (clampedValue - range.min) / rangeSize;
    const barHeight = normalizedValue * height;

    const targetY = inverted ? barHeight : height - barHeight;
    const returnY = inverted ? 0 : height;
    const x = point.x;

    // Draw to bar height, across 1 pixel, then back to baseline
    pathString += l(x, targetY) + l(x + 1, targetY) + l(x + 1, returnY);
  });

  return <path d={pathString} fill={color} />;
}

function generateLineGraph(
  data: ValuedPoint[],
  height: number,
  color: string,
  inverted: boolean = false,
  customRange?: YRange
) {
  if (!data || data.length === 0) return null;

  // Determine range for scaling
  const range = customRange || { min: 0, max: getMaxValue(data) };
  const rangeSize = range.max - range.min;
  if (rangeSize <= 0) return null;

  // Generate path string for line graph
  let pathString = "";

  data.forEach((point, index) => {
    // Clamp value to custom range
    const clampedValue = Math.max(range.min, Math.min(range.max, point.max));
    const normalizedValue = (clampedValue - range.min) / rangeSize;
    const lineHeight = normalizedValue * height;
    
    const y = inverted ? lineHeight : height - lineHeight;
    const x = point.x;

    // Start with move command for first point, line command for subsequent points
    if (index === 0) {
      pathString += m(x, y);
    } else {
      pathString += l(x, y);
    }
  });

  return <path d={pathString} stroke={color} fill="none" strokeWidth="1" />;
}

export default MethylC;
