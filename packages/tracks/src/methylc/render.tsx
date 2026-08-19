import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useMemo, useState, type MouseEvent } from "react";
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
  const rendered = useMemo(
    () => condenseMethylCChannels(data, region, width),
    [data, region, width],
  );
  const half = height / 2;
  const methylRange = useMemo(
    () =>
      getMethylCRange([
        rendered[0],
        rendered[1],
        rendered[2],
        rendered[4],
        rendered[5],
        rendered[6],
      ]),
    [rendered],
  );
  const effectiveRange = config.range || methylRange;
  const depthRange = useMemo(() => getMethylCRange([rendered[3], rendered[7]]), [rendered]);
  const signals = useMemo(
    () => ({
      cpgPlus: generateSignal2(
        rendered[0],
        half,
        config.colors.cpg,
        false,
        effectiveRange,
        rendered[3],
        config.maskCpgByCoverage,
      ),
      chgPlus: generateSignal2(rendered[1], half, config.colors.chg, false, effectiveRange),
      chhPlus: generateSignal2(rendered[2], half, config.colors.chh, false, effectiveRange),
      depthPlus: generateLineGraph(rendered[3], half, config.colors.depth, false, depthRange),
      cpgMinus: generateSignal2(
        rendered[4],
        half,
        config.colors.cpg,
        true,
        effectiveRange,
        rendered[7],
        config.maskCpgByCoverage,
      ),
      chgMinus: generateSignal2(rendered[5], half, config.colors.chg, true, effectiveRange),
      chhMinus: generateSignal2(rendered[6], half, config.colors.chh, true, effectiveRange),
      depthMinus: generateLineGraph(rendered[7], half, config.colors.depth, true, depthRange),
    }),
    [config.colors, config.maskCpgByCoverage, depthRange, effectiveRange, half, rendered],
  );
  const showRows = useMemo<MethylCShowRows>(
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
      <g id={`${id}-minusStrand`} transform={`translate(0, ${half})`}>
        {signals.chhMinus?.indicator}
        {signals.chgMinus?.indicator}
        {signals.cpgMinus?.indicator}
        {signals.chhMinus?.values}
        {signals.chgMinus?.values}
        {signals.cpgMinus?.values}
        {signals.depthMinus}
      </g>
      <MethylCHoverOverlay data={rendered} showRows={showRows} width={width} height={height} />
    </g>
  );
}
function MethylCHoverOverlay({
  data,
  showRows,
  width,
  height,
}: {
  data: MethylCRenderedPoint[][];
  showRows: MethylCShowRows;
  width: number;
  height: number;
}) {
  const [index, setIndex] = useState<number>();
  const interaction = useInteraction<MethylCTooltipItem>();
  const tooltip = useTooltip<MethylCTooltipItem, MethylCConfig>();
  const values = useMemo(
    () => (index === undefined ? [] : data.map((channel) => channel[index])),
    [data, index],
  );
  const move = (event: MouseEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const localX = box.width <= 0 ? 0 : ((event.clientX - box.left) / box.width) * width;
    const next = Math.max(0, Math.min(Math.max(0, Math.floor(width) - 1), Math.round(localX)));
    const item = { tooltipValues: data.map((channel) => channel[next]), showRows };
    setIndex(next);
    interaction?.onHover?.(item);
    tooltip.show(item, event);
  };
  const out = () => {
    interaction?.onLeave?.({ tooltipValues: values, showRows });
    setIndex(undefined);
    tooltip.hide();
  };
  return (
    <>
      {index !== undefined && (
        <line stroke="#000000" x1={index} x2={index} y1={0} y2={height} pointerEvents="none" />
      )}
      <rect
        width={width}
        height={height}
        fill="transparent"
        pointerEvents="all"
        onMouseMove={move}
        onMouseOut={out}
      />
    </>
  );
}
