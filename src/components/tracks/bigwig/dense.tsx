import { useEffect, useMemo } from "react";
import { useBrowserStore, useTrackStore } from "../../../store/BrowserContext";
import { lighten } from "../../../utils/color";
import { getRange, renderDense, ytransform } from "./helpers";
import { BigWigConfig, DenseBigWigProps, RenderedBigWigData, ValuedPoint } from "./types";
import { useTheme } from "../../../store/themeStore";
import useInteraction from "../../../hooks/useInteraction";
import { useMouseToIndex } from "../../../hooks/useMousePosition";

export default function DenseBigWig({ id, data, color, height, dimensions, tooltip }: DenseBigWigProps) {
  const { sideWidth, viewWidth, totalWidth } = dimensions;
  const sidePortion = (totalWidth / viewWidth - 1) / 2;
  const multiplier = useBrowserStore((state) => state.multiplier);
  const editTrack = useTrackStore((state) => state.editTrack);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const svgRef = useBrowserStore((state) => state.svgRef);

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

  const hasNegatives = useMemo(() => {
    return data.some((point) => (point as ValuedPoint).min < 0);
  }, [data]);

  const rendered: RenderedBigWigData = useMemo(
    () => renderDense(data as ValuedPoint[]),
    // data && data.length && dataType(data) === DataType.ValuedPoint ?
    // : renderBigWig(data as BigWigData[] | BigZoomData[], 100),
    [data]
  );

  const stopColors = useMemo(() => {
    const y = ytransform(range, 1);
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);
    return renderPoints.map((point) => {
      const yValue = y(point.max);
      return lighten(color, yValue / 1.25);
    });
  }, [color, rendered, range]);

  const text = useTheme((state) => state.text);

  const { mouseState, updateMouseState, clearMouseState } = useMouseToIndex(svgRef, totalWidth, marginWidth, sideWidth);

  const linePosition = useMemo(() => {
    return mouseState.pos?.x ? mouseState.pos.x - marginWidth + sideWidth : 0;
  }, [mouseState.pos?.x, marginWidth, sideWidth]);

  const { handleHover, handleLeave } = useInteraction<ValuedPoint>({
    onClick: undefined,
    onHover: undefined,
    onLeave: undefined,
    tooltip,
  });

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
      {!delta && linePosition && <line stroke={text} x1={linePosition} x2={linePosition} y1={0} y2={height} />}

      {/* Interactive area */}
      <rect
        width={viewWidth}
        height={height}
        transform={`translate(${sideWidth}, 0)`}
        fill={"transparent"}
        onMouseMove={(e) => {
          updateMouseState(e);
          if (mouseState.index === null) return;
          const point = data[mouseState.index] as ValuedPoint;
          const max = point.max;
          const min = point.min;
          if (!max || !min) return;
          if (max === min || !hasNegatives) {
            handleHover(point, String(max.toFixed(2)), e);
            return;
          }
          handleHover(point, "max: " + String(max.toFixed(2)) + " min: " + String(min.toFixed(2)), e);
        }}
        onMouseOut={() => {
          clearMouseState();
          handleLeave({ x: 0, min: 0, max: 0 });
        }}
      />
    </g>
  );
}
