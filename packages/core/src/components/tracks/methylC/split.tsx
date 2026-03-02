import { useMemo } from "react";
import { useBrowserStore, useTheme } from "../../../store/BrowserContext";
import { useMouseToIndex } from "../../../hooks/useMousePosition";
import { MethylCProps } from "./types";
import { generateLineGraph, generateSignal2 } from "./helpers";
import useInteraction from "../../../hooks/useInteraction";
import DefaultMethylCTooltip from "./defaultMethylCTooltip";

function SplitMethylC({ id, height, colors, data, dimensions, range, tooltip }: MethylCProps) {
  const { sideWidth, totalWidth, viewWidth } = dimensions;
  const svgRef = useBrowserStore((state) => state.svgRef);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const text = useTheme((state) => state.text);

  const viewRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const channel of data) {
      if (!channel || channel.length === 0) continue;
      const view = channel.slice(sideWidth, sideWidth + viewWidth);
      for (const point of view) {
        if (point.min < min) min = point.min;
        if (point.max > max) max = point.max;
      }
    }
    return min === Infinity ? { min: 0, max: 1 } : { min, max };
  }, [data, sideWidth, viewWidth]);

  const effectiveRange = range || viewRange;

  const signals = useMemo(() => {
    const h = height / 2;
    return {
      cpgPlus: generateSignal2(data[0], h, colors.cpg, false, effectiveRange),
      chgPlus: generateSignal2(data[1], h, colors.chg, false, effectiveRange),
      chhPlus: generateSignal2(data[2], h, colors.chh, false, effectiveRange),
      depthPlus: generateLineGraph(data[3], h, colors.depth, false, effectiveRange),
      cpgMinus: generateSignal2(data[4], h, colors.cpg, true, effectiveRange),
      chgMinus: generateSignal2(data[5], h, colors.chg, true, effectiveRange),
      chhMinus: generateSignal2(data[6], h, colors.chh, true, effectiveRange),
      depthMinus: generateLineGraph(data[7], h, colors.depth, true, effectiveRange),
    };
  }, [data, height, colors, effectiveRange]);

  const { mouseState, updateMouseState, clearMouseState } = useMouseToIndex(svgRef, totalWidth, marginWidth, sideWidth);

  // Line position
  const linePosition = useMemo(() => {
    return mouseState.pos?.x ? mouseState.pos.x - marginWidth + sideWidth : 0;
  }, [mouseState.pos?.x, marginWidth, sideWidth]);

  const tooltipValues = useMemo(() => {
    const index = mouseState.index;
    if (index === null) return [];
    return data.map((dataset) => dataset[index]);
  }, [data, mouseState.index]);

  const { handleHover, handleLeave } = useInteraction({
    onClick: undefined,
    onHover: undefined,
    onLeave: undefined,
    tooltip: tooltip || DefaultMethylCTooltip,
  });

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={"transparent"} />
      <g id={`${id}-plusStrand`}>
        {signals.cpgPlus?.indicator}
        {signals.chgPlus?.indicator}
        {signals.chhPlus?.indicator}

        {signals.cpgPlus?.values}
        {signals.chgPlus?.values}
        {signals.chhPlus?.values}

        {signals.depthPlus}
      </g>
      <g id={`${id}-minusStrand`} transform={`translate(0, ${height / 2})`}>
        {signals.cpgMinus?.indicator}
        {signals.chgMinus?.indicator}
        {signals.chhMinus?.indicator}

        {signals.cpgMinus?.values}
        {signals.chgMinus?.values}
        {signals.chhMinus?.values}

        {signals.depthMinus}
      </g>
      {!delta && mouseState.pos?.x && (
        <>
          <line stroke={text} x1={linePosition} x2={linePosition} y1={0} y2={height} />
        </>
      )}
      {/* Interactive overlay */}
      <rect
        width={viewWidth}
        height={height}
        transform={`translate(${sideWidth}, 0)`}
        fill={"transparent"}
        onMouseMove={(e) => {
          updateMouseState(e);
          handleHover({ tooltipValues }, "", e);
        }}
        onMouseOut={() => {
          clearMouseState();
          handleLeave({ tooltipValues });
        }}
      />
    </g>
  );
}

export default SplitMethylC;
