import { createElement, useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../../store/browserStore";
import { useTrackStore } from "../../../store/trackStore";
import { lighten } from "../../../utils/color";
import { svgPoint } from "../../../utils/svg";
import { getRange, renderBigWig, renderDense, ytransform } from "./helpers";
import {
  BigWigConfig,
  BigWigData,
  BigZoomData,
  DataType,
  dataType,
  DenseBigWigProps,
  RenderedBigWigData,
  ValuedPoint,
} from "./types";
import { useTheme } from "../../../store/themeStore";
import { useTooltipStore } from "../../../store/tooltipStore";
import DefaultTooltip from "../../tooltip/defaultTooltip";

export default function DenseBigWig({ id, data, color, height, dimensions, tooltip }: DenseBigWigProps) {
  const { sideWidth, viewWidth, totalWidth } = dimensions;
  const sidePortion = (totalWidth / viewWidth - 1) / 2;
  const multiplier = useBrowserStore((state) => state.multiplier);
  const editTrack = useTrackStore((state) => state.editTrack);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const [x, setX] = useState<number>();

  const range = useMemo(() => {
    const length = data?.length ?? 0;
    const middleSectionSize = length / multiplier;
    const startIndex = Math.floor(sidePortion * middleSectionSize);
    const endIndex = Math.floor((sidePortion + 1) * middleSectionSize);
    const middleSlice = data?.slice(startIndex, endIndex);
    return getRange(middleSlice ?? []);
  }, [data, multiplier, sidePortion]);

  useEffect(() => {
    editTrack<BigWigConfig>(id, { range: range });
  }, [range, id, editTrack]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      data && data.length && dataType(data) === DataType.ValuedPoint
        ? renderDense(data as ValuedPoint[])
        : renderBigWig(data as BigWigData[] | BigZoomData[], 100),
    [data]
  );

  const stopColors = useMemo(() => {
    const y = ytransform(range, 1);
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);
    return renderPoints.map((point) => {
      const yValue = y(point.max);
      return lighten(color, yValue / 2);
    });
  }, [color, rendered, range]);

  const { text } = useTheme();

  const showTooltip = useTooltipStore((state) => state.showTooltip);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);
  const svgRef = useBrowserStore((state) => state.svgRef);
  const mouseOver = (e: React.MouseEvent<SVGElement>) => {
    if (!svgRef || !svgRef.current) return;
    const pos = svgPoint(svgRef.current, e.clientX, e.clientY);
    setX(pos[0]);
    const len = data.length;
    const adjustedX = Math.round(pos[0] - marginWidth);
    const start = len / multiplier;
    const end = start + len / multiplier;
    const x = (adjustedX / viewWidth) * (end - start) + start;
    const point = data[Math.round(x)] as BigWigData;
    let content = <DefaultTooltip value={point.value.toFixed(2)} />;
    if (tooltip) {
      content = createElement(tooltip, point);
    }
    showTooltip(content, e.clientX, e.clientY);
  };

  const mouseOut = () => {
    setX(undefined);
    hideTooltip();
  };

  return (
    <g width={totalWidth} height={height} transform={`translate(-${sideWidth}, 0)`}>
      <defs>
        <linearGradient id={id}>
          {stopColors.map((color, i) => (
            <stop key={`${id}_pt_${i}`} offset={`${i}%`} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <rect width={totalWidth} x={0} y={height / 3.0} height={height / 3.0} fill={`url('#${id}')`} />
      {!delta && x && (
        <line
          stroke={text}
          x1={x ? x - marginWidth + sideWidth : 0}
          x2={x ? x - marginWidth + sideWidth : 0}
          y1={0}
          y2={height}
        />
      )}
      {/* Interactive area */}
      <rect
        width={viewWidth}
        height={height}
        transform={`translate(${sideWidth}, 0)`}
        fill={"transparent"}
        onMouseMove={(e: React.MouseEvent<SVGElement>) => {
          mouseOver(e);
        }}
        onMouseOut={mouseOut}
      />
    </g>
  );
}
