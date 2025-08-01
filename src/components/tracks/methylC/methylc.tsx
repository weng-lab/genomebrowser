import { useMemo, useState } from "react";
import { ValuedPoint } from "../bigwig/types";
import { MethylCProps } from "./types";
import { m, l } from "../../../utils/svg";
import { useBrowserStore, useTheme } from "../../../store/BrowserContext";
import { useMouseToIndex } from "../../../hooks/useMousePosition";

function MethylC({ id, height, color, data, dimensions, tooltip }: MethylCProps) {
  const { sideWidth, totalWidth, viewWidth } = dimensions;
  const svgRef = useBrowserStore((state) => state.svgRef);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const text = useTheme((state) => state.text);

  // Signal svg paths generation
  const signals = useMemo(() => {
    const h = height / 2;
    return {
      cpgPlus: generateSignal(data[0], h, color),
      chgPlus: generateSignal(data[1], h, "#00FF00"),
      chhPlus: generateSignal(data[2], h, "#0000FF"),
      depthPlus: generateSignal(data[3], h, "#000000"),
      cpgMinus: generateSignal(data[4], h, "#FF0000", true),
      chgMinus: generateSignal(data[5], h, "#00FF00", true),
      chhMinus: generateSignal(data[6], h, "#0000FF", true),
      depthMinus: generateSignal(data[7], h, "#000000", true),
    };
  }, [data, height, color]);

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

function generateSignal(data: ValuedPoint[], height: number, color: string = "#000000", inverted: boolean = false) {
  if (!data || data.length === 0) return null;

  // Find max value for scaling
  const maxValue = getMaxValue(data);
  if (maxValue <= 0) return null;

  // Generate path string for histogram
  const startY = inverted ? 0 : height;
  let pathString = m(0, startY);

  data.forEach((point) => {
    const barHeight = (point.max / maxValue) * height;
    const targetY = inverted ? barHeight : height - barHeight;
    const returnY = inverted ? 0 : height;
    const x = point.x;

    // Draw to bar height, across 1 pixel, then back to baseline
    pathString += l(x, targetY) + l(x + 1, targetY) + l(x + 1, returnY);
  });

  return <path d={pathString} fill={color} />;
}

export default MethylC;
