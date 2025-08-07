import { useMemo } from "react";
import { useBrowserStore, useTheme } from "../../../store/BrowserContext";
import { useMouseToIndex } from "../../../hooks/useMousePosition";
import { MethylCProps } from "./types";
import { generateSignal, generateLineGraph } from "./helpers";
import useInteraction from "../../../hooks/useInteraction";
import DefaultMethylCTooltip from "./defaultMethylCTooltip";

function SplitMethylC({ id, height, colors, data, dimensions, range, tooltip }: MethylCProps) {
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
