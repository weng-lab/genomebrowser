import { useEffect, useMemo, useState } from "react";
import { useBrowserStore, useTrackStore } from "../../../store/BrowserContext";
import ClipPath from "../../svg/clipPath";

import {
  BigWigData,
  BigZoomData,
  ValuedPoint,
  dataType,
  DataType,
  Paths,
  RenderedBigWigData,
  FullBigWigProps,
} from "./types";

import { createCopy, getRange, renderBigWig, ytransform } from "./helpers";
import { svgPoint, l } from "../../../utils/svg";
import { BigWigConfig } from "./types";
import { useTheme } from "../../../store/themeStore";
import useInteraction from "../../../hooks/useInteraction";

export default function FullBigWig({
  data,
  range,
  customRange,
  id,
  height,
  color,
  dimensions,
  tooltip,
}: FullBigWigProps) {
  const { sideWidth, viewWidth, totalWidth } = dimensions;
  const multiplier = useBrowserStore((state) => state.multiplier);
  const sidePortion = (multiplier - 1) / 2;
  const editTrack = useTrackStore((state) => state.editTrack);
  const delta = useBrowserStore((state) => state.delta);
  const marginWidth = useBrowserStore((state) => state.marginWidth);

  const [x, setX] = useState<number>();

  const realRange = useMemo(() => {
    const length = data?.length ?? 0;
    const middleSectionSize = length / multiplier;
    const startIndex = Math.floor(sidePortion * middleSectionSize);
    const endIndex = Math.floor((sidePortion + 1) * middleSectionSize);
    const middleSlice = data?.slice(startIndex, endIndex);
    const newRange = getRange(middleSlice ?? []);
    return newRange;
  }, [data, multiplier, sidePortion]);

  useEffect(() => {
    editTrack<BigWigConfig>(id, { range: realRange });
  }, [realRange]);

  const dataCopy = useMemo(() => createCopy(data ?? []), [data]);

  const rendered: RenderedBigWigData = useMemo(
    () =>
      dataCopy && dataCopy.length && dataType(dataCopy) === DataType.ValuedPoint
        ? { renderPoints: dataCopy as ValuedPoint[], range: range || getRange(dataCopy) }
        : renderBigWig(dataCopy as BigWigData[] | BigZoomData[], totalWidth),
    [dataCopy, totalWidth, range]
  );

  const paths: Paths = useMemo(() => {
    const renderPoints = rendered.renderPoints.filter((v) => v.min < Infinity && v.max > -Infinity);

    const y = ytransform(customRange || realRange, height);
    const clampY = (value: number) => Math.max(0, Math.min(height, y(value)));

    const yValues = renderPoints.map((point) => {
      const clampedY = clampY(point.min);
      return {
        value: clampedY,
        isClamped: point.min > (customRange || realRange).max,
      };
    });

    // Generate the main path
    const path =
      renderPoints.reduce((path, cv, ci) => {
        const prevY = ci > 0 ? yValues[ci - 1].value : clampY(0);
        return path + (cv.x ? l(cv.x, prevY) : "") + l(cv.x, yValues[ci].value);
      }, "M 0 " + clampY(0.0) + " ") + l(totalWidth, clampY(0.0));

    // Generate clamped markers
    const clampedMarkers = renderPoints
      .map((point, i) => {
        if (yValues[i].isClamped) {
          return `M ${point.x} 0 l 0 2`;
        }
        return "";
      })
      .join(" ");

    return {
      path,
      clampedMarkers,
    };
  }, [rendered, height, customRange, realRange, totalWidth]);

  const { handleHover, handleLeave } = useInteraction<BigWigData>({
    onClick: undefined,
    onHover: undefined,
    onLeave: undefined,
    tooltip,
  });
  const svgRef = useBrowserStore((state) => state.svgRef);

  const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill={background} />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      <path d={paths.path} fill={color || "#000000"} style={{ clipPath: `url(#${id})` }} />
      <path d={paths.clampedMarkers} stroke="red" strokeWidth="1" fill="none" />
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
        onMouseMove={(e) => {
          if (!svgRef || !svgRef.current || !data || data.length === 0) return;
          const pos = svgPoint(svgRef.current, e.clientX, e.clientY);
          setX(pos[0]);
          const len = data.length;
          const adjustedX = Math.round(pos[0] - marginWidth);
          const start = len / multiplier;
          const end = start * 2;
          const xIdx = (adjustedX / viewWidth) * (end - start) + start;
          const index = Math.round(xIdx);
          if (index < 0 || index >= data.length) return;
          const point = data[index] as BigWigData;
          handleHover(point, point.value?.toFixed(2) ?? "", e);
        }}
        onMouseOut={() => {
          setX(undefined);
          handleLeave({ chr: "", start: 0, end: 0, value: 0 });
        }}
      />
    </g>
  );
}
