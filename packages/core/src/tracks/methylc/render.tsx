import { useMemo, useState, type MouseEvent } from "react";
import { useTooltip } from "../../browser/tooltip/useTooltip";
import { useInteraction } from "../../modules/interaction";
import type { TrackRendererProps } from "../../modules/types";
import {
  condenseMethylCChannels,
  generateLineGraph,
  generateSignal2,
  getMethylCRange,
} from "./helpers";
import type {
  MethylCConfig,
  MethylCData,
  MethylCRenderedPoint,
  MethylCShowRows,
  MethylCTooltipItem,
} from "./types";

export function SplitMethylC({
  id,
  config,
  data,
  region,
  width,
  height,
}: TrackRendererProps<MethylCConfig, MethylCData>) {
  const renderedData = useMemo(
    () => condenseMethylCChannels(data, region, width),
    [data, region, width],
  );
  const halfHeight = height / 2;
  const methylRange = useMemo(
    () =>
      getMethylCRange([
        renderedData[0],
        renderedData[1],
        renderedData[2],
        renderedData[4],
        renderedData[5],
        renderedData[6],
      ]),
    [renderedData],
  );
  const effectiveRange = config.range || methylRange;
  const depthRange = useMemo(
    () => getMethylCRange([renderedData[3], renderedData[7]]),
    [renderedData],
  );
  const signals = useMemo(
    () => ({
      cpgPlus: generateSignal2(
        renderedData[0],
        halfHeight,
        config.colors.cpg,
        false,
        effectiveRange,
        renderedData[3],
        config.maskCpgByCoverage,
      ),
      chgPlus: generateSignal2(
        renderedData[1],
        halfHeight,
        config.colors.chg,
        false,
        effectiveRange,
      ),
      chhPlus: generateSignal2(
        renderedData[2],
        halfHeight,
        config.colors.chh,
        false,
        effectiveRange,
      ),
      depthPlus: generateLineGraph(
        renderedData[3],
        halfHeight,
        config.colors.depth,
        false,
        depthRange,
      ),
      cpgMinus: generateSignal2(
        renderedData[4],
        halfHeight,
        config.colors.cpg,
        true,
        effectiveRange,
        renderedData[7],
        config.maskCpgByCoverage,
      ),
      chgMinus: generateSignal2(
        renderedData[5],
        halfHeight,
        config.colors.chg,
        true,
        effectiveRange,
      ),
      chhMinus: generateSignal2(
        renderedData[6],
        halfHeight,
        config.colors.chh,
        true,
        effectiveRange,
      ),
      depthMinus: generateLineGraph(
        renderedData[7],
        halfHeight,
        config.colors.depth,
        true,
        depthRange,
      ),
    }),
    [
      config.colors,
      config.maskCpgByCoverage,
      depthRange,
      effectiveRange,
      halfHeight,
      renderedData,
    ],
  );
  const showRows: MethylCShowRows = useMemo(
    () => ({
      fwdCpg: !!config.urls.plusStrand.cpg.url,
      fwdChg: !!config.urls.plusStrand.chg.url,
      fwdChh: !!config.urls.plusStrand.chh.url,
      fwdDepth: !!config.urls.plusStrand.depth.url,
      revCpg: !!config.urls.minusStrand.cpg.url,
      revChg: !!config.urls.minusStrand.chg.url,
      revChh: !!config.urls.minusStrand.chh.url,
      revDepth: !!config.urls.minusStrand.depth.url,
    }),
    [config.urls],
  );

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      <g id={`${id}-plusStrand`}>
        {signals.chhPlus?.indicator}
        {signals.chgPlus?.indicator}
        {signals.cpgPlus?.indicator}
        {signals.chhPlus?.values}
        {signals.chgPlus?.values}
        {signals.cpgPlus?.values}
        {signals.depthPlus}
      </g>
      <g id={`${id}-minusStrand`} transform={`translate(0, ${halfHeight})`}>
        {signals.chhMinus?.indicator}
        {signals.chgMinus?.indicator}
        {signals.cpgMinus?.indicator}
        {signals.chhMinus?.values}
        {signals.chgMinus?.values}
        {signals.cpgMinus?.values}
        {signals.depthMinus}
      </g>
      <MethylCHoverOverlay
        data={renderedData}
        showRows={showRows}
        width={width}
        height={height}
      />
    </g>
  );
}

function MethylCHoverOverlay({
  data,
  showRows,
  width,
  height,
}: Pick<TrackRendererProps<MethylCConfig, MethylCData>, "width" | "height"> & {
  data: MethylCRenderedPoint[][];
  showRows: MethylCShowRows;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>();
  const interaction = useInteraction<MethylCTooltipItem>();
  const tooltip = useTooltip<MethylCTooltipItem, MethylCConfig>();
  const tooltipValues = useMemo(
    () =>
      hoveredIndex === undefined
        ? []
        : data.map((channel) => channel[hoveredIndex]),
    [data, hoveredIndex],
  );

  const handleMouseMove = (event: MouseEvent<SVGRectElement>) => {
    const index = getMouseIndex(event, width);
    const item = {
      tooltipValues: data.map((channel) => channel[index]),
      showRows,
    };
    setHoveredIndex(index);
    interaction?.onHover?.(item);
    tooltip.show(item, event);
  };

  const handleMouseOut = () => {
    interaction?.onLeave?.({ tooltipValues, showRows });
    setHoveredIndex(undefined);
    tooltip.hide();
  };

  return (
    <>
      {hoveredIndex !== undefined && (
        <line
          stroke="#000000"
          x1={hoveredIndex}
          x2={hoveredIndex}
          y1={0}
          y2={height}
          pointerEvents="none"
        />
      )}
      <rect
        width={width}
        height={height}
        fill="transparent"
        pointerEvents="all"
        onMouseMove={handleMouseMove}
        onMouseOut={handleMouseOut}
      />
    </>
  );
}

function getMouseIndex(event: MouseEvent<SVGRectElement>, width: number) {
  const box = event.currentTarget.getBoundingClientRect();
  const localX =
    box.width <= 0 ? 0 : ((event.clientX - box.left) / box.width) * width;
  return Math.max(
    0,
    Math.min(Math.max(0, Math.floor(width) - 1), Math.round(localX)),
  );
}
